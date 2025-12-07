<!--
/**
 * SearchInputBar - 検索入力バーコンポーネント
 *
 * 多機能な検索入力を提供するコンポーネント。
 * スラッシュコマンド、フィルター管理、検索モード切り替え、候補リスト表示などの機能を持つ。
 *
 * @component
 * @version v0.6.0 (Phase 6 リファクタリング完了)
 *
 * ## 主要機能
 *
 * ### 1. 検索入力
 * - リアルタイム検索クエリ入力
 * - Enter キーで検索実行
 * - プレースホルダー自動生成（検索モードに応じて変化）
 *
 * ### 2. スラッシュコマンド
 * - `/c:` - カテゴリフィルター追加
 * - `/r:` - 種族フィルター追加
 * - `/a:` - 属性フィルター追加
 * - `/l:` - レベル/ランク/リンクフィルター追加
 * - `/mydeck:` - マイデッキ検索
 * - `/help` - ヘルプ表示
 *
 * ### 3. 検索モード
 * - **title**: カード名検索（デフォルト）
 * - **text**: カードテキスト検索
 * - **all**: カード名+テキスト検索
 * - **category**: カテゴリ検索
 * - **race**: 種族検索
 * - **attribute**: 属性検索
 * - **level**: レベル/ランク/リンク検索
 * - **mydeck**: マイデッキ検索
 *
 * ### 4. フィルターチップ管理
 * - 選択されたフィルター条件をチップ表示
 * - チップのクリックで個別削除
 * - 一括クリア機能
 * - フィルターアイコンのプレビュー
 *
 * ### 5. 候補リスト
 * - コマンド候補表示（スラッシュコマンド入力時）
 * - フィルター候補表示（カテゴリ/種族/属性/レベル）
 * - マイデッキ候補表示（/mydeck: 入力時）
 * - キーボードナビゲーション（↑↓ Enter Esc）
 *
 * ### 6. キーボードショートカット
 * - `Ctrl+F` / `Cmd+F`: 検索バーにフォーカス
 * - `Esc`: 候補リストを閉じる
 * - `↑` / `↓`: 候補リストのナビゲーション
 * - `Enter`: 候補選択または検索実行
 *
 * ## Composables 構成
 *
 * - **useSlashCommands**: スラッシュコマンド解析とバリデーション
 * - **useSearchFilters**: フィルター管理とチップ操作
 * - **useKeyboardNavigation**: キーボードナビゲーション管理
 * - **useMydeckOperations**: マイデッキ操作管理
 * - **useFilterInput**: フィルター入力とチップ管理
 * - **useSearchExecution**: 検索実行ロジック
 *
 * ## Props
 * - `compact` (boolean): コンパクトモード（デフォルト: false）
 * - `isBottomPosition` (boolean): 検索バーが下部にあるか（デフォルト: false）
 *
 * ## リファクタリング履歴
 * - Phase 1 (2025-12-07): 定数と静的データの分離
 * - Phase 2 (2025-12-07): Composable化（スラッシュコマンド、フィルター管理）
 * - Phase 3 (2025-12-07): UIコンポーネント分割（SearchFilterChips, SearchModeSelector, SuggestionList）
 * - Phase 4 (2025-12-07): 統合とクリーンアップ、テスト追加
 * - Phase 5 (2025-12-07): ファイル構造整理、新規Composable化
 * - Phase 6 (2025-12-07): 最終整理、God Component脱却（2239行 → 1318行、41%削減）
 * - スタイル移譲 (2025-12-07): 各コンポーネントのスタイルカプセル化（-349行）
 *
 * @see src/components/searchInputBar/composables/useSlashCommands.ts
 * @see src/components/searchInputBar/composables/useSearchFilters.ts
 * @see src/components/searchInputBar/composables/useKeyboardNavigation.ts
 * @see src/components/searchInputBar/composables/useMydeckOperations.ts
 * @see src/components/searchInputBar/composables/useFilterInput.ts
 * @see src/components/searchInputBar/composables/useSearchExecution.ts
 * @see src/components/searchInputBar/components/SearchFilterChips.vue
 * @see src/components/searchInputBar/components/SearchModeSelector.vue
 * @see src/components/searchInputBar/components/SuggestionList.vue
 */
-->
<template>
  <div class="search-input-wrapper">
    <div class="search-input-bar" :class="{ compact: compact }">
      <div class="left-buttons">
        <button v-show="!deckStore.isFilterDialogVisible" class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="deckStore.isFilterDialogVisible = true" title="フィルター">
          <span class="menu-icon">...</span>
          <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
        </button>
        <SearchModeSelector
          v-model="searchMode"
          :is-bottom-position="isBottomPosition"
          :compact="compact"
        />
      </div>
      <button class="search-btn" @click="handleSearch">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </button>
      <div class="input-container" :class="{
        'command-mode': isCommandMode || pendingCommand,
        'valid': pendingCommand && isValidCommandInput
      }">
        <!-- SearchFilterDialogで選択した条件（上部） - 常に表示 -->
        <SearchFilterChips
          :compact="compact"
          :preview-chip="previewChip"
          :display-filter-icons="displayFilterIcons"
          :has-active-filters="hasActiveFilters"
          :filter-chips-count="filterChips.length"
          @remove-icon="removeFilterIcon"
          @clear-all="clearAllFilters"
        />
        <!-- 入力行 -->
        <div class="input-row">
          <!-- コマンドモード表示 -->
          <span v-if="pendingCommand" class="command-prefix">{{ pendingCommand.command }}</span>
          <input
          ref="inputRef"
          v-model="searchStore.searchQuery"
          type="text"
          class="search-input"
          :class="{
            'has-prefix': pendingCommand,
            [placeholderSizeClass]: true
          }"
          :placeholder="currentPlaceholder"
          @input="handleInput"
          @focus="handleFocus"
          @keydown.enter.prevent="handleEnter"
          @keydown.escape="handleEscape(); $emit('escape')"
          @keydown="handleKeydown"
        >
        <!-- コマンド候補リスト -->
        <SuggestionList
          v-if="!pendingCommand"
          :suggestions="commandSuggestions"
          :selected-index="selectedCommandIndex"
          :is-bottom-position="isBottomPosition"
          variant="command"
          @select="selectCommand"
        />
        <!-- 候補リスト -->
        <SuggestionList
          v-if="pendingCommand"
          :suggestions="filteredSuggestions"
          :selected-index="selectedSuggestionIndex"
          :is-bottom-position="isBottomPosition"
          @select="selectSuggestion"
        />
        <!-- mydeckモード用の候補リスト -->
        <div v-if="showMydeckDropdown" class="mode-dropdown-overlay" @click="showMydeckDropdown = false"></div>
        <SuggestionList
          v-if="showMydeckDropdown"
          :suggestions="mydeckSuggestions"
          :selected-index="selectedMydeckIndex"
          :is-bottom-position="isBottomPosition"
          variant="mydeck"
          @select="selectMydeck"
        />
      </div>
      </div>

      <button
        v-if="searchStore.searchQuery"
        class="clear-btn"
        @click="searchStore.searchQuery = ''"
        title="入力をクリア"
      >
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </svg>
      </button>

      <!-- position="bottom"の場合はダイアログを表示しない（循環参照回避） -->
      <SearchFilterDialog
        v-if="position !== 'bottom'"
        :is-visible="deckStore.isFilterDialogVisible"
        :initial-filters="searchStore.searchFilters"
        @apply="handleFilterApply"
      />
    </div>

  </div>
