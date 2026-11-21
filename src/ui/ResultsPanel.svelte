<script lang="ts">
  import { formatBinary, formatBlockSize, formatDecimal } from '../core/format'
  import { faultTolerance, hasValidDiskCount } from '../core/zfs/topology'
  import Findings from './Findings.svelte'
  import { vdevCodes } from './labels'
  import { store } from './store.svelte'
  import Term from './Term.svelte'

  const reported = $derived(store.reported!)
  const naive = $derived(store.naive!)
  const ready = $derived(reported.rawBytes > 0)
  const usable = $derived(formatDecimal(reported.usableBytes).split(' '))

  // Lines whose loss loses the pool, with how many disks each may lose.
  const tolerances = $derived.by(() => {
    const codes = vdevCodes(store.pool)
    return [
      ...store.pool.data.map((v) => ({ v, role: 'data' })),
      ...store.pool.special.map((v) => ({ v, role: 'special' })),
    ]
      .filter(({ v }) => hasValidDiskCount(v))
      .map(({ v, role }) => ({ id: v.id, role, code: codes.get(v.id)!, n: faultTolerance(v) }))
  })

  const unused = $derived(store.disks.filter((d) => !store.usedDiskIds.has(d.id)).length)
  const issues = $derived(store.findings.filter((f) => f.severity === 'issue').length)
  const warnings = $derived(store.findings.filter((f) => f.severity === 'warning').length)

  // The change of the headline number after an edit, shown briefly so layouts compare in place.
  let delta = $state<number | null>(null)
  let previous: number | null = null
  let previousPool: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  $effect(() => {
    const now = ready ? reported.usableBytes : null
    const samePool = previousPool === store.pool.id
    previousPool = store.pool.id
    if (samePool && previous !== null && now !== null && now !== previous) {
      delta = now - previous
      clearTimeout(timer)
      timer = setTimeout(() => (delta = null), 2600)
    }
    previous = now
  })

  const deductions = $derived(
    [
      { term: 'parity', label: 'Parity and padding', value: reported.deductions.redundancy },
      {
        term: null,
        label: 'Larger disks cut to the smallest',
        value: reported.deductions.unequalDisks,
      },
      { term: 'slop', label: 'Slop space reserve', value: reported.deductions.slop },
      { term: 'embeddedLog', label: 'Embedded log', value: reported.deductions.embeddedLog },
      { term: 'metaslab', label: 'Metaslab rounding', value: reported.deductions.metaslabRounding },
      { term: 'labels', label: 'Labels and boot area', value: reported.deductions.labels },
    ].filter((d) => d.value > 0) as {
      term: 'parity' | 'slop' | 'embeddedLog' | 'metaslab' | 'labels' | null
      label: string
      value: number
    }[],
  )

  const codes = $derived(vdevCodes(store.pool))
  const effVdevs = $derived(store.efficiency?.rows[0]?.vdevs.map((v) => v.vdevId) ?? [])
  const perf = $derived(store.performance!)

  function pct(x: number) {
    return `${Math.round(x * 100)} %`
  }
  function times(x: number) {
    return `${Number(x.toFixed(1))}×`
  }
</script>

