import { type Ref } from 'vue'
import type { CardInfo, Attribute, Race, CardType } from '../../../types/card'
import type { SearchFilters } from '../../../types/search-filters'
import type { SearchOptions } from '../../../api/card-search'
import { SORT_ORDER_TO_API_VALUE } from '../../../api/card-search'
import { useDeckEditStore } from '../../../stores/deck-edit'
import type { SortOrder } from '../../../types/settings'

/**
 * 検索実行composableのオプション
 */
export interface UseSearchExecutionOptions {
  /** デッキ編集ストア */
  deckStore: ReturnType<typeof useDeckEditStore>
  /** 検索モード */
  searchMode: Ref<string>
  /** 検索フィルター */
  searchFilters: Ref<SearchFilters>
  /** アクティブなフィルターがあるかどうか */
  hasActiveFilters: Ref<boolean>
}

/**
 * 検索実行composableの戻り値
 */
export interface UseSearchExecutionReturn {
  /** クライアント側フィルター適用 */
  applyClientSideFilters: (cards: CardInfo[], filters: SearchFilters) => CardInfo[]
  /** 検索実行 */
  handleSearch: () => Promise<void>
}

/**
 * SearchOptionsを構築する
 */
function buildSearchOptions(
  keyword: string,
  searchType: '1' | '2' | '3' | '4',
  sortOrder: SortOrder,
  filters: SearchFilters
): SearchOptions {
  const apiSort = SORT_ORDER_TO_API_VALUE[sortOrder] || 1

  const searchOptions: SearchOptions = {
    keyword,
    searchType,
    resultsPerPage: 100,
    sort: apiSort
  }

  const f = filters
  if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
  if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
  if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
  if (f.levelValues.length > 0) searchOptions.levels = f.levelValues
  if (f.atk.min !== undefined || f.atk.max !== undefined) {
    searchOptions.atk = { from: f.atk.min, to: f.atk.max }
  }
  if (f.def.min !== undefined || f.def.max !== undefined) {
    searchOptions.def = { from: f.def.min, to: f.def.max }
  }
  if (f.monsterTypes.length > 0) {
    const normalTypes = f.monsterTypes.filter(mt => mt.state === 'normal').map(mt => mt.type)
    const notTypes = f.monsterTypes.filter(mt => mt.state === 'not').map(mt => mt.type)
    if (normalTypes.length > 0) searchOptions.monsterTypes = normalTypes as SearchOptions['monsterTypes']
    if (notTypes.length > 0) searchOptions.excludeMonsterTypes = notTypes as SearchOptions['excludeMonsterTypes']
    // normalTypesまたはnotTypesがある場合、AND/OR論理演算を設定
    if (normalTypes.length > 0 || notTypes.length > 0) {
      searchOptions.monsterTypeLogic = f.monsterTypeMatchMode === 'and' ? 'AND' : 'OR'
    }
  }
  if (f.linkValues.length > 0) searchOptions.linkNumbers = f.linkValues
  if (f.linkMarkers.length > 0) {
    searchOptions.linkMarkers = f.linkMarkers
    searchOptions.linkMarkerLogic = f.linkMarkerMatchMode === 'and' ? 'AND' : 'OR'
  }
  if (f.scaleValues.length > 0) searchOptions.pendulumScales = f.scaleValues
  if (f.spellTypes.length > 0) searchOptions.spellEffectTypes = f.spellTypes as SearchOptions['spellEffectTypes']
  if (f.trapTypes.length > 0) searchOptions.trapEffectTypes = f.trapTypes as SearchOptions['trapEffectTypes']
  if (f.releaseDate.from || f.releaseDate.to) {
    searchOptions.releaseDate = {}
    if (f.releaseDate.from) {
      const parts = f.releaseDate.from.split('-')
      if (parts[0] && parts[1] && parts[2]) {
        const year: number = parseInt(parts[0], 10)
        const month: number = parseInt(parts[1], 10)
        const day: number = parseInt(parts[2], 10)
        searchOptions.releaseDate.start = { year, month, day }
      }
    }
    if (f.releaseDate.to) {
      const parts = f.releaseDate.to.split('-')
      if (parts[0] && parts[1] && parts[2]) {
        const year: number = parseInt(parts[0], 10)
        const month: number = parseInt(parts[1], 10)
        const day: number = parseInt(parts[2], 10)
        searchOptions.releaseDate.end = { year, month, day }
      }
    }
  }

  return searchOptions
}