</template>

<script lang="ts">
import { ref, computed, nextTick, defineComponent, type Ref } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSearchStore } from '../../stores/search'
import { useSettingsStore } from '../../stores/settings'
import { getDeckDetail } from '../../api/deck-operations'
import { sessionManager } from '../../content/session/session'
import SearchFilterDialog from '../SearchFilterDialog.vue'
import type { CardInfo, Attribute, Race, MonsterType, CardType } from '../../types/card'
import type { SearchFilters } from '../../types/search-filters'
import {
  MONSTER_TYPE_ID_TO_SHORTNAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  ATTRIBUTE_ID_TO_NAME
} from '../../types/card-maps'
import type { SearchMode } from '../../types/settings'
import { getTempCardDB } from '../../utils/temp-card-db'
import { convertFiltersToIcons, type FilterIcon } from '../../utils/filter-icons'
import { getRaceLabel } from '../../utils/filter-label'
import { detectLanguage } from '../../utils/language-detector'
import { mappingManager } from '../../utils/mapping-manager'
import {
  COMMANDS,
  SEARCH_MODE_MAP,
  ATTRIBUTE_MAP,
  CARD_TYPE_MAP,
  MONSTER_TYPE_MAP,
  LINK_MARKER_MAP,
  FILTER_OPTIONS,
  toHalfWidth
} from '../../constants/search-constants'
import { useSlashCommands } from './composables/useSlashCommands'
import { useSearchFilters } from './composables/useSearchFilters'
import { useSearchExecution } from './composables/useSearchExecution'
import SearchFilterChips from './components/SearchFilterChips.vue'
import SearchModeSelector from './components/SearchModeSelector.vue'
import SuggestionList from './components/SuggestionList.vue'
import type { PreviewChip, DeckSuggestion } from '../../types/search-ui'

