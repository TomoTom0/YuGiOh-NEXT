<template>
  <div class="ygo-next practice-card-stack" :class="[`direction-${direction}`]">
    <TransitionGroup name="card-stack" tag="div" class="stack-cards">
      <PracticeCardComponent
        v-for="(card, i) in visibleCards"
        :key="`${zone}-${slotIndex ?? 0}-${card.id}`"
        :card="card"
        :force-reveal="forceReveal"
        :zone="zone"
        :slot-index="slotIndex"
        :style="offsetStyle(i)"
        class="stack-card"
        @click="$emit('card-click', card)"
        @action="(key, cardId) => $emit('card-action', key, cardId)"
        @dragstart="(card, event) => $emit('card-dragstart', card, event)"
        @dragend="$emit('card-dragend')"
      />
    </TransitionGroup>
    <div
      v-if="dragOver && draggingStackTop !== null && zone !== 'deck'"
      class="stack-drop-preview"
      :style="previewStyle"
    />
    <div v-if="totalCount > 0" class="stack-badge">
      {{ totalCount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, TransitionGroup } from 'vue'
import type { PracticeCard, ZoneType } from '../../stores/practice'
import PracticeCardComponent from './PracticeCard.vue'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'

const props = withDefaults(defineProps<{
  cards: PracticeCard[]
  direction?: 'right-up' | 'left-up' | 'right' | 'left' | 'none'
  maxVisible?: number
  forceReveal?: boolean
  zone?: ZoneType
  slotIndex?: number
  dragOver?: boolean
}>(), {
  direction: 'right-up',
  maxVisible: 3,
  forceReveal: false,
  dragOver: false,
})

const { draggingStackTop } = usePracticeDragState()

// deck/extraで表向きカードが上または下に置かれた場合は right-up でオフセット表示
const effectiveDirection = computed(() => {
  if ((props.zone === 'deck' || props.zone === 'extra') && !props.forceReveal) {
    const topCard = props.cards[0]
    if (topCard && topCard.face === 'up') return 'right-up' as const
    const bottomCard = props.cards[props.cards.length - 1]
    if (bottomCard && props.cards.length > 1 && bottomCard.face === 'up') return 'right-up' as const
  }
  return props.direction
})

const previewStyle = computed(() => {
  if (!props.dragOver || draggingStackTop.value === null) return {}
  const dir = effectiveDirection.value
  if (dir === 'right-up' || dir === 'left-up') {
    const xDir = dir === 'left-up' ? -1 : 1
    // top = 手前（前面）に挿入, bottom = 奥（背面）に挿入
    return draggingStackTop.value
      ? { transform: `translate(${8 * xDir}px, -4px)`, zIndex: 30 }
      : { transform: `translate(${-8 * xDir}px, 4px)`, zIndex: -1 }
  }
  return draggingStackTop.value
    ? { transform: 'translate(0px, -8px)', zIndex: 30 }
    : { transform: 'translate(0px, 8px)', zIndex: -1 }
})

defineEmits<{
  'card-click': [card: PracticeCard]
  'card-action': [action: string, cardId: string]
  'card-dragstart': [card: PracticeCard, event: DragEvent]
  'card-dragend': []
}>()

const totalCount = computed(() => props.cards.length)

const visibleCards = computed(() => {
  const isFaceDownOnly = (props.zone === 'deck' || props.zone === 'extra') && !props.forceReveal
  if (isFaceDownOnly) {
    const topCard = props.cards[0]
    if (topCard && topCard.face === 'up') {
      // 表向きカードがデッキ上にある: 裏向き→表向きの順で並べて表を前面に表示
      const secondCard = props.cards[1]
      return secondCard ? [secondCard, topCard] : [topCard]
    }
    // 表向きカードがデッキ下にある: 表向き→裏向きの順で並べて裏を前面に表示
    const bottomCard = props.cards[props.cards.length - 1]
    if (bottomCard && props.cards.length > 1 && bottomCard.face === 'up') {
      return [bottomCard, topCard!]
    }
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
  width: var(--practice-card-width, 75px);
  height: var(--practice-card-height, 110px);
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

.stack-drop-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(100, 180, 255, 0.9);
  background: rgba(25, 118, 210, 0.25);
  border-radius: 3px;
  pointer-events: none;
  z-index: 20;
  box-shadow: 0 0 6px rgba(100, 180, 255, 0.5);
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
