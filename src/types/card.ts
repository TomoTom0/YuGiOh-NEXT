import {
  CardType,
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType
} from './card-maps';

// CardTypeはcard-maps.tsで定義
export type { CardType };

/**
 * レベル/ランク/リンクの種別
 */
export type LevelType = 'level' | 'rank' | 'link';

/**
 * 禁止制限の種類
 */
export type LimitRegulation = 'forbidden' | 'limited' | 'semi-limited';

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
  /** 画像識別子 (ciid) */
  ciid: string;
  /** 複数画像情報 */
  imgs: Array<{ciid: string; imgHash: string}>;
  /** 効果テキスト（オプション） */
  text?: string;
  /** 禁止制限（オプション） */
  limitRegulation?: LimitRegulation;
}

/**
 * CardInfoにimageUrlゲッターを追加するヘルパー
 */
export function getCardImageUrl(card: CardBase): string | undefined {
  const imageInfo = card.imgs.find(img => img.ciid === card.ciid);
  if (!imageInfo) {
    return undefined;
  }
  return `/yugiohdb/get_image.action?type=1&cid=${card.cardId}&ciid=${card.ciid}&enc=${imageInfo.imgHash}&osplang=1`;
}

/**
 * モンスターカード情報
 */
export interface MonsterCard extends CardBase {
  /** カードタイプ */
  cardType: 'monster';

  /** 属性 */
  attribute: Attribute;

  /** レベル/ランク/リンクの種別 */
  levelType: LevelType;
  /** レベル/ランク/リンク値（必須、すべてのモンスターが持つ） */
  levelValue: number;

  /** 種族 */
  race: Race;
  /** タイプ */
  types: MonsterType[];

  /** 攻撃力（オプション、数値または "?", "X000" など） */
  atk?: number | string;
  /** 守備力（オプション、リンクモンスターは持たない） */
  def?: number | string;

  /** リンクマーカー（オプション、リンクモンスターのみ、9bit整数）
   * 方向番号Nに対応するビット位置は N-1
   * bit 0: 方向1（左下）, bit 1: 方向2（下）, bit 2: 方向3（右下）
   * bit 3: 方向4（左）, bit 4: 方向5（中央、常に0）, bit 5: 方向6（右）
   * bit 6: 方向7（左上）, bit 7: 方向8（上）, bit 8: 方向9（右上）
   */
  linkMarkers?: number;

  /** ペンデュラムスケール（オプション、ペンデュラムモンスターのみ） */
  pendulumScale?: number;
  /** ペンデュラム効果（オプション、ペンデュラムモンスターのみ） */
  pendulumEffect?: string;

  /** エクストラデッキに入るかどうか */
  isExtraDeck: boolean;
}

/**
 * 魔法カード情報
 */
export interface SpellCard extends CardBase {
  /** カードタイプ */
  cardType: 'spell';

  /** 効果種類（オプション） */
  effectType?: SpellEffectType;
}

/**
 * 罠カード情報
 */
export interface TrapCard extends CardBase {
  /** カードタイプ */
  cardType: 'trap';

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
 * 収録シリーズ情報
 */
export interface PackInfo {
  /** パック名 */
  name: string;
  /** パックコード（例: "DP30-JP001"） */
  code?: string;
  /** レアリティ */
  rarity?: string;
  /** レアリティの背景色 */
  rarityColor?: string;
  /** 発売日（例: "2025-10-25"） */
  releaseDate?: string;
  /** パックID（例: "1000009524000"） */
  packId?: string;
}

/**
 * カード詳細情報（収録シリーズと関連カードを含む）
 */
export interface CardDetail {
  /** 基本カード情報 */
  card: CardInfo;
  /** 収録シリーズ */
  packs: PackInfo[];
  /** 関連カード */
  relatedCards: CardInfo[];
  /** Q&A情報 */
  qaList?: CardFAQ[];
}

/**
 * カードQA情報
 */
export interface CardFAQ {
  /** FAQ ID (fid) */
  faqId: string;
  /** 質問 */
  question: string;
  /** 回答（詳細ページから取得） */
  answer?: string;
  /** 更新日（オプション） */
  updatedAt?: string;
}

/**
 * カードQA一覧情報
 */
export interface CardFAQList {
  /** カードID */
  cardId: string;
  /** カード名 */
  cardName: string;
  /** カードテキストの補足情報 */
  supplementInfo?: string;
  /** カードテキストの補足情報の日付 */
  supplementDate?: string;
  /** ペンデュラムテキストの補足情報 */
  pendulumSupplementInfo?: string;
  /** ペンデュラムテキストの補足情報の日付 */
  pendulumSupplementDate?: string;
  /** FAQ一覧 */
  faqs: CardFAQ[];
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
