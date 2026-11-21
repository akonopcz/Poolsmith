import type { Bytes, Disk } from '../model'
import { allocateBlock } from './efficiency'
import type { Vdev, ZfsPool } from './model'
import { hasValidDiskCount } from './topology'

// Constants and tunable defaults from OpenZFS: vdev_impl.h, vdev.c and spa_misc.c.
const LABEL_SIZE = 256n * 1024n
const LABELS_START = 2n * LABEL_SIZE + 3584n * 1024n
const LABELS_END = 2n * LABEL_SIZE
const REFERENCE_BLOCK = 128 * 1024
const MIN_BLOCK_SHIFT = 9n
const MAX_BLOCK_SHIFT = 24n
const DEFAULT_MS_SHIFT = 29n
const MAX_MS_SHIFT = 34n
const MIN_MS_COUNT = 16n
const DEFAULT_MS_COUNT = 200n
const MS_COUNT_LIMIT = 131072n
const EMBEDDED_LOG_MIN_MS = 64n
const SLOP_SHIFT = 5n
const MIN_SLOP = 128n * 1024n * 1024n
const MAX_SLOP = 128n * 1024n * 1024n * 1024n

/** Where the raw bytes of the data disks go. All values add up to the raw size. */
export interface Deductions {
  /** Members larger than the smallest disk of their vdev. */
  unequalDisks: Bytes
  /** Labels and boot area, 4.5 MiB per disk plus alignment to 256 KiB. */
  labels: Bytes
  /** The part of a vdev too small for a whole metaslab. */
  metaslabRounding: Bytes
  /** One metaslab per vdev with more than 64, set aside for the ZIL. */
  embeddedLog: Bytes
  /** Parity, mirror copies and raidz padding, counted for 128K blocks. */
  redundancy: Bytes
  /** Reserve ZFS keeps back so a full pool can still free space. */
  slop: Bytes
}

export interface ReportedVdev {
  vdevId: string
  /** Size ZFS gives the vdev: the smallest member minus labels, times the width for raidz. */
  asizeBytes: Bytes
  metaslabShift: number
  metaslabCount: number
  /** Usable bytes per 512 raw bytes at the 128K reference block. */
  deflateRatio: number
  /** Usable bytes before slop. */
  dspaceBytes: Bytes
}

export interface ReportedCapacity {
  rawBytes: Bytes
  /** What `zfs list` shows as used plus available on an empty pool, and TrueNAS with it. */
  usableBytes: Bytes
  deductions: Deductions
  vdevs: ReportedVdev[]
}

/**
 * Capacity as ZFS reports it, following vdev_open, vdev_metaslab_set_size, vdev_deflated_space
 * and spa_get_slop_space in OpenZFS. Only data vdevs count, because special vdevs add space only
 * once they hold data. Partitions are not modeled: the disk size is taken as the space ZFS gets,
 * so a swap or reserved partition makes the real value slightly smaller. Vdevs with an invalid
 * disk count are skipped, and every member counts with the smallest known disk of its vdev.
 */
export function computeReportedCapacity(pool: ZfsPool, disks: Disk[]): ReportedCapacity {
  const sizes = new Map(disks.map((disk) => [disk.id, BigInt(disk.sizeBytes)]))
  const vdevs = pool.data
    .filter(hasValidDiskCount)
    .map((vdev) => vdevSpace(vdev, sizes, pool.ashift))

  const sum = (pick: (vdev: VdevSpace) => bigint) => vdevs.reduce((acc, v) => acc + pick(v), 0n)
  const dspace = sum((v) => v.dspace)
  const slop = slopSpace(
    dspace,
    sum((v) => v.embeddedLogDspace),
  )

  return {
    rawBytes: Number(sum((v) => v.raw)),
    usableBytes: Number(dspace - slop),
    deductions: {
      unequalDisks: Number(sum((v) => v.unequalDisks)),
      labels: Number(sum((v) => v.labels)),
      metaslabRounding: Number(sum((v) => v.metaslabRounding)),
      embeddedLog: Number(sum((v) => v.embeddedLog)),
      redundancy: Number(sum((v) => v.redundancy)),
      slop: Number(slop),
    },
    vdevs: vdevs.map((v) => ({
      vdevId: v.vdevId,
      asizeBytes: Number(v.asize),
      metaslabShift: Number(v.metaslabShift),
      metaslabCount: Number(v.metaslabCount),
      deflateRatio: Number(v.deflateRatio),
      dspaceBytes: Number(v.dspace),
    })),
  }
}

