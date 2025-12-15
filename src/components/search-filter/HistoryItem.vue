<template>
  <div class="history-item">
    <div class="history-item-content">
      <!-- フィルターアイコン -->
      <div class="history-chips">
        <span
          v-for="(icon, idx) in filterIcons"
          :key="idx"
          class="history-chip"
          :class="icon.cssClass"
        >
          {{ icon.label }}
        </span>
      </div>

      <!-- クエリ情報 -->
      <div class="history-query">
        <span class="history-mode">{{ item.searchMode }}</span>
        <span class="history-text">{{ item.query || '[empty]' }}</span>
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

// typeからCSSクラス名へのマッピング
function getChipClass(type: string): string {
  const typeMap: Record<string, string> = {
    cardType: 'type',
    spellType: 'type',
    trapType: 'type',
    attr: 'attribute',
    race: 'race',
    mtype: 'monster-type'
  };
  return typeMap[type] || type;
}

// フィルターアイコンの生成（CSSクラス付与）
const filterIcons = computed(() => {
  return convertFiltersToIcons(props.item.filters).map(icon => ({
    ...icon,
    cssClass: getChipClass(icon.type)
  }));
});
</script>

<style scoped lang="scss">
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 1rem;
  margin: 0 0.75rem;
  min-height: 40px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-secondary) 100%);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 0.75rem;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  gap: 0.75rem;

  &:hover {
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
    border-color: var(--text-secondary, #999);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
}

.history-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.15rem;
}

.history-chips {
  display: flex;
  gap: 0.3rem;
  min-height: 1.2rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
  width: 100%;
}

.history-chip {
  padding: 0.15rem 0.4rem;
  font-size: calc(var(--search-ui-font-size, 14px) * 0.57);
  border-radius: 0.25rem;
  background: var(--chip-bg);
  color: var(--chip-text);
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid var(--border-primary, #ddd);
  display: inline-flex;
  align-items: center;

  &.type {
    background: linear-gradient(135deg, #e3165b 0%, #d32f2f 100%);
    color: white;
    border: none;
  }

  &.attribute {
    background: linear-gradient(135deg, #00897b 0%, #00796b 100%);
    color: white;
    border: none;
  }

  &.race {
    background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
    color: white;
    border: none;
  }

  &.monster-type {
    background: linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%);
    color: white;
    border: none;
  }

  &.level,
  &.link,
  &.scale {
    background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
    color: #1a1a1a;
    border: none;
    font-weight: 700;
  }

  &.atk,
  &.def {
    background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    color: white;
    border: none;
    font-weight: 700;
  }

  &.linkMarker {
    background: linear-gradient(135deg, #26a69a 0%, #00897b 100%);
    color: white;
    border: none;
    font-weight: 700;
  }
}

.history-query {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: var(--search-ui-font-size);
  flex-wrap: wrap;
  min-height: 1.2rem;
  width: 100%;
}

.history-mode {
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  border-radius: 0.25rem;
  font-size: calc(var(--search-ui-font-size, 14px) * 0.643);
  font-weight: 700;
  color: white;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
}

.history-text {
  flex: 1;
  min-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: var(--search-ui-font-size);
  font-weight: 700;
  letter-spacing: 0.3px;
}

.history-count {
  font-size: calc(var(--search-ui-font-size, 14px) * 0.643);
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  background: var(--bg-tertiary);
  padding: 0.2rem 0.45rem;
  border-radius: 0.25rem;
}

.history-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
  align-items: center;
}

.history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: transparent;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--text-primary);
    transform: scale(1.05);
  }

  &.favorite-btn {
    &.active {
      color: var(--accent-danger, #e91e63);
      background: rgba(233, 30, 99, 0.1);
      border-color: var(--accent-danger, #e91e63);
      animation: favoriteGlow 0.4s ease-out;
    }

    &:hover:not(.active) {
      color: var(--accent-danger, #e91e63);
      border-color: var(--accent-danger, #e91e63);
    }
  }

  &.delete-btn:hover {
    color: var(--accent-danger);
    border-color: var(--accent-danger);
  }
}

@keyframes favoriteGlow {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
