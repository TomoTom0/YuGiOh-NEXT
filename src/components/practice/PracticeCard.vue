<template>
  <div
    class="ygo-next practice-card"
    :data-card-id="card.id"
    :class="{
      'face-down': card.face === 'down' && !forceReveal && (zone === 'deck' || zone === 'extra'),
      'face-down-field': card.face === 'down' && !forceReveal && zone !== 'deck' && zone !== 'extra',
      'horizontal': card.orientation === 'horizontal',
      'is-dragging': isDragging,
    }"
    :draggable="true"
    @click="$emit('click', card)"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <img
      v-if="card.face === 'up' || forceReveal"
      :src="imageUrl"
      alt="card"
      class="practice-card-image"
      draggable="false"
    >
    <template v-else-if="zone === 'deck' || zone === 'extra'">
      <img
        :src="backImageUrl"
        alt="card back"
        class="practice-card-image"
        draggable="false"
      >
    </template>
    <template v-else>
      <img
        :src="imageUrl"
        alt="card"
        class="practice-card-image"
        draggable="false"
      >
      <img
        v-if="imageUrl !== backImageUrl"
        :src="backImageUrl"
        alt="card back"
        class="practice-card-image practice-card-facedown-top"
        draggable="false"
      >
    </template>
    <div v-if="!isFaceDown" class="card-controls">
      <button class="card-btn top-left" @click.stop="showCardDetail">
        <span class="btn-text">ⓘ</span>
      </button>
    </div>
    <div v-if="showActions && hovered && !isFaceDown" class="card-actions-overlay">
      <template v-for="(action, idx) in actions" :key="idx">
        <button
          v-if="action"
          class="card-action-btn"
          :title="action.title"
          @mousedown.stop
          @click.stop="$emit('action', action.key, card.id)"
        >
          <svg width="10" height="10" viewBox="0 0 24 24">
            <path fill="currentColor" :d="action.icon" />
          </svg>
        </button>
        <div v-else class="card-action-empty" />
      </template>
    </div>
    <div v-if="isDragging && canRotate" class="drag-rotate-indicator" :class="{ 'is-rotated': draggingRotated }" />
    <div v-if="isDragging" class="drag-facedown-indicator" :class="{ 'is-facedown': draggingFaceDown }" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import { getUnifiedCacheDB } from '../../utils/unified-cache-db'
import { detectCardGameType } from '../../utils/page-detector'
import { getCardImageUrl } from '../../types/card'
import { isDragEvent, setDragData } from '../../utils/drag-data'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'
import { usePracticeActions } from '../../composables/practice/usePracticeActions'
import { useCardDetailDisplay } from '../../composables/useCardDetailDisplay'

const props = withDefaults(defineProps<{
  card: PracticeCard
  forceReveal?: boolean
  zone?: ZoneType
  slotIndex?: number
  showActions?: boolean
}>(), {
  showActions: true,
})

const emit = defineEmits<{
  click: [card: PracticeCard]
  action: [action: string, cardId: string]
  dragstart: [card: PracticeCard, event: DragEvent]
  dragend: []
}>()

const hovered = ref(false)
const { showCardDetail: showDetail } = useCardDetailDisplay()
const { startDrag, toggleDragRotation, endDrag, draggingRotated, draggingFaceDown, draggingCardId, postDragRotation } = usePracticeDragState()
const { getAvailableActions } = usePracticeActions()
const isDragging = computed(() => draggingCardId.value === props.card.id)

let dragStartedHorizontal = false

const isFaceDown = computed(() =>
  props.card.face === 'down' && !props.forceReveal && (props.zone === 'deck' || props.zone === 'extra')
)

const cardInfo = computed(() => getUnifiedCacheDB().getCardInfo(props.card.cid) ?? null)
const isExtraCard = computed(() =>
  cardInfo.value?.cardType === 'monster' && !!cardInfo.value?.isExtraDeck
)

// rotate可能なzone（墓地・除外・デッキ・エクストラデッキ・手札以外）
const canRotate = computed(() => {
  const noRotateZones = new Set<ZoneType>(['gy', 'banish', 'deck', 'extra', 'hand'])
  return !!props.zone && !noRotateZones.has(props.zone)
})

