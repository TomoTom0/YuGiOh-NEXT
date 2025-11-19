# v0.4.0 Phase 1 実装設計書

## 概要

Phase 1では、v0.4.0の基盤となる以下の機能を実装します：

1. **設定ストア** - グローバル設定の管理
2. **USP（URL State Parameters）** - URL経由での状態管理
3. **画像サイズ切り替え** - 4段階のカードサイズ
4. **カラーテーマ** - ダーク/ライト/システム
5. **言語切り替え** - 10言語 + auto

---

## 1. 型定義の拡張

### 1.1 設定関連の型定義（`src/types/settings.ts`の拡張）

```typescript
// 既存の型定義を拡張

/**
 * カードサイズ
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
 * 表示モード（既存）
 */
export type DisplayMode = 'list' | 'grid';

/**
 * ソート順（拡張）
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

/**
 * アプリ設定（新規）
 */
export interface AppSettings {
  /** カードサイズ */
  cardSize: CardSize;
  /** テーマ */
  theme: Theme;
  /** 言語 */
  language: Language;
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
 * chrome.storage.localに保存される設定（拡張）
 */
export interface StorageSettings {
  /** 機能のON/OFF設定 */
  featureSettings?: FeatureSettings;
  /** デッキ編集機能設定 */
  deckEditSettings?: DeckEditSettings;
  /** アプリ全体設定（新規） */
  appSettings?: AppSettings;
}

/**
 * デフォルトのアプリ設定
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  cardSize: 'medium',
  theme: 'system',
  language: 'auto',
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
```

---

## 2. 設定ストアの設計

### 2.1 ストア構造（`src/stores/settings.ts` - 新規作成）

```typescript
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
  }

  /**
   * カードサイズをDOMに適用
   */
  function applyCardSize(): void {
    const pixels = cardSizePixels.value;
    document.documentElement.style.setProperty('--card-width', `${pixels.width}px`);
    document.documentElement.style.setProperty('--card-height', `${pixels.height}px`);
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
    // src/utils/language-detector.ts の detectLanguage を使用
    // または、ここで簡易実装
    return 'ja'; // 仮実装
  }

  /**
   * テーマカラーを取得
   */
  function getThemeColors(theme: 'light' | 'dark'): Record<string, string> {
    // src/styles/themes.ts から読み込み（後述）
    return {};
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
```

---

## 3. USP（URL State Parameters）の設計

### 3.1 URLパラメータ仕様

#### パラメータ一覧

| パラメータ | 型 | 説明 | 例 |
|-----------|---|------|---|
| `dno` | number | デッキ番号（既存） | `8` |
| `mode` | DisplayMode | 表示モード | `list`, `grid` |
| `sort` | SortOrder | ソート順 | `official`, `level-asc` |
| `tab` | ActiveTab | アクティブタブ | `search`, `card`, `deck` |
| `ctab` | CardTab | カード詳細タブ | `info`, `qa`, `related`, `products` |
| `detail` | boolean | 詳細表示 | `1` (true), `0` (false) |
| `size` | CardSize | カードサイズ | `small`, `medium`, `large`, `xlarge` |
| `theme` | Theme | テーマ | `light`, `dark`, `system` |
| `lang` | Language | 言語 | `ja`, `en`, `auto` |

#### URL例

```
https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=8&mode=grid&sort=level-asc&tab=card&ctab=qa&size=large&theme=dark&lang=en
```

### 3.2 USP管理の実装（`src/utils/url-state.ts` - 新規作成）

