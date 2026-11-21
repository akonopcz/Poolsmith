<script lang="ts">
  import type { Disk } from '../core/model'
  import { addDisksToBays, addLooseDisk, removeDisk, updateDisk, type DiskSpec } from './edits'
  import { store, type Editor } from './store.svelte'
  import Term from './Term.svelte'

  let { editor }: { editor: Extract<Editor, { mode: 'add-to-bay' | 'add-loose' | 'edit' }> } =
    $props()

  const TB = 1e12
  const GB = 1e9

  const existing = $derived(
    editor.mode === 'edit' ? store.disks.find((d) => d.id === editor.diskId) : undefined,
  )
  const enclosure = $derived(
    editor.mode === 'add-to-bay'
      ? store.plan.host.enclosures.find((e) => e.id === editor.enclosureId)
      : undefined,
  )
  const bay = $derived(
    editor.mode === 'add-to-bay' ? enclosure?.bays.find((b) => b.id === editor.bayId) : undefined,
  )
  const emptyBays = $derived(enclosure?.bays.filter((b) => b.diskId === undefined) ?? [])

  // The form starts from the disk being edited, or from the last disk added, since shelves
  // usually hold many identical disks.
  function initial(): DiskSpec {
    const source: Disk | undefined =
      editor.mode === 'edit'
        ? store.disks.find((d) => d.id === editor.diskId)
        : store.disks[store.disks.length - 1]
    return source
      ? {
          sizeBytes: source.sizeBytes,
          type: source.type,
          logicalSectorSize: source.logicalSectorSize,
          physicalSectorSize: source.physicalSectorSize,
          label: editor.mode === 'edit' ? (source.label ?? '') : '',
        }
      : {
          sizeBytes: 8 * TB,
          type: 'hdd',
          logicalSectorSize: 512,
          physicalSectorSize: 4096,
          label: '',
        }
  }

  const start = initial()
  let unit = $state<'TB' | 'GB'>(start.sizeBytes >= TB ? 'TB' : 'GB')
  let amount = $state(Number((start.sizeBytes / (start.sizeBytes >= TB ? TB : GB)).toFixed(3)))
  let type = $state(start.type)
  let physical = $state(start.physicalSectorSize)
  let logical = $state(start.logicalSectorSize)
  let label = $state(start.label ?? '')
  let fillAll = $state(false)

  const sizeBytes = $derived(Math.round(amount * (unit === 'TB' ? TB : GB)))
  const valid = $derived(Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(sizeBytes))

  function setType(next: Disk['type']) {
    type = next
    // HDDs since about 2011 use 4K sectors; SSDs mostly report 512 bytes.
    physical = next === 'hdd' ? 4096 : 512
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!valid) return
    const spec: DiskSpec = {
      sizeBytes,
      type,
      logicalSectorSize: logical,
      physicalSectorSize: physical,
      label: label.trim(),
    }
    if (editor.mode === 'edit') updateDisk(store.plan, editor.diskId, spec)
    else if (editor.mode === 'add-loose') addLooseDisk(store.plan, spec)
    else {
      const bayIds = fillAll ? emptyBays.map((b) => b.id) : [editor.bayId]
      addDisksToBays(store.plan, bayIds, spec)
    }
    store.editor = null
  }

  function remove() {
    if (editor.mode !== 'edit') return
    removeDisk(store.plan, editor.diskId)
    store.editor = null
  }
</script>

<form onsubmit={submit} class="disk-form">
  <h3>
    {#if editor.mode === 'edit'}Edit disk
    {:else if editor.mode === 'add-loose'}Add a disk without bay
    {:else}Add a disk to {enclosure?.name} bay {bay?.label}{/if}
  </h3>
  {#if editor.mode === 'add-loose'}
    <p class="hint">For disks you still have to buy, or cold spares on the shelf.</p>
  {/if}

  <div class="row">
    <label class="field size">
      Size
      <input type="number" min="0" step="any" bind:value={amount} required />
    </label>
    <label class="field unit">
      <span class="visually-hidden">Unit</span>
      <select bind:value={unit}>
        <option>TB</option>
        <option>GB</option>
      </select>
    </label>
  </div>

  <div class="field">
    Type
    <div class="segmented" role="group" aria-label="Disk type">
      {#each [['hdd', 'HDD'], ['ssd', 'SSD'], ['nvme', 'NVMe']] as const as [value, text] (value)}
        <button type="button" aria-pressed={type === value} onclick={() => setType(value)}>
          {text}
        </button>
      {/each}
    </div>
  </div>

  <div class="row">
    <label class="field">
      <span>Physical <Term term="sector" label="sector" /></span>
      <select bind:value={physical}>
        <option value={4096}>4096 B</option>
        <option value={512}>512 B</option>
      </select>
    </label>
    <label class="field">
      Logical sector
      <select bind:value={logical}>
        <option value={512}>512 B</option>
        <option value={4096}>4096 B</option>
      </select>
    </label>
  </div>

  <label class="field">
    Label (optional)
    <input bind:value={label} placeholder="WD Red Plus, serial …" />
  </label>

  {#if editor.mode === 'add-to-bay' && emptyBays.length > 1}
    <label class="check">
      <input type="checkbox" bind:checked={fillAll} />
      Fill all {emptyBays.length} empty bays of {enclosure?.name} with this disk
    </label>
  {/if}

  <div class="buttons">
    <button class="btn primary" type="submit" disabled={!valid}>
      {editor.mode === 'edit'
        ? 'Save disk'
        : fillAll
          ? `Add ${emptyBays.length} disks`
          : 'Add disk'}
    </button>
    <button class="btn" type="button" onclick={() => (store.editor = null)}>Cancel</button>
    {#if existing}
      <button class="btn quiet danger push" type="button" onclick={remove}>Delete disk</button>
    {/if}
  </div>
</form>

<style>
  .disk-form {
    display: grid;
    gap: 12px;
  }

  h3 {
    font-size: 15px;
    font-weight: 700;
  }

  .hint {
    font-size: 12px;
    color: var(--ink-2);
    margin-top: -6px;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-items: end;
  }

  .row:has(.unit) {
    grid-template-columns: 1fr 80px;
  }

  .check {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 13px;
    color: var(--ink-2);
  }

  .check input {
    margin: 2px 0 0;
    accent-color: var(--ink);
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .push {
    margin-left: auto;
  }
</style>
