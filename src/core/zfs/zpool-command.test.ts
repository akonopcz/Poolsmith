import { describe, expect, it } from 'vitest'
import { examplePlan, ssd } from '../testing'
import { zpoolCreateCommand } from './zpool-command'

describe('zpoolCreateCommand', () => {
  it('lists every disk with a placeholder and puts the classes in order', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    plan.host.disks[0].label = 'WD Red'
    pool.log = [{ id: 'log', type: 'disk', diskIds: ['s2'] }]

    expect(zpoolCreateCommand(pool, plan.host)).toBe(
      [
        '# Reference only. poolsmith never runs commands on a host.',
        '# zpool create wipes every disk it lists. Replace each <disk:ID> with the',
        '# matching /dev/disk/by-id path before running it.',
        '#',
        '# <disk:h0>  8 TB HDD, DS4246 bay 0, WD Red',
        '# <disk:h1>  8 TB HDD, DS4246 bay 1',
        '# <disk:h2>  8 TB HDD, DS4246 bay 2',
        '# <disk:h3>  8 TB HDD, DS4246 bay 3',
        '# <disk:h4>  8 TB HDD, DS4246 bay 4',
        '# <disk:h5>  8 TB HDD, DS4246 bay 5',
        '# <disk:s0>  1 TB SSD, DL380 Gen9 bay 0',
        '# <disk:s1>  1 TB SSD, DL380 Gen9 bay 1',
        '# <disk:s2>  1 TB SSD, DL380 Gen9 bay 2',
        '# <disk:h6>  8 TB HDD, DS4246 bay 6',
        'zpool create \\',
        '  -o ashift=12 \\',
        '  -O recordsize=128K \\',
        '  tank \\',
        '  raidz2 <disk:h0> <disk:h1> <disk:h2> <disk:h3> <disk:h4> <disk:h5> \\',
        '  special mirror <disk:s0> <disk:s1> \\',
        '  log <disk:s2> \\',
        '  spare <disk:h6>',
        '',
      ].join('\n'),
    )
  })

  it('writes a class keyword once and single disks without a type', () => {
    const plan = examplePlan()
    plan.host.disks.push(ssd('c0'), ssd('s3'))
    const pool = {
      ...plan.layouts[0],
      data: [
        { id: 'd0', type: 'disk' as const, diskIds: ['h0'] },
        { id: 'd1', type: 'disk' as const, diskIds: ['h1'] },
      ],
      special: [
        { id: 'sp0', type: 'mirror' as const, diskIds: ['s0', 's1'] },
        { id: 'sp1', type: 'mirror' as const, diskIds: ['s2', 's3'] },
      ],
      cache: ['c0'],
      spare: [],
    }
    const lines = zpoolCreateCommand(pool, plan.host).split('\n')
    expect(lines.slice(lines.indexOf('  tank \\') + 1)).toEqual([
      '  <disk:h0> \\',
      '  <disk:h1> \\',
      '  special mirror <disk:s0> <disk:s1> \\',
      '  mirror <disk:s2> <disk:s3> \\',
      '  cache <disk:c0>',
      '',
    ])
  })

  it('quotes a pool name with spaces and writes a non-default recordsize', () => {
    const plan = examplePlan()
    const pool = { ...plan.layouts[0], name: 'my pool', recordsize: 1024 * 1024 }
    const command = zpoolCreateCommand(pool, plan.host)
    expect(command).toContain("  'my pool' \\")
    expect(command).toContain('  -O recordsize=1M \\')
  })
})
