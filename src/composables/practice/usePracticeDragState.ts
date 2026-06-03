import { ref } from 'vue'
import type { CardOrientation } from '../../stores/practice'

const draggingCardId = ref<string | null>(null)
const draggingRotated = ref(false)
const draggingFaceDown = ref(false)
const draggingImageUrl = ref<string | null>(null)
const draggingPos = ref({ x: -9999, y: -9999 })
const draggingOffset = ref({ x: 0, y: 0 })
const draggingCardSize = ref({ width: 36, height: 53 })
const draggingStackTop = ref<boolean | null>(null)
// dragend後の右クリック回転が発生したか
const postDragRotation = ref(false)

let globalDragoverListener: ((e: DragEvent) => void) | null = null
let globalDragendListener: ((e: DragEvent) => void) | null = null
let keydownRotateListener: ((e: KeyboardEvent) => void) | null = null
let contextmenuListener: ((e: MouseEvent) => void) | null = null
let rotateTimeoutId: ReturnType<typeof setTimeout> | null = null

let lastAutoScrollTime = 0
function performAutoScroll(clientY: number) {
  const now = Date.now()
  if (now - lastAutoScrollTime < 50) return
  lastAutoScrollTime = now
  const containers = document.querySelectorAll<HTMLElement>('.practice-field-container')
  for (const el of containers) {
    const rect = el.getBoundingClientRect()
    const threshold = 80
    if (clientY > rect.bottom - threshold) {
      el.scrollTop += 8
    } else if (clientY < rect.top + threshold) {
      el.scrollTop -= 8
    }
  }
}

function cleanupContextmenuListener() {
  if (rotateTimeoutId !== null) {
    clearTimeout(rotateTimeoutId)
    rotateTimeoutId = null
  }
  if (contextmenuListener) {
    document.removeEventListener('contextmenu', contextmenuListener)
    contextmenuListener = null
  }
}

export function usePracticeDragState() {
  function startDrag(
    cardId: string,
    orientation: CardOrientation,
    imageUrl: string,
    offset: { x: number; y: number },
    cardSize: { width: number; height: number },
    onRightClick?: () => void,
  ) {
    draggingCardId.value = cardId
    draggingRotated.value = orientation === 'horizontal'
    draggingFaceDown.value = false
    draggingImageUrl.value = imageUrl
    draggingOffset.value = offset
    draggingCardSize.value = cardSize
    draggingPos.value = { x: -9999, y: -9999 }

    globalDragoverListener = (e: DragEvent) => {
      draggingPos.value = { x: e.clientX, y: e.clientY }
      performAutoScroll(e.clientY)
    }
    document.addEventListener('dragover', globalDragoverListener)

    globalDragendListener = () => {
      // Chrome fires contextmenu ~200ms after dragend on right-click.
      // Keep contextmenu listener alive to detect right-click rotation.
      // Self-remove to prevent double execution (component handler already called endDrag).
      if (globalDragendListener) {
        document.removeEventListener('dragend', globalDragendListener)
        globalDragendListener = null
      }
      if (onRightClick) {
        rotateTimeoutId = setTimeout(() => {
          cleanupContextmenuListener()
        }, 200)
      }
    }
    document.addEventListener('dragend', globalDragendListener)

    if (onRightClick) {
      contextmenuListener = (e: MouseEvent) => {
        e.preventDefault()
        if (rotateTimeoutId !== null) {
          // dragend後のcontextmenu検出
          clearTimeout(rotateTimeoutId)
          rotateTimeoutId = null
          postDragRotation.value = true
          cleanupContextmenuListener()
        } else if (draggingCardId.value !== null) {
          // drag中のcontextmenu（一部環境で発火する場合）
          onRightClick()
        }
      }
      document.addEventListener('contextmenu', contextmenuListener)

      keydownRotateListener = (e: KeyboardEvent) => {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault()
          onRightClick()
        }
      }
      document.addEventListener('keydown', keydownRotateListener)
    }
  }

  function toggleDragRotation() {
    if (draggingCardId.value !== null) {
      draggingRotated.value = !draggingRotated.value
    }
  }

  function setDraggingFaceDown(val: boolean) {
    draggingFaceDown.value = val
  }

  function setDraggingStackTop(val: boolean | null) {
    draggingStackTop.value = val
  }

  function clearDragCard() {
    draggingCardId.value = null
  }

  function endDrag() {
    draggingCardId.value = null
    draggingRotated.value = false
    draggingFaceDown.value = false
    draggingImageUrl.value = null
    draggingPos.value = { x: -9999, y: -9999 }
    draggingStackTop.value = null
    draggingCardSize.value = { width: 36, height: 53 }

    if (globalDragoverListener) {
      document.removeEventListener('dragover', globalDragoverListener)
      globalDragoverListener = null
    }
    if (globalDragendListener) {
      document.removeEventListener('dragend', globalDragendListener)
      globalDragendListener = null
    }
    if (keydownRotateListener) {
      document.removeEventListener('keydown', keydownRotateListener)
      keydownRotateListener = null
    }
    // 右クリック回転検出: dragend後にcontextmenuが発火する可能性があるため
    // タイムアウトを設定してcontextmenuリスナーを残す
    if (contextmenuListener) {
      rotateTimeoutId = setTimeout(() => {
        cleanupContextmenuListener()
      }, 250)
    }
  }

  return {
    draggingCardId,
    draggingRotated,
    draggingFaceDown,
    draggingImageUrl,
    draggingPos,
    draggingOffset,
    draggingCardSize,
    draggingStackTop,
    postDragRotation,
    startDrag,
    toggleDragRotation,
    setDraggingFaceDown,
    setDraggingStackTop,
    clearDragCard,
    endDrag,
  }
}
