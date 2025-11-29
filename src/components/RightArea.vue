<template>
  <div class="right-area" :class="{ 
    'has-top-input': showSearchInputTop,
    'has-bottom-input': showSearchInputRightBottom,
    'has-left-top-input': showSearchInputLeftTop
  }">
    <!-- 検索入力欄: right-top（全タブ共通） -->
    <div v-if="showSearchInputTop" class="search-input-top-global">
      <SearchInputBar />
    </div>

    <div class="right-area-main">
      <div class="tabs">
        <button
          class="deck-tab"
          :class="{ active: deckStore.activeTab === 'deck' }"
          @click="deckStore.activeTab = 'deck'"
        >
          Deck
        </button>
        <button
          :class="{ active: deckStore.activeTab === 'card' }"
          @click="deckStore.activeTab = 'card'"
        >
          Card
        </button>
        <button
          :class="{ active: deckStore.activeTab === 'search' }"
          @click="deckStore.activeTab = 'search'"
        >
          Search
        </button>
        <button
          :class="{ active: deckStore.activeTab === 'metadata' }"
          @click="deckStore.activeTab = 'metadata'"
        >
          Metadata
        </button>
      </div>

      <div v-show="deckStore.activeTab === 'deck'" class="deck-content">
        <slot name="deck-tab"></slot>
      </div>

      <div v-show="deckStore.activeTab === 'card'" class="card-detail-content">
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

      <div v-show="deckStore.activeTab === 'search'" class="search-content">
        <CardList
          :cards="deckStore.searchResults"
          :sort-order="deckStore.sortOrder"
          :view-mode="deckStore.viewMode"
          section-type="search"
          @scroll="handleScroll"
          @scroll-to-top="handleScrollToTop"
          @update:sortOrder="deckStore.sortOrder = $event"
          @update:viewMode="deckStore.viewMode = $event"
        />
        <div v-if="deckStore.isLoading" class="loading-indicator">読み込み中...</div>
      </div>

      <div v-show="deckStore.activeTab === 'metadata'" class="metadata-content">
        <DeckMetadata />
      </div>
    </div>

    <!-- グローバル検索モード用オーバーレイ -->
    <div v-if="deckStore.isGlobalSearchMode" class="global-search-overlay" @click="closeGlobalSearch"></div>

    <!-- 検索入力欄: default位置（画面下部） -->
    <div v-if="showSearchInputBottom || deckStore.isGlobalSearchMode" class="search-input-bottom" :class="{ 'global-search-mode': deckStore.isGlobalSearchMode }">
      <SearchInputBar
        ref="searchInputBarRef"
        @escape="closeGlobalSearch"
      />
    </div>
    
    <!-- 検索入力欄: right-bottom（全タブ共通） -->
    <div v-if="showSearchInputRightBottom" class="search-input-bottom-fixed">
      <SearchInputBar />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { getCardDetailWithCache } from '../api/card-search'
import CardList from './CardList.vue'
import CardDetail from './CardDetail.vue'
import DeckMetadata from './DeckMetadata.vue'
import SearchInputBar from './SearchInputBar.vue'

