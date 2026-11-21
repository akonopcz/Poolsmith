import type { Issue } from '../issue'
import type { Vdev, ZfsPool } from './model'
import { minDisks } from './topology'

const MIN_ASHIFT = 9
const MAX_ASHIFT = 16
const MIN_RECORDSIZE = 512
// Default zfs_max_recordsize since OpenZFS 2.2.
const MAX_RECORDSIZE = 16 * 1024 * 1024

// Rules from zpool-create(8).
const POOL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_\-:. ]*$/
const RESERVED_POOL_NAMES = ['log']
const RESERVED_POOL_NAME_PREFIXES = ['mirror', 'raidz', 'draid', 'spare']

/** Every disk reference in the pool, with repeats, so callers can find disks used twice. */
export function zfsDiskIds(pool: ZfsPool): string[] {
  const vdevs = [...pool.data, ...pool.special, ...pool.log]
  return [...vdevs.flatMap((vdev) => vdev.diskIds), ...pool.cache, ...pool.spare]
}

export function validateZfsPool(pool: ZfsPool, knownDiskIds: Set<string>): Issue[] {
  const issues: Issue[] = []

  if (!Number.isInteger(pool.ashift) || pool.ashift < MIN_ASHIFT || pool.ashift > MAX_ASHIFT) {
    issues.push({
      code: 'invalid-ashift',
      message: `ashift ${pool.ashift} is outside ${MIN_ASHIFT}–${MAX_ASHIFT}`,
      ids: [pool.id],
    })
  }

  if (!isPowerOfTwoInRange(pool.recordsize, MIN_RECORDSIZE, MAX_RECORDSIZE)) {
    issues.push({
      code: 'invalid-recordsize',
      message: `recordsize ${pool.recordsize} is not a power of two from 512 B to 16 MiB`,
      ids: [pool.id],
    })
  }

  const nameProblem = poolNameProblem(pool.name)
  if (nameProblem !== undefined) {
    issues.push({
      code: 'invalid-pool-name',
      message: `Pool name "${pool.name}" ${nameProblem}`,
      ids: [pool.id],
    })
  }

  if (pool.data.length === 0) {
    issues.push({ code: 'no-data-vdev', message: 'Pool has no data vdev', ids: [pool.id] })
  }

  for (const vdev of [...pool.data, ...pool.special, ...pool.log]) {
    issues.push(...validateDiskCount(vdev))
  }

  for (const vdev of pool.log) {
    if (vdev.type !== 'disk' && vdev.type !== 'mirror') {
      issues.push({
        code: 'log-vdev-type',
        message: `Log vdev is ${vdev.type}, but only single disks and mirrors are allowed`,
        ids: [vdev.id],
      })
    }
  }

  for (const diskId of new Set(zfsDiskIds(pool))) {
    if (!knownDiskIds.has(diskId)) {
      issues.push({ code: 'unknown-disk', message: `Unknown disk ${diskId}`, ids: [diskId] })
    }
  }

  return issues
}

function validateDiskCount(vdev: Vdev): Issue[] {
  const count = vdev.diskIds.length
  const min = minDisks(vdev.type)
  if (vdev.type === 'disk' ? count === 1 : count >= min) return []

  const expected = vdev.type === 'disk' ? 'exactly 1 disk' : `at least ${min} disks`
  return [
    {
      code: 'vdev-disk-count',
      message: `${vdev.type} vdev has ${count} ${count === 1 ? 'disk' : 'disks'}, needs ${expected}`,
      ids: [vdev.id],
    },
  ]
}

function poolNameProblem(name: string): string | undefined {
  if (!POOL_NAME_PATTERN.test(name)) {
    return 'must start with a letter and contain only letters, digits, "_", "-", ":", "." and spaces'
  }
  if (RESERVED_POOL_NAMES.includes(name)) return 'is reserved'
  const prefix = RESERVED_POOL_NAME_PREFIXES.find((reserved) => name.startsWith(reserved))
  if (prefix !== undefined) return `must not start with "${prefix}"`
  return undefined
}

function isPowerOfTwoInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max && (value & (value - 1)) === 0
}
