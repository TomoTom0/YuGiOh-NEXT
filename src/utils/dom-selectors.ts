/**
 * DOM Selectors Map
 *
 * すべてのDOM セレクタを集約して管理します。
 * 公式サイトのDOM変更に対する脆弱性を軽減するため、
 * セレクタを一元管理し、変更が必要な場合はこのファイルのみを更新します。
 */

/**
 * 公式サイト（yugioh-card.com）のセレクタ
 * 注意: これらは外部サイトの構造に依存しているため、サイトの更新で変更される可能性があります
 */
export const OFFICIAL_SITE_SELECTORS = {
  // セッション関連
  session: {
    /** マイデッキページへのリンク（cgidパラメータ付き） */
    myDeckLinkWithCgid: 'a[href*="member_deck.action"][href*="cgid="]',
    /** cgidパラメータを含む任意のリンク */
    anyLinkWithCgid: 'a[href*="cgid="]',
  },

  // ページ検出関連
  navigation: {
    /** フッターメニューのマイデッキリンク */
    footerMyDeckLink: '#footer_menu > ul > li.my.menu_my_decks.sab_menu > ul > li:nth-child(1) > a',
    /** 言語切り替えリンク */
    languageChangeLinks: 'a[href*="javascript:ChangeLanguage"]',
  },

  // ページ構造
  layout: {
    /** メインコンテナ */
    wrapper: '#wrapper',
    /** 背景要素 */
    background: '#bg',
    /** ヘッダー要素（優先順位: header > #header） */
    header: 'header',
    headerFallback: '#header',
  },

  // デッキレシピページ
  deckRecipe: {
    /** 下部ボタンセット */
    bottomButtonSet: '#bottom_btn_set',
    /** デッキ画像コンテナ */
    deckImage: '#deck_image',
  },

  // デッキ表示ページ
  deckDisplay: {
    /** お気に入り数 */
    favoriteCount: 'span#favoriteCnt',
    /** デッキコードコピーボタン */
    copyCodeButton: '#copy-code',
  },
} as const

/**
 * 拡張機能独自の要素ID（すべて ygo-next-* プレフィックス）
 */
export const EXTENSION_IDS = {
  // モジュールローディング
  loading: {
    /** モジュールローディングオーバーレイ */
    moduleLoadingOverlay: 'ygo-next-module-loading-overlay',
    /** 初期非表示スタイル */
    earlyHideStyle: 'ygo-next-early-hide',
  },

  // デッキ編集UI
  deckEdit: {
    /** 編集ボタン */
    editButton: 'ygo-next-edit-btn',
    /** 編集UIスタイル */
    editUiStyles: 'ygo-next-edit-ui-styles',
  },

  // シャッフル・ソート機能
  shuffle: {
    /** メインデッキ - シャッフルボタン */
    mainShuffleButton: 'ygo-next-shuffle-btn-main',
    /** メインデッキ - ソートボタン */
    mainSortButton: 'ygo-next-sort-btn-main',
    /** エクストラデッキ - シャッフルボタン */
    extraShuffleButton: 'ygo-next-shuffle-btn-extra',
    /** エクストラデッキ - ソートボタン */
    extraSortButton: 'ygo-next-sort-btn-extra',
    /** サイドデッキ - シャッフルボタン */
    sideShuffleButton: 'ygo-next-shuffle-btn-side',
    /** サイドデッキ - ソートボタン */
    sideSortButton: 'ygo-next-sort-btn-side',
  },

  // デッキ画像生成
  deckImage: {
    /** デッキ画像ボタン */
    deckImageButton: 'ygo-next-deck-image-btn',
    /** 画像ポップアップオーバーレイ */
    popupOverlay: 'ygo-next-image-popup-overlay',
    /** 画像ポップアップメニュー */
    popup: 'ygo-next-image-popup',
    /** 背景画像 */
    backgroundImage: 'ygo-next-background-image',
    /** QRコードトグル */
    qrToggle: 'ygo-next-qr-toggle',
    /** サイドデッキトグル */
    sideToggle: 'ygo-next-side-toggle',
    /** ダウンロードボタン */
    downloadButton: 'ygo-next-download-btn',
    /** 閉じるボタン */
    closeButton: 'ygo-next-close-btn',
    /** デッキ名入力 */
    deckNameInput: 'ygo-next-deck-name-input',
  },

  // デッキ表示
  deckDisplay: {
    /** デッキ表示アプリコンテナ */
    deckDisplayApp: 'ygo-next-deck-display-app',
    /** カード詳細コンテナ */
    cardDetailContainer: 'ygo-next-card-detail-container',
    /** カード情報コンテンツエリア */
    cardInfoContent: 'ygo-next-card-info-content',
  },
} as const

/**
 * 拡張機能独自のクラス名（すべて ygo-next-* プレフィックス）
 */
export const EXTENSION_CLASSES = {
  // 共通
  common: {
    /** ygo-next 基本クラス */
    base: 'ygo-next',
  },

  // デッキ画像生成
  deckImage: {
    /** スピナーアニメーション */
    spinner: 'ygo-next-spinner',
    /** トグルボタン */
    toggleButton: 'ygo-next-toggle-btn',
    /** ダイアログボタン */
    dialogButton: 'ygo-next-dialog-btn',
    /** QRコード - アクティブ */
    qrActive: 'ygo-next-qr-active',
    /** QRコード - 非アクティブ */
    qrInactive: 'ygo-next-qr-inactive',
    /** サイドデッキ - アクティブ */
    sideActive: 'ygo-next-side-active',
    /** サイドデッキ - 非アクティブ */
    sideInactive: 'ygo-next-side-inactive',
  },

  // デッキ表示
  deckDisplay: {
    /** カード情報ボタン */
    cardInfoButton: 'ygo-next-card-info-btn',
    /** ホバーオーバーレイ - アクティブ */
    hoverOverlayActive: 'ygo-next-hover-overlay-active',
    /** カーソルエリア内 */
    cursorInArea: 'ygo-next-cursor-in-area',
    /** カードホバーオーバーレイ */
    cardHoverOverlay: 'ygo-next-card-hover-overlay',
    /** アクティブ状態 */
    active: 'ygo-next-active',
    /** 有効なカードタブ */
    validCardTab: 'ygo-next-valid-card-tab-on-deck-display',
  },
} as const

/**
 * その他のセレクタ
 */
export const MISC_SELECTORS = {
  /** ファビコン（link[rel*='icon']） */
  favicon: "link[rel*='icon']",
} as const

/**
 * セレクタヘルパー関数
 * 拡張機能のIDセレクタを '#' 付きで取得
 */
export function getExtensionIdSelector(id: string): string {
  return `#${id}`
}

/**
 * 拡張機能の要素を安全に取得
 */
export function getExtensionElement(id: string): HTMLElement | null {
  return document.getElementById(id)
}

/**
 * 拡張機能のクラスセレクタを '.' 付きで取得
 */
export function getExtensionClassSelector(className: string): string {
  return `.${className}`
}
