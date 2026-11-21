import { describe, expect, it } from 'vitest'
import type { Plan } from './model'
import { emptyPool, examplePlan, hdd } from './testing'
import { validatePlan } from './validate'

function codes(plan: Plan) {
  return validatePlan(plan).map((issue) => issue.code)
}

function pool(plan: Plan) {
  return plan.layouts[0]
}

describe('validatePlan', () => {
  it('accepts a host with a shelf on an external HBA', () => {
    expect(validatePlan(examplePlan())).toEqual([])
  })

  it('accepts disks without a bay as inventory', () => {
    const plan = examplePlan()
    plan.host.disks.push(hdd('loose'))
    expect(validatePlan(plan)).toEqual([])
  })

  it('accepts a bay without a controller as directly attached', () => {
    const plan = examplePlan()
    delete plan.host.enclosures[0].bays[0].controllerId
    expect(validatePlan(plan)).toEqual([])
  })

  it('reports IDs that are not unique across part types', () => {
    const plan = examplePlan()
    plan.host.controllers[0].id = 'h0'
    plan.host.enclosures[0].bays.forEach((bay) => (bay.controllerId = 'h0'))
    expect(validatePlan(plan)).toEqual([
      expect.objectContaining({ code: 'duplicate-id', ids: ['h0'] }),
    ])
  })

  describe('host', () => {
    it('reports a bay with an unknown controller', () => {
      const plan = examplePlan()
      plan.host.enclosures[0].bays[0].controllerId = 'missing'
      expect(codes(plan)).toEqual(['unknown-controller'])
    })

    it('reports a bay with an unknown disk', () => {
      const plan = examplePlan()
      plan.host.enclosures[0].bays[7].diskId = 'missing'
      expect(codes(plan)).toEqual(['unknown-disk'])
    })

    it('reports a disk in two bays', () => {
      const plan = examplePlan()
      plan.host.enclosures[0].bays[7].diskId = 's0'
      expect(codes(plan)).toEqual(['disk-in-several-bays'])
    })

    it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('reports disk size %s', (size) => {
      const plan = examplePlan()
      plan.host.disks[0].sizeBytes = size
      expect(codes(plan)).toEqual(['invalid-disk-size'])
    })

    it('reports a logical sector larger than the physical one', () => {
      const plan = examplePlan()
      plan.host.disks[0].logicalSectorSize = 4096
      plan.host.disks[0].physicalSectorSize = 512
      expect(codes(plan)).toEqual(['invalid-sector-size'])
    })
  })

  describe('zfs pool', () => {
    it.each([8, 17, 12.5])('reports ashift %s', (ashift) => {
      const plan = examplePlan()
      pool(plan).ashift = ashift
      expect(codes(plan)).toEqual(['invalid-ashift'])
    })

    it.each([9, 16])('accepts ashift %s', (ashift) => {
      const plan = examplePlan()
      pool(plan).ashift = ashift
      expect(codes(plan)).toEqual([])
    })

    it.each([256, 100_000, 32 * 1024 * 1024])('reports recordsize %s', (recordsize) => {
      const plan = examplePlan()
      pool(plan).recordsize = recordsize
      expect(codes(plan)).toEqual(['invalid-recordsize'])
    })

    it.each([512, 1024 * 1024, 16 * 1024 * 1024])('accepts recordsize %s', (recordsize) => {
      const plan = examplePlan()
      pool(plan).recordsize = recordsize
      expect(codes(plan)).toEqual([])
    })

    it.each([
      '',
      '1tank',
      '_tank',
      'tank/data',
      'tänk',
      'log',
      'mirror',
      'raidz2',
      'draidpool',
      'spare1',
    ])('reports pool name "%s"', (name) => {
      const plan = examplePlan()
      pool(plan).name = name
      expect(codes(plan)).toEqual(['invalid-pool-name'])
    })

    it.each(['tank', 'Tank-01', 'fast_pool', 'pool:a.b', 'my pool', 'logs', 'Mirror'])(
      'accepts pool name "%s"',
      (name) => {
        const plan = examplePlan()
        pool(plan).name = name
        expect(codes(plan)).toEqual([])
      },
    )

    it('reports a pool without data vdevs', () => {
      const plan = examplePlan()
      plan.layouts.push(emptyPool('empty'))
      expect(codes(plan)).toEqual(['no-data-vdev'])
    })

    it.each([
      ['disk', 0],
      ['disk', 2],
      ['mirror', 1],
      ['raidz1', 1],
      ['raidz2', 2],
      ['raidz3', 3],
    ] as const)('reports %s with %i disks', (type, count) => {
      const plan = examplePlan()
      pool(plan).data[0] = { id: 'v', type, diskIds: ['h0', 'h1', 'h2'].slice(0, count) }
      expect(codes(plan)).toEqual(['vdev-disk-count'])
    })

    it.each([
      ['disk', 1],
      ['mirror', 2],
      ['raidz1', 2],
      ['raidz2', 3],
      ['raidz3', 4],
    ] as const)('accepts %s with %i disks', (type, count) => {
      const plan = examplePlan()
      pool(plan).data[0] = { id: 'v', type, diskIds: ['h0', 'h1', 'h2', 'h3'].slice(0, count) }
      expect(codes(plan)).toEqual([])
    })

    it('checks the disk count of support vdevs', () => {
      const plan = examplePlan()
      pool(plan).special[0].diskIds = ['s0']
      expect(codes(plan)).toEqual(['vdev-disk-count'])
    })

    it('reports a raidz log vdev', () => {
      const plan = examplePlan()
      pool(plan).special = []
      pool(plan).log = [{ id: 'log', type: 'raidz1', diskIds: ['s0', 's1'] }]
      expect(codes(plan)).toEqual(['log-vdev-type'])
    })

    it('accepts a mirrored log vdev', () => {
      const plan = examplePlan()
      pool(plan).special = []
      pool(plan).log = [{ id: 'log', type: 'mirror', diskIds: ['s0', 's1'] }]
      expect(codes(plan)).toEqual([])
    })

    it('reports unknown disks in vdevs, cache and spares', () => {
      const plan = examplePlan()
      pool(plan).data[0].diskIds[0] = 'missing-data'
      pool(plan).cache = ['missing-cache']
      pool(plan).spare = ['missing-spare']
      expect(validatePlan(plan).flatMap((issue) => issue.ids)).toEqual([
        'missing-data',
        'missing-cache',
        'missing-spare',
      ])
    })

    it('reports a disk used twice in one pool', () => {
      const plan = examplePlan()
      pool(plan).cache = ['h0']
      expect(codes(plan)).toEqual(['disk-used-twice'])
    })

    it('reports a disk used in two pools', () => {
      const plan = examplePlan()
      plan.layouts.push({
        ...emptyPool('other'),
        data: [{ id: 'other-data-0', type: 'disk', diskIds: ['h6'] }],
      })
      expect(codes(plan)).toEqual(['disk-used-twice'])
    })
  })
})
