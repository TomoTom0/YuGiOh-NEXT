<template>
  <div class="dialog-body history-tab">
    <!-- 空の状態 -->
    <div v-if="historyItems.length === 0" class="history-empty">
      検索履歴はありません
    </div>

    <!-- 履歴リスト -->
    <div v-else>
      <!-- お気に入り履歴 -->
      <div v-if="favoriteItems.length > 0" class="history-section">
        <div class="history-section-title">Favorites</div>
        <div class="history-list">
          <HistoryItem
            v-for="(item, index) in favoriteItems"
            :key="`fav-${index}`"
            :item="item"
            :is-favorite="true"
            @execute="handleExecute(item)"
            @toggle-favorite="handleToggleFavorite(item)"
            @remove="handleRemove(item)"
          />
        </div>
      </div>

      <!-- 通常の履歴 -->
      <div v-if="regularItems.length > 0" class="history-section">
        <div v-if="favoriteItems.length > 0" class="history-section-title">Recent</div>
        <div class="history-list">
          <HistoryItem
            v-for="(item, index) in regularItems"
            :key="`reg-${index}`"
            :item="item"
            :is-favorite="false"
            @execute="handleExecute(item)"
            @toggle-favorite="handleToggleFavorite(item)"
            @remove="handleRemove(item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import HistoryItem from './HistoryItem.vue';
import type { SearchHistoryItem } from '@/types/search-history';

// Props
// @ts-ignore - Used by defineProps
interface Props {
  historyItems: SearchHistoryItem[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'execute': [item: SearchHistoryItem];
  'toggle-favorite': [item: SearchHistoryItem];
  'remove': [item: SearchHistoryItem];
}>();

// Computed
const favoriteItems = computed(() => {
  return props.historyItems.filter(item => item.isFavorite);
});

const regularItems = computed(() => {
  return props.historyItems.filter(item => !item.isFavorite);
});

// Methods
function handleExecute(item: SearchHistoryItem) {
  emit('execute', item);
}

function handleToggleFavorite(item: SearchHistoryItem) {
  emit('toggle-favorite', item);
}

function handleRemove(item: SearchHistoryItem) {
  emit('remove', item);
}
</script>

<style scoped lang="scss">
.history-tab {
  width: 100%;
}

.history-empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
  font-size: 1rem;
}

.history-section {
  margin-bottom: 1.5rem;
}

.history-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding: 0 0.5rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
