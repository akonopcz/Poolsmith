<script lang="ts">
  import { parsePlan, serializePlan } from '../core/file'
  import { download, safeFileName } from './files'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'

  let fileInput: HTMLInputElement

  function newPlan() {
    if (store.isEmpty || confirm('Start a new plan? Changes you did not save are lost.')) {
      store.reset()
    }
  }

  async function openFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file === undefined) return
    const result = parsePlan(await file.text())
    if (result.ok) store.load(result.plan)
    else store.loadErrors = [`${file.name} could not be loaded:`, ...result.errors]
  }

  function save() {
    download(
      `${safeFileName(store.plan.name, 'plan')}.json`,
      serializePlan(store.plan),
      'application/json',
    )
    store.restored = false
  }
</script>

<header>
  <div class="brand">
    <Icon name="ring" size={20} />
    <span>Poolsmith</span>
  </div>
  <label class="plan-name">
    <span class="visually-hidden">Plan name</span>
    <input bind:value={store.plan.name} spellcheck="false" />
  </label>
  <span class="mobile-only desktop-note">Editing needs a desktop.</span>

  <div class="actions">
    <button class="btn quiet edit-only" onclick={newPlan} title="Start over with an empty plan">
      <Icon name="plus" />New plan
    </button>
    <button
      class="btn quiet"
      onclick={() => fileInput.click()}
      title="Load a plan from a .json file on your computer"
    >
      <Icon name="open" />Open plan file…
    </button>
    <button class="btn quiet" onclick={save} title="Download this plan as a .json file">
      <Icon name="save" />Save plan file
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      hidden
      onchange={openFile}
    />
    <button
      class="btn icon quiet"
      onclick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')}
      aria-label={store.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={store.theme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      <Icon name={store.theme === 'dark' ? 'sun' : 'moon'} />
    </button>
    {#if store.view === 'plan'}
      <button class="btn primary" onclick={() => (store.view = 'export')}>
        <Icon name="download" />Export
      </button>
    {:else}
      <button class="btn primary" onclick={() => (store.view = 'plan')}>
        <Icon name="back" />Back to plan
      </button>
    {/if}
  </div>
</header>

{#if store.restored}
  <div class="restored" role="status">
    <span>Restored from this browser. Save a plan file to keep it for good.</span>
    <button class="btn small" onclick={() => (store.restored = false)}>Dismiss</button>
  </div>
{/if}

{#if store.loadErrors}
  <div class="load-errors" role="alert">
    <div>
      <strong>{store.loadErrors[0]}</strong>
      <ul>
        {#each store.loadErrors.slice(1) as error, i (i)}
          <li><code>{error}</code></li>
        {/each}
      </ul>
    </div>
    <button class="btn small" onclick={() => (store.loadErrors = null)}>Dismiss</button>
  </div>
{/if}

<style>
  header {
    height: var(--header-height);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px 0 24px;
    background: var(--panel);
    border-bottom: 1px solid var(--rule);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .brand :global(svg) {
    stroke-width: 3;
  }

  /* Centre the ring on the capitals rather than on the line box. */
  .brand span {
    padding-top: var(--cap-nudge);
  }

  .plan-name input {
    width: 200px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--ink-2);
    font-weight: 600;
  }

  .plan-name input:hover {
    border-color: var(--rule-strong);
  }

  .plan-name input:focus {
    color: var(--ink);
    border-color: var(--rule-strong);
    background: var(--raise);
  }

  .desktop-note {
    font-size: 12px;
    color: var(--ink-2);
  }

  .actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .actions .primary {
    margin-left: 8px;
  }

  .load-errors {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 24px;
    background: var(--issue-bg);
    color: var(--ink);
    border-bottom: 1px solid var(--issue);
  }

  .restored {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 24px;
    background: var(--info-bg);
    color: var(--ink);
    border-bottom: 1px solid var(--info);
    font-size: 13px;
  }

  .load-errors strong {
    color: var(--issue);
  }

  .load-errors ul {
    margin: 6px 0 0;
    padding-left: 18px;
    font-size: 13px;
  }

  @media (max-width: 900px) {
    header {
      flex-wrap: wrap;
      height: auto;
      padding: 10px 16px;
      gap: 8px;
    }

    .actions {
      margin-left: 0;
      flex-wrap: wrap;
    }
  }
</style>
