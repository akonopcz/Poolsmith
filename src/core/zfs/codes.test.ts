import { describe, expect, it } from 'vitest'
import { examplePlan } from '../testing'
import { vdevCodes } from './codes'

describe('vdevCodes', () => {
  it('numbers vdevs per class in pool order', () => {
    const pool = examplePlan().layouts[0]
    pool.data.push({ id: 'second', type: 'mirror', diskIds: ['h6', 's2'] })
    pool.log.push({ id: 'log', type: 'disk', diskIds: ['s2'] })
    expect([...vdevCodes(pool)]).toEqual([
      ['tank-data-0', 'D1'],
      ['second', 'D2'],
      ['tank-special-0', 'S1'],
      ['log', 'L1'],
    ])
  })
})
