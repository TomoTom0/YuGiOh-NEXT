<template>
  <div class="search-input-wrapper">
    <div class="search-input-bar" :class="{ compact: compact }">
      <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
        <span class="menu-icon">...</span>
        <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
      </button>
      <button class="search-mode-btn" @click.stop="showSearchModeDropdown = !showSearchModeDropdown">
        <span class="mode-icon">▼</span>
        <span class="mode-text">{{ searchModeLabel }}</span>
      </button>
      <div v-if="showSearchModeDropdown" class="mode-dropdown-overlay" @click="showSearchModeDropdown = false"></div>
      <Transition name="dropdown">
        <div v-if="showSearchModeDropdown" class="mode-dropdown">
          <div class="mode-option" @click="selectSearchMode('name')">カード名で検索</div>
          <div class="mode-option" @click="selectSearchMode('text')">テキストで検索</div>
          <div class="mode-option" @click="selectSearchMode('pendulum')">ペンデュラムテキストで検索</div>
        </div>
      </Transition>
      <button class="search-btn" @click="handleSearch">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </button>
      <div class="input-container" :class="{ 'command-mode': isCommandMode }">
        <span v-if="commandPrefix" class="command-prefix">{{ commandPrefix }}</span>
        <input
          ref="inputRef"
          v-model="deckStore.searchQuery"
          type="text"
          class="search-input"
          :class="{ 'has-prefix': commandPrefix }"
          :placeholder="placeholder"
          @input="handleInput"
          @keyup.enter="handleSearch"
          @keydown.escape="$emit('escape')"
          @keydown="handleKeydown"
        >
      </div>
      <!-- フィルター条件表示 -->
      <div v-if="hasActiveFilters" class="filter-icons">
        <span
          v-for="(icon, index) in visibleFilterIcons"
          :key="index"
          class="filter-icon-item"
          :class="icon.type"
        >{{ icon.label }}</span>
        <span v-if="displayFilterIcons.length > maxVisibleIcons" class="filter-more">+</span>
      </div>

      <button
        v-if="deckStore.searchQuery"
        class="clear-btn"
        @click="deckStore.searchQuery = ''"
      >x</button>

      <SearchFilterDialog
        :is-visible="showFilterDialog"
        :initial-filters="searchFilters"
        @close="showFilterDialog = false"
        @apply="handleFilterApply"
      />
    </div>

  </div>
</template>

<script lang="ts">
import { ref, computed, nextTick, defineComponent } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { searchCards, SearchOptions, SORT_ORDER_TO_API_VALUE } from '../api/card-search'
import SearchFilterDialog from './SearchFilterDialog.vue'

interface SearchFilters {
  cardType: string | null
  attributes: string[]
  races: string[]
  levels: number[]
  atk: { from: number | undefined; to: number | undefined }
  def: { from: number | undefined; to: number | undefined }
  monsterTypes: string[]
  linkNumbers: number[]
}

// コマンド定義
const COMMANDS: Record<string, { filterType: string; description: string }> = {
  '/attr': { filterType: 'attributes', description: '属性' },
  '/race': { filterType: 'races', description: '種族' },
  '/level': { filterType: 'levels', description: 'レベル/ランク' },
  '/atk': { filterType: 'atk', description: 'ATK' },
  '/def': { filterType: 'def', description: 'DEF' },
  '/type': { filterType: 'cardType', description: 'カードタイプ' },
  '/link': { filterType: 'linkNumbers', description: 'リンク数' },
  '/mtype': { filterType: 'monsterTypes', description: 'モンスタータイプ' }
}

// 属性マッピング（日本語/英語 -> APIキー）
const ATTRIBUTE_MAP: Record<string, string> = {
  '光': 'light', 'light': 'light',
  '闇': 'dark', 'dark': 'dark',
  '炎': 'fire', 'fire': 'fire',
  '水': 'water', 'water': 'water',
  '風': 'wind', 'wind': 'wind',
  '地': 'earth', 'earth': 'earth',
  '神': 'divine', 'divine': 'divine'
}

// カードタイプマッピング
const CARD_TYPE_MAP: Record<string, string> = {
  'モンスター': 'monster', 'monster': 'monster', 'm': 'monster',
  '魔法': 'spell', 'spell': 'spell', 's': 'spell',
  '罠': 'trap', 'trap': 'trap', 't': 'trap'
}

