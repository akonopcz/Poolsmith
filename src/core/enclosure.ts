import type { Enclosure } from './model'

/**
 * Bays per row on the enclosure's front. Without a stored value it guesses from common
 * hardware: 2U servers with 12 LFF bays in rows of four, larger shelves in rows of six, SFF
 * bays side by side in rows of eight, M.2 slots in rows of four.
 */
export function bayColumns(enclosure: Enclosure): number {
  const { columns } = enclosure
  if (columns !== undefined && Number.isInteger(columns) && columns >= 1) return columns
  return guessBayColumns(enclosure.bays[0]?.formFactor ?? 'lff', enclosure.bays.length)
}

export function guessBayColumns(formFactor: 'lff' | 'sff' | 'm2', bayCount: number): number {
  if (formFactor === 'sff') return 8
  if (formFactor === 'm2') return 4
  return bayCount > 12 ? 6 : 4
}
