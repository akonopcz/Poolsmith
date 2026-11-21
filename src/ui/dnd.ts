import type { Action } from 'svelte/action'
import { moveDiskToBay, moveEnclosure, placeDisk, unassignDisk, type Slot } from '../core/edit'
import { poolOfDisk } from './labels'
import { store } from './store.svelte'

const DISK = 'application/x-poolsmith-disk'
const ENCLOSURE = 'application/x-poolsmith-enclosure'

/** A disk can go into the pool in view unless another pool already uses it. */
export function canPlace(diskId: string): boolean {
  const owner = poolOfDisk(store.plan, diskId)
  return owner === undefined || owner === store.pool
}

/** A slot in the pool, or `out` to take the disk out of the pool again. */
export type Target = Slot | { kind: 'out' }

export function place(diskId: string, target: Target): void {
  if (!canPlace(diskId)) return
  if (target.kind === 'out') unassignDisk(store.pool, diskId)
  else placeDisk(store.plan, store.pool, diskId, target)
  store.picked = null
}

/** Places the disk picked by click, if any. Returns whether it did. */
export function placePicked(slot: Target): boolean {
  if (store.picked === null) return false
  place(store.picked, slot)
  return true
}

/**
 * Starts dragging a disk. `from` decides what a drop on the hardware means: a disk dragged from
 * a bay moves to another bay, a disk dragged off a pool line leaves the pool.
 */
export function startDrag(event: DragEvent, diskId: string, from: 'hardware' | 'pool'): void {
  if (event.dataTransfer === null) return
  event.dataTransfer.setData(DISK, diskId)
  event.dataTransfer.setData('text/plain', diskId)
  event.dataTransfer.effectAllowed = 'move'
  store.dragging = { diskId, from }
  store.picked = null
}

export function startEnclosureDrag(event: DragEvent, enclosureId: string): void {
  if (event.dataTransfer === null) return
  event.dataTransfer.setData(ENCLOSURE, enclosureId)
  event.dataTransfer.effectAllowed = 'move'
  store.draggingEnclosure = enclosureId
}

export function endDrag(): void {
  store.dragging = null
  store.draggingEnclosure = null
}

/**
 * Wires the drag events of a drop zone. Sets `data-over` while an accepted item hovers above
 * it and stops the drop from reaching drop zones around it.
 */
function droppable(
  node: HTMLElement,
  type: string,
  accepts: () => boolean,
  drop: (id: string) => void,
): () => void {
  let depth = 0
  const ok = (event: DragEvent) => event.dataTransfer?.types.includes(type) === true && accepts()

  function onEnter(event: DragEvent) {
    if (!ok(event)) return
    depth++
    node.dataset.over = ''
  }
  function onOver(event: DragEvent) {
    if (!ok(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
  function onLeave() {
    depth = Math.max(0, depth - 1)
    if (depth === 0) delete node.dataset.over
  }
  function onDrop(event: DragEvent) {
    depth = 0
    delete node.dataset.over
    if (!ok(event)) return
    const id = event.dataTransfer?.getData(type)
    if (!id) return
    event.preventDefault()
    event.stopPropagation()
    drop(id)
    endDrag()
  }

  node.addEventListener('dragenter', onEnter)
  node.addEventListener('dragover', onOver)
  node.addEventListener('dragleave', onLeave)
  node.addEventListener('drop', onDrop)
  return () => {
    node.removeEventListener('dragenter', onEnter)
    node.removeEventListener('dragover', onOver)
    node.removeEventListener('dragleave', onLeave)
    node.removeEventListener('drop', onDrop)
  }
}

/** A slot of the pool in view, or `out` on the hardware column for disks dragged off a line. */
export const dropTarget: Action<HTMLElement, Target> = (node, initial) => {
  let target = initial
  const destroy = droppable(
    node,
    DISK,
    () =>
      store.dragging !== null &&
      canPlace(store.dragging.diskId) &&
      (target.kind !== 'out' || store.dragging.from === 'pool'),
    (diskId) => place(diskId, target),
  )
  return {
    update(next) {
      target = next
    },
    destroy,
  }
}

/** A bay, or `null` for "no bay", taking disks dragged from another bay. */
export const bayTarget: Action<HTMLElement, string | null> = (node, initial) => {
  let bayId = initial
  const destroy = droppable(
    node,
    DISK,
    () => store.dragging?.from === 'hardware',
    (diskId) => moveDiskToBay(store.plan, diskId, bayId),
  )
  return {
    update(next) {
      bayId = next
    },
    destroy,
  }
}

/** An enclosure that takes another enclosure dropped on it into its position. */
export const enclosureTarget: Action<HTMLElement, string> = (node, initial) => {
  let enclosureId = initial
  const destroy = droppable(
    node,
    ENCLOSURE,
    () => store.draggingEnclosure !== null && store.draggingEnclosure !== enclosureId,
    (dragged) => {
      const index = store.plan.host.enclosures.findIndex((e) => e.id === enclosureId)
      moveEnclosure(store.plan, dragged, index)
    },
  )
  return {
    update(next) {
      enclosureId = next
    },
    destroy,
  }
}