// モンスタータイプマッピング
const MONSTER_TYPE_MAP: Record<string, string> = {
  '通常': 'normal', 'normal': 'normal',
  '効果': 'effect', 'effect': 'effect',
  'チューナー': 'tuner', 'tuner': 'tuner',
  'スピリット': 'spirit', 'spirit': 'spirit',
  'ユニオン': 'union', 'union': 'union',
  'デュアル': 'dual', 'dual': 'dual',
  'リバース': 'reverse', 'reverse': 'reverse',
  'トゥーン': 'toon', 'toon': 'toon',
  '特殊召喚': 'special', 'special': 'special',
  'ペンデュラム': 'pendulum', 'pendulum': 'pendulum',
  '儀式': 'ritual', 'ritual': 'ritual',
  '融合': 'fusion', 'fusion': 'fusion',
  'シンクロ': 'synchro', 'synchro': 'synchro',
  'エクシーズ': 'xyz', 'xyz': 'xyz',
  'リンク': 'link', 'link': 'link'
}

export default defineComponent({
  name: 'SearchInputBar',
  components: {
    SearchFilterDialog
  },
  props: {
    compact: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: 'カード名を検索...'
    },
    autoFocus: {
      type: Boolean,
      default: false
    }
  },
  emits: ['escape'],
  setup(props, { expose }) {
    const deckStore = useDeckEditStore()
    const inputRef = ref<HTMLInputElement | null>(null)
    const searchMode = ref('name')
    const showSearchModeDropdown = ref(false)
    const showFilterDialog = ref(false)
    const searchFilters = ref<SearchFilters>({
      cardType: null,
      attributes: [],
      races: [],
      levels: [],
      atk: { from: undefined, to: undefined },
      def: { from: undefined, to: undefined },
      monsterTypes: [],
      linkNumbers: []
    })

    const searchModeLabel = computed(() => {
      switch (searchMode.value) {
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        default: return 'name'
      }
    })

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

    // レベル/リンク数を統合表示するヘルパー関数
    const formatNumberRange = (numbers: number[], prefix: string): string => {
      if (numbers.length === 0) return ''
      const sorted = [...numbers].sort((a, b) => a - b)

      // 連続した数値をグループ化
      const groups: number[][] = []
      let currentGroup: number[] = [sorted[0]]

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          currentGroup.push(sorted[i])
        } else {
          groups.push(currentGroup)
          currentGroup = [sorted[i]]
        }
      }
      groups.push(currentGroup)

      // グループを文字列に変換
      const parts = groups.map(group => {
        if (group.length >= 3) {
          return `${group[0]}-${group[group.length - 1]}`
        } else {
          return group.join(',')
        }
      })

      return `${prefix}${parts.join(',')}`
    }

    // 表示用フィルターアイコン - 画面サイズに応じて表示
    const displayFilterIcons = computed(() => {
      const icons: { type: string; label: string }[] = []
      const f = searchFilters.value

      // カードタイプ
      if (f.cardType) {
        const typeLabels: Record<string, string> = { monster: 'M', spell: '魔', trap: '罠' }
        icons.push({ type: 'cardType', label: typeLabels[f.cardType] || f.cardType })
      }

      // 属性
      const attrLabels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
      f.attributes.forEach(attr => {
        icons.push({ type: 'attr', label: attrLabels[attr] || attr })
      })

      // 種族（短縮表示）
      const raceLabels: Record<string, string> = {
        dragon: '龍', spellcaster: '魔', warrior: '戦', machine: '機', fiend: '悪', fairy: '天',
        zombie: '死', beast: '獣', beastwarrior: '獣戦', plant: '植', insect: '昆', aqua: '水',
        fish: '魚', seaserpent: '海', reptile: '爬', dinosaur: '恐', windbeast: '鳥', rock: '岩',
        pyro: '炎', thunder: '雷', psychic: '念', wyrm: '幻', cyberse: '電', illusion: '幻想',
        divine: '神', creatorgod: '創'
      }
      f.races.forEach(race => {
        icons.push({ type: 'race', label: raceLabels[race] || race.slice(0, 1) })
      })

      // レベル（統合表示）
      if (f.levels.length > 0) {
        icons.push({ type: 'level', label: formatNumberRange(f.levels, '★') })
      }

      // ATK/DEF
      if (f.atk.from !== undefined || f.atk.to !== undefined) {
        icons.push({ type: 'atk', label: 'ATK' })
      }
      if (f.def.from !== undefined || f.def.to !== undefined) {
        icons.push({ type: 'def', label: 'DEF' })
      }

      // モンスタータイプ
      const monsterTypeLabels: Record<string, string> = {
        normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
        pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
        union: 'U', gemini: 'D', special: '特'
      }
      f.monsterTypes.forEach(mtype => {
        icons.push({ type: 'monsterType', label: monsterTypeLabels[mtype] || mtype.slice(0, 1) })
      })

      // リンク数（統合表示）
      if (f.linkNumbers.length > 0) {
        icons.push({ type: 'link', label: formatNumberRange(f.linkNumbers, 'L') })
      }

      return icons
    })

    // 表示可能な最大アイコン数（二行分）
    const maxVisibleIcons = 6

    // 表示するアイコン（最大数まで）
    const visibleFilterIcons = computed(() => {
      return displayFilterIcons.value.slice(0, maxVisibleIcons)
    })

    // コマンドモードの検出
    const commandMatch = computed(() => {
      const query = deckStore.searchQuery
      if (!query.startsWith('/')) return null

      // コマンド + スペースのパターンを検索
      for (const cmd of Object.keys(COMMANDS)) {
        if (query.startsWith(cmd + ' ')) {
          return {
            command: cmd,
            value: query.substring(cmd.length + 1)
          }
        }
      }
      return null
    })

    const isCommandMode = computed(() => commandMatch.value !== null)
    const commandPrefix = computed(() => commandMatch.value?.command || '')

    // 入力ハンドラ
    const handleInput = () => {
      // コマンドモードの検出と処理はここで行う
    }

    // キー入力ハンドラ（backspaceでコマンドモード解除の検出用）
    const handleKeydown = (event: KeyboardEvent) => {
      // backspaceでスペースが削除されるとコマンドモードが解除される
      // これは自動的にcommandMatchのcomputedで検出される
    }

    // コマンドからフィルタを適用
    const applyCommandFilter = () => {
      const match = commandMatch.value
      if (!match) return

      const cmd = COMMANDS[match.command]
      if (!cmd) return

      const value = match.value.trim().toLowerCase()
      if (!value) return

      const f = searchFilters.value

      switch (cmd.filterType) {
        case 'attributes': {
          const attr = ATTRIBUTE_MAP[value]
          if (attr && !f.attributes.includes(attr)) {
            f.attributes.push(attr)
          }
          break
        }
        case 'races': {
          // 種族は部分一致で検索（TODO: 種族マッピングを追加）
          // 型安全のためにstringとしてキャスト
          const raceValue = value as string
          if (raceValue && !f.races.includes(raceValue)) {
            f.races.push(raceValue)
          }
          break
        }
        case 'levels': {
          const level = parseInt(value)
          if (!isNaN(level) && level >= 1 && level <= 12 && !f.levels.includes(level)) {
            f.levels.push(level)
          }
          break
        }
        case 'atk': {
          // ATK:1000-2000 または ATK:1000 形式
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.atk.from = from
            if (!isNaN(to as number)) f.atk.to = to
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.atk.from = val
              f.atk.to = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.def.from = from
            if (!isNaN(to as number)) f.def.to = to
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.def.from = val
              f.def.to = val
            }
          }
          break
        }
        case 'cardType': {
          const type = CARD_TYPE_MAP[value]
          if (type) {
            f.cardType = type
          }
          break
        }
        case 'linkNumbers': {
          const link = parseInt(value)
          if (!isNaN(link) && link >= 1 && link <= 6 && !f.linkNumbers.includes(link)) {
            f.linkNumbers.push(link)
          }
          break
        }
        case 'monsterTypes': {
          const mtype = MONSTER_TYPE_MAP[value]
          if (mtype && !f.monsterTypes.includes(mtype)) {
            f.monsterTypes.push(mtype)
          }
          break
        }
      }

      // コマンドをクリアして検索クエリを空に
      deckStore.searchQuery = ''
    }

    const selectSearchMode = (mode: string) => {
      searchMode.value = mode
      showSearchModeDropdown.value = false
    }

    const handleFilterApply = (filters: typeof searchFilters.value) => {
      searchFilters.value = filters
      if (deckStore.searchQuery.trim()) {
        handleSearch()
      }
    }

    const handleSearch = async () => {
      // コマンドモードの場合はフィルタを適用
      if (isCommandMode.value) {
        applyCommandFilter()
        // フィルタ適用後に検索を実行
        if (hasActiveFilters.value) {
          // 検索クエリがクリアされているので、フィルタのみで検索
        } else {
          return
        }
      }

      if (!deckStore.searchQuery.trim() && !hasActiveFilters.value) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }

      deckStore.activeTab = 'search'
      deckStore.isLoading = true

      const searchTypeMap: Record<string, string> = {
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        const apiSort = SORT_ORDER_TO_API_VALUE[deckStore.sortOrder] || 1

        const searchOptions: SearchOptions = {
          keyword: deckStore.searchQuery.trim(),
          searchType: searchType as '1' | '2' | '3' | '4',
          resultsPerPage: 100,
          sort: apiSort
        }

        const f = searchFilters.value
        if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
        if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
        if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
        if (f.levels.length > 0) searchOptions.levels = f.levels
        if (f.atk.from !== undefined || f.atk.to !== undefined) searchOptions.atk = f.atk
        if (f.def.from !== undefined || f.def.to !== undefined) searchOptions.def = f.def
        if (f.monsterTypes.length > 0) searchOptions.monsterTypes = f.monsterTypes as SearchOptions['monsterTypes']
        if (f.linkNumbers.length > 0) searchOptions.linkNumbers = f.linkNumbers

        const results = await searchCards(searchOptions)

        // 検索結果をstore用の形式に変換
        deckStore.searchResults = results as unknown as typeof deckStore.searchResults
        deckStore.allResults = results as unknown as typeof deckStore.allResults

        if (results.length >= 100) {
          deckStore.hasMore = true
          setTimeout(async () => {
            try {
              const moreResults = await searchCards({
                ...searchOptions,
                resultsPerPage: 2000
              })
              if (moreResults.length > 100) {
                deckStore.searchResults = moreResults as unknown as typeof deckStore.searchResults
                deckStore.allResults = moreResults as unknown as typeof deckStore.allResults
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
        deckStore.isGlobalSearchMode = false
      }
    }

    const focus = () => {
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.focus()
        }
      })
    }

    // autoFocusがtrueの場合、マウント時にフォーカス
    if (props.autoFocus) {
      focus()
    }

    expose({ focus, inputRef })

    return {
      deckStore,
      inputRef,
      searchMode,
      searchModeLabel,
      showSearchModeDropdown,
      showFilterDialog,
      searchFilters,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      visibleFilterIcons,
      maxVisibleIcons,
      isCommandMode,
      commandPrefix,
      selectSearchMode,
      handleFilterApply,
      handleSearch,
      handleInput,
      handleKeydown
    }
  }
})
</script>

