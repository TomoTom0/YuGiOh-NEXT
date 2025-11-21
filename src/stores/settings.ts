import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AppSettings,
  CardSize,
  Theme,
  Language,
  MiddleDecksLayout,
  SearchInputPosition,
  FeatureSettings,
  StorageSettings
} from '../types/settings';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_SETTINGS,
  CARD_SIZE_MAP
} from '../types/settings';
import { getThemeColors } from '../styles/themes';
import { detectLanguage } from '../utils/language-detector';

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
      // prefers-color-schemeを検出
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return appSettings.value.theme;
  });

  /** 実効言語（autoの場合は検出した言語を返す） */
  const effectiveLanguage = computed<string>(() => {
    if (appSettings.value.language === 'auto') {
      // 言語検出ロジック（既存のdetectLanguageを使用）
      return detectCurrentLanguage();
    }
    return appSettings.value.language;
  });

  // ===== アクション =====

  /**
   * chrome.storageから設定を読み込み
   */
  async function loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['appSettings', 'featureSettings'], (result: StorageSettings) => {
        if (result.appSettings) {
          appSettings.value = { ...DEFAULT_APP_SETTINGS, ...result.appSettings };
        }
        if (result.featureSettings) {
          featureSettings.value = { ...DEFAULT_FEATURE_SETTINGS, ...result.featureSettings };
        }

        isLoaded.value = true;

        // 初回ロード時にテーマとカードサイズを適用
        applyTheme();
        applyCardSize();

        console.log('[Settings] Loaded:', { appSettings: appSettings.value, featureSettings: featureSettings.value });
        resolve();
      });
    });
  }

  /**
   * 設定を保存
   */
  async function saveSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        appSettings: appSettings.value,
        featureSettings: featureSettings.value,
      }, () => {
        console.log('[Settings] Saved:', { appSettings: appSettings.value, featureSettings: featureSettings.value });
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
   * 検索入力欄の位置を変更
   */
  function setSearchInputPosition(position: SearchInputPosition): void {
    appSettings.value.searchInputPosition = position;
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
    document.documentElement.setAttribute('data-theme', theme);

    // CSS変数を更新（テーマ定義から読み込み）
    const themeColors = getThemeColors(theme);
    Object.entries(themeColors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    console.log('[Settings] Applied theme:', theme);
  }

  /**
   * カードサイズをDOMに適用（4箇所それぞれ）
   */
  function applyCardSize(): void {
    // デッキ編集用
    const deckEdit = deckEditCardSizePixels.value;
    document.documentElement.style.setProperty('--card-width-deck', `${deckEdit.width}px`);
    document.documentElement.style.setProperty('--card-height-deck', `${deckEdit.height}px`);

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

    console.log('[Settings] Applied card sizes:', {
      deckEdit: appSettings.value.deckEditCardSize,
      info: appSettings.value.infoCardSize,
      grid: appSettings.value.gridCardSize,
      list: appSettings.value.listCardSize
    });
  }

  /**
   * システムテーマ変更を監視
   */
  function watchSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (appSettings.value.theme === 'system') {
        console.log('[Settings] System theme changed');
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

    // 算出プロパティ
    deckEditCardSizePixels,
    infoCardSizePixels,
    gridCardSizePixels,
    listCardSizePixels,
    effectiveTheme,
    effectiveLanguage,

    // アクション
    loadSettings,
    saveSettings,
    setDeckEditCardSize,
    setInfoCardSize,
    setGridCardSize,
    setListCardSize,
    setCardWidth,
    setTheme,
    setLanguage,
    setMiddleDecksLayout,
    setSearchInputPosition,
    toggleFeature,
    resetSettings,
    applyTheme,
    applyCardSize,
  };
});
