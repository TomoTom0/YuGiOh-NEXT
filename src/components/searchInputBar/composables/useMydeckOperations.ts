/**
 * マイデッキ操作管理のComposable
 * デッキ候補リスト、選択、読み込み処理を担当
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useDeckEditStore } from '@/stores/deck-edit'
import { useSearchStore } from '@/stores/search'
import type { SearchMode } from '@/types/settings'
import type { CardInfo } from '@/types/card'
import { getDeckDetail } from '@/api/deck-operations'
import { sessionManager } from '@/content/session/session'
import { getTempCardDB } from '@/utils/temp-card-db'
import type { DeckSuggestion } from '@/types/search-ui'

export interface UseMydeckOperationsOptions {
  searchMode: ComputedRef<SearchMode>
}

export interface UseMydeckOperationsReturn {
  showMydeckDropdown: Ref<boolean>
  mydeckSuggestions: ComputedRef<DeckSuggestion[]>
  selectMydeck: (deck: { dno: number; name: string }) => void
  loadMydeckCards: (dno: number) => Promise<void>
}

export function useMydeckOperations(
  options: UseMydeckOperationsOptions
): UseMydeckOperationsReturn {
  const deckStore = useDeckEditStore()
  const searchStore = useSearchStore()
  const { searchMode } = options

  const showMydeckDropdown = ref(false)

  /**
   * マイデッキ候補リスト（mydeckモード時のみ）
   */
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

  /**
   * デッキ選択処理
   */
  const selectMydeck = (deck: { dno: number; name: string }) => {
    searchStore.searchQuery = deck.name
    loadMydeckCards(deck.dno)
    showMydeckDropdown.value = false
  }

  /**
   * デッキのカードを読み込んで検索結果に表示
   */
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
    } catch (error) {
      console.error('Failed to load mydeck cards:', error)
    } finally {
      searchStore.isLoading = false
    }
  }

  return {
    showMydeckDropdown,
    mydeckSuggestions,
    selectMydeck,
    loadMydeckCards
  }
}