<style lang="scss" scoped>
.search-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* フィルターアイコンスタイル - 二行構成・画面サイズ対応 */
.filter-icons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: center;
  gap: 2px;
  margin-right: 4px;
  flex-shrink: 1;
  min-width: 0;
  max-width: 120px;
  max-height: 24px;
  overflow: hidden;
}

/* 画面サイズに応じて表示幅を調整 */
@media (min-width: 400px) {
  .filter-icons {
    max-width: 160px;
  }
}

@media (min-width: 500px) {
  .filter-icons {
    max-width: 200px;
  }
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
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1;
  height: 10px;
}

.filter-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 10px;
  font-size: 8px;
  font-weight: 600;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  flex-shrink: 0;
}

.input-container {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  position: relative;

  &.command-mode {
    background: rgba(0, 217, 184, 0.1);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 4px;
  }
}

.command-prefix {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin-right: 4px;
  background: var(--theme-color-start, #00d9b8);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  font-weight: bold;
  white-space: nowrap;
}

.search-input-bar {
  display: flex;
  align-items: center;
  position: relative;
  background: white;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 0 10px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover,
  &:focus-within {
    border-color: var(--theme-color-start, #00d9b8);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  &.compact {
    height: 28px;
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: none;
    border-color: var(--border-primary, #ddd);

    &:hover,
    &:focus-within {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .search-input {
      font-size: 13px;
      padding: 4px 6px;
    }

    .menu-btn {
      padding: 4px 6px;
      font-size: 14px;
    }

    .search-mode-btn {
      padding: 2px 6px;
      min-width: 36px;

      .mode-icon {
        font-size: 8px;
      }

      .mode-text {
        font-size: 10px;
      }
    }

    .search-btn {
      padding: 4px;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .clear-btn {
      padding: 0 4px;
      font-size: 16px;
    }

    .mode-dropdown {
      top: 100%;
      bottom: auto;
      margin-top: 2px;
      margin-bottom: 0;
    }
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
  min-width: 80px;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }
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

.search-mode-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 48px;
  min-width: 48px;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary);
  }

  .mode-icon {
    font-size: 10px;
    line-height: 1;
  }

  .mode-text {
    font-size: 8px;
    line-height: 1;
    color: var(--text-tertiary, #999);
  }
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
  left: 40px;
  background: white;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-bottom: 4px;
  z-index: 101;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

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

.clear-btn {
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
</style>
