import { describe, expect, it } from 'vitest'
import { examplePlan, hdd } from '../core/testing'
import { validatePlan } from '../core/validate'
import {
  addDisksToBays,
  addEmptyVdev,
  addEnclosure,
  addLooseDisk,
  addPool,
  emptyPlan,
  placeDisk,
  removeDisk,
  removeEnclosure,
  removeVdev,
  unassignDisk,
  uniqueId,
  updateDisk,
  type DiskSpec,
} from './edits'

const spec: DiskSpec = {
  sizeBytes: 8_000_000_000_000,
  type: 'hdd',
  logicalSectorSize: 512,
  physicalSectorSize: 4096,
}

describe('emptyPlan', () => {
  it('starts with one empty pool and no issues besides the missing data vdev', () => {
    const codes = validatePlan(emptyPlan()).map((issue) => issue.code)
    expect(codes).toEqual(['no-data-vdev'])
  })
})

describe('uniqueId', () => {
  it('skips ids the plan already uses', () => {
    const plan = emptyPlan()
    plan.host.disks.push({ ...hdd('disk-1') })
    expect(uniqueId(plan, 'disk')).toBe('disk-2')
  })
})

describe('addPool', () => {
  it('picks the next free name', () => {
    const plan = emptyPlan()
    expect(addPool(plan).name).toBe('tank2')
    expect(addPool(plan).name).toBe('tank3')
  })
})

describe('addEnclosure', () => {
  it('creates bays and a new controller', () => {
    const plan = emptyPlan()
    const enclosure = addEnclosure(plan, {
      name: 'R720',
      kind: 'chassis',
      formFactor: 'lff',
      bayCount: 3,
      firstLabel: 1,
      controller: { name: 'H310', mode: 'raid' },
    })
    expect(enclosure.bays.map((b) => b.label)).toEqual(['1', '2', '3'])
    expect(plan.host.controllers).toEqual([{ id: 'ctrl-1', name: 'H310', mode: 'raid' }])
    expect(enclosure.bays.every((b) => b.controllerId === 'ctrl-1')).toBe(true)
    expect(validatePlan(plan).map((i) => i.code)).toEqual(['no-data-vdev'])
  })

  it('leaves bays without a controller for onboard ports', () => {
    const plan = emptyPlan()
    const enclosure = addEnclosure(plan, {
      name: 'Thin client',
      kind: 'chassis',
      formFactor: 'm2',
      bayCount: 1,
      firstLabel: 0,
      controller: null,
    })
    expect(enclosure.bays[0].controllerId).toBeUndefined()
  })
})

describe('removeEnclosure', () => {
  it('keeps its disks as loose disks and drops unused controllers', () => {
    const plan = examplePlan()
    removeEnclosure(plan, 'dl380')
    expect(plan.host.disks.map((d) => d.id)).toContain('s0')
    expect(plan.host.controllers.map((c) => c.id)).toEqual(['lsi9207'])
  })
})

describe('addDisksToBays', () => {
  it('fills only empty bays', () => {
    const plan = examplePlan()
    const added = addDisksToBays(plan, ['ds4246-6', 'ds4246-7', 'ds4246-8'], spec)
    expect(added).toHaveLength(2)
    expect(plan.host.enclosures[1].bays[7].diskId).toBe(added[0].id)
    expect(validatePlan(plan)).toEqual([])
  })
})

describe('updateDisk and addLooseDisk', () => {
  it('drops an empty label', () => {
    const plan = emptyPlan()
    const disk = addLooseDisk(plan, { ...spec, label: '' })
    expect(disk.label).toBeUndefined()
    updateDisk(plan, disk.id, { ...spec, label: 'WD Red' })
    expect(plan.host.disks[0].label).toBe('WD Red')
    updateDisk(plan, disk.id, { ...spec, label: '' })
    expect(plan.host.disks[0].label).toBeUndefined()
  })
})

describe('removeDisk', () => {
  it('removes the disk from its bay and its pool', () => {
    const plan = examplePlan()
    removeDisk(plan, 'h0')
    expect(plan.host.disks.some((d) => d.id === 'h0')).toBe(false)
    expect(plan.host.enclosures[1].bays[0].diskId).toBeUndefined()
    expect(plan.layouts[0].data[0].diskIds).not.toContain('h0')
  })
})

describe('unassignDisk', () => {
  it('drops a vdev that loses its last disk but keeps other empty vdevs', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    const empty = addEmptyVdev(plan, pool, 'data', 'mirror')
    placeDisk(plan, pool, 's2', { kind: 'new-vdev', group: 'log', type: 'disk' })
    unassignDisk(pool, 's2')
    expect(pool.log).toEqual([])
    expect(pool.data.map((v) => v.id)).toContain(empty.id)
  })
})

describe('placeDisk', () => {
  it('moves a disk between vdevs', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    placeDisk(plan, pool, 'h6', { kind: 'vdev', vdevId: 'tank-data-0' })
    expect(pool.spare).toEqual([])
    expect(pool.data[0].diskIds).toHaveLength(7)
  })

  it('turns a single-disk vdev into a mirror', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    placeDisk(plan, pool, 's2', { kind: 'new-vdev', group: 'log', type: 'disk' })
    const logId = pool.log[0].id
    placeDisk(plan, pool, 's1', { kind: 'vdev', vdevId: logId })
    expect(pool.log[0]).toMatchObject({ type: 'mirror', diskIds: ['s2', 's1'] })
    expect(pool.special[0].diskIds).toEqual(['s0'])
  })

  it('does nothing when the disk is already in the target vdev', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    placeDisk(plan, pool, 'h0', { kind: 'vdev', vdevId: 'tank-data-0' })
    expect(pool.data[0].diskIds).toEqual(['h0', 'h1', 'h2', 'h3', 'h4', 'h5'])
  })

  it('adds cache and spare disks', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    placeDisk(plan, pool, 's2', { kind: 'cache' })
    placeDisk(plan, pool, 'h5', { kind: 'spare' })
    expect(pool.cache).toEqual(['s2'])
    expect(pool.spare).toEqual(['h6', 'h5'])
    expect(pool.data[0].diskIds).toHaveLength(5)
  })
})

describe('removeVdev', () => {
  it('removes the vdev from its group', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    removeVdev(pool, 'tank-special-0')
    expect(pool.special).toEqual([])
  })
})
