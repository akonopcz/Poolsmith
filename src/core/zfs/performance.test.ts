import { describe, expect, it } from 'vitest'
import { emptyPool, examplePlan } from '../testing'
import type { VdevType } from './model'
import { estimatePerformance } from './performance'

function vdev(id: string, type: VdevType, width: number) {
  return { id, type, diskIds: Array.from({ length: width }, (_, i) => `${id}-${i}`) }
}

describe('estimatePerformance', () => {
  it.each([
    ['disk', 1, [1, 1, 1, 1]],
    ['mirror', 2, [2, 1, 2, 1]],
    ['mirror', 3, [3, 1, 3, 1]],
    ['raidz1', 5, [1, 1, 4, 4]],
    ['raidz2', 6, [1, 1, 4, 4]],
    ['raidz3', 11, [1, 1, 8, 8]],
  ] as const)(
    '%s of %i: read IOPS, write IOPS, read and write throughput %j',
    (type, width, expected) => {
      const pool = { ...emptyPool(), data: [vdev('v', type, width)] }
      const { readIops, writeIops, readThroughput, writeThroughput } = estimatePerformance(pool)
      expect([readIops, writeIops, readThroughput, writeThroughput]).toEqual(expected)
    },
  )

  it('adds up data vdevs, so three mirrors beat one wide raidz for random I/O', () => {
    const mirrors = { ...emptyPool(), data: ['a', 'b', 'c'].map((id) => vdev(id, 'mirror', 2)) }
    const raidz = { ...emptyPool(), data: [vdev('z', 'raidz2', 6)] }
    expect(estimatePerformance(mirrors)).toMatchObject({ readIops: 6, writeIops: 3 })
    expect(estimatePerformance(raidz)).toMatchObject({ readIops: 1, writeIops: 1 })
  })

  it('ignores support vdevs and half-built vdevs', () => {
    const plan = examplePlan()
    plan.layouts[0].data.push(vdev('half', 'raidz1', 1))
    const performance = estimatePerformance(plan.layouts[0])
    expect(performance.vdevs.map((entry) => entry.vdevId)).toEqual(['tank-data-0'])
  })
})
