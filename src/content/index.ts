/**
 * Content Scriptのエントリーポイント
 *
 * 全ページで読み込まれ、ページの種類に応じて適切な機能を初期化する
 */

// 最初に__webpack_public_path__を設定（動的インポートより前に実行される必要がある）
import './public-path';

// 共通スタイル
import './styles/buttons.scss';

// 設定読み込み
import { isFeatureEnabled } from '../utils/settings';

// ページ判定
import { detectCardGameType, isDeckDisplayPage, isVueEditPage } from '../utils/page-detector';

// マッピングマネージャー
import { initializeMappingManager } from '../utils/mapping-manager';

// DOMセレクタ
import { EXTENSION_IDS } from '../utils/dom-selectors';

// デッキメタデータローダー
import { getDeckMetadata } from '../utils/deck-metadata-loader';

// 禁止制限キャッシュ
import { forbiddenLimitedCache } from '../utils/forbidden-limited-cache';

// タイムアウト管理
import { withTimeout, TimeoutError } from '../utils/promise-timeout';

// Chrome Storage ユーティリティ
import { setToStorageLocal, getFromStorageLocal } from '../utils/chrome-storage-utils';

/**
 * グローバル変数拡張
 */
declare global {
  interface Window {
    ygoNextCurrentSettings?: any;
    ygoNextPreloadedDeckDetail?: any;
    ygoNextPreloadedDeckList?: any;
    ygoNextPreloadedDeckDetailPromise?: Promise<void> | null;
  }
}

/**
 * 編集UI読み込みフラグ（二重読み込み防止）
 */
let editUILoaded = false;

/**
 * 編集UIモジュールのプリフェッチ用Promise（キャッシュ）
 */
let editUIModulePromise: Promise<typeof import('./edit-ui')> | null = null;

/**
 * プリフェッチ処理中フラグ（重複実行防止）
 */
let isPrefetching = false;

/**
 * 編集ページ用UIモジュールをプリフェッチ（アイドル時にバックグラウンドロード）
 */
function prefetchEditUI(): void {
  // 既にプリフェッチ済み、または処理中の場合は早期終了
  if (editUIModulePromise || isPrefetching) return;

  // requestIdleCallbackがサポートされていない場合はsetTimeoutで代用
  const scheduleTask = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

  isPrefetching = true;
  scheduleTask(() => {
    editUIModulePromise = withTimeout(import('./edit-ui'), {
      ms: 30000, // 30秒のタイムアウト
      message: 'Edit UI module import timeout'
    })
      .catch(err => {
        console.warn('[Prefetch] Failed to prefetch edit-ui:', err);
        // エラー時はPromiseをリセット（rejectされたPromiseキャッシュを防ぐ）
        editUIModulePromise = null;
        // エラーを再throw（呼び出し元で再試行可能に）
        throw err;
      })
      .finally(() => {
        // プリフェッチ処理完了フラグをリセット
        isPrefetching = false;
      });
  });
}

/**
 * 編集ページで即座に必要なデッキデータのみを最速で取得
 * （マッピングマネージャー等は initializeFeatures() で idle 時に実行される）
 */
async function preloadEditPageData(): Promise<void> {
  // URLから dno を抽出
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(hash.split('?')[1] || '');
  const dno = urlParams.get('dno');

  if (!dno) {
    return;
  }

  const dnoNum = parseInt(dno, 10);
  if (isNaN(dnoNum)) {
    console.warn('[Preload] Invalid dno in URL:', dno);
    return;
  }

  // cgid取得
  const cgid = await getFromStorageLocal('ygo-user-cgid');

  if (!cgid) {
    console.warn('[Preload] cgid not found, skipping preload');
    return;
  }

  // getDeckDetail の Promise を公開（loadDeck で await できるようにする）
  const deckDetailPromise = (async () => {
    try {
      const { getDeckDetail } = await import('../api/deck-operations');
      const deckInfo = await getDeckDetail(dnoNum, cgid);
      window.ygoNextPreloadedDeckDetail = deckInfo;
    } catch (error) {
      console.warn('[Preload] Deck detail load failed:', error);
    }
  })();

  window.ygoNextPreloadedDeckDetailPromise = deckDetailPromise;
}

/**
 * 編集ページ用UIを動的にロード
 */
