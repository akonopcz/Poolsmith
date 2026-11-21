import { diskName } from '../describe'
import { formatDecimal } from '../format'
import type { Disk, Host } from '../model'
import type { Warning } from '../warning'
import type { Vdev, VdevType, ZfsPool } from './model'
import { faultTolerance } from './topology'
import { zfsDiskIds } from './validate'

// Below parity + 2 disks a mirror gives the same protection with better performance. The upper
// bounds follow common advice in the TrueNAS community, TrueNAS itself documents none.
const RAIDZ_WIDTH: Partial<Record<VdevType, [min: number, max: number]>> = {
  raidz1: [3, 7],
  raidz2: [4, 10],
  raidz3: [5, 15],
}

/** Expects a pool without issues and skips disk IDs it does not know. */
export function warnZfsPool(pool: ZfsPool, host: Host): Warning[] {
  const byId = new Map(host.disks.map((disk) => [disk.id, disk]))
  const members = (vdev: Vdev) => vdev.diskIds.flatMap((id) => byId.get(id) ?? [])
  const vdevs = [...pool.data, ...pool.special, ...pool.log]

  return [
    ...vdevs.flatMap((vdev) => warnVdev(vdev, members(vdev))),
    ...warnRedundancy(pool),
    ...warnDataVdevMix(pool.data, members),
    ...warnAshift(pool, host, byId),
  ]
}

function warnVdev(vdev: Vdev, members: Disk[]): Warning[] {
  const warnings: Warning[] = []
  const sizes = members.map((disk) => disk.sizeBytes)
  const smallest = Math.min(...sizes)

  if (new Set(sizes).size > 1) {
    const unused = sizes.reduce((sum, size) => sum + size - smallest, 0)
    warnings.push({
      code: 'mixed-disk-sizes',
      severity: 'warning',
      message: `${vdev.type} vdev mixes disk sizes. Every disk counts as ${formatDecimal(smallest)}, so ${formatDecimal(unused)} stay unused`,
      ids: [vdev.id],
    })
  }

  const hasHdd = members.some((disk) => disk.type === 'hdd')
  const hasFlash = members.some((disk) => disk.type !== 'hdd')
  if (hasHdd && hasFlash) {
    warnings.push({
      code: 'mixed-media',
      severity: 'info',
      message: `${vdev.type} vdev mixes HDDs and flash. It runs at HDD speed, so the flash is wasted`,
      ids: [vdev.id],
    })
  }

  const width = RAIDZ_WIDTH[vdev.type]
  const count = vdev.diskIds.length
  if (width !== undefined && (count < width[0] || count > width[1])) {
    warnings.push({
      code: 'raidz-width',
      severity: 'warning',
      message: `${vdev.type} vdev has ${count} disks, the usual range is ${width[0]}–${width[1]}`,
      ids: [vdev.id],
    })
  }

  return warnings
}

function warnRedundancy(pool: ZfsPool): Warning[] {
  const warnings: Warning[] = []

  for (const vdev of pool.data) {
    if (vdev.type === 'disk') {
      warnings.push({
        code: 'no-redundancy',
        severity: 'warning',
        message: 'Data vdev is a single disk. Losing it loses the whole pool',
        ids: [vdev.id],
      })
    }
  }

  const dataTolerance = Math.min(...pool.data.map(faultTolerance))
  for (const vdev of pool.special) {
    const tolerance = faultTolerance(vdev)
    if (tolerance === 0) {
      warnings.push({
        code: 'special-no-redundancy',
        severity: 'warning',
        message: 'Special vdev is a single disk. Losing it loses the whole pool',
        ids: [vdev.id],
      })
    } else if (pool.data.length > 0 && tolerance < dataTolerance) {
      warnings.push({
        code: 'special-less-redundant',
        severity: 'warning',
        message: `Special vdev may lose ${tolerance} ${tolerance === 1 ? 'disk' : 'disks'}, the data vdevs ${dataTolerance}. Losing it loses the whole pool`,
        ids: [vdev.id],
      })
    }
  }

  return warnings
}

function warnDataVdevMix(data: Vdev[], members: (vdev: Vdev) => Disk[]): Warning[] {
  const warnings: Warning[] = []
  const ids = data.map((vdev) => vdev.id)

  const shapes = new Set(data.map((vdev) => `${vdev.type} of ${vdev.diskIds.length}`))
  if (shapes.size > 1) {
    warnings.push({
      code: 'mixed-data-vdevs',
      severity: 'warning',
      message: `Data vdevs differ in type or width: ${[...shapes].join(', ')}. The pool gets uneven redundancy and performance`,
      ids,
    })
  }

  const smallest = new Set(
    data.flatMap((vdev) => {
      const sizes = members(vdev).map((disk) => disk.sizeBytes)
      return sizes.length === 0 ? [] : [Math.min(...sizes)]
    }),
  )
  if (smallest.size > 1) {
    warnings.push({
      code: 'uneven-data-vdevs',
      severity: 'info',
      message:
        'Data vdevs use disks of different sizes. ZFS writes more to the emptier vdev, so load and fill level end up uneven',
      ids,
    })
  }

  return warnings
}

function warnAshift(pool: ZfsPool, host: Host, byId: Map<string, Disk>): Warning[] {
  const sectorSize = 2 ** pool.ashift
  const affected = [...new Set(zfsDiskIds(pool))].filter((id) => {
    const disk = byId.get(id)
    return disk !== undefined && disk.physicalSectorSize > sectorSize
  })
  if (affected.length === 0) return []

  return [
    {
      code: 'ashift-below-sector',
      severity: 'warning',
      message: `ashift ${pool.ashift} writes ${sectorSize} B blocks to disks with larger physical sectors, which costs a lot of write performance. ashift cannot change after a vdev exists. Disks: ${affected.map((id) => diskName(host, id)).join(', ')}`,
      ids: [pool.id, ...affected],
    },
  ]
}
