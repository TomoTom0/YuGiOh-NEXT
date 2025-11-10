/**
 * デッキ編集UI（Vue.js Prototype）のエントリーポイント
 *
 * 特定URL（#/ytomo/edit）にアクセスした際に、
 * ページ全体を書き換えてVueベースのデッキ編集UIを表示する
 */

const EDIT_URL_HASH = '#/ytomo/edit';

// 編集UIが既に読み込まれているかどうかのフラグ
let isEditUILoaded = false;

/**
 * 現在のURLが編集用URLかどうかをチェック
 */
function isEditUrl(): boolean {
  return window.location.hash === EDIT_URL_HASH;
}

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

  // hashchangeイベントを監視
  window.addEventListener('hashchange', () => {
    if (isEditUrl() && !isEditUILoaded) {
      loadEditUI();
    } else if (!isEditUrl() && isEditUILoaded) {
      // 編集URL以外に移動した場合はフラグをリセット
      isEditUILoaded = false;
    }
  });
}

/**
 * 編集用UIを読み込んで表示
 */
function loadEditUI(): void {
  if (isEditUILoaded) {
    console.log('Edit UI already loaded, skipping...');
    return;
  }

  console.log('Loading edit UI...');

  // div#bg要素を取得
  const bgElement = document.getElementById('bg');
  if (!bgElement) {
    console.error('div#bg not found, waiting...');
    // 少し待ってから再試行
    setTimeout(loadEditUI, 100);
    return;
  }

  // div#bgの内容だけを書き換え
  bgElement.innerHTML = `
    <div id="vue-edit-app"></div>
    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #bg {
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw;
        height: 100vh;
      }
      #vue-edit-app {
        width: 100%;
        height: 100%;
      }
    </style>
  `;

  // Vue アプリケーションを起動
  initVueApp();

  // フラグを設定
  isEditUILoaded = true;

  console.log('Edit UI loaded successfully');
}

/**
 * Vue アプリケーションを初期化
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import DeckEditLayout from './DeckEditLayout.vue';

async function initVueApp(): Promise<void> {
  try {
    const app = createApp(DeckEditLayout);
    const pinia = createPinia();

    app.use(pinia);
    app.mount('#vue-edit-app');

    console.log('Vue app mounted successfully');
  } catch (error) {
    console.error('Failed to initialize Vue app:', error);
  }
}

// Content Script起動時に実行
watchUrlChanges();
