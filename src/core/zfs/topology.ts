import type { Vdev, VdevType } from './model'

export const PARITY: Record<VdevType, number> = {
  disk: 0,
  mirror: 0,
  raidz1: 1,
  raidz2: 2,
  raidz3: 3,
}

export function minDisks(type: VdevType): number {
  switch (type) {
    case 'disk':
      return 1
    case 'mirror':
      return 2
    default:
      return PARITY[type] + 1
  }
}

/** Disks the vdev may lose without losing data, assuming it has a valid disk count. */
export function faultTolerance(vdev: Vdev): number {
  return vdev.type === 'mirror' ? vdev.diskIds.length - 1 : PARITY[vdev.type]
}

/** Whether ZFS accepts the vdev's disk count. Half-built vdevs fail this while planning. */
export function hasValidDiskCount(vdev: Vdev): boolean {
  const count = vdev.diskIds.length
  return vdev.type === 'disk' ? count === 1 : count >= minDisks(vdev.type)
}
