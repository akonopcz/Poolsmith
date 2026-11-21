<script lang="ts">
  import type { Enclosure } from '../core/model'
  import DiskTile from './DiskTile.svelte'
  import { removeEnclosure } from './edits'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'
  import Term from './Term.svelte'

  let { enclosure }: { enclosure: Enclosure } = $props()

  const KIND = { chassis: 'Chassis', shelf: 'Disk shelf', usb: 'USB enclosure' }
  const FORM = { lff: '3.5" LFF', sff: '2.5" SFF', m2: 'M.2' }

  const controllers = $derived(
    store.plan.host.controllers.filter((c) =>
      enclosure.bays.some((bay) => bay.controllerId === c.id),
    ),
  )
  const onboard = $derived(enclosure.bays.some((bay) => bay.controllerId === undefined))
  const formFactor = $derived(enclosure.bays[0]?.formFactor ?? 'lff')
  // Close to how vendors arrange bays: 12 LFF in rows of four, larger shelves in rows of six.
  const columns = $derived(
    formFactor === 'sff' ? 8 : formFactor === 'm2' ? 4 : enclosure.bays.length > 12 ? 6 : 4,
  )
  const flag = $derived(store.flagged.get(enclosure.id))
  const diskCount = $derived(enclosure.bays.filter((b) => b.diskId !== undefined).length)

  function remove() {
    const question =
      diskCount > 0
        ? `Remove ${enclosure.name}? Its ${diskCount === 1 ? 'disk stays' : `${diskCount} disks stay`} in the plan as ${diskCount === 1 ? 'a disk' : 'disks'} without a bay.`
        : `Remove ${enclosure.name}?`
    if (confirm(question)) removeEnclosure(store.plan, enclosure.id)
  }
</script>

<section class="enclosure" data-flag={flag} data-part={enclosure.id}>
  <div class="head">
    <input class="name" bind:value={enclosure.name} aria-label="Enclosure name" />
    <button
      class="btn icon small quiet danger edit-only"
      onclick={remove}
      aria-label="Remove {enclosure.name}"
    >
      <Icon name="trash" />
    </button>
  </div>
  <p class="meta">
    {KIND[enclosure.kind]} · {enclosure.bays.length} × {FORM[formFactor]}
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
      <div class="slot">
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
    margin-bottom: 24px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 4px;
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

  .usb {
    color: var(--warning);
  }

  .controller {
    display: flex;
    align-items: center;
    gap: 8px;
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
    height: 58px;
  }

  .sff .slot {
    height: 76px;
  }

  .m2 .slot {
    height: 48px;
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
