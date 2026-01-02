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
 * デッキ表示ページのカード画像サイズ（normal = 公式サイトのデフォルトサイズ）
 */
export type DeckDisplayCardImageSize = 'normal' | CardSize;

/**
 * Right Area の幅（5段階）
 * MAX-FIT: 空いている幅に合わせて大きくする
 */
export type RightAreaWidth = 'S' | 'M' | 'L' | 'XL' | 'MAX-FIT';

/**
 * Right Area のフォントサイズ（4段階）
 */
export type RightAreaFontSize = 's' | 'm' | 'l' | 'xl';

/**
 * ダイアログのフォントサイズ（4段階）
 */
export type DialogFontSize = 's' | 'm' | 'l' | 'xl';

/**
 * 検索UIのフォントサイズ（4段階）
 */
export type SearchUIFontSize = 's' | 'm' | 'l' | 'xl';

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
 * UX設定（色とユーザー体験）
 */
export interface UXSettings {
  /** カード検索入力欄の位置 */
  searchInputPosition: SearchInputPosition;
  /** 検索モードのデフォルト */
  defaultSearchMode: SearchMode;
  /** 右クリック・中クリック操作の有効化 */
  enableMouseOperations: boolean;
  /** デッキ編集画面でファビコンを変更 */
  changeFavicon: boolean;
  /** キーボードショートカット設定（各機能に最大3つまで登録可能） */
  keyboardShortcuts: {
    /** グローバル検索呼び出しキー */
    globalSearch: KeyboardShortcut[];
    /** Undoキー */
    undo: KeyboardShortcut[];
    /** Redoキー */
    redo: KeyboardShortcut[];
  };
  /** カードリスト表示形式（セクションごと）*/
  cardListViewMode: {
    /** 検索結果セクション */
    search: 'list' | 'grid';
    /** 関連カードセクション */
    related: 'list' | 'grid';
    /** 商品一覧セクション */
    products: 'list' | 'grid';
  };
  /** Right Area の幅 */
  rightAreaWidth: RightAreaWidth;
  /** Right Area のフォントサイズ */
  rightAreaFontSize: RightAreaFontSize;
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
  /** UX設定（色・ユーザー体験） */
  ux: UXSettings;
  /** 禁止制限チェック有効化（Phase 3で使用） */
  enableBanlistCheck: boolean;
  /** 未保存時の警告モード */
  unsavedWarning: UnsavedWarning;
  /** デッキ表示ページでCardDetail情報を表示 */
  showCardDetailInDeckDisplay: boolean;
  /** デッキ表示ページのカード画像サイズ */
  deckDisplayCardImageSize: DeckDisplayCardImageSize;
  /** デフォルトソート順序 */
  defaultSortOrder: string;
  /** カテゴリ優先を有効化 */
  enableCategoryPriority: boolean;
  /** 末尾配置を有効化 */
  enableTailPlacement: boolean;
  /** 手動先頭優先配置を有効化 */
  enableHeadPlacement: boolean;
  /** 保存前に全ソートを実行 */
  sortAllBeforeSave: boolean;
  /** ダイアログのフォントサイズ */
  dialogFontSize: DialogFontSize;
  /** 検索UIのフォントサイズ */
  searchUIFontSize: SearchUIFontSize;
  /** バックグラウンドでのデッキ情報取得 */
  backgroundDeckInfoFetch: boolean;
  /** APIフェッチなしでサムネイルを更新 */
  updateThumbnailWithoutFetch: boolean;
  /** 保存ボタンクリック後の遅延時間（ミリ秒）: 0〜5000 (デフォルト: 0) */
  saveDelayMs: number;

  // 後方互換性：deprecated（新規コードは ux.* を使用）
  /** @deprecated ux.searchInputPosition を使用してください */
  searchInputPosition?: SearchInputPosition;
  /** @deprecated ux.defaultSearchMode を使用してください */
  defaultSearchMode?: SearchMode;
  /** @deprecated ux.enableMouseOperations を使用してください */
  enableMouseOperations?: boolean;
  /** @deprecated ux.changeFavicon を使用してください */
  changeFavicon?: boolean;
  /** @deprecated ux.keyboardShortcuts を使用してください */
  keyboardShortcuts?: {
    globalSearch: KeyboardShortcut[];
    undo: KeyboardShortcut[];
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
  /** グローバル末尾配置カードID リスト */
  tailPlacementCardIds?: string[];
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
 * デフォルトのUX設定
 */
export const DEFAULT_UX_SETTINGS: UXSettings = {
  searchInputPosition: 'right-top',   // カード検索入力欄: right-top位置
  defaultSearchMode: 'auto',    // 検索モードのデフォルト: 自動
  enableMouseOperations: false,
  changeFavicon: true,
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
  cardListViewMode: {
    search: 'grid',    // 検索結果: グリッド表示（デフォルト）
    related: 'grid',   // 関連カード: グリッド表示（デフォルト）
    products: 'grid',  // 商品一覧: グリッド表示（デフォルト）
  },
  rightAreaWidth: 'L',      // Right Area の幅: L（デフォルト）
  rightAreaFontSize: 'l',   // Right Area のフォントサイズ: l（デフォルト）
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
  ux: DEFAULT_UX_SETTINGS,       // UX設定
  enableBanlistCheck: false,
  unsavedWarning: 'always',
  // デッキ表示ページ設定
  showCardDetailInDeckDisplay: false,  // CardDetail表示: デフォルト無効
  deckDisplayCardImageSize: 'normal',  // デッキ表示ページのカード画像: normal（公式デフォルト）
  defaultSortOrder: 'release_desc',    // デフォルトソート順序: 発売日降順
  enableCategoryPriority: true,        // カテゴリ優先: デフォルト有効
  enableTailPlacement: true,           // 末尾配置: デフォルト有効
  enableHeadPlacement: true,           // 手動先頭優先配置: デフォルト有効
  sortAllBeforeSave: true,             // 保存前に全ソート: デフォルト有効
  dialogFontSize: 'm',                 // ダイアログのフォントサイズ: 中（14px）
  searchUIFontSize: 'm',               // 検索UIのフォントサイズ: 中（14px）
  backgroundDeckInfoFetch: true,       // バックグラウンドでのデッキ情報取得: デフォルト有効（v0.6.2で通信最適化済み）
  updateThumbnailWithoutFetch: true,   // APIフェッチなしでサムネイルを更新: デフォルト有効（v0.6.2で通信最適化済み）
  saveDelayMs: 0,                      // 保存ボタンクリック後の遅延時間: 0ms（即座に保存）
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
