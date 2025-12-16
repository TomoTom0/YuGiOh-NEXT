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
 * ソートモード
 */
export type SortMode = 'default' | 'by-race' | 'by-attribute';

/**
 * ソート設定オプション
 */
export interface DeckSortOptions {
  /**
   * ソートモード
   */
  sortMode?: SortMode;

  /**
   * カテゴリ優先ソートを有効にするか
   */
  enableCategoryPriority?: boolean;

  /**
   * カテゴリに一致するカードIDのSet
   */
  priorityCategoryCardIds?: Set<string>;

  /**
   * 手動先頭優先配置を有効にするか
   */
  enableHeadPlacement?: boolean;

  /**
   * 手動先頭優先配置対象のカードIDリスト
   */
  headPlacementCardIds?: string[];

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
 * 2. 手動先頭優先配置（有効な場合）← カテゴリ優先より優先
 * 3. カテゴリ優先（有効な場合）
 * 4. 末尾配置フラグ（有効な場合）
 * 5. モンスタータイプ (Fusion < Synchro < Xyz < Link < その他)
 * 6. レベル/ランク/リンク（降順）
 * 7. 魔法/罠のタイプ
 * 8. カード名（昇順）
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
    sortMode = 'default',
    enableCategoryPriority = true,
    priorityCategoryCardIds = new Set<string>(),
    enableHeadPlacement = true,
    headPlacementCardIds = [],
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
   * 種族でソートする比較関数
   */
  const compareByRace = (a: DisplayCard, b: DisplayCard): number => {
    const cardA = getCardInfo(a.cid);
    const cardB = getCardInfo(b.cid);
    if (!cardA || !cardB) return 0;

    // モンスター < 魔法 < 罠の順
    const typeOrder = { monster: 0, spell: 1, trap: 2 };
    const typeA = typeOrder[cardA.cardType] ?? 999;
    const typeB = typeOrder[cardB.cardType] ?? 999;

    // モンスター同士の場合、種族でソート
    if (typeA === 0 && typeB === 0) {
      const raceA = (cardA as any).race ?? '';
      const raceB = (cardB as any).race ?? '';
      if (raceA !== raceB) {
        return raceA.localeCompare(raceB, 'ja');
      }
    }

    // 異なるカードタイプの場合、カードタイプの順序で判定
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    // 同じカードタイプ内ではCIDでソート（数値ソート）
    const cidA = parseInt(a.cid, 10) || 0;
    const cidB = parseInt(b.cid, 10) || 0;
    return cidA - cidB;
  };

  /**
   * 属性でソートする比較関数
   */
  const compareByAttribute = (a: DisplayCard, b: DisplayCard): number => {
    const cardA = getCardInfo(a.cid);
    const cardB = getCardInfo(b.cid);
    if (!cardA || !cardB) return 0;

    // モンスター < 魔法 < 罠の順
    const typeOrder = { monster: 0, spell: 1, trap: 2 };
    const typeA = typeOrder[cardA.cardType] ?? 999;
    const typeB = typeOrder[cardB.cardType] ?? 999;

    // モンスター同士の場合、属性でソート
    if (typeA === 0 && typeB === 0) {
      const attrA = (cardA as any).attribute ?? '';
      const attrB = (cardB as any).attribute ?? '';
      if (attrA !== attrB) {
        return attrA.localeCompare(attrB, 'ja');
      }
    }

    // 異なるカードタイプの場合、カードタイプの順序で判定
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    // 同じカードタイプ内ではCIDでソート（数値ソート）
    const cidA = parseInt(a.cid, 10) || 0;
    const cidB = parseInt(b.cid, 10) || 0;
    return cidA - cidB;
  };

  /**
   * メイン比較関数（全ての優先順位を含む）
   */
  return (a: DisplayCard, b: DisplayCard): number => {
    const cardA = getCardInfo(a.cid);
    const cardB = getCardInfo(b.cid);
    if (!cardA || !cardB) return 0;

    // ソートモードに応じた処理
    if (sortMode === 'by-race') {
      return compareByRace(a, b);
    }
    if (sortMode === 'by-attribute') {
      return compareByAttribute(a, b);
    }

    // デフォルトソート
    // 0. Card Type: Monster(0) > Spell(1) > Trap(2)
    const typeOrder = { monster: 0, spell: 1, trap: 2 };
    const typeA = typeOrder[cardA.cardType] ?? 999;
    const typeB = typeOrder[cardB.cardType] ?? 999;
    if (typeA !== typeB) return typeA - typeB;

    // 1. 手動先頭優先配置: 配列の順序で優先順位を決定 ← カテゴリ優先より優先
    if (enableHeadPlacement && headPlacementCardIds.length > 0) {
      const indexA = headPlacementCardIds.indexOf(a.cid);
      const indexB = headPlacementCardIds.indexOf(b.cid);

      // 両方が配列に含まれている場合、インデックス（順序）で比較
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB;
      }

      // 片方だけが配列に含まれている場合、含まれている方を優先
      if (indexA >= 0) return -1;
      if (indexB >= 0) return 1;
    }

    // 2. メタデータカテゴリ: 該当あり(0) < 該当なし(1)
    const inPriorityA = enableCategoryPriority && matchesPriorityCategory(cardA) ? 0 : 1;
    const inPriorityB = enableCategoryPriority && matchesPriorityCategory(cardB) ? 0 : 1;
    if (enableCategoryPriority && inPriorityA !== inPriorityB) {
      return inPriorityA - inPriorityB;
    }

    // 2-1. カテゴリ優先カード内での枚数による重み付け
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
