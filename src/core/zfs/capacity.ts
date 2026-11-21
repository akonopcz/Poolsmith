import type { Bytes, Disk } from '../model'
import type { Vdev, ZfsPool } from './model'
import { PARITY } from './topology'

export interface VdevCapacity {
  vdevId: string
  rawBytes: Bytes
  usableBytes: Bytes
  /** Disks the vdev may lose without losing data. */
  faultTolerance: number
}

export interface ClassCapacity {
  rawBytes: Bytes
  usableBytes: Bytes
  vdevs: VdevCapacity[]
}

/** Cache and spare disks add no capacity, so they have no entry. */
export interface PoolCapacity {
  data: ClassCapacity
  special: ClassCapacity
  log: ClassCapacity
}

/**
 * Naive capacity: every member counts with the size of the smallest disk in its vdev, minus
 * parity or mirror copies. It ignores raidz padding, slop space and metadata, so it is an upper
 * bound and not what `zfs list` reports. Unknown disk IDs are skipped.
 */
export function computeNaiveCapacity(pool: ZfsPool, disks: Disk[]): PoolCapacity {
  const sizes = new Map(disks.map((disk) => [disk.id, disk.sizeBytes]))
  const classCapacity = (vdevs: Vdev[]) => sumClass(vdevs.map((vdev) => vdevCapacity(vdev, sizes)))

  return {
    data: classCapacity(pool.data),
    special: classCapacity(pool.special),
    log: classCapacity(pool.log),
  }
}

function vdevCapacity(vdev: Vdev, sizes: Map<string, Bytes>): VdevCapacity {
  const members = vdev.diskIds.flatMap((id) => sizes.get(id) ?? [])
  const count = members.length
  const smallest = count === 0 ? 0 : Math.min(...members)
  const dataDisks = vdev.type === 'mirror' ? Math.min(count, 1) : count - PARITY[vdev.type]
  const faultTolerance = vdev.type === 'mirror' ? count - 1 : Math.min(PARITY[vdev.type], count - 1)

  return {
    vdevId: vdev.id,
    rawBytes: members.reduce((sum, size) => sum + size, 0),
    usableBytes: Math.max(0, dataDisks) * smallest,
    faultTolerance: Math.max(0, faultTolerance),
  }
}

function sumClass(vdevs: VdevCapacity[]): ClassCapacity {
  return {
    rawBytes: vdevs.reduce((sum, vdev) => sum + vdev.rawBytes, 0),
    usableBytes: vdevs.reduce((sum, vdev) => sum + vdev.usableBytes, 0),
    vdevs,
  }
}
