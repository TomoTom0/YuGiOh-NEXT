<template>
  <div
    class="deck-section"
    :class="[`${sectionType}-deck`, { 'section-drag-over': isSectionDragOver, 'has-search-in-title': showSearchInTitle }]"
    @dragover.prevent="handleSectionDragOver"
    @dragleave="handleSectionDragLeave"
    @drop="handleEndDrop"
    @dragend="handleDragEnd"
  >
    <h3 :class="{ 'with-search': showSearchInTitle }">
      <span class="title-group">
        {{ title }}
        <span v-if="showCount" class="count">{{ displayCards.length }}</span>
      </span>
      <!-- section-title配置時の検索入力欄 -->
      <div v-if="showSearchInTitle" class="section-search-container">
        <div class="section-search-input">
          <button class="search-mode-btn" @click.stop="toggleSearchModeDropdown">
            <span class="mode-icon">▼</span>
            <span class="mode-text">{{ searchModeLabel }}</span>
          </button>
          <div v-if="showSearchModeDropdown" class="search-mode-dropdown">
            <div class="mode-option" @click="selectSearchMode('name')">カード名</div>
            <div class="mode-option" @click="selectSearchMode('text')">テキスト</div>
            <div class="mode-option" @click="selectSearchMode('pendulum')">Pテキスト</div>
          </div>
          <input
            v-model="deckStore.searchQuery"
            type="text"
            placeholder="検索..."
            @keyup.enter="handleSearch"
          >
          <button
            v-if="deckStore.searchQuery"
            class="clear-btn"
            @click="deckStore.searchQuery = ''"
          >×</button>
          <button class="menu-btn" @click.stop>⋯</button>
          <button class="search-btn" @click="handleSearch">
            <svg width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
          </button>
        </div>
      </div>
      <span v-if="sectionType !== 'trash'" class="section-buttons">
        <button
          class="btn-section"
          title="Shuffle"
          @click="handleShuffle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiShuffle" />
          </svg>
        </button>
        <button
          class="btn-section"
          title="Sort"
          @click="handleSort"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiSort" />
          </svg>
        </button>
      </span>
    </h3>
    <div class="card-grid" ref="cardGridRef">
      <TransitionGroup name="card-list">
        <DeckCard
          v-for="displayCard in displayCards"
          :key="displayCard.uuid"
          :card="getCardInfo(displayCard.cid, displayCard.ciid)"
          :section-type="sectionType"
          :uuid="displayCard.uuid"
        />
      </TransitionGroup>
      <!-- 空スペース: 最後尾にドロップ可能 -->
      <div
        class="drop-zone-end"
        @dragover.prevent="handleEndZoneDragOver"
        @dragleave="handleEndZoneDragLeave"
        @drop="handleEndDrop"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DeckCard from '../components/DeckCard.vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { searchCards } from '../api/card-search'
import { getCardImageUrl } from '../types/card'
import { detectCardGameType } from '../utils/page-detector'
import { mdiShuffle, mdiSort } from '@mdi/js'

