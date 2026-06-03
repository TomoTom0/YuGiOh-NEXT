<template>
  <div
    class="ygo-next practice-slot"
    :data-zone="zone"
    :class="{
      'has-cards': cards.length > 0,
      'is-empty': cards.length === 0,
      'drag-over': isDragOver,
    }"
    @click="handleSlotClick"
    @dragover.prevent="(e) => handleDragOver(e)"
    @dragleave="(e) => handleDragLeave(e)"
    @drop.stop="handleDrop"
  >
    <div v-if="isDragOver && zone !== 'gy'" class="drop-quarter-overlay">
      <div
        v-for="q in quarters"
        :key="q.key"
        class="quarter"
        :class="{ active: isActiveQuarter(q), 'span-full': q.spanFull, 'active-facedown': isActiveQuarter(q) && isFaceDownQuarter(q) }"
      >
        <svg class="q-icon" viewBox="0 0 24 24">
          <path fill="currentColor" :d="q.icon1" />
        </svg>
        <svg v-if="q.icon2" class="q-icon q-icon-sub" viewBox="0 0 24 24">
          <path fill="currentColor" :d="q.icon2" />
        </svg>
      </div>
    </div>

    <PracticeCardStack
      v-if="cards.length > 0"
      :cards="cards"
      :direction="stackDirection"
      :max-visible="maxVisible"
      :force-reveal="forceReveal"
      :zone="zone"
      :slot-index="slotIndex"
      :drag-over="isDragOver"
      :card-width="cardWidth"
      :card-height="cardHeight"
      @card-click="handleCardClick"
      @card-action="(key, cardId) => $emit('card-action', key, cardId)"
      @card-dragstart="(card, event) => $emit('card-dragstart', card, event)"
      @card-dragend="$emit('card-dragend')"
    />
    <span v-else class="slot-empty-label">0</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import type { DropPosition } from '../../utils/drag-data'
import { isDragEvent, parseDragData, isPracticeDragData, isDeckDragData } from '../../utils/drag-data'
import PracticeCardStack from './PracticeCardStack.vue'
import { useDragQuarter } from '../../composables/practice/useDragQuarter'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'
import {
  mdiArrowUp, mdiArrowDown, mdiEye, mdiEyeOff, mdiShuffle,
  mdiArrowCollapseUp, mdiArrowCollapseDown,
} from '@mdi/js'

const VALID_ZONES = new Set<string>([
  'field', 'monster', 'spellTrap', 'gy', 'banish', 'deck', 'extra', 'hand', 'temp', 'extraMonster',
])

function isValidZone(zone: string): zone is ZoneType {
  return VALID_ZONES.has(zone)
}

const props = withDefaults(defineProps<{
  cards: PracticeCard[]
  zone: ZoneType
  slotIndex?: number
  stackDirection?: 'right-up' | 'left-up' | 'right' | 'left' | 'none'
  maxVisible?: number
  forceReveal?: boolean
  cardWidth?: number
  cardHeight?: number
}>(), {
  slotIndex: undefined,
  stackDirection: 'right-up',
  maxVisible: 3,
  forceReveal: false,
  cardWidth: 36,
  cardHeight: 53,
})

const emit = defineEmits<{
  'card-click': [card: PracticeCard]
  'slot-click': [zone: ZoneType, slotIndex?: number]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined, dropPos: DropPosition]
  'deck-card-drop': [cid: string, ciid: string, dropPos: DropPosition]
}>()

const { isDragOver, dragQuarter, handleDragOver: baseDragOver, handleDragLeave: baseDragLeave, reset } = useDragQuarter()
const { setDraggingFaceDown, setDraggingStackTop, draggingPos } = usePracticeDragState()

interface QuarterDef {
  key: string
  isRight: boolean
  isTop: boolean
  icon1: string
  icon2?: string
  spanFull?: boolean
}

const quarters = computed((): QuarterDef[] => {
  const hasCards = props.cards.length > 0

  if (props.zone === 'deck') {
    // 上半分はleft/rightで意味が違う、下半分(シャッフル)は同一なので結合
    return [
      { key: 'tl', isRight: false, isTop: true, icon1: mdiArrowCollapseDown, icon2: mdiEye },
      { key: 'tr', isRight: true, isTop: true, icon1: mdiArrowCollapseUp, icon2: mdiEye },
      { key: 'b', isRight: false, isTop: false, icon1: mdiShuffle, spanFull: true },
    ]
  }

  if (props.zone === 'extra') {
    // left/rightは常に同一なので結合
    return [
      { key: 't', isRight: false, isTop: true, icon1: mdiEye, spanFull: true },
      { key: 'b', isRight: false, isTop: false, icon1: mdiEyeOff, spanFull: true },
    ]
  }

  if (!hasCards) {
    // カードなし時はleft/rightが同一なので結合
    return [
      { key: 't', isRight: false, isTop: true, icon1: mdiEye, spanFull: true },
      { key: 'b', isRight: false, isTop: false, icon1: mdiEyeOff, spanFull: true },
    ]
  }

  return [
    { key: 'tl', isRight: false, isTop: true, icon1: mdiArrowDown, icon2: mdiEye },
    { key: 'tr', isRight: true, isTop: true, icon1: mdiArrowUp, icon2: mdiEye },
    { key: 'bl', isRight: false, isTop: false, icon1: mdiArrowDown, icon2: mdiEyeOff },
    { key: 'br', isRight: true, isTop: false, icon1: mdiArrowUp, icon2: mdiEyeOff },
  ]
})

