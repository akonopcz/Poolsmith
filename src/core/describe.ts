import { formatDecimal } from './format'
import type { Host } from './model'

/** Enclosure and bay of a disk, for example "DS4246 bay 3". Undefined for inventory disks. */
export function diskLocation(host: Host, diskId: string): string | undefined {
  for (const enclosure of host.enclosures) {
    const bay = enclosure.bays.find((candidate) => candidate.diskId === diskId)
    if (bay !== undefined) return `${enclosure.name} bay ${bay.label}`
  }
  return undefined
}

/** One line that helps find a disk in the server, for example "8 TB HDD, DS4246 bay 3, WD Red". */
export function describeDisk(host: Host, diskId: string): string {
  const disk = host.disks.find((candidate) => candidate.id === diskId)
  if (disk === undefined) return 'unknown disk'

  const parts = [`${formatDecimal(disk.sizeBytes)} ${disk.type.toUpperCase()}`]
  const location = diskLocation(host, diskId)
  if (location !== undefined) parts.push(location)
  if (disk.label !== undefined) parts.push(disk.label)
  return parts.join(', ')
}
