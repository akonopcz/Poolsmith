import { diskName } from './describe'
import type { Bay, Host, Plan } from './model'
import type { Warning } from './warning'
import { zfsDiskIds } from './zfs/validate'
import { warnZfsPool } from './zfs/warn'

/**
 * Finds layouts that work but carry a risk or a trade-off. Expects a plan without issues from
 * `validatePlan` and skips references it cannot resolve.
 */
export function findWarnings(plan: Plan): Warning[] {
  return plan.layouts.flatMap((layout) => [
    ...warnAttachment(plan.host, new Set(zfsDiskIds(layout))),
    ...warnZfsPool(layout, plan.host),
  ])
}

/** One warning per RAID controller and per USB enclosure that holds disks of the layout. */
function warnAttachment(host: Host, diskIds: Set<string>): Warning[] {
  const warnings: Warning[] = []
  const bays = host.enclosures.flatMap((enclosure) =>
    enclosure.bays.map((bay) => ({ bay, enclosure })),
  )
  const used = bays.filter(({ bay }) => bay.diskId !== undefined && diskIds.has(bay.diskId))

  for (const controller of host.controllers) {
    if (controller.mode !== 'raid') continue
    const disks = diskIdsOf(used.filter(({ bay }) => bay.controllerId === controller.id))
    if (disks.length === 0) continue
    warnings.push({
      code: 'raid-controller',
      severity: 'warning',
      message: `Controller ${controller.name} runs in RAID mode, but ZFS needs direct disk access. Switch it to HBA mode. Disks: ${names(host, disks)}`,
      ids: [controller.id, ...disks],
    })
  }

  for (const enclosure of host.enclosures) {
    if (enclosure.kind !== 'usb') continue
    const disks = diskIdsOf(used.filter((entry) => entry.enclosure.id === enclosure.id))
    if (disks.length === 0) continue
    warnings.push({
      code: 'usb-disk',
      severity: 'warning',
      message: `${enclosure.name} is attached over USB. USB bridges often hide SMART data and drop disks under load, which faults the pool. Disks: ${names(host, disks)}`,
      ids: [enclosure.id, ...disks],
    })
  }

  return warnings
}

function diskIdsOf(entries: { bay: Bay }[]): string[] {
  return entries.flatMap(({ bay }) => (bay.diskId === undefined ? [] : [bay.diskId]))
}

function names(host: Host, diskIds: string[]): string {
  return diskIds.map((id) => diskName(host, id)).join(', ')
}
