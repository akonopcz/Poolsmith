import type { ZfsPool } from './zfs/model'

/** Byte count. Must be a safe integer, which limits a single value to about 8 PiB. */
export type Bytes = number

export const SCHEMA_VERSION = 1

/** One host with all its enclosures. A pool never spans hosts, so a plan has exactly one. */
export interface Plan {
  schemaVersion: typeof SCHEMA_VERSION
  name: string
  host: Host
  layouts: Layout[]
}

export interface Host {
  name: string
  controllers: Controller[]
  enclosures: Enclosure[]
  /** Disks without a bay are inventory, for example disks still to be bought or cold spares. */
  disks: Disk[]
}

export interface Controller {
  id: string
  name: string
  mode: 'hba' | 'raid'
}

export interface Enclosure {
  id: string
  name: string
  kind: 'chassis' | 'shelf' | 'usb'
  bays: Bay[]
}

export interface Bay {
  id: string
  label: string
  formFactor: 'lff' | 'sff' | 'm2'
  /** Missing means attached directly, for example onboard SATA or an M.2 slot on the board. */
  controllerId?: string
  diskId?: string
}

export interface Disk {
  id: string
  sizeBytes: Bytes
  type: 'hdd' | 'ssd' | 'nvme'
  logicalSectorSize: 512 | 4096
  physicalSectorSize: 512 | 4096
  label?: string
}

/** Discriminated by `kind`, so other RAID types can get their own module next to `zfs/`. */
export type Layout = ZfsPool
