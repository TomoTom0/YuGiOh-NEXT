import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SearchFilters } from '../types/search-filters'
import type { CardInfo } from '../types/card'
import { inferExclusions, loadExclusionRules } from '../utils/search-exclusion-engine'
import { toSearchConditionState } from '../utils/search-exclusion-adapter'

/**
 * 検索結果配列の型（searchResults / allResults 共用）
 *
 * 全ての書き込み箇所がフラットな CardInfo[]（ラッパーなし）を代入する実態に合わせた型。
 * 検索結果構造が将来変化する場合はこのエイリアスの変更のみで対応する。
 */
export type SearchResults = CardInfo[]

export const useSearchStore = defineStore('search', () => {
  // 検索クエリ
  const searchQuery = ref('')

  // 検索結果
  const searchResults = ref<SearchResults>([])
  const allResults = ref<SearchResults>([])

  // ページネーション
  const currentPage = ref(0)
  const hasMore = ref(false)

  // ローディング状態
  const isLoading = ref(false)

  // 検索世代（古い検索の遅延処理が新しい検索結果を上書きしないようにするためのカウンタ）
  const searchGeneration = ref(0)

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
    searchGeneration,
    searchFilters,
    isGlobalSearchMode,
    exclusionResult,
    clearAllFilters
  }
})
