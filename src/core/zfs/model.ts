import type { Bytes } from '../model'

export interface ZfsPool {
  kind: 'zfs'
  id: string
  name: string
  ashift: number
  recordsize: Bytes
  data: Vdev[]
  special: Vdev[]
  log: Vdev[]
  /** Disk IDs. ZFS allows only single disks as cache devices. */
  cache: string[]
  /** Disk IDs. */
  spare: string[]
}

/** A striped pool is several `disk` vdevs, as in ZFS itself. */
export type VdevType = 'disk' | 'mirror' | 'raidz1' | 'raidz2' | 'raidz3'

export interface Vdev {
  id: string
  type: VdevType
  diskIds: string[]
}
