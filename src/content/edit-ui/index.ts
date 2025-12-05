/**
 * デッキ編集UI（Vue.js Prototype）のエントリーポイント
 *
 * 特定URL（#/ytomo/edit）にアクセスした際に、
 * ページ全体を書き換えてVueベースのデッキ編集UIを表示する
 */

// FOUC防止: デフォルトテーマを即座に適用
// 注: テーマはwatchUrlChanges()の前にapplyThemeFromSettings()で適用するため、
// ここではハードコードされた'light'を設定しない

import { isVueEditPage } from '../../utils/page-detector';
import { callbackToPromise } from '../../utils/promise-timeout';

// 編集UIが既に読み込まれているかどうかのフラグ
let isEditUILoaded = false;

// イベントリスナーが登録済みかどうかのフラグ
let isEventListenerRegistered = false;

/**
 * 現在のURLが編集用URLかどうかをチェック（後方互換性のため維持）
 * @deprecated 直接 isVueEditPage を使用してください
 */
function isEditUrl(): boolean {
  return isVueEditPage();
}

/**
 * テーマを設定ストアから読み込んで適用
 */
async function applyThemeFromSettings(): Promise<void> {
  try {
    const result = await callbackToPromise<any>(
      (callback) => chrome.storage.local.get(['appSettings'], callback),
      3000 // 3秒のタイムアウト
    );

    const appSettings = result.appSettings || {};
    const theme = appSettings.theme ?? 'system';

    let effectiveTheme: 'light' | 'dark' = 'light';

    if (theme === 'system') {
      // システム設定を確認
      if (typeof window !== 'undefined' && window.matchMedia) {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } else {
      effectiveTheme = (theme as any) ?? 'light';
    }

    document.documentElement.setAttribute('data-ygo-next-theme', effectiveTheme);
  } catch (error) {
    // タイムアウトまたはエラー時は、デフォルトのテーマを使用
    console.warn('[applyThemeFromSettings] Failed to load theme settings:', error);
    document.documentElement.setAttribute('data-ygo-next-theme', 'light');
  }
}

/**
 * 言語を変更（ページ遷移）
 * Vue側でオーバーライド可能な実装
 */
function performLanguageChange(lang: string): void {
  const hash = location.hash;
  let search = location.search.replace(/[?&]request_locale=[^&]*/, '');

  let newSearch = `?request_locale=${lang}`;
  if (search.substring(1).length > 0) {
    newSearch += `&${search.substring(1)}`;
  }

  const newUrl = location.pathname + newSearch + hash;
  location.href = newUrl;
}

/**
 * 言語切り替えボタンを差し替え（window.ygoChangeLanguage をコール）
 */
function replaceLanguageChangeLinks(): void {
  // 言語リンクのhref属性を空のjavascriptに置き換え
  document.querySelectorAll('a[href*="javascript:ChangeLanguage"]').forEach((link) => {
    const href = link.getAttribute('href');
    const match = href?.match(/ChangeLanguage\('(\w+)'\)/);
    if (match) {
      const lang = match[1];
      link.setAttribute('href', 'javascript:void(0)');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        // window.ygoChangeLanguage は Vue側でオーバーライド可能
        (window as any).ygoChangeLanguage?.(lang);
      });
    }
  });
}

// window.ygoChangeLanguage のデフォルト実装
(window as any).ygoChangeLanguage = performLanguageChange;

/**
 * URLの変更を監視
 */
function watchUrlChanges(): void {
  // DOMが読み込まれてから実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isEditUrl() && !isEditUILoaded) {
        loadEditUI();
      }
    });
  } else {
    // すでに読み込まれている場合
    if (isEditUrl() && !isEditUILoaded) {
      loadEditUI();
    }
  }

  // hashchangeイベントを監視（一度だけ登録）
  if (!isEventListenerRegistered) {
    isEventListenerRegistered = true;

    window.addEventListener('hashchange', () => {
      if (isEditUrl()) {
        // 編集URLに遷移した場合は、毎回テーマを適用
        applyThemeFromSettings();

        // UI が未読み込みの場合のみ読み込み実行
        if (!isEditUILoaded) {
          loadEditUI();
        }
      } else if (!isEditUrl() && isEditUILoaded) {
        // 編集URL以外に移動した場合はフラグをリセット
        isEditUILoaded = false;
      }
    });
  }
}

/**
 * 編集用UIを読み込んで表示
 */
async function loadEditUI(): Promise<void> {
  if (isEditUILoaded) {
    return;
  }

  // フラグを先に設定（二重実行防止）
  isEditUILoaded = true;

  // テーマを設定ストアから読み込んで適用
  await applyThemeFromSettings();

  // div#bg要素を取得
  const bgElement = document.getElementById('bg');
  if (!bgElement) {
    console.error('div#bg not found');
    isEditUILoaded = false;
    return;
  }

  // ヘッダーの高さを計算してCSS変数に設定
  const headerElement = document.querySelector('header') || document.querySelector('#header');
  let headerHeight = 0;
  if (headerElement) {
    headerHeight = headerElement.offsetHeight;
  }
  document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);

  // テーマカラーのCSS変数は設定ストアが適用するため、ここでは不要
  // （設定ストアは deck-edit ストアの initializeOnPageLoad で初期化される）

  // スタイルを追加
  const styleId = 'ygo-edit-ui-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        height: 100%;
      }
      body {
        display: flex;
        flex-direction: column;
      }
      #wrapper {
        flex: 1;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #vue-edit-app {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .menu_btn_pagetop {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // div#bgの内容を完全に置き換え
  bgElement.innerHTML = '<div id="vue-edit-app"></div>';

  // Vue アプリケーションを起動
  await initVueApp();

  // 言語切り替えボタンを差し替え（Vue初期化後）
  replaceLanguageChangeLinks();
}

/**
 * Vue アプリケーションを初期化
 */
async function initVueApp(): Promise<void> {
  try {
    // Vue/Pinia/コンポーネントを動的インポート
    const [{ createApp }, { createPinia }, { default: DeckEditLayout }] = await Promise.all([
      import('vue'),
      import('pinia'),
      import('./DeckEditLayout.vue')
    ]);

    const app = createApp(DeckEditLayout);
    const pinia = createPinia();

    app.use(pinia);
    app.mount('#vue-edit-app');
  } catch (error) {
    console.error('Failed to initialize Vue app:', error);
  }
}

// このモジュールが動的インポートされた時点で編集ページにいることが確定
// URL監視は content/index.ts 側で実施されているため、ここでは直接 watchUrlChanges() を実行
(async () => {
  // モジュール読み込み時にテーマを設定（FOUC防止）
  await applyThemeFromSettings();
  watchUrlChanges();
})();
