<script lang="ts">
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

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (store.editor !== null) store.editor = null
    else store.picked = null
  }
</script>

<svelte:window onkeydown={keydown} />

<TopBar />
{#if store.view === 'plan'}
  <main class="planner" class:picking={store.picked !== null}>
    <EstimateBar />
    <HardwarePanel />
    <PoolPanel />
  </main>
{:else}
  <ExportView />
{/if}
<Footer />

<style>
  .planner {
    display: grid;
    /* Hardware and pool share the width; the estimate bar spans both above them. */
    grid-template-columns: minmax(320px, 2fr) minmax(480px, 3fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: calc(100vh - var(--header-height) - var(--footer-height));
  }

  /* Small screens show the plan for reading. Editing stays a desktop task. */
  @media (max-width: 900px) {
    .planner {
      grid-template-columns: 1fr;
      height: auto;
    }

    .planner > :global(*) {
      overflow: visible;
      border: 0;
      border-bottom: 1px solid var(--rule);
    }
  }
</style>
