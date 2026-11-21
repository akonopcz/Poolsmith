<script lang="ts">
  import { formatBinary, formatBlockSize, formatDecimal } from '../core/format'
  import { vdevCodes } from '../core/zfs/codes'
  import { faultTolerance, hasValidDiskCount, poolFaultTolerance } from '../core/zfs/topology'
  import Findings from './Findings.svelte'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'
  import Term from './Term.svelte'

  let open = $state(false)

  const reported = $derived(store.reported!)
  const naive = $derived(store.naive!)
  const ready = $derived(reported.rawBytes > 0)
  const usable = $derived(formatDecimal(reported.usableBytes).split(' '))
  const codes = $derived(vdevCodes(store.pool))

  // Lines whose loss loses the pool, with how many disks each may lose.
  const tolerances = $derived(
    [
      ...store.pool.data.map((v) => ({ v, role: 'data' })),
      ...store.pool.special.map((v) => ({ v, role: 'special' })),
    ]
      .filter(({ v }) => hasValidDiskCount(v))
      .map(({ v, role }) => ({ id: v.id, role, code: codes.get(v.id)!, n: faultTolerance(v) })),
  )
  const poolTolerance = $derived(poolFaultTolerance(store.pool))

  const unused = $derived(store.disks.filter((d) => !store.usedDiskIds.has(d.id)).length)
  const issues = $derived(store.findings.filter((f) => f.severity === 'issue').length)
  const warnings = $derived(store.findings.filter((f) => f.severity === 'warning').length)
  const hints = $derived(store.findings.filter((f) => f.severity === 'info').length)

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

  const effVdevs = $derived(store.efficiency?.rows[0]?.vdevs.map((v) => v.vdevId) ?? [])
  const perf = $derived(store.performance!)

  function pct(x: number) {
    return `${Math.round(x * 100)} %`
  }
  function times(x: number) {
    return `${Number(x.toFixed(1))}×`
  }
  function plural(n: number, word: string) {
    return `${n} ${n === 1 ? word : `${word}s`}`
  }
</script>

