import { getCardDetailWithCache } from '@/api/card-search'
import { useCardDetailStore } from '@/stores/card-detail'
import { useDeckEditStore } from '@/stores/deck-edit'
import { detectLanguage } from '@/utils/language-detector'
import type { CardInfo } from '@/types/card'

interface ShowCardDetailOptions {
  /** フォールバックとして使用するカード情報 */
  fallbackCard?: CardInfo
  /** フォールバックカードのciidを保持するか（DeckCard用） */
  preserveCiid?: boolean
  /** FAQからのリンクかどうか（useCardLinks用） */
  fromFAQ?: boolean
  /** ローディング状態を管理するか（useCardLinks用） */
  showLoading?: boolean
  /** カードタブを'info'にリセットするか（デフォルト: true） */
  resetCardTab?: boolean
}

/**
 * カード詳細取得→表示の共通フローを提供するcomposable
 *
 * DeckCard, RightArea, useCardLinksで重複していた
 * getCardDetailWithCache→setSelectedCard→activeTab切替→setCardTab
 * の一連のフローを統一する
 */
export function useCardDetailDisplay() {
  const deckStore = useDeckEditStore()
  const cardDetailStore = useCardDetailStore()

  const showCardDetail = async (
    cardId: string,
    options: ShowCardDetailOptions = {}
  ) => {
    const {
      fallbackCard,
      preserveCiid = false,
      fromFAQ = false,
      showLoading = false,
      resetCardTab = true,
    } = options

    try {
      if (showLoading) cardDetailStore.startLoadingCard()

      const currentLang = detectLanguage(document)
      const result = await getCardDetailWithCache(cardId, currentLang, true, 'release_desc', fromFAQ)

      if (result.isPartialFromError) {
        console.warn('[useCardDetailDisplay] Card info may be incomplete for cardId:', cardId)
      }

      const fullCard = result?.detail?.card

      if (fullCard) {
        const cardData = preserveCiid && fallbackCard
          ? { ...fullCard, imgs: fullCard.imgs ? [...fullCard.imgs] : [], ciid: fallbackCard.ciid }
          : fullCard
        cardDetailStore.setSelectedCard(cardData)
      } else if (fallbackCard) {
        const cardData = preserveCiid
          ? { ...fallbackCard, imgs: [...fallbackCard.imgs], ciid: fallbackCard.ciid }
          : fallbackCard
        cardDetailStore.setSelectedCard(cardData)
      } else {
        console.error('[useCardDetailDisplay] Failed to get card info for cardId:', cardId)
        return
      }

      deckStore.activeTab = 'card'
      if (resetCardTab) cardDetailStore.setCardTab('info')
    } catch (error) {
      console.error('[useCardDetailDisplay] Failed for cardId:', cardId, error)

      if (fallbackCard) {
        const cardData = preserveCiid
          ? { ...fallbackCard, imgs: [...fallbackCard.imgs], ciid: fallbackCard.ciid }
          : fallbackCard
        cardDetailStore.setSelectedCard(cardData)
        deckStore.activeTab = 'card'
        if (resetCardTab) cardDetailStore.setCardTab('info')
      }
    } finally {
      if (showLoading) cardDetailStore.endLoadingCard()
    }
  }

  return { showCardDetail }
}
