<template>
  <div class="card-list-wrapper">
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
      class="card-list-results" 
      :class="{ 'grid-view': localViewMode === 'grid' }"
      @scroll="$emit('scroll', $event)"
    >
      <div
        v-for="(card, idx) in cards"
        :key="`card-${idx}`"
        class="card-result-item"
      >
        <div class="card-wrapper">
          <DeckCard
            :card="card"
            :section-type="sectionType"
            :index="idx"
          />
        </div>
        <div class="card-info" v-if="localViewMode === 'list'">
          <div class="card-name">{{ card.name }}</div>
          <div class="card-text" v-if="card.text">{{ card.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
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
  emits: ['sort-change', 'scroll', 'update:sortOrder', 'update:viewMode'],
  setup(props, { emit }) {
    const localSortOrder = ref(props.sortOrder)
    const localViewMode = ref(props.viewMode)
    
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
      localViewMode
    }
  }
}
</script>

<style scoped lang="scss">
.card-list-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.card-list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-icon {
  color: #333;
  flex-shrink: 0;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  background: white;
  color: #333;
  cursor: pointer;
  
  option {
    color: #333;
    background: white;
  }
}

.view-switch {
  display: flex;
  gap: 0;
}

.view-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  
  input {
    display: none;
  }
  
  .icon {
    padding: 4px 8px;
    border: 1px solid #ddd;
    background: white;
    color: #666;
    font-size: 14px;
    transition: all 0.2s;
    
    &:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }
    
    &:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }
  
  input:checked + .icon {
    background: #4a9eff;
    color: white;
    border-color: #4a9eff;
  }
  
  &:not(:last-child) .icon {
    border-right: none;
  }
}

.card-list-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  
  &.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, 60px);
    grid-auto-rows: max-content;
    gap: 4px;
    align-content: start;
    justify-content: start;
  }
}

.card-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: move;
  position: relative;
  min-height: 90px;
  
  .grid-view & {
    flex-direction: column;
    min-height: auto;
    padding: 0;
    border: none;
    background: none;
    width: 60px;
  }
}

.card-wrapper {
  flex-shrink: 0;
  position: relative;
  
  .grid-view & {
    width: 60px;
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
  color: #333;
  margin-bottom: 4px;
}

.card-text {
  font-size: 10px;
  color: #666;
  line-height: 1.4;
}
</style>
