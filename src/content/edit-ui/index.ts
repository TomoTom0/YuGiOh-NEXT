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
import { getFromStorageLocal } from '../../utils/chrome-storage-utils';

// 編集UIが既に読み込まれているかどうかのフラグ
let isEditUILoaded = false;

// イベントリスナーが登録済みかどうかのフラグ
let isEventListenerRegistered = false;

/**
 * background でデッキ詳細をプリロード（非同期、並行実行）
 */
async function preloadDeckDetailInBackground(): Promise<void> {
  try {
    // URLから dno を抽出
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    const dno = urlParams.get('dno');

    if (!dno) {
      return; // dno がない場合はスキップ
    }

    // Chrome Storage から cgid を読み込み
    const cgid = await getFromStorageLocal('ygo-user-cgid');

    if (!cgid) {
      console.warn('[Edit UI] cgid not found in Storage, skipping preload');
      return; // cgid がない場合はスキップ
    }

    // dno のバリデーション
    const dnoNum = parseInt(dno, 10);
    if (isNaN(dnoNum)) {
      console.warn('[Edit UI] Invalid dno in URL, skipping preload:', dno);
      return;
    }

    // background へメッセージを送信（非同期、await しない）
    // デッキ詳細と デッキリストを並行プリロード
    Promise.all([
      chrome.runtime.sendMessage({
        type: 'PRELOAD_DECK_DETAIL',
        dno: dnoNum,
        cgid: cgid
      }),
      chrome.runtime.sendMessage({
        type: 'PRELOAD_DECK_LIST',
        cgid: cgid
      })
    ]).catch(err => console.warn('[Edit UI] Failed to send preload messages:', err));
  } catch (error) {
    console.warn('[Edit UI] Failed to preload deck detail:', error);
  }
}

/**
 * 現在のURLが編集用URLかどうかをチェック（後方互換性のため維持）
 * @deprecated 直接 isVueEditPage を使用してください
 */
function isEditUrl(): boolean {
  return isVueEditPage();
}

/**
 * テーマを設定ストアから読み込んで適用
 * メモリキャッシュ（ygoCurrentSettings）から即座に取得、なければ Storage から読み込み
 * FOUC 防止のため、背景色も同時に設定
 */
