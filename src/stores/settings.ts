import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type {
  AppSettings,
  CardSize,
  Theme,
  Language,
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

  // ===== 算出プロパティ =====

  /** 現在のカードサイズ（ピクセル） */
  const cardSizePixels = computed(() => CARD_SIZE_MAP[appSettings.value.cardSize]);

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
   * カードサイズを変更
   */
  function setCardSize(size: CardSize): void {
    appSettings.value.cardSize = size;
    applyCardSize();
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
   * 機能のON/OFF切り替え
   */
  function toggleFeature(featureId: string, enabled: boolean): void {
    featureSettings.value[featureId] = enabled;
    saveSettings();
  }

  /**
   * 設定をリセット
   */
  function resetSettings(): void {
    appSettings.value = { ...DEFAULT_APP_SETTINGS };
    featureSettings.value = { ...DEFAULT_FEATURE_SETTINGS };
    applyTheme();
    applyCardSize();
    saveSettings();
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
   * カードサイズをDOMに適用
   */
  function applyCardSize(): void {
    const pixels = cardSizePixels.value;
    document.documentElement.style.setProperty('--card-width', `${pixels.width}px`);
    document.documentElement.style.setProperty('--card-height', `${pixels.height}px`);

    console.log('[Settings] Applied card size:', appSettings.value.cardSize, pixels);
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

    // 算出プロパティ
    cardSizePixels,
    effectiveTheme,
    effectiveLanguage,

    // アクション
    loadSettings,
    saveSettings,
    setCardSize,
    setTheme,
    setLanguage,
    toggleFeature,
    resetSettings,
    applyTheme,
    applyCardSize,
  };
});
