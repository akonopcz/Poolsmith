import type { ZfsPool } from './model'

const PREFIX = { data: 'D', special: 'S', log: 'L' } as const

/**
 * Short names for the vdevs of a pool, numbered per class: D1, D2 for data, S1 for special, L1
 * for log. They follow the order in the pool, so they change when a vdev before them goes.
 */
export function vdevCodes(pool: ZfsPool): Map<string, string> {
  const codes = new Map<string, string>()
  for (const group of ['data', 'special', 'log'] as const) {
    pool[group].forEach((vdev, i) => codes.set(vdev.id, `${PREFIX[group]}${i + 1}`))
  }
  return codes
}
