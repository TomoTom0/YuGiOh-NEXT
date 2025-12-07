/**
 * DeckHash - デッキの内容を基にした安定ハッシュ値生成
 *
 * デッキの並び順（mainDeck, extraDeck, sideDeck のカード順序）から stable hash を生成
 * - ハッシュが異なる = デッキの構成や順序が変わった
 * - キャッシュの更新判定に使用
 */

import type { DeckInfo } from '../types/deck';

/**
 * デッキ情報からハッシュ値を計算
 * @param deckInfo デッキ情報
 * @returns 16文字のハッシュ値
 */
export function calculateDeckHash(deckInfo: DeckInfo): string {
  // [mainDeck, extraDeck, sideDeck]の全カードの順序を文字列化
  const cardSequence = [
    ...deckInfo.mainDeck,
    ...deckInfo.extraDeck,
    ...deckInfo.sideDeck,
  ]
    .map((card) => `${card.cid}:${card.quantity}`)
    .join('|');

  // 簡易ハッシュ計算
  return simpleHash(cardSequence).substring(0, 16);
}

/**
 * 簡易ハッシュ関数（crypto.subtle.digest代替）
 * 高速だが衝突のリスクがあるため、16文字に制限
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * デッキの内容が変わったかを判定
 * @param oldDeckInfo 以前のデッキ情報
 * @param newDeckInfo 新しいデッキ情報
 * @returns true = 内容が変わった, false = 変わらない
 */
export function isDeckModified(oldDeckInfo: DeckInfo, newDeckInfo: DeckInfo): boolean {
  const oldHash = calculateDeckHash(oldDeckInfo);
  const newHash = calculateDeckHash(newDeckInfo);
  return oldHash !== newHash;
}
