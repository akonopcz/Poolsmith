<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { VdevType } from '../core/zfs/model'
  import { canPlace, dropTarget, placePicked } from './dnd'
  import { addEmptyVdev, type VdevGroup } from '../core/edit'
  import Icon from './Icon.svelte'
  import { vdevCodes } from '../core/zfs/codes'
  import { TYPE_LABEL } from './labels'
  import { store } from './store.svelte'
  import VdevLine from './VdevLine.svelte'

  let {
    group,
    title,
    intro,
    types,
    addTypes,
    singleHint,
  }: {
    group: VdevGroup
    title: Snippet
    intro: Snippet
    types: VdevType[]
    addTypes: VdevType[]
    singleHint: string
  } = $props()

  const vdevs = $derived(store.pool[group])
  const codes = $derived(vdevCodes(store.pool))
  const single = $derived({ kind: 'new-vdev', group, type: 'disk' } as const)
  const offer = $derived(store.picked !== null && canPlace(store.picked))
</script>

<section class="group" style:--line="var(--line-{group})">
  <div class="head">
    <h3>{@render title()}</h3>
    <p>{@render intro()}</p>
  </div>

  {#each vdevs as vdev (vdev.id)}
    <VdevLine {vdev} {group} code={codes.get(vdev.id)!} {types} />
  {/each}

  <div class="add edit-only">
    {#each addTypes as type (type)}
      <button class="btn small" onclick={() => addEmptyVdev(store.plan, store.pool, group, type)}>
        <Icon name="plus" />{TYPE_LABEL[type]}
      </button>
    {/each}
    <div class="drop" class:offer use:dropTarget={single}>
      <span>{singleHint}</span>
      {#if offer}
        <button
          class="hit"
          onclick={() => placePicked(single)}
          aria-label="Place the selected disk as a single-disk vdev"
        ></button>
      {/if}
    </div>
  </div>
</section>

<style>
  .group {
    margin-bottom: 22px;
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

  .add {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: stretch;
  }

  .drop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex: 1;
    min-width: 200px;
    position: relative;
    min-height: 28px;
    padding: 4px 12px;
    border: 1.5px dashed var(--rule-strong);
    border-radius: 6px;
    background: transparent;
    color: var(--ink-3);
    font-size: 12px;
    transition:
      border-color 150ms ease-out,
      background-color 150ms ease-out;
  }

  /* Add buttons grow with the drop zone when its text wraps, so the row stays one height. */
  .add > .btn {
    height: auto;
    min-height: 28px;
  }

  .drop.offer,
  .drop:global([data-over]) {
    border-color: var(--line);
    color: var(--ink);
  }

  .drop:global([data-over]) {
    background: color-mix(in srgb, var(--line) 12%, transparent);
  }
</style>
