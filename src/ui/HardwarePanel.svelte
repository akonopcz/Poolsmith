<script lang="ts">
  import DiskForm from './DiskForm.svelte'
  import DiskInspector from './DiskInspector.svelte'
  import DiskTile from './DiskTile.svelte'
  import { dropTarget } from './dnd'
  import EnclosureBlock from './EnclosureBlock.svelte'
  import EnclosureForm from './EnclosureForm.svelte'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'

  const bayed = $derived(
    new Set(store.plan.host.enclosures.flatMap((e) => e.bays.map((b) => b.diskId))),
  )
  const loose = $derived(store.disks.filter((d) => !bayed.has(d.id)))
  const editorKey = $derived(JSON.stringify(store.editor))
</script>

<section class="hardware" use:dropTarget={{ kind: 'out' }} aria-label="Hardware">
  <div class="scroll">
    <h2 class="section-title">Hardware</h2>

    {#if store.isEmpty && store.editor === null}
      <div class="guide">
        <ol>
          <li class="now">
            <span>
              <strong>Add your server.</strong> Enter the chassis and any disk shelves with their bays.
            </span>
          </li>
          <li>
            <span>
              <strong>Put disks into the bays.</strong> Size and type are enough to start.
            </span>
          </li>
          <li>
            <span>
              <strong>Build the pool.</strong> Drag disks onto lines in the middle column and watch the
              estimate on the right.
            </span>
          </li>
        </ol>
        <div class="guide-actions">
          <button
            class="btn primary edit-only"
            onclick={() => (store.editor = { mode: 'enclosure' })}
          >
            <Icon name="plus" />Add enclosure
          </button>
          <button class="btn quiet" onclick={() => store.loadExample()}>Load example</button>
        </div>
      </div>
    {/if}

    <div class="enclosures">
      {#each store.plan.host.enclosures as enclosure (enclosure.id)}
        <EnclosureBlock enclosureId={enclosure.id} />
      {/each}
    </div>

    {#if loose.length > 0}
      <section class="loose">
        <h3>Disks without a bay</h3>
        <div class="loose-grid">
          {#each loose as disk (disk.id)}
            <div class="slot"><DiskTile diskId={disk.id} /></div>
          {/each}
        </div>
      </section>
    {/if}

    {#if !store.isEmpty}
      <div class="add edit-only">
        <button class="btn small quiet" onclick={() => (store.editor = { mode: 'enclosure' })}>
          <Icon name="plus" />Add enclosure
        </button>
        <button class="btn small quiet" onclick={() => (store.editor = { mode: 'add-loose' })}>
          <Icon name="plus" />Disk without bay
        </button>
      </div>
    {/if}
  </div>

  {#if store.editor || store.picked}
    <div class="sheet edit-only" class:alone={store.isEmpty}>
      {#key editorKey}
        {#if store.editor?.mode === 'enclosure'}
          <EnclosureForm />
        {:else if store.editor}
          <DiskForm editor={store.editor} />
        {:else if store.picked}
          <DiskInspector diskId={store.picked} />
        {/if}
      {/key}
    </div>
  {/if}
</section>

<style>
  .hardware {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--rule);
  }

  .hardware:global([data-over]) {
    background: color-mix(in srgb, var(--ink) 4%, transparent);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }

  h2 {
    margin-bottom: 16px;
  }

  /* Enclosures sit side by side once the column is wide enough for both at their smallest. */
  .enclosures {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    column-gap: 32px;
  }

  .guide {
    padding: 16px 0 8px;
  }

  .guide ol {
    margin: 0 0 20px;
    padding: 0;
    list-style: none;
    counter-reset: step;
    display: grid;
    gap: 14px;
  }

  .guide li {
    counter-increment: step;
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 10px;
    color: var(--ink-2);
    font-size: 13px;
  }

  .guide li::before {
    content: counter(step);
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding-top: var(--cap-nudge);
    border-radius: 12px;
    border: 2px solid var(--rule-strong);
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-3);
  }

  .guide li.now::before {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--ground);
  }

  .guide strong {
    display: block;
    color: var(--ink);
    font-size: 14px;
  }

  .guide-actions {
    display: flex;
    gap: 8px;
  }

  .loose {
    margin-bottom: 20px;
  }

  .loose h3 {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .loose-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(0, 88px));
    gap: 4px;
  }

  .slot {
    height: 64px;
  }

  .add {
    display: flex;
    gap: 4px;
    margin-left: -10px;
  }

  .sheet {
    padding: 16px 24px 20px;
    border-top: 1px solid var(--rule-strong);
    background: var(--panel);
    max-height: 60%;
    overflow-y: auto;
  }

  /* Nothing else in the column yet, so the form takes its place instead of sitting low. */
  .sheet.alone {
    order: -1;
    max-height: none;
    border-top: 0;
    background: none;
  }
</style>
