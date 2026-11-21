import type { Plan } from '../core/model'
import { examplePlan } from '../core/testing'
import { validatePlan } from '../core/validate'
import { findWarnings } from '../core/warn'
import { computeNaiveCapacity } from '../core/zfs/capacity'
import { computeEfficiencyTable } from '../core/zfs/efficiency'
import { estimatePerformance } from '../core/zfs/performance'
import { computeReportedCapacity } from '../core/zfs/reported'
import { zfsDiskIds } from '../core/zfs/validate'
import { emptyPlan, vdevsOf } from './edits'
import { findingsFor, flaggedIds } from './findings'

export type { Finding } from './findings'
import { widenIds } from './labels'

export type Theme = 'dark' | 'light'

/** What the form area of the hardware column shows. */
export type Editor =
  | { mode: 'add-to-bay'; bayId: string; enclosureId: string }
  | { mode: 'add-loose' }
  | { mode: 'edit'; diskId: string }
  | { mode: 'enclosure' }

const THEME_KEY = 'poolsmith-theme'

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

class Store {
  plan = $state<Plan>(emptyPlan())
  poolId = $state('tank')
  view = $state<'plan' | 'export'>('plan')
  theme = $state<Theme>(loadTheme())
  /** Ids the pointer or keyboard focus is on. Everything else dims while it is set. */
  focus = $state<Set<string> | null>(null)
  /** Disk picked by click, waiting for a click on a target. */
  picked = $state<string | null>(null)
  /** Disk being dragged. */
  dragging = $state<string | null>(null)
  editor = $state<Editor | null>(null)
  /** Problems from the last file that failed to load. */
  loadErrors = $state<string[] | null>(null)

  pool = $derived(this.plan.layouts.find((p) => p.id === this.poolId) ?? this.plan.layouts[0])
  disks = $derived(this.plan.host.disks)

  issues = $derived(validatePlan(this.plan))
  warnings = $derived(findWarnings(this.plan))

  // A pool nobody has started yet is not an error worth shouting about; the export still says so.
  findings = $derived(
    findingsFor(this.plan, this.pool, this.issues, this.warnings).filter(
      (f) => f.code !== 'no-data-vdev' || !this.poolIsBlank,
    ),
  )
  flagged = $derived(flaggedIds(this.plan, this.findings))

  naive = $derived(this.pool ? computeNaiveCapacity(this.pool, this.disks) : undefined)
  reported = $derived(this.pool ? computeReportedCapacity(this.pool, this.disks) : undefined)
  efficiency = $derived(this.pool ? computeEfficiencyTable(this.pool, this.disks) : undefined)
  performance = $derived(this.pool ? estimatePerformance(this.pool) : undefined)

  poolIsBlank = $derived(zfsDiskIds(this.pool).length === 0 && vdevsOf(this.pool).length === 0)

  usedDiskIds = $derived(new Set(this.plan.layouts.flatMap(zfsDiskIds)))

  isEmpty = $derived(this.plan.host.enclosures.length === 0 && this.plan.host.disks.length === 0)

  setTheme(theme: Theme) {
    this.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Private mode or blocked storage: the choice lasts for this visit only.
    }
  }

  load(plan: Plan) {
    this.plan = plan
    this.poolId = plan.layouts[0]?.id ?? ''
    this.picked = null
    this.focus = null
    this.editor = null
    this.loadErrors = null
    this.view = 'plan'
  }

  loadExample() {
    this.load(examplePlan())
  }

  reset() {
    this.load(emptyPlan())
  }

  isDim(ids: string[]): boolean {
    return this.focus !== null && !ids.some((id) => this.focus!.has(id))
  }

  focusOn(ids: string[] | null) {
    this.focus = ids === null ? null : widenIds(this.plan, ids)
  }
}

export const store = new Store()
