import type { Vdev, ZfsPool } from './model'
import { hasValidDiskCount, PARITY } from './topology'

/** Rough speed in multiples of one member disk. Real numbers depend on workload and caching. */
export interface Performance {
  /** Random reads, small blocks. */
  readIops: number
  /** Random writes, small blocks. */
  writeIops: number
  /** Sequential reads, large blocks. */
  readThroughput: number
  /** Sequential writes, large blocks. */
  writeThroughput: number
}

export interface VdevPerformance extends Performance {
  vdevId: string
}

export interface PoolPerformance extends Performance {
  vdevs: VdevPerformance[]
}

/**
 * Rule of thumb per data vdev: a raidz vdev handles random I/O like one disk and streams with its
 * data disks. A mirror reads from every disk but writes like one. The pool adds up its vdevs,
 * which assumes similar disks throughout. Vdevs with an invalid disk count are skipped.
 */
export function estimatePerformance(pool: ZfsPool): PoolPerformance {
  const vdevs = pool.data.filter(hasValidDiskCount).map(vdevPerformance)
  const sum = (pick: (vdev: Performance) => number) =>
    vdevs.reduce((total, vdev) => total + pick(vdev), 0)

  return {
    readIops: sum((vdev) => vdev.readIops),
    writeIops: sum((vdev) => vdev.writeIops),
    readThroughput: sum((vdev) => vdev.readThroughput),
    writeThroughput: sum((vdev) => vdev.writeThroughput),
    vdevs,
  }
}

function vdevPerformance(vdev: Vdev): VdevPerformance {
  const width = vdev.diskIds.length
  switch (vdev.type) {
    case 'disk':
      return { vdevId: vdev.id, readIops: 1, writeIops: 1, readThroughput: 1, writeThroughput: 1 }
    case 'mirror':
      return {
        vdevId: vdev.id,
        readIops: width,
        writeIops: 1,
        readThroughput: width,
        writeThroughput: 1,
      }
    default: {
      const dataDisks = width - PARITY[vdev.type]
      return {
        vdevId: vdev.id,
        readIops: 1,
        writeIops: 1,
        readThroughput: dataDisks,
        writeThroughput: dataDisks,
      }
    }
  }
}
