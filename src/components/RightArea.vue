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
        @sort-change="handleSortChange"
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

    <!-- グローバル検索モード用オーバーレイ -->
    <div v-if="deckStore.isGlobalSearchMode" class="global-search-overlay" @click="closeGlobalSearch"></div>

    <div v-if="showSearchInputBottom || deckStore.isGlobalSearchMode" class="search-input-bottom" :class="{ 'global-search-mode': deckStore.isGlobalSearchMode }">
      <div class="search-input-wrapper">
        <button class="search-mode-toggle" @click.stop="showSearchModeDropdown = !showSearchModeDropdown">
          <div class="toggle-content">
            <span class="toggle-icon">▼</span>
            <span class="toggle-mode">{{ searchMode === 'name' ? 'name' : searchMode === 'text' ? 'text' : 'pend' }}</span>
          </div>
        </button>
        <div v-if="showSearchModeDropdown" class="mode-dropdown-overlay" @click="showSearchModeDropdown = false"></div>
        <Transition name="dropdown">
          <div v-if="showSearchModeDropdown" class="mode-dropdown">
            <div class="mode-option" @click="searchMode = 'name'; showSearchModeDropdown = false">
              カード名で検索
            </div>
            <div class="mode-option" @click="searchMode = 'text'; showSearchModeDropdown = false">
              テキストで検索
            </div>
            <div class="mode-option" @click="searchMode = 'pendulum'; showSearchModeDropdown = false">
              ペンデュラムテキストで検索
            </div>
          </div>
        </Transition>
        <input
          ref="searchInputRef"
          v-model="deckStore.searchQuery"
          type="text"
          class="search-input"
          placeholder="カード名を検索..."
          @keyup.enter="handleSearchInput"
          @keydown.escape="closeGlobalSearch"
        >
        <button
          v-if="deckStore.searchQuery"
          class="clear-button"
          @click="deckStore.searchQuery = ''"
        >×</button>
        <!-- フィルター条件表示 -->
        <div v-if="hasActiveFilters" class="filter-icons">
          <span
            v-for="(icon, index) in displayFilterIcons"
            :key="index"
            class="filter-icon-item"
            :class="icon.type"
          >{{ icon.label }}</span>
          <span v-if="filterCount > 3" class="filter-more">+</span>
        </div>
        <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
          <span class="menu-icon">⋯</span>
          <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
        </button>
        <button class="search-btn" @click="handleSearchInput">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Search Filter Dialog -->
    <SearchFilterDialog
      :isVisible="showFilterDialog"
      :initialFilters="searchFilters"
      @close="showFilterDialog = false"
      @apply="handleFilterApply"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { searchCards } from '../api/card-search'
import { getCardImageUrl } from '../types/card'
import { detectCardGameType } from '../utils/page-detector'
import CardList from './CardList.vue'
import CardDetail from './CardDetail.vue'
import DeckMetadata from './DeckMetadata.vue'
import SearchFilterDialog from './SearchFilterDialog.vue'

