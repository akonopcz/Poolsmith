import { describe, expect, it } from 'vitest'
import { examplePlan } from '../core/testing'
import { enclosureWidth, hardwareColumnWidth } from './bays'

describe('hardwareColumnWidth', () => {
  const [chassis, shelf] = examplePlan().host.enclosures
  shelf.columns = 4

  it('measures enclosures by their bays', () => {
    expect(enclosureWidth(chassis)).toBe(8 * 48 + 7 * 4)
    expect(enclosureWidth(shelf)).toBe(4 * 88 + 3 * 4)
  })

  it('puts enclosures side by side when the limit allows', () => {
    expect(hardwareColumnWidth([chassis, shelf], 1000)).toBe(412 + 32 + 364 + 60)
  })

  it('takes only the widest enclosure once they wrap', () => {
    expect(hardwareColumnWidth([chassis, shelf], 720)).toBe(412 + 60)
  })

  it('keeps a minimum width for forms and an empty plan', () => {
    expect(hardwareColumnWidth([], 720)).toBe(340)
  })
})