<aside class="results" aria-label="Estimate">
  <h2 class="section-title">Estimate</h2>

  {#if !ready}
    <p class="empty">
      The estimate appears once the pool has a complete data vdev. A mirror needs two disks, a
      raidz2 at least three.
    </p>
  {:else}
    <div class="headline">
      <p class="big">
        {usable[0]}<span class="unit">{usable[1]} usable</span>
      </p>
      <p class="sub">
        {formatBinary(reported.usableBytes)} as TrueNAS shows it
        {#if delta !== null}
          <span class="delta" class:loss={delta < 0}>
            {delta > 0 ? '+' : '−'}{formatDecimal(Math.abs(delta))}
          </span>
        {/if}
      </p>
      <p class="tib-note"><Term term="tib" label="Why TB and TiB differ" /></p>
    </div>

    <dl class="facts">
      <dt>Disks that may fail</dt>
      <dd>
        {#each tolerances as t (t.id)}
          <span class="tol" class:zero={t.n === 0}>
            <span class="bullet" style:--line="var(--line-{t.role})">{t.code}</span>{t.n}
          </span>
        {/each}
      </dd>
      <dt>Disks not in any pool</dt>
      <dd>{unused} of {store.disks.length}</dd>
    </dl>
    {#if tolerances.length > 1}
      <p class="note">
        Each line may lose this many disks. Losing more in any single line loses the pool.
      </p>
    {/if}
  {/if}

  <div class="findings-block">
    {#if store.findings.length === 0}
      <p class="clean">{ready ? 'No issues or warnings.' : ''}</p>
    {:else}
      <p class="count">
        {#if issues}<span class="i">{issues} {issues === 1 ? 'issue' : 'issues'}</span>{/if}
        {#if warnings}<span class="w">
            {warnings}
            {warnings === 1 ? 'warning' : 'warnings'}
          </span>{/if}
      </p>
      <Findings findings={store.findings} />
    {/if}
  </div>

  {#if ready}
    <details open>
      <summary>
        Capacity <span>{formatDecimal(reported.rawBytes)} raw → {usable.join(' ')}</span>
      </summary>
      <dl class="table">
        <dt>Raw, all data disks</dt>
        <dd>{formatDecimal(reported.rawBytes)}</dd>
        <dt class="soft">Simple estimate, raw minus parity</dt>
        <dd class="soft">{formatDecimal(naive.data.usableBytes)}</dd>
        {#each deductions as d (d.label)}
          <dt>
            {#if d.term}<Term term={d.term} label={d.label} />{:else}{d.label}{/if}
          </dt>
          <dd>− {formatDecimal(d.value)}</dd>
        {/each}
        <dt class="total">TrueNAS view</dt>
        <dd class="total">{usable.join(' ')}</dd>
      </dl>
      {#if naive.special.usableBytes > 0}
        <p class="note">
          The special vdev adds {formatDecimal(naive.special.usableBytes)} for metadata and small files.
          It does not count as free space until it holds data.
        </p>
      {/if}
    </details>

    <details>
      <summary>
        Space efficiency
        <span>by block size</span>
      </summary>
      <p class="note">
        How much of each block holds data. Small blocks on raidz lose space to parity and <Term
          term="padding"
          label="padding"
        />. Sectors of {formatBlockSize(2 ** (store.efficiency?.ashift ?? 12))}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Block</th>
            {#each effVdevs as id (id)}<th>{codes.get(id)}</th>{/each}
            <th>Usable</th>
          </tr>
        </thead>
        <tbody>
          {#each store.efficiency?.rows ?? [] as row (row.blockSize)}
            <tr class:current={row.blockSize === store.pool.recordsize}>
              <td>{formatBlockSize(row.blockSize)}</td>
              {#each row.vdevs as v (v.vdevId)}<td>{pct(v.efficiency)}</td>{/each}
              <td>{formatDecimal(row.usableBytes)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="note">
        The highlighted row is the recordsize. Usable space ignores slop and labels.
      </p>
    </details>

    <details>
      <summary>Performance <span>rough, × one disk</span></summary>
      <dl class="table">
        <dt><Term term="iops" label="Random reads" /></dt>
        <dd>{times(perf.readIops)}</dd>
        <dt>Random writes</dt>
        <dd>{times(perf.writeIops)}</dd>
        <dt><Term term="throughput" label="Sequential reads" /></dt>
        <dd>{times(perf.readThroughput)}</dd>
        <dt>Sequential writes</dt>
        <dd>{times(perf.writeThroughput)}</dd>
      </dl>
      <p class="note">
        Rule of thumb: raidz handles random I/O like one disk, more vdevs add up. Caching and
        workload change real numbers a lot.
      </p>
    </details>
  {/if}

  <p class="footnote">
    All numbers are estimates. Compression, metadata and fragmentation are not predictable.
  </p>
</aside>

<style>
  .results {
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px 32px;
    background: var(--panel);
    border-left: 1px solid var(--rule);
  }

  h2 {
    margin-bottom: 14px;
  }

  .empty {
    color: var(--ink-2);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .big {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .unit {
    margin-left: 8px;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--ink-2);
  }

  .sub {
    margin-top: 8px;
    font-size: 13px;
    color: var(--ink-2);
  }

  .delta {
    margin-left: 6px;
    font-weight: 800;
    color: var(--gain);
    animation: pulse 2600ms ease-out;
  }

  .delta.loss {
    color: var(--loss);
  }

  @keyframes pulse {
    0% {
      opacity: 0;
      transform: translateY(4px);
    }
    8%,
    80% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }

  .tib-note {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ink-3);
  }

  .facts {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 10px;
    margin: 18px 0 0;
    padding: 14px 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
  }

  .facts dt {
    color: var(--ink-2);
  }

  .facts dd {
    margin: 0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    font-weight: 700;
  }

  .tol {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .tol .bullet {
    min-width: 22px;
    height: 20px;
    font-size: 11px;
  }

  .tol.zero {
    color: var(--warning);
  }

  .note {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }

  .findings-block {
    margin: 18px 0;
  }

  .clean {
    font-size: 13px;
    color: var(--ink-3);
  }

  .count {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;
  }

  .count .i {
    color: var(--issue);
  }

  .count .w {
    color: var(--warning);
  }

  details {
    border-top: 1px solid var(--rule);
    padding: 12px 0;
  }

  summary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: '';
    width: 6px;
    height: 6px;
    margin-right: 2px;
    border-right: 2px solid var(--ink-3);
    border-bottom: 2px solid var(--ink-3);
    transform: rotate(-45deg);
    transition: transform 150ms ease-out;
    align-self: center;
  }

  details[open] > summary::before {
    transform: rotate(45deg);
  }

  summary span {
    margin-left: auto;
    font-weight: 400;
    font-size: 13px;
    color: var(--ink-2);
  }

  .table {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 6px;
    margin: 12px 0 0;
    font-size: 13px;
  }

  .table dt {
    color: var(--ink-2);
  }

  .table dd {
    margin: 0;
    text-align: right;
  }

  .table .soft {
    color: var(--ink-3);
  }

  .table .total {
    padding-top: 6px;
    border-top: 1px solid var(--rule);
    font-weight: 800;
    color: var(--ink);
  }

  table {
    width: 100%;
    margin-top: 10px;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
    text-align: right;
    padding: 4px 6px;
    border-bottom: 1px solid var(--rule);
  }

  td {
    text-align: right;
    padding: 4px 6px;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    padding-left: 0;
  }

  tr.current td {
    background: var(--mark);
    font-weight: 700;
  }

  .footnote {
    margin-top: 16px;
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
