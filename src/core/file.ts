import type { Bay, Controller, Disk, Enclosure, Host, Layout, Plan } from './model'
import { SCHEMA_VERSION } from './model'
import type { Vdev, VdevType, ZfsPool } from './zfs/model'

export type ParseResult = { ok: true; plan: Plan } | { ok: false; errors: string[] }

/** Stable, readable JSON, so a plan diffs well in git. */
export function serializePlan(plan: Plan): string {
  return `${JSON.stringify(plan, null, 2)}\n`
}

/**
 * Reads a plan file and checks its shape. It keeps only known fields. Whether the plan makes
 * sense is a separate question for `validatePlan`.
 */
export function parsePlan(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { ok: false, errors: [`Not valid JSON: ${(error as Error).message}`] }
  }

  const version = isObject(data) ? data.schemaVersion : undefined
  if (typeof version === 'number' && version > SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `Plan has schema version ${version}, this version of poolsmith reads up to ${SCHEMA_VERSION}`,
      ],
    }
  }
  const reader = new Reader()
  const plan = reader.plan(data)
  return reader.errors.length === 0 ? { ok: true, plan } : { ok: false, errors: reader.errors }
}

type Fields = Record<string, unknown>

const VDEV_TYPES: VdevType[] = ['disk', 'mirror', 'raidz1', 'raidz2', 'raidz3']

/** Collects every problem instead of stopping at the first, so one load shows them all. */
class Reader {
  errors: string[] = []

  plan(data: unknown): Plan {
    const o = this.object(data, 'plan')
    if (o.schemaVersion !== SCHEMA_VERSION) {
      this.errors.push(`schemaVersion must be ${SCHEMA_VERSION}`)
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      name: this.string(o.name, 'name'),
      host: this.host(o.host, 'host'),
      layouts: this.array(o.layouts, 'layouts', (item, path) => this.layout(item, path)),
    }
  }

  host(data: unknown, path: string): Host {
    const o = this.object(data, path)
    return {
      name: this.string(o.name, `${path}.name`),
      controllers: this.array(o.controllers, `${path}.controllers`, (item, p) =>
        this.controller(item, p),
      ),
      enclosures: this.array(o.enclosures, `${path}.enclosures`, (item, p) =>
        this.enclosure(item, p),
      ),
      disks: this.array(o.disks, `${path}.disks`, (item, p) => this.disk(item, p)),
    }
  }

  controller(data: unknown, path: string): Controller {
    const o = this.object(data, path)
    return {
      id: this.string(o.id, `${path}.id`),
      name: this.string(o.name, `${path}.name`),
      mode: this.oneOf(o.mode, `${path}.mode`, ['hba', 'raid']),
    }
  }

  enclosure(data: unknown, path: string): Enclosure {
    const o = this.object(data, path)
    const enclosure: Enclosure = {
      id: this.string(o.id, `${path}.id`),
      name: this.string(o.name, `${path}.name`),
      kind: this.oneOf(o.kind, `${path}.kind`, ['chassis', 'shelf', 'usb', 'card']),
      bays: this.array(o.bays, `${path}.bays`, (item, p) => this.bay(item, p)),
    }
    if (o.columns !== undefined) {
      const columns = this.number(o.columns, `${path}.columns`)
      if (Number.isInteger(columns) && columns >= 1) enclosure.columns = columns
      else this.errors.push(`${path}.columns must be a whole number of at least 1`)
    }
    return enclosure
  }

  bay(data: unknown, path: string): Bay {
    const o = this.object(data, path)
    const bay: Bay = {
      id: this.string(o.id, `${path}.id`),
      label: this.string(o.label, `${path}.label`),
      formFactor: this.oneOf(o.formFactor, `${path}.formFactor`, ['lff', 'sff', 'm2', 'aic']),
    }
    if (o.controllerId !== undefined) {
      bay.controllerId = this.string(o.controllerId, `${path}.controllerId`)
    }
    if (o.diskId !== undefined) bay.diskId = this.string(o.diskId, `${path}.diskId`)
    return bay
  }

  disk(data: unknown, path: string): Disk {
    const o = this.object(data, path)
    const disk: Disk = {
      id: this.string(o.id, `${path}.id`),
      sizeBytes: this.number(o.sizeBytes, `${path}.sizeBytes`),
      type: this.oneOf(o.type, `${path}.type`, ['hdd', 'ssd', 'nvme']),
      logicalSectorSize: this.oneOf(o.logicalSectorSize, `${path}.logicalSectorSize`, [512, 4096]),
      physicalSectorSize: this.oneOf(
        o.physicalSectorSize,
        `${path}.physicalSectorSize`,
        [512, 4096],
      ),
    }
    if (o.label !== undefined) disk.label = this.string(o.label, `${path}.label`)
    return disk
  }

  layout(data: unknown, path: string): Layout {
    const o = this.object(data, path)
    if (o.kind !== 'zfs') this.errors.push(`${path}.kind must be "zfs"`)
    return this.zfsPool(o, path)
  }

  zfsPool(o: Fields, path: string): ZfsPool {
    const vdevs = (key: string) =>
      this.array(o[key], `${path}.${key}`, (item, p) => this.vdev(item, p))
    const diskIds = (key: string) =>
      this.array(o[key], `${path}.${key}`, (item, p) => this.string(item, p))
    return {
      kind: 'zfs',
      id: this.string(o.id, `${path}.id`),
      name: this.string(o.name, `${path}.name`),
      ashift: this.number(o.ashift, `${path}.ashift`),
      recordsize: this.number(o.recordsize, `${path}.recordsize`),
      data: vdevs('data'),
      special: vdevs('special'),
      log: vdevs('log'),
      cache: diskIds('cache'),
      spare: diskIds('spare'),
    }
  }

  vdev(data: unknown, path: string): Vdev {
    const o = this.object(data, path)
    return {
      id: this.string(o.id, `${path}.id`),
      type: this.oneOf(o.type, `${path}.type`, VDEV_TYPES),
      diskIds: this.array(o.diskIds, `${path}.diskIds`, (item, p) => this.string(item, p)),
    }
  }

  object(value: unknown, path: string): Fields {
    if (isObject(value)) return value
    this.errors.push(`${path} must be an object`)
    return {}
  }

  array<T>(value: unknown, path: string, read: (item: unknown, path: string) => T): T[] {
    if (Array.isArray(value)) return value.map((item, i) => read(item, `${path}[${i}]`))
    this.errors.push(`${path} must be an array`)
    return []
  }

  string(value: unknown, path: string): string {
    if (typeof value === 'string') return value
    this.errors.push(`${path} must be a string`)
    return ''
  }

  number(value: unknown, path: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    this.errors.push(`${path} must be a number`)
    return 0
  }

  oneOf<T extends string | number>(value: unknown, path: string, allowed: readonly T[]): T {
    if (allowed.includes(value as T)) return value as T
    this.errors.push(`${path} must be one of ${allowed.map((v) => JSON.stringify(v)).join(', ')}`)
    return allowed[0]
  }
}

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
