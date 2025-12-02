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
 * Note: アンダースコア区切り（実装と一致）
 */
export type SortOrder =
  | 'official'      // 公式順（デフォルト）
  | 'release_desc'  // リリース日降順（新しい順）
  | 'release_asc'   // リリース日昇順（古い順）
  | 'name_asc'      // 名前昇順
  | 'name_desc'     // 名前降順
  | 'level_asc'     // レベル昇順
  | 'level_desc'    // レベル降順
  | 'atk_asc'       // 攻撃力昇順
  | 'atk_desc'      // 攻撃力降順
  | 'def_asc'       // 守備力昇順
  | 'def_desc';     // 守備力降順

/**
 * カードタブ
 */
export type CardTab = 'info' | 'qa' | 'related' | 'products';

/**
 * アクティブタブ（検索/カード/デッキ/メタデータ）
 */
export type ActiveTab = 'search' | 'card' | 'deck' | 'metadata';

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
 * カード検索入力欄の位置
 */
export type SearchInputPosition = 'default' | 'right-top' | 'right-bottom';

/**
 * 検索モード
 * - 'name': カード名で検索
 * - 'text': カードテキストで検索
 * - 'pendulum': ペンデュラムテキストで検索
 * - 'auto': 自動モード（クエリ長に応じて最適な検索方式を自動選択）
 *   - 1文字: カード名のみで検索
 *   - 2文字以上: カード名・テキスト・ペンデュラムテキストを同時検索して結果を結合
 * - 'mydeck': マイデッキから選択
 */
export type SearchMode = 'name' | 'text' | 'pendulum' | 'auto' | 'mydeck';

/**
 * 未保存時の警告モード
 */
export type UnsavedWarning = 'always' | 'without-sorting-only' | 'never';

/**
 * キーボードショートカット
 */
export interface KeyboardShortcut {
  /** Ctrlキーが押されているか */
  ctrl: boolean;
  /** Shiftキーが押されているか */
  shift: boolean;
  /** Altキーが押されているか */
  alt: boolean;
  /** 押されたキー（小文字） */
  key: string;
}

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
  /** カード検索入力欄の位置 */
  searchInputPosition: SearchInputPosition;
  /** 検索モードのデフォルト */
  defaultSearchMode: SearchMode;
  /** 禁止制限チェック有効化（Phase 3で使用） */
  enableBanlistCheck: boolean;
  /** 未保存時の警告モード */
  unsavedWarning: UnsavedWarning;
  /** 右クリック・中クリック操作の有効化 */
  enableMouseOperations: boolean;
  /** デッキ編集画面でファビコンを変更 */
  changeFavicon: boolean;
  /** デッキ表示ページでCardDetail情報を表示 */
  showCardDetailInDeckDisplay: boolean;
  /** デッキ表示ページのカード画像サイズ */
  deckDisplayCardImageSize: CardSize;
  /** キーボードショートカット設定（各機能に最大3つまで登録可能） */
  keyboardShortcuts: {
    /** グローバル検索呼び出しキー */
    globalSearch: KeyboardShortcut[];
    /** Undoキー */
    undo: KeyboardShortcut[];
    /** Redoキー */
    redo: KeyboardShortcut[];
  };
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
  // デフォルトはLプリセット（deck/list=large, info=xlarge, grid=medium）
  deckEditCardSize: 'large',
  infoCardSize: 'xlarge',
  gridCardSize: 'medium',
  listCardSize: 'large',
  theme: 'light',               // デフォルトをライトテーマに変更（darkテーマが実質機能していないため）
  language: 'auto',
  middleDecksLayout: 'vertical',  // Extra/Sideデッキ: 縦並び
  searchInputPosition: 'right-top',   // カード検索入力欄: right-top位置
  defaultSearchMode: 'name',    // 検索モードのデフォルト: カード名
  enableBanlistCheck: false,
  // UX設定
  unsavedWarning: 'always',
  enableMouseOperations: false,
  changeFavicon: true,
  // デッキ表示ページ設定
  showCardDetailInDeckDisplay: false,  // CardDetail表示: デフォルト無効
  deckDisplayCardImageSize: 'large',   // デッキ表示ページのカード画像: large
  // キーボードショートカット（各機能に最大3つまで登録可能、0個も許容）
  keyboardShortcuts: {
    globalSearch: [
      { ctrl: false, shift: false, alt: false, key: '/' },
      { ctrl: true, shift: false, alt: false, key: 'j' }
    ],
    undo: [
      { ctrl: true, shift: false, alt: false, key: 'z' }
    ],
    redo: [
      { ctrl: true, shift: false, alt: false, key: 'y' }
    ],
  },
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
