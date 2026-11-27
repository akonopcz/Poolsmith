import { bayColumns } from '../core/enclosure'
import type { Enclosure } from '../core/model'

/**
 * One scale for every enclosure, shaped like the real carriers: 2.5" sleds stand upright, 3.5"
 * sleds lie flat, M.2 is a flat strip, an add-in card a long one. Width and height in pixels.
 */
export const BAY_SIZE = { sff: [48, 96], lff: [88, 64], m2: [104, 56], aic: [160, 56] } as const

const BAY_GAP = 4
/** How far a bay may widen to match the other enclosures, so a one-slot box is not stretched. */
const MAX_BAY_STRETCH = 1.6
/** Room for the name and controller rows, even with one or two bays. */
const MIN_ENCLOSURE_WIDTH = 280
const ENCLOSURE_GAP = 32
/** Side padding of the hardware column plus room for its scrollbar. */
const COLUMN_PADDING = 60
const MIN_COLUMN_WIDTH = 340

/** Width of an enclosure with its bays at their natural size. */
export function enclosureWidth(enclosure: Enclosure, stretch = 1): number {
  const columns = bayColumns(enclosure)
  const [bay] = BAY_SIZE[enclosure.bays[0]?.formFactor ?? 'lff']
  return Math.max(
    MIN_ENCLOSURE_WIDTH,
    Math.round(columns * bay * stretch) + (columns - 1) * BAY_GAP,
  )
}

/**
 * Rack gear has fronts of the same width, so enclosures are drawn as wide as the widest one.
 * Bays widen to fill that width and keep their height; each bay widens by at most
 * MAX_BAY_STRETCH, so small boxes such as a thin client stay small.
 */
export function enclosureWidths(enclosures: Enclosure[]): Map<string, number> {
  const widest = Math.max(0, ...enclosures.map((e) => enclosureWidth(e)))
  return new Map(
    enclosures.map((e) => [e.id, Math.min(widest, enclosureWidth(e, MAX_BAY_STRETCH))]),
  )
}

/**
 * Width of the hardware column: enclosures flow into rows as wide as `limit` allows, and the
 * column takes the widest row, so it never holds empty space beside wrapped enclosures.
 */
export function hardwareColumnWidth(enclosures: Enclosure[], limit: number): number {
  const room = limit - COLUMN_PADDING
  let widest = 0
  let row = 0
  const widths = enclosureWidths(enclosures)
  for (const width of enclosures.map((e) => widths.get(e.id)!)) {
    row = row === 0 || row + ENCLOSURE_GAP + width > room ? width : row + ENCLOSURE_GAP + width
    widest = Math.max(widest, row)
  }
  return Math.min(limit, Math.max(MIN_COLUMN_WIDTH, widest + COLUMN_PADDING))
}