<section class="estimate" aria-label="Estimate">
  <div class="bar">
    {#if !ready}
      <p class="empty">
        The estimate appears once the pool has a complete data vdev. A mirror needs two disks, a
        raidz2 at least three.
      </p>
    {:else}
      <div class="headline">
        <p class="big">{usable[0]}<span class="unit">{usable[1]} usable</span></p>
        <p class="sub">
          {formatBinary(reported.usableBytes)} as TrueNAS shows it ·&nbsp;
          <Term term="tib" label="TB vs. TiB" />
          {#if delta !== null}
            <span class="delta" class:loss={delta < 0}>
              {delta > 0 ? '+' : '−'}{formatDecimal(Math.abs(delta))}
            </span>
          {/if}
        </p>
      </div>

      <div class="fact">
        <span class="label">Pool may lose</span>
        <span class="values">
          <span class="value" class:zero={poolTolerance === 0}>
            {poolTolerance === 0 ? 'no disk' : `any ${plural(poolTolerance ?? 0, 'disk')}`}
          </span>
          {#if tolerances.length > 1}
            <span
              class="per-line"
              title="Disks each line may lose. The weakest line sets the pool."
            >
              {#each tolerances as t (t.id)}
                <span class="tol" class:zero={t.n === 0}>
                  <span class="bullet" style:--line="var(--line-{t.role})">{t.code}</span>
                  <span class="n">{t.n}</span>
                </span>
              {/each}
            </span>
          {/if}
        </span>
      </div>

      <div class="fact">
        <span class="label">Not in any pool</span>
        <span class="values">
          <span class="value">{unused} of {plural(store.disks.length, 'disk')}</span>
        </span>
      </div>
    {/if}

    <div class="end">
      {#if store.findings.length === 0}
        <span class="clean">{ready ? 'No issues or warnings' : ''}</span>
      {:else}
        <button class="counts" onclick={() => (open = true)} title="Show the list">
          {#if issues}<span class="i"><Icon name="issue" />{plural(issues, 'issue')}</span>{/if}
          {#if warnings}<span class="w">
              <Icon name="warning" />{plural(warnings, 'warning')}
            </span>{/if}
          {#if hints}<span class="h"><Icon name="info" />{plural(hints, 'hint')}</span>{/if}
        </button>
      {/if}
      {#if ready || store.findings.length > 0}
        <button class="btn small" aria-expanded={open} onclick={() => (open = !open)}>
          Details
          <span class="chev" class:up={open}><Icon name="chevron" size={14} /></span>
        </button>
      {/if}
    </div>
  </div>

  {#if open && (ready || store.findings.length > 0)}
    <div class="details">
      {#if store.findings.length > 0}
        <section class="panel findings-panel">
          <h3>Issues and warnings</h3>
          <Findings findings={store.findings} />
        </section>
      {/if}

      {#if ready}
        <section class="panel">
          <h3>Capacity <span>{formatDecimal(reported.rawBytes)} raw → {usable.join(' ')}</span></h3>
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
              The special vdev adds {formatDecimal(naive.special.usableBytes)} for metadata and small
              files. It does not count as free space until it holds data.
            </p>
          {/if}
        </section>

        <section class="panel">
          <h3>Space efficiency <span>by block size</span></h3>
          <p class="note">
            How much of each block holds data. Small blocks on raidz lose space to parity and <Term
              term="padding"
              label="padding"
            />. The highlighted row is the recordsize.
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
        </section>

        <section class="panel">
          <h3>Performance <span>rough, × one disk</span></h3>
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
        </section>
      {/if}
    </div>
  {/if}
</section>

<style>
  .estimate {
    grid-column: 1 / -1;
    background: var(--panel);
    border-bottom: 1px solid var(--rule);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 12px 40px;
    flex-wrap: wrap;
    min-height: 72px;
    padding: 12px 24px;
  }

  .empty {
    color: var(--ink-2);
    font-size: 13px;
  }

  .big {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .unit {
    margin-left: 6px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--ink-2);
  }

  .sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--ink-3);
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

  .fact {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 20px;
    border-left: 1px solid var(--rule);
  }

  .label {
    font-size: 12px;
    color: var(--ink-3);
  }

  /* Value text and bullets share one optical centre: text boxes are trimmed to line-height 1
     and nudged to their capitals, like the bullets. */
  .values {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 24px;
  }

  .value,
  .n {
    line-height: 1;
    padding-top: var(--cap-nudge);
  }

  .value {
    font-size: 18px;
    font-weight: 700;
  }

  .value.zero,
  .tol.zero {
    color: var(--warning);
  }

  .per-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
  }

  .tol {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .tol .bullet {
    min-width: 22px;
    height: 20px;
    font-size: 11px;
  }

  .end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .clean {
    font-size: 13px;
    color: var(--ink-3);
  }

  .counts {
    display: flex;
    gap: 14px;
    padding: calc(4px + var(--cap-nudge)) 8px 4px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    font-size: 13px;
    font-weight: 700;
  }

  .counts:hover {
    background: var(--raise);
  }

  .counts span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .counts :global(svg) {
    position: relative;
    top: calc(var(--cap-nudge) * -0.5);
  }

  .counts .i {
    color: var(--issue);
  }

  .counts .w {
    color: var(--warning);
  }

  .counts .h {
    color: var(--ink-2);
    font-weight: 600;
  }

  .chev {
    display: inline-flex;
    transform: rotate(90deg);
    transition: transform 150ms ease-out;
  }

  .chev.up {
    transform: rotate(-90deg);
  }

  /* Opens under the bar; hardware and pool keep their columns and get shorter meanwhile. */
  .details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px 40px;
    max-height: 45vh;
    overflow-y: auto;
    padding: 4px 24px 20px;
  }

  .panel h3 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 700;
  }

  .panel h3 span {
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-3);
  }

  .note {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }

  .panel h3 + .note {
    margin: 0 0 8px;
  }

  .table {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 6px;
    margin: 0;
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
    padding: 3px 6px;
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

  @media (max-width: 900px) {
    .bar {
      padding: 12px 16px;
      gap: 12px 20px;
    }

    .fact {
      padding-left: 0;
      border-left: 0;
    }

    .end {
      margin-left: 0;
    }

    .details {
      max-height: none;
      padding: 4px 16px 20px;
    }
  }
</style>
