<script lang="ts">
  import { formatDecimal } from '../core/format'
  import type { Vdev, VdevType } from '../core/zfs/model'
  import { faultTolerance, hasValidDiskCount, minDisks } from '../core/zfs/topology'
  import { canPlace, dropTarget, placePicked } from './dnd'
  import { removeVdev, type VdevGroup } from '../core/edit'
  import Findings from './Findings.svelte'
  import Icon from './Icon.svelte'
  import { bayLabel, enclosureName, TYPE_LABEL } from './labels'
  import Station from './Station.svelte'
  import { store } from './store.svelte'

  let {
    vdev,
    group,
    code,
    types,
  }: { vdev: Vdev; group: VdevGroup; code: string; types: VdevType[] } = $props()

  const sizes = $derived(
    vdev.diskIds.flatMap((id) => store.disks.find((d) => d.id === id)?.sizeBytes ?? []),
  )
  const sizeText = $derived.by(() => {
    if (sizes.length === 0) return 'no disks yet'
    const low = Math.min(...sizes)
    const high = Math.max(...sizes)
    return low === high
      ? `${sizes.length} × ${formatDecimal(low)}`
      : `${sizes.length} disks, ${formatDecimal(low)}–${formatDecimal(high)}`
  })
  // One enclosure for all disks: name it once before the line and show only bay numbers.
  const shared = $derived.by(() => {
    const names = new Set(vdev.diskIds.map((id) => enclosureName(store.plan.host, id)))
    const [name] = names
    return names.size === 1 ? name : undefined
  })
  const valid = $derived(hasValidDiskCount(vdev))
  const missing = $derived(Math.max(0, minDisks(vdev.type) - vdev.diskIds.length))
  const tolerance = $derived(valid ? faultTolerance(vdev) : 0)
  const findings = $derived(store.findings.filter((f) => f.ids.includes(vdev.id)))
  const flag = $derived(findings[0]?.severity)
  const dim = $derived(store.isDim([vdev.id, ...vdev.diskIds]))
  const offer = $derived(
    store.picked !== null && !vdev.diskIds.includes(store.picked) && canPlace(store.picked),
  )
</script>

<div class="wrap" class:dim data-part={vdev.id}>
  <div
    class="line"
    class:offer
    data-flag={flag}
    style:--line="var(--line-{group})"
    use:dropTarget={{ kind: 'vdev', vdevId: vdev.id }}
    onmouseenter={() => store.focusOn([vdev.id])}
    onmouseleave={() => store.focusOn(null)}
    role="group"
    aria-label="{code}, {TYPE_LABEL[vdev.type]}"
  >
    <div class="title">
      <span class="bullet">{code}</span>
      {#if shared}<span class="enclosure">{shared}</span>{/if}
    </div>
    <div
      class="track"
      class:wide={vdev.diskIds.length > 0 && !shared}
      class:empty={vdev.diskIds.length === 0}
    >
      {#each vdev.diskIds as diskId (diskId)}
        <Station {diskId} onLine label={shared ? bayLabel(store.plan.host, diskId) : undefined} />
      {/each}
      {#if vdev.diskIds.length === 0}
        <span class="empty-line"></span>
        <span class="placeholder">Drop disks here</span>
      {/if}
    </div>
    <div class="meta">
      <select bind:value={vdev.type} aria-label="{code} layout" title="Layout of this vdev">
        {#each types as type (type)}
          <option value={type} disabled={type === 'disk' && vdev.diskIds.length > 1}>
            {TYPE_LABEL[type]}
          </option>
        {/each}
      </select>
      <span>{sizeText}</span>
      <span class="tolerance" class:none={valid && tolerance === 0} class:short={!valid}>
        {#if !valid}needs {missing} more {missing === 1 ? 'disk' : 'disks'}
        {:else if tolerance === 0}no disk may fail
        {:else}any {tolerance} may fail{/if}
      </span>
    </div>
    {#if offer}
      <button
        class="hit"
        onclick={() => placePicked({ kind: 'vdev', vdevId: vdev.id })}
        aria-label="Place the selected disk in {code}"
      ></button>
    {/if}
    <button
      class="btn icon small quiet danger remove edit-only"
      onclick={() => removeVdev(store.pool, vdev.id)}
      aria-label="Remove {code}"
      title="Remove this vdev. Its disks go back to the free disks."
    >
      <Icon name="x" />
    </button>
  </div>
  {#if findings.length > 0}
    <Findings {findings} compact />
  {/if}
</div>

<style>
  .wrap {
    margin-bottom: 6px;
    transition: opacity 150ms ease-out;
  }

  .wrap.dim {
    opacity: 0.35;
  }

  /* One row: bullet and shared enclosure, the line on the row's centre, then layout, size and
     fault tolerance stacked, then the remove button. */
  .line {
    display: grid;
    position: relative;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    column-gap: 14px;
    padding: 8px 8px 8px 14px;
    border: 1px solid var(--rule);
    border-radius: 8px;
    background: var(--raise);
    transition:
      border-color 150ms ease-out,
      background-color 150ms ease-out;
  }

  .line:global([data-over]) {
    border-color: var(--line);
    background: color-mix(in srgb, var(--line) 12%, var(--raise));
  }

  .line[data-flag='issue'] {
    border-color: var(--issue);
  }

  .line[data-flag='warning'] {
    border-color: var(--warning);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  /* Trimmed to its capitals, so it sits on the bullet's centre. */
  .enclosure {
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    padding-top: var(--cap-nudge);
    color: var(--ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: grid;
    justify-items: end;
    gap: 1px;
    font-size: 12px;
    color: var(--ink-2);
    text-align: right;
  }

  .meta select {
    field-sizing: content;
    padding: 0;
    border: 0;
    background: transparent;
    font-weight: 700;
    font-size: 13px;
    color: var(--ink);
    text-align: right;
    cursor: pointer;
  }

  .meta select option {
    background: var(--raise);
    color: var(--ink);
  }

  /* Stations keep a fixed rhythm, so a line is as long as its vdev is wide. They shrink only
     when the row runs out of room; full enclosure names need wider stops. */
  /* The top padding equals the station names hanging below the dots (20px), so the line
     itself runs through the row's centre, level with the bullet. */
  .track {
    display: flex;
    min-width: 0;
    padding-top: 20px;
  }

  .track > :global(.station) {
    flex: 0 1 56px;
    min-width: 28px;
  }

  .track.wide > :global(.station) {
    flex-basis: 104px;
  }

  /* No names hang below an empty line, so it centres directly. */
  .track.empty {
    align-items: center;
    padding-top: 0;
  }

  .empty-line {
    width: 120px;
    border-top: 3px dashed color-mix(in srgb, var(--line) 60%, transparent);
  }

  .placeholder {
    margin-left: 10px;
    font-size: 12px;
    line-height: 18px;
    color: var(--ink-3);
  }

  .tolerance.none {
    color: var(--warning);
  }

  .tolerance.short {
    color: var(--ink-3);
  }

  .line.offer {
    border-color: var(--line);
  }

  .remove {
    opacity: 0;
    transition: opacity 150ms ease-out;
  }

  .line:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }
</style>
