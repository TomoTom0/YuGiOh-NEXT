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
      <div class="tabs" :style="{ '--tab-count': tabCount }">
        <button
          v-if="practiceMode"
          class="practice-tab"
          :class="{ active: deckStore.activeTab === 'practice' }"
          @click="deckStore.activeTab = 'practice'"
        >
          Practice
        </button>
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
        <button
          v-if="chatFeatureEnabled"
          :class="{ active: deckStore.activeTab === 'chat' }"
          @click="deckStore.activeTab = 'chat'"
        >
          Chat
        </button>
      </div>

      <div v-show="deckStore.activeTab === 'practice'" ref="practiceContentRef" class="practice-content tab-content">
        <slot name="practice-tab"></slot>
      </div>

      <div v-show="deckStore.activeTab === 'deck'" ref="deckContentRef" class="deck-content tab-content">
        <slot name="deck-tab"></slot>
      </div>

      <div v-show="deckStore.activeTab === 'card'" ref="cardDetailContentRef" class="card-detail-content tab-content">
        <CardDetail :card="cardDetailStore.selectedCard" />
      </div>

      <div v-show="deckStore.activeTab === 'search'" ref="searchContentRef" class="search-content">
        <CardList
          :cards="searchStore.searchResults"
          :sort-order="deckStore.sortOrder"
          :view-mode="deckStore.viewMode"
          section-type="search"
          @scroll="handleScroll"
          @update:sortOrder="deckStore.sortOrder = $event"
          @update:viewMode="deckStore.viewMode = $event"
        />
        <div v-if="searchStore.isLoading" class="loading-indicator">読み込み中...</div>
      </div>

      <div v-show="deckStore.activeTab === 'metadata'" ref="metadataContentRef" class="metadata-content">
        <DeckMetadata />
      </div>

      <div v-show="chatFeatureEnabled && deckStore.activeTab === 'chat'" class="chat-content">
        <ChatPanel />
      </div>
    </div>

    <!-- グローバル検索モード用オーバーレイ -->
    <div v-if="searchStore.isGlobalSearchMode" class="global-search-overlay" @click="closeGlobalSearch"></div>

    <!-- 検索入力欄: default位置（画面下部） -->
    <div v-if="showSearchInputBottom || searchStore.isGlobalSearchMode" class="search-input-bottom" :class="{ 'global-search-mode': searchStore.isGlobalSearchMode }">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent, inject } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSearchStore } from '../stores/search'
import { useCardDetailStore } from '../stores/card-detail'
import { useSettingsStore } from '../stores/settings'
import CardList from './CardList.vue'
const CardDetail = defineAsyncComponent(() => import('./CardDetail.vue'))
import DeckMetadata from './DeckMetadata.vue'
import ChatPanel from './ChatPanel.vue'
import SearchInputBar from './searchInputBar/SearchInputBar.vue'
import { buildFullUrl } from '../utils/url-builder'
import { useCardDetailDisplay } from '../composables/useCardDetailDisplay'

