/**
 * カードユーティリティ
 *
 * デッキ内のカード検索やカード情報取得の共通関数
 */

import type { DeckCard } from '../types/deck'
import type { CardInfo } from '../types/card'

/**
 * デッキデータの型定義
 */
export interface DeckData {
  mainDeck: DeckCard[]
  extraDeck: DeckCard[]
  sideDeck: DeckCard[]
  trashDeck?: DeckCard[]
}

/**
 * (cid, ciid)ペアからカード情報を取得
 *
 * @param cid カードID
 * @param ciid カードインスタンスID
 * @param deckData デッキデータ
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfo(
  cid: string,
  ciid: number | string,
  deckData: DeckData
): CardInfo | null {
  const allDecks = [
    ...deckData.mainDeck,
    ...deckData.extraDeck,
    ...deckData.sideDeck,
    ...(deckData.trashDeck || [])
  ]

  const deckCard = allDecks.find(dc =>
    dc.card.cardId === cid && dc.card.ciid === String(ciid)
  )

  return deckCard ? deckCard.card : null
}

/**
 * 全デッキからカードを検索
 *
 * @param predicate 検索条件
 * @param deckData デッキデータ
 * @returns 見つかったDeckCard、見つからない場合はundefined
 */
export function findDeckCard(
  predicate: (dc: DeckCard) => boolean,
  deckData: DeckData
): DeckCard | undefined {
  const allDecks = [
    ...deckData.mainDeck,
    ...deckData.extraDeck,
    ...deckData.sideDeck,
    ...(deckData.trashDeck || [])
  ]

  return allDecks.find(predicate)
}
