/**
 * カードユーティリティ
 *
 * デッキ内のカード検索やカード情報取得の共通関数
 */

import type { DeckCardRef } from '../types/deck'
import type { CardInfo } from '../types/card'
import { getTempCardDB } from './temp-card-db'

/**
 * デッキデータの型定義
 */
export interface DeckData {
  mainDeck: DeckCardRef[]
  extraDeck: DeckCardRef[]
  sideDeck: DeckCardRef[]
  trashDeck?: DeckCardRef[]
}

/**
 * cidからカード情報を取得（TempCardDB経由）
 *
 * @param cid カードID
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfo(cid: string): CardInfo | null {
  const tempCardDB = getTempCardDB()
  return tempCardDB.get(cid) || null
}

/**
 * (cid, ciid)ペアからカード情報を取得（後方互換性のため）
 *
 * @param cid カードID
 * @param ciid カードインスタンスID（未使用だが互換性のため残す）
 * @param _deckData デッキデータ（未使用、TempCardDB経由で取得）
 * @returns カード情報、見つからない場合はnull
 * @deprecated getCardInfo(cid)を使用してください
 */
export function getCardInfoLegacy(
  cid: string,
  ciid: number | string,
  _deckData: DeckData
): CardInfo | null {
  return getCardInfo(cid)
}

/**
 * 全デッキからカード参照を検索
 *
 * @param predicate 検索条件
 * @param deckData デッキデータ
 * @returns 見つかったDeckCardRef、見つからない場合はundefined
 */
export function findDeckCardRef(
  predicate: (dc: DeckCardRef) => boolean,
  deckData: DeckData
): DeckCardRef | undefined {
  const allDecks = [
    ...deckData.mainDeck,
    ...deckData.extraDeck,
    ...deckData.sideDeck,
    ...(deckData.trashDeck || [])
  ]

  return allDecks.find(predicate)
}
