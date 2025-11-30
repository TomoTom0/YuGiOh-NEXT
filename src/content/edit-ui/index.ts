/**
 * デッキ編集UI（Vue.js Prototype）のエントリーポイント
 *
 * 特定URL（#/ytomo/edit）にアクセスした際に、
 * ページ全体を書き換えてVueベースのデッキ編集UIを表示する
 */

// FOUC防止: デフォルトテーマを即座に適用
document.documentElement.setAttribute('data-theme', 'light');

import { isVueEditPage } from '../../utils/page-detector';

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
 * URLの変更を監視
 */
function watchUrlChanges(): void {
  console.log('watchUrlChanges called');
  
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
    console.log('Registering hashchange listener');
    isEventListenerRegistered = true;
    
    window.addEventListener('hashchange', () => {
      console.log('hashchange event fired, hash =', window.location.hash);
      if (isEditUrl() && !isEditUILoaded) {
        loadEditUI();
      } else if (!isEditUrl() && isEditUILoaded) {
        // 編集URL以外に移動した場合はフラグをリセット
        console.log('Resetting isEditUILoaded flag');
        isEditUILoaded = false;
      }
    });
  }
}

/**
 * 編集用UIを読み込んで表示
 */
function loadEditUI(): void {
  console.log('loadEditUI called, isEditUILoaded =', isEditUILoaded);
  
  if (isEditUILoaded) {
    console.log('Edit UI already loaded, skipping...');
    return;
  }

  // フラグを先に設定（二重実行防止）
  isEditUILoaded = true;
  console.log('Set isEditUILoaded = true');

  console.log('Loading edit UI...');

  // div#bg要素を取得
  const bgElement = document.getElementById('bg');
  if (!bgElement) {
    console.error('div#bg not found');
    isEditUILoaded = false;
    return;
  }

  console.log('Found #bg, replacing content...');

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

  console.log('Content replaced, initializing Vue app...');

  // Vue アプリケーションを起動
  initVueApp();

  console.log('Edit UI loaded successfully');
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

    console.log('Vue app mounted successfully');
  } catch (error) {
    console.error('Failed to initialize Vue app:', error);
  }
}

// このモジュールが動的インポートされた時点で編集ページにいることが確定
// URL監視は content/index.ts 側で実施されているため、ここでは直接 watchUrlChanges() を実行
watchUrlChanges();
