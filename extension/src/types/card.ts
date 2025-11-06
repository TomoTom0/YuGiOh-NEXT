import {
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType
} from './card-maps';

/**
 * カードタイプ
 */
export type CardType = 'モンスター' | '魔法' | '罠';

/**
 * レベル/ランク/リンクの種別
 */
export type LevelType = 'level' | 'rank' | 'link' | null;

/**
 * カード基本情報（全カードタイプ共通）
 */
export interface CardBase {
  /** カード名 */
  name: string;
  /** ふりがな（オプション） */
  ruby?: string;
  /** カードID (cid) */
  cardId: string;
  /** 画像ID（デフォルト '1'） */
  imageId: string;
  /** 画像識別子（複数画像がある場合、オプション） */
  ciid?: string;
  /** 画像ハッシュ（画像URL生成用、オプション） */
  imgHash?: string;
  /** 効果テキスト（オプション） */
  text?: string;
}

/**
 * モンスターカード情報
 */
export interface MonsterCard extends CardBase {
  /** カードタイプ */
  cardType: 'モンスター';

  /** 属性 */
  attribute: Attribute;

  /** レベル/ランク/リンクの種別 */
  levelType: LevelType;
  /** レベル/ランク/リンク値（オプション） */
  levelValue?: number;

  /** 種族 */
  race: Race;
  /** タイプ */
  types: MonsterType[];

  /** 攻撃力（オプション、数値または "?", "X000" など） */
  atk?: number | string;
  /** 守備力（オプション、数値または "?", "X000" など） */
  def?: number | string;

  /** ペンデュラムスケール（オプション） */
  pendulumScale?: number;
  /** ペンデュラム効果（オプション） */
  pendulumEffect?: string;

  /** エクストラデッキに入るかどうか */
  isExtraDeck: boolean;
}

/**
 * 魔法カード情報
 */
export interface SpellCard extends CardBase {
  /** カードタイプ */
  cardType: '魔法';

  /** 効果種類（オプション） */
  effectType?: SpellEffectType;
}

/**
 * 罠カード情報
 */
export interface TrapCard extends CardBase {
  /** カードタイプ */
  cardType: '罠';

  /** 効果種類（オプション） */
  effectType?: TrapEffectType;
}

/**
 * カード情報（統合型）
 */
export type CardInfo = MonsterCard | SpellCard | TrapCard;

/**
 * デッキ内カード
 */
export interface DeckCard {
  /** カード情報 */
  card: CardInfo;
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

// card-maps.tsから再エクスポート
export type {
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType
};
