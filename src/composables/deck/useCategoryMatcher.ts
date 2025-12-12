/**
 * カテゴリマッチング用のComposable
 *
 * デッキメタデータのカテゴリに基づいて、関連するカードを2段階で検索する。
 * 1段階目: カテゴリラベルを直接含むカード
 * 2段階目: 1段階目のカード名をテキストに含むカード
 */

import type { DeckCardRef } from '@/types/deck';

/**
 * カード情報の最小限のインターフェース（TempCardDBから取得）
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
