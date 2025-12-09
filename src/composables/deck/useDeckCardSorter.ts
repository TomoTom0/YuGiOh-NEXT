/**
 * デッキカードのソート用Composable
 *
 * カードの比較ロジックを提供し、カテゴリ優先、末尾配置、カードタイプ等の
 * 複雑なソート条件を扱う。
 */

import type { CardInfo, MonsterType } from '@/types/card';
import { getCardInfo } from '@/utils/card-utils';

/**
 * DisplayCard型の定義（deck-edit.tsと同じ）
 */
export interface DisplayCard {
  cid: string;
  ciid: number;
  uuid: string;
}

/**
 * ソート設定オプション
 */
export interface DeckSortOptions {
  /**
   * カテゴリ優先ソートを有効にするか
   */
  enableCategoryPriority?: boolean;

  /**
   * カテゴリに一致するカードIDのSet
   */
  priorityCategoryCardIds?: Set<string>;

  /**
   * 末尾配置を有効にするか
   */
  enableTailPlacement?: boolean;

  /**
   * 末尾配置対象のカードIDリスト
   */
  tailPlacementCardIds?: string[];
}

/**
 * デッキカード用のソート比較関数を生成する
 *
 * @param section - ソート対象のDisplayCard配列（枚数カウント用）
 * @param options - ソート設定オプション
 * @returns カード比較関数
 *
 * @remarks
 * ソート優先順位:
 * 1. カードタイプ (Monster < Spell < Trap)
 * 2. カテゴリ優先（有効な場合）
 * 3. 末尾配置フラグ（有効な場合）
 * 4. モンスタータイプ (Fusion < Synchro < Xyz < Link < その他)
 * 5. レベル/ランク/リンク（降順）
 * 6. 魔法/罠のタイプ
 * 7. カード名（昇順）
 *
 * @example
 * ```typescript
 * const comparator = createDeckCardComparator(displayOrder, {
 *   enableCategoryPriority: true,
 *   priorityCategoryCardIds: categoryMatchedCardIds,
 *   enableTailPlacement: true,
 *   tailPlacementCardIds: settingsStore.tailPlacementCardIds
 * });
 *
 * const sorted = [...displayOrder].sort(comparator);
 * ```
 */
export function createDeckCardComparator(
  section: DisplayCard[],
  options: DeckSortOptions = {}
): (a: DisplayCard, b: DisplayCard) => number {
  const {
    enableCategoryPriority = true,
    priorityCategoryCardIds = new Set<string>(),
    enableTailPlacement = true,
    tailPlacementCardIds = []
  } = options;

  /**
   * カテゴリマッチ判定
   */
  const matchesPriorityCategory = (card: CardInfo | null): boolean => {
    if (!card) return false;
    return priorityCategoryCardIds.has(card.cardId);
  };

  /**
   * 基本的なカード比較ロジック（カテゴリ・末尾配置を除く）
   */
  const compareCardsByType = (a: DisplayCard, b: DisplayCard): number => {
    const cardA = getCardInfo(a.cid);
    const cardB = getCardInfo(b.cid);
    if (!cardA || !cardB) return 0;

    // 1. Card Type: Monster(0) > Spell(1) > Trap(2)
    const typeOrder = { monster: 0, spell: 1, trap: 2 };
    const typeA = typeOrder[cardA.cardType] ?? 999;
    const typeB = typeOrder[cardB.cardType] ?? 999;
    if (typeA !== typeB) return typeA - typeB;

    // 2. Monster Type: Fusion > Synchro > Xyz > Link > その他
    if (cardA.cardType === 'monster' && cardB.cardType === 'monster') {
      const monsterTypeOrder: Partial<Record<MonsterType, number>> = {
        fusion: 0,
        synchro: 1,
        xyz: 2,
        link: 3
      };
      // types配列から主要なタイプを抽出
      const getMainType = (types: MonsterType[]) => {
        for (const type of types) {
          const order = monsterTypeOrder[type];
          if (order !== undefined) {
            return order;
          }
        }
        return 999;
      };
      const monsterTypeA = getMainType((cardA as any).types);
      const monsterTypeB = getMainType((cardB as any).types);
      if (monsterTypeA !== monsterTypeB) return monsterTypeA - monsterTypeB;

      // 3. Level/Rank/Link（降順）
      const levelA = (cardA as any).levelValue ?? 0;
      const levelB = (cardB as any).levelValue ?? 0;
      if (levelA !== levelB) return levelB - levelA; // 降順
    }

    // 4. Spell Type / Trap Type
    if (cardA.cardType === 'spell' && cardB.cardType === 'spell') {
      const spellTypeA = (cardA as any).effectType ?? '';
      const spellTypeB = (cardB as any).effectType ?? '';
      if (spellTypeA !== spellTypeB) return spellTypeA.localeCompare(spellTypeB);
    }
    if (cardA.cardType === 'trap' && cardB.cardType === 'trap') {
      const trapTypeA = (cardA as any).effectType ?? '';
      const trapTypeB = (cardB as any).effectType ?? '';
      if (trapTypeA !== trapTypeB) return trapTypeA.localeCompare(trapTypeB);
    }

    // 5. Card Name（昇順）
    return cardA.name.localeCompare(cardB.name, 'ja');
  };

  /**
   * メイン比較関数（全ての優先順位を含む）
   */
  return (a: DisplayCard, b: DisplayCard): number => {
    const cardA = getCardInfo(a.cid);
    const cardB = getCardInfo(b.cid);
    if (!cardA || !cardB) return 0;

    // 0. Card Type: Monster(0) > Spell(1) > Trap(2)
    const typeOrder = { monster: 0, spell: 1, trap: 2 };
    const typeA = typeOrder[cardA.cardType] ?? 999;
    const typeB = typeOrder[cardB.cardType] ?? 999;
    if (typeA !== typeB) return typeA - typeB;

    // 1. メタデータカテゴリ: 該当あり(0) < 該当なし(1) ← カテゴリ優先が先頭
    const inPriorityA = enableCategoryPriority && matchesPriorityCategory(cardA) ? 0 : 1;
    const inPriorityB = enableCategoryPriority && matchesPriorityCategory(cardB) ? 0 : 1;
    if (enableCategoryPriority && inPriorityA !== inPriorityB) {
      return inPriorityA - inPriorityB;
    }

    // 1-1. カテゴリ優先カード内での枚数による重み付け
    if (enableCategoryPriority && inPriorityA === 0 && inPriorityB === 0) {
      const quantityA = section.filter(card => card.cid === a.cid).length;
      const quantityB = section.filter(card => card.cid === b.cid).length;
      if (quantityA !== quantityB) return quantityB - quantityA; // 降順（多い順）
    }

    // 2. カードタイプ内で、末尾配置フラグ: 末尾配置なし(0) < 末尾配置あり(1)
    if (enableTailPlacement) {
      const isTailA = tailPlacementCardIds.includes(a.cid) ? 1 : 0;
      const isTailB = tailPlacementCardIds.includes(b.cid) ? 1 : 0;
      if (isTailA !== isTailB) return isTailA - isTailB;
    }

    // 3. その他のカード比較ロジックを適用（Monster Type, Level, Name等）
    return compareCardsByType(a, b);
  };
}
