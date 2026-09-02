/**
 * カテゴリマッチング用のComposable
 *
 * デッキメタデータのカテゴリに基づいて、関連するカードを2段階で検索する。
 * 1段階目: カテゴリラベルを直接含むカード
 * 2段階目: 1段階目のカード名をテキストに含むカード
 */

import type { DeckCardRef } from '@/types/deck';

/**
 * カード情報の最小限のインターフェース（TempCacheDBから取得）
 */
export interface CardData {
  name: string;
  text?: string;
  ruby?: string;
  pendulumText?: string;
}

/**
 * カテゴリに一致するカードIDのセットを計算する
 *
 * @param selectedCategories - 選択されたカテゴリIDの配列
 * @param categoryLabelMap - カテゴリID → ラベル名のマップ
 * @param allDecks - 全セクションのデッキカード配列（main, extra, side, trash）
 * @param cardDB - カードIDからCardDataを取得する関数
 * @returns カテゴリに一致するカードIDのSet
 *
 * @remarks
 * 2段階検索を実施:
 * - 1段階目: カテゴリラベルを名前/ルビ/テキスト/ペンデュラムテキストに含むカード
 * - 2段階目: 1段階目で見つかったカード名をテキスト/ペンデュラムテキストに含むカード（1段階目は除外）
 *
 * @example
 * ```typescript
 * const matchedIds = computeCategoryMatchedCardIds(
 *   ['cat_001', 'cat_002'],
 *   { 'cat_001': '青眼', 'cat_002': 'ブラック・マジシャン' },
 *   {
 *     main: deckInfo.mainDeck,
 *     extra: deckInfo.extraDeck,
 *     side: deckInfo.sideDeck,
 *     trash: trashDeck
 *   },
 *   (cid) => tempCardDB.get(cid)
 * );
 * ```
 */
export function computeCategoryMatchedCardIds(
  selectedCategories: string[],
  categoryLabelMap: Record<string, string>,
  allDecks: {
    main: DeckCardRef[];
    extra: DeckCardRef[];
    side: DeckCardRef[];
    trash: DeckCardRef[];
  },
  cardDB: (cid: string) => CardData | undefined
): Set<string> {
  // カテゴリが選択されていない場合は空のSet
  if (selectedCategories.length === 0) return new Set<string>();

  // カテゴリラベルを取得
  const categoryLabels = selectedCategories
    .map(catId => categoryLabelMap[catId])
    .filter((label): label is string => Boolean(label));

  if (categoryLabels.length === 0) return new Set<string>();

  // 全セクションからユニークなcidを収集
  const allCids = new Set<string>();
  const sections: Array<keyof typeof allDecks> = ['main', 'extra', 'side', 'trash'];
  sections.forEach(section => {
    allDecks[section].forEach(deckCard => allCids.add(deckCard.cid));
  });

  const firstStageMatched = new Set<string>();
  const firstStageCardNames = new Set<string>();

  // 一段階目: カテゴリラベルを含むcidを検索
  for (const cid of allCids) {
    const card = cardDB(cid);
    if (!card) continue;

    const searchTexts = [
      card.name,
      card.ruby || '',
      card.text || '',
      card.pendulumText || ''
    ].join(' ');

    const matched = categoryLabels.some(label => searchTexts.includes(label));
    if (matched) {
      firstStageMatched.add(cid);
      firstStageCardNames.add(card.name);
    }
  }

  // 二段階目: 一段階目で見つかったカード名をテキストに含むcid（一段階目を除外）
  const secondStageMatched = new Set<string>();

  // 最適化: firstStageCardNames が空なら二段階目をスキップ
  if (firstStageCardNames.size > 0) {
    for (const cid of allCids) {
      if (firstStageMatched.has(cid)) continue; // 一段階目で見つかったものは除外

      const card = cardDB(cid);
      if (!card) continue;

      const textToSearch = [
        card.text || '',
        card.pendulumText || ''
      ].join(' ');

      // 最適化: Set を直接 for-of で走査
      let matched = false;
      for (const cardName of firstStageCardNames) {
        if (textToSearch.includes(cardName)) {
          matched = true;
          break; // 1つ見つかればすぐ抜ける
        }
      }
      if (matched) {
        secondStageMatched.add(cid);
      }
    }
  }

  // 一段階目と二段階目をマージして返す
  return new Set([...firstStageMatched, ...secondStageMatched]);
}

/**
 * カテゴリラベルにマッチするデッキ内カードの枚数（実枚数）を数える
 *
 * カード名またはテキストにカテゴリラベルを含むカードの quantity を合算する。
 * CategoryDialog.vue の「7枚以上」フィルタと同じ判定基準（name/textのみ、
 * ruby/pendulumTextは対象外）。
 */
export function countCardsForCategoryLabel(
  categoryLabel: string,
  deckCardRefs: DeckCardRef[],
  cardDB: (cid: string) => CardData | undefined
): number {
  return deckCardRefs.reduce((total, ref) => {
    const card = cardDB(ref.cid);
    if (!card) return total;

    const nameMatch = card.name.includes(categoryLabel);
    const textMatch = (card.text || '').includes(categoryLabel);
    if (nameMatch || textMatch) {
      return total + (ref.quantity || 1);
    }
    return total;
  }, 0);
}

/**
 * デッキ内カードの枚数から、閾値以上のカテゴリIDを自動判定する
 *
 * @param categoryLabelMap - カテゴリID → ラベル名のマップ（全カテゴリ）
 * @param deckCardRefs - デッキ内の全カード参照（main/extra/side等）
 * @param cardDB - カードIDからCardDataを取得する関数
 * @param threshold - マッチ枚数がこの値以上のカテゴリを採用する閾値
 * @returns 閾値以上のカテゴリIDの配列
 */
export function computeAutoCategoryIds(
  categoryLabelMap: Record<string, string>,
  deckCardRefs: DeckCardRef[],
  cardDB: (cid: string) => CardData | undefined,
  threshold: number
): string[] {
  const result: string[] = [];
  for (const [categoryId, label] of Object.entries(categoryLabelMap)) {
    if (!label) continue;
    if (countCardsForCategoryLabel(label, deckCardRefs, cardDB) >= threshold) {
      result.push(categoryId);
    }
  }
  return result;
}
