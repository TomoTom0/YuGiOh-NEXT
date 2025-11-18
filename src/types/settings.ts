/**
 * 機能の有効/無効設定の型定義
 */

/**
 * カードゲームタイプ（OCG / Rush Duel）
 */
export type CardGameType = 'ocg' | 'rush';

export type FeatureId = 'shuffle-sort' | 'deck-image' | 'deck-edit';

export interface FeatureSettings {
  [key: string]: boolean;
  'shuffle-sort': boolean;
  'deck-image': boolean;
  'deck-edit': boolean;
}

/**
 * カードサイズ（4段階）
 */
export type CardSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * テーマ
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 言語（10言語 + auto）
 */
export type Language =
  | 'auto'  // 自動検出
  | 'ja'    // 日本語
  | 'en'    // English
  | 'ko'    // 한글
  | 'ae'    // English(Asia)
  | 'cn'    // 簡体字
  | 'de'    // Deutsch
  | 'fr'    // Français
  | 'it'    // Italiano
  | 'es'    // Español
  | 'pt';   // Portugues

/**
 * 表示モード
 */
export type DisplayMode = 'list' | 'grid';

/**
 * ソート順（拡張版）
 */
export type SortOrder =
  | 'official'      // 公式順（デフォルト）
  | 'name-asc'      // 名前昇順
  | 'name-desc'     // 名前降順
  | 'level-asc'     // レベル昇順
  | 'level-desc'    // レベル降順
  | 'atk-asc'       // 攻撃力昇順
  | 'atk-desc'      // 攻撃力降順
  | 'def-asc'       // 守備力昇順
  | 'def-desc';     // 守備力降順

/**
 * カードタブ
 */
export type CardTab = 'info' | 'qa' | 'related' | 'products';

/**
 * アクティブタブ（検索/カード/デッキ）
 */
export type ActiveTab = 'search' | 'card' | 'deck';

export interface DeckEditSettings {
  enabled: boolean;
  defaultDisplayMode: DisplayMode;
  defaultSortOrder: SortOrder;
  enableAnimation: boolean;
  language: Language;
}

/**
 * Extra/Sideデッキの配置方向
 */
export type MiddleDecksLayout = 'horizontal' | 'vertical';

/**
 * アプリ全体設定
 */
export interface AppSettings {
  /** カードサイズ（デッキ編集） */
  deckEditCardSize: CardSize;
  /** カードサイズ（info - カード詳細パネル） */
  infoCardSize: CardSize;
  /** カードサイズ（grid表示） */
  gridCardSize: CardSize;
  /** カードサイズ（list表示） */
  listCardSize: CardSize;
  /** テーマ */
  theme: Theme;
  /** 言語 */
  language: Language;
  /** Extra/Sideデッキの配置方向 */
  middleDecksLayout: MiddleDecksLayout;
  /** 禁止制限チェック有効化（Phase 3で使用） */
  enableBanlistCheck: boolean;
}

/**
 * デッキ編集UI状態（USP用）
 */
export interface DeckEditUIState {
  /** 表示モード */
  viewMode: DisplayMode;
  /** ソート順 */
  sortOrder: SortOrder;
  /** アクティブタブ */
  activeTab: ActiveTab;
  /** カード詳細タブ */
  cardTab: CardTab;
  /** 詳細表示ON/OFF */
  showDetail: boolean;
}

/**
 * chrome.storage.localに保存される設定オブジェクト
 */
export interface StorageSettings {
  featureSettings?: FeatureSettings;
  deckEditSettings?: DeckEditSettings;
  /** アプリ全体設定（v0.4.0で追加） */
  appSettings?: AppSettings;
}

/**
 * デフォルトの機能設定（全て有効）
 */
export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  'shuffle-sort': true,
  'deck-image': true,
  'deck-edit': true,
};

/**
 * デフォルトのデッキ編集設定
 */
export const DEFAULT_DECK_EDIT_SETTINGS: DeckEditSettings = {
  enabled: true,
  defaultDisplayMode: 'list',
  defaultSortOrder: 'official',
  enableAnimation: true,
  language: 'auto',
};

/**
 * デフォルトのアプリ設定
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  deckEditCardSize: 'small',   // デッキ編集: 現在のサイズ（36×53）
  infoCardSize: 'large',        // カード詳細: 現在のサイズ（90×132）
  gridCardSize: 'medium',       // グリッド表示: 現在のサイズ（60×88）
  listCardSize: 'small',        // リスト表示: 現在のサイズ（36×53）
  theme: 'light',               // デフォルトをライトテーマに変更（darkテーマが実質機能していないため）
  language: 'auto',
  middleDecksLayout: 'horizontal',  // Extra/Sideデッキ: 横並び
  enableBanlistCheck: false,
};

/**
 * カードサイズのピクセル定義
 */
export const CARD_SIZE_MAP: Record<CardSize, { width: number; height: number }> = {
  small: { width: 36, height: 53 },
  medium: { width: 60, height: 88 },
  large: { width: 90, height: 132 },
  xlarge: { width: 120, height: 176 },
};