// 全zoneで共通の6スロット（null = 空きスペース）
const actions = computed(() => {
  if (!props.zone) return [null, null, null, null, null, null]
  return getAvailableActions(props.zone, props.card)
})

const backImageUrl = chrome.runtime.getURL('images/card_back.png')

const imageUrl = computed(() => {
  const unifiedDB = getUnifiedCacheDB()
  const cardInfo = unifiedDB.getCardInfo(props.card.cid)
  if (!cardInfo) return backImageUrl

  const gameType = detectCardGameType()
  return getCardImageUrl(cardInfo, gameType, props.card.ciid) ?? backImageUrl
})

function showCardDetail() {
  showDetail(props.card.cid)
}

function handleDragStart(event: Event) {
  if (!isDragEvent(event) || !event.dataTransfer) return

  const emptyImg = new Image()
  emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  event.dataTransfer.setDragImage(emptyImg, 0, 0)

  event.dataTransfer.effectAllowed = 'move'
  setDragData(event, {
    cardId: props.card.id,
    zone: props.zone,
    slotIndex: props.slotIndex,
  })
  dragStartedHorizontal = props.card.orientation === 'horizontal'

  const onRightClick = canRotate.value ? () => { toggleDragRotation() } : undefined
  startDrag(props.card.id, props.card.orientation, imageUrl.value, offset, onRightClick)

  emit('dragstart', props.card, event)
}

function handleDragEnd() {
  const wasRotated = draggingRotated.value
  endDrag()

  if (canRotate.value && wasRotated !== dragStartedHorizontal) {
    emit('action', 'toggleOrientation', props.card.id)
  }

  // dragend後の右クリック回転検出
  if (canRotate.value) {
    setTimeout(() => {
      if (postDragRotation.value) {
        postDragRotation.value = false
        emit('action', 'toggleOrientation', props.card.id)
      }
    }, 250)
  }

  emit('dragend')
}

function handleContextMenu(event: Event) {
  event.preventDefault()
  if (isDragging.value && canRotate.value) {
    toggleDragRotation()
  } else if (!isDragging.value && canRotate.value) {
    emit('action', 'toggleOrientation', props.card.id)
  }
}
</script>

<style scoped lang="scss">
.practice-card {
  position: relative;
  width: var(--practice-card-width, 75px);
  height: var(--practice-card-height, 110px);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  direction: ltr;
  transition: transform 0.15s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    z-index: 1;
  }
}

.practice-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
}

.face-down {
  opacity: 1;
}

.practice-card-facedown-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.horizontal {
  transform: rotate(-90deg);
  transform-origin: center center;

  &:hover {
    transform: rotate(-90deg) translateX(-2px);
  }
}

.is-dragging {
  opacity: 0;
}

.card-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 4;
}

.practice-card:hover .card-controls {
  opacity: 1;
}

.card-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  color: var(--button-text);
  font-weight: bold;
  position: relative;

  &.top-left {
    grid-column: 1;
    grid-row: 1;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 2px 0 0 2px;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-top-left-bg);
      transition: background 0.15s;
      pointer-events: none;
    }

    &:hover::before {
      background: var(--deck-card-btn-top-left-hover-bg);
      border: 1px solid var(--deck-card-btn-top-left-hover-border);
    }
  }

  .btn-text {
    position: relative;
    z-index: 1;
    font-size: 10px;
  }
}

.card-actions-overlay {
  position: absolute;
  bottom: 1px;
  left: 1px;
  display: grid;
  grid-template-columns: repeat(2, 16px);
  gap: 1px;
  z-index: 5;
}

.card-action-btn {
  padding: 1px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(25, 118, 210, 0.9);
  }

  svg {
    display: block;
  }
}

.card-action-empty {
  width: 14px;
  height: 14px;
}

.drag-rotate-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 200, 0, 0.85);
  pointer-events: none;
  z-index: 6;

  &.is-rotated {
    background: rgba(0, 200, 100, 0.85);
  }
}

.drag-facedown-indicator {
  position: absolute;
  top: 2px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(160, 160, 160, 0.5);
  pointer-events: none;
  z-index: 6;

  &.is-facedown {
    background: rgba(30, 30, 200, 0.85);
  }
}
</style>
