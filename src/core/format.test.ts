import { describe, expect, it } from 'vitest'
import { formatBinary, formatBlockSize, formatDecimal } from './format'

describe('format', () => {
  it.each([
    [28_508_160, '28.51 MB', '27.19 MiB'],
    [500_000_000_000, '500 GB', '465.66 GiB'],
    [8_000_000_000_000, '8 TB', '7.28 TiB'],
    [0, '0 MB', '0 MiB'],
  ])('%i bytes is %s and %s', (bytes, decimal, binary) => {
    expect(formatDecimal(bytes)).toBe(decimal)
    expect(formatBinary(bytes)).toBe(binary)
  })

  it.each([
    [512, '512'],
    [4096, '4K'],
    [128 * 1024, '128K'],
    [1024 * 1024, '1M'],
    [16 * 1024 * 1024, '16M'],
  ])('block size %i is %s', (bytes, text) => {
    expect(formatBlockSize(bytes)).toBe(text)
  })
})
