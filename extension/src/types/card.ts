/**
 * カードタイプ
 */
export type CardType = 'モンスター' | '魔法' | '罠';

/**
 * カード基本情報
 */
export interface CardInfo {
  /** カード名 */
  name: string;
  /** カードID (cid) */
  cardId: string;
  /** カードタイプ */
  cardType: CardType;
  /** 画像ID（オプション、デフォルト '1'） */
  imageId?: string;
}

/**
 * デッキ内カード
 */
export interface DeckCard extends CardInfo {
  /** 枚数 */
  quantity: number;
}

/**
 * カードタイプ別フィールド名
 *
 * 重要な発見（調査結果より）:
 * - すべてのカードタイプが同じID属性を使用
 * - name属性が異なる
 */
export interface CardTypeFields {
  nameField: string;
  numField: string;
  cardIdPrefix: string;
  cardIdName: 'monsterCardId' | 'spellCardId' | 'trapCardId';
  imgsPrefix: string;
}
