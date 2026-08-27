<template>
  <div class="ygo-next practice-card-stack" :class="[`direction-${direction}`]" :style="stackSizeStyle">
    <TransitionGroup name="card-stack" tag="div" class="stack-cards">
      <DeckCard
        v-for="(card, i) in visibleCards"
        :key="`${zone}-${slotIndex ?? 0}-${card.instanceId}`"
        :card="card"
        section-type="practice"
        :uuid="card.instanceId ?? ''"
        :force-reveal="forceReveal"
        :zone="zone"
        :slot-index="slotIndex"
        :style="offsetStyle(i)"
        class="stack-card"
        @click="$emit('card-click', card)"
        @practice-action="(action, uuid) => $emit('card-action', action, uuid)"
        @practice-dragstart="(event, uuid, offset) => $emit('practice-dragstart', event, uuid, offset)"
        @practice-dragend="$emit('card-dragend')"
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
import DeckCard from '../DeckCard.vue'

const props = withDefaults(defineProps<{
  cards: PracticeCard[]
  direction?: 'right-up' | 'left-up' | 'right' | 'left' | 'none'
  maxVisible?: number
  forceReveal?: boolean
  zone?: ZoneType
  slotIndex?: number
  dragOver?: boolean
  cardWidth?: number
  cardHeight?: number
}>(), {
  direction: 'right-up',
  maxVisible: 3,
  forceReveal: false,
  dragOver: false,
  cardWidth: 36,
  cardHeight: 53,
})

const stackSizeStyle = computed(() => ({
  width: `${props.cardWidth}px`,
  height: `${props.cardHeight}px`,
}))

const emit = defineEmits<{
  'card-click': [card: PracticeCard]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
  'practice-dragstart': [event: DragEvent, uuid: string, offset: { x: number; y: number }]
  'practice-dragend': []
  'practice-action': [action: string, uuid: string]
}>()

// deck/extraで表向きカードが上と下にある場合は right-up でオフセット表示、1枚のみの場合は none
const effectiveDirection = computed(() => {
  if ((props.zone === 'deck' || props.zone === 'extra') && !props.forceReveal) {
    const topCard = props.cards[0]
    const bottomCard = props.cards[props.cards.length - 1]
    const hasTopFaceUp = topCard && topCard.face === 'up'
    const hasBottomFaceUp = bottomCard && props.cards.length > 1 && bottomCard.face === 'up'
    if (hasTopFaceUp && hasBottomFaceUp) return 'right-up' as const
    if (hasTopFaceUp || hasBottomFaceUp) return 'none' as const
  }
  return props.direction
})

const totalCount = computed(() => props.cards.length)

const visibleCards = computed(() => {
  const isFaceDownOnly = (props.zone === 'deck' || props.zone === 'extra') && !props.forceReveal
  if (isFaceDownOnly) {
    const topCard = props.cards[0]
    const bottomCard = props.cards[props.cards.length - 1]
    const result: PracticeCard[] = []

    // 表向きカードがデッキ下にある場合
    if (bottomCard && bottomCard.face === 'up' && props.cards.length > 1) {
      result.push(bottomCard)
    }
    // 表向きカードがデッキ上にある場合（下のカードと重複しない場合）
    if (topCard && topCard.face === 'up') {
      if (result.length === 0 || topCard !== bottomCard) {
        result.push(topCard)
      }
    }

    if (result.length > 0) return result
    return props.cards.slice(0, 1)
  }
  if (props.cards.length <= props.maxVisible) return props.cards
  return props.cards.slice(props.cards.length - props.maxVisible)
})

function offsetStyle(index: number | string) {
  const i = Number(index)
  const n = visibleCards.value.length
  const directionMap: Record<string, [number, number]> = {
    'right-up': [16, -5],
    'left-up': [-16, -5],
    'right': [16, 0],
    'left': [-16, 0],
    'none': [0, 0],
  }
  const offset = directionMap[effectiveDirection.value] ?? directionMap['right-up']!
  const [x, y] = offset
  const centerLeft = (i - (n - 1) / 2) * x
  return {
    position: 'absolute',
    left: `${centerLeft}px`,
    top: `${i * y}px`,
    zIndex: `${i}`,
  }
}
</script>

<style scoped lang="scss">
.practice-card-stack {
  position: relative;
  display: inline-block;
}

.stack-cards {
  position: relative;
  width: 100%;
  height: 100%;
}

.stack-card {
  position: absolute;
  transition: left 0.25s ease, top 0.25s ease;
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
