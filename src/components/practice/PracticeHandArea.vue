<template>
  <div
    class="ygo-next practice-hand-area"
    :class="{ 'drag-over': isDragOver }"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.stop="handleDrop"
  >
    <TransitionGroup name="hand-card" tag="div" class="hand-cards">
      <PracticeCardComponent
        v-for="card in handCards"
        :key="card.id"
        :card="card"
        zone="hand"
        class="hand-card"
        @click="$emit('card-click', card)"
        @action="(key, cardId) => $emit('card-action', key, cardId)"
        @dragstart="(card, event) => $emit('card-dragstart', card, event)"
        @dragend="$emit('card-dragend')"
        @drop="(cardId, fromZone, fromSlotIndex) => $emit('card-drop', cardId, fromZone, fromSlotIndex)"
      />
    </TransitionGroup>
    <div class="temp-area">
      <span class="temp-label">Temp:</span>
      <PracticeCardStackComponent
        v-if="tempCards.length > 0"
        :cards="tempCards"
        zone="temp"
        direction="right"
        :show-actions="false"
        @card-click="$emit('card-click', $event)"
        @card-action="(key, cardId) => $emit('card-action', key, cardId)"
        @card-dragstart="(card, event) => $emit('card-dragstart', card, event)"
        @card-dragend="$emit('card-dragend')"
        @card-drop="(cardId, fromZone, fromSlotIndex) => $emit('card-drop', cardId, fromZone, fromSlotIndex)"
      />
      <span v-else class="temp-empty">0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, TransitionGroup } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import PracticeCardComponent from './PracticeCard.vue'
import PracticeCardStackComponent from './PracticeCardStack.vue'

defineProps<{
  handCards: PracticeCard[]
  tempCards: PracticeCard[]
}>()

const emit = defineEmits<{
  'card-click': [card: PracticeCard]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined]
}>()

const isDragOver = ref(false)

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
.practice-hand-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.hand-cards {
  display: flex;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  padding: 2px;
}

.hand-card {
  flex-shrink: 0;
}

.temp-area {
  display: flex;
  align-items: center;
  gap: 4px;
}

.temp-label {
  font-size: 10px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  flex-shrink: 0;
}

.temp-empty {
  font-size: 14px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.3));
}

.drag-over {
  background: rgba(25, 118, 210, 0.1);
  border-radius: 4px;
}

.hand-card-enter-active {
  transition: all 0.25s ease;
}

.hand-card-leave-active {
  transition: all 0.15s ease;
  position: absolute;
}

.hand-card-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.hand-card-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.hand-card-move {
  transition: transform 0.25s ease;
}
</style>
