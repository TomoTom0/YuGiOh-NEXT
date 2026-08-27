<template>
  <div
    class="ygo-next practice-hand-area"
    :class="{ 'two-deck-mode': twoDeckMode }"
    @dragover.prevent="handleHandAreaDragOver"
    @dragleave="handleHandAreaDragLeave"
    @drop.stop="handleHandDrop"
  >
    <!-- 2P mode: horizontal layout (temp=left/EX side, hand=right/Main side) -->
    <template v-if="twoDeckMode">
      <div
        class="temp-section-inline"
        @dragover.prevent="handleTempDragOver"
        @dragleave="handleTempDragLeave"
        @drop.stop="handleTempDrop"
      >
        <div class="area-label">Temp</div>
        <div
          class="temp-area"
          :class="{ 'temp-drag-over': isTempDragOver }"
        >
          <template v-if="tempCards.length > 0">
            <TransitionGroup name="hand-card" tag="div" class="temp-cards">
              <DeckCard
                v-for="card in tempCards"
                :key="`temp-${card.instanceId}`"
                :card="card"
                section-type="practice"
                :uuid="card.instanceId ?? ''"
                zone="temp"
                class="hand-card"
                :style="handCardStyle"
                :show-face-indicator="false"
                @click="$emit('card-click', card)"
                @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
                @practice-dragstart="(event, uuid, offset) => $emit('card-dragstart', card, event)"
                @practice-dragend="$emit('card-dragend')"
              />
            </TransitionGroup>
          </template>
        </div>
      </div>
      <div class="hand-section-inline">
        <div class="area-label">Hand</div>
        <TransitionGroup name="hand-card" tag="div" class="hand-cards" :class="{ 'drag-over': isDragOver && !isTempDragOver }" :style="{ gap: `${handGap}px` }">
          <DeckCard
            v-for="(card, index) in handCards"
            :key="`hand-${card.instanceId}`"
            :card="card"
            section-type="practice"
            :uuid="card.instanceId ?? ''"
            zone="hand"
            class="hand-card"
            :style="handCardStyle"
            :show-face-indicator="false"
            @dragover.prevent
            @drop.stop="(e) => handleCardDrop(card, Number(index), e as DragEvent)"
            @click="$emit('card-click', card)"
            @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
            @practice-dragstart="(event, uuid, offset) => $emit('card-dragstart', card, event)"
            @practice-dragend="$emit('card-dragend')"
          />
        </TransitionGroup>
      </div>
    </template>

    <!-- Normal mode: vertical layout -->
    <template v-else>
      <!-- Temp section (shown first when reversed=P2) -->
      <div
        v-if="reversed"
        class="temp-section"
        @dragover.prevent="handleTempDragOver"
        @dragleave="handleTempDragLeave"
        @drop.stop="handleTempDrop"
      >
        <div class="area-label">Temp</div>
        <div
          class="temp-area"
          :class="{ 'temp-drag-over': isTempDragOver }"
        >
          <template v-if="tempCards.length > 0">
            <TransitionGroup name="hand-card" tag="div" class="temp-cards">
              <DeckCard
                v-for="card in tempCards"
                :key="`temp-${card.instanceId}`"
                :card="card"
                section-type="practice"
                :uuid="card.instanceId ?? ''"
                zone="temp"
                class="hand-card"
                :style="handCardStyle"
                :show-face-indicator="false"
                @click="$emit('card-click', card)"
                @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
                @practice-dragstart="(event, uuid, offset) => $emit('card-dragstart', card, event)"
                @practice-dragend="$emit('card-dragend')"
              />
            </TransitionGroup>
          </template>
        </div>
      </div>
      <div class="area-label">Hand</div>
      <TransitionGroup name="hand-card" tag="div" class="hand-cards" :class="{ 'drag-over': isDragOver && !isTempDragOver }" :style="{ gap: `${handGap}px` }">
        <DeckCard
          v-for="(card, index) in handCards"
          :key="`hand-${card.instanceId}`"
          :card="card"
          section-type="practice"
          :uuid="card.instanceId ?? ''"
          zone="hand"
          class="hand-card"
          :style="handCardStyle"
          :show-face-indicator="false"
          @dragover.prevent
          @drop.stop="(e) => handleCardDrop(card, Number(index), e as DragEvent)"
          @click="$emit('card-click', card)"
          @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
          @practice-dragstart="(event, uuid, offset) => $emit('card-dragstart', card, event)"
          @practice-dragend="$emit('card-dragend')"
        />
      </TransitionGroup>
      <!-- Temp section (shown last when normal=P1) -->
      <div
        v-if="!reversed"
        class="temp-section"
        @dragover.prevent="handleTempDragOver"
        @dragleave="handleTempDragLeave"
        @drop.stop="handleTempDrop"
      >
        <div class="area-label">Temp</div>
        <div
          class="temp-area"
          :class="{ 'temp-drag-over': isTempDragOver }"
        >
          <template v-if="tempCards.length > 0">
            <TransitionGroup name="hand-card" tag="div" class="temp-cards">
              <DeckCard
                v-for="card in tempCards"
                :key="`temp-${card.instanceId}`"
                :card="card"
                section-type="practice"
                :uuid="card.instanceId ?? ''"
                zone="temp"
                class="hand-card"
                :style="handCardStyle"
                :show-face-indicator="false"
                @click="$emit('card-click', card)"
                @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
                @practice-dragstart="(event, uuid, offset) => $emit('card-dragstart', card, event)"
                @practice-dragend="$emit('card-dragend')"
              />
            </TransitionGroup>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TransitionGroup } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import { isDragEvent, parseDragData, isPracticeDragData, isDeckDragData, type DropPosition } from '../../utils/drag-data'
