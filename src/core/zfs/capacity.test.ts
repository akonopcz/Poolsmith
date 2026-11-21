import { describe, expect, it } from 'vitest'
import type { Disk } from '../model'
import { emptyPool, examplePlan, hdd } from '../testing'
import { computeNaiveCapacity } from './capacity'
import type { Vdev } from './model'

const TB = 1_000_000_000_000

const disks: Disk[] = [
  hdd('a', 4 * TB),
  hdd('b', 8 * TB),
  hdd('c', 8 * TB),
  hdd('d', 8 * TB),
  hdd('e', 8 * TB),
]

function dataVdev(vdev: Omit<Vdev, 'id'>) {
  const pool = { ...emptyPool(), data: [{ id: 'v', ...vdev }] }
  return computeNaiveCapacity(pool, disks).data.vdevs[0]
}

describe('computeNaiveCapacity', () => {
  it('computes each class of the example plan', () => {
    const plan = examplePlan()
    const capacity = computeNaiveCapacity(plan.layouts[0], plan.host.disks)

    expect(capacity.data).toEqual({
      rawBytes: 48 * TB,
      usableBytes: 32 * TB,
      vdevs: [
        { vdevId: 'hdd01-data-0', rawBytes: 48 * TB, usableBytes: 32 * TB, faultTolerance: 2 },
      ],
    })
    expect(capacity.special).toEqual({
      rawBytes: 2 * TB,
      usableBytes: TB,
      vdevs: [{ vdevId: 'hdd01-special-0', rawBytes: 2 * TB, usableBytes: TB, faultTolerance: 1 }],
    })
    expect(capacity.log).toEqual({ rawBytes: 0, usableBytes: 0, vdevs: [] })
  })

  it.each([
    ['disk', ['b'], 8, 8, 0],
    ['mirror', ['b', 'c'], 16, 8, 1],
    ['mirror', ['b', 'c', 'd'], 24, 8, 2],
    ['raidz1', ['b', 'c', 'd'], 24, 16, 1],
    ['raidz2', ['b', 'c', 'd', 'e'], 32, 16, 2],
    ['raidz3', ['a', 'b', 'c', 'd', 'e'], 36, 8, 3],
  ] as const)('%s of %j: raw %i TB, usable %i TB, may lose %i', (type, ids, raw, usable, ft) => {
    expect(dataVdev({ type, diskIds: [...ids] })).toMatchObject({
      rawBytes: raw * TB,
      usableBytes: usable * TB,
      faultTolerance: ft,
    })
  })

  it('counts every member with the smallest disk', () => {
    expect(dataVdev({ type: 'mirror', diskIds: ['a', 'b'] }).usableBytes).toBe(4 * TB)
    expect(dataVdev({ type: 'raidz1', diskIds: ['a', 'b', 'c'] }).usableBytes).toBe(8 * TB)
  })

  it('adds up a stripe of single-disk vdevs', () => {
    const pool = {
      ...emptyPool(),
      data: ['a', 'b', 'c'].map((id) => ({ id, type: 'disk' as const, diskIds: [id] })),
    }
    const { data } = computeNaiveCapacity(pool, disks)
    expect(data.usableBytes).toBe(20 * TB)
    expect(data.vdevs.map((vdev) => vdev.faultTolerance)).toEqual([0, 0, 0])
  })

  it('returns zero for half-built vdevs instead of negative values', () => {
    expect(dataVdev({ type: 'raidz2', diskIds: [] })).toMatchObject({
      rawBytes: 0,
      usableBytes: 0,
      faultTolerance: 0,
    })
    expect(dataVdev({ type: 'raidz2', diskIds: ['b', 'c'] })).toMatchObject({
      usableBytes: 0,
      faultTolerance: 1,
    })
  })

  it('skips unknown disks', () => {
    expect(dataVdev({ type: 'mirror', diskIds: ['b', 'missing'] })).toMatchObject({
      rawBytes: 8 * TB,
      usableBytes: 8 * TB,
      faultTolerance: 0,
    })
  })
})
