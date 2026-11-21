import type { Bay, Controller, Disk, Enclosure, Plan } from './model'
import { SCHEMA_VERSION } from './model'
import type { Vdev, VdevType, ZfsPool } from './zfs/model'

// Edits change the plan in place, so they work on a UI framework's reactive state as well as
// on plain objects in tests. They only move parts around; whether the result makes sense is a
// question for validatePlan and findWarnings.

export type VdevGroup = 'data' | 'special' | 'log'

/** Where a disk can go inside a pool. */
export type Slot =
  | { kind: 'vdev'; vdevId: string }
  | { kind: 'new-vdev'; group: VdevGroup; type: VdevType }
  | { kind: 'cache' }
  | { kind: 'spare' }

export type DiskSpec = Omit<Disk, 'id'>

export interface EnclosureSpec {
  name: string
  kind: Enclosure['kind']
  formFactor: Bay['formFactor']
  bayCount: number
  firstLabel: number
  /** Bays per row; leave out to let `bayColumns` guess. */
  columns?: number
  /** An existing controller, a new one, or none for onboard ports. */
  controller: { id: string } | { name: string; mode: Controller['mode'] } | null
}

export function emptyPlan(): Plan {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'my-plan',
    host: { name: 'server', controllers: [], enclosures: [], disks: [] },
    layouts: [emptyPool('pool-1', 'pool01')],
  }
}

function emptyPool(id: string, name: string): ZfsPool {
  return {
    kind: 'zfs',
    id,
    name,
    ashift: 12,
    recordsize: 128 * 1024,
    data: [],
    special: [],
    log: [],
    cache: [],
    spare: [],
  }
}

function allIds(plan: Plan): Set<string> {
  const { host } = plan
  return new Set([
    ...host.controllers.map((c) => c.id),
    ...host.enclosures.flatMap((e) => [e.id, ...e.bays.map((b) => b.id)]),
    ...host.disks.map((d) => d.id),
    ...plan.layouts.flatMap((p) => [p.id, ...vdevsOf(p).map((v) => v.id)]),
  ])
}

/** The first `prefix-n` that no part of the plan uses yet. */
export function uniqueId(plan: Plan, prefix: string, taken = allIds(plan)): string {
  for (let n = 1; ; n++) {
    const id = `${prefix}-${n}`
    if (!taken.has(id)) return id
  }
}

export function vdevsOf(pool: ZfsPool): Vdev[] {
  return [...pool.data, ...pool.special, ...pool.log]
}

export function addPool(plan: Plan): ZfsPool {
  const names = new Set(plan.layouts.map((p) => p.name))
  // Numbered with two digits, so names sort well and a plan with many pools stays readable.
  let name = 'pool01'
  for (let n = 2; names.has(name); n++) name = `pool${String(n).padStart(2, '0')}`
  const pool = emptyPool(uniqueId(plan, 'pool'), name)
  plan.layouts.push(pool)
  return pool
}

export function removePool(plan: Plan, poolId: string): void {
  plan.layouts = plan.layouts.filter((p) => p.id !== poolId)
}

export function addEnclosure(plan: Plan, spec: EnclosureSpec): Enclosure {
  const taken = allIds(plan)
  const claim = (prefix: string) => {
    const id = uniqueId(plan, prefix, taken)
    taken.add(id)
    return id
  }

  let controllerId: string | undefined
  if (spec.controller !== null && 'id' in spec.controller) {
    controllerId = spec.controller.id
  } else if (spec.controller !== null) {
    controllerId = claim('ctrl')
    plan.host.controllers.push({ id: controllerId, ...spec.controller })
  }

  const enclosureId = claim('encl')
  const bays: Bay[] = Array.from({ length: spec.bayCount }, (_, i) => {
    const bay: Bay = {
      id: `${enclosureId}-bay-${i}`,
      label: String(spec.firstLabel + i),
      formFactor: spec.formFactor,
    }
    if (controllerId !== undefined) bay.controllerId = controllerId
    return bay
  })
  const enclosure: Enclosure = { id: enclosureId, name: spec.name, kind: spec.kind, bays }
  if (spec.columns !== undefined) enclosure.columns = spec.columns
  plan.host.enclosures.push(enclosure)
  return enclosure
}

/** Disks in its bays stay in the plan as disks without a bay. */
export function removeEnclosure(plan: Plan, enclosureId: string): void {
  const { host } = plan
  host.enclosures = host.enclosures.filter((e) => e.id !== enclosureId)
  const used = new Set(host.enclosures.flatMap((e) => e.bays.map((b) => b.controllerId)))
  host.controllers = host.controllers.filter((c) => used.has(c.id))
}

function newDisk(plan: Plan, spec: DiskSpec, taken: Set<string>): Disk {
  const id = uniqueId(plan, 'disk', taken)
  taken.add(id)
  const disk: Disk = { id, ...spec }
  if (disk.label === '') delete disk.label
  plan.host.disks.push(disk)
  return disk
}

