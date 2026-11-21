import { describe, expect, it } from 'vitest'
import { examplePlan } from '../testing'
import { poolLetters, vdevCodes } from './codes'

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

describe('poolLetters', () => {
  it('letters pools in order and continues after Z', () => {
    const pools = Array.from({ length: 28 }, (_, i) => ({ id: `p${i}` }))
    const letters = poolLetters(pools)
    expect([0, 1, 25, 26, 27].map((i) => letters.get(`p${i}`))).toEqual(['A', 'B', 'Z', 'AA', 'AB'])
  })
})
