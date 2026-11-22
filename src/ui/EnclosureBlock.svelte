<script lang="ts">
  import type { Enclosure } from '../core/model'
  import DiskTile from './DiskTile.svelte'
  import { bayTarget, endDrag, enclosureTarget, startEnclosureDrag } from './dnd'
  import { moveEnclosure, removeEnclosure } from '../core/edit'
  import { bayColumns } from '../core/enclosure'
  import { BAY_SIZE } from './bays'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'
  import Term from './Term.svelte'

  let { enclosureId, width }: { enclosureId: string; width: number } = $props()

  // Read from the store rather than taking the object as a prop, so edits here change the plan
  // directly instead of mutating a parent's prop.
  const enclosure: Enclosure = $derived(
    store.plan.host.enclosures.find((e) => e.id === enclosureId)!,
  )

  const KIND = { chassis: 'Chassis', shelf: 'Disk shelf', usb: 'USB enclosure', card: 'PCIe card' }
  const FORM = { lff: '3.5" LFF', sff: '2.5" SFF', m2: 'M.2', aic: 'add-in card' }

  const controllers = $derived(
    store.plan.host.controllers.filter((c) =>
      enclosure.bays.some((bay) => bay.controllerId === c.id),
    ),
  )
  const onboard = $derived(enclosure.bays.some((bay) => bay.controllerId === undefined))
  const formFactor = $derived(enclosure.bays[0]?.formFactor ?? 'lff')
  const columns = $derived(bayColumns(enclosure))

  // Bays keep their height; their width follows the shared enclosure width from bays.ts.
  const bayHeight = $derived(BAY_SIZE[formFactor][1])

  // An empty field drops the stored value, so the grid falls back to the guess.
  function setColumns(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).valueAsNumber
    if (Number.isInteger(value) && value >= 1) enclosure.columns = value
    else if (Number.isNaN(value)) delete enclosure.columns
  }
  const flag = $derived(store.flagged.get(enclosure.id))
  const index = $derived(store.plan.host.enclosures.findIndex((e) => e.id === enclosureId))
  const count = $derived(store.plan.host.enclosures.length)
  const diskCount = $derived(enclosure.bays.filter((b) => b.diskId !== undefined).length)

  function remove() {
    const question =
      diskCount > 0
        ? `Remove ${enclosure.name}? Its ${diskCount === 1 ? 'disk stays' : `${diskCount} disks stay`} in the plan as ${diskCount === 1 ? 'a disk' : 'disks'} without a bay.`
        : `Remove ${enclosure.name}?`
    if (confirm(question)) removeEnclosure(store.plan, enclosure.id)
  }
</script>

<section
  class="enclosure"
  data-flag={flag}
  data-part={enclosure.id}
  style:width="{width}px"
  style:--bay-height="{bayHeight}px"
  class:dragged={store.draggingEnclosure === enclosureId}
  use:enclosureTarget={enclosureId}