```typescript
import type {
  DisplayMode,
  SortOrder,
  ActiveTab,
  CardTab,
  CardSize,
  Theme,
  Language,
  DeckEditUIState
} from '../types/settings';

/**
 * URLパラメータのエンコード/デコード管理
 */
export class URLStateManager {
  /**
   * 現在のURLパラメータを取得
   */
  static getParams(): URLSearchParams {
    // ハッシュルーティングを考慮
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) {
      return new URLSearchParams();
    }
    return new URLSearchParams(hash.substring(queryStart + 1));
  }

  /**
   * URLパラメータを更新（履歴に追加せず置き換え）
   */
  static setParams(params: Record<string, string | number | boolean>): void {
    const urlParams = this.getParams();

    // パラメータを更新
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        urlParams.delete(key);
      } else {
        urlParams.set(key, String(value));
      }
    });

    // URLを更新
    const hash = window.location.hash;
    const hashBase = hash.split('?')[0];
    const newHash = urlParams.toString()
      ? `${hashBase}?${urlParams.toString()}`
      : hashBase;

    window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
  }

  /**
   * UI状態をURLに同期
   */
  static syncUIStateToURL(state: Partial<DeckEditUIState>): void {
    const params: Record<string, string> = {};

    if (state.viewMode) params.mode = state.viewMode;
    if (state.sortOrder) params.sort = state.sortOrder;
    if (state.activeTab) params.tab = state.activeTab;
    if (state.cardTab) params.ctab = state.cardTab;
    if (state.showDetail !== undefined) params.detail = state.showDetail ? '1' : '0';

    this.setParams(params);
  }

  /**
   * URLからUI状態を復元
   */
  static restoreUIStateFromURL(): Partial<DeckEditUIState> {
    const params = this.getParams();
    const state: Partial<DeckEditUIState> = {};

    const mode = params.get('mode');
    if (mode === 'list' || mode === 'grid') {
      state.viewMode = mode;
    }

    const sort = params.get('sort');
    if (sort) {
      state.sortOrder = sort as SortOrder;
    }

    const tab = params.get('tab');
    if (tab === 'search' || tab === 'card' || tab === 'deck') {
      state.activeTab = tab;
    }

    const ctab = params.get('ctab');
    if (ctab === 'info' || ctab === 'qa' || ctab === 'related' || ctab === 'products') {
      state.cardTab = ctab;
    }

    const detail = params.get('detail');
    if (detail !== null) {
      state.showDetail = detail === '1';
    }

    return state;
  }

  /**
   * 設定をURLに同期
   */
  static syncSettingsToURL(size?: CardSize, theme?: Theme, lang?: Language): void {
    const params: Record<string, string> = {};

    if (size) params.size = size;
    if (theme) params.theme = theme;
    if (lang) params.lang = lang;

    this.setParams(params);
  }

  /**
   * URLから設定を復元
   */
  static restoreSettingsFromURL(): {
    size?: CardSize;
    theme?: Theme;
    lang?: Language;
  } {
    const params = this.getParams();
    const settings: { size?: CardSize; theme?: Theme; lang?: Language } = {};

    const size = params.get('size');
    if (size === 'small' || size === 'medium' || size === 'large' || size === 'xlarge') {
      settings.size = size;
    }

    const theme = params.get('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      settings.theme = theme;
    }

    const lang = params.get('lang');
    if (lang) {
      settings.lang = lang as Language;
    }

    return settings;
  }
}
```

### 3.3 deck-editストアへの統合

`src/stores/deck-edit.ts` に以下を追加：

```typescript
import { URLStateManager } from '../utils/url-state';
import { useSettingsStore } from './settings';

// 既存のref定義の後に追加
const settingsStore = useSettingsStore();

// watch で状態変更を監視してURLに反映
watch([viewMode, sortOrder, activeTab, cardTab, showDetail], () => {
  URLStateManager.syncUIStateToURL({
    viewMode: viewMode.value,
    sortOrder: sortOrder.value,
    activeTab: activeTab.value,
    cardTab: cardTab.value,
    showDetail: showDetail.value,
  });
});

// initializeOnPageLoad 内でURL復元を追加
async function initializeOnPageLoad() {
  try {
    // URLからUI状態を復元
    const uiState = URLStateManager.restoreUIStateFromURL();
    if (uiState.viewMode) viewMode.value = uiState.viewMode;
    if (uiState.sortOrder) sortOrder.value = uiState.sortOrder;
    if (uiState.activeTab) activeTab.value = uiState.activeTab;
    if (uiState.cardTab) cardTab.value = uiState.cardTab;
    if (uiState.showDetail !== undefined) showDetail.value = uiState.showDetail;

    // URLから設定を復元（優先度高）
    const urlSettings = URLStateManager.restoreSettingsFromURL();
    if (urlSettings.size) settingsStore.setCardSize(urlSettings.size);
    if (urlSettings.theme) settingsStore.setTheme(urlSettings.theme);
    if (urlSettings.lang) settingsStore.setLanguage(urlSettings.lang);

    // 既存のdnoロード処理
    // ...
  } catch (error) {
    console.error('Failed to initialize deck on page load:', error);
  }
}
```

