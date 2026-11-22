import { parsePlan } from '../core/file'
import type { Plan } from '../core/model'

const PLAN_KEY = 'poolsmith-plan'

export type PlanStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The browser's storage, or nothing when it is blocked. */
export function browserStorage(): PlanStorage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

/** The plan this browser kept, or nothing when none is kept or it no longer reads. */
export function readStoredPlan(storage: PlanStorage | null): Plan | null {
  try {
    const text = storage?.getItem(PLAN_KEY)
    if (text == null) return null
    const result = parsePlan(text)
    return result.ok ? result.plan : null
  } catch {
    return null
  }
}

/**
 * Writes the plan a moment after the last change, so typing a name does not write on every key.
 * `flush` writes a waiting change at once, for when the page goes away.
 */
export class Autosave {
  private timer: ReturnType<typeof setTimeout> | undefined
  private pending: string | null = null

  /** `stored` is the text already in storage, so an unchanged plan is never written. */
  constructor(
    private storage: PlanStorage | null,
    private stored: string,
    private delayMs: number,
  ) {}

  change(text: string) {
    clearTimeout(this.timer)
    this.pending = text === this.stored ? null : text
    if (this.pending !== null) this.timer = setTimeout(() => this.flush(), this.delayMs)
  }

  flush() {
    clearTimeout(this.timer)
    if (this.pending === null) return
    try {
      this.storage?.setItem(PLAN_KEY, this.pending)
    } catch {
      // Blocked or full storage: the plan lasts for this visit only. A plan file still keeps it.
    }
    this.stored = this.pending
    this.pending = null
  }
}
