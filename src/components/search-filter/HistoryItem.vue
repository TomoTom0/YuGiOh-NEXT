<template>
  <div class="history-item">
    <div class="history-item-content">
      <!-- フィルターアイコン -->
      <div class="history-chips">
        <span
          v-for="(icon, idx) in filterIcons"
          :key="idx"
          class="history-chip"
          :class="icon.type"
        >
          {{ icon.label }}
        </span>
      </div>

      <!-- クエリ情報 -->
      <div class="history-query">
        <span class="history-mode">{{ item.searchMode }}</span>
        <span class="history-text">{{ item.query || '(空)' }}</span>
        <span class="history-count">{{ item.resultCount }}件</span>
      </div>
    </div>

    <!-- アクション -->
    <div class="history-actions">
      <!-- 検索ボタン -->
      <button class="history-btn search-btn" @click="emit('execute')" title="検索">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- お気に入りボタン -->
      <button
        class="history-btn favorite-btn"
        :class="{ active: isFavorite }"
        @click="emit('toggle-favorite')"
        title="お気に入り"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
            :fill="isFavorite ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
      </button>

      <!-- 削除ボタン -->
      <button class="history-btn delete-btn" @click="emit('remove')" title="削除">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SearchHistoryItem } from '@/types/search-history';
import { convertFiltersToIcons } from '@/utils/filter-icons';

// Props
// @ts-ignore - Used by defineProps
interface Props {
  item: SearchHistoryItem;
  isFavorite: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'execute': [];
  'toggle-favorite': [];
  'remove': [];
}>();

// フィルターアイコンの生成
const filterIcons = computed(() => {
  return convertFiltersToIcons(props.item.filters);
});
</script>

<style scoped lang="scss">
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  transition: background 0.2s;
  gap: 1rem;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-chips {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.history-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  border-radius: 0.25rem;
  background: var(--chip-bg);
  color: var(--chip-text);
  font-weight: 500;
  white-space: nowrap;

  &.type {
    background: var(--accent-primary);
    color: white;
  }

  &.attribute {
    background: var(--accent-secondary);
    color: white;
  }

  &.race {
    background: var(--accent-tertiary);
    color: white;
  }

  &.monster-type {
    background: var(--accent-quaternary);
    color: white;
  }
}

.history-query {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 1rem;
  flex-wrap: wrap;
}

.history-mode {
  padding: 0.25rem 0.6rem;
  background: var(--badge-bg);
  border-radius: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--badge-text);
  white-space: nowrap;
}

.history-text {
  flex: 1;
  min-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.history-count {
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.history-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--text-primary);
  }

  &.favorite-btn.active {
    color: var(--accent-danger);
  }

  &.delete-btn:hover {
    color: var(--accent-danger);
  }
}
</style>