export default {
  name: 'RightArea',
  components: {
    CardList,
    CardDetail,
    DeckMetadata,
    SearchInputBar
  },
  setup() {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const searchInputBarRef = ref(null)

    // 検索入力欄をデフォルト位置（画面下部、左側も含む）に表示するかどうか
    const showSearchInputBottom = computed(() => {
      const result = settingsStore.appSettings.searchInputPosition === 'default'
      console.log('[RightArea] showSearchInputBottom:', result, 'position:', settingsStore.appSettings.searchInputPosition)
      return result
    })
    
    // 検索入力欄をRight Area上部に表示するかどうか
    const showSearchInputTop = computed(() => {
      const result = settingsStore.appSettings.searchInputPosition === 'right-top'
      console.log('[RightArea] showSearchInputTop:', result, 'position:', settingsStore.appSettings.searchInputPosition)
      return result
    })
    
    // 検索入力欄をRight Area下部に表示するかどうか
    const showSearchInputRightBottom = computed(() => {
      const result = settingsStore.appSettings.searchInputPosition === 'right-bottom'
      console.log('[RightArea] showSearchInputRightBottom:', result, 'position:', settingsStore.appSettings.searchInputPosition)
      return result
    })
    
    // 検索入力欄が左上（section-title）にあるかどうか
    const showSearchInputLeftTop = computed(() => {
      return settingsStore.appSettings.searchInputPosition === 'section-title'
    })

    // グローバル検索モードを閉じる
    const closeGlobalSearch = () => {
      console.log('[RightArea] closeGlobalSearch called', new Error().stack)
      deckStore.isGlobalSearchMode = false
    }

    // グローバル検索モードになったらinputにフォーカス
    watch(() => deckStore.isGlobalSearchMode, (isActive) => {
      if (isActive) {
        nextTick(() => {
          if (searchInputBarRef.value) {
            searchInputBarRef.value.focus()
          }
        })
      }
    })

    // タブ切り替え時にスクロールを一番上に戻す
    watch(() => deckStore.activeTab, () => {
      nextTick(() => {
        const contentSelectors = ['.search-content', '.card-detail-content', '.metadata-content', '.deck-content']
        contentSelectors.forEach(selector => {
          const el = document.querySelector(selector)
          if (el) {
            el.scrollTop = 0
          }
        })
      })
    })

    // 選択カード変更時にcard-detail-content内のスクロールをリセット
    watch(() => deckStore.selectedCard, () => {
      nextTick(() => {
        const cardDetailContent = document.querySelector('.card-detail-content')
        if (cardDetailContent) {
          cardDetailContent.scrollTop = 0
        }
        // CardDetail内のcard-tab-contentもリセット
        const cardTabContent = document.querySelector('.card-tab-content')
        if (cardTabContent) {
          cardTabContent.scrollTop = 0
        }
      })
    })

    const processCards = (cards) => {
      const gameType = detectCardGameType()
      return cards.map(card => {
        const relativeUrl = getCardImageUrl(card, gameType)
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
    
    const showCardDetail = async (card) => {
      try {
        const result = await getCardDetailWithCache(card.cardId)
        const fullCard = result?.detail?.card || card
        deckStore.selectedCard = fullCard
      } catch (e) {
        console.error('[RightArea] Failed to fetch full card detail:', e)
        deckStore.selectedCard = card
      }
      deckStore.activeTab = 'card'
      deckStore.cardTab = 'info'
    }

    const handleScrollToTop = () => {
      const cardListResults = document.querySelector('.search-content .card-list-results')
      if (cardListResults) {
        cardListResults.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    return {
      deckStore,
      showSearchInputBottom,
      showSearchInputTop,
      showSearchInputRightBottom,
      showSearchInputLeftTop,
      searchInputBarRef,
      closeGlobalSearch,
      handleScroll,
      showCardDetail,
      handleScrollToTop
    }
  }
}
</script>

<style scoped lang="scss">
.right-area {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  margin: 0 0 0 10px;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.right-area-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  margin: 0;
}

@media (max-width: 768px) {
  .right-area {
    width: 100% !important;
    margin: 0 !important;
  }
  
  /* 検索入力欄が左上（section-title）にある場合：上に隙間 */
  .right-area.has-left-top-input {
    height: calc(100% - 65px) !important;
    margin-top: 65px !important;
  }
  
  /* 検索入力欄が下部にある場合：下に隙間 */
  .right-area.has-bottom-input {
    height: calc(100% - 65px) !important;
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
    border-right: 1px solid #e0e0e0;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    transition: background 0.2s, color 0.2s;

    &:last-child {
      border-right: none;
    }

    &:hover:not(.active):not(.tab-header) {
      background: var(--bg-secondary);
      color: var(--color-info);
    }

    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: var(--text-primary);
    }

    &.tab-header {
      background: var(--bg-tertiary);
      color: var(--text-tertiary);
      cursor: default;
      font-style: italic;
      opacity: 0.7;
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

.deck-content, .search-content, .card-detail-content, .metadata-content {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

.metadata-content {
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
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
  padding: 15px;
}

.search-input-top-global {
  flex-shrink: 0;
  z-index: 10;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.search-input-bottom-fixed {
  flex-shrink: 0;
  z-index: 10;
  margin-top: auto;
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
}

.card-detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  margin: 0;
}

.loading-indicator {
  text-align: center;
  padding: 10px;
  color: var(--text-secondary);
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
  color: var(--text-primary);
}

.card-text {
  font-size: 10px;
  color: var(--text-secondary);
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
    border-right: 1px solid var(--border-primary, #e0e0e0);
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary);

    &:last-child {
      border-right: none;
    }

    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: var(--button-text);
      border-right-color: transparent;
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
  color: var(--text-primary);
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
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 11px;
  
  &.stat-box-full {
    width: 100%;
  }
  
  &.stat-box-type {
    width: 100%;
    transform: skewX(-10deg);
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
    justify-content: center;
    
    .stat-text {
      transform: skewX(10deg);
    }
  }
}

.stat-text {
  font-size: 11px;
  font-weight: bold;
  color: var(--text-primary);
}

.link-markers-box {
  padding: 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
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
  border: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  font-size: 14px;
  
  &.active {
    background: var(--button-bg);
    color: var(--button-text);
    font-weight: bold;
  }
  
  &:nth-child(5) {
    background: var(--bg-secondary);
  }
}

.stat-label {
  font-size: 9px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.stat-value {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-primary);
}

.card-type-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 11px;
}

.card-atk-def {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-primary);
  padding: 6px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
}

.card-ruby {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: -5px;
}

.card-type-info {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--bg-secondary);
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
  color: var(--text-secondary);
  min-width: 80px;
}

.stat-value {
  color: var(--text-primary);
}

.card-pendulum-effect,
.card-effect-text,
.card-effect-section {
  margin-top: 5px;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 6px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px 4px 0 0;
}

.effect-text {
  font-size: 11px;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 8px;
  border: 1px solid var(--border-primary);
  border-radius: 0 0 4px 4px;
  background: var(--bg-primary);
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.search-input-bottom {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 340px;
  display: flex;
  flex-direction: row;
  z-index: 100;
  transition: all 0.2s ease;

  // グローバル検索モード時のスタイル
  &.global-search-mode {
    bottom: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, 50%);
    width: 90%;
    max-width: 600px;
    z-index: 10001;
    animation: scaleIn 0.2s ease;

    .search-input-wrapper {
      height: 56px;
      min-height: 56px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .search-input {
      font-size: 18px;
    }
  }
}

// グローバル検索モードのオーバーレイ
.global-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--dialog-overlay-bg);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: translate(-50%, 50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 50%) scale(1);
  }
}

@media (max-width: 768px) {
  .search-input-bottom {
    right: 20px;
  }
}
</style>
