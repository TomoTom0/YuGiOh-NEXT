<template>
  <div class="right-area">
    <div class="tabs">
      <button
        class="deck-tab"
        :class="{ active: deckStore.activeTab === 'deck' }"
        @click="deckStore.activeTab = 'deck'"
      >
        Deck
      </button>
      <button class="tab-header" disabled>Header</button>
      <button
        :class="{ active: deckStore.activeTab === 'search' }"
        @click="deckStore.activeTab = 'search'"
      >
        Search
      </button>
      <button
        :class="{ active: deckStore.activeTab === 'card' }"
        @click="deckStore.activeTab = 'card'"
      >
        Card
      </button>
    </div>

    <div v-if="deckStore.activeTab === 'deck'" class="deck-content">
      <slot name="deck-tab"></slot>
    </div>

    <div v-if="deckStore.activeTab === 'search'" class="search-content">
      <div class="search-toolbar">
        <div class="toolbar-left">
          <svg class="sort-icon" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9.25,5L12.5,1.75L15.75,5H9.25M15.75,19L12.5,22.25L9.25,19H15.75M8.89,14.3H6L5.28,17H2.91L6,7H9L12.13,17H9.67L8.89,14.3M6.33,12.68H8.56L7.93,10.56L7.67,9.59L7.42,8.63H7.39L7.17,9.6L6.93,10.58L6.33,12.68M13.05,17V15.74L17.8,8.97V8.91H13.5V7H20.73V8.34L16.09,15V15.08H20.8V17H13.05Z" />
          </svg>
          <select v-model="deckStore.sortOrder" class="sort-select" @change="handleSortChange">
            <option value="release_desc">Newer</option>
            <option value="release_asc">Older</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
        <div class="view-switch">
          <label class="view-option">
            <input type="radio" v-model="deckStore.viewMode" value="list" name="viewMode">
            <span class="icon">☰</span>
          </label>
          <label class="view-option">
            <input type="radio" v-model="deckStore.viewMode" value="grid" name="viewMode">
            <span class="icon">▦</span>
          </label>
        </div>
      </div>
      
      <div class="search-results" :class="{ 'grid-view': deckStore.viewMode === 'grid' }" @scroll="handleScroll">
        <div
          v-for="(card, idx) in deckStore.searchResults"
          :key="`search-${idx}`"
          class="search-result-item"
        >
          <div class="card-wrapper">
            <DeckCard
              :card="card"
              :section-type="'search'"
              :index="idx"
            />
          </div>
          <div class="card-info" v-if="deckStore.viewMode === 'list'">
            <div class="card-name">{{ card.name }}</div>
            <div class="card-text">{{ card.text }}</div>
          </div>
        </div>
        <div v-if="deckStore.isLoading" class="loading-indicator">読み込み中...</div>
      </div>
    </div>

    <div v-if="deckStore.activeTab === 'card'" class="card-detail-content">
      <CardDetail 
        v-if="deckStore.selectedCard" 
        :card="deckStore.selectedCard"
        :card-tab="deckStore.cardTab"
        @tab-change="deckStore.cardTab = $event"
      />
      <div v-else class="no-card-selected">
        <p>カードを選択してください</p>
      </div>
    </div>

    <div class="search-input-bottom">
      <input
        v-model="deckStore.searchQuery"
        type="text"
        placeholder="カード名を検索..."
        @keyup.enter="handleSearchInput"
      >
      <button class="search-btn" @click="handleSearchInput">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { useDeckEditStore } from '../stores/deck-edit'
import { searchCardsByName, buildCardImageUrl } from '../api/card-search'
import DeckCard from './DeckCard.vue'
import CardDetail from './CardDetail.vue'

export default {
  name: 'RightArea',
  components: {
    DeckCard,
    CardDetail
  },
  setup() {
    const deckStore = useDeckEditStore()

    const sortResults = (results) => {
      const sorted = [...results]
      switch (deckStore.sortOrder) {
        case 'release_desc':
          return sorted.sort((a, b) => (b.releaseDate || 0) - (a.releaseDate || 0))
        case 'release_asc':
          return sorted.sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0))
        case 'name_asc':
          return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        case 'name_desc':
          return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        default:
          return sorted
      }
    }

    const processCards = (cards) => {
      return cards.map(card => {
        const relativeUrl = buildCardImageUrl(card)
        const imageUrl = relativeUrl ? `https://www.db.yugioh-card.com${relativeUrl}` : undefined
        return {
          ...card,
          imageUrl
        }
      })
    }

    const loadMoreResults = async () => {
      if (!deckStore.hasMore || deckStore.isLoading) return
      
      deckStore.isLoading = true
      try {
        console.log('Loading more results, page:', deckStore.currentPage + 1)
        deckStore.hasMore = false
      } catch (error) {
        console.error('Error loading more results:', error)
      } finally {
        deckStore.isLoading = false
      }
    }

    const handleScroll = (event) => {
      const element = event.target
      const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight
      
      if (scrollBottom < 1000 * 60 && deckStore.hasMore && !deckStore.isLoading) {
        loadMoreResults()
      }
    }

    const handleSearchInput = async () => {
      if (!deckStore.searchQuery.trim()) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }
      
      deckStore.activeTab = 'search'
      deckStore.isLoading = true
      
      try {
        const results = await searchCardsByName(deckStore.searchQuery.trim(), 100)
        console.log('Initial search results:', results.length)
        
        const processed = processCards(results)
        const sorted = sortResults(processed)
        deckStore.searchResults = sorted
        deckStore.allResults = sorted
        
        if (results.length >= 100) {
          deckStore.hasMore = true
          
          setTimeout(async () => {
            try {
              const moreResults = await searchCardsByName(deckStore.searchQuery.trim(), 2000)
              console.log('Extended search results:', moreResults.length)
              
              if (moreResults.length > 100) {
                const allProcessed = processCards(moreResults)
                const allSorted = sortResults(allProcessed)
                deckStore.searchResults = allSorted
                deckStore.allResults = allSorted
                
                deckStore.hasMore = moreResults.length >= 2000
                deckStore.currentPage = 1
              } else {
                deckStore.hasMore = false
              }
            } catch (error) {
              console.error('Extended search error:', error)
              deckStore.hasMore = false
            }
          }, 1000)
        } else {
          deckStore.hasMore = false
        }
      } catch (error) {
        console.error('Search error:', error)
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
      } finally {
        deckStore.isLoading = false
      }
    }

    const handleSortChange = () => {
      const sorted = sortResults(deckStore.allResults)
      deckStore.searchResults = sorted
    }

    const showCardDetail = (card) => {
      deckStore.selectedCard = card
      deckStore.activeTab = 'card'
      deckStore.cardTab = 'info'
    }

    return {
      deckStore,
      handleSearchInput,
      handleSortChange,
      handleScroll,
      showCardDetail
    }
  }
}
</script>

