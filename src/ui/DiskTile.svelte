<script lang="ts">
  import { describeDisk } from '../core/describe'
  import { formatDecimal } from '../core/format'
  import { canPlace, endDrag, startDrag } from './dnd'
  import { diskPlace, poolOfDisk } from './labels'
  import { store } from './store.svelte'

  let { diskId, bayLabel }: { diskId: string; bayLabel?: string } = $props()

  const disk = $derived(store.disks.find((d) => d.id === diskId)!)
  const size = $derived(formatDecimal(disk.sizeBytes).split(' '))
  const owner = $derived(poolOfDisk(store.plan, diskId))
  const place = $derived(owner ? diskPlace(owner, diskId) : undefined)
  // Disks of every pool keep their code; those of the other pools show it as an outline.
  const active = $derived(owner !== undefined && owner === store.pool)
  const letter = $derived(owner ? store.letters.get(owner.id) : '')
  const taken = $derived(!canPlace(diskId))
  const flag = $derived(store.flagged.get(diskId))
  const dim = $derived(store.isDim([diskId]))
  const picked = $derived(store.picked === diskId)

  function click() {
    if (taken) return
    store.editor = null
    store.picked = picked ? null : diskId
  }
</script>

<button
  type="button"
  class="disk"
  class:placed={active}
  class:taken
  class:dim
  class:picked
  class:dragging={store.dragging === diskId}
  data-flag={flag}
  data-part={diskId}
  style:--line={place ? `var(--line-${place.role})` : undefined}
  draggable={!taken}
  ondragstart={(e) => startDrag(e, diskId)}
  ondragend={endDrag}
  onclick={click}
  onmouseenter={() => store.focusOn([diskId])}
  onmouseleave={() => store.focusOn(null)}
  onfocus={() => store.focusOn([diskId])}
  onblur={() => store.focusOn(null)}
  title={describeDisk(store.plan.host, diskId) + (owner ? ` · pool ${owner.name}` : '')}
  aria-pressed={picked}
>
  <span class="head">
    <span class="bay">{bayLabel ?? ''}</span>
    {#if place}
      <span class="bullet" class:other={!active} aria-label="Pool {letter}, {place.code}">
        <span class="pool-letter">{letter}</span>{place.code}
      </span>
    {/if}
  </span>
  <span class="size">
    <span>{size[0]}</span>
    <span class="unit">{size[1]}</span>
  </span>
  <span class="type">{disk.type.toUpperCase()}</span>
  {#if flag}<span class="flag" aria-label={flag}></span>{/if}
</button>

<style>
  .disk {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    height: 100%;
    min-height: 56px;
    padding: 4px 3px;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    background: var(--bay-full);
    text-align: left;
    cursor: grab;
    transition:
      opacity 150ms ease-out,
      border-color 150ms ease-out,
      transform 150ms ease-out;
  }

  .disk:hover {
    border-color: var(--ink-3);
  }

  .disk.placed {
    border-color: color-mix(in srgb, var(--line) 55%, var(--rule-strong));
  }

  .disk.picked {
    border-color: var(--focus);
    box-shadow: 0 0 0 1px var(--focus);
  }

  .disk.dragging {
    opacity: 0.4;
  }

  .disk.taken {
    cursor: not-allowed;
    background: transparent;
    border-style: dashed;
  }

  .disk.dim {
    opacity: 0.35;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    margin-bottom: auto;
  }

  .bay {
    font-size: 10px;
    line-height: 16px;
    color: var(--ink-3);
  }

  /* Compact enough that bay number and a two-character code share one row in an SFF bay. */
  .bullet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    height: 16px;
    padding: var(--cap-nudge) 2px 0;
    font-size: 9px;
    letter-spacing: 0;
  }

  /* Narrow SFF bays put the unit under the number instead of clipping "300 GB". */
  /* Lighter than the code, so "A" and "D1" read apart without a separator taking width. */
  .pool-letter {
    margin-right: 0.5px;
    font-weight: 500;
    opacity: 0.75;
  }

  .bullet.other {
    background: transparent;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1.5px var(--line);
  }

  .size {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 3px;
    font-weight: 700;
    font-size: 12px;
    line-height: 1.2;
  }

  .unit {
    font-size: 10px;
    font-weight: 600;
  }

  .type {
    font-size: 10px;
    color: var(--ink-2);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flag {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--warning);
  }

  [data-flag='issue'] .flag {
    background: var(--issue);
  }

  [data-flag='info'] .flag {
    background: var(--info);
  }

  .disk[data-flag='issue'] {
    border-color: var(--issue);
  }

  .disk[data-flag='warning'] {
    border-color: var(--warning);
  }
</style>
