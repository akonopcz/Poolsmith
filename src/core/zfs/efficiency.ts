import type { Bytes, Disk } from '../model'
import type { Vdev, ZfsPool } from './model'
import { minDisks, PARITY } from './topology'

const MIN_TABLE_MAX_BLOCK = 1024 * 1024

/** How one block of a given size lands on a vdev, counted in sectors of 2^ashift bytes. */
export interface BlockAllocation {
  dataSectors: number
  /** Parity for raidz, extra copies for mirrors. */
  redundancySectors: number
  /** raidz rounds every allocation up to a multiple of parity + 1 sectors. */
  paddingSectors: number
  /** Data sectors divided by all allocated sectors. */
  efficiency: number
}

export interface VdevAllocation extends BlockAllocation {
  vdevId: string
}

export interface EfficiencyRow {
  blockSize: Bytes
  /** Usable bytes if every block of the data vdevs had this size. */
  usableBytes: Bytes
  vdevs: VdevAllocation[]
}

export interface EfficiencyTable {
  ashift: number
  /** Efficiency without raidz padding, for comparison with the rows. */
  idealEfficiency: { vdevId: string; efficiency: number }[]
  rows: EfficiencyRow[]
}

/**
 * Space efficiency of the data vdevs per block size, following vdev_raidz_psize_to_asize in
 * OpenZFS. Rows run in powers of two from the sector size to 1 MiB or the recordsize, whichever
 * is larger. Blocks count uncompressed. Vdevs with an invalid disk count are skipped, and every
 * member counts with the smallest known disk of its vdev.
 */
export function computeEfficiencyTable(
  pool: ZfsPool,
  disks: Disk[],
  ashift = pool.ashift,
): EfficiencyTable {
  const sizes = new Map(disks.map((disk) => [disk.id, disk.sizeBytes]))
  const vdevs = pool.data.filter(hasValidDiskCount)
  const smallest = vdevs.map((vdev) => {
    const members = vdev.diskIds.flatMap((id) => sizes.get(id) ?? [])
    return members.length === 0 ? 0 : Math.min(...members)
  })

  const rows = blockSizes(ashift, pool.recordsize).map((blockSize): EfficiencyRow => {
    const allocations = vdevs.map((vdev) => allocateBlock(vdev, blockSize, ashift))
    const usableBytes = vdevs.reduce(
      (sum, vdev, i) =>
        sum +
        scale(
          smallest[i] * vdev.diskIds.length,
          allocations[i].dataSectors,
          allocated(allocations[i]),
        ),
      0,
    )
    return {
      blockSize,
      usableBytes,
      vdevs: allocations.map((allocation, i) => ({ vdevId: vdevs[i].id, ...allocation })),
    }
  })

  return {
    ashift,
    idealEfficiency: vdevs.map((vdev) => ({ vdevId: vdev.id, efficiency: idealEfficiency(vdev) })),
    rows,
  }
}

/** Expects a vdev with a valid disk count. */
export function allocateBlock(vdev: Vdev, blockSize: Bytes, ashift: number): BlockAllocation {
  const width = vdev.diskIds.length
  const dataSectors = Math.ceil(blockSize / 2 ** ashift)

  if (vdev.type === 'disk' || vdev.type === 'mirror') {
    const copies = vdev.type === 'disk' ? 1 : width
    return withEfficiency(dataSectors, (copies - 1) * dataSectors, 0)
  }

  const parity = PARITY[vdev.type]
  const redundancySectors = parity * Math.ceil(dataSectors / (width - parity))
  const used = dataSectors + redundancySectors
  const paddingSectors = Math.ceil(used / (parity + 1)) * (parity + 1) - used
  return withEfficiency(dataSectors, redundancySectors, paddingSectors)
}

function withEfficiency(data: number, redundancy: number, padding: number): BlockAllocation {
  return {
    dataSectors: data,
    redundancySectors: redundancy,
    paddingSectors: padding,
    efficiency: data / (data + redundancy + padding),
  }
}

function hasValidDiskCount(vdev: Vdev): boolean {
  const count = vdev.diskIds.length
  return vdev.type === 'disk' ? count === 1 : count >= minDisks(vdev.type)
}

function allocated(allocation: BlockAllocation): number {
  return allocation.dataSectors + allocation.redundancySectors + allocation.paddingSectors
}

function idealEfficiency(vdev: Vdev): number {
  const width = vdev.diskIds.length
  if (vdev.type === 'disk') return 1
  if (vdev.type === 'mirror') return 1 / width
  return (width - PARITY[vdev.type]) / width
}

function blockSizes(ashift: number, recordsize: Bytes): Bytes[] {
  const max = Math.max(MIN_TABLE_MAX_BLOCK, recordsize)
  const sizes: Bytes[] = []
  for (let size = 2 ** ashift; size <= max; size *= 2) sizes.push(size)
  return sizes
}

/** bytes × numerator / denominator, rounded down. BigInt, because the product exceeds 2^53. */
function scale(bytes: Bytes, numerator: number, denominator: number): Bytes {
  return Number((BigInt(bytes) * BigInt(numerator)) / BigInt(denominator))
}
