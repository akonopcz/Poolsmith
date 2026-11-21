import type { Issue } from '../core/issue'
import type { Plan } from '../core/model'
import type { Warning } from '../core/warning'
import type { ZfsPool } from '../core/zfs/model'
import { zfsDiskIds } from '../core/zfs/validate'
import { vdevsOf } from './edits'
import { widenIds } from './labels'

export type Finding =
  ({ kind: 'issue'; severity: 'issue' } & Issue) | ({ kind: 'warning' } & Warning)

const RANK = { issue: 0, warning: 1, info: 2 }

/** Findings for the pool in view and for the host, issues first and quiet hints last. */
export function findingsFor(
  plan: Plan,
  pool: ZfsPool,
  issues: Issue[],
  warnings: Warning[],
): Finding[] {
  const mine = new Set<string>()
  const anyPool = new Set<string>()
  for (const p of plan.layouts) {
    const ids = [p.id, ...vdevsOf(p).map((v) => v.id), ...zfsDiskIds(p)]
    ids.forEach((id) => anyPool.add(id))
    if (p === pool) ids.forEach((id) => mine.add(id))
  }
  const relevant = (ids: string[]) =>
    ids.some((id) => mine.has(id)) || ids.every((id) => !anyPool.has(id))
  return [
    ...issues.map((i): Finding => ({ ...i, kind: 'issue', severity: 'issue' })),
    ...warnings.map((w): Finding => ({ ...w, kind: 'warning' })),
  ]
    .filter((f) => relevant(f.ids))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity])
}

/** Every id the findings touch, with the worst severity, for markers on bays and lines. */
export function flaggedIds(plan: Plan, findings: Finding[]): Map<string, Finding['severity']> {
  const out = new Map<string, Finding['severity']>()
  for (const finding of findings) {
    for (const id of widenIds(plan, finding.ids)) {
      const current = out.get(id)
      if (current === undefined || RANK[finding.severity] < RANK[current]) {
        out.set(id, finding.severity)
      }
    }
  }
  return out
}
