import type { Bytes } from './model'

/** Decimal units as disk vendors use them. */
export function formatDecimal(bytes: Bytes): string {
  return withUnit(bytes, 1000, ['MB', 'GB', 'TB'])
}

/** Binary units as ZFS and TrueNAS show them. */
export function formatBinary(bytes: Bytes): string {
  return withUnit(bytes, 1024, ['MiB', 'GiB', 'TiB'])
}

/** Block and record sizes the way zfs(8) accepts them, for example 128K or 1M. */
export function formatBlockSize(bytes: Bytes): string {
  if (bytes % (1024 * 1024) === 0) return `${bytes / (1024 * 1024)}M`
  if (bytes % 1024 === 0) return `${bytes / 1024}K`
  return String(bytes)
}

/** The largest of mega, giga and tera that keeps the number at 1 or above. */
function withUnit(bytes: Bytes, base: number, units: [string, string, string]): string {
  const index = bytes >= base ** 4 ? 2 : bytes >= base ** 3 ? 1 : 0
  return `${Number((bytes / base ** (index + 2)).toFixed(2))} ${units[index]}`
}
