import { describeDisk } from '../describe'
import { formatBlockSize } from '../format'
import type { Host } from '../model'
import type { Vdev, VdevType, ZfsPool } from './model'

/** Labels follow the pool creation wizard docs of this version. */
export const TRUENAS_VERSION = '25.10'

const DEFAULT_RECORDSIZE = 128 * 1024

const LAYOUT: Record<VdevType, string> = {
  disk: 'Stripe',
  mirror: 'Mirror',
  raidz1: 'RAIDZ1',
  raidz2: 'RAIDZ2',
  raidz3: 'RAIDZ3',
}

export interface TrueNasSteps {
  version: string
  /** Markdown, one entry per step. */
  steps: string[]
  /** Parts of the plan the wizard cannot build as planned. */
  notes: string[]
}

/** Clicks in the TrueNAS pool creation wizard that build the planned pool. */
export function trueNasSteps(pool: ZfsPool, host: Host): TrueNasSteps {
  const steps: string[] = [
    'Open **Storage** and click **Create Pool** at the top right of the Storage Dashboard.',
    `**General Info**: enter \`${pool.name}\` as **Name**. Leave **Encryption** off, the plan does not cover encryption.`,
  ]
  const notes: string[] = [
    `Labels follow the TrueNAS ${TRUENAS_VERSION} docs and may differ slightly in the live UI.`,
    `The wizard has no ashift field. TrueNAS chooses it, the plan assumes ${pool.ashift}.`,
  ]

  const [first, ...rest] = groupByShape(pool.data)
  if (first !== undefined) steps.push(vdevStep('Data', first, host))
  if (rest.length > 0) {
    notes.push(
      'The wizard builds data vdevs of one layout and width only. Create the pool with the first group, then add the other data vdevs from the Storage Dashboard: ' +
        rest
          .flat()
          .map((vdev) => describeVdev(vdev, host))
          .join('; '),
    )
  }

  for (const group of groupByShape(pool.log)) steps.push(vdevStep('Log (Optional)', group, host))
  if (pool.spare.length > 0) steps.push(diskStep('Spare (Optional)', pool.spare, host))
  if (pool.cache.length > 0) steps.push(diskStep('Cache (Optional)', pool.cache, host))
  for (const group of groupByShape(pool.special)) {
    steps.push(vdevStep('Metadata (Optional)', group, host))
  }
  if (pool.special.length > 0) notes.push('TrueNAS 27 calls the Metadata step Special.')

  steps.push('Skip **Dedup (Optional)**.')
  steps.push('**Review**: check the vdevs, then click **Create Pool**.')
  if (pool.recordsize !== DEFAULT_RECORDSIZE) {
    steps.push(
      `After creation, open **Datasets**, edit the root dataset \`${pool.name}\` and set **Record Size** to ${formatBlockSize(pool.recordsize)} under **Advanced Options**.`,
    )
  }

  return { version: TRUENAS_VERSION, steps, notes }
}

/** Groups vdevs of the same type and width, in plan order. */
function groupByShape(vdevs: Vdev[]): Vdev[][] {
  const groups = new Map<string, Vdev[]>()
  for (const vdev of vdevs) {
    const key = `${vdev.type}/${vdev.diskIds.length}`
    groups.set(key, [...(groups.get(key) ?? []), vdev])
  }
  return [...groups.values()]
}

function vdevStep(title: string, group: Vdev[], host: Host): string {
  const [{ type, diskIds }] = group
  // TrueNAS builds a stripe as one entry whose width is the number of disks.
  const [width, count] = type === 'disk' ? [group.length, 1] : [diskIds.length, group.length]
  const disks =
    type === 'disk'
      ? diskList(
          group.flatMap((vdev) => vdev.diskIds),
          host,
        )
      : group.map((vdev, i) => `VDEV ${i + 1}: ${diskList(vdev.diskIds, host)}`).join('; ')
  return `**${title}**: set **Layout** to ${LAYOUT[type]}, **Width** to ${width} and **Number of VDEVs** to ${count}. Click **Manual Disk Selection** and assign ${disks}.`
}

function diskStep(title: string, diskIds: string[], host: Host): string {
  return `**${title}**: add ${diskList(diskIds, host)}.`
}

function describeVdev(vdev: Vdev, host: Host): string {
  return `${LAYOUT[vdev.type]} of ${diskList(vdev.diskIds, host)}`
}

function diskList(diskIds: string[], host: Host): string {
  return diskIds.map((id) => `${id} (${describeDisk(host, id)})`).join(', ')
}