async function applyThemeFromSettings(): Promise<void> {
  try {
    // メモリキャッシュから即座に取得（0ms、待機なし）
    let appSettings = window.ygoCurrentSettings;

    // メモリにない場合は Storage から読み込み
    if (!appSettings) {
      const result = await callbackToPromise<any>(
        (callback) => chrome.storage.local.get(['appSettings'], callback),
        3000 // 3秒のタイムアウト
      );

      appSettings = result.appSettings || {};

      // 読み込み後、メモリキャッシュに保存
      if (appSettings) {
        window.ygoCurrentSettings = appSettings;
      }
    }

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

    // FOUC（Flash of Unstyled Content）防止：背景色を事前に設定
    const bgColor = effectiveTheme === 'dark' ? '#1a1a1a' : '#ffffff';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    // 他の可能な要素にも背景色を設定（どれが露出するかわからないため）
    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
      wrapper.style.backgroundColor = bgColor;
    }
    const bg = document.getElementById('bg');
    if (bg) {
      bg.style.backgroundColor = bgColor;
    }
  } catch (error) {
    // タイムアウトまたはエラー時は、デフォルトのテーマを使用
    console.warn('[applyThemeFromSettings] Failed to load theme settings:', error);
    document.documentElement.setAttribute('data-ygo-next-theme', 'light');
    // エラー時もデフォルト背景色を設定
    document.documentElement.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
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
  // 公式DOM前初期化: DOMContentLoadedを待たず即座に初期化
  // オーバーレイを素早く表示し、ユーザー体感速度を向上
  if (isEditUrl() && !isEditUILoaded) {
    // background でデッキ詳細をプリロード（並行実行）
    preloadDeckDetailInBackground().catch(err =>
      console.warn('[Edit UI] Preload failed:', err)
    );

    // UI を即座にロード（オーバーレイ表示）
    loadEditUI();
  }

  // hashchangeイベントを監視（一度だけ登録）
  if (!isEventListenerRegistered) {
    isEventListenerRegistered = true;

    window.addEventListener('hashchange', () => {
      if (isEditUrl()) {

        // 編集URLに遷移した場合は、毎回テーマを適用
        applyThemeFromSettings();

        // background でデッキ詳細をプリロード（並行実行）
        preloadDeckDetailInBackground();

        // UI が未読み込みの場合のみ読み込み実行
        if (!isEditUILoaded) {
          console.log('[Edit UI] Loading edit UI');
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
      #bg,
      #vue-edit-app {
        background-color: var(--bg-primary);
      }
      #bg {
        width: 100%;
        height: 100%;
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

  // FOUC防止：背景色を決定
  const bgColor2 = document.documentElement.getAttribute('data-ygo-next-theme') === 'dark' ? '#1a1a1a' : '#ffffff';

  // 全ての層に背景色を設定（インラインスタイルで優先度を確保）
  document.body.style.backgroundColor = bgColor2;
  const wrapperElement = document.getElementById('wrapper');
  if (wrapperElement) {
    wrapperElement.style.backgroundColor = bgColor2;
  }
  bgElement.style.backgroundColor = bgColor2;

  // #bg の内容をすべて削除（古いコンテンツを確実に消す）
  bgElement.innerHTML = '';

  // 新しい #vue-edit-app 要素を作成（背景色を先に設定）
  const vueEditApp = document.createElement('div');
  vueEditApp.id = 'vue-edit-app';
  vueEditApp.style.width = '100%';
  vueEditApp.style.height = '100%';
  vueEditApp.style.overflow = 'hidden';
  vueEditApp.style.backgroundColor = bgColor2;

  // #bg に追加
  bgElement.appendChild(vueEditApp);

  // Vue アプリケーションを起動
  await initVueApp();

  // Vue初期化完了後、モジュール読み込みオーバーレイを削除（FOUC防止を終了）
  // ただし、Vue描画が完全に終わるまで少し待つ
  const moduleLoadingOverlay = document.getElementById('ygo-module-loading-overlay');

  // Vue描画をトリガーさせるため、複数回requestAnimationFrameを実行
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(null);
        });
      });
    });
  });

  if (moduleLoadingOverlay) {
    // フェードアウトアニメーション
    moduleLoadingOverlay.style.opacity = '0';
    moduleLoadingOverlay.style.transition = 'opacity 300ms ease-out';

    setTimeout(() => {
      moduleLoadingOverlay.remove();
    }, 300);
  }

  // 言語切り替えボタンを差し替え（Vue初期化後）
  replaceLanguageChangeLinks();
}

/**
 * Vue アプリケーションを初期化
 */
async function initVueApp(): Promise<void> {
  try {
    // Vue/Pinia/コンポーネントを動的インポート
    const [{ createApp, nextTick }, { createPinia }, { default: DeckEditLayout }] = await Promise.all([
      import('vue'),
      import('pinia'),
      import('./DeckEditLayout.vue')
    ]);

    const app = createApp(DeckEditLayout);
    const pinia = createPinia();

    app.use(pinia);
    app.mount('#vue-edit-app');

    // Vue描画が完全に完了するまで待機
    await nextTick();
  } catch (error) {
    console.error('Failed to initialize Vue app:', error);
  }
}

// このモジュールが動的インポートされた時点で編集ページにいることが確定
// URL監視は content/index.ts 側で実施されているため、ここでは直接 watchUrlChanges() を実行
// ただし、プリフェッチ時は編集ページでない可能性があるため、isVueEditPage() で条件チェック
(async () => {
  // 編集ページでない場合はスキップ
  if (!isVueEditPage()) {
    console.log('[Edit UI] Module loaded but not on edit page, skipping initialization');
    return;
  }

  // モジュール読み込み時にテーマを設定（FOUC防止）
  // テーマをまず読み込んでから、オーバーレイを作成する
  await applyThemeFromSettings();

  // FOUC防止：テーマ読み込み後にオーバーレイを作成
  const theme = document.documentElement.getAttribute('data-ygo-next-theme') || 'light';
  const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';

  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'ygo-module-loading-overlay';
  loadingOverlay.style.position = 'fixed';
  loadingOverlay.style.top = '0';
  loadingOverlay.style.left = '0';
  loadingOverlay.style.width = '100%';
  loadingOverlay.style.height = '100%';
  loadingOverlay.style.backgroundColor = bgColor;
  loadingOverlay.style.zIndex = '999999';
  loadingOverlay.style.pointerEvents = 'none';
  document.body.appendChild(loadingOverlay);

  watchUrlChanges();
})();
