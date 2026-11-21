import { describeDisk } from '../describe'
import { formatBlockSize } from '../format'
import type { Host } from '../model'
import type { Vdev, ZfsPool } from './model'
import { zfsDiskIds } from './validate'

const SAFE_WORD = /^[A-Za-z0-9_.:-]+$/

/**
 * `zpool create` for reference. Disks appear as `<disk:ID>` placeholders instead of guessed
 * paths, which could point at the wrong disk. Shells read `<` and `>` as redirects, so bash and
 * zsh reject the command with a syntax error while a placeholder is left.
 */
export function zpoolCreateCommand(pool: ZfsPool, host: Host): string {
  const diskIds = [...new Set(zfsDiskIds(pool))]
  const header = [
    '# Reference only. poolsmith never runs commands on a host.',
    '# zpool create wipes every disk it lists. Replace each <disk:ID> with the',
    '# matching /dev/disk/by-id path before running it.',
    '#',
    ...diskIds.map((id) => `# ${placeholder(id)}  ${describeDisk(host, id)}`),
  ]

  // zpool-create(8) puts data vdevs first and accepts log, cache and spare only once. Every vdev
  // after a class keyword belongs to that class.
  const args = [
    `-o ashift=${pool.ashift}`,
    `-O recordsize=${formatBlockSize(pool.recordsize)}`,
    quote(pool.name),
    ...pool.data.map(vdevArgs),
    ...withKeyword('special', pool.special.map(vdevArgs)),
    ...withKeyword('log', pool.log.map(vdevArgs)),
    ...withKeyword('cache', pool.cache.length > 0 ? [devices(pool.cache)] : []),
    ...withKeyword('spare', pool.spare.length > 0 ? [devices(pool.spare)] : []),
  ]

  return (
    [
      ...header,
      `zpool create \\`,
      ...args.map((arg, i) => `  ${arg}${i < args.length - 1 ? ' \\' : ''}`),
    ].join('\n') + '\n'
  )
}

function vdevArgs(vdev: Vdev): string {
  const disks = devices(vdev.diskIds)
  return vdev.type === 'disk' ? disks : `${vdev.type} ${disks}`
}

function withKeyword(keyword: string, lines: string[]): string[] {
  return lines.length === 0 ? [] : [`${keyword} ${lines[0]}`, ...lines.slice(1)]
}

function devices(diskIds: string[]): string {
  return diskIds.map(placeholder).join(' ')
}

function placeholder(diskId: string): string {
  return `<disk:${diskId}>`
}

function quote(word: string): string {
  return SAFE_WORD.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`
}
