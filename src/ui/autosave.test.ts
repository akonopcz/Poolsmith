import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serializePlan } from '../core/file'
import { examplePlan } from '../core/testing'
import { Autosave, type PlanStorage, readStoredPlan } from './autosave'

function memoryStorage(): PlanStorage & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }
}

const blocked: PlanStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('readStoredPlan', () => {
  it('reads back a kept plan', () => {
    const storage = memoryStorage()
    storage.setItem('poolsmith-plan', serializePlan(examplePlan()))
    expect(readStoredPlan(storage)).toEqual(examplePlan())
  })

  it('gives nothing when nothing is kept, the text is broken or storage is blocked', () => {
    const storage = memoryStorage()
    expect(readStoredPlan(storage)).toBeNull()
    storage.setItem('poolsmith-plan', '{"schemaVersion":')
    expect(readStoredPlan(storage)).toBeNull()
    expect(readStoredPlan(blocked)).toBeNull()
    expect(readStoredPlan(null)).toBeNull()
  })
})

describe('Autosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('writes once, after the last change settles', () => {
    const storage = memoryStorage()
    const autosave = new Autosave(storage, 'a', 500)
    autosave.change('b')
    vi.advanceTimersByTime(400)
    autosave.change('c')
    vi.advanceTimersByTime(400)
    expect(storage.items.size).toBe(0)
    vi.advanceTimersByTime(100)
    expect(storage.items.get('poolsmith-plan')).toBe('c')
  })

  it('does not write a plan that matches what is kept', () => {
    const storage = memoryStorage()
    const autosave = new Autosave(storage, 'a', 500)
    autosave.change('b')
    autosave.change('a')
    vi.advanceTimersByTime(1000)
    expect(storage.items.size).toBe(0)
  })

  it('writes a waiting change at once on flush', () => {
    const storage = memoryStorage()
    const autosave = new Autosave(storage, 'a', 500)
    autosave.change('b')
    autosave.flush()
    expect(storage.items.get('poolsmith-plan')).toBe('b')
  })

  it('keeps working when storage is blocked or full', () => {
    const autosave = new Autosave(blocked, 'a', 500)
    autosave.change('b')
    expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    expect(() => autosave.flush()).not.toThrow()
  })
})