interface VdevSpace {
  vdevId: string
  raw: bigint
  unequalDisks: bigint
  labels: bigint
  asize: bigint
  metaslabShift: bigint
  metaslabCount: bigint
  metaslabRounding: bigint
  embeddedLog: bigint
  embeddedLogDspace: bigint
  redundancy: bigint
  deflateRatio: bigint
  dspace: bigint
}

function vdevSpace(vdev: Vdev, sizes: Map<string, bigint>, ashift: number): VdevSpace {
  const members = vdev.diskIds.flatMap((id) => sizes.get(id) ?? [])
  const width = BigInt(vdev.diskIds.length)
  const smallest = members.reduce((min, size) => (size < min ? size : min), members[0] ?? 0n)
  const leaf = max0((smallest / LABEL_SIZE) * LABEL_SIZE - LABELS_START - LABELS_END)
  const raw =
    members.reduce((sum, size) => sum + size, 0n) + (width - BigInt(members.length)) * smallest

  // A mirror vdev is as large as one member, so its raw space is `copies` times the vdev size.
  const isRaidz = vdev.type.startsWith('raidz')
  const asize = isRaidz ? width * leaf : leaf
  const copies = vdev.type === 'mirror' ? width : 1n

  const metaslabShift = metaslabShiftFor(asize)
  const metaslabCount = asize >> metaslabShift
  const logMetaslabs = metaslabCount > EMBEDDED_LOG_MIN_MS ? 1n : 0n
  const normal = (metaslabCount - logMetaslabs) << metaslabShift

  const reference = allocateBlock(vdev, REFERENCE_BLOCK, ashift)
  const referenceSectors =
    reference.dataSectors + (isRaidz ? reference.redundancySectors + reference.paddingSectors : 0)
  const referenceAsize = BigInt(referenceSectors) << BigInt(ashift)
  const deflateRatio = BigInt(REFERENCE_BLOCK) / (referenceAsize >> MIN_BLOCK_SHIFT)
  const deflate = (space: bigint) => (space >> MIN_BLOCK_SHIFT) * deflateRatio
  const dspace = deflate(normal)

  return {
    vdevId: vdev.id,
    raw,
    unequalDisks: raw - width * smallest,
    labels: width * (smallest - leaf),
    asize,
    metaslabShift,
    metaslabCount,
    metaslabRounding: copies * (asize - (metaslabCount << metaslabShift)),
    embeddedLog: copies * (logMetaslabs << metaslabShift),
    embeddedLogDspace: deflate(logMetaslabs << metaslabShift),
    redundancy: copies * normal - dspace,
    deflateRatio,
    dspace,
  }
}

/** vdev_metaslab_set_size: aim for 200 metaslabs of 512 MiB to 16 GiB, at least 16. */
function metaslabShiftFor(asize: bigint): bigint {
  const count = asize >> DEFAULT_MS_SHIFT
  let shift: bigint
  if (count < MIN_MS_COUNT) shift = highbit(asize / MIN_MS_COUNT) - 1n
  else if (count > DEFAULT_MS_COUNT) shift = highbit(asize / DEFAULT_MS_COUNT)
  else shift = DEFAULT_MS_SHIFT

  if (shift < MAX_BLOCK_SHIFT) return MAX_BLOCK_SHIFT
  if (shift <= MAX_MS_SHIFT) return shift
  return asize >> MAX_MS_SHIFT > MS_COUNT_LIMIT ? highbit(asize / MS_COUNT_LIMIT) : MAX_MS_SHIFT
}

/** spa_get_slop_space: 1/32 of the pool, at most 128 GiB, at least 128 MiB or half the pool. */
function slopSpace(dspace: bigint, embeddedLogDspace: bigint): bigint {
  let slop = min(dspace >> SLOP_SHIFT, MAX_SLOP)
  slop -= min(embeddedLogDspace, slop >> 1n)
  const floor = min(dspace >> 1n, MIN_SLOP)
  return slop > floor ? slop : floor
}

/** Position of the highest set bit, counted from 1, as highbit64 in OpenZFS. */
function highbit(value: bigint): bigint {
  return value === 0n ? 0n : BigInt(value.toString(2).length)
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

function max0(value: bigint): bigint {
  return value > 0n ? value : 0n
}