import DeckCard from '../DeckCard.vue'
import { useSettingsStore } from '../../stores/settings'


const props = withDefaults(defineProps<{
  handCards: PracticeCard[]
  tempCards: PracticeCard[]
  reversed?: boolean
  twoDeckMode?: boolean
  cardWidth?: number
  cardHeight?: number
}>(), {
  reversed: false,
  twoDeckMode: false,
})

const emit = defineEmits<{
  'card-click': [card: PracticeCard]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined, dropPos: DropPosition]
  'deck-card-drop': [cid: string, ciid: string, dropPos: DropPosition]
  'temp-card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined, dropPos: DropPosition]
  'temp-deck-card-drop': [cid: string, ciid: string, dropPos: DropPosition]
}>()

const isDragOver = ref(false)
const isTempDragOver = ref(false)
const settingsStore = useSettingsStore()

const cardSize = computed(() => {
  if (props.cardWidth != null && props.cardHeight != null) {
    return { width: props.cardWidth, height: props.cardHeight }
  }
  return settingsStore.practiceCardSizePixels
})

const handCardStyle = computed(() => {
  const { width, height } = cardSize.value
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
})

const handGap = computed(() => {
  const count = props.handCards.length
  if (count <= 1) return 2
  const { width: cardW } = cardSize.value
  const slotOverhead = 6
  const fieldContentWidth = 7 * (cardW + slotOverhead) + 6 * 6
  const available = fieldContentWidth - 4
  const defaultGap = 2
  const totalWithDefault = count * cardW + (count - 1) * defaultGap
  if (totalWithDefault <= available) return defaultGap
  return Math.round((available - count * cardW) / (count - 1))
})

function handleHandAreaDragOver() {
  if (!isTempDragOver.value) {
    isDragOver.value = true
  }
}

function handleHandAreaDragLeave(event: DragEvent) {
  const related = event.relatedTarget as Element | null
  const target = event.currentTarget as HTMLElement
  if (!related || !target.contains(related)) {
    isDragOver.value = false
    isTempDragOver.value = false
  }
}

function handleTempDragOver() {
  isTempDragOver.value = true
  isDragOver.value = false
}

