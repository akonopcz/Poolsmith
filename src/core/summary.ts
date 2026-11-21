import { diskLocation } from './describe'
import { formatBinary, formatBlockSize, formatDecimal } from './format'
import type { Bytes, Plan } from './model'
import { validatePlan } from './validate'
import { findWarnings } from './warn'
import { computeNaiveCapacity } from './zfs/capacity'
import { computeEfficiencyTable } from './zfs/efficiency'
import type { Vdev, ZfsPool } from './zfs/model'
import { estimatePerformance } from './zfs/performance'
import { computeReportedCapacity } from './zfs/reported'
import { trueNasSteps } from './zfs/truenas-steps'
import { zpoolCreateCommand } from './zfs/zpool-command'

/** The whole plan as one Markdown document, to keep next to the plan file or print. */
export function planSummary(plan: Plan): string {
  const { host } = plan
  const lines = [
    `# ${plan.name}`,
    '',
    `Host: ${host.name}. Planned with poolsmith. All capacity and speed figures are estimates.`,
    '',
    ...problems(plan),
    '## Disks',
    '',
    '| ID | Size | Type | Sectors | Location | Label |',
    '| --- | --- | --- | --- | --- | --- |',
    ...host.disks.map(
      (disk) =>
        `| ${disk.id} | ${formatDecimal(disk.sizeBytes)} | ${disk.type.toUpperCase()} | ${disk.logicalSectorSize}/${disk.physicalSectorSize} | ${diskLocation(host, disk.id) ?? 'not in a bay'} | ${disk.label ?? ''} |`,
    ),
    '',
  ]

  if (host.controllers.length > 0) {
    lines.push('## Controllers', '')
    lines.push(...host.controllers.map((c) => `- ${c.name}: ${c.mode.toUpperCase()} mode`), '')
  }

  for (const pool of plan.layouts) lines.push(...poolSection(plan, pool))
  return lines.join('\n')
}

function problems(plan: Plan): string[] {
  const issues = validatePlan(plan)
  const warnings = findWarnings(plan)
  const lines: string[] = []
  if (issues.length > 0) {
    lines.push('## Issues', '', 'ZFS would reject the plan as it is:', '')
    lines.push(...issues.map((issue) => `- ${issue.message}`), '')
  }
  if (warnings.length > 0) {
    lines.push('## Warnings', '')
    lines.push(
      ...warnings.map((w) => `- ${w.severity === 'info' ? 'Note' : 'Warning'}: ${w.message}`),
      '',
    )
  }
  return lines
}

function poolSection(plan: Plan, pool: ZfsPool): string[] {
  const { host } = plan
  const naive = computeNaiveCapacity(pool, host.disks)
  const reported = computeReportedCapacity(pool, host.disks)
  const efficiency = computeEfficiencyTable(pool, host.disks)
  const performance = estimatePerformance(pool)
  const truenas = trueNasSteps(pool, host)
  const { deductions } = reported

  return [
    `## Pool \`${pool.name}\``,
    '',
    `ashift ${pool.ashift}, recordsize ${formatBlockSize(pool.recordsize)}.`,
    '',
    '### Layout',
    '',
    ...vdevLines('Data', pool.data),
    ...vdevLines('Special', pool.special),
    ...vdevLines('Log', pool.log),
    ...(pool.cache.length > 0 ? [`- Cache: ${pool.cache.join(', ')}`] : []),
    ...(pool.spare.length > 0 ? [`- Spare: ${pool.spare.join(', ')}`] : []),
    '',
    '### Capacity',
    '',
    '| | Size |',
    '| --- | --- |',
    `| Raw, data vdevs | ${size(reported.rawBytes)} |`,
    `| Usable, naive | ${size(naive.data.usableBytes)} |`,
    `| Usable, as zfs list and TrueNAS report it | ${size(reported.usableBytes)} |`,
    '',
    'From raw to reported:',
    '',
    `- Larger disks than the smallest in their vdev: ${size(deductions.unequalDisks)}`,
    `- Labels and boot area: ${size(deductions.labels)}`,
    `- Metaslab rounding: ${size(deductions.metaslabRounding)}`,
    `- Embedded log metaslabs: ${size(deductions.embeddedLog)}`,
    `- Parity, copies and padding at 128K: ${size(deductions.redundancy)}`,
    `- Slop space: ${size(deductions.slop)}`,
    '',
    'Disks the vdevs may lose: ' +
      [...naive.data.vdevs, ...naive.special.vdevs, ...naive.log.vdevs]
        .map((vdev) => `${vdev.vdevId} ${vdev.faultTolerance}`)
        .join(', ') +
      '.',
    '',
    '### Space efficiency per block size',
    '',
    'Usable space if every block had this size, uncompressed.',
    '',
    `| Block size | Usable | ${efficiency.idealEfficiency.map((v) => v.vdevId).join(' | ')} |`,
    `| --- | --- | ${efficiency.idealEfficiency.map(() => '---').join(' | ')} |`,
    ...efficiency.rows.map(
      (row) =>
        `| ${formatBlockSize(row.blockSize)} | ${size(row.usableBytes)} | ${row.vdevs.map((v) => percent(v.efficiency)).join(' | ')} |`,
    ),
    `| without padding | | ${efficiency.idealEfficiency.map((v) => percent(v.efficiency)).join(' | ')} |`,
    '',
    '### Speed',
    '',
    'Multiples of one member disk, rule of thumb.',
    '',
    '| Random read | Random write | Sequential read | Sequential write |',
    '| --- | --- | --- | --- |',
    `| ${performance.readIops}× | ${performance.writeIops}× | ${performance.readThroughput}× | ${performance.writeThroughput}× |`,
    '',
    `### TrueNAS ${truenas.version}`,
    '',
    ...truenas.steps.map((step, i) => `${i + 1}. ${step}`),
    '',
    ...truenas.notes.map((note) => `- ${note}`),
    '',
    '### zpool create',
    '',
    '```sh',
    zpoolCreateCommand(pool, host).trimEnd(),
    '```',
    '',
  ]
}

function vdevLines(title: string, vdevs: Vdev[]): string[] {
  return vdevs.map((vdev) => `- ${title}: ${vdev.type} of ${vdev.diskIds.join(', ')} (${vdev.id})`)
}

function size(bytes: Bytes): string {
  return `${formatDecimal(bytes)} (${formatBinary(bytes)})`
}

function percent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(1))}%`
}
