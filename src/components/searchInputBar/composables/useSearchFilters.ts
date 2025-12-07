/**
 * 検索フィルター管理のComposable
 * チップ管理、フィルター操作、状態管理を担当
 *
 * NOTE: Phase 2の初期実装。将来的にはより詳細な機能を追加予定。
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { SearchFilters } from '@/types/search-filters'
import { getRaceLabel } from '@/utils/filter-label'

export interface FilterChip {
  type: string
  value: string
  label: string
  isNot?: boolean
}

export interface UseSearchFiltersOptions {
  initialFilters?: SearchFilters
}

export interface UseSearchFiltersReturn {
  searchFilters: Ref<SearchFilters>
  filterChips: Ref<FilterChip[]>
  activeFiltersOptions: ComputedRef<{ value: string; label: string }[]>
  hasActiveFilters: ComputedRef<boolean>
  filterCount: ComputedRef<number>
  clearAllFilters: () => void
}

/**
 * 検索フィルター管理のComposable
 */
export function useSearchFilters(options: UseSearchFiltersOptions = {}): UseSearchFiltersReturn {
  const searchFilters = ref<SearchFilters>(options.initialFilters || {
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'or',
    levelType: 'level',
    levelValues: [],
    linkValues: [],
    scaleValues: [],
    linkMarkers: [],
    linkMarkerMatchMode: 'or',
    atk: { exact: false, unknown: false },
    def: { exact: false, unknown: false },
    releaseDate: {}
  })

  const filterChips = ref<FilterChip[]>([])

  /**
   * 現在設定されている条件のリストを生成
   */
  const activeFiltersOptions = computed<{ value: string; label: string }[]>(() => {
    const options: { value: string; label: string }[] = []
    const f = searchFilters.value

    // チップから追加
    filterChips.value.forEach((chip, index) => {
      options.push({
        value: `chip-${index}`,
        label: `${chip.isNot ? '!' : ''}${chip.label} (チップ)`
      })
    })

    // SearchFilterDialogから追加された条件
    if (f.cardType) {
      options.push({ value: 'cardType', label: `カードタイプ: ${f.cardType}` })
    }
    f.attributes.forEach(attr => {
      options.push({ value: `attr-${attr}`, label: `属性: ${attr}` })
    })
    f.races.forEach(race => {
      options.push({ value: `race-${race}`, label: `種族: ${getRaceLabel(race)}` })
    })
    f.levelValues.forEach(level => {
      options.push({ value: `level-${level}`, label: `レベル: ${level}` })
    })
    f.linkValues.forEach(link => {
      options.push({ value: `link-${link}`, label: `リンク: ${link}` })
    })
    f.monsterTypes.forEach(mt => {
      options.push({ value: `mtype-${mt.type}`, label: `モンスタータイプ: ${mt.type}` })
    })
    if (f.atk.min !== undefined || f.atk.max !== undefined) {
      options.push({ value: 'atk', label: `ATK条件` })
    }
    if (f.def.min !== undefined || f.def.max !== undefined) {
      options.push({ value: 'def', label: `DEF条件` })
    }

    return options
  })

  /**
   * アクティブなフィルターが存在するか
   */
  const hasActiveFilters = computed(() => {
    const f = searchFilters.value
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

  /**
   * フィルター条件の数
   */
  const filterCount = computed(() => {
    let count = 0
    const f = searchFilters.value

    if (f.cardType) count++
    count += f.attributes.length
    count += f.spellTypes.length
    count += f.trapTypes.length
    count += f.races.length
    count += f.monsterTypes.length
    count += f.levelValues.length
    count += f.linkValues.length
    count += f.scaleValues.length
    count += f.linkMarkers.length
    if (f.atk.min !== undefined || f.atk.max !== undefined) count++
    if (f.def.min !== undefined || f.def.max !== undefined) count++
    if (f.releaseDate.from || f.releaseDate.to) count++

    return count
  })

  /**
   * 全てのフィルターをクリア
   */
  const clearAllFilters = () => {
    searchFilters.value = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      levelType: 'level',
      levelValues: [],
      linkValues: [],
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    }
    filterChips.value = []
  }

  return {
    searchFilters,
    filterChips,
    activeFiltersOptions,
    hasActiveFilters,
    filterCount,
    clearAllFilters
  }
}
