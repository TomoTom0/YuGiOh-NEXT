<template>
  <div class="ygo-next practice-card-stack" :class="[`direction-${direction}`]">
    <TransitionGroup name="card-stack" tag="div" class="stack-cards">
      <PracticeCardComponent
        v-for="(card, i) in visibleCards"
        :key="card.id"
        :card="card"
        :force-reveal="forceReveal"
        :zone="zone"
        :slot-index="slotIndex"
        :show-actions="showActions"
        :style="offsetStyle(i)"
        class="stack-card"
        @click="$emit('card-click', card)"
        @action="(key, cardId) => $emit('card-action', key, cardId)"
        @dragstart="(card, event) => $emit('card-dragstart', card, event)"
        @dragend="$emit('card-dragend')"
        @drop="(cardId, fromZone, fromSlotIndex) => $emit('card-drop', cardId, fromZone, fromSlotIndex)"
      />
    </TransitionGroup>
    <div v-if="totalCount > 0" class="stack-badge">
      {{ totalCount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, TransitionGroup } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import PracticeCardComponent from './PracticeCard.vue'

const props = withDefaults(defineProps<{
  cards: PracticeCard[]
  direction?: 'right-up' | 'left-up' | 'right' | 'left' | 'none'
  maxVisible?: number
  forceReveal?: boolean
  zone?: ZoneType
  slotIndex?: number
  showActions?: boolean
}>(), {
  direction: 'right-up',
  maxVisible: 5,
  forceReveal: false,
  showActions: true,
})

defineEmits<{
  'card-click': [card: PracticeCard]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'card-drop': [cardId: string, fromZone: ZoneType, fromSlotIndex: number | undefined]
}>()

const totalCount = computed(() => props.cards.length)

const visibleCards = computed(() => {
  if (props.cards.length <= props.maxVisible) return props.cards
  return props.cards.slice(0, props.maxVisible)
})

function offsetStyle(index: number | string) {
  const i = Number(index)
  const directionMap: Record<string, [number, number]> = {
    'right-up': [12, -4],
    'left-up': [-12, -4],
    'right': [14, 0],
    'left': [-14, 0],
    'none': [0, 0],
  }
  const offset = directionMap[props.direction] ?? directionMap['right-up']!
  const [x, y] = offset
  if (i === 0) return {}
  if (props.direction === 'none') {
    return {
      position: 'absolute',
      left: '0',
      top: '0',
      zIndex: `${i}`,
    }
  }
  return {
    marginLeft: `${x}px`,
    marginTop: `${y}px`,
  }
}
</script>

<style scoped lang="scss">
.practice-card-stack {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
}

.stack-cards {
  display: flex;
  align-items: flex-start;
}

.direction-none .stack-cards {
  position: relative;
}

.stack-card {
  position: relative;
}

.stack-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--color-primary, #1976d2);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  z-index: 10;
  pointer-events: none;
}

.card-stack-enter-active {
  transition: all 0.25s ease;
}

.card-stack-leave-active {
  transition: all 0.15s ease;
  position: absolute;
}

.card-stack-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.card-stack-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.card-stack-move {
  transition: transform 0.25s ease;
}
</style>
