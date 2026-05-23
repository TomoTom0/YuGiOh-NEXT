<template>
  <div
    class="ygo-next practice-slot"
    :class="{
      'has-cards': cards.length > 0,
      'is-empty': cards.length === 0,
      'drag-over': isDragOver,
    }"
    @click="handleSlotClick"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.stop="handleDrop"
  >
    <PracticeCardStack
      v-if="cards.length > 0"
      :cards="cards"
      :direction="stackDirection"
      :force-reveal="forceReveal"
      :zone="zone"
      :slot-index="slotIndex"
      :show-actions="showActions"
      @card-click="handleCardClick"
      @card-action="(key, cardId) => $emit('card-action', key, cardId)"
      @card-dragstart="(card, event) => $emit('card-dragstart', card, event)"
      @card-dragend="$emit('card-dragend')"
      @card-drop="(cardId, fromZone, fromSlotIndex) => $emit('card-drop', cardId, fromZone, fromSlotIndex)"
    />
    <span v-else class="slot-empty-label">0</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import PracticeCardStack from './PracticeCardStack.vue'

const props = withDefaults(defineProps<{
  cards: PracticeCard[]
  zone: ZoneType
  slotIndex?: number
  stackDirection?: 'right-up' | 'left-up' | 'right' | 'left'
  forceReveal?: boolean
  showActions?: boolean
}>(), {
  slotIndex: undefined,
  stackDirection: 'right-up',
  forceReveal: false,
  showActions: false,
})

const emit = defineEmits<{
  'card-click': [card: PracticeCard]
  'slot-click': [zone: ZoneType, slotIndex?: number]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined]
}>()

const isDragOver = ref(false)

function handleCardClick(card: PracticeCard) {
  emit('card-click', card)
}

function handleSlotClick() {
  emit('slot-click', props.zone, props.slotIndex)
}

function handleDrop(event: Event) {
  isDragOver.value = false
  if (!(event instanceof DragEvent) || !event.dataTransfer) return
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.cardId && data.zone) {
      emit('card-drop', data.cardId, data.zone, data.slotIndex)
    }
  } catch { /* ignore */ }
}
</script>

<style scoped lang="scss">
.practice-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--practice-card-width, 75px);
  min-height: var(--practice-card-height, 110px);
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

.drag-over {
  border-color: var(--color-primary, #1976d2) !important;
  background: rgba(25, 118, 210, 0.15);
}
</style>
