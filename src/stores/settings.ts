import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AppSettings,
  CardSize,
  Theme,
  Language,
  MiddleDecksLayout,
  SearchInputPosition,
  KeyboardShortcut,
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
    // 一時的に常にライトテーマを強制
    return 'light';
  });;

  /** 実効言語（autoの場合は検出した言語を返す） */
  const effectiveLanguage = computed<string>(() => {
    // 一時的に常に自動検出を強制
    return detectCurrentLanguage();
  });;

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

  function setMouseOperations(enabled: boolean): void {
    appSettings.value.enableMouseOperations = enabled;
    saveSettings();
  }

  /**
   * キーボードショートカットを追加（最大3つまで）
   */
  function addKeyboardShortcut(name: 'globalSearch' | 'undo' | 'redo', shortcut: KeyboardShortcut): void {
    const shortcuts = appSettings.value.keyboardShortcuts[name];
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
    const shortcuts = appSettings.value.keyboardShortcuts[name];
    if (index >= 0 && index < shortcuts.length) {
      shortcuts.splice(index, 1);
      saveSettings();
    }
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
    setCardSizePreset,
    getCurrentPreset,
    setCardWidth,
    setTheme,
    setLanguage,
    setMiddleDecksLayout,
    setMouseOperations,
    addKeyboardShortcut,
    removeKeyboardShortcut,
    setSearchInputPosition,
    toggleFeature,
    resetSettings,
    applyTheme,
    applyCardSize,
  };
});
