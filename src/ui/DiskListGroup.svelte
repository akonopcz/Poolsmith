<script lang="ts">
  import type { Snippet } from 'svelte'
  import { canPlace, dropTarget, placePicked } from './dnd'
  import Station from './Station.svelte'
  import { store } from './store.svelte'

  let {
    role,
    title,
    intro,
    hint,
  }: { role: 'cache' | 'spare'; title: Snippet; intro: Snippet; hint: string } = $props()

  const diskIds = $derived(store.pool[role])
  const slot = $derived({ kind: role } as const)
  const offer = $derived(
    store.picked !== null && !diskIds.includes(store.picked) && canPlace(store.picked),
  )
  const dim = $derived(store.isDim(diskIds))
</script>

<section class="group" style:--line="var(--line-{role})" class:dim={diskIds.length > 0 && dim}>
  <div class="head">
    <h3>{@render title()}</h3>
    <p>{@render intro()}</p>
  </div>
  <div class="row" class:offer class:filled={diskIds.length > 0} use:dropTarget={slot}>
    <span class="bullet">{role === 'cache' ? 'C' : 'SP'}</span>
    {#if diskIds.length > 0}
      <span class="stations">
        {#each diskIds as diskId (diskId)}
          <Station {diskId} />
        {/each}
      </span>
    {/if}
    <span class="hint edit-only">{hint}</span>
    {#if offer}
      <button
        class="hit"
        onclick={() => placePicked(slot)}
        aria-label="Place the selected disk as {role === 'cache' ? 'cache device' : 'spare'}"
      ></button>
    {/if}
  </div>
</section>

<style>
  .group {
    margin-bottom: 22px;
    transition: opacity 150ms ease-out;
  }

  .group.dim {
    opacity: 0.35;
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  h3 {
    font-size: 15px;
    font-weight: 700;
  }

  .head p {
    font-size: 12px;
    color: var(--ink-3);
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 48px;
    padding: 8px 14px;
    border: 1.5px dashed var(--rule-strong);
    border-radius: 8px;
    background: transparent;
    text-align: left;
    color: var(--ink-3);
    font-size: 13px;
    transition:
      border-color 150ms ease-out,
      background-color 150ms ease-out;
  }

  .row.filled {
    border: 1px solid var(--rule);
    background: var(--raise);
  }

  .row:not(.filled) .bullet {
    background: transparent;
    color: var(--line);
    box-shadow: inset 0 0 0 2px var(--line);
  }

  .row.offer {
    border-color: var(--line);
    color: var(--ink);
  }

  .row:global([data-over]) {
    border-color: var(--line);
    background: color-mix(in srgb, var(--line) 12%, var(--raise));
  }

  .stations {
    display: flex;
    gap: 18px;
  }

  /* Left, next to the bullet, like the drop zones of the vdev groups. */
  .hint {
    font-size: 12px;
  }
</style>
