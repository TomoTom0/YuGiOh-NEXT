<template>
  <div
    class="ygo-next practice-card"
    :data-card-id="card.id"
    :class="{
      'face-down': card.face === 'down' && !forceReveal && (zone === 'deck' || zone === 'extra'),
      'face-down-transparent': card.face === 'down' && !forceReveal && zone !== 'deck' && zone !== 'extra',
      'horizontal': card.orientation === 'horizontal',
      'drag-over': isDragOver,
    }"
    :draggable="true"
    @click="$emit('click', card)"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.stop="handleDrop"
  >
    <img
      v-if="card.face === 'up' || forceReveal || (zone !== 'deck' && zone !== 'extra')"
      :src="imageUrl"
      alt="card"
      class="practice-card-image"
      draggable="false"
    >
    <img
      v-else
      :src="backImageUrl"
      alt="card back"
      class="practice-card-image"
      draggable="false"
    >
    <div class="info-area" @click.stop="openCardInfo">
      <button class="info-btn" title="Card Info">
        <svg width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
        </svg>
      </button>
    </div>
    <div v-if="showActions && hovered" class="card-actions-overlay">
      <button
        v-for="action in actions"
        :key="action.key"
        class="card-action-btn"
        :title="action.title"
        @mousedown.stop
        @click.stop="$emit('action', action.key, card.id)"
      >
        <svg width="10" height="10" viewBox="0 0 24 24">
          <path fill="currentColor" :d="action.icon" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import { getUnifiedCacheDB } from '../../utils/unified-cache-db'
import { detectCardGameType } from '../../utils/page-detector'
import {
  mdiArrowCollapseDown,
  mdiArrowCollapseUp,
  mdiArrowUp,
  mdiGraveStone,
  mdiHandBackRight,
  mdiMinusCircle,
  mdiPackageVariant,
  mdiRotateRight,
  mdiEyeOff,
} from '@mdi/js'

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
  drop: [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined]
}>()

const hovered = ref(false)
const isDragOver = ref(false)

const actions = computed(() => {
  if (!props.zone) return []
  switch (props.zone) {
    case 'deck':
      return [
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle },
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
      ]
    case 'hand':
      return [
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
        { key: 'moveToTemp', title: 'Temp', icon: mdiPackageVariant },
      ]
    case 'monster':
    case 'spellTrap':
      return [
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
        { key: 'toggleFace', title: 'Face', icon: mdiEyeOff },
        { key: 'toggleOrientation', title: 'Rotate', icon: mdiRotateRight },
      ]
    case 'gy':
      return [
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
        { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
      ]
    case 'banish':
      return [
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
      ]
    case 'extra':
      return [
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
      ]
    case 'field':
      return [
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToDeckTop', title: 'Deck Top', icon: mdiArrowCollapseUp },
        { key: 'moveToDeckBottom', title: 'Deck Bot', icon: mdiArrowCollapseDown },
      ]
    case 'temp':
      return [
        { key: 'moveToHand', title: 'Hand', icon: mdiHandBackRight },
        { key: 'moveToGY', title: 'GY', icon: mdiGraveStone },
        { key: 'moveToBanish', title: 'Banish', icon: mdiMinusCircle },
        { key: 'moveToField', title: 'Field', icon: mdiArrowUp },
      ]
    default:
      return []
  }
})

const backImageUrl = chrome.runtime.getURL('images/card_back.png')

const imageUrl = computed(() => {
  const unifiedDB = getUnifiedCacheDB()
  const cardInfo = unifiedDB.getCardInfo(props.card.cid)
  if (!cardInfo) return backImageUrl

  const imgInfo = cardInfo.imgs.find(img => img.ciid === props.card.ciid)
  if (!imgInfo) return backImageUrl

  const gameType = detectCardGameType()
  const apiPath = `get_image.action?type=1&cid=${props.card.cid}&ciid=${props.card.ciid}&enc=${imgInfo.imgHash}&osplang=1`

  const base = gameType === 'rush'
    ? 'https://www.db.yugioh-card.com/rushdb/'
    : 'https://www.db.yugioh-card.com/yugiohdb/'
  return base + apiPath
})

function openCardInfo() {
  const gameType = detectCardGameType()
  const base = gameType === 'rush'
    ? 'https://www.db.yugioh-card.com/rushdb/'
    : 'https://www.db.yugioh-card.com/yugiohdb/'
  const url = base + `card_search.action?ope=2&cid=${props.card.cid}`
  window.open(url, '_blank')
}

function handleDragStart(event: Event) {
  if (!(event instanceof DragEvent) || !event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    cardId: props.card.id,
    zone: props.zone,
    slotIndex: props.slotIndex,
  }))
  emit('dragstart', props.card, event)
}

function handleDragEnd() {
  isDragOver.value = false
  emit('dragend')
}

function handleDrop(event: Event) {
  isDragOver.value = false
  if (!(event instanceof DragEvent) || !event.dataTransfer) return
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.cardId && data.zone) {
      emit('drop', data.cardId, data.zone, data.slotIndex)
    }
  } catch { /* ignore invalid data */ }
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
  opacity: 0.7;
}

.face-down-transparent {
  opacity: 0.5;
}

.horizontal {
  transform: rotate(90deg);
  transform-origin: center center;

  &:hover {
    transform: rotate(90deg) translateY(-2px);
  }
}

.drag-over {
  outline: 2px solid rgba(25, 118, 210, 0.8);
  outline-offset: -2px;
}

.info-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 50%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  z-index: 4;
}

.info-btn {
  padding: 2px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 1;
    background: rgba(25, 118, 210, 0.9);
  }

  svg {
    display: block;
  }
}

.card:hover .info-btn {
  opacity: 1;
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
</style>
