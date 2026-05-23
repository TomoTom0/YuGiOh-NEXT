<template>
  <div v-if="visible" class="ygo-next practice-slot-controls">
    <button
      v-for="action in quickActions"
      :key="action.key"
      class="quick-btn"
      :disabled="action.disabled"
      :title="action.title"
      @click.stop="action.handler"
    >
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path fill="currentColor" :d="action.icon" />
      </svg>
    </button>
    <button class="menu-btn" title="Menu" @click.stop="$emit('open-menu')">
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path fill="currentColor" :d="mdiDotsVertical" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZoneType, PracticeCard } from '../../stores/practice'
import {
  mdiCardPlus,
  mdiShuffle,
  mdiArrowUp,
  mdiGraveStone,
  mdiHandBackRight,
  mdiDotsVertical,
} from '@mdi/js'

const props = defineProps<{
  zone: ZoneType
  slotIndex?: number
  cards: PracticeCard[]
  visible: boolean
  deckEmpty?: boolean
}>()

const emit = defineEmits<{
  'action': [action: string, cardId?: string]
  'open-menu': []
}>()

interface QuickAction {
  key: string
  title: string
  icon: string
  disabled: boolean
  handler: () => void
}

const topCardId = computed(() => props.cards[0]?.id)

const quickActions = computed<QuickAction[]>(() => {
  const actions: QuickAction[] = []
  const cid = topCardId.value

  switch (props.zone) {
    case 'deck':
      actions.push(
        { key: 'draw', title: 'Draw', icon: mdiCardPlus, disabled: props.deckEmpty ?? false, handler: () => emit('action', 'draw') },
        { key: 'shuffle', title: 'Shuffle', icon: mdiShuffle, disabled: (props.cards.length ?? 0) <= 1, handler: () => emit('action', 'shuffleDeck') },
      )
      break
    case 'hand':
      if (cid) {
        actions.push(
          { key: 'field', title: 'Field', icon: mdiArrowUp, disabled: false, handler: () => emit('action', 'moveToField', cid) },
          { key: 'gy', title: 'GY', icon: mdiGraveStone, disabled: false, handler: () => emit('action', 'moveToGY', cid) },
        )
      }
      break
    case 'monster':
    case 'spellTrap':
      if (cid) {
        actions.push(
          { key: 'gy', title: 'GY', icon: mdiGraveStone, disabled: false, handler: () => emit('action', 'moveToGY', cid) },
          { key: 'hand', title: 'Hand', icon: mdiHandBackRight, disabled: false, handler: () => emit('action', 'moveToHand', cid) },
        )
      }
      break
    case 'gy':
    case 'banish':
      if (cid) {
        actions.push(
          { key: 'hand', title: 'Hand', icon: mdiHandBackRight, disabled: false, handler: () => emit('action', 'moveToHand', cid) },
          { key: 'field', title: 'Field', icon: mdiArrowUp, disabled: false, handler: () => emit('action', 'moveToField', cid) },
        )
      }
      break
    case 'extra':
      if (cid) {
        actions.push(
          { key: 'field', title: 'Field', icon: mdiArrowUp, disabled: false, handler: () => emit('action', 'moveToField', cid) },
          { key: 'gy', title: 'GY', icon: mdiGraveStone, disabled: false, handler: () => emit('action', 'moveToGY', cid) },
        )
      }
      break
    case 'field':
      if (cid) {
        actions.push(
          { key: 'gy', title: 'GY', icon: mdiGraveStone, disabled: false, handler: () => emit('action', 'moveToGY', cid) },
        )
      }
      break
    case 'temp':
      if (cid) {
        actions.push(
          { key: 'hand', title: 'Hand', icon: mdiHandBackRight, disabled: false, handler: () => emit('action', 'moveToHand', cid) },
          { key: 'gy', title: 'GY', icon: mdiGraveStone, disabled: false, handler: () => emit('action', 'moveToGY', cid) },
        )
      }
      break
  }

  return actions
})
</script>

<style scoped lang="scss">
.practice-slot-controls {
  position: absolute;
  top: 2px;
  left: 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  z-index: 20;
}

.quick-btn,
.menu-btn {
  padding: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(25, 118, 210, 0.9);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    display: block;
  }
}

.menu-btn {
  background: rgba(0, 0, 0, 0.5);
}
</style>
