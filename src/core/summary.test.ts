import { describe, expect, it } from 'vitest'
import { planSummary } from './summary'
import { examplePlan } from './testing'

describe('planSummary', () => {
  it('renders the example plan', () => {
    expect(planSummary(examplePlan())).toMatchSnapshot()
  })

  it('lists issues before everything else', () => {
    const plan = examplePlan()
    plan.layouts[0].data[0].diskIds = ['h0']
    const summary = planSummary(plan)
    expect(summary.indexOf('## Issues')).toBeLessThan(summary.indexOf('## Disks'))
    expect(summary).toContain('- raidz2 vdev has 1 disks, needs at least 3 disks')
  })
})
