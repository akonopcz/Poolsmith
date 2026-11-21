<script lang="ts">
  import { planSummary } from '../core/summary'
  import { trueNasSteps } from '../core/zfs/truenas-steps'
  import { zpoolCreateCommand } from '../core/zfs/zpool-command'
  import { download, safeFileName } from './files'
  import Icon from './Icon.svelte'
  import { inlineMarkdown } from './markdown'
  import { store } from './store.svelte'

  type Tab = 'truenas' | 'zpool' | 'summary'
  let tab = $state<Tab>('truenas')
  let copied = $state<Tab | null>(null)

  const pool = $derived(store.pool)
  const steps = $derived(trueNasSteps(pool, store.plan.host))
  const command = $derived(zpoolCreateCommand(pool, store.plan.host))
  const summary = $derived(planSummary(store.plan))
  const issues = $derived(store.issues.length)

  const stepsText = $derived(
    [
      `# Build pool ${pool.name} in TrueNAS ${steps.version}`,
      '',
      ...steps.steps.map((step, i) => `${i + 1}. ${step}`),
      ...(steps.notes.length > 0 ? ['', '## Notes', '', ...steps.notes.map((n) => `- ${n}`)] : []),
      '',
    ].join('\n'),
  )

  const text = $derived(tab === 'truenas' ? stepsText : tab === 'zpool' ? `${command}\n` : summary)
  const fileName = $derived(
    tab === 'summary'
      ? `${safeFileName(store.plan.name, 'plan')}.md`
      : tab === 'zpool'
        ? `${safeFileName(pool.name, 'pool')}-create.sh`
        : `${safeFileName(pool.name, 'pool')}-truenas.md`,
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      copied = tab
      setTimeout(() => (copied = null), 1800)
    } catch {
      copied = null
    }
  }
</script>

<main class="export">
  <div class="inner">
    <h1>Export</h1>
    <p class="lead">
      Poolsmith plans only. It never connects to a server. Use the TrueNAS steps to build the pool,
      the command is for reference.
    </p>

    {#if issues > 0}
      <p class="alert">
        <Icon name="issue" />The plan has {issues}
        {issues === 1 ? 'issue' : 'issues'}. ZFS would refuse it as it stands. Fix {issues === 1
          ? 'it'
          : 'them'} before you build the pool.
      </p>
    {/if}

    <div class="bar">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'truenas'} onclick={() => (tab = 'truenas')}>
          TrueNAS steps
        </button>
        <button role="tab" aria-selected={tab === 'zpool'} onclick={() => (tab = 'zpool')}>
          zpool create
        </button>
        <button role="tab" aria-selected={tab === 'summary'} onclick={() => (tab = 'summary')}>
          Plan summary
        </button>
      </div>
      {#if tab !== 'summary' && store.plan.layouts.length > 1}
        <label class="field pool-pick">
          <span class="visually-hidden">Pool</span>
          <select bind:value={store.poolId}>
            {#each store.plan.layouts as p (p.id)}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </label>
      {/if}
      <div class="actions">
        <button class="btn" onclick={copy}>
          <Icon name={copied === tab ? 'check' : 'copy'} />{copied === tab ? 'Copied' : 'Copy'}
        </button>
        <button
          class="btn"
          onclick={() => download(fileName, text, tab === 'zpool' ? 'text/x-sh' : 'text/markdown')}
        >
          <Icon name="download" />Download
        </button>
      </div>
    </div>

    {#if tab === 'truenas'}
      <ol class="steps">
        {#each steps.steps as step, i (i)}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- inlineMarkdown escapes first -->
          <li><span>{@html inlineMarkdown(step)}</span></li>
        {/each}
      </ol>
      {#if steps.notes.length > 0}
        <h2>Notes</h2>
        <ul class="notes">
          {#each steps.notes as note, i (i)}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- inlineMarkdown escapes first -->
            <li>{@html inlineMarkdown(note)}</li>
          {/each}
        </ul>
      {/if}
    {:else if tab === 'zpool'}
      <p class="danger">
        <Icon name="warning" /><span>
          <strong>zpool create wipes every listed disk.</strong> On TrueNAS, build the pool in the web
          UI instead, because the middleware does not know pools created in the shell.
        </span>
      </p>
      <pre>{command}</pre>
    {:else}
      <pre class="summary">{summary}</pre>
    {/if}
  </div>
</main>

<style>
  .export {
    height: calc(100vh - var(--header-height) - var(--footer-height));
    overflow-y: auto;
  }

  .inner {
    max-width: 860px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  h1 {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .lead {
    margin: 8px 0 20px;
    color: var(--ink-2);
    max-width: 65ch;
  }

  .alert,
  .danger {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 20px;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 13px;
  }

  .alert {
    background: var(--issue-bg);
  }

  .alert :global(svg) {
    color: var(--issue);
  }

  .danger {
    background: var(--warning-bg);
  }

  .danger :global(svg) {
    color: var(--warning);
  }

  .bar {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    border-bottom: 1px solid var(--rule);
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .tabs {
    display: flex;
    gap: 2px;
  }

  .tabs button {
    height: 40px;
    padding: var(--cap-nudge) 14px 0;
    border: 0;
    background: none;
    color: var(--ink-2);
    font-weight: 600;
  }

  .tabs button[aria-selected='true'] {
    color: var(--ink);
    box-shadow: inset 0 -3px 0 var(--ink);
  }

  .pool-pick {
    margin-bottom: 6px;
  }

  .actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
    padding-bottom: 6px;
  }

  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
    display: grid;
    gap: 14px;
    max-width: 72ch;
  }

  .steps li {
    counter-increment: step;
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 12px;
    line-height: 1.55;
  }

  .steps li::before {
    content: counter(step);
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding-top: var(--cap-nudge);
    border-radius: 13px;
    background: var(--ink);
    color: var(--ground);
    font-size: 12px;
    font-weight: 800;
  }

  .steps :global(code),
  .notes :global(code) {
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--raise);
    font-size: 0.92em;
  }

  h2 {
    margin: 28px 0 10px;
    font-size: 15px;
    font-weight: 700;
  }

  .notes {
    margin: 0;
    padding-left: 18px;
    color: var(--ink-2);
    display: grid;
    gap: 6px;
    max-width: 72ch;
  }

  pre {
    margin: 0;
    padding: 16px 18px;
    border-radius: 8px;
    background: var(--panel);
    border: 1px solid var(--rule);
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
