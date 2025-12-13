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
          @remove-icon="removeFilterIcon"
          @clear-all="clearAllFilters"
        />
        <!-- 入力行 -->
        <SearchInputField
          ref="inputFieldRef"
          v-model="searchStore.searchQuery"
          :placeholder="currentPlaceholder"
          :placeholder-size-class="placeholderSizeClass"
          :pending-command="pendingCommand"
          @input="handleInput"
          @focus="handleFocus"
          @enter="handleEnter"
          @escape="handleEscape(); $emit('escape')"
          @keydown="handleKeydown"
        />
        <!-- 候補リスト -->
        <SuggestionContainer
          :pending-command="pendingCommand"
          :command-suggestions="formattedCommandSuggestions"
          :filtered-suggestions="filteredSuggestions"
          :mydeck-suggestions="mydeckSuggestions"
          :selected-command-index="selectedCommandIndex"
          :selected-suggestion-index="selectedSuggestionIndex"
          :selected-mydeck-index="selectedMydeckIndex"
          :show-mydeck-dropdown="showMydeckDropdown"
          :is-bottom-position="isBottomPosition"
          @select-command="selectCommand"
          @select-suggestion="selectSuggestion"
          @select-mydeck="selectMydeck"
          @close-mydeck="showMydeckDropdown = false"
        />
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
      />
    </div>

  </div>
</template>

<script lang="ts">
import { ref, computed, nextTick, defineComponent, defineAsyncComponent, toRef } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSearchStore } from '../../stores/search'
import { useSettingsStore } from '../../stores/settings'

// 循環参照回避のため動的インポート
const SearchFilterDialog = defineAsyncComponent(() => import('../SearchFilterDialog.vue'))
import type { Attribute, Race, MonsterType, CardType } from '../../types/card'
import type { SearchMode } from '../../types/settings'
import {
  COMMANDS,
  ATTRIBUTE_MAP,
  CARD_TYPE_MAP,
  MONSTER_TYPE_MAP
} from '../../constants/search-constants'
import { useSlashCommands } from './composables/useSlashCommands'
import { useSearchFilters } from './composables/useSearchFilters'
import { useSearchExecution } from './composables/useSearchExecution'
import { useKeyboardNavigation } from './composables/useKeyboardNavigation'
import { useMydeckOperations } from './composables/useMydeckOperations'
import { useFilterInput } from './composables/useFilterInput'
import SearchFilterChips from './components/SearchFilterChips.vue'
import SearchModeSelector from './components/SearchModeSelector.vue'
import SearchInputField from './components/SearchInputField.vue'
import SuggestionContainer from './components/SuggestionContainer.vue'

export default defineComponent({
  name: 'SearchInputBar',
  components: {
    SearchFilterDialog,
    SearchFilterChips,
    SearchModeSelector,
    SearchInputField,
    SuggestionContainer
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
    const inputFieldRef = ref<InstanceType<typeof SearchInputField> | null>(null)

    // 設定からデフォルト検索モードを取得
    const settingsStore = useSettingsStore()
    const searchMode = computed({
      get: () => settingsStore.appSettings.ux.defaultSearchMode || 'auto',
      set: (value: SearchMode) => {
        settingsStore.appSettings.ux.defaultSearchMode = value
      }
    })

    // マイデッキ操作
    const {
      showMydeckDropdown,
      mydeckSuggestions,
      selectMydeck,
      loadMydeckCards
    } = useMydeckOperations({ searchMode })

    // 検索入力欄の位置を自動検出
    const isBottomPosition = computed(() => {
      if (props.position !== 'default') return props.position === 'bottom'
      // 親要素のクラス名から位置を判定
      const inputEl = inputFieldRef.value?.$el?.querySelector('.search-input')
      const wrapper = inputEl?.closest('.search-input-wrapper')
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

    // キーボードナビゲーション
    const {
      selectedSuggestionIndex,
      selectedCommandIndex,
      selectedMydeckIndex,
      handleSuggestionNavigation
    } = useKeyboardNavigation()

    // フィルター入力とチップ管理
    const {
      previewChip,
      filteredSuggestions,
      displayFilterIcons,
      handleInput,
      handleFocus,
      addFilterChip,
      removeFilterIcon
    } = useFilterInput({
      searchQuery: computed({
        get: () => searchStore.searchQuery,
        set: (value) => { searchStore.searchQuery = value }
      }),
      pendingCommand,
      isValidCommandInput,
      actualInputValue,
      isNegatedInput,
      searchFilters: toRef(searchStore, 'searchFilters'),
      activeFiltersOptions,
      clearAllFilters,
      searchMode,
      showMydeckDropdown
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

    // commandSuggestions を SuggestionList 用の形式に変換
    const formattedCommandSuggestions = computed(() => {
      return commandSuggestions.value.map(suggestion => ({
        value: suggestion.command,
        label: suggestion.description
      }))
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

    // キー入力ハンドラ
    // 共通の候補選択処理
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
      inputFieldRef.value?.focus()
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


    // クライアント側でフィルター条件を適用
    const focus = () => {
      nextTick(() => {
        if (inputFieldRef.value) {
          inputFieldRef.value.focus()
        }
      })
    }

    // autoFocusがtrueの場合、マウント時にフォーカス
    if (props.autoFocus) {
      focus()
    }

    expose({ focus, inputRef: inputFieldRef })

    // removeFilterIcon をラップして onFilterApply を提供
    const handleRemoveFilterIcon = (icon: any) => {
      removeFilterIcon(icon, () => {
        // フィルター削除後の処理（特になし、フィルター状態の更新のみ）
      })
    }

    return {
      deckStore,
      searchStore,
      inputFieldRef,
      searchMode,
      showMydeckDropdown,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      isCommandMode,
      commandPrefix,
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
      formattedCommandSuggestions,
      selectedCommandIndex,
      selectCommand,
      handleSearch,
      handleInput,
      handleFocus,
      handleKeydown,
      handleEnter,
      handleEscape,
      removeFilterIcon: handleRemoveFilterIcon,
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
  font-size: var(--search-ui-font-size, 14px);
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
  font-size: 8px; /* 固定値（14px * 0.57 ≈ 8px） */
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
.search-input-bar {
  display: flex;
  align-items: center;
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  padding: 2px 8px;
  height: 46px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  &:hover,
  &:focus-within {
    border-color: var(--theme-color-start);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  &.compact {
    height: 32px;
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: none;
    border-color: var(--border-primary);

    &:hover,
    &:focus-within {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .menu-btn {
      padding: 4px 6px;
      font-size: var(--search-ui-font-size, 14px);
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
      font-size: calc(var(--search-ui-font-size, 14px) * 1.14);
    }
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
    font-size: calc(var(--search-ui-font-size, 14px) * 1.14);
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
  font-size: calc(var(--search-ui-font-size, 14px) * 0.57);
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
