import { describe, expect, it } from 'vitest'
import { bayColumns, guessBayColumns } from './enclosure'
import { examplePlan } from './testing'

describe('bayColumns', () => {
  it('uses the stored value', () => {
    const shelf = examplePlan().host.enclosures[1]
    shelf.columns = 4
    expect(bayColumns(shelf)).toBe(4)
  })

  it('guesses without a stored value', () => {
    const [chassis, shelf] = examplePlan().host.enclosures
    expect(bayColumns(chassis)).toBe(8)
    expect(bayColumns(shelf)).toBe(6)
  })

  it('never uses more columns than bays', () => {
    const shelf = examplePlan().host.enclosures[1]
    shelf.columns = 30
    expect(bayColumns(shelf)).toBe(24)
    expect(bayColumns({ ...shelf, columns: undefined, bays: shelf.bays.slice(0, 2) })).toBe(2)
  })

  it('ignores a stored value that is not a positive whole number', () => {
    const shelf = examplePlan().host.enclosures[1]
    shelf.columns = 0
    expect(bayColumns(shelf)).toBe(6)
  })
})

describe('guessBayColumns', () => {
  it.each([
    ['lff', 12, 4],
    ['lff', 24, 6],
    ['sff', 24, 8],
    ['m2', 2, 4],
  ] as const)('%s with %i bays: %i per row', (formFactor, count, columns) => {
    expect(guessBayColumns(formFactor, count)).toBe(columns)
  })
})