export default defineComponent({
  name: 'SearchInputBar',
  components: {
    SearchFilterDialog,
    SearchFilterChips,
    SearchModeSelector,
    SuggestionList
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
    },
    position: {
      type: String as () => 'top' | 'bottom' | 'default',
      default: 'default'
    }
  },
  emits: ['escape'],
  setup(props, { expose }) {
    const deckStore = useDeckEditStore()
    const searchStore = useSearchStore()
    const inputRef = ref<HTMLInputElement | null>(null)

    // 設定からデフォルト検索モードを取得
    const settingsStore = useSettingsStore()
    const searchMode = computed({
      get: () => settingsStore.appSettings.ux.defaultSearchMode || 'auto',
      set: (value: SearchMode) => {
        settingsStore.appSettings.ux.defaultSearchMode = value
      }
    })

    const showMydeckDropdown = ref(false)

    // ページ言語を検出（多言語対応）
    const pageLanguage = computed(() => {
      return detectLanguage(document)
    })

    // 検索入力欄の位置を自動検出
    const isBottomPosition = computed(() => {
      if (props.position !== 'default') return props.position === 'bottom'
      // 親要素のクラス名から位置を判定
      const wrapper = inputRef.value?.closest('.search-input-wrapper')
      const parent = wrapper?.parentElement
      if (!parent) return false
      return parent.classList.contains('search-input-bottom-fixed') ||
             parent.classList.contains('search-input-bottom')
    })

    // hasActiveFiltersを直接計算
    const hasActiveFilters = computed(() => {
      const f = searchStore.searchFilters
      return f.cardType !== null ||
        f.attributes.length > 0 ||
        f.spellTypes.length > 0 ||
        f.trapTypes.length > 0 ||
        f.races.length > 0 ||
        f.monsterTypes.length > 0 ||
        f.levelValues.length > 0 ||
        f.linkValues.length > 0 ||
        f.scaleValues.length > 0 ||
        f.linkMarkers.length > 0 ||
        f.atk.min !== undefined ||
        f.atk.max !== undefined ||
        f.def.min !== undefined ||
        f.def.max !== undefined ||
        f.releaseDate.from !== undefined ||
        f.releaseDate.to !== undefined
    })

    // Composableを使用してロジックを分離
    const {
      filterChips,
      activeFiltersOptions,
      filterCount,
      clearAllFilters
    } = useSearchFilters()

    const {
      pendingCommand,
      commandSuggestions,
      isValidCommandInput,
      actualInputValue,
      isNegatedInput,
      isCommandMode
    } = useSlashCommands({ searchQuery: computed(() => searchStore.searchQuery) })

    const {
      handleSearch
    } = useSearchExecution({
      deckStore,
      searchMode
    })

    // 候補選択のインデックス管理（composableには含まれていない）
    const selectedSuggestionIndex = ref(-1)
    const selectedCommandIndex = ref(-1)

    // 現在の入力に基づいてフィルタリングされた候補
    const filteredSuggestions = computed(() => {
      if (!pendingCommand.value) return []

      // /clear-one-condの場合は現在の条件リストを返す
      if (pendingCommand.value.command === '/clear-one-cond') {
        const input = actualInputValue.value.toLowerCase()
        if (!input) return activeFiltersOptions.value
        return activeFiltersOptions.value.filter(opt =>
          opt.label.toLowerCase().includes(input)
        )
      }

      const options = FILTER_OPTIONS[pendingCommand.value.filterType]
      if (!options) return []

      // -プレフィックスを除去した実際の値でフィルタリング
      const input = actualInputValue.value
      if (!input) return options

      return options.filter(opt => {
        // value, label をチェック
        if (opt.value.toLowerCase().includes(input) ||
            opt.label.toLowerCase().includes(input)) {
          return true
        }
        // aliases があればチェック
        const aliases = (opt as { aliases?: string[] }).aliases
        if (aliases) {
          return aliases.some(alias => alias.toLowerCase().includes(input))
        }
        return false
      })
    })

    // 表示用フィルターアイコン - filterChipsと重複しないものを表示
    const displayFilterIcons = computed(() => {
      // 共通関数で全アイコンを取得
      return convertFiltersToIcons(searchStore.searchFilters)
    })


    // コマンドモードの検出
    const commandMatch = computed(() => {
      const query = searchStore.searchQuery
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

    const commandPrefix = computed(() => commandMatch.value?.command || '')

    // コマンド名を入力中かどうか（/で始まるがまだスペースがない状態）
    const isTypingCommand = computed(() => {
      const query = searchStore.searchQuery
      return query.startsWith('/') && !pendingCommand.value && !commandMatch.value
    })

    // 動的プレースホルダー
    const currentPlaceholder = computed(() => {
      if (pendingCommand.value) {
        const cmd = pendingCommand.value.command
        // コマンドごとに詳細なプレースホルダーを表示
        const detailedPlaceholders: Record<string, string> = {
          '/attr': '光, dark, 闇',
          '/race': 'ドラゴン, warrior, 戦士',
          '/level': '4, 8 or 4-8',
          '/rank': '4, 8 or 4-8',
          '/atk': '1000, 1000-, -2000, 1000-2000',
          '/def': '2000, 2000-, -1000, 0-1000',
          '/type': 'モンスター, spell, 魔法',
          '/link': '2, 4',
          '/lm': '上, top, 左上',
          '/link-marker': '上, top, 左上',
          '/mtype': '効果, fusion, シンクロ',
          '/pscale': '1, 8 or 1-8',
          '/ps': '1, 8 or 1-8',
          '/date': '2020-01-01 or 2020-01-01~2020-12-31',
          '/search': 'name, text, mydeck',
          '/attr-not': '-光, -dark（除外）',
          '/race-not': '-ドラゴン（除外）',
          '/level-not': '-4（除外）',
          '/rank-not': '-4（除外）',
          '/type-not': '-魔法（除外）',
          '/link-not': '-2（除外）',
          '/mtype-not': '-効果（除外）'
        }
        return detailedPlaceholders[cmd] || `${COMMANDS[cmd]?.description || '値'}を入力...`
      }
      if (searchMode.value === 'mydeck') {
        return 'デッキ名を入力...'
      }
      // 検索モードに応じたプレースホルダー
      const placeholders: Record<string, string> = {
        'name': 'カード名を検索...',
        'text': 'テキストを検索...',
        'pendulum': 'ペンデュラムテキストを検索...'
      }
      return placeholders[searchMode.value] || props.placeholder
    })

    // placeholderの長さに応じたクラスを返す
    const placeholderSizeClass = computed(() => {
      const length = currentPlaceholder.value.length
      if (length > 20) return 'placeholder-small'
      if (length > 15) return 'placeholder-medium'
      return ''
    })

    // 予定チップ（入力が有効な場合のみ表示）
    const previewChip = computed<PreviewChip | null>(() => {
      // 両方の条件を明示的にチェック
      const hasPendingCommand = !!pendingCommand.value
      const hasValidInput = isValidCommandInput.value
      
      if (!hasPendingCommand || !hasValidInput) return null

      const value = actualInputValue.value
      const filterType = pendingCommand.value!.filterType
      const isNot = isNegatedInput.value

      let label = ''
      let mappedValue = value

      // 値をマッピング
      switch (filterType) {
        case 'attributes':
          mappedValue = ATTRIBUTE_MAP[value] || value
          break
        case 'cardType':
          mappedValue = CARD_TYPE_MAP[value] || value
          break
        case 'monsterTypes':
          mappedValue = MONSTER_TYPE_MAP[value] || value
          break
        case 'races': {
          const raceOptions = FILTER_OPTIONS.races
          const option = raceOptions.find(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) return true
            const aliases = (opt as { aliases?: string[] }).aliases
            return aliases?.some(alias => alias.toLowerCase() === value)
          })
          mappedValue = option?.value || value
          break
        }
        case 'searchMode':
          mappedValue = SEARCH_MODE_MAP[value] || value
          break
        case 'linkMarkers': {
          const markerOptions = FILTER_OPTIONS.linkMarkers
          const option = markerOptions.find(opt =>
            opt.value.toLowerCase() === value || opt.label.toLowerCase() === value
          )
          mappedValue = option?.value || value
          break
        }
      }

      label = getChipLabel(filterType, mappedValue)

      return { label, isNot, filterType, value: mappedValue }
    })

    // mydeckモード用の候補リスト
    const mydeckSuggestions = computed<DeckSuggestion[]>(() => {
      if (searchMode.value !== 'mydeck') return []
      const input = searchStore.searchQuery.trim().toLowerCase()
      const decks = deckStore.deckList.map(d => ({
        dno: d.dno,
        name: d.name,
        value: `dno:${d.dno}`,
        label: d.name
      }))
      if (!input) return decks
      return decks.filter(d =>
        d.name.toLowerCase().includes(input)
      )
    })

    // mydeckモードで選択中のインデックス
    const selectedMydeckIndex = ref(-1)

    // チップのラベルを取得（右側のフィルターアイコンと同じ形式・言語対応版）
    const getChipLabel = (type: string, value: string): string => {
      const lang = pageLanguage.value
      switch (type) {
        case 'attributes': {
          const idToText = mappingManager.getAttributeIdToText(lang)
          const dynamicLabel = (idToText as Record<string, string>)[value]
          if (dynamicLabel) {
            // 動的マッピングがある場合、最初の1文字を返す
            return dynamicLabel.slice(0, 1)
          }
          // フォールバック：card-maps.ts から取得
          return ATTRIBUTE_ID_TO_NAME[value as keyof typeof ATTRIBUTE_ID_TO_NAME] || value
        }
        case 'cardType': {
          return CARD_TYPE_ID_TO_SHORTNAME[value as keyof typeof CARD_TYPE_ID_TO_SHORTNAME] || value
        }
        case 'monsterTypes': {
          // card-maps.ts の MONSTER_TYPE_ID_TO_SHORTNAME を使用
          return MONSTER_TYPE_ID_TO_SHORTNAME[value as keyof typeof MONSTER_TYPE_ID_TO_SHORTNAME] || value
        }
        case 'levels':
          return `★${value}`
        case 'linkNumbers':
          return `L${value}`
        case 'atk':
          return 'ATK'
        case 'def':
          return 'DEF'
        case 'races':
          return getRaceLabel(value)
        default:
          return value
      }
    }

    // フォーカスハンドラ
    const handleFocus = () => {
      // mydeckモードの場合は候補を表示
      if (searchMode.value === 'mydeck') {
        showMydeckDropdown.value = true
      }
    }

    // 入力ハンドラ
    const handleInput = () => {
      // 全角数字を半角に自動変換
      if (searchStore.searchQuery !== toHalfWidth(searchStore.searchQuery)) {
        searchStore.searchQuery = toHalfWidth(searchStore.searchQuery)
        return
      }

      const query = searchStore.searchQuery

      // コマンド候補のインデックスをリセット（ペンディングコマンドがない場合のみ）
      if (!pendingCommand.value) {
        selectedCommandIndex.value = -1
      }

      // ペンディングコマンドがある場合は値入力モード
      if (pendingCommand.value) {
        // 候補選択中の入力変更は無視（キーボード操作で値が変わる）
        return
      }

      // コマンドパターンを検出：/cmd + スペース
      for (const cmd of Object.keys(COMMANDS)) {
        if (query === cmd + ' ') {
          // コマンド + スペースで値入力モードに移行
          const cmdDef = COMMANDS[cmd]

          // アクションコマンドで値入力が不要な場合は即座に実行
          if (cmdDef.isAction && (cmd === '/clear' || cmd === '/clear-cond' || cmd === '/clear-text')) {
            pendingCommand.value = {
              command: cmd,
              filterType: cmdDef.filterType,
              isNot: cmdDef.isNot
            }
            addFilterChip() // 即座に実行
            return
          }

          // 前の状態をクリア（予定チップが残らないようにするため）
          selectedSuggestionIndex.value = -1
          pendingCommand.value = {
            command: cmd,
            filterType: cmdDef.filterType,
            isNot: cmdDef.isNot
          }
          searchStore.searchQuery = ''
          return
        }
      }
    }

    // キー入力ハンドラ
    // 共通の候補選択処理
    const handleSuggestionNavigation = (
      event: KeyboardEvent,
      selectedIndex: Ref<number>,
      suggestions: any[],
      onSelect: (item: any) => void,
      containerSelector: string
    ) => {
      if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
          selectedIndex.value = selectedIndex.value < 0
            ? suggestions.length - 1
            : selectedIndex.value <= 0
            ? suggestions.length - 1
            : selectedIndex.value - 1
        } else {
          selectedIndex.value = selectedIndex.value < 0
            ? 0
            : (selectedIndex.value + 1) % suggestions.length
        }
        // 選択中の項目を表示領域内にスクロール（前後2個程度も表示）
        nextTick(() => {
          const container = document.querySelector(containerSelector)
          if (container) {
            const selectedItem = container.querySelector('.suggestion-item.selected')
            if (selectedItem) {
              selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          }
        })
        return true
      }
      if (event.key === 'Enter' && selectedIndex.value >= 0) {
        event.preventDefault()
        const selected = suggestions[selectedIndex.value]
        if (selected) {
          onSelect(selected)
        }
        return true
      }
      return false
    }

    const handleKeydown = (event: KeyboardEvent) => {
      // コマンド候補のTab/Arrow処理
      if (commandSuggestions.value.length > 0 && !pendingCommand.value) {
        if (handleSuggestionNavigation(event, selectedCommandIndex, commandSuggestions.value, selectCommand, '.command-suggestions')) {
          return
        }
      }

      // mydeckモードのTab/Arrow処理
      if (showMydeckDropdown.value) {
        if (handleSuggestionNavigation(event, selectedMydeckIndex, mydeckSuggestions.value, selectMydeck, '.mydeck-suggestions')) {
          return
        }
      }

      // スラッシュコマンドの選択肢のTab/Arrow処理
      if (pendingCommand.value && filteredSuggestions.value.length > 0) {
        const updateInput = (index: number) => {
          const selected = filteredSuggestions.value[index]
          if (selected) {
            const prefix = isNegatedInput.value ? '-' : ''
            searchStore.searchQuery = prefix + selected.value
          }
        }

        const onConfirm = (suggestion: any) => {
          const prefix = isNegatedInput.value ? '-' : ''
          searchStore.searchQuery = prefix + suggestion.value
          nextTick(() => {
            addFilterChip()
          })
        }

        // Tabキーで候補を選択して入力に反映
        if (event.key === 'Tab') {
          if (handleSuggestionNavigation(event, selectedSuggestionIndex, filteredSuggestions.value, onConfirm, '.suggestions-dropdown')) {
            // Tabでは入力に即座に反映
            updateInput(selectedSuggestionIndex.value)
          }
          return
        }

        // ArrowUp/Downキーで候補を選択（入力は反映しない）
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          if (handleSuggestionNavigation(event, selectedSuggestionIndex, filteredSuggestions.value, onConfirm, '.suggestions-dropdown')) {
            return
          }
        }
      }

      // Spaceキーで有効な入力をチップに変換
      if (event.key === ' ' && pendingCommand.value && isValidCommandInput.value) {
        event.preventDefault()
        addFilterChip()
        selectedSuggestionIndex.value = -1
        return
      }

      // Backspaceで空の入力時にチップを削除
      if (event.key === 'Backspace') {
        if (searchStore.searchQuery === '' && pendingCommand.value) {
          // ペンディングコマンドをキャンセル
          event.preventDefault()
          pendingCommand.value = null
          selectedSuggestionIndex.value = -1
          return
        }
        if (searchStore.searchQuery === '' && !pendingCommand.value && filterChips.value.length > 0) {
          // 最後のチップを削除
          event.preventDefault()
          removeFilterChip(filterChips.value.length - 1)
          return
        }
      }
    }

    // フィルターチップを追加
    const addFilterChip = () => {
      if (!pendingCommand.value) return

      const value = actualInputValue.value
      const filterType = pendingCommand.value.filterType

      // アクションコマンドの処理
      if (filterType === 'action') {
        const cmd = pendingCommand.value.command
        if (cmd === '/clear') {
          // 全てクリア
          clearAllFilters()
          searchStore.searchQuery = ''
        } else if (cmd === '/clear-cond') {
          // 条件だけクリア
          clearAllFilters()
        } else if (cmd === '/clear-text') {
          // テキストだけクリア
          searchStore.searchQuery = ''
        } else if (cmd === '/clear-one-cond') {
          // 条件を選択して削除
          if (!value) {
            // 値が入力されていない場合は何もしない（候補リスト表示のみ）
            pendingCommand.value = null
            return
          }

          // 選択された条件を削除
          const selectedValue = value
          const f = searchStore.searchFilters

          if (selectedValue.startsWith('chip-')) {
            // チップを削除
            const index = parseInt(selectedValue.replace('chip-', ''), 10)
            if (index >= 0 && index < filterChips.value.length) {
              removeFilterChip(index)
            }
          } else if (selectedValue === 'cardType') {
            f.cardType = null
          } else if (selectedValue.startsWith('attr-')) {
            const attr = selectedValue.replace('attr-', '')
            const idx = f.attributes.indexOf(attr as Attribute)
            if (idx !== -1) f.attributes.splice(idx, 1)
          } else if (selectedValue.startsWith('race-')) {
            const race = selectedValue.replace('race-', '')
            const idx = f.races.indexOf(race as Race)
            if (idx !== -1) f.races.splice(idx, 1)
          } else if (selectedValue.startsWith('level-')) {
            const level = parseInt(selectedValue.replace('level-', ''), 10)
            const idx = f.levelValues.indexOf(level)
            if (idx !== -1) f.levelValues.splice(idx, 1)
          } else if (selectedValue.startsWith('link-')) {
            const link = parseInt(selectedValue.replace('link-', ''), 10)
            const idx = f.linkValues.indexOf(link)
            if (idx !== -1) f.linkValues.splice(idx, 1)
          } else if (selectedValue.startsWith('mtype-')) {
            const mtype = selectedValue.replace('mtype-', '')
            const idx = f.monsterTypes.findIndex(mt => mt.type === mtype)
            if (idx !== -1) f.monsterTypes.splice(idx, 1)
          } else if (selectedValue === 'atk') {
            f.atk = { exact: false, unknown: false }
          } else if (selectedValue === 'def') {
            f.def = { exact: false, unknown: false }
          }

          pendingCommand.value = null
          searchStore.searchQuery = ''
        } else {
          pendingCommand.value = null
        }
        return
      }

      if (!value) return

      // 検索モードは特別処理（チップにしない）
      if (filterType === 'searchMode') {
        const newMode = SEARCH_MODE_MAP[value]
        if (newMode) {
          searchMode.value = newMode as SearchMode
          // mydeckモードに切り替えた場合はドロップダウンを表示
          if (newMode === 'mydeck') {
            nextTick(() => {
              showMydeckDropdown.value = true
            })
          }
        }
        pendingCommand.value = null
        searchStore.searchQuery = ''
        return
      }

      let mappedValue = value

      // 値をマッピング
      switch (filterType) {
        case 'attributes':
          mappedValue = ATTRIBUTE_MAP[value] || value
          break
        case 'cardType':
          mappedValue = CARD_TYPE_MAP[value] || value
          break
        case 'monsterTypes':
          mappedValue = MONSTER_TYPE_MAP[value] || value
          break
        case 'races': {
          // 種族オプションから内部値を検索
          const raceOptions = FILTER_OPTIONS.races
          const found = raceOptions.find(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) {
              return true
            }
            const aliases = (opt as { aliases?: string[] }).aliases
            if (aliases) {
              return aliases.some(alias => alias.toLowerCase() === value)
            }
            return false
          })
          if (found) {
            mappedValue = found.value
          }
          break
        }
      }

      // コマンド自体がNOTか、または-プレフィックスが付いているか
      const isNot = pendingCommand.value.isNot || isNegatedInput.value

      // 実際のフィルターに適用
      applyChipToFilters(filterType, mappedValue, isNot)

      // 入力をクリア（previewChipを消すため）
      pendingCommand.value = null
      searchStore.searchQuery = ''
      selectedSuggestionIndex.value = -1
    }

    // チップをフィルターに適用
    const applyChipToFilters = (type: string, value: string, isNot: boolean = false) => {
      // NOT条件はクライアントサイドフィルタリングで処理（APIには送らない）
      if (isNot) return

      const f = searchStore.searchFilters

      switch (type) {
        case 'attributes':
          if (!f.attributes.includes(value as Attribute)) {
            f.attributes.push(value as Attribute)
          }
          break
        case 'races':
          if (!f.races.includes(value as Race)) {
            f.races.push(value as Race)
          }
          break
        case 'levels': {
          // 範囲（4-8）、カンマ区切り（3,5）、単一の数値を処理
          if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => parseInt(v, 10))
            for (let i = start; i <= end; i++) {
              if (!f.levelValues.includes(i)) {
                f.levelValues.push(i)
              }
            }
          } else if (value.includes(',')) {
            const levels = value.split(',').map(v => parseInt(v, 10))
            levels.forEach(level => {
              if (!isNaN(level) && !f.levelValues.includes(level)) {
                f.levelValues.push(level)
              }
            })
          } else {
            const level = parseInt(value, 10)
            if (!isNaN(level) && !f.levelValues.includes(level)) {
              f.levelValues.push(level)
            }
          }
          break
        }
        case 'atk': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.atk.min = min
            if (max !== undefined && !isNaN(max)) f.atk.max = max
          } else {
            const val = parseInt(value, 10)
            if (!isNaN(val)) {
              f.atk.exact = true
              f.atk.min = val
              f.atk.max = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.def.min = min
            if (max !== undefined && !isNaN(max)) f.def.max = max
          } else {
            const val = parseInt(value, 10)
            if (!isNaN(val)) {
              f.def.exact = true
              f.def.min = val
              f.def.max = val
            }
          }
          break
        }
        case 'cardType':
          f.cardType = value as CardType
          break
        case 'linkNumbers': {
          // カンマ区切り（2,4）、単一の数値を処理
          if (value.includes(',')) {
            const links = value.split(',').map(v => parseInt(v, 10))
            links.forEach(link => {
              if (!isNaN(link) && !f.linkValues.includes(link)) {
                f.linkValues.push(link)
              }
            })
          } else {
            const link = parseInt(value, 10)
            if (!isNaN(link) && !f.linkValues.includes(link)) {
              f.linkValues.push(link)
            }
          }
          break
        }
        case 'linkMarkers': {
          // リンクマーカーの文字列を数値に変換
          const markerValue = LINK_MARKER_MAP[value]
          if (markerValue !== undefined && !f.linkMarkers.includes(markerValue)) {
            f.linkMarkers.push(markerValue)
          }
          break
        }
        case 'pendulumScales': {
          // 範囲（1-8）、カンマ区切り（1,8）、単一の数値を処理
          if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => parseInt(v, 10))
            for (let i = start; i <= end; i++) {
              if (!f.scaleValues.includes(i)) {
                f.scaleValues.push(i)
              }
            }
          } else if (value.includes(',')) {
            const scales = value.split(',').map(v => parseInt(v, 10))
            scales.forEach(scale => {
              if (!isNaN(scale) && !f.scaleValues.includes(scale)) {
                f.scaleValues.push(scale)
              }
            })
          } else {
            const scale = parseInt(value, 10)
            if (!isNaN(scale) && !f.scaleValues.includes(scale)) {
              f.scaleValues.push(scale)
            }
          }
          break
        }
        case 'releaseDate': {
          // YYYY-MM-DD or YYYY-MM-DD~YYYY-MM-DD 形式
          if (value.includes('~')) {
            const [from, to] = value.split('~')
            f.releaseDate.from = from
            f.releaseDate.to = to
          } else {
            f.releaseDate.from = value
            f.releaseDate.to = value
          }
          break
        }
        case 'monsterTypes':
          if (!f.monsterTypes.some(mt => mt.type === value)) {
            f.monsterTypes.push({ type: value as MonsterType, state: 'normal' })
          }
          break
      }
    }

    // チップを削除
    const removeFilterChip = (index: number) => {
      const chip = filterChips.value[index]
      if (!chip) return

      // フィルターから削除
      removeChipFromFilters(chip.type, chip.value)

      // チップ配列から削除
      filterChips.value.splice(index, 1)
    }

    // チップをフィルターから削除
    const removeChipFromFilters = (type: string, value: string) => {
      const f = searchStore.searchFilters

      switch (type) {
        case 'attributes': {
          const idx = f.attributes.indexOf(value as Attribute)
          if (idx !== -1) f.attributes.splice(idx, 1)
          break
        }
        case 'races': {
          const idx = f.races.indexOf(value as Race)
          if (idx !== -1) f.races.splice(idx, 1)
          break
        }
        case 'levels': {
          const level = parseInt(value, 10)
          const idx = f.levelValues.indexOf(level)
          if (idx !== -1) f.levelValues.splice(idx, 1)
          break
        }
        case 'atk':
          f.atk = { exact: false, unknown: false }
          break
        case 'def':
          f.def = { exact: false, unknown: false }
          break
        case 'cardType':
          f.cardType = null
          break
        case 'linkNumbers': {
          const link = parseInt(value, 10)
          const idx = f.linkValues.indexOf(link)
          if (idx !== -1) f.linkValues.splice(idx, 1)
          break
        }
        case 'linkMarkers': {
          const markerValue = LINK_MARKER_MAP[value]
          if (markerValue !== undefined) {
            const idx = f.linkMarkers.indexOf(markerValue)
            if (idx !== -1) f.linkMarkers.splice(idx, 1)
          }
          break
        }
        case 'monsterTypes': {
          const idx = f.monsterTypes.findIndex(mt => mt.type === value)
          if (idx !== -1) f.monsterTypes.splice(idx, 1)
          break
        }
      }
    }

    // displayFilterIcons のアイコンを削除
    const removeFilterIcon = (icon: FilterIcon) => {
      const f = searchStore.searchFilters

      if (!icon.value) return

      switch (icon.type) {
        case 'attr': {
          const idx = f.attributes.indexOf(icon.value as Attribute)
          if (idx !== -1) {
            f.attributes.splice(idx, 1)
            handleFilterApply(f)
          }
          break
        }
        case 'race': {
          const idx = f.races.indexOf(icon.value as Race)
          if (idx !== -1) {
            f.races.splice(idx, 1)
            handleFilterApply(f)
          }
          break
        }
        case 'level': {
          // 全レベルを削除
          f.levelValues = []
          handleFilterApply(f)
          break
        }
        case 'atk': {
          f.atk = { exact: false, unknown: false }
          handleFilterApply(f)
          break
        }
        case 'def': {
          f.def = { exact: false, unknown: false }
          handleFilterApply(f)
          break
        }
        case 'cardType': {
          f.cardType = null
          handleFilterApply(f)
          break
        }
        case 'link': {
          // 全リンク数を削除
          f.linkValues = []
          handleFilterApply(f)
          break
        }
        case 'linkMarker': {
          // 全リンクマーカーを削除
          f.linkMarkers = []
          handleFilterApply(f)
          break
        }
        case 'monsterType': {
          const idx = f.monsterTypes.findIndex(mt => mt.type === icon.value)
          if (idx !== -1) {
            f.monsterTypes.splice(idx, 1)
            handleFilterApply(f)
          }
          break
        }
        case 'scale': {
          // 全ペンデュラムスケールを削除
          f.scaleValues = []
          handleFilterApply(f)
          break
        }
      }
    }

    // エスケープハンドラ
    const handleEscape = () => {
      if (pendingCommand.value) {
        pendingCommand.value = null
        searchStore.searchQuery = ''
        selectedSuggestionIndex.value = -1
      }
      // 常に親コンポーネントに伝播（emit('escape')はテンプレートで処理）
    }

    // 候補を選択
    // コマンド選択
    const selectCommand = (cmd: { command: string; description: string }) => {
      searchStore.searchQuery = cmd.command + ' '
      selectedCommandIndex.value = -1
      // コマンドモードに移行
      const cmdDef = COMMANDS[cmd.command]
      if (cmdDef) {
        pendingCommand.value = {
          command: cmd.command,
          filterType: cmdDef.filterType,
          isNot: cmdDef.isNot
        }
        searchStore.searchQuery = ''
      }
      inputRef.value?.focus()
    }

    const selectSuggestion = (suggestion: { value: string; label: string }) => {
      // -プレフィックスを保持
      const prefix = isNegatedInput.value ? '-' : ''
      searchStore.searchQuery = prefix + suggestion.value
      selectedSuggestionIndex.value = -1
      // 選択したら即チップに変換
      nextTick(() => {
        addFilterChip()
      })
    }

    // mydeckモードでデッキを選択
    const selectMydeck = (deck: { dno: number; name: string }) => {
      // デッキ名を入力欄に設定
      searchStore.searchQuery = deck.name
      loadMydeckCards(deck.dno)
      // ドロップダウンを閉じる
      showMydeckDropdown.value = false
    }

    // デッキのカードを読み込んで検索結果に表示
    const loadMydeckCards = async (dno: number) => {
      searchStore.isLoading = true
      deckStore.activeTab = 'search'

      try {
        const cgid = await sessionManager.getCgid()
        const deckDetail = await getDeckDetail(dno, cgid)

        if (!deckDetail) {
          console.error('Failed to load deck detail')
          return
        }

        // 全カードを収集（TempCardDBから取得）
        // cid-ciidのペアで重複排除（イラスト違いは別々に表示）
        const tempCardDB = getTempCardDB()
        const seenCards = new Set<string>()
        const uniqueCards: CardInfo[] = []

        deckDetail.mainDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })
        deckDetail.extraDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })
        deckDetail.sideDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })

        // 検索結果に設定（各カード種類1つずつ）
        searchStore.searchResults = uniqueCards as unknown as typeof searchStore.searchResults
        searchStore.allResults = uniqueCards as unknown as typeof searchStore.allResults
        searchStore.hasMore = false
        searchStore.currentPage = 0

        // 選択インデックスをリセット
        selectedMydeckIndex.value = -1
      } catch (error) {
        console.error('Failed to load mydeck cards:', error)
      } finally {
        searchStore.isLoading = false
      }
    }

    // Enterキーハンドラ
    const handleEnter = () => {
      // mydeckモードの場合
      if (searchMode.value === 'mydeck' && !pendingCommand.value) {
        // 選択中のデッキがある場合
        if (selectedMydeckIndex.value >= 0) {
          const selected = mydeckSuggestions.value[selectedMydeckIndex.value]
          if (selected) {
            loadMydeckCards(selected.dno)
            return
          }
        }
        // 入力に一致するデッキがある場合
        const matchedDeck = mydeckSuggestions.value.find(d =>
          d.name.toLowerCase() === searchStore.searchQuery.trim().toLowerCase()
        )
        if (matchedDeck) {
          loadMydeckCards(matchedDeck.dno)
          return
        }
        // 候補が1つだけの場合はそれを選択
        if (mydeckSuggestions.value.length === 1) {
          loadMydeckCards(mydeckSuggestions.value[0].dno)
          return
        }
        return
      }

      // 候補が選択されている場合はその候補をチップに変換
      if (pendingCommand.value && selectedSuggestionIndex.value >= 0) {
        const selected = filteredSuggestions.value[selectedSuggestionIndex.value]
        if (selected) {
          // -プレフィックスを保持
          const prefix = isNegatedInput.value ? '-' : ''
          searchStore.searchQuery = prefix + selected.value
          selectedSuggestionIndex.value = -1
          nextTick(() => {
            addFilterChip()
          })
          return
        }
      }

      // 有効な入力がある場合はチップに変換
      if (pendingCommand.value && isValidCommandInput.value) {
        addFilterChip()
        return
      }

      // コマンド入力中の場合は何もしない
      if (isTypingCommand.value) {
        return
      }

      // コマンドモードの場合はフィルタを適用
      if (isCommandMode.value) {
        applyCommandFilter()
        searchStore.searchQuery = '' // コマンド部分をクリア
        return
      }

      // それ以外は検索実行
      handleSearch()
    }

    // コマンドからフィルタを適用
    const applyCommandFilter = () => {
      const match = commandMatch.value
      if (!match) return

      const cmd = COMMANDS[match.command]
      if (!cmd) return

      const value = match.value.trim().toLowerCase()
      if (!value) return

      const f = searchStore.searchFilters

      switch (cmd.filterType) {
        case 'attributes': {
          const attr = ATTRIBUTE_MAP[value]
          if (attr && !f.attributes.includes(attr as Attribute)) {
            f.attributes.push(attr as Attribute)
          }
          break
        }
        case 'races': {
          // 種族は部分一致で検索（TODO: 種族マッピングを追加）
          const raceValue = value as Race
          if (raceValue && !f.races.includes(raceValue)) {
            f.races.push(raceValue)
          }
          break
        }
        case 'levels': {
          const level = parseInt(value, 10)
          if (!isNaN(level) && level >= 1 && level <= 12 && !f.levelValues.includes(level)) {
            f.levelValues.push(level)
          }
          break
        }
        case 'atk': {
          // ATK:1000-2000 または ATK:1000 形式
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.atk.min = min
            if (max !== undefined && !isNaN(max)) f.atk.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0], 10)
            if (!isNaN(val)) {
              f.atk.exact = true
              f.atk.min = val
              f.atk.max = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.def.min = min
            if (max !== undefined && !isNaN(max)) f.def.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0], 10)
            if (!isNaN(val)) {
              f.def.exact = true
              f.def.min = val
              f.def.max = val
            }
          }
          break
        }
        case 'cardType': {
          const type = CARD_TYPE_MAP[value]
          if (type) {
            f.cardType = type as CardType
          }
          break
        }
        case 'linkNumbers': {
          const link = parseInt(value, 10)
          if (!isNaN(link) && link >= 1 && link <= 6 && !f.linkValues.includes(link)) {
            f.linkValues.push(link)
          }
          break
        }
        case 'monsterTypes': {
          const mtype = MONSTER_TYPE_MAP[value]
          if (mtype && !f.monsterTypes.some(mt => mt.type === mtype)) {
            f.monsterTypes.push({ type: mtype as MonsterType, state: 'normal' })
          }
          break
        }
      }

      // コマンドをクリアして検索クエリを空に
      searchStore.searchQuery = ''
    }

    const handleFilterApply = (filters: SearchFilters) => {
      searchStore.searchFilters = filters
      // ダイアログは「×」ボタンで明示的に閉じる仕様（自動で閉じない）
      // deckStore.isFilterDialogVisible = false
      if (searchStore.searchQuery.trim()) {
        handleSearch()
      }
    }

    // クライアント側でフィルター条件を適用
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
      searchStore,
      inputRef,
      searchMode,
      showMydeckDropdown,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      isCommandMode,
      commandPrefix,
      filterChips,
      pendingCommand,
      isValidCommandInput,
      currentPlaceholder,
      placeholderSizeClass,
      previewChip,
      filteredSuggestions,
      selectedSuggestionIndex,
      mydeckSuggestions,
      selectedMydeckIndex,
      isBottomPosition,
      commandSuggestions,
      selectedCommandIndex,
      selectCommand,
      handleFilterApply,
      handleSearch,
      handleInput,
      handleFocus,
      handleKeydown,
      handleEnter,
      handleEscape,
      removeFilterChip,
      removeFilterIcon,
      selectSuggestion,
      selectMydeck,
      clearAllFilters
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
  min-width: 0;
  box-sizing: border-box;
}

