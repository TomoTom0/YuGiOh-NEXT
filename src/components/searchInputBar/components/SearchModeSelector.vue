<template>
  <div class="search-mode-selector">
    <button class="search-mode-btn" :class="{ compact: compact }" @click.stop="toggleDropdown">
      <span class="mode-text">{{ modeLabel }}</span>
    </button>
    <div v-if="isOpen" class="mode-dropdown-overlay" @click="closeDropdown"></div>
    <Transition name="dropdown">
      <div v-if="isOpen" class="mode-dropdown" :class="{ 'dropdown-above': isBottomPosition, compact: compact }">
        <div class="mode-option" @click="selectMode('auto')">自動</div>
        <div class="mode-option" @click="selectMode('name')">カード名で検索</div>
        <div class="mode-option" @click="selectMode('text')">テキストで検索</div>
        <div class="mode-option" @click="selectMode('pendulum')">ペンデュラムテキストで検索</div>
        <div class="mode-option" @click="selectMode('mydeck')">マイデッキから選択</div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import type { SearchMode } from '../../../types/settings'

export default defineComponent({
  name: 'SearchModeSelector',
  props: {
    modelValue: {
      type: String as () => SearchMode,
      required: true
    },
    isBottomPosition: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false)

    const modeLabel = computed(() => {
      switch (props.modelValue) {
        case 'auto': return 'auto'
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        case 'mydeck': return 'mydeck'
        default: return 'auto'
      }
    })

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value
    }

    const closeDropdown = () => {
      isOpen.value = false
    }

    const selectMode = (mode: SearchMode) => {
      emit('update:modelValue', mode)
      closeDropdown()
    }

    return {
      isOpen,
      modeLabel,
      toggleDropdown,
      closeDropdown,
      selectMode
    }
  }
})
</script>

<style lang="scss" scoped>
.search-mode-selector {
  display: contents;
}

.search-mode-btn {
  background: transparent;
  border: none;
  padding: 2px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 48px;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary);
  }

  .mode-text {
    font-size: calc(var(--search-ui-font-size, 14px) * 0.71);
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.compact {
    padding: 2px 6px;
    min-width: 36px;

    .mode-text {
      font-size: calc(var(--search-ui-font-size, 14px) * 0.71);
    }
  }
}

.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.mode-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-top: 4px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;

  &.dropdown-above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 4px;
  }

  &.compact {
    top: 100%;
    bottom: auto;
    margin-top: 2px;
    margin-bottom: 0;
  }
}

.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.mode-option {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: calc(var(--search-ui-font-size, 14px) * 0.93);
  color: var(--text-primary, #333);

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}
</style>
