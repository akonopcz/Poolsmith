import { bayColumns } from '../core/enclosure'
import type { Enclosure } from '../core/model'

/**
 * One scale for every enclosure, shaped like the real carriers: 2.5" sleds stand upright, 3.5"
 * sleds lie flat, M.2 is a flat strip. Width and height in pixels.
 */
export const BAY_SIZE = { sff: [48, 96], lff: [88, 64], m2: [104, 56] } as const

const BAY_GAP = 4
/** Room for the name and controller rows, even with one or two bays. */
const MIN_ENCLOSURE_WIDTH = 280
const ENCLOSURE_GAP = 32
/** Side padding of the hardware column plus room for its scrollbar. */
const COLUMN_PADDING = 60
const MIN_COLUMN_WIDTH = 340

export function enclosureWidth(enclosure: Enclosure): number {
  const columns = bayColumns(enclosure)
  const [bay] = BAY_SIZE[enclosure.bays[0]?.formFactor ?? 'lff']
  return Math.max(MIN_ENCLOSURE_WIDTH, columns * bay + (columns - 1) * BAY_GAP)
}

/**
 * Width of the hardware column: enclosures flow into rows as wide as `limit` allows, and the
 * column takes the widest row, so it never holds empty space beside wrapped enclosures.
 */
export function hardwareColumnWidth(enclosures: Enclosure[], limit: number): number {
  const room = limit - COLUMN_PADDING
  let widest = 0
  let row = 0
  for (const width of enclosures.map(enclosureWidth)) {
    row = row === 0 || row + ENCLOSURE_GAP + width > room ? width : row + ENCLOSURE_GAP + width
    widest = Math.max(widest, row)
  }
  return Math.min(limit, Math.max(MIN_COLUMN_WIDTH, widest + COLUMN_PADDING))
}