---

## 4. テーマシステムの設計

### 4.1 テーマ定義（`src/styles/themes.ts` - 新規作成）

```typescript
/**
 * テーマカラーの定義
 */

export interface ThemeColors {
  // 背景色
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-tertiary': string;

  // テキスト色
  '--text-primary': string;
  '--text-secondary': string;
  '--text-tertiary': string;

  // ボーダー色
  '--border-primary': string;
  '--border-secondary': string;

  // アクセントカラー（既存のグラデーション維持）
  '--theme-gradient': string;
  '--theme-color-start': string;
  '--theme-color-end': string;

  // 状態色
  '--color-success': string;
  '--color-warning': string;
  '--color-error': string;
  '--color-info': string;

  // カード関連
  '--card-bg': string;
  '--card-border': string;
  '--card-hover-bg': string;

  // ボタン
  '--button-bg': string;
  '--button-hover-bg': string;
  '--button-text': string;

  // 入力欄
  '--input-bg': string;
  '--input-border': string;
  '--input-text': string;
}

/**
 * ライトテーマ
 */
export const LIGHT_THEME: ThemeColors = {
  // 背景色
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f5f5f5',
  '--bg-tertiary': '#e0e0e0',

  // テキスト色
  '--text-primary': '#333333',
  '--text-secondary': '#666666',
  '--text-tertiary': '#999999',

  // ボーダー色
  '--border-primary': '#ddd',
  '--border-secondary': '#e0e0e0',

  // アクセントカラー
  '--theme-gradient': 'linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%)',
  '--theme-color-start': '#00d9b8',
  '--theme-color-end': '#b84fc9',

  // 状態色
  '--color-success': '#4caf50',
  '--color-warning': '#ff9800',
  '--color-error': '#f44336',
  '--color-info': '#2196f3',

  // カード関連
  '--card-bg': '#ffffff',
  '--card-border': '#ddd',
  '--card-hover-bg': '#f5f5f5',

  // ボタン
  '--button-bg': '#4a9eff',
  '--button-hover-bg': '#3a8eef',
  '--button-text': '#ffffff',

  // 入力欄
  '--input-bg': '#ffffff',
  '--input-border': '#ddd',
  '--input-text': '#333',
};

/**
 * ダークテーマ
 */
export const DARK_THEME: ThemeColors = {
  // 背景色
  '--bg-primary': '#1a1a1a',
  '--bg-secondary': '#2a2a2a',
  '--bg-tertiary': '#3a3a3a',

  // テキスト色
  '--text-primary': '#e0e0e0',
  '--text-secondary': '#b0b0b0',
  '--text-tertiary': '#808080',

  // ボーダー色
  '--border-primary': '#444',
  '--border-secondary': '#555',

  // アクセントカラー（ライトテーマと同じ）
  '--theme-gradient': 'linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%)',
  '--theme-color-start': '#00d9b8',
  '--theme-color-end': '#b84fc9',

  // 状態色
  '--color-success': '#66bb6a',
  '--color-warning': '#ffa726',
  '--color-error': '#ef5350',
  '--color-info': '#42a5f5',

  // カード関連
  '--card-bg': '#2a2a2a',
  '--card-border': '#444',
  '--card-hover-bg': '#3a3a3a',

  // ボタン
  '--button-bg': '#4a9eff',
  '--button-hover-bg': '#3a8eef',
  '--button-text': '#ffffff',

  // 入力欄
  '--input-bg': '#2a2a2a',
  '--input-border': '#444',
  '--input-text': '#e0e0e0',
};

/**
 * テーマを取得
 */
export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}
```

