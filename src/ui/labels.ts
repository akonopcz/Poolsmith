import type { Host, Plan } from '../core/model'
import type { VdevType, ZfsPool } from '../core/zfs/model'
import { vdevCodes } from '../core/zfs/codes'
import { zfsDiskIds } from '../core/zfs/validate'

/** Each role owns one line colour, defined as a CSS custom property `--line-<role>`. */
export type Role = 'data' | 'special' | 'log' | 'cache' | 'spare'

export interface DiskPlace {
  role: Role
  vdevId?: string
  /** Line bullet text, for example D1, S1, C, SP. */
  code: string
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
