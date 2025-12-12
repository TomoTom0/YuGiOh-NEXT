/**
 * カードユーティリティ
 *
 * デッキ内のカード検索やカード情報取得の共通関数
 */

import type { DeckCardRef } from '../types/deck'
import type { CardInfo } from '../types/card'
import { getTempCardDB } from './temp-card-db'
import { getUnifiedCacheDB } from './unified-cache-db'
import { detectLanguage } from './language-detector'

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
 * TempCardDBからのみカード情報を取得（検索キャッシュ）
 *
 * Table A,B,B2なし。検索結果のみ。
 *
 * @param cid カードID
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfoFromTempDB(cid: string): CardInfo | null {
  const tempCardDB = getTempCardDB()
  return tempCardDB.get(cid) || null
}

/**
 * UnifiedCacheDBからカード情報を取得（完全情報）
 *
 * Table A,B,B2を含む完全なカード情報。
 *
 * @param cid カードID
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfoFromUnifiedDB(cid: string): CardInfo | null {
  const unifiedDB = getUnifiedCacheDB()
  const lang = detectLanguage(document)
  return unifiedDB.reconstructCardInfo(cid, lang) || null
}

/**
 * UnifiedCacheDB + TempCardDB から完全なカード情報を取得
 *
 * UnifiedCacheDBから優先取得（Table A,B,B2）し、
 * UnifiedDBの結果にTable Cの情報がない場合、TempCardDBから補完する。
 *
 * @param cid カードID
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfo(cid: string): CardInfo | null {
  const unifiedInfo = getCardInfoFromUnifiedDB(cid)
  if (!unifiedInfo) {
    // UnifiedDBにない場合、TempDBから取得（フォールバック）
    return getCardInfoFromTempDB(cid)
  }

  // UnifiedDBの結果にTable Cがない場合、TempDBから補完
  const unifiedDB = getUnifiedCacheDB()
  const hasTableC = unifiedDB.hasCardTableC(cid)

  if (!hasTableC) {
    const tempInfo = getCardInfoFromTempDB(cid)
    if (tempInfo) {
      return { ...unifiedInfo, ...tempInfo } as CardInfo
    }
  }

  return unifiedInfo
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
  _ciid: number | string,
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

/**
 * 多言語対応: UnifiedCacheDBからカード情報を取得し、ciidを設定
 *
 * デッキに格納された ciid を使用して正しい画像を参照させる。
 * UnifiedCacheDB から完全な CardInfo（複数画像含む）を取得。
 * Table A（複数画像情報）は UnifiedCacheDB にのみ保存されている。
 *
 * @param cid カードID
 * @param ciid カードインスタンスID
 * @param document ドキュメントオブジェクト（言語検出用）
 * @returns カード情報、見つからない場合はnull
 */
export function getCardInfoWithLang(
  cid: string,
  ciid: number,
  document: Document
): CardInfo | null {
  const unifiedDB = getUnifiedCacheDB()
  const lang = detectLanguage(document)

  // UnifiedCacheDB から完全なカード情報を取得（複数画像情報を含む）
  const cardInfo = unifiedDB.reconstructCardInfo(cid, lang)

  if (!cardInfo) return null

  // デッキに格納されている ciid に上書き（ユーザーが選択した画像を優先）
  return { ...cardInfo, ciid: String(ciid) }
}
