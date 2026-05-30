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
import type { ZoneType } from '../../stores/practice'
import {
  mdiCardPlus,
  mdiShuffle,
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
} from '@mdi/js'

const props = defineProps<{
  zone: ZoneType
  cards: { length: number }
  visible: boolean
  deckEmpty?: boolean
  revealExtra?: boolean
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

const quickActions = computed<QuickAction[]>(() => {
  const actions: QuickAction[] = []

  if (props.zone === 'deck') {
    actions.push(
      { key: 'draw', title: 'Draw', icon: mdiCardPlus, disabled: props.deckEmpty ?? false, handler: () => emit('action', 'draw') },
      { key: 'shuffle', title: 'Shuffle', icon: mdiShuffle, disabled: (props.cards.length ?? 0) <= 1, handler: () => emit('action', 'shuffleDeck') },
    )
  }

  if (props.zone === 'extra') {
    actions.push(
      {
        key: 'revealExtraToggle',
        title: props.revealExtra ? 'Hide' : 'Reveal',
        icon: props.revealExtra ? mdiEyeOff : mdiEye,
        disabled: (props.cards.length ?? 0) === 0,
        handler: () => emit('action', 'revealExtraToggle'),
      },
    )
  }

  return actions
})
</script>

<style scoped lang="scss">
.practice-slot-controls {
  position: absolute;
  top: 2px;
  right: 2px;
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