/**
 * 検索実行のcomposable
 *
 * 検索ロジックとクライアント側フィルタリングを提供
 */
export function useSearchExecution(options: UseSearchExecutionOptions): UseSearchExecutionReturn {
  const { deckStore, searchMode, searchFilters, hasActiveFilters } = options

  /**
   * クライアント側でフィルターを適用
   */
  const applyClientSideFilters = (cards: CardInfo[], filters: SearchFilters): CardInfo[] => {
    return cards.filter(card => {
      // モンスターカードのみに適用されるフィルター
      if (card.cardType === 'monster') {
        // 属性フィルター
        if (filters.attributes.length > 0) {
          if (!('attribute' in card) || !filters.attributes.includes(card.attribute as Attribute)) {
            return false
          }
        }

        // 種族フィルター
        if (filters.races.length > 0) {
          if (!('race' in card) || !filters.races.includes(card.race as Race)) {
            return false
          }
        }

        // レベルフィルター
        if (filters.levelValues.length > 0 && 'level' in card) {
          if (typeof card.level === 'number' && !filters.levelValues.includes(card.level)) {
            return false
          }
        }

        // リンク値フィルター
        if (filters.linkValues.length > 0 && 'link' in card) {
          if (typeof card.link === 'number' && !filters.linkValues.includes(card.link)) {
            return false
          }
        }
      }

      return true
    })
  }

  /**
   * 検索を実行
   */
  const handleSearch = async () => {
    // フィルターダイアログを自動クローズ
    deckStore.isFilterDialogVisible = false

    const query = deckStore.searchQuery.trim()

    if (!query && !hasActiveFilters.value) {
      deckStore.searchResults = []
      deckStore.allResults = []
      deckStore.hasMore = false
      deckStore.currentPage = 0
      return
    }

    deckStore.activeTab = 'search'
    deckStore.isLoading = true

    const searchTypeMap: Record<string, string> = {
      'auto': '1', // autoモードはsearchCardsAutoで処理するため、ここでは使われない
      'name': '1',
      'text': '2',
      'pendulum': '3'
    }
    let searchType = searchTypeMap[searchMode.value] || '1'  // autoモードから委譲する場合があるのでlet

    try {
      const keyword = deckStore.searchQuery.trim()

      // 検索実行時に動的import
      const { searchCards, searchCardsAuto } = await import('@/api/card-search')

      // autoモードの場合は専用の関数を使用
      let results: CardInfo[] = []  // 初期化
      let searchOptions: SearchOptions | null = null
      let delegatedToName = false  // autoモードからname検索に委譲したかどうか

      if (searchMode.value === 'auto') {
        const autoResult = await searchCardsAuto(keyword, 100, searchFilters.value.cardType as CardType | undefined)
        results = autoResult.cards
        const autoResultCount = results.length  // フィルタリング前の件数を保存

        // autoモードでもフィルター条件を適用（クライアント側でフィルタリング）
        results = applyClientSideFilters(results, searchFilters.value)

        // autoモードで100件取得された場合（フィルタリング前の件数で判定）、name検索に委譲して追加取得・sort順を有効化
        if (autoResultCount >= 100) {
          console.log('[handleSearch] autoモードで100件取得 → name検索に委譲')
          delegatedToName = true
          searchType = '1'  // name検索に切り替え
        }
      }

      if (searchMode.value !== 'auto' || delegatedToName) {
        // 通常の検索（またはautoモードから委譲された場合）
        searchOptions = buildSearchOptions(
          keyword,
          searchType as '1' | '2' | '3' | '4',
          deckStore.sortOrder as SortOrder,
          searchFilters.value
        )

        console.log('[handleSearch] searchOptions:', JSON.stringify(searchOptions, null, 2))
        results = await searchCards(searchOptions)
        console.log('[handleSearch] results count:', results.length)
      }

      // 検索APIを呼び出したのでグローバル検索モードを終了
      deckStore.isGlobalSearchMode = false

      // 検索結果をstore用の形式に変換
      deckStore.searchResults = results as unknown as typeof deckStore.searchResults
      deckStore.allResults = results as unknown as typeof deckStore.allResults

      if (results.length >= 100) {
        deckStore.hasMore = true
        // autoモード以外の場合のみ、拡張検索を実行
        if (searchOptions !== null) {
          setTimeout(async () => {
            try {
              const { searchCards } = await import('@/api/card-search')
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
        }
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

  return {
    applyClientSideFilters,
    handleSearch
  }
}
