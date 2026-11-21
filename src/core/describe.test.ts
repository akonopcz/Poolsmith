import { describe, expect, it } from 'vitest'
import { diskName } from './describe'
import { examplePlan, hdd } from './testing'

describe('diskName', () => {
  it('prefers the bay', () => {
    expect(diskName(examplePlan().host, 'h3')).toBe('DS4246 bay 3')
  })

  it('falls back to the label, then the ID, for disks without a bay', () => {
    const host = examplePlan().host
    host.disks.push({ ...hdd('loose'), label: 'WD Red spare' }, hdd('bare'))
    expect(diskName(host, 'loose')).toBe('WD Red spare')
    expect(diskName(host, 'bare')).toBe('bare')
  })
})
