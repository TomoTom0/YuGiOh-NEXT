import { type Ref, computed, nextTick, toRaw } from 'vue'
import type { CardInfo, Attribute, Race } from '../../../types/card'
import type { SearchFilters } from '../../../types/search-filters'
import type { SearchOptions } from '../../../api/card-search'
import { useDeckEditStore } from '../../../stores/deck-edit'
import { useSearchStore } from '../../../stores/search'
import type { SortOrder } from '../../../types/settings'
import { useSearchHistory } from '../../../composables/useSearchHistory'
import { buildSearchOptions } from '../../../utils/search-options-builder'

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
 * 検索実行のcomposable
 *
 * 検索ロジックとクライアント側フィルタリングを提供
 */
export function useSearchExecution(options: UseSearchExecutionOptions): UseSearchExecutionReturn {
  const { deckStore, searchMode } = options
  const searchStore = useSearchStore()
  const searchHistory = useSearchHistory()

  // 指定されたフィルターが何かしら有効かどうかを判定
  const computeHasActiveFilters = (f: SearchFilters): boolean => {
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
  }

  // hasActiveFiltersを直接計算（検索開始前のクリア判定など、ライブ状態が必要な箇所で使用）
  const hasActiveFilters = computed(() => computeHasActiveFilters(searchStore.searchFilters))

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
          const matches = (mt: SearchFilters['monsterTypes'][number]) => {
            if (mt.state === 'normal') {
              return cardTypes.includes(mt.type)
            } else if (mt.state === 'not') {
              return !cardTypes.includes(mt.type)
            }
            return false
          }
          // AND条件（全ての条件を満たす）またはOR条件（いずれかの条件を満たす）
          const hasMatch = filters.monsterTypeMatchMode === 'and'
            ? filters.monsterTypes.every(matches)
            : filters.monsterTypes.some(matches)
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
        // card.linkMarkers はビットフラグ（bit N-1 = 方向N）であり配列ではないため、
        // ビット演算で方向の有無を判定する
        if (filters.linkMarkers.length > 0 && 'linkMarkers' in card) {
          const cardMarkerBits = typeof (card as any).linkMarkers === 'number' ? (card as any).linkMarkers : 0
          const hasDirection = (pos: number) => (cardMarkerBits & (1 << (pos - 1))) !== 0
          // AND条件（全てのマーカーが含まれている）またはOR条件（いずれかのマーカーが含まれている）
          const hasMatch = filters.linkMarkerMatchMode === 'and'
            ? filters.linkMarkers.every(hasDirection)
            : filters.linkMarkers.some(hasDirection)
          if (!hasMatch) {
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
      searchStore.searchGeneration++
      searchStore.searchResults = []
      searchStore.allResults = []
      searchStore.hasMore = false
      searchStore.currentPage = 0
      searchStore.isLoading = false
      return
    }

    // この検索呼び出し固有の世代番号。古い検索の遅延処理（拡張検索）が
    // 後から完了して新しい検索結果を上書きしてしまうのを防ぐため、
    // ストアへの書き込み前に必ずこの世代がまだ最新かを確認する。
    const myGeneration = ++searchStore.searchGeneration

    deckStore.activeTab = 'search'
    searchStore.isLoading = true
    // 新しい検索条件を反映していない直前の検索結果が、fetch完了まで
    // 画面に残り続けて見えてしまうため、ここでクリアする
    searchStore.searchResults = []
    searchStore.allResults = []

    // 検索実行中にフィルターダイアログで条件が変更されても、この検索が
    // 送信した条件と結果のフィルタリング・履歴登録がずれないよう、
    // 検索開始時点のフィルターをディープクローンして以降はこれを使う
    const filtersSnapshot: SearchFilters = JSON.parse(JSON.stringify(toRaw(searchStore.searchFilters)))

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
        // autoモード用のSearchOptionsを構築
        const autoOptions = buildSearchOptions(
          keyword,
          '1',  // searchTypeはauto関数内で上書きされるので仮の値
          deckStore.sortOrder as SortOrder,
          filtersSnapshot
        )

        const autoResult = await searchCardsAuto(autoOptions)
        results = autoResult.cards
        const autoResultCount = results.length  // フィルタリング前の件数を保存

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
          filtersSnapshot
        )

        results = await searchCards(searchOptions)
      }

      // 「もっと取得できるページがあるか」はサーバーから返った生の件数で判定する必要があるため、
      // クライアント側フィルタ適用前の件数を保持しておく
      const rawResultCount = results.length

      // モンスタータイプ・リンクマーカーのAND/OR等は検索サーバー側では正しく
      // 絞り込まれないため、検索経路（auto/name/text/pendulum）によらず必ず
      // クライアント側フィルタを適用する
      results = applyClientSideFilters(results, filtersSnapshot)

      // 他の検索が既に開始されている場合、この検索結果は古いため反映しない
      if (searchStore.searchGeneration !== myGeneration) {
        return
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
      // 検索実行中にフィルターダイアログで条件が変更される可能性があるため、
      // 履歴登録の要否は実際に検索へ使われた filtersSnapshot を基準に判定する
      if (query || computeHasActiveFilters(filtersSnapshot)) {
        const resultCids = results.map(card => card.cardId)
        searchHistory.addToHistory(query, searchMode.value, filtersSnapshot, resultCids)
      }

      if (rawResultCount >= 100) {
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

              // 待機中に別の検索が開始されていた場合、この拡張検索結果は古いため反映しない
              if (searchStore.searchGeneration !== myGeneration) {
                return
              }

              if (moreResults.length > 100) {
                const filteredMoreResults = applyClientSideFilters(moreResults, filtersSnapshot)
                searchStore.searchResults = filteredMoreResults as unknown as typeof searchStore.searchResults
                searchStore.allResults = filteredMoreResults as unknown as typeof searchStore.allResults
                searchStore.hasMore = moreResults.length >= 2000
                searchStore.currentPage = 1
              } else {
                searchStore.hasMore = false
              }
            } catch (error) {
              console.error('Extended search error:', error)
              if (searchStore.searchGeneration === myGeneration) {
                searchStore.hasMore = false
              }
            }
          }, 1000)
        }
      } else {
        searchStore.hasMore = false
      }
    } catch (error) {
      console.error('Search error:', error)
      if (searchStore.searchGeneration === myGeneration) {
        searchStore.searchResults = []
        searchStore.allResults = []
        searchStore.hasMore = false
      }
    } finally {
      if (searchStore.searchGeneration === myGeneration) {
        searchStore.isLoading = false
      }
    }
  }

  return {
    applyClientSideFilters,
    handleSearch
  }
}
