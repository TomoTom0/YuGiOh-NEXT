import { ref } from 'vue'
import type { DropPosition } from '../../utils/drag-data'

export function useDragQuarter() {
  const isDragOver = ref(false)
  const dragQuarter = ref<DropPosition | null>(null)

  function handleDragOver(event: Event) {
    isDragOver.value = true
    if (!(event instanceof DragEvent) || !(event.currentTarget instanceof HTMLElement)) return
    const rect = event.currentTarget.getBoundingClientRect()
    dragQuarter.value = {
      isRight: event.clientX >= rect.left + rect.width / 2,
      isTop: event.clientY < rect.top + rect.height / 2,
    }
  }

  function handleDragLeave(event: Event) {
    if (!(event instanceof DragEvent)) return
    const related = event.relatedTarget as HTMLElement | null
    const target = event.currentTarget as HTMLElement
    if (!related || !target.contains(related)) {
      isDragOver.value = false
      dragQuarter.value = null
    }
  }

  function getDropPos(): DropPosition {
    return dragQuarter.value ?? { isRight: true, isTop: true }
  }

  function reset() {
    isDragOver.value = false
    dragQuarter.value = null
  }

  return { isDragOver, dragQuarter, handleDragOver, handleDragLeave, getDropPos, reset }
}
