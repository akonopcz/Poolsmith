<script lang="ts">
  import Icon from './Icon.svelte'
  import { readableMessage } from './labels'
  import { store, type Finding } from './store.svelte'

  let { findings, compact = false }: { findings: Finding[]; compact?: boolean } = $props()

  const ICON = { issue: 'issue', warning: 'warning', info: 'info' } as const
  const LABEL = { issue: 'ZFS would refuse', warning: 'Warning', info: 'Hint' }

  // Brings the affected part into view and marks it briefly.
  function show(finding: Finding) {
    const target = finding.ids
      .map((id) => document.querySelector<HTMLElement>(`[data-part="${CSS.escape(id)}"]`))
      .find((el) => el !== null)
    if (!target) return
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
    target.dataset.ping = ''
    setTimeout(() => delete target.dataset.ping, 1400)
  }
</script>

<ul class="findings" class:compact>
  {#each findings as finding, i (finding.code + finding.ids.join() + i)}
    <li data-severity={finding.severity}>
      <button
        type="button"
        onmouseenter={() => store.focusOn(finding.ids)}
        onmouseleave={() => store.focusOn(null)}
        onfocus={() => store.focusOn(finding.ids)}
        onblur={() => store.focusOn(null)}
        onclick={() => show(finding)}
        title="Show the affected part"
      >
        <Icon name={ICON[finding.severity]} />
        <span>
          {#if !compact}<strong>{LABEL[finding.severity]}.</strong>{/if}
          {readableMessage(store.plan.host, finding.message)}.
        </span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .findings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  button {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 8px;
    text-align: left;
    font-size: 13px;
    line-height: 1.45;
  }

  button :global(svg) {
    margin-top: 1px;
  }

  [data-severity='issue'] button {
    background: var(--issue-bg);
  }

  [data-severity='issue'] :global(svg),
  [data-severity='issue'] strong {
    color: var(--issue);
  }

  [data-severity='warning'] button {
    background: var(--warning-bg);
  }

  [data-severity='warning'] :global(svg),
  [data-severity='warning'] strong {
    color: var(--warning);
  }

  [data-severity='info'] button {
    background: transparent;
    color: var(--ink-2);
    padding-left: 0;
  }

  [data-severity='info'] :global(svg) {
    color: var(--info);
  }

  .compact {
    margin: 4px 0 4px 14px;
    gap: 2px;
  }

  .compact button {
    padding: 2px 0;
    background: none;
    font-size: 12px;
    font-weight: 600;
  }

  .compact [data-severity='issue'] button {
    color: var(--issue);
  }

  .compact [data-severity='warning'] button {
    color: var(--warning);
  }

  .compact [data-severity='info'] button {
    color: var(--ink-2);
    font-weight: 400;
  }
</style>
