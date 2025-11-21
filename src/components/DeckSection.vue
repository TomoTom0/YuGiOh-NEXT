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
          <div v-if="hasActiveFilters" class="filter-icons">
            <span v-for="(icon, index) in displayFilterIcons" :key="index" class="filter-icon-item" :class="icon.type">{{ icon.label }}</span>
            <span v-if="filterCount > 3" class="filter-more">+</span>
          </div>
          <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
            <span class="menu-icon">⋯</span>
            <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
          </button>
          <button class="search-btn" @click="handleSearch">
            <svg width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
          </button>
        </div>
        <SearchFilterDialog
          :is-visible="showFilterDialog"
          :initial-filters="searchFilters"
          @close="showFilterDialog = false"
          @apply="handleFilterApply"
        />
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import DeckCard from '../components/DeckCard.vue'
import SearchFilterDialog from './SearchFilterDialog.vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { searchCards } from '../api/card-search'
import { getCardImageUrl } from '../types/card'
import { detectCardGameType } from '../utils/page-detector'
import { mdiShuffle, mdiSort } from '@mdi/js'

export default {
  name: 'DeckSection',
  components: {
    DeckCard,
    SearchFilterDialog
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

    // フィルターダイアログ
    const showFilterDialog = ref(false)
    const searchFilters = reactive({
      cardType: null as string | null,
      attributes: [] as string[],
      races: [] as string[],
      levels: [] as number[],
      atk: { from: undefined as number | undefined, to: undefined as number | undefined },
      def: { from: undefined as number | undefined, to: undefined as number | undefined },
      monsterTypes: [] as string[],
      linkNumbers: [] as number[]
    })

    // フィルター条件の数
    const filterCount = computed(() => {
      let count = 0
      if (searchFilters.cardType) count++
      count += searchFilters.attributes.length
      count += searchFilters.races.length
      count += searchFilters.levels.length
      if (searchFilters.atk.from !== undefined || searchFilters.atk.to !== undefined) count++
      if (searchFilters.def.from !== undefined || searchFilters.def.to !== undefined) count++
      count += searchFilters.monsterTypes.length
      count += searchFilters.linkNumbers.length
      return count
    })

    // フィルターが設定されているか
    const hasActiveFilters = computed(() => filterCount.value > 0)

    // 表示するフィルターアイコン（最大3個）
    const displayFilterIcons = computed(() => {
      const icons: { type: string; label: string }[] = []
      const f = searchFilters

      if (f.cardType) {
        const labels = { monster: 'M', spell: 'S', trap: 'T' }
        icons.push({ type: 'card-type', label: labels[f.cardType] || f.cardType })
      }

      f.attributes.forEach(attr => {
        const labels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
        icons.push({ type: 'attribute', label: labels[attr] || attr })
      })

      const raceLabels: Record<string, string> = {
        dragon: '竜族', spellcaster: '魔法', warrior: '戦士', machine: '機械',
        fiend: '悪魔', fairy: '天使', zombie: '不死', beast: '獣族',
        beastwarrior: '獣戦', plant: '植物', insect: '昆虫', aqua: '水族',
        fish: '魚族', seaserpent: '海竜', reptile: '爬虫', dinosaur: '恐竜',
        windbeast: '鳥獣', rock: '岩石', pyro: '炎族', thunder: '雷族',
        psychic: '念動', wyrm: '幻竜', cyberse: '電脳', illusion: '幻想',
        divine: '幻神', creatorgod: '創造'
      }
      f.races.slice(0, 3 - icons.length).forEach(race => {
        icons.push({ type: 'race', label: raceLabels[race] || race.substring(0, 2) })
      })

      f.levels.slice(0, 3 - icons.length).forEach(level => {
        icons.push({ type: 'level', label: `L${level}` })
      })

      if (icons.length < 3 && (f.atk.from !== undefined || f.atk.to !== undefined)) {
        icons.push({ type: 'atk', label: 'ATK' })
      }

      if (icons.length < 3 && (f.def.from !== undefined || f.def.to !== undefined)) {
        icons.push({ type: 'def', label: 'DEF' })
      }

      const monsterTypeLabels: Record<string, string> = {
        normal: '通常', effect: '効果', fusion: '融合', ritual: '儀式',
        synchro: 'S', xyz: 'X', pendulum: 'P', link: 'L',
        tuner: 'T', flip: 'R', toon: 'Tn', spirit: 'Sp',
        union: 'U', gemini: 'D', special: '特殊'
      }
      f.monsterTypes.slice(0, 3 - icons.length).forEach(type => {
        icons.push({ type: 'monster-type', label: monsterTypeLabels[type] || type.substring(0, 2) })
      })

      f.linkNumbers.slice(0, 3 - icons.length).forEach(num => {
        icons.push({ type: 'link', label: `L${num}` })
      })

      return icons.slice(0, 3)
    })

    // フィルター適用
    const handleFilterApply = (filters) => {
      Object.assign(searchFilters, filters)
      showFilterDialog.value = false
    }

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
      if (!deckStore.searchQuery.trim() && !hasActiveFilters.value) {
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

      // 検索オプションを構築
      const searchOptions: any = {
        keyword: deckStore.searchQuery.trim(),
        searchType: searchType,
        resultsPerPage: 100
      }

      // フィルター条件を追加
      if (searchFilters.cardType) {
        searchOptions.cardType = searchFilters.cardType
      }
      if (searchFilters.attributes.length > 0) {
        searchOptions.attributes = searchFilters.attributes
      }
      if (searchFilters.races.length > 0) {
        searchOptions.races = searchFilters.races
      }
      if (searchFilters.levels.length > 0) {
        searchOptions.levels = searchFilters.levels
      }
      if (searchFilters.atk.from !== undefined || searchFilters.atk.to !== undefined) {
        searchOptions.atk = searchFilters.atk
      }
      if (searchFilters.def.from !== undefined || searchFilters.def.to !== undefined) {
        searchOptions.def = searchFilters.def
      }
      if (searchFilters.monsterTypes.length > 0) {
        searchOptions.monsterTypes = searchFilters.monsterTypes
      }
      if (searchFilters.linkNumbers.length > 0) {
        searchOptions.linkNumbers = searchFilters.linkNumbers
      }

      try {
        const results = await searchCards(searchOptions)

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
      showFilterDialog,
      searchFilters,
      filterCount,
      hasActiveFilters,
      displayFilterIcons,
      handleFilterApply,
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

    .filter-icons {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-right: 4px;
    }

    .filter-icon-item {
      font-size: 8px;
      padding: 1px 3px;
      border-radius: 2px;
      white-space: nowrap;

      // 属性
      &.attribute {
        background: #e3f2fd;
        color: #1565c0;
      }

      // 種族
      &.race {
        background: #f3e5f5;
        color: #7b1fa2;
      }

      // モンスタータイプ
      &.monster-type {
        background: #fff3e0;
        color: #e65100;
      }

      // その他（レベル、ATK、DEF、リンク、カードタイプ）
      &.level, &.atk, &.def, &.link, &.card-type {
        background: var(--bg-secondary, #f5f5f5);
        color: var(--text-secondary, #666);
      }
    }

    .filter-more {
      font-size: 8px;
      color: var(--text-tertiary, #999);
    }

    .menu-btn {
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--text-secondary, #666);
      font-size: 14px;
      cursor: pointer;
      padding: 4px 6px;
      line-height: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        color: var(--text-primary);
        background: var(--bg-secondary, #f5f5f5);
      }

      &.active {
        color: var(--button-bg, #4CAF50);
      }

      .menu-icon {
        display: block;
      }

      .filter-count-badge {
        position: absolute;
        top: -2px;
        right: 0px;
        background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
        color: white;
        font-size: 8px;
        min-width: 12px;
        height: 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 2px;
      }
    }

    .search-btn {
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--text-secondary, #666);
      cursor: pointer;
      padding: 4px 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        color: var(--text-primary);
        background: var(--bg-secondary, #f5f5f5);
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
