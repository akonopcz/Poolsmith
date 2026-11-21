<script lang="ts">
  import type { Bay, Controller, Enclosure } from '../core/model'
  import { addEnclosure } from '../core/edit'
  import { guessBayColumns } from '../core/enclosure'
  import { store } from './store.svelte'
  import Term from './Term.svelte'

  let name = $state('')
  let kind = $state<Enclosure['kind']>('chassis')
  let formFactor = $state<Bay['formFactor']>('lff')
  let bayCount = $state(8)
  let firstLabel = $state(0)
  let columns = $state<number | null | undefined>(undefined)
  let controllerChoice = $state<string>('new')
  let controllerName = $state('HBA')
  let controllerMode = $state<Controller['mode']>('hba')

  const guess = $derived(guessBayColumns(formFactor, bayCount))
  const columnsValid = $derived(columns == null || (Number.isInteger(columns) && columns >= 1))
  const valid = $derived(
    Number.isInteger(bayCount) && bayCount >= 1 && bayCount <= 108 && columnsValid,
  )

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!valid) return
    const fallback = { chassis: 'Server', shelf: 'Disk shelf', usb: 'USB enclosure' }[kind]
    addEnclosure(store.plan, {
      name: name.trim() || fallback,
      kind,
      formFactor,
      bayCount,
      firstLabel,
      columns: columns ?? undefined,
      controller:
        controllerChoice === 'none'
          ? null
          : controllerChoice === 'new'
            ? { name: controllerName.trim() || 'Controller', mode: controllerMode }
            : { id: controllerChoice },
    })
    store.editor = null
  }
</script>

<form onsubmit={submit} class="enclosure-form">
  <h3>Add an enclosure</h3>
  <p class="hint">A server chassis, a disk shelf or a USB case. Templates come later.</p>

  <label class="field">
    Name
    <input bind:value={name} placeholder="DL380 Gen9, R730xd, DS4246 …" />
  </label>

  <div class="row">
    <label class="field">
      Kind
      <select bind:value={kind}>
        <option value="chassis">Chassis</option>
        <option value="shelf">Disk shelf</option>
        <option value="usb">USB enclosure</option>
      </select>
    </label>
    <label class="field">
      Bay size
      <select bind:value={formFactor}>
        <option value="lff">3.5" LFF</option>
        <option value="sff">2.5" SFF</option>
        <option value="m2">M.2</option>
      </select>
    </label>
  </div>

  <div class="row three">
    <label class="field">
      Bays
      <input type="number" min="1" max="108" step="1" bind:value={bayCount} required />
    </label>
    <label class="field">
      Per row
      <input
        type="number"
        min="1"
        max={bayCount}
        step="1"
        bind:value={columns}
        placeholder="Auto ({guess})"
      />
    </label>
    <label class="field">
      Numbered from
      <select bind:value={firstLabel}>
        <option value={0}>0</option>
        <option value={1}>1</option>
      </select>
    </label>
  </div>

  <label class="field">
    Bays connect to
    <select bind:value={controllerChoice}>
      <option value="new">A new controller</option>
      {#each store.plan.host.controllers as controller (controller.id)}
        <option value={controller.id}>{controller.name}</option>
      {/each}
      <option value="none">Onboard ports, no controller</option>
    </select>
  </label>

  {#if controllerChoice === 'new'}
    <div class="row">
      <label class="field">
        Controller name
        <input bind:value={controllerName} placeholder="LSI 9207-8i" />
      </label>
      <div class="field">
        <span>Mode (<Term term="hba" label="HBA" />)</span>
        <div class="segmented" role="group" aria-label="Controller mode">
          <button
            type="button"
            aria-pressed={controllerMode === 'hba'}
            onclick={() => (controllerMode = 'hba')}
          >
            HBA
          </button>
          <button
            type="button"
            aria-pressed={controllerMode === 'raid'}
            onclick={() => (controllerMode = 'raid')}
          >
            RAID
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="buttons">
    <button class="btn primary" type="submit" disabled={!valid}>Add enclosure</button>
    <button class="btn" type="button" onclick={() => (store.editor = null)}>Cancel</button>
  </div>
</form>

<style>
  .enclosure-form {
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

  .row.three {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }
</style>
