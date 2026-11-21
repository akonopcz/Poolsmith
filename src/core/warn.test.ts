import { describe, expect, it } from 'vitest'
import type { Plan } from './model'
import { examplePlan, hdd, ssd } from './testing'
import { validatePlan } from './validate'
import { findWarnings } from './warn'

const TB = 1_000_000_000_000
const GB = 1_000_000_000

/** The example plan with a three-way special mirror, so it matches the raidz2 redundancy. */
function cleanPlan(): Plan {
  const plan = examplePlan()
  pool(plan).special[0].diskIds = ['s0', 's1', 's2']
  return plan
}

function pool(plan: Plan) {
  return plan.layouts[0]
}

function codes(plan: Plan) {
  expect(validatePlan(plan)).toEqual([])
  return findWarnings(plan).map((warning) => warning.code)
}

function addDisks(plan: Plan, count: number) {
  const ids = Array.from({ length: count }, (_, i) => `d${i}`)
  plan.host.disks.push(...ids.map((id) => hdd(id)))
  return ids
}

describe('findWarnings', () => {
  it('accepts the clean plan', () => {
    expect(codes(cleanPlan())).toEqual([])
  })

  it('warns about the two-way special mirror of the example plan', () => {
    expect(findWarnings(examplePlan())).toEqual([
      {
        code: 'special-less-redundant',
        severity: 'warning',
        message: 'Special vdev may lose 1 disk, the data vdevs 2. Losing it loses the whole pool',
        ids: ['tank-special-0'],
      },
    ])
  })

  describe('attachment', () => {
    it('warns once per RAID controller with the pool disks behind it', () => {
      const plan = cleanPlan()
      plan.host.controllers[1].mode = 'raid'
      expect(findWarnings(plan)).toEqual([
        expect.objectContaining({
          code: 'raid-controller',
          severity: 'warning',
          ids: ['lsi9207', 'h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        }),
      ])
    })

    it('ignores a RAID controller with only unused disks', () => {
      const plan = examplePlan()
      plan.host.controllers[0].mode = 'raid'
      pool(plan).special = []
      expect(codes(plan)).toEqual([])
    })

    it('warns about a USB disk in the pool, but not about an unused one', () => {
      const plan = cleanPlan()
      plan.host.disks.push(ssd('usb-cache'), ssd('usb-loose'))
      plan.host.enclosures.push({
        id: 'usb',
        name: 'USB dock',
        kind: 'usb',
        bays: [
          { id: 'usb-0', label: '0', formFactor: 'sff', diskId: 'usb-cache' },
          { id: 'usb-1', label: '1', formFactor: 'sff', diskId: 'usb-loose' },
        ],
      })
      pool(plan).cache = ['usb-cache']
      expect(findWarnings(plan)).toEqual([
        expect.objectContaining({ code: 'usb-disk', ids: ['usb', 'usb-cache'] }),
      ])
    })
  })

  describe('vdev', () => {
    it('warns about mixed disk sizes and names the unused space', () => {
      const plan = cleanPlan()
      plan.host.disks[0].sizeBytes = 4 * TB
      expect(findWarnings(plan)).toEqual([
        {
          code: 'mixed-disk-sizes',
          severity: 'warning',
          message: 'raidz2 vdev mixes disk sizes. Every disk counts as 4 TB, so 20 TB stay unused',
          ids: ['tank-data-0'],
        },
      ])
    })

    it('formats sizes below 1 TB in GB', () => {
      const plan = cleanPlan()
      plan.host.disks.find((disk) => disk.id === 's0')!.sizeBytes = 500 * GB
      expect(findWarnings(plan)[0].message).toBe(
        'mirror vdev mixes disk sizes. Every disk counts as 500 GB, so 1 TB stay unused',
      )
    })

    it('notes HDDs and flash in one vdev', () => {
      const plan = cleanPlan()
      plan.host.disks.push(hdd('h7', TB))
      pool(plan).special[0].diskIds = ['s0', 's1', 'h7']
      expect(findWarnings(plan)).toEqual([
        expect.objectContaining({ code: 'mixed-media', severity: 'info', ids: ['tank-special-0'] }),
      ])
    })

    it.each([
      ['raidz1', 2, true],
      ['raidz1', 3, false],
      ['raidz1', 7, false],
      ['raidz1', 8, true],
      ['raidz2', 3, true],
      ['raidz2', 4, false],
      ['raidz2', 10, false],
      ['raidz2', 11, true],
      ['raidz3', 4, true],
      ['raidz3', 5, false],
      ['raidz3', 15, false],
      ['raidz3', 16, true],
    ] as const)('%s with %i disks warns: %s', (type, count, warns) => {
      const plan = cleanPlan()
      const ids = addDisks(plan, count)
      pool(plan).data = [{ id: 'v', type, diskIds: ids }]
      pool(plan).special = []
      expect(codes(plan)).toEqual(warns ? ['raidz-width'] : [])
    })
  })

  describe('redundancy', () => {
    it('warns about every single-disk data vdev', () => {
      const plan = cleanPlan()
      pool(plan).data = [
        { id: 'v0', type: 'disk', diskIds: ['h0'] },
        { id: 'v1', type: 'disk', diskIds: ['h1'] },
      ]
      expect(findWarnings(plan).map((warning) => [warning.code, warning.ids])).toEqual([
        ['no-redundancy', ['v0']],
        ['no-redundancy', ['v1']],
      ])
    })

    it('warns about a single-disk special vdev', () => {
      const plan = cleanPlan()
      pool(plan).special[0] = { id: 'tank-special-0', type: 'disk', diskIds: ['s0'] }
      expect(codes(plan)).toEqual(['special-no-redundancy'])
    })

    it('compares the special vdev with the weakest data vdev', () => {
      const plan = examplePlan()
      pool(plan).spare = []
      pool(plan).data.push({ id: 'v1', type: 'mirror', diskIds: ['h6', 'h7'] })
      plan.host.disks.push(hdd('h7'))
      expect(codes(plan)).toEqual(['mixed-data-vdevs'])
    })

    it('counts disks in the plural from two on', () => {
      const plan = examplePlan()
      pool(plan).data[0].type = 'raidz3'
      pool(plan).special[0].diskIds.push('s2')
      expect(findWarnings(plan)[0].message).toBe(
        'Special vdev may lose 2 disks, the data vdevs 3. Losing it loses the whole pool',
      )
    })
  })

  describe('data vdev mix', () => {
    it('warns about data vdevs of different type', () => {
      const plan = cleanPlan()
      pool(plan).spare = []
      pool(plan).data.push({ id: 'v1', type: 'mirror', diskIds: ['h6', 'h7'] })
      plan.host.disks.push(hdd('h7'))
      expect(findWarnings(plan)).toEqual([
        {
          code: 'mixed-data-vdevs',
          severity: 'warning',
          message:
            'Data vdevs differ in type or width: raidz2 of 6, mirror of 2. The pool gets uneven redundancy and performance',
          ids: ['tank-data-0', 'v1'],
        },
      ])
    })

    it('warns about data vdevs of different width', () => {
      const plan = cleanPlan()
      pool(plan).spare = []
      pool(plan).data = [
        { id: 'v0', type: 'raidz1', diskIds: ['h0', 'h1', 'h2'] },
        { id: 'v1', type: 'raidz1', diskIds: ['h3', 'h4', 'h5', 'h6'] },
      ]
      expect(codes(plan)).toEqual(['mixed-data-vdevs'])
    })

    it('accepts data vdevs of the same type and width', () => {
      const plan = cleanPlan()
      pool(plan).data = [
        { id: 'v0', type: 'mirror', diskIds: ['h0', 'h1'] },
        { id: 'v1', type: 'mirror', diskIds: ['h2', 'h3'] },
      ]
      expect(codes(plan)).toEqual([])
    })

    it('notes data vdevs with disks of different sizes', () => {
      const plan = cleanPlan()
      plan.host.disks[2].sizeBytes = 4 * TB
      plan.host.disks[3].sizeBytes = 4 * TB
      pool(plan).data = [
        { id: 'v0', type: 'mirror', diskIds: ['h0', 'h1'] },
        { id: 'v1', type: 'mirror', diskIds: ['h2', 'h3'] },
      ]
      expect(findWarnings(plan)).toEqual([
        expect.objectContaining({ code: 'uneven-data-vdevs', severity: 'info', ids: ['v0', 'v1'] }),
      ])
    })
  })

  it('warns once about an ashift below the physical sector size', () => {
    const plan = cleanPlan()
    pool(plan).ashift = 9
    expect(findWarnings(plan)).toEqual([
      expect.objectContaining({
        code: 'ashift-below-sector',
        ids: ['tank', 'h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      }),
    ])
  })

  it('checks every pool of the plan', () => {
    const plan = cleanPlan()
    plan.host.disks.push(hdd('x0'))
    plan.layouts.push({
      ...pool(plan),
      id: 'other',
      name: 'other',
      data: [{ id: 'other-data-0', type: 'disk', diskIds: ['x0'] }],
      special: [],
      spare: [],
    })
    expect(codes(plan)).toEqual(['no-redundancy'])
  })
})
