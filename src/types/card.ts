import {
  CardType,
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType
} from './card-maps';
import { buildApiUrl } from '../utils/url-builder';

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
  /** 言語コード（取得時の言語を記録） */
  lang: string;
  /** 複数画像情報 */
  imgs: Array<{ciid: string; imgHash: string}>;
  /** 複数画像の有無を確認した日時（オプション）
   * - undefined = 未確認（複数画像情報がない）
   * - 日時 = その日付で複数画像の有無を確認済み
   */
  imagesCheckedAt?: number;
  /** 効果テキスト（オプション） */
  text?: string;
  /** 禁止制限（オプション） */
  limitRegulation?: LimitRegulation;
}

import type { CardGameType } from './settings';

/**
 * CardInfoにimageUrlゲッターを追加するヘルパー
 * @param card カード情報
 * @param gameType ゲームタイプ（省略時は'ocg'）
 * @returns 画像URL（request_locale付与）
 */
export function getCardImageUrl(card: CardBase, gameType: CardGameType = 'ocg'): string | undefined {
  const imageInfo = card.imgs.find(img => img.ciid === card.ciid);
  if (!imageInfo) {
    console.error('[getCardImageUrl] ERROR: ciid=', card.ciid, 'not found in imgs=', JSON.stringify(card.imgs), 'for cardId=', card.cardId);
    return undefined;
  }

  // buildApiUrl を使用して request_locale を自動付与
  const path = `get_image.action?type=1&cid=${card.cardId}&ciid=${card.ciid}&enc=${imageInfo.imgHash}&osplang=1`;
  return buildApiUrl(path, gameType);
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
  /** ペンデュラムテキスト（オプション、ペンデュラムモンスターのみ） */
  pendulumText?: string;

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
 * デッキ内カード参照（軽量版）
 * カードの完全な情報はTempCardDBから取得する
 */
export interface DeckCardRef {
  /** カードID (cid) */
  cid: string;
  /** 画像識別子 (ciid) */
  ciid: string;
  /** 言語コード（カード取得時の言語を記録） */
  lang: string;
  /** 枚数 */
  quantity: number;
}

/**
 * カード参照（軽量版）
 * 検索結果やカード選択等で使用
 * カードの完全な情報はTempCardDBから取得する
 */
export interface CardRef {
  /** カードID (cid) */
  cid: string;
  /** 画像識別子 (ciid) */
  ciid: string;
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
  /** 関連カード追加取得Promise（初回100件取得時に100件以上ある場合のみ） */
  fetchMorePromise?: Promise<CardInfo[]>;
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

/**
 * カード詳細情報（card tabで表示される追加情報）
 * card-detail-dbで使用
 */
export interface CardDetailInfo {
  /** カードID */
  cardId: string;
  /** カードテキストの補足情報 */
  supplementInfo?: string;
  /** 補足情報の日付 */
  supplementDate?: string;
  /** ペンデュラムテキストの補足情報 */
  pendulumSupplementInfo?: string;
  /** ペンデュラム補足情報の日付 */
  pendulumSupplementDate?: string;
  /** 関連カード一覧 */
  relatedCards?: Array<{
    cardId: string;
    name: string;
    imageUrl?: string;
  }>;
  /** 関連FAQ一覧 */
  relatedQA?: CardFAQ[];
  /** 収録パック情報 */
  relatedProducts?: PackInfo[];
}

/**
 * FAQ詳細情報
 * qa-dbで使用
 */
export interface FAQDetail {
  /** FAQ ID */
  faqId: string;
  /** 質問 */
  question: string;
  /** 回答 */
  answer: string;
  /** 更新日 */
  updatedAt?: string;
  /** 関連カードID */
  cardId?: string;
}


// =========================================
// Cache DB 用型定義
// =========================================

/**
 * カードTier管理テーブル
 * 使用頻度に基づいてキャッシュの保持・破棄を制御
 */
export interface CardTier {
  /** カードID (PK) */
  cardId: string;
  /** 最後にデッキに追加された日時 (timestamp) */
  lastAddedToDeck: number;
  /** 最後に詳細表示された日時 (timestamp) */
  lastShownDetail: number;
  /** 最後に検索で表示された日時 (timestamp) */
  lastSearched: number;
}

/**
 * デッキオープン履歴
 * Tier 5（直近5回で開いたデッキに含まれるカード）の判定に使用
 */
export interface DeckOpenHistory {
  /** 直近5回のデッキ（新しい順） */
  recentDecks: Array<{
    /** デッキ番号 */
    dno: number;
    /** 開いた日時 (timestamp) */
    openedAt: number;
    /** デッキ内カードID一覧 */
    cardIds: string[];
  }>;
}

/**
 * CardTableA: 基本識別情報
 * 対象: Tier 1以上
 * 用途: 検索結果表示、デッキ一覧表示
 */
export interface CardTableA {
  /** カードID (PK) */
  cardId: string;
  /** カード名（多言語対応: {lang: name} 形式） */
  langsName?: Record<string, string>;
  /** カード名（旧形式、互換性保持用） */
  name?: string;
  /** ふりがな */
  ruby?: string;
  /** 画像情報（多言語対応: {lang: imgs[]} 形式） */
  langsImgs?: Record<string, Array<{
    ciid: string;
    imgHash: string;
  }>>;
  /** 画像情報（旧形式、互換性保持用） */
  imgs?: Array<{
    ciid: string;
    imgHash: string;
  }>;
  /** 言語ごとに利用可能なciidのリスト（{lang: ciid[]} 形式） */
  langs_ciids?: Record<string, string[]>;
  /** 取得日時（言語ごと、{lang: timestamp} 形式） */
  langsFetchedAt?: Record<string, number>;
  /** 取得日時（旧形式、互換性保持用） */
  fetchedAt?: number;
}

/**
 * CardTableB: カードステータス
 * 対象: Tier 1以上
 * 用途: フィルタリング、ソート、カード情報表示
 */
export interface CardTableB {
  /** カードID (PK) */
  cardId: string;
  /** ふりがな */
  ruby?: string;
  /** カードタイプ */
  cardType: 'monster' | 'spell' | 'trap';

  // モンスター専用
  /** 属性 */
  attribute?: string;
  /** 種族 */
  race?: string;
  /** レベル/ランク/リンクの種別 */
  levelType?: 'level' | 'rank' | 'link';
  /** レベル/ランク/リンク値 */
  levelValue?: number;
  /** 攻撃力（null = '?'） */
  atk?: number | null;
  /** 守備力（null = '?'） */
  def?: number | null;
  /** リンクマーカー（9bit整数） */
  linkMarkers?: number;
  /** ペンデュラムスケール */
  scale?: number;
  /** エクストラデッキかどうか */
  isExtraDeck?: boolean;
  /** タイプ（効果、チューナー等） */
  types?: string[];

  // 魔法・罠専用
  /** 効果種類（通常、速攻、永続等） */
  effectType?: string;

  // 共通
  /** 禁止制限 */
  limitRegulation?: 'forbidden' | 'limited' | 'semi-limited';

  /** 取得日時 (timestamp) */
  fetchedAt: number;
}

/**
 * CardTableB2: カードテキスト
 * 対象: Tier 0以上
 * 用途: カード効果テキストの表示
 */
export interface CardTableB2 {
  /** カードID (PK) */
  cardId: string;
  /** 効果テキスト（多言語対応: {lang: text} 形式） */
  langsText?: Record<string, string>;
  /** 効果テキスト（旧形式、互換性保持用） */
  text?: string;
  /** ペンデュラムテキスト（多言語対応: {lang: text} 形式） */
  langsPendText?: Record<string, string>;
  /** ペンデュラムテキスト（旧形式、互換性保持用） */
  pendText?: string;
  /** 取得日時（言語ごと、{lang: timestamp} 形式） */
  langsFetchedAt?: Record<string, number>;
  /** 取得日時（旧形式、互換性保持用） */
  fetchedAt?: number;
}

/**
 * CardTableC: テキスト補足・関連情報
 * 対象: Tier 3以上（詳細表示したカード）
 * 用途: カード詳細タブ表示
 */
export interface CardTableC {
  /** カードID (PK) */
  cardId: string;

  // 補足情報
  /** カードテキストの補足情報 */
  supplInfo?: string;
  /** 補足情報の日付 */
  supplDate?: string;
  /** ペンデュラムテキストの補足情報 */
  pendSupplInfo?: string;
  /** ペンデュラム補足情報の日付 */
  pendSupplDate?: string;

  // 関連情報
  /** 関連カードID一覧 */
  relatedCards?: string[];
  /** 関連パックID一覧 */
  relatedProducts?: string[];

  // キャッシュ用の追加情報
  /** 収録シリーズ情報 */
  packs?: PackInfo[];
  /** Q&A情報 */
  qaList?: CardFAQ[];

  /** 取得日時 (timestamp) */
  fetchedAt: number;
}

/**
 * ProductTableA: パック基本情報
 * 対象: related-productで取得された情報
 * 用途: カード詳細の収録情報表示
 */
export interface ProductTableA {
  /** パックID (PK) */
  packId: string;
  /** パック名 */
  name: string;
  /** 発売日（例: "2025-10-25"） */
  releaseDate?: string;
  /** パックコード（例: "DP30-JP001"） */
  code?: string;
  /** 取得日時 (timestamp) */
  fetchedAt: number;
}

/**
 * ProductTableB: パック詳細情報
 * 対象: パック詳細を展開した場合
 * 用途: パック内カードリスト表示
 */
export interface ProductTableB {
  /** パックID (PK) */
  packId: string;
  /** パック内カード一覧 */
  cards: Array<{
    cardId: string;
    rarity?: string;
    rarityColor?: string;
  }>;
  /** 取得日時 (timestamp) */
  fetchedAt: number;
}

/**
 * FAQTableA: 質問一覧
 * 対象: 表示したFAQの質問
 * 用途: カードQAタブの質問リスト
 */
export interface FAQTableA {
  /** FAQ ID (PK) */
  faqId: string;
  /** 質問 */
  question: string;
  /** 更新日 */
  updatedAt?: string;
  /** 関連カードID */
  cardId?: string;
  /** 取得日時 (timestamp) */
  fetchedAt: number;
  /** アクセス時刻（破棄判定用） */
  lastAccessedAt: number;
}

/**
 * FAQTableB: 回答詳細
 * 対象: 展開したFAQの回答
 * 用途: FAQ回答表示
 */
export interface FAQTableB {
  /** FAQ ID (PK) */
  faqId: string;
  /** 回答 */
  answer: string;
  /** 取得日時 (timestamp) */
  fetchedAt: number;
  /** アクセス時刻（破棄判定用） */
  lastAccessedAt: number;
}

/**
 * 禁止制限リスト情報
 * 各適用日における禁止制限状態を保持
 */
export interface ForbiddenLimitedList {
  /** 適用日（YYYY-MM-DD形式、例: "2025-10-01"） */
  effectiveDate: string;
  /** カードIDごとの制限状態マップ */
  regulations: Record<string, LimitRegulation>;
  /** 取得日時 (timestamp) */
  fetchedAt: number;
}

// card-maps.tsから再エクスポート
export type {
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType
};
