import type { Bay, Disk, Plan } from './model'
import type { ZfsPool } from './zfs/model'

const TB = 1_000_000_000_000

export function hdd(id: string, sizeBytes = 8 * TB): Disk {
  return { id, sizeBytes, type: 'hdd', logicalSectorSize: 512, physicalSectorSize: 4096 }
}

export function ssd(id: string, sizeBytes = TB): Disk {
  return { id, sizeBytes, type: 'ssd', logicalSectorSize: 512, physicalSectorSize: 512 }
}

function bays(prefix: string, count: number, formFactor: Bay['formFactor'], controllerId: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    label: String(i),
    formFactor,
    controllerId,
  }))
}

export function emptyPool(id = 'tank'): ZfsPool {
  return {
    kind: 'zfs',
    id,
    name: id,
    ashift: 12,
    recordsize: 128 * 1024,
    data: [],
    special: [],
    log: [],
    cache: [],
    spare: [],
  }
}

/**
 * A DL380 Gen9 with a DS4246 shelf on an external HBA. Six HDDs in the shelf form a raidz2,
 * two SSDs in the chassis form a special mirror, one HDD is a spare and one SSD sits unused.
 */
export function examplePlan(): Plan {
  const chassisBays: Bay[] = bays('dl380', 8, 'sff', 'p440ar')
  const shelfBays: Bay[] = bays('ds4246', 24, 'lff', 'lsi9207')
  const shelfDisks = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id) => hdd(id))
  const chassisDisks = ['s0', 's1', 's2'].map((id) => ssd(id))
  shelfDisks.forEach((disk, i) => (shelfBays[i].diskId = disk.id))
  chassisDisks.forEach((disk, i) => (chassisBays[i].diskId = disk.id))

  return {
    schemaVersion: 1,
    name: 'example',
    host: {
      name: 'DL380 Gen9',
      controllers: [
        { id: 'p440ar', name: 'P440ar', mode: 'hba' },
        { id: 'lsi9207', name: 'LSI 9207-8e', mode: 'hba' },
      ],
      enclosures: [
        { id: 'dl380', name: 'DL380 Gen9', kind: 'chassis', bays: chassisBays },
        { id: 'ds4246', name: 'DS4246', kind: 'shelf', bays: shelfBays },
      ],
      disks: [...shelfDisks, ...chassisDisks],
    },
    layouts: [
      {
        ...emptyPool(),
        data: [
          { id: 'tank-data-0', type: 'raidz2', diskIds: ['h0', 'h1', 'h2', 'h3', 'h4', 'h5'] },
        ],
        special: [{ id: 'tank-special-0', type: 'mirror', diskIds: ['s0', 's1'] }],
        spare: ['h6'],
      },
    ],
  }
}
