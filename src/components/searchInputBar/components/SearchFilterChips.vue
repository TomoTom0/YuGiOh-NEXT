<template>
  <div class="filter-icons-top" :class="{ compact: compact }">
    <!-- 予定チップ（入力が有効な場合のみ） -->
    <span
      v-if="previewChip"
      class="filter-icon-item filter-chip-preview"
      :class="{ 'not-condition': previewChip.isNot }"
      title="Enter で追加"
    >
      <span v-if="previewChip.isNot" class="not-prefix">N-</span>{{ previewChip.label }}
    </span>

    <!-- SearchFilterDialogで選択した条件 -->
    <TransitionGroup name="chip" tag="div" class="chip-group">
      <span
        v-for="(icon, index) in displayFilterIcons"
        :key="`icon-${icon.label}-${icon.type}-${index}`"
        class="filter-icon-item clickable"
        :class="[icon.type, { 'not-condition': icon.isNot }]"
        @click="$emit('remove-icon', icon)"
        :title="`クリックで削除: ${icon.label}`"
      >
        <span v-if="icon.isNot" class="not-prefix">N-</span>{{ icon.label }}
      </span>
    </TransitionGroup>
    <button
      v-if="hasActiveFilters"
      class="clear-filters-btn-top"
      @click="$emit('clear-all')"
      title="検索条件をクリア"
    >×</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { FilterIcon } from '../../../utils/filter-icons'
import type { PreviewChip } from '../../../types/search-ui'

export default defineComponent({
  name: 'SearchFilterChips',
  props: {
    previewChip: {
      type: Object as PropType<PreviewChip | null>,
      default: null
    },
    displayFilterIcons: {
      type: Array as PropType<FilterIcon[]>,
      required: true
    },
    hasActiveFilters: {
      type: Boolean,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  emits: ['remove-icon', 'clear-all']
})
</script>

<style lang="scss" scoped>
/* フィルターアイコン基本スタイル */
.filter-icon-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  font-size: calc(var(--search-ui-font-size, 14px) * 0.64);
  font-weight: 500;
  border-radius: 3px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  white-space: nowrap;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1.2;

  // クリック可能なチップのスタイル
  &.clickable {
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--danger-bg, #ffe6e6);
      border-color: var(--danger-border, #ff4444);
      color: var(--danger-text, #cc0000);
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

/* SearchFilterDialogで選択した条件（上部） - 常に1行分の高さを確保 */
.filter-icons-top {
  display: flex;
  flex-wrap: nowrap;
  gap: 3px;
  width: 100%;
  padding: 0 4px;
  align-items: center;
  overflow: hidden;
  min-height: 16px;
  position: relative;

  .chip-group {
    display: contents;
  }

  // ダイアログ上部のチップは色を変える
  .filter-icon-item {
    font-size: calc(var(--search-ui-font-size, 14px) * 0.64);
    padding: 1px 4px;
    line-height: 1.2;
    background: var(--filter-chip-top-bg, #e6f2ff);
    border-color: var(--filter-chip-top-border, #b3d9ff);
    color: var(--filter-chip-top-text, #0066cc);
    max-width: 70px;

    &.clickable:hover {
      background: var(--danger-bg, #ffe6e6);
      border-color: var(--danger-border, #ff4444);
      color: var(--danger-text, #cc0000);
    }
  }

  /* compactモード（right側）では最大幅を制限 */
  &.compact {
    max-width: 150px;
  }
}

/* 検索条件クリアボタン（右側） */
.clear-filters-btn-top {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  font-size: calc(var(--search-ui-font-size, 14px) * 0.71);
  font-weight: 300;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-left: 4px;

  &:hover {
    background: var(--color-error-bg);
    color: var(--color-error);
    transform: scale(1.2);
  }
}

/* スラッシュコマンドで追加されたチップ（上部表示用） */
.filter-chip-top {
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary, #e0e0e0) !important;
    transform: scale(1.1);
  }

  &.not-condition {
    background: var(--color-error-bg) !important;
    border-color: var(--color-error) !important;
    color: var(--color-error-text) !important;

    &:hover {
      background: var(--color-error-hover-bg) !important;
      border-color: var(--color-error) !important;
    }

    .not-prefix {
      font-weight: 700;
      margin-right: 2px;
    }
  }
}

/* 予定チップ（入力が有効な場合のみ表示） */
.filter-chip-preview {
  background: #c8e6c9 !important; // 明るい緑
  border-color: #81c784 !important;
  color: #2e7d32 !important;
  font-weight: 600;
  animation: pulse 1.5s ease-in-out infinite;

  &.not-condition {
    background: #ffcdd2 !important; // NOT条件の場合は赤系
    border-color: #ef5350 !important;
    color: #c62828 !important;
  }

  .not-prefix {
    font-weight: 700;
    margin-right: 2px;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* チップの追加・削除アニメーション */
.chip-enter-active {
  transition: all 0.3s ease;
}

.chip-leave-active {
  transition: all 0.2s ease;
  position: absolute;
}

.chip-enter-from {
  opacity: 0;
  transform: scale(0.5) translateY(-10px);
}

.chip-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.chip-move {
  transition: transform 0.3s ease;
}
</style>
