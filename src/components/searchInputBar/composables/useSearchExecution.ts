import { type Ref, computed, nextTick } from 'vue'
import type { CardInfo, Attribute, Race, CardType } from '../../../types/card'
import type { SearchFilters } from '../../../types/search-filters'
import type { SearchOptions } from '../../../api/card-search'
import { SORT_ORDER_TO_API_VALUE } from '../../../api/card-search'
import { useDeckEditStore } from '../../../stores/deck-edit'
import { useSearchStore } from '../../../stores/search'
import type { SortOrder } from '../../../types/settings'
import { useSearchHistory } from '../../../composables/useSearchHistory'

/**
 * 検索実行composableのオプション
 */
export interface UseSearchExecutionOptions {
  /** デッキ編集ストア */
  deckStore: ReturnType<typeof useDeckEditStore>
  /** 検索モード */
  searchMode: Ref<string>
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
  const { deckStore, searchMode } = options
  const searchStore = useSearchStore()
  const searchHistory = useSearchHistory()

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

  /**
   * クライアント側でフィルターを適用
   */
  const applyClientSideFilters = (cards: CardInfo[], filters: SearchFilters): CardInfo[] => {
    return cards.filter(card => {
      // カードタイプフィルター
      if (filters.cardType !== null && card.cardType !== filters.cardType) {
        return false
      }

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

        // モンスタータイプフィルター
        if (filters.monsterTypes.length > 0 && 'types' in card) {
          const cardTypes = (card as any).types || []
          // AND条件（全てのtypesが含まれている）またはOR条件
          const hasMatch = filters.monsterTypes.some(mt => {
            if (mt.state === 'normal') {
              return cardTypes.includes(mt.type)
            } else if (mt.state === 'not') {
              return !cardTypes.includes(mt.type)
            }
            return false
          })
          if (!hasMatch) {
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

        // ペンデュラムスケールフィルター
        if (filters.scaleValues.length > 0 && 'scale' in card) {
          if (typeof card.scale === 'number' && !filters.scaleValues.includes(card.scale)) {
            return false
          }
        }

        // リンクマーカーフィルター
        if (filters.linkMarkers.length > 0 && 'linkMarkers' in card) {
          const cardMarkers = (card as any).linkMarkers || []
          // 選択された全てのマーカーが含まれているか確認
          const hasAllMarkers = filters.linkMarkers.every(marker => cardMarkers.includes(marker))
          if (!hasAllMarkers) {
            return false
          }
        }

        // ATKフィルター
        if ((filters.atk.min !== undefined || filters.atk.max !== undefined) && 'atk' in card) {
          const atk = (card as any).atk
          if (typeof atk === 'number') {
            if (filters.atk.min !== undefined && atk < filters.atk.min) {
              return false
            }
            if (filters.atk.max !== undefined && atk > filters.atk.max) {
              return false
            }
          }
        }

        // DEFフィルター
        if ((filters.def.min !== undefined || filters.def.max !== undefined) && 'def' in card) {
          const def = (card as any).def
          if (typeof def === 'number') {
            if (filters.def.min !== undefined && def < filters.def.min) {
              return false
            }
            if (filters.def.max !== undefined && def > filters.def.max) {
              return false
            }
          }
        }
      }

      // 魔法カードのみに適用されるフィルター
      if (card.cardType === 'spell' && filters.spellTypes.length > 0) {
        if (!('effectType' in card) || !filters.spellTypes.includes((card as any).effectType)) {
          return false
        }
      }

      // 罠カードのみに適用されるフィルター
      if (card.cardType === 'trap' && filters.trapTypes.length > 0) {
        if (!('effectType' in card) || !filters.trapTypes.includes((card as any).effectType)) {
          return false
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

    const query = searchStore.searchQuery.trim()

    // クエリもフィルターもない場合のみクリア
    // （空文字列でもフィルターがあれば検索を実行する）
    if (!query && !hasActiveFilters.value) {
      searchStore.searchResults = []
      searchStore.allResults = []
      searchStore.hasMore = false
      searchStore.currentPage = 0
      return
    }

    deckStore.activeTab = 'search'
    searchStore.isLoading = true

    try {
      const keyword = searchStore.searchQuery.trim()

      // autoモードで2文字以下の場合はname検索として扱う
      const effectiveSearchMode = (searchMode.value === 'auto' && keyword.length <= 2) ? 'name' : searchMode.value

      const searchTypeMap: Record<string, string> = {
        'auto': '1',
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      let searchType = searchTypeMap[effectiveSearchMode] || '1'

      // 検索実行時に動的import
      const { searchCards, searchCardsAuto } = await import('@/api/card-search')

      // autoモードの場合は専用の関数を使用
      let results: CardInfo[] = []  // 初期化
      let searchOptions: SearchOptions | null = null
      let delegatedToName = false  // autoモードからname検索に委譲したかどうか

      if (effectiveSearchMode === 'auto') {
        const autoResult = await searchCardsAuto(keyword, 100, searchStore.searchFilters.cardType as CardType | undefined)
        results = autoResult.cards
        const autoResultCount = results.length  // フィルタリング前の件数を保存

        // autoモードでもフィルター条件を適用（クライアント側でフィルタリング）
        results = applyClientSideFilters(results, searchStore.searchFilters)

        // autoモードで100件取得された場合（フィルタリング前の件数で判定）、name検索に委譲して追加取得・sort順を有効化
        if (autoResultCount >= 100) {
          delegatedToName = true
          searchType = '1'  // name検索に切り替え
        }
      }

      if (effectiveSearchMode !== 'auto' || delegatedToName) {
        // 通常の検索（またはautoモードから委譲された場合）
        searchOptions = buildSearchOptions(
          keyword,
          searchType as '1' | '2' | '3' | '4',
          deckStore.sortOrder as SortOrder,
          searchStore.searchFilters
        )

        results = await searchCards(searchOptions)
      }

      // 検索APIを呼び出したのでグローバル検索モードを終了
      searchStore.isGlobalSearchMode = false

      // 検索結果をstore用の形式に変換
      searchStore.searchResults = results as unknown as typeof searchStore.searchResults
      searchStore.allResults = results as unknown as typeof searchStore.allResults

      // 検索実行時に search タブのスクロール位置を上に戻す（アニメーション付き）
      nextTick(() => {
        const editUI = document.querySelector('#ytomo-edit-ui')
        if (editUI) {
          editUI.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })

      // 検索履歴に保存
      if (query || hasActiveFilters.value) {
        const resultCids = results.map(card => card.cardId)
        searchHistory.addToHistory(query, searchMode.value, searchStore.searchFilters, resultCids)
      }

      if (results.length >= 100) {
        searchStore.hasMore = true
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
                searchStore.searchResults = moreResults as unknown as typeof searchStore.searchResults
                searchStore.allResults = moreResults as unknown as typeof searchStore.allResults
                searchStore.hasMore = moreResults.length >= 2000
                searchStore.currentPage = 1
              } else {
                searchStore.hasMore = false
              }
            } catch (error) {
              console.error('Extended search error:', error)
              searchStore.hasMore = false
            }
          }, 1000)
        }
      } else {
        searchStore.hasMore = false
      }
    } catch (error) {
      console.error('Search error:', error)
      searchStore.searchResults = []
      searchStore.allResults = []
      searchStore.hasMore = false
    } finally {
      searchStore.isLoading = false
    }
  }

  return {
    applyClientSideFilters,
    handleSearch
  }
}
