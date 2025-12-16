/**
 * デッキサムネイル画像生成ユーティリティ
 *
 * デッキロードダイアログに表示するサムネイル用のカードID配列を生成する。
 */

import type { DeckInfo, DeckCardRef } from '@/types/deck';
import type { DisplayCard } from '@/composables/deck/useDeckCardSorter';
import { createDeckCardComparator } from '@/composables/deck/useDeckCardSorter';
import { generateDeckCardUUID } from './deck-uuid-generator';

/**
 * DeckCardRef[] を DisplayCard[] に変換する（quantity を展開）
 */
function expandDeckCardRefs(refs: DeckCardRef[]): DisplayCard[] {
  const result: DisplayCard[] = [];
  for (const ref of refs) {
    for (let i = 0; i < ref.quantity; i++) {
      result.push({
        cid: ref.cid,
        ciid: parseInt(ref.ciid, 10),
        uuid: generateDeckCardUUID(ref.cid, parseInt(ref.ciid, 10))
      });
    }
  }
  return result;
}

/**
 * ソート済み DisplayCard[] から重複なしでカードIDを選択する
 *
 * @param cards - ソート済み DisplayCard 配列
 * @param maxCount - 最大選択枚数
 * @param existingCids - 既に選択済みのカードIDのSet
 * @returns 選択されたカードID配列
 */
function selectUniqueCids(
  cards: DisplayCard[],
  maxCount: number,
  existingCids: Set<string>
): string[] {
  const result: string[] = [];
  for (const card of cards) {
    if (result.length >= maxCount) break;
    if (existingCids.has(card.cid)) continue;
    result.push(card.cid);
    existingCids.add(card.cid);
  }
  return result;
}

/**
 * デッキのサムネイル用カードID配列を生成する
 *
 * @param deckInfo - デッキ情報
 * @param headPlacementCardIds - 手動先頭配置カードIDリスト
 * @returns サムネイル用カードID配列（最大5枚）
 *
 * @remarks
 * - ソート基準: sort-all-section と同じロジック（createDeckCardComparator）
 * - 基本: mainから3枚、extraから2枚
 * - sideに先頭配置がある場合: mainから2枚、extraから2枚、sideから1枚
 * - 選択ルール: 同じcidは1枚まで、手動先頭配置を優先、不足分はセクション先頭から選択
 * - 5枚に満たない場合も許容
 */
export function generateDeckThumbnailCards(
  deckInfo: DeckInfo,
  headPlacementCardIds: string[] = []
): string[] {
  // 1. DeckCardRef[] を DisplayCard[] に変換
  const mainCards = expandDeckCardRefs(deckInfo.mainDeck);
  const extraCards = expandDeckCardRefs(deckInfo.extraDeck);
  const sideCards = expandDeckCardRefs(deckInfo.sideDeck);

  // 2. 各セクションをソート（sort-all-section と同じロジック）
  const sortedMain = [...mainCards].sort(
    createDeckCardComparator(mainCards, {
      enableHeadPlacement: true,
      headPlacementCardIds,
      enableCategoryPriority: false,
      enableTailPlacement: false
    })
  );

  const sortedExtra = [...extraCards].sort(
    createDeckCardComparator(extraCards, {
      enableHeadPlacement: true,
      headPlacementCardIds,
      enableCategoryPriority: false,
      enableTailPlacement: false
    })
  );

  const sortedSide = [...sideCards].sort(
    createDeckCardComparator(sideCards, {
      enableHeadPlacement: true,
      headPlacementCardIds,
      enableCategoryPriority: false,
      enableTailPlacement: false
    })
  );

  // 3. sideに先頭配置があるか確認
  const hasSideHeadPlacement = sortedSide.some(card =>
    headPlacementCardIds.includes(card.cid)
  );

  // 4. 選択枚数を決定
  const mainCount = hasSideHeadPlacement ? 2 : 3;
  const extraCount = 2;
  const sideCount = hasSideHeadPlacement ? 1 : 0;

  // 5. カードを選択（重複排除）
  const selectedCids = new Set<string>();
  const result: string[] = [];

  // mainから選択
  result.push(...selectUniqueCids(sortedMain, mainCount, selectedCids));

  // extraから選択
  result.push(...selectUniqueCids(sortedExtra, extraCount, selectedCids));

  // sideから選択（必要な場合）
  if (sideCount > 0) {
    result.push(...selectUniqueCids(sortedSide, sideCount, selectedCids));
  }

  return result;
}
