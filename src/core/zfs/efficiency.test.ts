import { describe, expect, it } from 'vitest'
import { emptyPool, examplePlan, hdd } from '../testing'
import { allocateBlock, computeEfficiencyTable } from './efficiency'
import type { VdevType } from './model'

/*
 * Expected values are worked out by hand with the rule from vdev_raidz_psize_to_asize in OpenZFS,
 * for a raidz vdev of n disks with parity p and a block of D data sectors:
 *
 *   parity   P = p × ceil(D / (n − p))         one set of parity per started row
 *   padding    D + P rounded up to a multiple of p + 1
 *
 * Mirrors write one copy per disk and never pad.
 */

const KiB = 1024
const TB = 1_000_000_000_000

function vdev(type: VdevType, width: number) {
  return { id: 'v', type, diskIds: Array.from({ length: width }, (_, i) => `d${i}`) }
}

describe('allocateBlock', () => {
  it.each([
    // raidz2 of 6 at ashift 12. A 4K block is D = 1, P = 2 × ceil(1/4) = 2, 3 sectors, a
    // multiple of 3. 8K is D = 2, P = 2, 4 sectors, padded to 6: as much space as 16K.
    ['raidz2', 6, 12, 4, [1, 2, 0]],
    ['raidz2', 6, 12, 8, [2, 2, 2]],
    ['raidz2', 6, 12, 16, [4, 2, 0]],
    ['raidz2', 6, 12, 128, [32, 16, 0]],
    // The same 4K block at ashift 9 is D = 8 sectors of 512 B, P = 2 × ceil(8/4) = 4, 12 sectors.
    ['raidz2', 6, 9, 4, [8, 4, 0]],
    // raidz2 of 10 loses space even at 128K: D = 32, P = 2 × ceil(32/8) = 8, 40 sectors, padded
    // to 42.
    ['raidz2', 10, 12, 128, [32, 8, 2]],
    // raidz1 of 3: 8K is D = 2, P = 1 × ceil(2/2) = 1, 3 sectors, padded to 4.
    ['raidz1', 3, 12, 4, [1, 1, 0]],
    ['raidz1', 3, 12, 8, [2, 1, 1]],
    ['raidz1', 3, 12, 16, [4, 2, 0]],
    // raidz1 of 5 at 128K: D = 32, P = ceil(32/4) = 8, 40 sectors, already even.
    ['raidz1', 5, 12, 128, [32, 8, 0]],
    // raidz3 of 7 at 16K: D = 4, P = 3 × ceil(4/4) = 3, 7 sectors, padded to 8.
    ['raidz3', 7, 12, 16, [4, 3, 1]],
    // Mirrors: one extra copy per extra disk.
    ['mirror', 2, 12, 16, [4, 4, 0]],
    ['mirror', 3, 12, 16, [4, 8, 0]],
    ['disk', 1, 12, 16, [4, 0, 0]],
  ] as const)('%s of %i at ashift %i, %iK block: %j', (type, width, ashift, kib, sectors) => {
    const [data, redundancy, padding] = sectors
    expect(allocateBlock(vdev(type, width), kib * KiB, ashift)).toEqual({
      dataSectors: data,
      redundancySectors: redundancy,
      paddingSectors: padding,
      efficiency: data / (data + redundancy + padding),
    })
  })
})

describe('computeEfficiencyTable', () => {
  it('runs from the sector size to 1 MiB for the default recordsize', () => {
    const plan = examplePlan()
    const table = computeEfficiencyTable(plan.layouts[0], plan.host.disks)
    expect(table.rows.map((row) => row.blockSize / KiB)).toEqual([
      4, 8, 16, 32, 64, 128, 256, 512, 1024,
    ])
  })

  it('extends to a larger recordsize and starts lower at a smaller ashift', () => {
    const plan = examplePlan()
    const pool = { ...plan.layouts[0], ashift: 9, recordsize: 4096 * KiB }
    const sizes = computeEfficiencyTable(pool, plan.host.disks).rows.map((row) => row.blockSize)
    expect(sizes[0]).toBe(512)
    expect(sizes.at(-1)).toBe(4096 * KiB)
    expect(sizes).toHaveLength(14)
  })

  it('takes another ashift than the pool one', () => {
    const plan = examplePlan()
    const table = computeEfficiencyTable(plan.layouts[0], plan.host.disks, 13)
    expect(table.ashift).toBe(13)
    expect(table.rows[0].blockSize).toBe(8 * KiB)
  })

  it('estimates usable bytes per block size', () => {
    // Example plan: raidz2 of 6 × 8 TB, 48 TB raw. At 4K and 8K a third of each allocation is
    // data, so 16 TB. From 16K on two thirds, the naive 32 TB.
    const plan = examplePlan()
    const table = computeEfficiencyTable(plan.layouts[0], plan.host.disks)
    expect(table.rows.slice(0, 4).map((row) => row.usableBytes / TB)).toEqual([16, 16, 32, 32])
    expect(table.idealEfficiency).toEqual([{ vdevId: 'tank-data-0', efficiency: 4 / 6 }])
  })

  it('adds up mixed data vdevs and counts each member with the smallest disk', () => {
    // raidz1 of 3 with one 4 TB disk counts as 3 × 4 TB = 12 TB. At 8K it stores 2 of 4 sectors,
    // 6 TB. The mirror of 2 × 8 TB adds 8 TB at any block size.
    const disks = [hdd('a', 4 * TB), hdd('b'), hdd('c'), hdd('d'), hdd('e')]
    const pool = {
      ...emptyPool(),
      data: [
        { id: 'z', type: 'raidz1' as const, diskIds: ['a', 'b', 'c'] },
        { id: 'm', type: 'mirror' as const, diskIds: ['d', 'e'] },
      ],
    }
    const row = computeEfficiencyTable(pool, disks).rows[1]
    expect(row.blockSize).toBe(8 * KiB)
    expect(row.usableBytes).toBe(14 * TB)
    expect(row.vdevs.map((allocation) => allocation.vdevId)).toEqual(['z', 'm'])
  })

  it('rounds usable bytes down instead of returning fractions', () => {
    // raidz2 of 10 at 128K stores 32 of 42 sectors: 10 × 1 TB × 32/42 = 7.619… TB.
    const disks = Array.from({ length: 10 }, (_, i) => hdd(`d${i}`, TB))
    const pool = { ...emptyPool(), data: [vdev('raidz2', 10)] }
    const row = computeEfficiencyTable(pool, disks).rows[5]
    expect(row.blockSize).toBe(128 * KiB)
    expect(row.usableBytes).toBe(7_619_047_619_047)
  })

  it('skips half-built vdevs and support vdevs', () => {
    const plan = examplePlan()
    const pool = plan.layouts[0]
    pool.data.push({ id: 'half', type: 'raidz2', diskIds: ['h6', 'missing'] })
    const table = computeEfficiencyTable(pool, plan.host.disks)
    expect(table.idealEfficiency.map((entry) => entry.vdevId)).toEqual(['tank-data-0'])
    expect(table.rows[0].vdevs).toHaveLength(1)
  })
})
