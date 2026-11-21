import { describe, expect, it } from 'vitest'
import { emptyPool, examplePlan } from '../testing'
import { poolFaultTolerance } from './topology'

describe('poolFaultTolerance', () => {
  it('takes the weakest of data and special vdevs', () => {
    expect(poolFaultTolerance(examplePlan().layouts[0])).toBe(1)
  })

  it('ignores log vdevs, cache and spares', () => {
    const pool = examplePlan().layouts[0]
    pool.special = []
    pool.log = [{ id: 'log', type: 'disk', diskIds: ['s0'] }]
    pool.cache = ['s1']
    expect(poolFaultTolerance(pool)).toBe(2)
  })

  it('skips half-built vdevs', () => {
    const pool = examplePlan().layouts[0]
    pool.data.push({ id: 'new', type: 'mirror', diskIds: ['s2'] })
    expect(poolFaultTolerance(pool)).toBe(1)
  })

  it('is undefined without a complete data vdev', () => {
    const pool = emptyPool()
    expect(poolFaultTolerance(pool)).toBeUndefined()
    pool.data.push({ id: 'new', type: 'raidz2', diskIds: ['h0', 'h1'] })
    expect(poolFaultTolerance(pool)).toBeUndefined()
  })

  it('is zero for a stripe', () => {
    const pool = emptyPool()
    pool.data.push(
      { id: 'a', type: 'disk', diskIds: ['h0'] },
      { id: 'b', type: 'disk', diskIds: ['h1'] },
    )
    expect(poolFaultTolerance(pool)).toBe(0)
  })
})
