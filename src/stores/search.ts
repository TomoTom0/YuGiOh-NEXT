import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SearchFilters } from '../types/search-filters'
import type { CardInfo } from '../types/card'
import { inferExclusions, loadExclusionRules } from '../utils/search-exclusion-engine'
import { toSearchConditionState } from '../utils/search-exclusion-adapter'

export const useSearchStore = defineStore('search', () => {
  // 検索クエリ
  const searchQuery = ref('')

  // 検索結果
  const searchResults = ref<Array<{ card: CardInfo }>>([])
  const allResults = ref<Array<{ card: CardInfo }>>([])

  // ページネーション
  const currentPage = ref(0)
  const hasMore = ref(false)

  // ローディング状態
  const isLoading = ref(false)

  // 検索フィルター
  const searchFilters = ref<SearchFilters>({
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

  // グローバル検索モード
  const isGlobalSearchMode = ref(false)

  // exclusionRulesをロード
  const exclusionRules = loadExclusionRules()

  // exclusionResultを計算（getter）
  const exclusionResult = computed(() => {
    const state = toSearchConditionState(searchFilters.value)
    return inferExclusions(state, exclusionRules)
  })

  // 全てのフィルター条件をクリア
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
  }

  return {
    searchQuery,
    searchResults,
    allResults,
    currentPage,
    hasMore,
    isLoading,
    searchFilters,
    isGlobalSearchMode,
    exclusionResult,
    clearAllFilters
  }
})
