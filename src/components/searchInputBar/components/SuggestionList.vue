<template>
  <div
    v-if="suggestions.length > 0"
    class="suggestions-dropdown"
    :class="[
      { 'dropdown-above': isBottomPosition },
      variantClass
    ]"
  >
    <div
      v-for="(suggestion, index) in suggestions"
      :key="suggestion.value"
      class="suggestion-item"
      :class="{ selected: index === selectedIndex }"
      @click="$emit('select', suggestion)"
    >
      <span class="suggestion-value">{{ suggestion.value }}</span>
      <span class="suggestion-label">{{ suggestion.label }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'

export interface Suggestion {
  value: string
  label: string
}

export default defineComponent({
  name: 'SuggestionList',
  props: {
    suggestions: {
      type: Array as PropType<Suggestion[]>,
      required: true
    },
    selectedIndex: {
      type: Number,
      default: -1
    },
    isBottomPosition: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String as PropType<'command' | 'filter' | 'mydeck'>,
      default: 'filter'
    }
  },
  emits: ['select'],
  setup(props) {
    const variantClass = computed(() => {
      switch (props.variant) {
        case 'command':
          return 'command-suggestions'
        case 'mydeck':
          return 'mydeck-suggestions'
        default:
          return ''
      }
    })

    return {
      variantClass
    }
  }
})
</script>

<style lang="scss" scoped>
/* 候補リストドロップダウン */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-top: 4px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  scroll-behavior: smooth;
  will-change: scroll-position; // ブラウザにスクロール最適化を事前通知
  transform: translateZ(0); // ハードウェアアクセラレーション有効化
  contain: layout; // レイアウト計算の最適化

  &.dropdown-above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 4px;
  }
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  transform: translateZ(0); // ハードウェアアクセラレーション
  will-change: background-color; // 背景色変更の最適化

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &.selected {
    transition: none; // キーボード操作時は即座に背景色を変更（ちらつき防止）
    background: var(--color-success);
    color: var(--button-text);

    .suggestion-value {
      color: var(--button-text);
    }

    .suggestion-label {
      color: var(--button-text);
    }
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.suggestion-value {
  font-weight: 600;
  color: var(--text-secondary, #666);
  font-size: 12px;
}

.suggestion-label {
  color: var(--text-primary, #333);
  font-size: 13px;
  font-weight: 600;
}

.command-prefix {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin-right: 4px;
  background: var(--color-info);
  color: var(--button-text);
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  font-weight: bold;
  white-space: nowrap;
}

.mydeck-suggestions {
  z-index: 1000;
}
</style>