function isActiveQuarter(q: QuarterDef): boolean {
  const dq = dragQuarter.value
  if (!dq) return false
  if (q.spanFull) return dq.isTop === q.isTop
  return dq.isRight === q.isRight && dq.isTop === q.isTop
}

function computeWouldBeFaceDown(isTop: boolean, isRight?: boolean): boolean {
  if (props.zone === 'deck') {
    if (isTop && isRight) return false
    if (isTop && !isRight) return false
    return true
  }
  if (props.zone === 'gy') {
    return false
  }
  return !isTop
}

function isFaceDownQuarter(q: QuarterDef): boolean {
  return computeWouldBeFaceDown(q.isTop, q.isRight)
}

function handleDragOver(event: Event) {
  baseDragOver(event)
  if (event instanceof DragEvent && event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect()
    const isTop = event.clientY < rect.top + rect.height / 2
    const isRight = event.clientX >= rect.left + rect.width / 2
    setDraggingFaceDown(computeWouldBeFaceDown(isTop, isRight))

    if (props.cards.length === 0) {
      setDraggingStackTop(null)
    } else if (props.zone !== 'extra' && props.zone !== 'extraMonster') {
      if (props.zone === 'deck') {
        setDraggingStackTop(isTop ? isRight : null)
      } else {
        setDraggingStackTop(isRight)
      }
    } else {
      setDraggingStackTop(isTop)
    }
  }
}

function handleDragLeave(event: Event) {
  baseDragLeave(event)
  if (!isDragOver.value) {
    setDraggingFaceDown(false)
    setDraggingStackTop(null)
  }
}

function handleCardClick(card: PracticeCard) {
  emit('card-click', card)
}

function handleSlotClick() {
  emit('slot-click', props.zone, props.slotIndex)
}

function handleDrop(event: Event) {
  const el = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const pos = draggingPos.value
  let dropPos: DropPosition = { isRight: true, isTop: true }
  if (el && pos.x >= 0) {
    const rect = el.getBoundingClientRect()
    dropPos = {
      isRight: pos.x >= rect.left + rect.width / 2,
      isTop: pos.y < rect.top + rect.height / 2,
    }
  }
  reset()

  const data = isDragEvent(event) ? parseDragData(event) : null

  console.debug('[PracticeSlot.handleDrop]', props.zone, 'slotIndex:', props.slotIndex, 'isPractice:', !!isPracticeDragData(data), 'isDeck:', !!isDeckDragData(data))

  if (isPracticeDragData(data) && isValidZone(data.zone)) {
    emit('card-drop', data.cardId, data.zone as ZoneType, data.slotIndex, dropPos)
    return
  }

  if (isDeckDragData(data)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const card = data.card as any
    if (card && !card.empty) {
      const cid = String(card.cardId ?? card.cid)
      const ciid = String(card.ciid)
      console.debug('[PracticeSlot] emit deck-card-drop', props.zone, 'cid:', cid)
      emit('deck-card-drop', cid, ciid, dropPos)
    }
  }
}
</script>

<style scoped lang="scss">
.practice-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 3px;
  cursor: pointer;
}

.is-empty {
  .slot-empty-label {
    color: var(--text-secondary, rgba(255, 255, 255, 0.4));
    font-size: 14px;
    user-select: none;
  }
}

.drag-over:not([data-zone='deck']) {
  border-color: var(--color-primary, #1976d2) !important;
  background: rgba(25, 118, 210, 0.15);
  box-shadow: inset 0 0 12px rgba(25, 118, 210, 0.2);
}

.drop-quarter-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  z-index: 20;
  pointer-events: none;
  border-radius: 3px;
  overflow: hidden;
}

.quarter {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.45);
  transition: background 0.1s, border-color 0.1s;

  &.span-full {
    grid-column: 1 / -1;
  }

  &.active {
    background: rgba(25, 118, 210, 0.72);
    border-color: rgba(100, 180, 255, 0.8);

    .q-icon {
      color: #fff;
      opacity: 1;
    }
  }

  &.active-facedown {
    background: rgba(60, 20, 80, 0.82);
    border-color: rgba(180, 100, 220, 0.8);

    .q-icon {
      color: #fff;
      opacity: 1;
    }
  }
}

.q-icon {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.65);
  pointer-events: none;
  flex-shrink: 0;
  opacity: 0.9;

  &.q-icon-sub {
    width: 11px;
    height: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: -2px;
  }
}

</style>