### 4.2 テーマ適用のグローバルCSS（`src/styles/themes.css` - 新規作成）

```css
/**
 * テーマCSS変数
 * data-theme属性でテーマを切り替え
 */

/* デフォルト（ライトテーマ） */
:root {
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e0e0e0;

  /* テキスト色 */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #999999;

  /* ボーダー色 */
  --border-primary: #ddd;
  --border-secondary: #e0e0e0;

  /* アクセントカラー */
  --theme-gradient: linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%);
  --theme-color-start: #00d9b8;
  --theme-color-end: #b84fc9;

  /* 状態色 */
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #2196f3;

  /* カード関連 */
  --card-bg: #ffffff;
  --card-border: #ddd;
  --card-hover-bg: #f5f5f5;

  /* ボタン */
  --button-bg: #4a9eff;
  --button-hover-bg: #3a8eef;
  --button-text: #ffffff;

  /* 入力欄 */
  --input-bg: #ffffff;
  --input-border: #ddd;
  --input-text: #333;

  /* カードサイズ（デフォルトmedium） */
  --card-width: 60px;
  --card-height: 88px;
}

/* ダークテーマ */
[data-theme="dark"] {
  /* 背景色 */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #3a3a3a;

  /* テキスト色 */
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;

  /* ボーダー色 */
  --border-primary: #444;
  --border-secondary: #555;

  /* カード関連 */
  --card-bg: #2a2a2a;
  --card-border: #444;
  --card-hover-bg: #3a3a3a;

  /* 入力欄 */
  --input-bg: #2a2a2a;
  --input-border: #444;
  --input-text: #e0e0e0;

  /* 状態色（ダーク用に微調整） */
  --color-success: #66bb6a;
  --color-warning: #ffa726;
  --color-error: #ef5350;
  --color-info: #42a5f5;
}
```

---

## 5. カードサイズシステムの設計

### 5.1 カードサイズCSS（`src/styles/card-sizes.css` - 新規作成）

```css
/**
 * カードサイズ定義
 * CSS変数でサイズを管理
 */

/* カードサイズ変数（デフォルトはmedium） */
:root {
  --card-width: 60px;
  --card-height: 88px;
}

/* カード画像の基本スタイル */
.card-item {
  width: var(--card-width);
  height: var(--card-height);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  position: relative;
  transition: all 0.2s;
}

.card-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* グリッド表示時の調整 */
.grid-view .card-item {
  /* グリッド時も同じサイズを使用 */
  width: var(--card-width);
  height: var(--card-height);
}

/* リスト表示時の調整 */
.list-view .card-item {
  /* リスト時も同じサイズを使用 */
  width: var(--card-width);
  height: var(--card-height);
}
```

### 5.2 コンポーネント修正方針

各Vueコンポーネントで固定サイズを削除し、CSS変数を使用：

**修正対象ファイル:**
- `src/components/DeckCard.vue`
- `src/components/CardList.vue`
- `src/components/CardInfo.vue`

**修正例（DeckCard.vue）:**

```vue
<style scoped>
.card-item {
  /* 固定サイズを削除 */
  /* width: 36px;  <- 削除 */
  /* height: 53px; <- 削除 */

  /* CSS変数を使用 */
  width: var(--card-width);
  height: var(--card-height);
  border: 1px solid var(--border-primary);
  border-radius: 2px;
  position: relative;
}
</style>
```

---

## 6. 言語切り替えの設計

### 6.1 API修正方針

全APIリクエストに`request_locale`パラメータを統一的に付与：

**修正対象ファイル:**
- `src/api/deck-operations.ts`
- `src/api/deck-parser.ts`
- `src/api/card-search.ts`
- `src/api/card-faq.ts`

