/**
 * フィルター入力とチップ管理のComposable
 *
 * 責務:
 * - フィルター入力処理 (handleInput, handleFocus)
 * - プレビューチップ生成 (previewChip)
 * - チップの追加/削除 (addFilterChip, removeFilterChip)
 * - フィルターアイコン管理 (displayFilterIcons, removeFilterIcon)
 * - 候補リストのフィルタリング (filteredSuggestions)
 * - チップラベル生成 (getChipLabel)
 */

import { computed, nextTick, type Ref, type ComputedRef } from 'vue'
import type { SearchFilters } from '@/types/search-filters'
import type { PreviewChip } from '@/types/search-ui'
import type { Attribute, Race, MonsterType, CardType } from '@/types/card'
import type { SearchMode } from '@/types/settings'
import type { FilterIcon } from '@/utils/filter-icons'
import { convertFiltersToIcons } from '@/utils/filter-icons'
import { getRaceLabel } from '@/utils/filter-label'
import { detectLanguage } from '@/utils/language-detector'
import { mappingManager } from '@/utils/mapping-manager'
import { useSearchHistory } from '@/composables/useSearchHistory'
import {
  COMMANDS,
  SEARCH_MODE_MAP,
  ATTRIBUTE_MAP,
  CARD_TYPE_MAP,
  MONSTER_TYPE_MAP,
  LINK_MARKER_MAP,
  FILTER_OPTIONS,
  toHalfWidth
} from '@/constants/search-constants'
import {
  ATTRIBUTE_ID_TO_NAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  MONSTER_TYPE_ID_TO_SHORTNAME
} from '@/types/card-maps'
import type { PendingCommand } from './useSlashCommands'

export interface UseFilterInputOptions {
  searchQuery: Ref<string>
  pendingCommand: Ref<PendingCommand | null>
  isValidCommandInput: ComputedRef<boolean>
  actualInputValue: ComputedRef<string>
  isNegatedInput: ComputedRef<boolean>
  searchFilters: Ref<SearchFilters>
  activeFiltersOptions: ComputedRef<{ value: string; label: string }[]>
  clearAllFilters: () => void
  searchMode: Ref<SearchMode>
  showMydeckDropdown: Ref<boolean>
}

export interface UseFilterInputReturn {
  previewChip: ComputedRef<PreviewChip | null>
  filteredSuggestions: ComputedRef<{ value: string; label: string; aliases?: string[] }[]>
  displayFilterIcons: ComputedRef<FilterIcon[]>
  handleInput: () => void
  handleFocus: () => void
  addFilterChip: () => void
  removeFilterIcon: (icon: FilterIcon, onFilterApply: (filters: SearchFilters) => void) => void
  getChipLabel: (type: string, value: string) => string
}

/**
 * フィルター入力とチップ管理のComposable
 */