>
  <div class="head">
    <input class="name" bind:value={enclosure.name} aria-label="Enclosure name" />
    {#if count > 1}
      <span
        class="grip edit-only"
        draggable="true"
        ondragstart={(e) => startEnclosureDrag(e, enclosureId)}
        ondragend={endDrag}
        title="Drag onto another enclosure to change the order"
        aria-hidden="true"
      >
        <Icon name="grip" />
      </span>
    {/if}
    {#if count > 1}
      <button
        class="btn icon small quiet edit-only"
        onclick={() => moveEnclosure(store.plan, enclosureId, index - 1)}
        disabled={index === 0}
        aria-label="Move {enclosure.name} earlier"
        title="Move earlier"
      >
        <span class="turn up"><Icon name="chevron" /></span>
      </button>
      <button
        class="btn icon small quiet edit-only"
        onclick={() => moveEnclosure(store.plan, enclosureId, index + 1)}
        disabled={index === count - 1}
        aria-label="Move {enclosure.name} later"
        title="Move later"
      >
        <span class="turn down"><Icon name="chevron" /></span>
      </button>
    {/if}
    <button
      class="btn icon small quiet danger edit-only"
      onclick={remove}
      aria-label="Remove {enclosure.name}"
    >
      <Icon name="trash" />
    </button>
  </div>
  <p class="meta">
    {KIND[enclosure.kind]} · {enclosure.bays.length} × {FORM[formFactor]} ·
    <label class="per-row" title="Bays per row as on the front. Empty means a guess.">
      <input
        type="number"
        min="1"
        max={enclosure.bays.length}
        value={columns}
        oninput={setColumns}
      />
      per row
    </label>
    {#if enclosure.kind === 'usb'}<span class="usb">· USB bridges can drop disks</span>{/if}
  </p>

  {#each controllers as controller (controller.id)}
    {@const cflag = store.flagged.get(controller.id)}
    <div class="controller" data-flag={cflag} data-part={controller.id}>
      <input class="cname" bind:value={controller.name} aria-label="Controller name" />
      <span class="mobile-only mode-text">
        {controller.mode === 'hba' ? 'HBA mode' : 'RAID mode'}
      </span>
      <div class="segmented edit-only" role="group" aria-label="{controller.name} mode">
        <button aria-pressed={controller.mode === 'hba'} onclick={() => (controller.mode = 'hba')}>
          HBA
        </button>
        <button
          aria-pressed={controller.mode === 'raid'}
          onclick={() => (controller.mode = 'raid')}
        >
          RAID
        </button>
      </div>
      <span class="mode-hint">
        {#if controller.mode === 'hba'}<Term term="hba" label="What is HBA?" />
        {:else}<Term term="raidMode" label="Hides disks from ZFS" />{/if}
      </span>
    </div>
  {/each}
  {#if onboard}
    <p class="meta">Onboard ports, no controller</p>
  {/if}

  <div class="bays {formFactor}" style:--columns={columns}>
    {#each enclosure.bays as bay (bay.id)}
      <div class="slot" use:bayTarget={bay.id}>
        {#if bay.diskId !== undefined}
          <DiskTile diskId={bay.diskId} bayLabel={bay.label} />
        {:else}
          <button
            class="empty"
            class:editing={store.editor?.mode === 'add-to-bay' && store.editor.bayId === bay.id}
            onclick={() => {
              store.picked = null
              store.editor = { mode: 'add-to-bay', bayId: bay.id, enclosureId: enclosure.id }
            }}
            aria-label="Add a disk to {enclosure.name} bay {bay.label}"
          >
            <span class="label">{bay.label}</span>
            <span class="plus"><Icon name="plus" size={14} /></span>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .enclosure {
    position: relative;
    isolation: isolate;
    flex: 0 1 auto;
    max-width: 100%;
    margin-bottom: 24px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .grip {
    display: grid;
    place-items: center;
    width: 20px;
    height: 28px;
    color: var(--ink-3);
    cursor: grab;
    stroke-width: 2.4;
  }

  .grip :global(svg) {
    stroke-width: 2.6;
  }

  .turn {
    display: inline-flex;
  }

  .turn.up {
    transform: rotate(-90deg);
  }

  .turn.down {
    transform: rotate(90deg);
  }

  .enclosure.dragged {
    opacity: 0.4;
  }

  /* Another enclosure hovers here: it will take this position. */
  /* Another enclosure hovers here and will take this position. The frame sits behind the
     content with room on every side, so it never runs through text. */
  .enclosure:global([data-over])::before {
    content: '';
    position: absolute;
    inset: -12px;
    z-index: -1;
    border: 1.5px dashed var(--focus);
    border-radius: 10px;
    background: color-mix(in srgb, var(--focus) 6%, transparent);
    pointer-events: none;
  }

  /* A disk from another bay hovers here. */
  .slot:global([data-over]) {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
    border-radius: 4px;
  }

  .name,
  .cname {
    min-width: 0;
    flex: 1;
    height: 28px;
    margin-left: -6px;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    font-size: 15px;
    font-weight: 700;
  }

  .cname {
    flex: 0 1 120px;
    font-size: 13px;
    font-weight: 600;
  }

  .name:hover,
  .cname:hover,
  .name:focus,
  .cname:focus {
    border-color: var(--rule-strong);
    background: var(--raise);
  }

  .meta {
    font-size: 12px;
    color: var(--ink-2);
    margin: 0 0 8px;
  }

  .per-row input {
    width: 2em;
    appearance: textfield;
    text-align: center;
    height: 22px;
    padding: 0 2px 0 4px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
  }

  .per-row input::-webkit-inner-spin-button,
  .per-row input::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  .per-row input:hover,
  .per-row input:focus {
    border-color: var(--rule-strong);
    background: var(--raise);
  }

  .usb {
    color: var(--warning);
  }

  .controller {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin: 0 0 8px;
  }

  .controller .segmented button {
    height: 24px;
    padding: var(--cap-nudge) 8px 0;
    font-size: 12px;
  }

  .controller[data-flag] .segmented {
    border-color: var(--warning);
  }

  .mode-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .controller[data-flag] .mode-text {
    color: var(--warning);
  }

  .mode-hint {
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }

  .controller[data-flag] .mode-hint {
    color: var(--warning);
  }

  .bays {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    gap: 4px;
  }

  .slot {
    height: var(--bay-height);
  }

  .empty {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
    border-radius: 4px;
    background: var(--bay-empty);
    color: var(--ink-3);
    transition: border-color 150ms ease-out;
  }

  .empty:hover,
  .empty.editing {
    border-color: var(--ink-3);
  }

  .empty.editing {
    border-style: dashed;
  }

  .label {
    position: absolute;
    top: 3px;
    left: 5px;
    font-size: 10px;
  }

  .plus {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    opacity: 0;
    transition: opacity 150ms ease-out;
  }

  .empty:hover .plus,
  .empty:focus-visible .plus,
  .empty.editing .plus {
    opacity: 1;
  }
</style>
