import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AppSettings,
  CardSize,
  Theme,
  Language,
  MiddleDecksLayout,
  SearchInputPosition,
  SearchMode,
  KeyboardShortcut,
  FeatureSettings,
  StorageSettings,
  UXSettings,
  RightAreaWidth,
  RightAreaFontSize,
  DialogFontSize,
  SearchUIFontSize,
  DeckDisplayCardImageSize
} from '../types/settings';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_SETTINGS,
  CARD_SIZE_MAP,
  DEFAULT_UX_SETTINGS
} from '../types/settings';
import { detectLanguage } from '../utils/language-detector';
import { mappingManager } from '../utils/mapping-manager';
import { DEFAULT_TAIL_PLACEMENT_CARD_IDS } from '../config/default-tail-placement-cards';

export const useSettingsStore = defineStore('settings', () => {
  // ===== 状態 =====

  /** アプリ設定 */
  const appSettings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS });

  /** 機能設定 */
  const featureSettings = ref<FeatureSettings>({ ...DEFAULT_FEATURE_SETTINGS });

  /** ロード完了フラグ */
  const isLoaded = ref(false);

  /** カード幅（リスト表示用） */
  const cardWidthList = ref(59);

  /** カード幅（グリッド表示用） */
  const cardWidthGrid = ref(59);

  /** カード枚数制限モード */
  const cardLimitMode = ref<'all-3' | 'limit-reg'>('all-3');

  /** グローバル末尾配置カードID リスト（デッキ横断的） */
  const tailPlacementCardIds = ref<string[]>([]);

  // ===== 算出プロパティ =====

  /** 現在のカードサイズ（ピクセル） */
  // 各場所のカードサイズピクセル値
  const deckEditCardSizePixels = computed(() => CARD_SIZE_MAP[appSettings.value.deckEditCardSize]);
  const infoCardSizePixels = computed(() => CARD_SIZE_MAP[appSettings.value.infoCardSize]);
  const gridCardSizePixels = computed(() => CARD_SIZE_MAP[appSettings.value.gridCardSize]);
  const listCardSizePixels = computed(() => CARD_SIZE_MAP[appSettings.value.listCardSize]);

  /** 実効テーマ（systemの場合は実際のテーマを返す） */
  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (appSettings.value.theme === 'system') {
      // システム設定を確認
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return appSettings.value.theme as 'light' | 'dark';
  });

  /** 実効言語（autoの場合は検出した言語を返す） */
  const effectiveLanguage = computed<string>(() => {
    // 一時的に常に自動検出を強制
    return detectCurrentLanguage();
  });;

  // ===== アクション =====

  /**
   * オブジェクトをディープマージ
   * 配列の場合: 保存された配列が空でなければそれを使用、空なら対象の配列を使用
   * オブジェクトの場合: 再帰的にマージ
   */
  function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== undefined && source[key] !== null) {
        if (Array.isArray(source[key])) {
          // 配列の場合: 保存された配列が空でなければそれを使用、空ならターゲットの配列を使用
          const sourceArray = source[key] as any[];
          result[key] = (sourceArray.length > 0 ? sourceArray : (target[key] || sourceArray)) as any;
        } else if (typeof source[key] === 'object') {
          // オブジェクトの場合: 再帰的にマージ
          result[key] = deepMerge((target[key] || {}) as any, source[key] as any) as any;
        } else {
          result[key] = source[key] as any;
        }
      }
    }
    return result;
  }

  /**
   * 古い形式の設定を新しい形式に移行（後方互換性）
   * 旧形式：トップレベルに searchInputPosition, defaultSearchMode などのプロパティ
   * 新形式：ux オブジェクト内にこれらのプロパティを含む
   */
  function migrateOldSettingsFormat(oldSettings: any): AppSettings {
    if (!oldSettings.ux && (oldSettings.searchInputPosition || oldSettings.defaultSearchMode || oldSettings.enableMouseOperations || oldSettings.changeFavicon)) {
      // 旧形式の UX 設定を新しい ux オブジェクトに移行
      const uxSettings: Partial<UXSettings> = { ...DEFAULT_UX_SETTINGS };

      if (oldSettings.searchInputPosition) {
        uxSettings.searchInputPosition = oldSettings.searchInputPosition;
      }
      if (oldSettings.defaultSearchMode) {
        uxSettings.defaultSearchMode = oldSettings.defaultSearchMode;
      }
      if (oldSettings.enableMouseOperations !== undefined) {
        uxSettings.enableMouseOperations = oldSettings.enableMouseOperations;
      }
      if (oldSettings.changeFavicon !== undefined) {
        uxSettings.changeFavicon = oldSettings.changeFavicon;
      }
      if (oldSettings.keyboardShortcuts) {
        uxSettings.keyboardShortcuts = oldSettings.keyboardShortcuts;
      }

      // 古いキーを削除した新しいオブジェクトを作成
      const { searchInputPosition, defaultSearchMode, enableMouseOperations, changeFavicon, keyboardShortcuts, ...cleanedSettings } = oldSettings;

      return {
        ...cleanedSettings,
        ux: uxSettings as UXSettings
      };
    }

    return oldSettings;
  }

  /**
   * 共通設定を読み込み（デッキ表示ページでも使用）
   * - テーマ
   * - カード詳細のカードサイズ
   * - グリッド表示のカードサイズ
   * - リスト表示のカードサイズ
   * - キーボードショートカット（デッキ編集ページで使用）
   */
  async function loadCommonSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['appSettings', 'featureSettings', 'tailPlacementCardIds'], (result: StorageSettings) => {
        // 古い形式の設定を新しい形式に移行
        let loadedSettings = result.appSettings ? migrateOldSettingsFormat(result.appSettings) : null;

        // 保存された設定をデフォルト値とマージ（キーボードショートカットも含める）
        const mergedAppSettings = loadedSettings
          ? deepMerge(DEFAULT_APP_SETTINGS, loadedSettings)
          : { ...DEFAULT_APP_SETTINGS };

        appSettings.value = mergedAppSettings;

        featureSettings.value = result.featureSettings
          ? deepMerge(DEFAULT_FEATURE_SETTINGS, result.featureSettings)
          : { ...DEFAULT_FEATURE_SETTINGS };

        // 初回起動時はデフォルトの末尾配置カードIDを使用
        // 以降はユーザーの設定を保持
        if (Array.isArray(result.tailPlacementCardIds) && result.tailPlacementCardIds.length > 0) {
          tailPlacementCardIds.value = result.tailPlacementCardIds;
        } else {
          tailPlacementCardIds.value = [...DEFAULT_TAIL_PLACEMENT_CARD_IDS];
        }

        isLoaded.value = true;

        // テーマと共通のカードサイズ（info, grid, list）を適用
        applyTheme();
        applyCommonCardSize();
        applyRightAreaStyles();
        applyFontSizes();

        resolve();
      });
    });
  }

  /**
   * デッキ編集専用設定を読み込み
   * - デッキ編集のカードサイズ
   *
   * 注：keyboardShortcutsは loadCommonSettings() で既に初期化済み
   */
  async function loadDeckEditSettings(): Promise<void> {
    // デッキ編集のカードサイズを適用するだけ
    applyDeckEditCardSize();
  }

  /**
   * 全設定を読み込み（後方互換性のため）
   * @deprecated 用途に応じて loadCommonSettings または loadDeckEditSettings を使用してください
   */
  async function loadSettings(): Promise<void> {
    await loadCommonSettings();
    await loadDeckEditSettings();
  }

  /**
   * 設定を保存
   */
  async function saveSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        appSettings: appSettings.value,
        featureSettings: featureSettings.value,
        tailPlacementCardIds: tailPlacementCardIds.value,
      }, () => {
        // localStorage にもキャッシュ（超早期読み込み用）
        try {
          localStorage.setItem('ygoNext:settings', JSON.stringify(appSettings.value));
          if (typeof window !== 'undefined') {
            window.ygoNextCurrentSettings = appSettings.value;
          }
        } catch (error) {
          console.warn('[Settings] Failed to update localStorage cache:', error);
        }
        resolve();
      });
    });
  }

  /**
   * デッキ編集のカードサイズを変更
   */
  function setDeckEditCardSize(size: CardSize): void {
    appSettings.value.deckEditCardSize = size;
    applyCardSize();
    saveSettings();
  }

  /**
   * カード詳細（info）のカードサイズを変更
   */
  function setInfoCardSize(size: CardSize): void {
    appSettings.value.infoCardSize = size;
    applyCardSize();
    saveSettings();
  }

  /**
   * グリッド表示のカードサイズを変更
   */
  function setGridCardSize(size: CardSize): void {
    appSettings.value.gridCardSize = size;
    applyCardSize();
    saveSettings();
  }

  /**
   * リスト表示のカードサイズを変更
   */
  function setListCardSize(size: CardSize): void {
    appSettings.value.listCardSize = size;
    applyCardSize();
    saveSettings();
  }

  /**
   * カードサイズプリセットを適用
   * xl: deck/list=xl, info=xl, grid=l
   * l: deck/list=l, info=xl, grid=m
   * m: deck/list=m, info=l, grid=s
   * s: deck/list=s, info=m, grid=s
   */
  function setCardSizePreset(preset: 's' | 'm' | 'l' | 'xl'): void {
    switch (preset) {
      case 'xl':
        appSettings.value.deckEditCardSize = 'xlarge';
        appSettings.value.infoCardSize = 'xlarge';
        appSettings.value.gridCardSize = 'large';
        appSettings.value.listCardSize = 'xlarge';
        break;
      case 'l':
        appSettings.value.deckEditCardSize = 'large';
        appSettings.value.infoCardSize = 'xlarge';
        appSettings.value.gridCardSize = 'medium';
        appSettings.value.listCardSize = 'large';
        break;
      case 'm':
        appSettings.value.deckEditCardSize = 'medium';
        appSettings.value.infoCardSize = 'large';
        appSettings.value.gridCardSize = 'small';
        appSettings.value.listCardSize = 'medium';
        break;
      case 's':
        appSettings.value.deckEditCardSize = 'small';
        appSettings.value.infoCardSize = 'medium';
        appSettings.value.gridCardSize = 'small';
        appSettings.value.listCardSize = 'small';
        break;
    }
    applyCardSize();
    saveSettings();
  }

  /**
   * 現在のプリセットを取得
   */
  function getCurrentPreset(): 's' | 'm' | 'l' | 'xl' | null {
    const { deckEditCardSize, infoCardSize, gridCardSize, listCardSize } = appSettings.value;

    if (deckEditCardSize === 'xlarge' && infoCardSize === 'xlarge' && gridCardSize === 'large' && listCardSize === 'xlarge') {
      return 'xl';
    }
    if (deckEditCardSize === 'large' && infoCardSize === 'xlarge' && gridCardSize === 'medium' && listCardSize === 'large') {
      return 'l';
    }
    if (deckEditCardSize === 'medium' && infoCardSize === 'large' && gridCardSize === 'small' && listCardSize === 'medium') {
      return 'm';
    }
    if (deckEditCardSize === 'small' && infoCardSize === 'medium' && gridCardSize === 'small' && listCardSize === 'small') {
      return 's';
    }
    return null;
  }

  /**
   * カード幅を変更（ピクセル値で直接指定）
   */
  function setCardWidth(mode: 'list' | 'grid', width: number): void {
    if (mode === 'list') {
      cardWidthList.value = width;
      const height = Math.round(width * 1.46);
      document.documentElement.style.setProperty('--card-width-list', `${width}px`);
      document.documentElement.style.setProperty('--card-height-list', `${height}px`);
    } else {
      cardWidthGrid.value = width;
      const height = Math.round(width * 1.46);
      document.documentElement.style.setProperty('--card-width-grid', `${width}px`);
      document.documentElement.style.setProperty('--card-height-grid', `${height}px`);
    }
    saveSettings();
  }

  /**
   * テーマを変更
   */
  function setTheme(theme: Theme): void {
    appSettings.value.theme = theme;
    applyTheme();
    saveSettings();
  }

  /**
   * 言語を変更
   */
  function setLanguage(language: Language): void {
    appSettings.value.language = language;
    saveSettings();

    // 言語設定の場合、マッピング情報を確保する
    if (language !== 'auto') {
      // 非同期でマッピング情報を取得（言語切り替え時の待機を避けるため）
      mappingManager.ensureMappingForLanguage(language).catch(error => {
        console.error('[Settings] Failed to ensure mapping for language:', error);
      });
    }

    // 言語変更後はページリロードが必要
    // （APIリクエストのlocaleパラメータが変わるため）
  }

  /**
   * Extra/Sideデッキの配置方向を変更
   */
  function setMiddleDecksLayout(layout: MiddleDecksLayout): void {
    appSettings.value.middleDecksLayout = layout;
    saveSettings();
  }

  /**
   * カードリスト表示形式を設定（セクションごと）
   */
  function setCardListViewMode(section: 'search' | 'related' | 'products', mode: 'list' | 'grid'): void {
    appSettings.value.ux.cardListViewMode[section] = mode;
    saveSettings();
  }

  function setMouseOperations(enabled: boolean): void {
    appSettings.value.ux.enableMouseOperations = enabled;
    saveSettings();
  }

  function setChangeFavicon(enabled: boolean): void {
    appSettings.value.ux.changeFavicon = enabled;
    saveSettings();
  }

  /**
   * キーボードショートカットを追加（最大3つまで）
   */
  function addKeyboardShortcut(name: 'globalSearch' | 'undo' | 'redo', shortcut: KeyboardShortcut): void {
    const shortcuts = appSettings.value.ux.keyboardShortcuts[name];
    if (shortcuts.length >= 3) {
      console.warn(`[Settings] Cannot add more than 3 shortcuts for ${name}`);
      return;
    }
    shortcuts.push(shortcut);
    saveSettings();
  }

  /**
   * キーボードショートカットを削除
   */
  function removeKeyboardShortcut(name: 'globalSearch' | 'undo' | 'redo', index: number): void {
    const shortcuts = appSettings.value.ux.keyboardShortcuts[name];
    if (index >= 0 && index < shortcuts.length) {
      shortcuts.splice(index, 1);
      saveSettings();
    }
  }

  /**
   * 検索入力欄の位置を変更
   */
  function setSearchInputPosition(position: SearchInputPosition): void {
    appSettings.value.ux.searchInputPosition = position;
    saveSettings();
  }

  /**
   * 検索モードのデフォルトを変更
   */
  function setDefaultSearchMode(mode: SearchMode): void {
    appSettings.value.ux.defaultSearchMode = mode;
    saveSettings();
  }

  /**
   * Right Area の幅を変更
   */
  function setRightAreaWidth(width: RightAreaWidth): void {
    appSettings.value.ux.rightAreaWidth = width;
    applyRightAreaStyles();
    saveSettings();
  }

  /**
   * Right Area のフォントサイズを変更
   */
  function setRightAreaFontSize(fontSize: RightAreaFontSize): void {
    appSettings.value.ux.rightAreaFontSize = fontSize;
    applyRightAreaStyles();
    saveSettings();
  }

  /**
   * ダイアログのフォントサイズを変更
   */
  function setDialogFontSize(fontSize: DialogFontSize): void {
    appSettings.value.dialogFontSize = fontSize;
    applyFontSizes();
    saveSettings();
  }

  /**
   * 検索UIのフォントサイズを変更
   */
  function setSearchUIFontSize(fontSize: SearchUIFontSize): void {
    appSettings.value.searchUIFontSize = fontSize;
    applyFontSizes();
    saveSettings();
  }

  /**
   * デッキ表示ページでCardDetail情報を表示するかを変更
   */
  function setShowCardDetailInDeckDisplay(enabled: boolean): void {
    appSettings.value.showCardDetailInDeckDisplay = enabled;
    saveSettings();
  }

  /**
   * デッキ表示ページのカード画像サイズを変更
   */
  function setDeckDisplayCardImageSize(size: DeckDisplayCardImageSize): void {
    appSettings.value.deckDisplayCardImageSize = size;
    saveSettings();
  }

  /**
   * 機能のON/OFF切り替え
   */
  function toggleFeature(featureId: string, enabled: boolean): void {
    featureSettings.value[featureId] = enabled;
    saveSettings();
  }

  /**
   * 末尾配置リストにカードを追加
   */
  function addTailPlacementCard(cardId: string): void {
    if (!tailPlacementCardIds.value.includes(cardId)) {
      tailPlacementCardIds.value.push(cardId);
      saveSettings();
    }
  }

  /**
   * 末尾配置リストからカードを削除
   */
  function removeTailPlacementCard(cardId: string): void {
    const index = tailPlacementCardIds.value.indexOf(cardId);
    if (index >= 0) {
      tailPlacementCardIds.value.splice(index, 1);
      saveSettings();
    }
  }

  /**
   * カードが末尾配置リストに含まれているか判定
   */
  function isTailPlacementCard(cardId: string): boolean {
    return tailPlacementCardIds.value.includes(cardId);
  }

  /**
   * バックグラウンドでのデッキ情報取得を設定
   */
  function setBackgroundDeckInfoFetch(enabled: boolean): void {
    appSettings.value.backgroundDeckInfoFetch = enabled;
    saveSettings();
  }

  /**
   * APIフェッチなしでサムネイルを更新するかどうかを設定
   */
  function setUpdateThumbnailWithoutFetch(enabled: boolean): void {
    appSettings.value.updateThumbnailWithoutFetch = enabled;
    saveSettings();
  }

  /**
   * 設定をリセット
   */
  async function resetSettings(): Promise<void> {
    appSettings.value = { ...DEFAULT_APP_SETTINGS };
    featureSettings.value = { ...DEFAULT_FEATURE_SETTINGS };
    applyTheme();
    applyCardSize();
    await saveSettings();
  }

  // ===== 内部関数 =====

  /**
   * テーマをDOMに適用
   */
  function applyTheme(): void {
    const theme = effectiveTheme.value;
    document.documentElement.setAttribute('data-ygo-next-theme', theme);
    // CSS変数はthemes.scssで定義されているため、動的注入不要
  }

  /**
   * 共通カードサイズをDOMに適用（info, grid, list）
   * デッキ表示ページで使用
   */
  function applyCommonCardSize(): void {
    // カード詳細（info）用
    const info = infoCardSizePixels.value;
    document.documentElement.style.setProperty('--card-width-info', `${info.width}px`);
    document.documentElement.style.setProperty('--card-height-info', `${info.height}px`);

    // グリッド表示用
    const grid = gridCardSizePixels.value;
    document.documentElement.style.setProperty('--card-width-grid', `${grid.width}px`);
    document.documentElement.style.setProperty('--card-height-grid', `${grid.height}px`);

    // リスト表示用
    const list = listCardSizePixels.value;
    document.documentElement.style.setProperty('--card-width-list', `${list.width}px`);
    document.documentElement.style.setProperty('--card-height-list', `${list.height}px`);
  }

  /**
   * デッキ編集のカードサイズをDOMに適用
   */
  function applyDeckEditCardSize(): void {
    const deckEdit = deckEditCardSizePixels.value;
    document.documentElement.style.setProperty('--card-width-deck', `${deckEdit.width}px`);
    document.documentElement.style.setProperty('--card-height-deck', `${deckEdit.height}px`);
  }

  /**
   * 全カードサイズをDOMに適用（後方互換性のため）
   */
  function applyCardSize(): void {
    applyCommonCardSize();
    applyDeckEditCardSize();
  }

  /**
   * Right Area のスタイルをDOMに適用
   */
  function applyRightAreaStyles(): void {
    const width = appSettings.value.ux.rightAreaWidth;
    const fontSize = appSettings.value.ux.rightAreaFontSize;

    // Width のマッピング（ピクセル値）
    const widthMap: Record<RightAreaWidth, string> = {
      'S': '300px',
      'M': '400px',
      'L': '500px',
      'XL': '600px'
    };

    // Font Size のマッピング
    const fontSizeMap: Record<RightAreaFontSize, string> = {
      's': '12px',
      'm': '14px',
      'l': '16px',
      'xl': '18px'
    };

    document.documentElement.style.setProperty('--right-area-width', widthMap[width]);
    document.documentElement.style.setProperty('--right-area-font-size', fontSizeMap[fontSize]);
  }

  /**
   * フォントサイズをDOMに適用
   */
  function applyFontSizes(): void {
    const dialogFontSize = appSettings.value.dialogFontSize;
    const searchUIFontSize = appSettings.value.searchUIFontSize;

    // Dialog Font Size のマッピング
    const dialogFontSizeMap: Record<DialogFontSize, string> = {
      's': '12px',
      'm': '14px',
      'l': '16px',
      'xl': '18px'
    };

    // Search UI Font Size のマッピング
    const searchUIFontSizeMap: Record<SearchUIFontSize, string> = {
      's': '12px',
      'm': '14px',
      'l': '16px',
      'xl': '18px'
    };

    document.documentElement.style.setProperty('--dialog-font-size', dialogFontSizeMap[dialogFontSize]);
    document.documentElement.style.setProperty('--search-ui-font-size', searchUIFontSizeMap[searchUIFontSize]);
  }

  /**
   * システムテーマ変更を監視
   */
  function watchSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (appSettings.value.theme === 'system') {
        applyTheme();
      }
    });
  }

  /**
   * 言語を検出（既存のdetectLanguageを利用）
   */
  function detectCurrentLanguage(): string {
    try {
      return detectLanguage(document);
    } catch (e) {
      console.warn('[Settings] Failed to detect language, fallback to ja:', e);
      return 'ja';
    }
  }

  // ===== 初期化 =====

  // システムテーマ変更を監視
  watchSystemTheme();

  return {
    // 状態
    appSettings,
    featureSettings,
    isLoaded,
    cardWidthList,
    cardWidthGrid,
    cardLimitMode,
    tailPlacementCardIds,

    // 算出プロパティ
    deckEditCardSizePixels,
    infoCardSizePixels,
    gridCardSizePixels,
    listCardSizePixels,
    effectiveTheme,
    effectiveLanguage,

    // アクション
    loadSettings,
    loadCommonSettings,
    loadDeckEditSettings,
    saveSettings,
    setDeckEditCardSize,
    setInfoCardSize,
    setGridCardSize,
    setListCardSize,
    setCardSizePreset,
    getCurrentPreset,
    setCardWidth,
    setTheme,
    setLanguage,
    setMiddleDecksLayout,
    setCardListViewMode,
    setMouseOperations,
    setChangeFavicon,
    addKeyboardShortcut,
    removeKeyboardShortcut,
    setSearchInputPosition,
    setDefaultSearchMode,
    setRightAreaWidth,
    setRightAreaFontSize,
    setDialogFontSize,
    setSearchUIFontSize,
    setShowCardDetailInDeckDisplay,
    setDeckDisplayCardImageSize,
    toggleFeature,
    addTailPlacementCard,
    removeTailPlacementCard,
    isTailPlacementCard,
    setBackgroundDeckInfoFetch,
    setUpdateThumbnailWithoutFetch,
    resetSettings,
    applyTheme,
    applyCardSize,
    applyRightAreaStyles,
    applyFontSizes,
  };
});
