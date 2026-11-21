<script lang="ts">
  import { hardwareColumnWidth } from './ui/bays'
  import EstimateBar from './ui/EstimateBar.svelte'
  import ExportView from './ui/ExportView.svelte'
  import Footer from './ui/Footer.svelte'
  import HardwarePanel from './ui/HardwarePanel.svelte'
  import PoolPanel from './ui/PoolPanel.svelte'
  import { store } from './ui/store.svelte'
  import TopBar from './ui/TopBar.svelte'

  $effect(() => {
    document.documentElement.dataset.theme = store.theme
  })

  const WIDTH_KEY = 'poolsmith-hardware-width'
  const MIN_HARDWARE = 340
  const MIN_POOL = 480

  let windowWidth = $state(1440)
  // Hardware gets what its enclosures need, at most half the window; the pool takes the rest.
  const autoWidth = $derived(
    hardwareColumnWidth(store.plan.host.enclosures, Math.floor(windowWidth / 2)),
  )
  // A width the user dragged to wins over the automatic one until they double-click the divider.
  let manualWidth = $state<number | null>(loadWidth())
  const maxWidth = $derived(Math.max(MIN_HARDWARE, windowWidth - MIN_POOL))
  const hardwareWidth = $derived(
    Math.round(Math.min(maxWidth, Math.max(MIN_HARDWARE, manualWidth ?? autoWidth))),
  )

  function loadWidth(): number | null {
    try {
      const value = Number(localStorage.getItem(WIDTH_KEY))
      return value > 0 ? value : null
    } catch {
      return null
    }
  }

  function setWidth(width: number | null) {
    manualWidth = width === null ? null : Math.min(maxWidth, Math.max(MIN_HARDWARE, width))
    try {
      if (manualWidth === null) localStorage.removeItem(WIDTH_KEY)
      else localStorage.setItem(WIDTH_KEY, String(manualWidth))
    } catch {
      // Blocked storage: the width lasts for this visit only.
    }
  }

  let drag: { x: number; width: number } | null = null

  function dragStart(event: PointerEvent) {
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    drag = { x: event.clientX, width: hardwareWidth }
  }

  function dragMove(event: PointerEvent) {
    if (drag !== null) setWidth(drag.width + event.clientX - drag.x)
  }

  function splitterKey(event: KeyboardEvent) {
    const step = event.shiftKey ? 64 : 16
    if (event.key === 'ArrowLeft') setWidth(hardwareWidth - step)
    else if (event.key === 'ArrowRight') setWidth(hardwareWidth + step)
    else if (event.key === 'Home' || event.key === 'Enter') setWidth(null)
    else return
    event.preventDefault()
  }

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (store.editor !== null) store.editor = null
    else store.picked = null
  }
</script>

<svelte:window onkeydown={keydown} bind:innerWidth={windowWidth} />

<TopBar />
{#if store.view === 'plan'}
  <main
    class="planner"
    class:picking={store.picked !== null}
    style:--hardware-width="{hardwareWidth}px"
  >
    <EstimateBar />
    <HardwarePanel />
    <PoolPanel />
    <!-- A focusable separator is the ARIA window splitter pattern; Svelte counts it as static. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="splitter"
      class:manual={manualWidth !== null}
      role="separator"
      aria-orientation="vertical"
      aria-label="Width of the hardware column"
      aria-valuemin={MIN_HARDWARE}
      aria-valuemax={maxWidth}
      aria-valuenow={hardwareWidth}
      tabindex="0"
      title="Drag to resize. Double-click to fit the enclosures again."
      onpointerdown={dragStart}
      onpointermove={dragMove}
      onpointerup={() => (drag = null)}
      onpointercancel={() => (drag = null)}
      ondblclick={() => setWidth(null)}
      onkeydown={splitterKey}
    ></div>
  </main>
{:else}
  <ExportView />
{/if}
<Footer />

<style>
  .planner {
    display: grid;
    /* The estimate bar spans both columns above them. */
    grid-template-columns: var(--hardware-width) minmax(480px, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: calc(100vh - var(--header-height) - var(--footer-height));
  }

  /* Placed explicitly, because the splitter also claims a cell in the first column. */
  .planner > :global(.hardware) {
    grid-row: 2;
    grid-column: 1;
  }

  .planner > :global(.pool) {
    grid-row: 2;
    grid-column: 2;
  }

  /* Sits on the border between hardware and pool; the visible line appears on hover and focus. */
  .splitter {
    grid-row: 2;
    grid-column: 1;
    justify-self: end;
    position: relative;
    z-index: 3;
    width: 11px;
    margin-right: -6px;
    cursor: col-resize;
    touch-action: none;
  }

  .splitter::after {
    content: '';
    position: absolute;
    inset: 0 4px;
    background: var(--focus);
    opacity: 0;
    transition: opacity 150ms ease-out;
  }

  .splitter:hover::after,
  .splitter:focus-visible::after,
  .splitter:active::after {
    opacity: 0.6;
  }

  .splitter:focus-visible {
    outline: none;
  }

  /* Small screens show the plan for reading. Editing stays a desktop task. */
  @media (max-width: 900px) {
    .planner {
      grid-template-columns: 1fr;
      height: auto;
    }

    .splitter {
      display: none;
    }

    .planner > :global(.hardware),
    .planner > :global(.pool) {
      grid-row: auto;
      grid-column: auto;
    }

    .planner > :global(*) {
      overflow: visible;
      border: 0;
      border-bottom: 1px solid var(--rule);
    }
  }
</style>
