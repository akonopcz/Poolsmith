import type { Host, Plan } from '../core/model'
import type { VdevType, ZfsPool } from '../core/zfs/model'
import { zfsDiskIds } from '../core/zfs/validate'

/** Each role owns one line colour, defined as a CSS custom property `--line-<role>`. */
export type Role = 'data' | 'special' | 'log' | 'cache' | 'spare'

export interface DiskPlace {
  role: Role
  vdevId?: string
  /** Line bullet text, for example D1, S1, C, SP. */
  code: string
}

const PREFIX = { data: 'D', special: 'S', log: 'L' } as const

/** Line bullet text per vdev: D1, D2 for data, S1 for special, L1 for log. */
export function vdevCodes(pool: ZfsPool): Map<string, string> {
  const codes = new Map<string, string>()
  for (const group of ['data', 'special', 'log'] as const) {
    pool[group].forEach((vdev, i) => codes.set(vdev.id, `${PREFIX[group]}${i + 1}`))
  }
  return codes
}

export function diskPlace(pool: ZfsPool, diskId: string): DiskPlace | undefined {
  const codes = vdevCodes(pool)
  for (const group of ['data', 'special', 'log'] as const) {
    const vdev = pool[group].find((v) => v.diskIds.includes(diskId))
    if (vdev !== undefined) return { role: group, vdevId: vdev.id, code: codes.get(vdev.id)! }
  }
  if (pool.cache.includes(diskId)) return { role: 'cache', code: 'C' }
  if (pool.spare.includes(diskId)) return { role: 'spare', code: 'SP' }
  return undefined
}

/** The pool that uses a disk, if any. */
export function poolOfDisk(plan: Plan, diskId: string): ZfsPool | undefined {
  return plan.layouts.find((pool) => zfsDiskIds(pool).includes(diskId))
}

export const TYPE_LABEL: Record<VdevType, string> = {
  disk: 'single disk',
  mirror: 'mirror',
  raidz1: 'raidz1',
  raidz2: 'raidz2',
  raidz3: 'raidz3',
}

/** Short station name under a line, for example "DS4246 3". */
export function stationName(host: Host, diskId: string): string {
  for (const enclosure of host.enclosures) {
    const bay = enclosure.bays.find((b) => b.diskId === diskId)
    if (bay !== undefined) return `${enclosure.name} ${bay.label}`
  }
  return 'no bay'
}

/** Name of the enclosure a disk sits in, if any. */
export function enclosureName(host: Host, diskId: string): string | undefined {
  return host.enclosures.find((e) => e.bays.some((b) => b.diskId === diskId))?.name
}

/** The bay label alone, for stations on lines whose disks share one enclosure. */
export function bayLabel(host: Host, diskId: string): string {
  for (const enclosure of host.enclosures) {
    const bay = enclosure.bays.find((b) => b.diskId === diskId)
    if (bay !== undefined) return bay.label
  }
  return ''
}

/**
 * Core messages end with "Disks: <id>, <id>". Disk ids appear nowhere else in the UI, so show
 * where the disks sit instead. Only the wording changes.
 */
export function readableMessage(host: Host, message: string): string {
  return message.replace(/Disks: (.+)$/, (_, list: string) => {
    const names = list.split(', ').map((id) => {
      const name = stationName(host, id)
      return name === 'no bay' ? id : name
    })
    return `Disks: ${names.join(', ')}`
  })
}

/**
 * All ids a finding touches, widened so the UI can light up the parts a user sees: a vdev
 * brings its disks, a disk its bay. Controller and enclosure findings already name their disks.
 */
export function widenIds(plan: Plan, ids: string[]): Set<string> {
  const out = new Set(ids)
  for (const pool of plan.layouts) {
    for (const vdev of [...pool.data, ...pool.special, ...pool.log]) {
      if (out.has(vdev.id)) vdev.diskIds.forEach((id) => out.add(id))
    }
  }
  for (const bay of plan.host.enclosures.flatMap((e) => e.bays)) {
    if (bay.diskId !== undefined && out.has(bay.diskId)) out.add(bay.id)
  }
  return out
}