/** Puts a new disk into each given bay that is still empty. */
export function addDisksToBays(plan: Plan, bayIds: string[], spec: DiskSpec): Disk[] {
  const taken = allIds(plan)
  const wanted = new Set(bayIds)
  const bays = plan.host.enclosures
    .flatMap((e) => e.bays)
    .filter((b) => wanted.has(b.id) && b.diskId === undefined)
  return bays.map((bay) => {
    const disk = newDisk(plan, spec, taken)
    bay.diskId = disk.id
    return disk
  })
}

export function addLooseDisk(plan: Plan, spec: DiskSpec): Disk {
  return newDisk(plan, spec, allIds(plan))
}

export function updateDisk(plan: Plan, diskId: string, spec: DiskSpec): void {
  const disk = plan.host.disks.find((d) => d.id === diskId)
  if (disk === undefined) return
  Object.assign(disk, spec)
  if (!spec.label) delete disk.label
}

/** Removes the disk from its bay and from every pool. */
export function removeDisk(plan: Plan, diskId: string): void {
  for (const pool of plan.layouts) unassignDisk(pool, diskId)
  for (const bay of plan.host.enclosures.flatMap((e) => e.bays)) {
    if (bay.diskId === diskId) delete bay.diskId
  }
  plan.host.disks = plan.host.disks.filter((d) => d.id !== diskId)
}

/** Takes the disk out of the pool. A vdev left without disks goes with it. */
export function unassignDisk(pool: ZfsPool, diskId: string): void {
  for (const group of ['data', 'special', 'log'] as const) {
    pool[group] = pool[group].flatMap((vdev) => {
      if (!vdev.diskIds.includes(diskId)) return [vdev]
      vdev.diskIds = vdev.diskIds.filter((id) => id !== diskId)
      return vdev.diskIds.length > 0 ? [vdev] : []
    })
  }
  pool.cache = pool.cache.filter((id) => id !== diskId)
  pool.spare = pool.spare.filter((id) => id !== diskId)
}

/**
 * Moves a disk into a slot of the pool. Adding a disk to a single-disk vdev makes it a mirror,
 * as `zpool attach` does.
 */
export function placeDisk(plan: Plan, pool: ZfsPool, diskId: string, slot: Slot): void {
  if (slot.kind === 'vdev') {
    const target = vdevsOf(pool).find((v) => v.id === slot.vdevId)
    if (target === undefined || target.diskIds.includes(diskId)) return
    unassignDisk(pool, diskId)
    // unassignDisk replaces the arrays, so look the vdev up again.
    const vdev = vdevsOf(pool).find((v) => v.id === slot.vdevId)
    if (vdev === undefined) return
    if (vdev.type === 'disk' && vdev.diskIds.length === 1) vdev.type = 'mirror'
    vdev.diskIds.push(diskId)
    return
  }

  unassignDisk(pool, diskId)
  if (slot.kind === 'cache') pool.cache.push(diskId)
  else if (slot.kind === 'spare') pool.spare.push(diskId)
  else pool[slot.group].push({ id: uniqueId(plan, 'vdev'), type: slot.type, diskIds: [diskId] })
}

/** An empty vdev the user fills by dropping disks onto it. */
export function addEmptyVdev(plan: Plan, pool: ZfsPool, group: VdevGroup, type: VdevType): Vdev {
  const vdev: Vdev = { id: uniqueId(plan, 'vdev'), type, diskIds: [] }
  pool[group].push(vdev)
  return vdev
}

export function removeVdev(pool: ZfsPool, vdevId: string): void {
  for (const group of ['data', 'special', 'log'] as const) {
    pool[group] = pool[group].filter((v) => v.id !== vdevId)
  }
}

/** Puts an enclosure at a new position in the host's list. */
export function moveEnclosure(plan: Plan, enclosureId: string, index: number): void {
  const list = plan.host.enclosures
  const from = list.findIndex((e) => e.id === enclosureId)
  if (from < 0) return
  const [enclosure] = list.splice(from, 1)
  list.splice(Math.max(0, Math.min(index, list.length)), 0, enclosure)
}

/**
 * Moves a disk into another bay, or out of every bay with `null`. A disk already in the target
 * bay swaps places with it; if the moved disk had no bay, that one ends up without a bay. Pools
 * keep their disks, since only the physical slot changes.
 */
export function moveDiskToBay(plan: Plan, diskId: string, bayId: string | null): void {
  const bays = plan.host.enclosures.flatMap((e) => e.bays)
  const from = bays.find((b) => b.diskId === diskId)
  const to = bayId === null ? undefined : bays.find((b) => b.id === bayId)
  if ((bayId !== null && to === undefined) || from === to) return
  const occupant = to?.diskId
  if (from !== undefined) {
    if (occupant !== undefined) from.diskId = occupant
    else delete from.diskId
  }
  if (to !== undefined) to.diskId = diskId
}
