import type { Enclosure } from './model'

/**
 * Bays per row on the enclosure's front. Without a stored value it guesses from common
 * hardware: 2U servers with 12 LFF bays in rows of four, larger shelves in rows of six, SFF
 * bays side by side in rows of eight, M.2 slots in rows of four.
 */
export function bayColumns(enclosure: Enclosure): number {
  const { columns, bays } = enclosure
  const wanted =
    columns !== undefined && Number.isInteger(columns) && columns >= 1
      ? columns
      : guessBayColumns(bays[0]?.formFactor ?? 'lff', bays.length)
  // More columns than bays would only leave empty space beside the last bay.
  return Math.min(wanted, Math.max(1, bays.length))
}

export function guessBayColumns(formFactor: 'lff' | 'sff' | 'm2', bayCount: number): number {
  if (formFactor === 'sff') return 8
  if (formFactor === 'm2') return 4
  return bayCount > 12 ? 6 : 4
}
