import { describe, expect, it } from 'vitest'
import { examplePlan } from '../core/testing'
import { diskPlace, vdevCodes, widenIds } from './labels'

describe('vdevCodes and diskPlace', () => {
  it('names lines per group', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    expect([...vdevCodes(pool).values()]).toEqual(['D1', 'S1'])
    expect(diskPlace(pool, 'h0')).toEqual({ role: 'data', vdevId: 'tank-data-0', code: 'D1' })
    expect(diskPlace(pool, 'h6')).toEqual({ role: 'spare', code: 'SP' })
    expect(diskPlace(pool, 's2')).toBeUndefined()
  })
})

describe('widenIds', () => {
  it('adds the disks of a vdev and their bays, not every disk behind a controller', () => {
    const plan = examplePlan()
    const ids = widenIds(plan, ['tank-special-0'])
    expect(ids).toEqual(new Set(['tank-special-0', 's0', 's1', 'dl380-0', 'dl380-1']))
    expect(widenIds(plan, ['p440ar', 's0']).has('s2')).toBe(false)
  })
})
