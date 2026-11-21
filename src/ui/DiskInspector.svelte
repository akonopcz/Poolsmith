<script lang="ts">
  import { describeDisk } from '../core/describe'
  import { place } from './dnd'
  import Icon from './Icon.svelte'
  import { diskPlace, TYPE_LABEL } from './labels'
  import { store } from './store.svelte'

  let { diskId }: { diskId: string } = $props()

  const where = $derived(diskPlace(store.pool, diskId))
  const vdev = $derived(
    where?.vdevId
      ? [...store.pool.data, ...store.pool.special, ...store.pool.log].find(
          (v) => v.id === where.vdevId,
        )
      : undefined,
  )
</script>

<div class="inspector">
  <div class="top">
    <h3>{describeDisk(store.plan.host, diskId)}</h3>
    <button
      class="btn icon small quiet"
      onclick={() => (store.picked = null)}
      aria-label="Deselect"
    >
      <Icon name="x" />
    </button>
  </div>
  <p class="where">
    {#if where}
      <span class="bullet" style:--line="var(--line-{where.role})">{where.code}</span>
      {where.role === 'cache'
        ? 'Cache device'
        : where.role === 'spare'
          ? 'Spare'
          : `${where.role} vdev, ${TYPE_LABEL[vdev!.type]}`} in {store.pool.name}
    {:else}
      Not in a pool yet.
    {/if}
  </p>
  <p class="hint">Click a line or a drop zone in the pool to place this disk. Esc cancels.</p>
  <div class="buttons">
    <button class="btn small" onclick={() => (store.editor = { mode: 'edit', diskId })}>
      <Icon name="edit" />Edit
    </button>
    {#if where}
      <button class="btn small" onclick={() => place(diskId, { kind: 'out' })}>
        Take out of pool
      </button>
    {/if}
  </div>
</div>

<style>
  .inspector {
    display: grid;
    gap: 8px;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  h3 {
    font-size: 14px;
    font-weight: 700;
  }

  .where {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--ink-2);
  }

  .hint {
    font-size: 12px;
    color: var(--ink-3);
  }

  .buttons {
    display: flex;
    gap: 6px;
  }
</style>
