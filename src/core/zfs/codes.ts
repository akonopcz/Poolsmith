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

/**
 * Letters for the pools of a plan in their order: A to Z, then AA, AB and so on. Like the vdev
 * codes they follow the order, so removing a pool renames the ones after it.
 */
export function poolLetters(pools: { id: string }[]): Map<string, string> {
  return new Map(pools.map((pool, i) => [pool.id, letter(i)]))
}

function letter(index: number): string {
  const char = String.fromCharCode(65 + (index % 26))
  return index < 26 ? char : letter(Math.floor(index / 26) - 1) + char
}
