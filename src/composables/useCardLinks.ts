import { getCardDetailWithCache } from '@/api/card-search'
import { useCardDetailStore } from '@/stores/card-detail'
import { useDeckEditStore } from '@/stores/deck-edit'
import { detectLanguage } from '@/utils/language-detector'

/**
 * カードリンクの解析部分（type: 'text' | 'link'）
 */
export interface CardLinkPart {
  type: 'text' | 'link'
  text: string
  cardId?: string
}

/**
 * カードリンクのパースとクリック処理を提供するcomposable
 */
export function useCardLinks() {
  const deckStore = useDeckEditStore()
  const cardDetailStore = useCardDetailStore()

  /**
   * {{カード名|cid}} 形式のテンプレートをパースして配列に変換
   * @param text - パース対象のテキスト
   * @returns { type: 'text' | 'link', text: string, cardId?: string }[] の配列
   *
   * @example
   * ```typescript
   * const parts = parseCardLinks('「{{ブラック・マジシャン|4335}}」を召喚')
   * // [
   * //   { type: 'text', text: '「' },
   * //   { type: 'link', text: 'ブラック・マジシャン', cardId: '4335' },
   * //   { type: 'text', text: '」を召喚' }
   * // ]
   * ```
   */
  const parseCardLinks = (text: string | undefined): CardLinkPart[] => {
    if (!text) return [{ type: 'text', text: '' }]

    const parts: CardLinkPart[] = []
    const regex = /\{\{([^|]+)\|(\d+)\}\}/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      // マッチ前のテキスト
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          text: text.substring(lastIndex, match.index)
        })
      }

      // カードリンク部分
      parts.push({
        type: 'link',
        text: match[1]!, // カード名
        cardId: match[2]! // cid
      })

      lastIndex = regex.lastIndex
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        text: text.substring(lastIndex)
      })
    }

    return parts.length > 0 ? parts : [{ type: 'text', text }]
  }

  /**
   * カードリンクがクリックされた時の処理
   * @param cardId - カードID
   *
   * @example
   * ```typescript
   * <a @click="handleCardLinkClick('4335')">ブラック・マジシャン</a>
   * ```
   */
  const handleCardLinkClick = async (cardId: string): Promise<void> => {
    try {
      // カード詳細を取得（cidのみからCardInfo全体をパース）
      // FAQページからのリンクなので、fromFAQ=trueを渡す
      const currentLang = detectLanguage(document)
      const { detail } = await getCardDetailWithCache(cardId, currentLang, true, 'release_desc', true)
      if (!detail || !detail.card) {
        console.error('カード情報の取得に失敗しました:', cardId)
        return
      }

      // cardDetailStoreにカードをセットしてCardタブのinfoを表示
      cardDetailStore.setSelectedCard(detail.card)
      deckStore.activeTab = 'card'
      cardDetailStore.setCardTab('info')
    } catch (error) {
      console.error('カードリンククリック処理に失敗しました:', error)
    }
  }

  return {
    parseCardLinks,
    handleCardLinkClick
  }
}