function handleTempDragLeave(event: DragEvent) {
  const related = event.relatedTarget as Element | null
  const target = event.currentTarget as HTMLElement
  if (!related || !target.contains(related)) {
    isTempDragOver.value = false
  }
}

function handleCardDrop(card: PracticeCard, index: number, event: DragEvent) {
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const isRight = rect ? event.clientX > rect.left + rect.width / 2 : true
  const insertIndex = isRight ? index + 1 : index
  const dropPos: DropPosition = { isRight: true, isTop: true, insertIndex }

  const data = parseDragData(event)
  if (isPracticeDragData(data)) {
    const zone = data.zone as ZoneType
    emit('card-drop', data.cardId, zone, data.slotIndex, dropPos)
    return
  }
  if (isDeckDragData(data) && data.card && !data.card.empty) {
    const cid = String(data.card.cardId ?? data.card.cid)
    const ciid = String(data.card.ciid)
    emit('deck-card-drop', cid, ciid, dropPos)
  }
}

function handleHandDrop(event: Event) {
  isDragOver.value = false
  const data = isDragEvent(event) ? parseDragData(event) : null
  const dropPos: DropPosition = { isRight: true, isTop: true }

  if (isPracticeDragData(data)) {
    const zone = data.zone as ZoneType
    emit('card-drop', data.cardId, zone, data.slotIndex, dropPos)
    return
  }
  if (isDeckDragData(data) && data.card && !data.card.empty) {
    const cid = String(data.card.cardId ?? data.card.cid)
    const ciid = String(data.card.ciid)
    emit('deck-card-drop', cid, ciid, dropPos)
  }
}

function handleTempDrop(event: Event) {
  isTempDragOver.value = false
  const data = isDragEvent(event) ? parseDragData(event) : null
  const dropPos: DropPosition = { isRight: true, isTop: true }

  if (isPracticeDragData(data)) {
    const zone = data.zone as ZoneType
    emit('temp-card-drop', data.cardId, zone, data.slotIndex, dropPos)
    return
  }
  if (isDeckDragData(data) && data.card && !data.card.empty) {
    const cid = String(data.card.cardId ?? data.card.cid)
    const ciid = String(data.card.ciid)
    emit('temp-deck-card-drop', cid, ciid, dropPos)
  }
}
</script>

<style scoped lang="scss">
.practice-hand-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;

  &.two-deck-mode {
    flex-direction: row;
    gap: 8px;
    align-items: stretch;
  }
}

.temp-section-inline {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 0;
  min-width: 0;
}

.hand-section-inline {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 0;
  min-width: 0;
}

.area-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.35));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 2px;
  line-height: 1;
}

.hand-cards {
  display: flex;
  justify-content: center;
  flex-wrap: nowrap;
  flex: 1;
  padding: 2px;
  min-height: var(--practice-card-height, 53px);
  background: rgba(25, 118, 210, 0.05);
  border-radius: 3px;
  transition: background 0.15s;

  &.drag-over {
    background: rgba(25, 118, 210, 0.18);
  }
}

.hand-card {
  flex-shrink: 0;
}

.temp-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--border-secondary, rgba(255, 255, 255, 0.12));
  width: 100%;
}

.temp-area {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 6px;
  min-height: var(--practice-card-height, 53px);
  width: 100%;
  box-sizing: border-box;
  border: 1px dashed rgba(180, 130, 255, 0.4);
  border-radius: 3px;
  background: rgba(120, 60, 180, 0.08);
}

.temp-cards {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
}

.temp-empty {
  font-size: 11px;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.25));
  pointer-events: none;
  width: 100%;
  text-align: center;
}


.temp-drag-over {
  background: rgba(180, 130, 255, 0.18);
  border-color: rgba(180, 130, 255, 0.7);
}

.hand-card-enter-active {
  transition: opacity 0.2s ease;
}

.hand-card-leave-active {
  transition: opacity 0.15s ease;
  position: absolute;
}

.hand-card-enter-from {
  opacity: 0;
}

.hand-card-leave-to {
  opacity: 0;
}
</style>
