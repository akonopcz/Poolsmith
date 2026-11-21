import type { Action } from 'svelte/action'
import { placeDisk, unassignDisk, type Slot } from './edits'
import { poolOfDisk } from './labels'
import { store } from './store.svelte'

const TYPE = 'application/x-poolsmith-disk'

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

export function startDrag(event: DragEvent, diskId: string): void {
  if (event.dataTransfer === null) return
  event.dataTransfer.setData(TYPE, diskId)
  event.dataTransfer.setData('text/plain', diskId)
  event.dataTransfer.effectAllowed = 'move'
  store.dragging = diskId
  store.picked = null
}

export function endDrag(): void {
  store.dragging = null
}

/** Makes an element accept dropped disks. Sets `data-over` while a disk hovers above it. */
export const dropTarget: Action<HTMLElement, Target> = (node, initial) => {
  let slot = initial
  let depth = 0

  const accepts = (event: DragEvent) =>
    event.dataTransfer?.types.includes(TYPE) === true &&
    store.dragging !== null &&
    canPlace(store.dragging)

  function enter(event: DragEvent) {
    if (!accepts(event)) return
    depth++
    node.dataset.over = ''
  }
  function over(event: DragEvent) {
    if (!accepts(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
  function leave() {
    depth = Math.max(0, depth - 1)
    if (depth === 0) delete node.dataset.over
  }
  function drop(event: DragEvent) {
    depth = 0
    delete node.dataset.over
    const diskId = event.dataTransfer?.getData(TYPE)
    if (!diskId) return
    event.preventDefault()
    event.stopPropagation()
    place(diskId, slot)
    store.dragging = null
  }

  node.addEventListener('dragenter', enter)
  node.addEventListener('dragover', over)
  node.addEventListener('dragleave', leave)
  node.addEventListener('drop', drop)
  return {
    update(next) {
      slot = next
    },
    destroy() {
      node.removeEventListener('dragenter', enter)
      node.removeEventListener('dragover', over)
      node.removeEventListener('dragleave', leave)
      node.removeEventListener('drop', drop)
    },
  }
}