export default {
  name: 'DeckSection',
  components: {
    DeckCard
  },
  props: {
    title: {
      type: String,
      required: true
    },
    sectionType: {
      type: String,
      required: true
    },
    cards: {
      type: Array,
      required: true
    },
    showCount: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const cardGridRef = ref(null)
    const isSectionDragOver = ref(false)

    // 検索入力欄をsection-titleに表示するかどうか
    const showSearchInTitle = computed(() => {
      return props.sectionType === 'main' &&
             settingsStore.appSettings.searchInputPosition === 'section-title'
    })

    // 検索モード
    const searchMode = ref('name')
    const showSearchModeDropdown = ref(false)

    const searchModeLabel = computed(() => {
      switch (searchMode.value) {
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        default: return 'name'
      }
    })

    const toggleSearchModeDropdown = () => {
      showSearchModeDropdown.value = !showSearchModeDropdown.value
    }

    const selectSearchMode = (mode: string) => {
      searchMode.value = mode
      showSearchModeDropdown.value = false
    }

    // 検索処理（RightAreaと同じロジック）
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

    const handleSearch = async () => {
      if (!deckStore.searchQuery.trim()) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }

      deckStore.activeTab = 'search'
      deckStore.isLoading = true

      // searchModeに応じてsearchTypeを設定
      const searchTypeMap: Record<string, '1' | '2' | '3' | '4'> = {
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        const results = await searchCards({
          keyword: deckStore.searchQuery.trim(),
          searchType: searchType,
          resultsPerPage: 100
        })

        const processed = processCards(results)
        const sorted = sortResults(processed)
        deckStore.searchResults = sorted
        deckStore.allResults = sorted

        if (results.length >= 100) {
          deckStore.hasMore = true

          setTimeout(async () => {
            try {
              const moreResults = await searchCards({
                keyword: deckStore.searchQuery.trim(),
                searchType: searchType,
                resultsPerPage: 2000
              })

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

    const handleMoveResult = (result) => {
      if (!result || result.success) return true
      console.error('[DeckSection] 移動失敗:', result.error)
      return false
    }

    // displayOrderから該当セクションのカードリストを取得
    const displayCards = computed(() => {
      return deckStore.displayOrder[props.sectionType] || []
    })
    
    // (cid, ciid)ペアでカード情報を取得
    const getCardInfo = (cid, ciid) => {
      const allDecks = [
        ...deckStore.deckInfo.mainDeck,
        ...deckStore.deckInfo.extraDeck,
        ...deckStore.deckInfo.sideDeck,
        ...deckStore.trashDeck
      ]

      // (cid, ciid)ペアで検索
      const deckCard = allDecks.find(dc =>
        dc.card.cardId === cid && dc.card.ciid === String(ciid)
      )
      if (!deckCard) return null

      // カード情報をそのまま返す（ciidは既に正しい値）
      return deckCard.card
    }

    const handleEndZoneDragOver = (event) => {
      // 移動可能な場合のみpreventDefaultを呼ぶ
      const canDrop = canDropToSection()
      if (canDrop) {
        event.preventDefault()
      }
    }

    const handleEndZoneDragLeave = (event) => {
      // 何もしない（視覚的フィードバックは不要）
    }

    const handleEndDrop = (event) => {
      event.preventDefault()
      event.stopPropagation()
      isSectionDragOver.value = false
      console.log('[handleEndDrop] Called for section:', props.sectionType)

      // 移動可能かチェック
      if (!canDropToSection()) {
        console.log('[handleEndDrop] Drop not allowed, returning')
        return
      }

      try {
        const data = event.dataTransfer.getData('text/plain')
        console.log('[handleEndDrop] Drop data:', data)
        if (!data) {
          console.log('[handleEndDrop] No data, returning')
          return
        }

        const { sectionType: sourceSectionType, uuid: sourceUuid, card } = JSON.parse(data)
        console.log('[handleEndDrop] Parsed:', { sourceSectionType, sourceUuid, card: card?.name, targetSection: props.sectionType })

        if (!card) {
          console.log('[handleEndDrop] No card, returning')
          return
        }

        // searchセクションからのドロップ
        if (sourceSectionType === 'search') {
          console.log('[handleEndDrop] Adding from search')
          if (props.sectionType === 'main' || props.sectionType === 'extra') {
            deckStore.addCopyToMainOrExtra(card)
          } else if (props.sectionType === 'side') {
            deckStore.addCopyToSection(card, 'side')
          }
          // trashへのドロップは無視
          return
        }

        if (sourceSectionType === props.sectionType && sourceUuid) {
          console.log('[handleEndDrop] Reordering within same section')
          const result = deckStore.reorderWithinSection(props.sectionType, sourceUuid, null)
          handleMoveResult(result)
        }
        else if (sourceSectionType !== props.sectionType) {
          console.log('[handleEndDrop] Moving from', sourceSectionType, 'to', props.sectionType)
          const result = deckStore.moveCard(card.cardId, sourceSectionType, props.sectionType, sourceUuid)
          handleMoveResult(result)
        }
      } catch (e) {
        console.error('End drop error:', e)
      }
    }

    const handleShuffle = () => {
      deckStore.shuffleSection(props.sectionType)
    }

    const handleSort = () => {
      deckStore.sortSection(props.sectionType)
    }

    // ドラッグ中のカードが移動可能なセクションか判定（ストアのcanMoveCardを使用）
    const canDropToSection = () => {
      const dragging = deckStore.draggingCard
      if (!dragging) {
        console.log('[canDropToSection] No dragging card')
        return true // draggingCardがない場合はtrueを返す（後方互換性）
      }

      const { card, sectionType: from } = dragging
      const to = props.sectionType

      console.log('[canDropToSection]', { from, to, cardName: card.name })

      const canMove = deckStore.canMoveCard(from, to, card)
      console.log('[canDropToSection] result:', canMove)
      return canMove
    }

    const handleSectionDragOver = (event) => {
      // 移動可能かチェック
      const canDrop = canDropToSection()

      if (canDrop) {
        // 移動可能な場合のみpreventDefaultを呼んでドロップを有効化
        event.preventDefault()
        if (!isSectionDragOver.value) {
          isSectionDragOver.value = true
        }
      } else {
        // 移動不可の場合はpreventDefaultを呼ばない（ドロップ無効）
        if (isSectionDragOver.value) {
          isSectionDragOver.value = false
        }
      }
    }

    const handleSectionDragLeave = (event) => {
      // セクション境界を出た時のみdrag-overを解除
      if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget)) {
        isSectionDragOver.value = false
      }
    }

    const handleDragEnd = () => {
      // ドラッグ終了時にセクションのハイライトを確実にリセット
      isSectionDragOver.value = false
    }

    // グローバルなdragendイベントをリスン
    onMounted(() => {
      window.addEventListener('dragend', handleDragEnd)
    })

    onUnmounted(() => {
      window.removeEventListener('dragend', handleDragEnd)
    })

    return {
      deckStore,
      handleEndDrop,
      handleEndZoneDragOver,
      handleEndZoneDragLeave,
      handleShuffle,
      handleSort,
      handleSearch,
      handleSectionDragOver,
      handleSectionDragLeave,
      handleDragEnd,
      cardGridRef,
      displayCards,
      getCardInfo,
      isSectionDragOver,
      showSearchInTitle,
      searchModeLabel,
      showSearchModeDropdown,
      toggleSearchModeDropdown,
      selectSearchMode,
      mdiShuffle,
      mdiSort
    }
  }
}
</script>

<style lang="scss" scoped>
.deck-section {
  background: var(--bg-primary, white);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  box-sizing: border-box;
  transition: background 0.2s ease, outline 0.2s ease;

  &.section-drag-over {
    background: rgba(0, 150, 255, 0.15);
    outline: 2px dashed #0096ff;
    outline-offset: -2px;
  }

  &.has-search-in-title {
    min-height: 280px;
  }
  
  h3 {
    margin: 0 0 6px 0;
    padding: 2px 0;
    font-size: 13px;
    font-weight: bold;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-primary);
    line-height: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title-group {
      font-weight: bold;
    }

    .count {
      margin-left: 8px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: normal;
    }

    .section-buttons {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .btn-section {
      background: transparent;
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--bg-secondary);
        border-color: var(--border-secondary);
      }

      &:active {
        transform: scale(0.95);
      }
    }

    &.with-search {
      height: 36px;
      padding: 6px 0;
    }
  }

  .section-search-container {
    flex: 1 1 auto;
    margin: 0 12px;
    margin-right: 120px; // ボタン4個分程度の空間
    min-width: 150px;
  }

  .section-search-input {
    display: flex;
    align-items: center;
    position: relative;
    background: white;
    border: 1px solid var(--border-primary, #ddd);
    border-radius: 4px;
    padding: 4px 8px;
    height: 28px;

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 13px;
      padding: 4px 6px;
      background: transparent;
      color: var(--text-primary);
      min-width: 80px;

      &::placeholder {
        color: var(--text-tertiary, #999);
      }
    }

    .search-mode-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      color: var(--text-secondary, #666);
      font-size: 11px;
      min-width: 36px;

      .mode-icon {
        font-size: 8px;
        line-height: 1;
      }

      .mode-text {
        font-size: 10px;
        line-height: 1;
      }

      &:hover {
        color: var(--text-primary);
      }
    }

    .search-mode-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid var(--border-primary, #ddd);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 100;
      min-width: 80px;
      margin-top: 2px;

      .mode-option {
        padding: 6px 8px;
        font-size: 10px;
        cursor: pointer;
        color: var(--text-primary);

        &:hover {
          background: var(--bg-secondary, #f5f5f5);
        }

        &:first-child {
          border-radius: 4px 4px 0 0;
        }

        &:last-child {
          border-radius: 0 0 4px 4px;
        }
      }
    }

    .clear-btn {
      background: transparent;
      border: none;
      color: var(--text-tertiary, #999);
      font-size: 16px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;

      &:hover {
        color: var(--text-primary);
      }
    }

    .menu-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #666);
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;

      &:hover {
        color: var(--text-primary);
      }
    }

    .search-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #666);
      cursor: pointer;
      padding: 2px 4px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: var(--text-primary);
      }

      svg {
        display: block;
        width: 16px;
        height: 16px;
      }
    }
  }
  
  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    // 最後の1枚をドラッグ中でもドロップ可能にするため、カード1枚分の高さを確保
    min-height: var(--card-height-deck);
    align-content: flex-start;
    justify-content: flex-start;
  }

  .drop-zone-end {
    min-width: 59px;
    // ドラッグ中のカードがposition:absoluteになるため、
    // drop-zone-endでグリッドの高さを維持する必要がある
    min-height: var(--card-height-deck);
    flex-shrink: 0;
    // 視覚的なフィードバックは不要（セクション全体の背景色で十分）
  }
}

// TransitionGroupのアニメーションを完全に無効化
// カスタムFLIPアニメーションのみを使用
.card-list-enter-active {
  transition: all 0.3s ease;
}
.card-list-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}
.card-list-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.card-list-move {
  transition: transform 0.3s ease;
}

.main-deck {
  flex: none;
  min-height: 160px;
  height: auto;
}

.extra-deck,
.side-deck {
  flex: 1;
  min-height: 160px;
  max-width: 50%;
}

.trash-deck {
  flex: none;
  // カードの高さ + パディング + ヘッダー分を考慮
  // --card-height-deck は設定で変更される可能性があるため、calc()で計算
  height: calc(var(--card-height-deck) + 50px);
  min-height: calc(var(--card-height-deck) + 50px);
  max-height: calc(var(--card-height-deck) + 50px);

  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: var(--card-height-deck);
  }
}
</style>
