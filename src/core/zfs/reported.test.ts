import { describe, expect, it } from 'vitest'
import type { Disk } from '../model'
import { emptyPool, examplePlan, hdd, ssd } from '../testing'
import type { Vdev } from './model'
import { computeReportedCapacity } from './reported'

/*
 * Expected values come from a separate Python transcription of the OpenZFS code, not from this
 * module. The example plan is worked through step by step in its test. They are not checked
 * against a real pool.
 */

const TB = 1_000_000_000_000
const GB = 1_000_000_000
const GiB = 1024 ** 3

function single(vdev: Omit<Vdev, 'id'>, disks: Disk[], ashift = 12) {
  const pool = { ...emptyPool(), ashift, data: [{ id: 'v', ...vdev }] }
  return computeReportedCapacity(pool, disks)
}

function sumOfParts(capacity: ReturnType<typeof computeReportedCapacity>) {
  return Object.values(capacity.deductions).reduce(
    (sum, value) => sum + value,
    capacity.usableBytes,
  )
}

describe('computeReportedCapacity', () => {
  it('works through the example plan', () => {
    // raidz2 of 6 × 8 TB at ashift 12.
    // Each disk: 8 TB rounded down to 256 KiB is 7 999 999 967 232, minus 4.5 MiB of labels
    //   leaves 7 999 995 248 640. Six of them: asize 47 999 971 491 840.
    // asize / 200 has its highest bit at position 38, above the 16 GiB cap, so metaslabs are
    //   2^34 bytes: 2793 of them, 16 596 860 928 bytes left over. With more than 64 metaslabs one
    //   goes to the ZIL, 2792 remain.
    // A 128K block takes 48 sectors of 4 KiB = 384 × 512 B, so the deflate ratio is
    //   131 072 / 384 = 341 (rounded down from 341.33). dspace = 2792 × 2^34 / 512 × 341.
    // Slop: dspace / 32 is above the 128 GiB cap. The ZIL metaslab, deflated 11 442 061 312
    //   bytes, comes off the slop.
    const plan = examplePlan()
    const capacity = computeReportedCapacity(plan.layouts[0], plan.host.disks)

    expect(capacity.vdevs).toEqual([
      {
        vdevId: 'hdd01-data-0',
        asizeBytes: 47_999_971_491_840,
        metaslabShift: 34,
        metaslabCount: 2793,
        deflateRatio: 341,
        dspaceBytes: 31_946_235_183_104,
      },
    ])
    expect(capacity.deductions).toEqual({
      unequalDisks: 0,
      labels: 28_508_160,
      metaslabRounding: 16_596_860_928,
      embeddedLog: 16 * GiB,
      redundancy: 16_019_959_578_624,
      slop: 128 * GiB - 11_442_061_312,
    })
    expect(capacity.rawBytes).toBe(48 * TB)
    expect(capacity.usableBytes).toBe(31_820_238_290_944)
    expect(sumOfParts(capacity)).toBe(48 * TB)
  })

  it.each([
    // Between 200 metaslabs of 512 MiB and the 16 GiB cap: 2^33 bytes each, 116 of them.
    ['mirror', 2, 1000, 33, 116, 987_842_478_080, 965_562_335_232],
    // 186 metaslabs of 512 MiB fit the default.
    ['mirror', 2, 100, 29, 186, 99_321_118_720, 96_754_204_672],
    // Fewer than 16 metaslabs of 512 MiB: 2^28 bytes, 29 of them, too few for a ZIL metaslab.
    ['mirror', 2, 8, 28, 29, 7_784_628_224, 7_541_358_592],
    // dspace / 32 is below 128 MiB, so slop rises to 128 MiB.
    ['disk', 1, 1, 25, 29, 973_078_528, 838_860_800],
  ] as const)(
    '%s of %i × %i GB: metaslabs 2^%i × %i, dspace %i, usable %i',
    (type, width, gb, shift, count, dspace, usable) => {
      const disks = Array.from({ length: width }, (_, i) => ssd(`d${i}`, gb * GB))
      const capacity = single({ type, diskIds: disks.map((disk) => disk.id) }, disks)
      expect(capacity.vdevs[0]).toMatchObject({
        metaslabShift: shift,
        metaslabCount: count,
        deflateRatio: 512,
        dspaceBytes: dspace,
      })
      expect(capacity.usableBytes).toBe(usable)
      expect(sumOfParts(capacity)).toBe(width * gb * GB)
    },
  )

  it('raises the metaslab size above 16 GiB to stay under 131 072 metaslabs', () => {
    // raidz3 of 16 × 200 TB: 16 GiB metaslabs would be 186 264, so they grow to 2^35.
    // A 128K block takes 32 data + 9 parity sectors, padded to 44: ratio 131 072 / 352 = 372.
    const disks = Array.from({ length: 16 }, (_, i) => hdd(`d${i}`, 200 * TB))
    const capacity = single({ type: 'raidz3', diskIds: disks.map((disk) => disk.id) }, disks)
    expect(capacity.vdevs[0]).toMatchObject({
      metaslabShift: 35,
      metaslabCount: 93_132,
      deflateRatio: 372,
    })
    expect(capacity.usableBytes).toBe(2_324_856_133_648_384)
  })

  it('counts every member with the smallest disk', () => {
    const disks = [hdd('a', 4 * TB), hdd('b'), hdd('c')]
    const capacity = single({ type: 'raidz1', diskIds: ['a', 'b', 'c'] }, disks)
    expect(capacity.deductions.unequalDisks).toBe(8 * TB)
    expect(capacity.usableBytes).toBe(7_849_119_842_304)
    expect(sumOfParts(capacity)).toBe(20 * TB)
  })

  it('adds up data vdevs and leaves out special vdevs and half-built ones', () => {
    const disks = [hdd('a', 100 * GB), hdd('b', 100 * GB), ssd('s0'), ssd('s1'), hdd('h')]
    const pool = {
      ...emptyPool(),
      data: [
        { id: 'm', type: 'mirror' as const, diskIds: ['a', 'b'] },
        { id: 'half', type: 'raidz1' as const, diskIds: ['h'] },
      ],
      special: [{ id: 's', type: 'mirror' as const, diskIds: ['s0', 's1'] }],
    }
    const capacity = computeReportedCapacity(pool, disks)
    expect(capacity.vdevs.map((vdev) => vdev.vdevId)).toEqual(['m'])
    expect(capacity.usableBytes).toBe(96_754_204_672)
  })
})
