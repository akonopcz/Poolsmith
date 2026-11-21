<script lang="ts">
  import { formatBlockSize } from '../core/format'
  import DiskListGroup from './DiskListGroup.svelte'
  import { addPool, removePool } from './edits'
  import Findings from './Findings.svelte'
  import Icon from './Icon.svelte'
  import { store } from './store.svelte'
  import Term from './Term.svelte'
  import VdevGroup from './VdevGroup.svelte'

  const ASHIFTS = [9, 10, 11, 12, 13, 14, 15, 16]
  const RECORDSIZES = Array.from({ length: 13 }, (_, i) => 4096 * 2 ** i)

  const POOL_CODES = new Set([
    'invalid-ashift',
    'invalid-recordsize',
    'invalid-pool-name',
    'no-data-vdev',
    'ashift-below-sector',
  ])
  const poolFindings = $derived(
    store.findings.filter((f) => f.ids[0] === store.pool.id && POOL_CODES.has(f.code)),
  )
  const nameFinding = $derived(poolFindings.find((f) => f.code === 'invalid-pool-name'))
  const ashiftFinding = $derived(
    poolFindings.find((f) => f.code === 'invalid-ashift' || f.code === 'ashift-below-sector'),
  )
  const otherPoolFindings = $derived(
    poolFindings.filter((f) => f !== nameFinding && f !== ashiftFinding),
  )
  const hasDisks = $derived(store.disks.length > 0)

  function bytesText(bytes: number) {
    return bytes >= 1024 ? `${bytes / 1024} KiB` : `${bytes} B`
  }

  function newPool() {
    store.poolId = addPool(store.plan).id
  }

  function deletePool() {
    if (!confirm(`Remove pool ${store.pool.name}? Its disks become free again.`)) return
    const id = store.pool.id
    removePool(store.plan, id)
    store.poolId = store.plan.layouts[0].id
  }
</script>

