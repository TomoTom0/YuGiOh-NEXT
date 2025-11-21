<template>
  <div class="card-list-wrapper">
    <button 
      class="scroll-to-top-btn"
      @click="$emit('scroll-to-top')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
      </svg>
    </button>
    <div class="card-list-toolbar">
      <div class="toolbar-left">
        <svg class="sort-icon" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.25,5L12.5,1.75L15.75,5H9.25M15.75,19L12.5,22.25L9.25,19H15.75M8.89,14.3H6L5.28,17H2.91L6,7H9L12.13,17H9.67L8.89,14.3M6.33,12.68H8.56L7.93,10.56L7.67,9.59L7.42,8.63H7.39L7.17,9.6L6.93,10.58L6.33,12.68M13.05,17V15.74L17.8,8.97V8.91H13.5V7H20.73V8.34L16.09,15V15.08H20.8V17H13.05Z" />
        </svg>
        <select v-model="localSortOrder" class="sort-select" @change="$emit('sort-change', localSortOrder)">
          <option value="release_desc">Newer</option>
          <option value="release_asc">Older</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
        </select>
      </div>
      <div class="view-switch">
        <label class="view-option">
          <input type="radio" v-model="localViewMode" value="list" :name="`view-${uniqueId}`">
          <span class="icon">☰</span>
        </label>
        <label class="view-option">
          <input type="radio" v-model="localViewMode" value="grid" :name="`view-${uniqueId}`">
          <span class="icon">▦</span>
        </label>
      </div>
    </div>
    <div
      :key="localSortOrder"
      class="card-list-results"
      :class="{ 'grid-view': localViewMode === 'grid' }"
      @scroll="$emit('scroll', $event)"
    >
      <div
        v-for="(item, idx) in cardsWithUuid"
        :key="item.uuid"
        class="card-result-item"
      >
        <div class="card-wrapper">
          <DeckCard
            :card="item.card"
            :section-type="sectionType"
            :index="idx"
            :uuid="item.uuid"
          />
        </div>
        <div class="card-info" v-if="localViewMode === 'list'">
          <div class="card-name">{{ item.card.name }}</div>
          <div class="card-text" v-if="item.card.text">{{ item.card.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'
import DeckCard from './DeckCard.vue'

export default {
  name: 'CardList',
  components: {
    DeckCard
  },
  props: {
    cards: {
      type: Array,
      required: true
    },
    sectionType: {
      type: String,
      default: 'search'
    },
    sortOrder: {
      type: String,
      default: 'release_desc'
    },
    viewMode: {
      type: String,
      default: 'list'
    },
    uniqueId: {
      type: String,
      default: () => `list-${Math.random().toString(36).substr(2, 9)}`
    }
  },
  emits: ['sort-change', 'scroll', 'scroll-to-top', 'update:sortOrder', 'update:viewMode'],
  setup(props, { emit }) {
    const localSortOrder = ref(props.sortOrder)
    const localViewMode = ref(props.viewMode)

    // 各カードにUUIDを付与（初回のみ生成、cardsが変わったら再生成）
    const cardsWithUuid = computed(() => {
      return props.cards.map((card) => ({
        card,
        uuid: crypto.randomUUID()
      }))
    })

    watch(() => props.sortOrder, (val) => {
      localSortOrder.value = val
    })

    watch(() => props.viewMode, (val) => {
      localViewMode.value = val
    })

    watch(localSortOrder, (val) => {
      emit('update:sortOrder', val)
    })

    watch(localViewMode, (val) => {
      emit('update:viewMode', val)
    })

    return {
      localSortOrder,
      localViewMode,
      cardsWithUuid
    }
  }
}
</script>

<style scoped lang="scss">
.card-list-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.scroll-to-top-btn {
  position: sticky;
  top: 8px;
  left: 8px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 20;
  margin: 0 0 -32px 8px;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-secondary);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  svg {
    display: block;
  }
}

.card-list-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 0;
  background: transparent;
  border-bottom: none;
  width: calc(100% - 48px);
  margin-left: 48px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-icon {
  color: var(--text-primary);
  flex-shrink: 0;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 11px;
  background: var(--input-bg);
  color: var(--input-text);
  cursor: pointer;

  option {
    color: var(--text-primary);
    background: var(--bg-primary);
  }
}

.view-switch {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
}

.view-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;

  input {
    display: none;
  }

  .icon {
    padding: 6px 12px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 14px;
    transition: all 0.2s;
    border: none;
    border-right: 1px solid var(--border-primary);
  }

  &:last-child .icon {
    border-right: none;
  }

  input:checked + .icon {
    background: var(--button-bg);
    color: var(--button-text);
  }

  &:hover:not(:has(input:checked)) .icon {
    background: var(--bg-secondary);
  }
}

.card-list-results {
  flex: 1;
  overflow-y: visible;
  overflow-x: hidden;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  animation: fadeInList 0.2s ease;

  &.grid-view {
    display: grid;
    /* グリッド表示用のCSS変数を使用 */
    grid-template-columns: repeat(auto-fill, var(--card-width-grid));
    grid-auto-rows: max-content;
    gap: 4px;
    align-content: start;
    justify-content: start;
  }
}

@keyframes fadeInList {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

.card-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--card-bg);
  cursor: move;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  /* カード高さに16px（padding上下8px×2）を加えた高さ */
  min-height: calc(var(--card-height-list) + 16px);
  align-items: flex-start;

  .grid-view & {
    flex-direction: column;
    min-height: auto;
    padding: 0;
    border: none;
    background: none;
    /* グリッド表示用のCSS変数を使用 */
    width: var(--card-width-grid);
  }
}

.card-wrapper {
  flex-shrink: 0;
  position: relative;
  /* リスト表示用のCSS変数を使用 */
  width: var(--card-width-list);

  .grid-view & {
    /* グリッド表示用のCSS変数を使用 */
    width: var(--card-width-grid);
  }
}

.card-info {
  flex: 1;
  min-width: 0;
  
  .grid-view & {
    display: none;
  }
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  color: var(--text-primary);
  margin-bottom: 4px;
  word-break: break-word;
}

.card-text {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: break-word;
  // 四行省略（一時的な対応）- pending.md参照
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