async function loadEditUIIfNeeded(): Promise<void> {
  if (!isVueEditPage() || editUILoaded) return;

  editUILoaded = true;

  // FOUC防止：オーバーレイを即座に作成（モジュールロード前に表示）
  // window.ygoNextCurrentSettings から同期的にテーマを取得（idle時にキャッシュ済み）
  const cachedSettings = (window as any).ygoNextCurrentSettings;
  let overlayTheme: 'light' | 'dark' = 'light';

  if (cachedSettings && cachedSettings.theme) {
    if (cachedSettings.theme === 'system') {
      overlayTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      overlayTheme = cachedSettings.theme;
    }
  } else {
    // キャッシュがない場合はsystemのprefers-color-schemeを使用
    overlayTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // シンプルな背景色
  const bgColor = overlayTheme === 'dark' ? '#1a1a1a' : '#ffffff';

  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = EXTENSION_IDS.loading.moduleLoadingOverlay;
  loadingOverlay.style.position = 'fixed';
  loadingOverlay.style.top = '0';
  loadingOverlay.style.left = '0';
  loadingOverlay.style.width = '100%';
  loadingOverlay.style.height = '100%';
  loadingOverlay.style.backgroundColor = bgColor;
  loadingOverlay.style.zIndex = '999999';
  loadingOverlay.style.pointerEvents = 'none';
  loadingOverlay.style.display = 'flex';
  loadingOverlay.style.flexDirection = 'column';
  loadingOverlay.style.alignItems = 'center';
  loadingOverlay.style.justifyContent = 'center';
  loadingOverlay.style.gap = '24px';

  // タイトル "YuGiOh NEXT"を追加
  const titleText = document.createElement('div');
  titleText.textContent = 'YuGiOh NEXT';
  titleText.style.fontSize = '42px';
  titleText.style.fontWeight = '600';
  titleText.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  titleText.style.color = overlayTheme === 'dark' ? '#ffffff' : '#1a1a1a';
  titleText.style.letterSpacing = '1px';

  // ローディングスピナーを追加
  const spinner = document.createElement('div');
  spinner.style.width = '48px';
  spinner.style.height = '48px';
  spinner.style.border = `3px solid ${overlayTheme === 'dark' ? '#333' : '#ddd'}`;
  spinner.style.borderTop = `3px solid ${overlayTheme === 'dark' ? '#888' : '#666'}`;
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'ygo-spin 0.8s linear infinite';

  // サブテキストを追加
  const loadingText = document.createElement('div');
  loadingText.textContent = 'NEXT Deck Edit Page';
  loadingText.style.color = overlayTheme === 'dark' ? '#888' : '#666';
  loadingText.style.fontSize = '13px';
  loadingText.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  loadingText.style.fontWeight = '400';
  loadingText.style.letterSpacing = '0.5px';

  loadingOverlay.appendChild(titleText);
  loadingOverlay.appendChild(spinner);
  loadingOverlay.appendChild(loadingText);

  // アニメーションのCSSを追加
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = `
    @keyframes ygo-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinnerStyle);

  // document.bodyがまだない場合は準備できるまで待つ
  if (document.body) {
    document.body.appendChild(loadingOverlay);
  } else {
    // bodyが準備できるまで待つ
    const observer = new MutationObserver(() => {
      if (document.body) {
        document.body.appendChild(loadingOverlay);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // preload はトップレベルで既に開始済み（二重実行防止）

  try {
    // プリフェッチ済みの場合はそのPromiseを使用、未実行の場合はその場でインポート
    const importPromise = editUIModulePromise || import('./edit-ui');
    await withTimeout(importPromise, {
      ms: 30000, // 30秒のタイムアウト
      message: 'Edit UI module load timeout'
    });
  } catch (error) {
    if (TimeoutError.isTimeoutError(error)) {
      console.error('Failed to load edit UI: Timeout', error);
    } else {
      console.error('Failed to load edit UI:', error);
    }
    editUILoaded = false;
  }
}

/**
 * アプリケーション設定をlocalStorageにキャッシュ
 * localStorageはリロード後も保持され、同期的に高速アクセス可能
 */
async function cacheSettingsGlobally(): Promise<void> {
  try {
    const appSettings = await getFromStorageLocal('appSettings');
    if (appSettings) {
      localStorage.setItem('ygo-next-settings', JSON.stringify(appSettings));
      window.ygoNextCurrentSettings = appSettings;
    }
  } catch (error) {
    console.warn('[YGO Helper] Failed to cache settings:', error);
  }
}

/**
 * cgid を DOM から抽出して Chrome Storage に保存
 */
async function cacheCgidInStorage(): Promise<void> {
  try {
    const { sessionManager } = await import('./session/session');
    const cgid = await sessionManager.getCgid();

    if (cgid) {
      await setToStorageLocal('ygo-user-cgid', cgid);
    }
  } catch (error) {
    console.warn('[YGO Helper] Failed to cache cgid:', error);
  }
}

/**
 * 機能設定に基づいて、各機能を初期化する
 */
async function initializeFeatures(): Promise<void> {
  try {
    // マッピングマネージャーを初期化（パーサーより先に実行）
    await initializeMappingManager();

    // デッキメタデータを事前ロード（パース時の遅延を防ぐ）
    getDeckMetadata().catch(err => console.warn('Failed to preload deck metadata:', err));

    // 禁止制限キャッシュを初期化（バックグラウンドで更新チェック）
    forbiddenLimitedCache.init().catch(err => console.warn('Failed to initialize forbidden/limited cache:', err));

    // アプリケーション設定をlocalStorageにキャッシュ（idle時に実行）
    // localStorageはリロード後も保持され、編集ページで同期的に読み込める
    const scheduleTask = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
    scheduleTask(() => {
      cacheSettingsGlobally().catch(err =>
        console.warn('Failed to cache settings:', err)
      );
    });

    // cgid をバックグラウンドで事前取得して Chrome Storage に保存
    cacheCgidInStorage().catch(err =>
      console.warn('Failed to cache cgid:', err)
    );

    // デッキ表示ページでのみシャッフル・画像ボタン機能をロード
    const gameType = detectCardGameType();
    if (isDeckDisplayPage(gameType)) {
      // Vue Card Detail UI を初期化
      const { initDeckDisplay } = await import('./deck-display');
      await initDeckDisplay();

      // Card Detail UI を初期化
      const { initCardDetailUI } = await import('./deck-display/card-detail-ui');
      initCardDetailUI();

      // デッキ画像作成機能の初期化（設定で有効な場合のみ）
      if (await isFeatureEnabled('deck-image')) {
        const { initDeckImageButton } = await import('./deck-recipe');
        initDeckImageButton();
      }

      // シャッフル機能の初期化（設定で有効な場合のみ）
      if (await isFeatureEnabled('shuffle-sort')) {
        const { initShuffle } = await import('./shuffle');
        initShuffle();
      }
    }
  } catch (error) {
    console.error('Failed to initialize features:', error);
  }
}

// 編集ページの場合、即座にページを隠す（FOUC防止）
if (isVueEditPage()) {
  // テーマを即座に判定（localStorageから同期的に読み込み）
  let effectiveTheme: 'light' | 'dark' = 'light';
  let cachedSettings = window.ygoNextCurrentSettings;

  // localStorageから同期的に読み込み（リロード後も保持される）
  if (!cachedSettings) {
    try {
      const settingsStr = localStorage.getItem('ygo-next-settings');
      if (settingsStr) {
        cachedSettings = JSON.parse(settingsStr);
        window.ygoNextCurrentSettings = cachedSettings;
      }
    } catch (error) {
      console.warn('[Early Settings] Failed to load from localStorage:', error);
    }
  }

  if (cachedSettings && cachedSettings.theme) {
    if (cachedSettings.theme === 'system') {
      effectiveTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = cachedSettings.theme;
    }
  } else {
    // キャッシュがない場合はsystemのprefers-color-schemeを使用
    effectiveTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const earlyBgColor = effectiveTheme === 'dark' ? '#1a1a1a' : '#ffffff';

  // 即座にページを隠すスタイルを追加
  const earlyHideStyle = document.createElement('style');
  earlyHideStyle.id = EXTENSION_IDS.loading.earlyHideStyle;
  earlyHideStyle.textContent = `
    html, body {
      background-color: ${earlyBgColor} !important;
      overflow: hidden !important;
    }
    #wrapper, #bg {
      display: none !important;
    }
  `;

  // document.headがまだない場合もあるので対応
  if (document.head) {
    document.head.appendChild(earlyHideStyle);
  } else {
    // headが準備できるまで待つ
    const observer = new MutationObserver(() => {
      if (document.head) {
        document.head.appendChild(earlyHideStyle);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 画面描画と無関係な全ての事前処理を最速で開始（Vue インポート・マウントと並行実行）
  preloadEditPageData().catch(err => {
    console.warn('[Content] Preload failed:', err);
  });

  // 即座にloadEditUIIfNeeded()を実行（DOMContentLoadedを待たない）
  loadEditUIIfNeeded();
} else {
  // 編集ページでない場合は通常の初期化
  // 編集UIモジュールをアイドル時にプリフェッチ（ユーザーがクリックする前にロード開始）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetchEditUI);
  } else {
    prefetchEditUI();
  }
}

// 機能を初期化
initializeFeatures();

// 編集ページ用UI読み込み（hashchange時）
// 注: hashchangeでデッキ編集画面が始まることは原則としてないため、preloadは実行しない
window.addEventListener('hashchange', loadEditUIIfNeeded);