export default {
  name: 'RightArea',
  components: {
    CardList,
    CardDetail,
    DeckMetadata,
    SearchFilterDialog
  },
  setup() {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const searchMode = ref('name')
    const showSearchModeDropdown = ref(false)
    const searchInputRef = ref(null)
    const showFilterDialog = ref(false)
    const searchFilters = ref({
      cardType: null,
      attributes: [],
      races: [],
      levels: [],
      atk: { from: undefined, to: undefined },
      def: { from: undefined, to: undefined },
      monsterTypes: [],
      linkNumbers: []
    })

    // フィルターが設定されているかどうか
    const hasActiveFilters = computed(() => {
      const f = searchFilters.value
      return f.cardType !== null ||
        f.attributes.length > 0 ||
        f.races.length > 0 ||
        f.levels.length > 0 ||
        f.atk.from !== undefined ||
        f.atk.to !== undefined ||
        f.def.from !== undefined ||
        f.def.to !== undefined ||
        f.monsterTypes.length > 0 ||
        f.linkNumbers.length > 0
    })

    // フィルター条件の総数
    const filterCount = computed(() => {
      const f = searchFilters.value
      let count = 0
      if (f.cardType) count++
      count += f.attributes.length
      count += f.races.length
      count += f.levels.length
      if (f.atk.from !== undefined || f.atk.to !== undefined) count++
      if (f.def.from !== undefined || f.def.to !== undefined) count++
      count += f.monsterTypes.length
      count += f.linkNumbers.length
      return count
    })

    // 表示用フィルターアイコン（最大3個）
    const displayFilterIcons = computed(() => {
      const icons = []
      const f = searchFilters.value

      // 属性
      const attrLabels = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
      f.attributes.forEach(attr => {
        icons.push({ type: 'attr', label: attrLabels[attr] || attr })
      })

      // 種族（短縮表示）
      const raceLabels = {
        dragon: '龍', spellcaster: '魔法', warrior: '戦士', machine: '機械', fiend: '悪魔', fairy: '天使',
        zombie: '不死', beast: '獣', beastwarrior: '獣戦', plant: '植物', insect: '昆虫', aqua: '水',
        fish: '魚', seaserpent: '海竜', reptile: '爬虫', dinosaur: '恐竜', windbeast: '鳥獣', rock: '岩石',
        pyro: '炎', thunder: '雷', psychic: '念動', wyrm: '幻竜', cyberse: '電脳', illusion: '幻想',
        divine: '神獣', creatorgod: '創造'
      }
      f.races.forEach(race => {
        icons.push({ type: 'race', label: raceLabels[race] || race.slice(0, 2) })
      })

      // レベル
      f.levels.forEach(level => {
        icons.push({ type: 'level', label: `★${level}` })
      })

      // カードタイプ
      if (f.cardType) {
        const typeLabels = { monster: 'M', spell: '魔', trap: '罠' }
        icons.push({ type: 'cardType', label: typeLabels[f.cardType] || f.cardType })
      }

      // ATK/DEF
      if (f.atk.from !== undefined || f.atk.to !== undefined) {
        icons.push({ type: 'atk', label: 'ATK' })
      }
      if (f.def.from !== undefined || f.def.to !== undefined) {
        icons.push({ type: 'def', label: 'DEF' })
      }

      // モンスタータイプ
      const monsterTypeLabels = {
        normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
        pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
        union: 'U', gemini: 'D', special: '特'
      }
      f.monsterTypes.forEach(type => {
        icons.push({ type: 'monsterType', label: monsterTypeLabels[type] || type.slice(0, 1) })
      })

      // リンク数
      f.linkNumbers.forEach(num => {
        icons.push({ type: 'link', label: `L${num}` })
      })

      return icons.slice(0, 3)
    })

    // 検索入力欄をデフォルト位置（下部）に表示するかどうか
    const showSearchInputBottom = computed(() => {
      return settingsStore.appSettings.searchInputPosition === 'default'
    })

    // グローバル検索モードを閉じる
    const closeGlobalSearch = () => {
      deckStore.isGlobalSearchMode = false
    }

    // グローバル検索モードになったらinputにフォーカス
    watch(() => deckStore.isGlobalSearchMode, (isActive) => {
      if (isActive) {
        nextTick(() => {
          if (searchInputRef.value) {
            searchInputRef.value.focus()
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

    // ドロップダウンの外側クリックで閉じる
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.mode-dropdown')
      const toggle = document.querySelector('.search-mode-toggle')
      if (dropdown && toggle && 
          !dropdown.contains(event.target) && 
          !toggle.contains(event.target)) {
        showSearchModeDropdown.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

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
        case 'atk_desc':
          return sorted.sort((a, b) => (b.atk ?? -1) - (a.atk ?? -1))
        case 'atk_asc':
          return sorted.sort((a, b) => (a.atk ?? -1) - (b.atk ?? -1))
        case 'def_desc':
          return sorted.sort((a, b) => (b.def ?? -1) - (a.def ?? -1))
        case 'def_asc':
          return sorted.sort((a, b) => (a.def ?? -1) - (b.def ?? -1))
        case 'level_desc':
          return sorted.sort((a, b) => (b.levelValue || 0) - (a.levelValue || 0))
        case 'level_asc':
          return sorted.sort((a, b) => (a.levelValue || 0) - (b.levelValue || 0))
        case 'attribute_asc':
          return sorted.sort((a, b) => (a.attribute || '').localeCompare(b.attribute || ''))
        case 'attribute_desc':
          return sorted.sort((a, b) => (b.attribute || '').localeCompare(a.attribute || ''))
        case 'race_asc':
          return sorted.sort((a, b) => (a.race || '').localeCompare(b.race || ''))
        case 'race_desc':
          return sorted.sort((a, b) => (b.race || '').localeCompare(a.race || ''))
        default:
          return sorted
      }
    }

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
    
    const handleScrollToTop = () => {
      const searchContent = document.querySelector('.search-content')
      if (searchContent) {
        searchContent.scrollTo({ top: 0, behavior: 'smooth' })
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

      // searchModeに応じてsearchTypeを設定
      const searchTypeMap = {
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        // 検索オプションを構築
        const searchOptions = {
          keyword: deckStore.searchQuery.trim(),
          searchType: searchType,
          resultsPerPage: 100
        }

        // フィルターを適用
        const f = searchFilters.value
        if (f.cardType) {
          searchOptions.cardType = f.cardType
        }
        if (f.attributes.length > 0) {
          searchOptions.attributes = f.attributes
        }
        if (f.races.length > 0) {
          searchOptions.races = f.races
        }
        if (f.levels.length > 0) {
          searchOptions.levels = f.levels
        }
        if (f.atk.from !== undefined || f.atk.to !== undefined) {
          searchOptions.atk = f.atk
        }
        if (f.def.from !== undefined || f.def.to !== undefined) {
          searchOptions.def = f.def
        }
        if (f.monsterTypes.length > 0) {
          searchOptions.monsterTypes = f.monsterTypes
        }
        if (f.linkNumbers.length > 0) {
          searchOptions.linkNumbers = f.linkNumbers
        }

        const results = await searchCards(searchOptions)
        console.log('Initial search results:', results.length)

        const processed = processCards(results)
        const sorted = sortResults(processed)
        deckStore.searchResults = sorted
        deckStore.allResults = sorted

        if (results.length >= 100) {
          deckStore.hasMore = true

          setTimeout(async () => {
            try {
              const moreResults = await searchCards({
                ...searchOptions,
                resultsPerPage: 2000
              })
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
        // グローバル検索モードを閉じる
        deckStore.isGlobalSearchMode = false
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

    const handleFilterApply = (filters) => {
      searchFilters.value = filters
      // フィルターが適用されたら検索を実行
      if (deckStore.searchQuery.trim()) {
        handleSearchInput()
      }
    }

    const clearFilters = () => {
      searchFilters.value = {
        cardType: null,
        attributes: [],
        races: [],
        levels: [],
        atk: { from: undefined, to: undefined },
        def: { from: undefined, to: undefined },
        monsterTypes: [],
        linkNumbers: []
      }
      // フィルタークリア後に再検索
      if (deckStore.searchQuery.trim()) {
        handleSearchInput()
      }
    }

    return {
      deckStore,
      searchMode,
      showSearchModeDropdown,
      showSearchInputBottom,
      searchInputRef,
      showFilterDialog,
      searchFilters,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      closeGlobalSearch,
      handleSearchInput,
      handleSortChange,
      handleScroll,
      handleScrollToTop,
      showCardDetail,
      handleFilterApply,
      clearFilters
    }
  }
}
</script>

<style scoped lang="scss">
.right-area {
  width: 320px;
  height: 100%;
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
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    transition: background 0.2s, color 0.2s;

    &:last-child {
      border-right: none;
    }

    &:hover:not(.active):not(.tab-header) {
      background: #f5f5f5;
      color: #1976d2;
    }

    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
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
  color: #000;
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
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary);

    &:last-child {
      border-right: none;
    }

    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
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
    color: white;
    font-weight: bold;
  }
  
  &:nth-child(5) {
    background: var(--bg-secondary);
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
  color: #999;
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
  background: rgba(0, 0, 0, 0.5);
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

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  padding: 0 10px;
  height: 44px;
  min-height: 44px;
}

.search-mode-toggle {
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  align-items: center;
  width: 48px;
  min-width: 48px;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }
}

.toggle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.toggle-icon {
  display: block;
  font-size: 10px;
  line-height: 1;
}

.toggle-mode {
  display: block;
  font-size: 8px;
  line-height: 1;
  color: var(--text-tertiary, #999);
}

.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.mode-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: white;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-bottom: 4px;
  z-index: 101;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

/* ドロップダウンアニメーション */
.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.mode-option {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: var(--text-primary, #333);

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px;
  background: transparent;
  color: var(--text-primary, #333);
  height: 100%;
  line-height: 1.5;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }

  &:focus {
    outline: none;
  }
}

.clear-button {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }
}

.filter-icons {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-right: 4px;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.filter-icon-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 3px;
  font-size: 8px;
  font-weight: 500;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  white-space: nowrap;
  max-width: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.filter-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  font-size: 8px;
  font-weight: 600;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  flex-shrink: 0;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  &.active {
    color: var(--theme-color-start, #00d9b8);
  }

  .menu-icon {
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }
}

.filter-count-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 12px;
  height: 12px;
  padding: 0 2px;
  font-size: 8px;
  font-weight: 600;
  line-height: 12px;
  text-align: center;
  background: var(--text-secondary, #666);
  color: white;
  border-radius: 6px;
}

.search-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  svg {
    display: block;
  }
}

@media (max-width: 768px) {
  .search-header {
    right: 20px;
  }

  .search-input-bottom {
    right: 20px;
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
  color: var(--text-secondary);

  &:hover {
    color: #008cff;
  }
}
</style>
