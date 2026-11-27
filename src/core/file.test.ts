import { describe, expect, it } from 'vitest'
import { parsePlan, serializePlan } from './file'
import { examplePlan } from './testing'

function parseObject(value: unknown) {
  return parsePlan(JSON.stringify(value))
}

function errors(value: unknown) {
  const result = parseObject(value)
  return result.ok ? [] : result.errors
}

describe('plan file', () => {
  it('reads back what it writes', () => {
    const plan = examplePlan()
    plan.host.disks[0].label = 'WD Red 8TB'
    expect(parsePlan(serializePlan(plan))).toEqual({ ok: true, plan })
  })

  it('reads back bays per row', () => {
    const plan = examplePlan()
    plan.host.enclosures[1].columns = 6
    expect(parsePlan(serializePlan(plan))).toEqual({ ok: true, plan })
  })

  it('reads back PCIe cards and add-in card bays', () => {
    const plan = examplePlan()
    plan.host.enclosures.push(
      {
        id: 'hyper',
        name: 'Hyper M.2',
        kind: 'card',
        bays: [{ id: 'hyper-0', label: '0', formFactor: 'm2' }],
      },
      {
        id: 'slots',
        name: 'PCIe slots',
        kind: 'chassis',
        bays: [{ id: 'slot-3', label: '3', formFactor: 'aic' }],
      },
    )
    expect(parsePlan(serializePlan(plan))).toEqual({ ok: true, plan })
  })

  it('reports bays per row that are not a positive whole number', () => {
    const plan = examplePlan()
    plan.host.enclosures[1].columns = 0
    expect(errors(plan)).toEqual([
      'host.enclosures[1].columns must be a whole number of at least 1',
    ])
  })

  it('writes indented JSON with a final newline', () => {
    const text = serializePlan(examplePlan())
    expect(text.startsWith('{\n  "schemaVersion": 1,')).toBe(true)
    expect(text.endsWith('}\n')).toBe(true)
  })

  it('drops unknown fields', () => {
    const data = { ...examplePlan(), comment: 'x' }
    data.host.disks[0] = { ...data.host.disks[0], serial: 'ABC' } as never
    const result = parseObject(data)
    expect(result.ok && 'comment' in result.plan).toBe(false)
    expect(result.ok && 'serial' in result.plan.host.disks[0]).toBe(false)
  })

  it('accepts a plan that is half built', () => {
    const plan = examplePlan()
    plan.layouts[0].data[0].diskIds = ['h0']
    expect(parsePlan(serializePlan(plan)).ok).toBe(true)
  })

  it('reports text that is not JSON', () => {
    const result = parsePlan('{ nope')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.errors[0]).toMatch(/^Not valid JSON/)
  })

  it('refuses a newer schema version with one clear message', () => {
    expect(errors({ schemaVersion: 2 })).toEqual([
      'Plan has schema version 2, this version of poolsmith reads up to 1',
    ])
  })

  it('reports every wrong field with its path', () => {
    const data = JSON.parse(serializePlan(examplePlan()))
    data.schemaVersion = 0
    data.host.controllers[0].mode = 'jbod'
    data.host.disks[1].sizeBytes = '8 TB'
    data.host.enclosures[0].bays[0].diskId = 7
    data.layouts[0].data[0].type = 'raidz4'
    data.layouts[0].spare = 'h6'
    delete data.name
    expect(errors(data)).toEqual([
      'schemaVersion must be 1',
      'name must be a string',
      'host.controllers[0].mode must be one of "hba", "raid"',
      'host.enclosures[0].bays[0].diskId must be a string',
      'host.disks[1].sizeBytes must be a number',
      'layouts[0].data[0].type must be one of "disk", "mirror", "raidz1", "raidz2", "raidz3"',
      'layouts[0].spare must be an array',
    ])
  })

  it('reports a layout of an unknown kind', () => {
    const data = JSON.parse(serializePlan(examplePlan()))
    data.layouts[0].kind = 'mdadm'
    expect(errors(data)).toEqual(['layouts[0].kind must be "zfs"'])
  })

  it('reports a plan that is not an object', () => {
    expect(errors([])).toContain('plan must be an object')
  })
})