/* フィルターアイコンスタイル - 二行均等配置 */
.filter-icons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-right: 4px;
  flex-shrink: 1;
  min-width: 0;
  max-width: 80px;
}

.filter-row {
  display: flex;
  gap: 2px;
  overflow: hidden;
}

/* 画面サイズに応じて表示幅を調整 */
@media (min-width: 400px) {
  .filter-icons {
    max-width: 120px;
  }
}

@media (min-width: 500px) {
  .filter-icons {
    max-width: 160px;
  }
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
  flex-direction: column;
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: visible;
  justify-content: center;

  &.command-mode {
    background: var(--command-mode-bg);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 4px;

    // 有効な入力時
    &.valid {
      background: var(--command-mode-valid-bg);
    }
  }
}

/* 入力行 */
.input-row {
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;
}

.search-input-bar {
  display: flex;
  align-items: center;
  position: relative;
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 2px 10px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

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
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 4px 8px;
  background: transparent;
  color: var(--text-primary, #333);
  line-height: 1.2;
  min-width: 80px;
  transition: background-color 0.2s ease;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }

  // placeholderの長さに応じてフォントサイズを調整
  &.placeholder-medium::placeholder {
    font-size: 12px;
  }

  &.placeholder-small::placeholder {
    font-size: 10px;
  }
}

.left-buttons {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex: 1;
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
  color: var(--button-text);
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

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  svg {
    display: block;
  }
}
</style>
