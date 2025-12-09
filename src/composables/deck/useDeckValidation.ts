import type { CardInfo } from '@/types/card';

/**
 * デッキ間のカード移動バリデーション
 *
 * カードがどのセクション間で移動可能かを判定する
 */

/**
 * セクションタイプ（文字列リテラル）
 */
export type SectionType = 'main' | 'extra' | 'side' | 'trash' | 'search';

/**
 * カードがextraデッキカード（融合・シンクロ・エクシーズ・リンク）かを判定
 */
function isExtraDeckCard(card: CardInfo): boolean {
  return card.cardType === 'monster' && (card.types?.some(t =>
    t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
  ) || false);
}

/**
 * カードの移動可否を判定
 *
 * @param fromSection 移動元セクション
 * @param toSection 移動先セクション
 * @param card カード情報
 * @returns 移動可能な場合true
 */
export function canMoveCard(fromSection: string, toSection: string, card: CardInfo): boolean {
  // searchからtrashへは移動不可
  if (fromSection === 'search' && toSection === 'trash') {
    return false;
  }

  // searchから移動する場合
  if (fromSection === 'search') {
    // mainに移動する場合：extraデッキカードは不可
    if (toSection === 'main') {
      return !isExtraDeckCard(card);
    }
    // extraに移動する場合：extraデッキカードのみ可
    if (toSection === 'extra') {
      return isExtraDeckCard(card);
    }
    // sideへは常に許可
    if (toSection === 'side') {
      return true;
    }
    return false;
  }

  // trashへの移動は全て不可
  if (toSection === 'trash') {
    return false;
  }

  // trashからの移動は全て許可
  if (fromSection === 'trash') {
    return true;
  }

  // main/extra/side間の移動はカードタイプによる
  const isExtra = isExtraDeckCard(card);

  // mainへの移動：extraデッキカードは不可
  if (toSection === 'main') {
    return !isExtra;
  }

  // extraへの移動：extraデッキカードのみ可
  if (toSection === 'extra') {
    return isExtra;
  }

  // sideへの移動：常に許可
  if (toSection === 'side') {
    return true;
  }

  // それ以外は許可
  return true;
}
