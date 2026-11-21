import type { VdevType } from './model'

export const PARITY: Record<VdevType, number> = {
  disk: 0,
  mirror: 0,
  raidz1: 1,
  raidz2: 2,
  raidz3: 3,
}

export function minDisks(type: VdevType): number {
  switch (type) {
    case 'disk':
      return 1
    case 'mirror':
      return 2
    default:
      return PARITY[type] + 1
  }
}