export default {
  name: 'RightArea',
  components: {
    CardList,
    CardDetail,
    DeckMetadata,
    ChatPanel,
    SearchInputBar
  },
  setup() {
    const deckStore = useDeckEditStore()
    const searchStore = useSearchStore()
    const cardDetailStore = useCardDetailStore()
    const settingsStore = useSettingsStore()
    const searchInputBarRef = ref(null)
    const practiceContentRef = ref(null)
    const deckContentRef = ref(null)
    const cardDetailContentRef = ref(null)
    const searchContentRef = ref(null)
    const metadataContentRef = ref(null)
    const practiceMode = inject('practiceMode', ref(false))

    const chatFeatureEnabled = computed(() => {
      return settingsStore.featureSettings.chat
    })

    const tabCount = computed(() => {
      let count = 3 // Card, Search, Metadata
      if (practiceMode.value) count++
      if (chatFeatureEnabled.value) count++
      return count
    })

    // 検索入力欄をデフォルト位置（画面下部、左側も含む）に表示するかどうか
    const showSearchInputBottom = computed(() => {
      const result = settingsStore.appSettings.ux.searchInputPosition === 'default'
      return result
    })

    // 検索入力欄をRight Area上部に表示するかどうか
    const showSearchInputTop = computed(() => {
      const result = settingsStore.appSettings.ux.searchInputPosition === 'right-top'
      return result
    })

    // 検索入力欄をRight Area下部に表示するかどうか
    const showSearchInputRightBottom = computed(() => {
      const result = settingsStore.appSettings.ux.searchInputPosition === 'right-bottom'
      return result
    })

    // 検索入力欄が左上（section-title）にあるかどうか
    const showSearchInputLeftTop = computed(() => {
      return settingsStore.appSettings.ux.searchInputPosition === 'section-title'
    })

    // グローバル検索モードを閉じる
    const closeGlobalSearch = () => {
      searchStore.isGlobalSearchMode = false
    }

    // グローバル検索モードになったらinputにフォーカス
    watch(() => searchStore.isGlobalSearchMode, (isActive) => {
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
        const refs = [searchContentRef, cardDetailContentRef, metadataContentRef, deckContentRef]
        refs.forEach(r => {
          if (r.value) {
            r.value.scrollTop = 0
          }
        })
      })
    })

    // 選択カード変更時にcard-detail-content内のスクロールをリセット
    watch(() => cardDetailStore.selectedCard, () => {
      nextTick(() => {
        if (cardDetailContentRef.value) {
          cardDetailContentRef.value.scrollTop = 0
        }
        // CardDetail内のcard-tab-contentもリセット
        const cardTabContent = cardDetailContentRef.value?.querySelector('.card-tab-content')
        if (cardTabContent) {
          cardTabContent.scrollTop = 0
        }
      })
    })

    const processCards = (cards) => {
      const gameType = detectCardGameType()
      return cards.map(card => {
        const relativeUrl = getCardImageUrl(card, gameType)
        const imageUrl = relativeUrl ? buildFullUrl(relativeUrl) : undefined
        return {
          ...card,
          imageUrl
        }
      })
    }

    const loadMoreResults = async () => {
      if (!searchStore.hasMore || searchStore.isLoading) return
      
      searchStore.isLoading = true
      try {
        searchStore.hasMore = false
      } catch (error) {
        console.error('Error loading more results:', error)
      } finally {
        searchStore.isLoading = false
      }
    }

    const handleScroll = (event) => {
      const element = event.target
      const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight
      
      if (scrollBottom < 1000 * 60 && searchStore.hasMore && !searchStore.isLoading) {
        loadMoreResults()
      }
    }
    
    const { showCardDetail: showDetailFromComposable } = useCardDetailDisplay()

    const showCardDetail = (card) => {
      return showDetailFromComposable(card.cardId, { fallbackCard: card })
    }

    return {
      deckStore,
      searchStore,
      cardDetailStore,
      practiceMode,
      chatFeatureEnabled,
      tabCount,
      practiceContentRef,
      deckContentRef,
      cardDetailContentRef,
      searchContentRef,
      metadataContentRef,
      showSearchInputBottom,
      showSearchInputTop,
      showSearchInputRightBottom,
      showSearchInputLeftTop,
      searchInputBarRef,
      closeGlobalSearch,
      handleScroll,
      showCardDetail
    }
  }
}
</script>

<style scoped lang="scss">
.right-area {
  flex-grow: var(--right-area-flex-grow, 0);
  flex-shrink: var(--right-area-flex-shrink, 0);
  flex-basis: var(--right-area-flex-basis, 400px);
  max-width: var(--right-area-max-width, none);
  width: var(--right-area-width, 400px);
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  margin: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .right-area {
    width: 100% !important;
    max-width: none !important;
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
  grid-template-columns: repeat(var(--tab-count, 3), 1fr);
  border-bottom: 2px solid #008cff;
  margin: 0;

  button {
    padding: 8px;
    border: none;
    border-right: 1px solid #e0e0e0;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: calc(var(--right-area-font-size, 14px) * 0.93);
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
      color: var(--theme-text-on-gradient);
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
    grid-template-columns: repeat(calc(var(--tab-count, 3) + 1), 1fr);
    
    button.deck-tab {
      display: block;
    }
  }
}

.tab-content {
  animation: fadeIn 0.2s ease-in-out;
}

.practice-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}


.deck-content, .search-content, .card-detail-content, .metadata-content, .chat-content {
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

.chat-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.search-content {
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
  font-size: calc(var(--right-area-font-size, 14px) * 0.93);
  grid-column: 1 / -1;
}

/* CardList.vue の子コンポーネントにスタイルが移譲済み */

/* CardDetail.vue の子コンポーネントにスタイルが移譲済み */

/* CardInfoTab.vue（CardDetailの子コンポーネント）にスタイルが移譲済み */

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
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
      font-size: calc(var(--right-area-font-size, 14px) * 1.29);
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
