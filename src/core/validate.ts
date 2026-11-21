import type { Issue } from './issue'
import type { Host, Plan } from './model'
import { validateZfsPool, zfsDiskIds } from './zfs/validate'

/**
 * Finds parts of a plan that ZFS would reject or that refer to missing parts. A plan with issues
 * is still a valid file, because half-built layouts are a normal state while planning.
 */
export function validatePlan(plan: Plan): Issue[] {
  const issues: Issue[] = [...findDuplicateIds(plan), ...validateHost(plan.host)]
  const knownDiskIds = new Set(plan.host.disks.map((disk) => disk.id))

  for (const layout of plan.layouts) {
    issues.push(...validateZfsPool(layout, knownDiskIds))
  }

  const usage = countBy(plan.layouts.flatMap(zfsDiskIds))
  for (const [diskId, count] of usage) {
    if (count > 1) {
      issues.push({
        code: 'disk-used-twice',
        message: `Disk ${diskId} is used ${count} times`,
        ids: [diskId],
      })
    }
  }

  return issues
}

function findDuplicateIds(plan: Plan): Issue[] {
  const { host } = plan
  const bays = host.enclosures.flatMap((enclosure) => enclosure.bays)
  const vdevs = plan.layouts.flatMap((pool) => [...pool.data, ...pool.special, ...pool.log])
  const ids = [
    ...host.controllers,
    ...host.enclosures,
    ...bays,
    ...host.disks,
    ...plan.layouts,
    ...vdevs,
  ].map((part) => part.id)

  return [...countBy(ids)]
    .filter(([, count]) => count > 1)
    .map(([id]): Issue => ({ code: 'duplicate-id', message: `ID ${id} is not unique`, ids: [id] }))
}

function validateHost(host: Host): Issue[] {
  const issues: Issue[] = []
  const controllerIds = new Set(host.controllers.map((controller) => controller.id))
  const diskIds = new Set(host.disks.map((disk) => disk.id))
  const bays = host.enclosures.flatMap((enclosure) => enclosure.bays)

  for (const bay of bays) {
    if (bay.controllerId !== undefined && !controllerIds.has(bay.controllerId)) {
      issues.push({
        code: 'unknown-controller',
        message: `Bay ${bay.label} refers to unknown controller ${bay.controllerId}`,
        ids: [bay.id],
      })
    }
    if (bay.diskId !== undefined && !diskIds.has(bay.diskId)) {
      issues.push({
        code: 'unknown-disk',
        message: `Bay ${bay.label} refers to unknown disk ${bay.diskId}`,
        ids: [bay.id],
      })
    }
  }

  const bayCounts = countBy(bays.flatMap((bay) => (bay.diskId === undefined ? [] : [bay.diskId])))
  for (const [diskId, count] of bayCounts) {
    if (count > 1) {
      issues.push({
        code: 'disk-in-several-bays',
        message: `Disk ${diskId} sits in ${count} bays`,
        ids: [diskId],
      })
    }
  }

  for (const disk of host.disks) {
    if (!Number.isSafeInteger(disk.sizeBytes) || disk.sizeBytes <= 0) {
      issues.push({
        code: 'invalid-disk-size',
        message: `Disk size ${disk.sizeBytes} is not a positive safe integer`,
        ids: [disk.id],
      })
    }
    if (disk.logicalSectorSize > disk.physicalSectorSize) {
      issues.push({
        code: 'invalid-sector-size',
        message: 'Logical sector size is larger than the physical sector size',
        ids: [disk.id],
      })
    }
  }

  return issues
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}
