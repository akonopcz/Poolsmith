<script lang="ts">
  import ExportView from './ui/ExportView.svelte'
  import Footer from './ui/Footer.svelte'
  import HardwarePanel from './ui/HardwarePanel.svelte'
  import PoolPanel from './ui/PoolPanel.svelte'
  import ResultsPanel from './ui/ResultsPanel.svelte'
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
    <HardwarePanel />
    <PoolPanel />
    <ResultsPanel />
  </main>
{:else}
  <ExportView />
{/if}
<Footer />

<style>
  .planner {
    display: grid;
    grid-template-columns: minmax(320px, 372px) minmax(0, 1fr) minmax(300px, 360px);
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

    .planner > :global(.results) {
      order: -1;
    }
  }
</style>
