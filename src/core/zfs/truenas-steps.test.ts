import { describe, expect, it } from 'vitest'
import { examplePlan, hdd, ssd } from '../testing'
import { trueNasSteps } from './truenas-steps'

describe('trueNasSteps', () => {
  it('walks through the wizard for the example plan', () => {
    const plan = examplePlan()
    expect(trueNasSteps(plan.layouts[0], plan.host)).toEqual({
      version: '25.10',
      steps: [
        'Open **Storage** and click **Create Pool** at the top right of the Storage Dashboard.',
        '**General Info**: enter `tank` as **Name**. Leave **Encryption** off, the plan does not cover encryption.',
        '**Data**: set **Layout** to RAIDZ2, **Width** to 6 and **Number of VDEVs** to 1. Click **Manual Disk Selection** and assign VDEV 1: h0 (8 TB HDD, DS4246 bay 0), h1 (8 TB HDD, DS4246 bay 1), h2 (8 TB HDD, DS4246 bay 2), h3 (8 TB HDD, DS4246 bay 3), h4 (8 TB HDD, DS4246 bay 4), h5 (8 TB HDD, DS4246 bay 5).',
        '**Spare (Optional)**: add h6 (8 TB HDD, DS4246 bay 6).',
        '**Metadata (Optional)**: set **Layout** to Mirror, **Width** to 2 and **Number of VDEVs** to 1. Click **Manual Disk Selection** and assign VDEV 1: s0 (1 TB SSD, DL380 Gen9 bay 0), s1 (1 TB SSD, DL380 Gen9 bay 1).',
        'Skip **Dedup (Optional)**.',
        '**Review**: check the vdevs, then click **Create Pool**.',
      ],
      notes: [
        'Labels follow the TrueNAS 25.10 docs and may differ slightly in the live UI.',
        'The wizard has no ashift field. TrueNAS chooses it, the plan assumes 12.',
        'TrueNAS 27 calls the Metadata step Special.',
      ],
    })
  })

  it('builds single-disk vdevs as one stripe', () => {
    const plan = examplePlan()
    const pool = {
      ...plan.layouts[0],
      data: ['h0', 'h1', 'h2'].map((id) => ({ id, type: 'disk' as const, diskIds: [id] })),
      special: [],
      spare: [],
    }
    expect(trueNasSteps(pool, plan.host).steps[2]).toMatch(
      /^\*\*Data\*\*: set \*\*Layout\*\* to Stripe, \*\*Width\*\* to 3 and \*\*Number of VDEVs\*\* to 1\. Click \*\*Manual Disk Selection\*\* and assign h0 /,
    )
  })

  it('counts equal data vdevs and notes the ones the wizard cannot build', () => {
    const plan = examplePlan()
    plan.host.disks.push(hdd('h7'), hdd('h8'), hdd('h9'))
    const pool = {
      ...plan.layouts[0],
      data: [
        { id: 'm0', type: 'mirror' as const, diskIds: ['h0', 'h1'] },
        { id: 'm1', type: 'mirror' as const, diskIds: ['h2', 'h3'] },
        { id: 'z', type: 'raidz1' as const, diskIds: ['h4', 'h5', 'h7'] },
      ],
      special: [],
      spare: [],
    }
    const { steps, notes } = trueNasSteps(pool, plan.host)
    expect(steps[2]).toContain('**Width** to 2 and **Number of VDEVs** to 2')
    expect(steps[2]).toContain('VDEV 2: h2 (8 TB HDD, DS4246 bay 2), h3')
    expect(notes[2]).toMatch(/^The wizard builds data vdevs of one layout and width only\./)
    expect(notes[2]).toContain(
      'RAIDZ1 of h4 (8 TB HDD, DS4246 bay 4), h5 (8 TB HDD, DS4246 bay 5), h7 (8 TB HDD)',
    )
  })

  it('adds log and cache steps and a record size step after creation', () => {
    const plan = examplePlan()
    plan.host.disks.push(ssd('c0'))
    const pool = {
      ...plan.layouts[0],
      recordsize: 1024 * 1024,
      log: [{ id: 'log', type: 'mirror' as const, diskIds: ['s2', 'c0'] }],
      special: [],
      spare: [],
    }
    plan.host.disks.push(ssd('c1'))
    pool.cache = ['c1']
    const { steps } = trueNasSteps(pool, plan.host)
    expect(steps.map((step) => step.split(':')[0])).toEqual([
      'Open **Storage** and click **Create Pool** at the top right of the Storage Dashboard.',
      '**General Info**',
      '**Data**',
      '**Log (Optional)**',
      '**Cache (Optional)**',
      'Skip **Dedup (Optional)**.',
      '**Review**',
      'After creation, open **Datasets**, edit the root dataset `tank` and set **Record Size** to 1M under **Advanced Options**.',
    ])
  })
})