**実装方法:**

```typescript
// src/utils/api-helper.ts（新規作成）

import { useSettingsStore } from '../stores/settings';

/**
 * APIリクエストURLに言語パラメータを追加
 */
export function addLocaleParam(url: string): string {
  const settingsStore = useSettingsStore();
  const locale = settingsStore.effectiveLanguage;

  if (locale === 'ja') {
    // 日本語はデフォルトなので省略可能
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}request_locale=${locale}`;
}

/**
 * fetch のラッパー（自動的にlocaleを付与）
 */
export async function fetchWithLocale(url: string, options?: RequestInit): Promise<Response> {
  const urlWithLocale = addLocaleParam(url);
  return fetch(urlWithLocale, options);
}
```

**使用例:**

```typescript
// 修正前
const response = await fetch(`https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${cid}`);

// 修正後
const response = await fetchWithLocale(`https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${cid}`);
```

---

## 7. オプション画面の拡張

### 7.1 新しいタブ構造

`src/options/App.vue` に "Settings" タブを追加：

```vue
<template>
  <div class="options-container">
    <header class="header">
      <h1>遊戯王NEXT - 設定</h1>
    </header>

    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'settings' }]" @click="activeTab = 'settings'">
        Settings
      </button>
      <button :class="['tab', { active: activeTab === 'omit' }]" @click="activeTab = 'omit'">
        Features & Usage
      </button>
    </div>

    <div class="tab-content">
      <!-- Settings Tab（新規） -->
      <div v-if="activeTab === 'settings'" class="settings-tab">
        <SettingsPanel />
      </div>

      <!-- Omit and Usage Tab（既存） -->
      <div v-if="activeTab === 'omit'" class="omit-tab">
        <!-- 既存の内容 -->
      </div>
    </div>
  </div>
</template>
```

### 7.2 設定パネルコンポーネント（`src/options/SettingsPanel.vue` - 新規作成）

```vue
<template>
  <div class="settings-panel">
    <h2 class="section-title">アプリ設定</h2>

    <!-- カードサイズ -->
    <div class="setting-item">
      <h3>カードサイズ</h3>
      <div class="setting-control">
        <label v-for="size in cardSizes" :key="size.value">
          <input
            type="radio"
            :value="size.value"
            v-model="currentCardSize"
            @change="onCardSizeChange"
          />
          <span>{{ size.label }}</span>
          <span class="size-info">({{ size.width }}×{{ size.height }}px)</span>
        </label>
      </div>
    </div>

    <!-- テーマ -->
    <div class="setting-item">
      <h3>テーマ</h3>
      <div class="setting-control">
        <label v-for="theme in themes" :key="theme.value">
          <input
            type="radio"
            :value="theme.value"
            v-model="currentTheme"
            @change="onThemeChange"
          />
          <span>{{ theme.label }}</span>
        </label>
      </div>
    </div>

    <!-- 言語 -->
    <div class="setting-item">
      <h3>言語</h3>
      <div class="setting-control">
        <select v-model="currentLanguage" @change="onLanguageChange">
          <option v-for="lang in languages" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
        <p class="help-text">
          言語を変更すると、ページがリロードされます。
        </p>
      </div>
    </div>

    <!-- リセットボタン -->
    <div class="setting-actions">
      <button class="reset-button" @click="resetSettings">
        設定をリセット
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { CARD_SIZE_MAP } from '../types/settings';

const settingsStore = useSettingsStore();

const currentCardSize = ref(settingsStore.appSettings.cardSize);
const currentTheme = ref(settingsStore.appSettings.theme);
const currentLanguage = ref(settingsStore.appSettings.language);

const cardSizes = [
  { value: 'small', label: 'Small', width: 36, height: 53 },
  { value: 'medium', label: 'Medium', width: 60, height: 88 },
  { value: 'large', label: 'Large', width: 90, height: 132 },
  { value: 'xlarge', label: 'X-Large', width: 120, height: 176 },
];

