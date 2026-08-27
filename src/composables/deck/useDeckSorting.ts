/**
 * デッキソートロジック
 *
 * deck-edit.ts のソート関連ロジックを抽出した composable
 * テスタビリティと再利用性を向上させる
 */

import { getTempCacheDB } from '@/utils/temp-cache-db';
import { CARD_TYPE_SORT_ORDER } from '@/types/card-maps';
import type { DeckCardRef } from '@/types/deck';

/**
 * 表示用カード参照
 * deck-edit.ts の DisplayCard 型に対応
 */
export interface DisplayCardRef {
  cid: string;
  ciid: number;
  uuid: string;  // ユニークな識別子（アニメーション追跡用、ソートでは使用しない）
}

/**
 * ソート結果
 */
export interface SortResult {
  /** ソート後の表示順序 */
  sortedDisplayOrder: DisplayCardRef[];
  /** ソート後のデッキカード配列 */
  sortedDeck: DeckCardRef[];
}

/**
 * 公式デッキ表示順にソート
 *
 * カードをカードタイプ順（モンスター→魔法→罠）と最初の登場順でソートします。
 * ciid（Card Image ID）は変更せず保持されます。
 *
 * @param displayOrder - 表示順序配列
 * @param deck - デッキカード配列
 * @returns ソート結果
 *
 * @example
 * ```typescript
 * const result = sortDisplayOrderForOfficial(
 *   displayOrder.value.main,
 *   deckInfo.value.mainDeck
 * );
 * displayOrder.value.main = result.sortedDisplayOrder;
 * deckInfo.value.mainDeck = result.sortedDeck;
 * ```
 */
export function sortDisplayOrderForOfficial(
  displayOrder: DisplayCardRef[],
  deck: DeckCardRef[]
): SortResult {
  if (displayOrder.length === 0) {
    return {
      sortedDisplayOrder: [],
      sortedDeck: []
    };
  }

  // カード情報を取得してタイプ判定用マップを作成
  const tempCardDB = getTempCacheDB();
  const cardTypeMap = new Map<string, number>(); // cid -> type priority (0:monster, 1:spell, 2:trap)

  deck.forEach(dc => {
    const card = tempCardDB.get(dc.cid);
    const type = card?.cardType;
    const priority = type ? (CARD_TYPE_SORT_ORDER[type] ?? 0) : 0;
    cardTypeMap.set(dc.cid, priority);
  });

  // 最初の登場順を記録
  const firstAppearance = new Map<string, number>();
  displayOrder.forEach((dc, index) => {
    if (!firstAppearance.has(dc.cid)) {
      firstAppearance.set(dc.cid, index);
    }
  });

  // ソート: 1. カードタイプ順、2. 最初の登場順
  const sorted = [...displayOrder].sort((a, b) => {
    const typeA = cardTypeMap.get(a.cid) || 0;
    const typeB = cardTypeMap.get(b.cid) || 0;

    if (typeA !== typeB) {
      return typeA - typeB;
    }

    const firstA = firstAppearance.get(a.cid) || 0;
    const firstB = firstAppearance.get(b.cid) || 0;
    return firstA - firstB;
  });

  // ciidは変更しない（Card Image IDを保持）

  // deckを並び替え（sortedの順序に合わせる）
  const newDeck: DeckCardRef[] = [];
  const seenCards = new Set<string>();
  const remainingDeck = [...deck];

  sorted.forEach(dc => {
    const key = `${dc.cid}_${dc.ciid}`;
    if (!seenCards.has(key)) {
      seenCards.add(key);
      // (cid, ciid) の完全一致を優先し、displayOrder と deck のciid型違い等で
      // 見つからない場合は cid 一致でフォールバック（イラスト違いエントリの消失を防ぐ）
      let deckIndex = remainingDeck.findIndex(d =>
        d.cid === dc.cid && String(d.ciid) === String(dc.ciid)
      );
      if (deckIndex === -1) {
        deckIndex = remainingDeck.findIndex(d => d.cid === dc.cid);
      }
      if (deckIndex !== -1) {
        newDeck.push(remainingDeck[deckIndex]!);
        remainingDeck.splice(deckIndex, 1);
      }
    }
  });

  // displayOrder に現れない deck エントリが残っていた場合も消失させない
  // （trash往復など一時的にdisplayOrderから外れたカードの保持）
  newDeck.push(...remainingDeck);

  return {
    sortedDisplayOrder: sorted,
    sortedDeck: newDeck
  };
}