<section class="pool" aria-label="Pool">
  <div class="tabs" role="tablist" aria-label="Pools">
    {#each store.plan.layouts as pool (pool.id)}
      <button
        role="tab"
        aria-selected={pool.id === store.pool.id}
        onclick={() => (store.poolId = pool.id)}
      >
        {pool.name || 'unnamed'}
      </button>
    {/each}
    <button class="new edit-only" onclick={newPool}><Icon name="plus" size={14} />New pool</button>
  </div>

  <div class="scroll">
    <div class="pool-head">
      <label class="field name" data-flag={nameFinding ? 'issue' : undefined}>
        Pool name
        <input bind:value={store.pool.name} spellcheck="false" />
      </label>
      {#if store.plan.layouts.length > 1}
        <button class="btn small quiet danger edit-only" onclick={deletePool}>
          <Icon name="trash" />Remove pool
        </button>
      {/if}
    </div>
    {#if nameFinding}<Findings findings={[nameFinding]} compact />{/if}

    {#if !hasDisks}
      <p class="guide">
        The pool fills once the hardware has disks. Then drag a disk from the left onto a line here,
        or click a disk and then a line.
      </p>
    {/if}

    <VdevGroup
      group="data"
      types={['disk', 'mirror', 'raidz1', 'raidz2', 'raidz3']}
      addTypes={['mirror', 'raidz1', 'raidz2', 'raidz3']}
      singleHint="Drop a disk here for a single-disk vdev (stripe, no redundancy)"
    >
      {#snippet title()}Data{/snippet}
      {#snippet intro()}
        Where your files live. Each line is a <Term term="vdev" label="vdev" />: disks that protect
        each other. Layouts: <Term term="stripe" label="stripe" />, <Term
          term="mirror"
          label="mirror"
        />, <Term term="raidz1" label="raidz1" />, <Term term="raidz2" label="raidz2" />, <Term
          term="raidz3"
          label="raidz3"
        />.
      {/snippet}
    </VdevGroup>

    <VdevGroup
      group="special"
      types={['disk', 'mirror', 'raidz1', 'raidz2', 'raidz3']}
      addTypes={['mirror']}
      singleHint="Drop an SSD here for a single-disk special vdev"
    >
      {#snippet title()}<Term term="special" label="Special" />{/snippet}
      {#snippet intro()}Optional. Fast disks for metadata. If it dies, the pool dies.{/snippet}
    </VdevGroup>

    <VdevGroup
      group="log"
      types={['disk', 'mirror']}
      addTypes={['mirror']}
      singleHint="Drop an SSD here for a single log device"
    >
      {#snippet title()}<Term term="log" label="Log" />{/snippet}
      {#snippet intro()}Optional. Speeds up sync writes, for example from VMs or NFS.{/snippet}
    </VdevGroup>

    <DiskListGroup role="cache" hint="Drop an SSD here">
      {#snippet title()}<Term term="cache" label="Cache" />{/snippet}
      {#snippet intro()}Optional. Extra read cache on an SSD.{/snippet}
    </DiskListGroup>

    <DiskListGroup role="spare" hint="Drop a disk here">
      {#snippet title()}<Term term="spare" label="Spare" />{/snippet}
      {#snippet intro()}Optional. Waits idle and replaces a failed disk.{/snippet}
    </DiskListGroup>

    <div class="settings" data-part={store.pool.id}>
      <div class="setting" data-flag={ashiftFinding?.severity}>
        <label class="field">
          <span><Term term="ashift" label="ashift" />, the smallest block ZFS writes</span>
          <select bind:value={store.pool.ashift}>
            {#each ASHIFTS as ashift (ashift)}
              <option value={ashift}>{ashift} · {bytesText(2 ** ashift)}</option>
            {/each}
          </select>
        </label>
        {#if ashiftFinding}
          <Findings findings={[ashiftFinding]} compact />
        {:else}
          <p class="hint">Fits the sector size of all disks. Cannot change later.</p>
        {/if}
      </div>
      <div class="setting">
        <label class="field">
          <span><Term term="recordsize" label="recordsize" />, the default block size</span>
          <select bind:value={store.pool.recordsize}>
            {#each RECORDSIZES as size (size)}
              <option value={size}>{formatBlockSize(size)}</option>
            {/each}
          </select>
        </label>
        <p class="hint">128K fits mixed files. Datasets can change it later.</p>
      </div>
    </div>
    {#if otherPoolFindings.length > 0}
      <div class="pool-findings"><Findings findings={otherPoolFindings} compact /></div>
    {/if}
  </div>
</section>

<style>
  .pool {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }

  .tabs {
    display: flex;
    gap: 2px;
    padding: 12px 24px 0;
    border-bottom: 1px solid var(--rule);
    overflow-x: auto;
  }

  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 40px;
    padding: var(--cap-nudge) 14px 0;
    border: 0;
    background: none;
    color: var(--ink-2);
    font-weight: 600;
    white-space: nowrap;
  }

  .tabs button[aria-selected='true'] {
    color: var(--ink);
    box-shadow: inset 0 -3px 0 var(--ink);
  }

  .tabs button:hover {
    color: var(--ink);
  }

  .tabs .new {
    color: var(--ink-3);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px 32px;
  }

  .pool-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }

  .name {
    width: 220px;
  }

  .name[data-flag] input {
    border-color: var(--issue);
  }

  .guide {
    margin: -4px 0 20px;
    padding: 12px 14px;
    border-radius: 8px;
    background: var(--info-bg);
    color: var(--ink-2);
    font-size: 13px;
  }

  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--rule);
  }

  .setting[data-flag] select {
    border-color: var(--warning);
  }

  .hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--ink-3);
  }

  .setting :global(.findings.compact) {
    margin-left: 0;
  }

  .pool-findings {
    margin-top: 12px;
  }

  .pool-findings :global(.findings.compact) {
    margin-left: 0;
  }
</style>