<style scoped lang="scss">
.right-area {
  width: 320px;
  background: white;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  margin: 0 0 0 10px;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

@media (max-width: 768px) {
  .right-area {
    width: 100% !important;
    margin: 0 !important;
    border-left: none !important;
  }
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 2px solid #008cff;
  margin: 0;

  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: #333;

    &.active {
      background: #008cff;
      color: white;
    }
    
    &.tab-header {
      background: #f0f0f0;
      cursor: default;
    }
    
    &.deck-tab {
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .tabs {
    grid-template-columns: repeat(4, 1fr);
    
    button.deck-tab {
      display: block;
    }
  }
}

.deck-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.search-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.card-detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  margin: 0;
}

.search-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  color: #666;
  flex-shrink: 0;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  min-width: 100px;
  
  &:focus {
    outline: none;
    border-color: #008cff;
  }
}

.view-switch {
  display: flex;
  gap: 4px;
  
  .view-option {
    display: flex;
    align-items: center;
    cursor: pointer;
    
    input[type="radio"] {
      display: none;
    }
    
    .icon {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      color: #666;
      font-size: 16px;
    }
    
    input:checked + .icon {
      background: #008cff;
      color: white;
      border-color: #008cff;
    }
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  min-height: 0;
  
  &.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, 60px);
    grid-auto-rows: max-content;
    gap: 2px;
    align-content: start;
    width: 100%;
    
    .search-result-item {
      flex-direction: column;
      min-height: auto;
      padding: 0;
      border: none;
      background: none;
      width: 60px;
    }
    
    .card-wrapper {
      width: 60px;
    }
    
    .card-info {
      display: none;
    }
  }
}

.search-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: move;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  min-height: 90px;
}

.loading-indicator {
  text-align: center;
  padding: 10px;
  color: #666;
  font-size: 13px;
  grid-column: 1 / -1;
}

.card-wrapper {
  position: relative;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 2px;
  word-break: break-word;
  color: #000;
}

.card-text {
  font-size: 10px;
  color: #666;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid #008cff;
  
  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #333;
    
    &.active {
      background: #008cff;
      color: white;
    }
  }
}

.card-tab-content {
  padding: 15px;
}

.card-info-layout {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-info-top {
  display: flex;
  gap: 15px;
}

.card-info-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-image-large {
  flex-shrink: 0;
  width: 80px;
  
  img {
    width: 100%;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
}

.card-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-name-large {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.card-stats-layout {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 11px;
  
  &.stat-box-full {
    width: 100%;
  }
  
  &.stat-box-type {
    width: 100%;
    transform: skewX(-10deg);
    background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
    justify-content: center;
    
    .stat-text {
      transform: skewX(10deg);
    }
  }
}

.stat-text {
  font-size: 11px;
  font-weight: bold;
  color: #333;
}

.link-markers-box {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
}

.link-markers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-top: 6px;
}

.marker-cell {
  width: 24px;
  height: 24px;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  font-size: 14px;
  
  &.active {
    background: #008cff;
    color: white;
    font-weight: bold;
  }
  
  &:nth-child(5) {
    background: #f0f0f0;
  }
}

.stat-label {
  font-size: 9px;
  color: #999;
  text-transform: uppercase;
}

.stat-value {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.card-type-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 11px;
}

.card-atk-def {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
}

.card-ruby {
  font-size: 11px;
  color: #666;
  margin-top: -5px;
}

.card-type-info {
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  gap: 8px;
}

.stat-label {
  font-weight: bold;
  color: #555;
  min-width: 80px;
}

.stat-value {
  color: #333;
}

.card-pendulum-effect,
.card-effect-text,
.card-effect-section {
  margin-top: 5px;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px 4px 0 0;
}

.effect-text {
  font-size: 11px;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  background: #fff;
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: #999;
}

.search-input-bottom {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 340px;
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 100;

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    padding: 5px;
    background: white !important;
    color: #000 !important;
    
    &::placeholder {
      color: #999 !important;
    }
  }
}

.search-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;

  &:hover {
    color: #008cff;
  }
}
</style>