const themes = [
  { value: 'light', label: 'Light（ライト）' },
  { value: 'dark', label: 'Dark（ダーク）' },
  { value: 'system', label: 'System（システム設定に従う）' },
];

const languages = [
  { value: 'auto', label: 'Auto（自動検出）' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한글' },
  { value: 'ae', label: 'English(Asia)' },
  { value: 'cn', label: '簡体字' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Portugues' },
];

function onCardSizeChange() {
  settingsStore.setCardSize(currentCardSize.value);
}

function onThemeChange() {
  settingsStore.setTheme(currentTheme.value);
}

function onLanguageChange() {
  settingsStore.setLanguage(currentLanguage.value);
  // 言語変更後はリロードが必要
  if (confirm('言語を変更しました。ページをリロードしますか？')) {
    window.location.reload();
  }
}

function resetSettings() {
  if (confirm('設定を初期値にリセットしますか？')) {
    settingsStore.resetSettings();
    currentCardSize.value = settingsStore.appSettings.cardSize;
    currentTheme.value = settingsStore.appSettings.theme;
    currentLanguage.value = settingsStore.appSettings.language;
  }
}

onMounted(async () => {
  await settingsStore.loadSettings();
  currentCardSize.value = settingsStore.appSettings.cardSize;
  currentTheme.value = settingsStore.appSettings.theme;
  currentLanguage.value = settingsStore.appSettings.language;
});
</script>
```

---

## 8. 実装順序

### Phase 1: 基盤（Week 1）

1. ✅ **型定義の拡張**（`src/types/settings.ts`）
2. ✅ **テーマ定義**（`src/styles/themes.ts`, `themes.css`）
3. ✅ **設定ストア**（`src/stores/settings.ts`）
4. ✅ **URL State Manager**（`src/utils/url-state.ts`）

### Phase 2: UI統合（Week 2）

5. **カードサイズシステム**（CSS変数 + コンポーネント修正）
6. **テーマシステム統合**（全コンポーネント対応）
7. **オプション画面拡張**（`SettingsPanel.vue`）
8. **deck-editストアへのUSP統合**

### Phase 3: API統合（Week 3）

9. **APIヘルパー**（`src/utils/api-helper.ts`）
10. **全API修正**（locale パラメータ付与）
11. **言語切り替えテスト**

### Phase 4: テスト・ドキュメント（Week 4）

12. **ユニットテスト**
13. **E2Eテスト**
14. **ドキュメント更新**

---

## 9. テスト計画

### 9.1 ユニットテスト

- 設定ストアのテスト
- URL State Managerのテスト
- テーマカラー取得のテスト

### 9.2 E2Eテスト

```javascript
// tmp/browser/e2e-v0.4.0-phase1.js

// テストシナリオ:
// 1. 設定ストアの読み込み
// 2. カードサイズ変更
// 3. テーマ変更
// 4. 言語変更
// 5. URLパラメータからの復元
// 6. 設定の永続化確認
```

---

## 10. マイグレーション計画

### 既存コードへの影響

1. **deck-edit.ts**: USP統合のみ（破壊的変更なし）
2. **コンポーネント**: CSS変数への移行（段階的に実施可能）
3. **API**: locale パラメータ追加（後方互換性あり）

### 段階的リリース

- **v0.4.0-alpha**: Phase 1完了時
- **v0.4.0-beta**: Phase 2-3完了時
- **v0.4.0**: 全テスト完了時

---

## まとめ

この設計により、以下が達成されます：

✅ **設定の一元管理** - 設定ストアで全設定を管理
✅ **URL経由の状態管理** - 画面状態の完全な再現性
✅ **柔軟なテーマシステム** - ダーク/ライト/システムテーマ
✅ **カードサイズの動的変更** - CSS変数による統一的な管理
✅ **多言語対応の強化** - 10言語 + auto検出
✅ **後方互換性** - 既存コードへの影響を最小化
✅ **拡張性** - 将来の機能追加が容易

次のステップ: この設計に基づいて実装を開始します。
