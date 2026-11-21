<script lang="ts">
  import { describeDisk } from '../core/describe'
  import { scale } from 'svelte/transition'
  import { endDrag, startDrag } from './dnd'
  import { stationName } from './labels'
  import { store } from './store.svelte'

  let {
    diskId,
    label,
    onLine = false,
  }: {
    diskId: string
    /** Text under the dot; the enclosure and bay when not given. */
    label?: string
    /** Draws the line segment to the neighbouring stations and rings the two ends. */
    onLine?: boolean
  } = $props()

  const picked = $derived(store.picked === diskId)
  const flag = $derived(store.flagged.get(diskId))
</script>

<button
  type="button"
  class="station"
  class:on-line={onLine}
  class:picked
  data-flag={flag}
  draggable="true"
  ondragstart={(e) => {
    e.stopPropagation()
    startDrag(e, diskId)
  }}
  ondragend={endDrag}
  onclick={(e) => {
    e.stopPropagation()
    store.editor = null
    store.picked = picked ? null : diskId
  }}
  onmouseenter={() => store.focusOn([diskId])}
  onmouseleave={() => store.focusOn(null)}
  onfocus={() => store.focusOn([diskId])}
  onblur={() => store.focusOn(null)}
  title={describeDisk(store.plan.host, diskId)}
  aria-pressed={picked}
  in:scale={{ duration: 180, start: 0.4 }}
>
  <span class="dot"></span>
  <span class="name">{label ?? stationName(store.plan.host, diskId)}</span>
</button>

<style>
  .station {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    min-width: 0;
  }

  /* Each station draws its share of the line: to both neighbours, half way at the ends, so the
     line runs from terminal to terminal like on a transit map. */
  .station.on-line::before {
    content: '';
    position: absolute;
    top: 7px;
    left: 0;
    right: 0;
    height: 5px;
    background: var(--line);
  }

  .station.on-line:first-child::before {
    left: 50%;
  }

  .station.on-line:last-child::before {
    right: 50%;
  }

  .dot {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--raise);
    border: 4px solid var(--line);
    transition: transform 150ms ease-out;
  }

  /* Terminals: a ring around the dot, as transit maps draw the ends of a line. */
  .on-line:first-child .dot,
  .on-line:last-child .dot {
    box-shadow:
      0 0 0 2px var(--raise),
      0 0 0 4px var(--line);
  }

  .station:hover .dot {
    transform: scale(1.15);
  }

  .station.picked .dot {
    background: var(--focus);
    border-color: var(--focus);
  }

  [data-flag='issue'] .dot {
    border-color: var(--issue);
  }

  .name {
    font-size: 11px;
    color: var(--ink-3);
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
