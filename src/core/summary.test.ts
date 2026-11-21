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
  it('says when the pool may lose no disk', () => {
    const plan = examplePlan()
    plan.layouts[0].special[0] = { id: 'tank-special-0', type: 'disk', diskIds: ['s0'] }
    expect(planSummary(plan)).toContain(
      'The pool may lose no disk: one failed data or special disk loses it.',
    )
  })

  it('leaves out the pool line while no data vdev is complete', () => {
    const plan = examplePlan()
    plan.layouts[0].data[0].diskIds = ['h0']
    expect(planSummary(plan)).not.toContain('The pool may lose')
  })
})