export function useFilterInput(options: UseFilterInputOptions): UseFilterInputReturn {
  const {
    searchQuery,
    pendingCommand,
    isValidCommandInput,
    actualInputValue,
    isNegatedInput,
    searchFilters,
    activeFiltersOptions,
    clearAllFilters,
    searchMode,
    showMydeckDropdown
  } = options

  // 検索履歴の取得
  const { favoriteItems, regularItems } = useSearchHistory()

  // ページ言語を検出（多言語対応）
  const pageLanguage = computed(() => {
    return detectLanguage(document)
  })

  /**
   * チップのラベルを取得（右側のフィルターアイコンと同じ形式・言語対応版）
   */
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

  /**
   * 予定チップ（入力が有効な場合のみ表示）
   */
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
        if (raceOptions) {
          const option = raceOptions.find(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) return true
            const aliases = (opt as { aliases?: string[] }).aliases
            return aliases?.some(alias => alias.toLowerCase() === value)
          })
          mappedValue = option?.value || value
        }
        break
      }
      case 'searchMode':
        mappedValue = SEARCH_MODE_MAP[value] || value
        break
      case 'linkMarkers': {
        const markerOptions = FILTER_OPTIONS.linkMarkers
        if (markerOptions) {
          const option = markerOptions.find(opt =>
            opt.value.toLowerCase() === value || opt.label.toLowerCase() === value
          )
          mappedValue = option?.value || value
        }
        break
      }
    }

    label = getChipLabel(filterType, mappedValue)

    return { label, isNot, filterType, value: mappedValue }
  })

  /**
   * 現在の入力に基づいてフィルタリングされた候補
   */
  const filteredSuggestions = computed(() => {
    if (!pendingCommand.value) return []

    // /history-searchの場合は通常の履歴を返す
    if (pendingCommand.value.command === '/history-search') {
      const input = actualInputValue.value.toLowerCase()
      const items = regularItems.value.map((item, index) => ({
        value: `history-${index}`,
        label: item.query || '(クエリなし)'
      }))
      if (!input) return items
      return items.filter(opt => opt.label.toLowerCase().includes(input))
    }

    // /favorite-searchの場合はお気に入りを返す
    if (pendingCommand.value.command === '/favorite-search') {
      const input = actualInputValue.value.toLowerCase()
      const items = favoriteItems.value.map((item, index) => ({
        value: `favorite-${index}`,
        label: item.query || '(クエリなし)'
      }))
      if (!input) return items
      return items.filter(opt => opt.label.toLowerCase().includes(input))
    }

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

  /**
   * 表示用フィルターアイコン - filterChipsと重複しないものを表示
   */
  const displayFilterIcons = computed(() => {
    // 共通関数で全アイコンを取得
    return convertFiltersToIcons(searchFilters.value)
  })

  /**
   * フォーカスハンドラ
   */
  const handleFocus = () => {
    // mydeckモードの場合は候補を表示
    if (searchMode.value === 'mydeck') {
      showMydeckDropdown.value = true
    }
  }

  /**
   * 入力ハンドラ
   */
  const handleInput = () => {
    // 全角数字を半角に自動変換
    if (searchQuery.value !== toHalfWidth(searchQuery.value)) {
      searchQuery.value = toHalfWidth(searchQuery.value)
      return
    }

    const query = searchQuery.value

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
        if (!cmdDef) continue

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

        // ペンディングコマンドを設定
        pendingCommand.value = {
          command: cmd,
          filterType: cmdDef.filterType,
          isNot: cmdDef.isNot
        }
        searchQuery.value = ''
        return
      }
    }
  }

  /**
   * フィルターチップを追加
   */
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
        searchQuery.value = ''
      } else if (cmd === '/clear-cond') {
        // 条件だけクリア
        clearAllFilters()
      } else if (cmd === '/clear-text') {
        // テキストだけクリア
        searchQuery.value = ''
      } else if (cmd === '/history-search') {
        // 履歴から選択
        if (!value) {
          pendingCommand.value = null
          return
        }
        const match = value.match(/^history-(\d+)$/)
        if (match) {
          const index = parseInt(match[1], 10)
          const item = regularItems.value[index]
          if (item) {
            // 履歴アイテムの検索条件を適用
            searchQuery.value = item.query
            searchFilters.value = { ...item.filters }
            searchMode.value = item.searchMode as SearchMode
          }
        }
        pendingCommand.value = null
        searchQuery.value = searchQuery.value // 検索クエリを保持
        return
      } else if (cmd === '/favorite-search') {
        // お気に入りから選択
        if (!value) {
          pendingCommand.value = null
          return
        }
        const match = value.match(/^favorite-(\d+)$/)
        if (match) {
          const index = parseInt(match[1], 10)
          const item = favoriteItems.value[index]
          if (item) {
            // お気に入りアイテムの検索条件を適用
            searchQuery.value = item.query
            searchFilters.value = { ...item.filters }
            searchMode.value = item.searchMode as SearchMode
          }
        }
        pendingCommand.value = null
        searchQuery.value = searchQuery.value // 検索クエリを保持
        return
      } else if (cmd === '/clear-one-cond') {
        // 条件を選択して削除
        if (!value) {
          // 値が入力されていない場合は何もしない（候補リスト表示のみ）
          pendingCommand.value = null
          return
        }

        // 選択された条件を削除
        const selectedValue = value
        const f = searchFilters.value

        if (selectedValue === 'cardType') {
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
        searchQuery.value = ''
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
      searchQuery.value = ''
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
        if (raceOptions) {
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
    searchQuery.value = ''
  }

  /**
   * チップをフィルターに適用
   */
  const applyChipToFilters = (type: string, value: string, isNot: boolean = false) => {
    // NOT条件はクライアントサイドフィルタリングで処理（APIには送らない）
    if (isNot) return

    const f = searchFilters.value

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
          const parts = value.split('-').map(v => parseInt(v, 10))
          const start = parts[0]
          const end = parts[1]
          if (start !== undefined && end !== undefined && !isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (!f.levelValues.includes(i)) {
                f.levelValues.push(i)
              }
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
        // 範囲（2-4）、カンマ区切り（2,4）、単一の数値を処理
        if (value.includes('-')) {
          const parts = value.split('-').map(v => parseInt(v, 10))
          const start = parts[0]
          const end = parts[1]
          if (start !== undefined && end !== undefined && !isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (!f.linkValues.includes(i)) {
                f.linkValues.push(i)
              }
            }
          }
        } else if (value.includes(',')) {
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
        const markerValue = LINK_MARKER_MAP[value]
        if (markerValue !== undefined && !f.linkMarkers.includes(markerValue)) {
          f.linkMarkers.push(markerValue)
        }
        break
      }
      case 'pendulumScales': {
        // 範囲（1-8）、カンマ区切り（1,8）、単一の数値を処理
        if (value.includes('-')) {
          const parts = value.split('-').map(v => parseInt(v, 10))
          const start = parts[0]
          const end = parts[1]
          if (start !== undefined && end !== undefined && !isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (!f.scaleValues.includes(i)) {
                f.scaleValues.push(i)
              }
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
        // 日付範囲を処理
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

  /**
   * displayFilterIcons のアイコンを削除
   */
  const removeFilterIcon = (icon: FilterIcon, onFilterApply: (filters: SearchFilters) => void) => {
    const f = searchFilters.value

    if (!icon.value) return

    switch (icon.type) {
      case 'attr': {
        const idx = f.attributes.indexOf(icon.value as Attribute)
        if (idx !== -1) {
          f.attributes.splice(idx, 1)
          onFilterApply(f)
        }
        break
      }
      case 'race': {
        const idx = f.races.indexOf(icon.value as Race)
        if (idx !== -1) {
          f.races.splice(idx, 1)
          onFilterApply(f)
        }
        break
      }
      case 'level': {
        const level = parseInt(icon.value, 10)
        const idx = f.levelValues.indexOf(level)
        if (idx !== -1) {
          f.levelValues.splice(idx, 1)
          onFilterApply(f)
        }
        break
      }
      case 'link': {
        const link = parseInt(icon.value, 10)
        const idx = f.linkValues.indexOf(link)
        if (idx !== -1) {
          f.linkValues.splice(idx, 1)
          onFilterApply(f)
        }
        break
      }
      case 'mtype': {
        const idx = f.monsterTypes.findIndex(mt => mt.type === icon.value)
        if (idx !== -1) {
          f.monsterTypes.splice(idx, 1)
          onFilterApply(f)
        }
        break
      }
      case 'cardType': {
        f.cardType = null
        onFilterApply(f)
        break
      }
    }
  }

  return {
    previewChip,
    filteredSuggestions,
    displayFilterIcons,
    handleInput,
    handleFocus,
    addFilterChip,
    removeFilterIcon,
    getChipLabel
  }
}
