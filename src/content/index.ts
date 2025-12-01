/**
 * Content Scriptのエントリーポイント
 *
 * 全ページで読み込まれ、ページの種類に応じて適切な機能を初期化する
 */

// 最初に__webpack_public_path__を設定（動的インポートより前に実行される必要がある）
import './public-path';

// 共通スタイル
import './styles/buttons.css';

// 設定読み込み
import { isFeatureEnabled } from '../utils/settings';

// ページ判定
import { detectCardGameType, isDeckDisplayPage, isVueEditPage } from '../utils/page-detector';

// マッピングマネージャー
import { initializeMappingManager } from '../utils/mapping-manager';

// デッキメタデータローダー
import { getDeckMetadata } from '../utils/deck-metadata-loader';

// 禁止制限キャッシュ
import { forbiddenLimitedCache } from '../utils/forbidden-limited-cache';

/**
 * 編集UI読み込みフラグ（二重読み込み防止）
 */
let editUILoaded = false;

/**
 * 編集UIモジュールのプリフェッチ用Promise（キャッシュ）
 */
let editUIModulePromise: Promise<any> | null = null;

/**
 * 編集ページ用UIモジュールをプリフェッチ（アイドル時にバックグラウンドロード）
 */
function prefetchEditUI(): void {
  if (editUIModulePromise) return; // 既にプリフェッチ済み

  // requestIdleCallbackがサポートされていない場合はsetTimeoutで代用
  const scheduleTask = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

  scheduleTask(() => {
    console.log('[Prefetch] Starting background load of edit-ui module...');
    editUIModulePromise = import('./edit-ui');
    editUIModulePromise
      .then(() => console.log('[Prefetch] Edit UI module loaded successfully'))
      .catch(err => {
        console.warn('[Prefetch] Failed to prefetch edit-ui:', err);
        editUIModulePromise = null; // エラー時はキャッシュをクリア
      });
  });
}

/**
 * 編集ページ用UIを動的にロード
 */
async function loadEditUIIfNeeded(): Promise<void> {
  if (!isVueEditPage() || editUILoaded) return;

  editUILoaded = true;
  try {
    // プリフェッチ済みの場合はそのPromiseを使用、未実行の場合はその場でインポート
    await (editUIModulePromise || import('./edit-ui'));
    console.log('Edit UI loaded dynamically');
  } catch (error) {
    console.error('Failed to load edit UI:', error);
    editUILoaded = false;
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

    // デッキ表示ページでのみシャッフル・画像ボタン機能をロード
    const gameType = detectCardGameType();
    if (isDeckDisplayPage(gameType)) {
      // Vue Card Detail UI を初期化
      const { initDeckDisplay } = await import('./deck-display');
      await initDeckDisplay();

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

// 機能を初期化
initializeFeatures();

// 編集UIモジュールをアイドル時にプリフェッチ（ユーザーがクリックする前にロード開始）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', prefetchEditUI);
} else {
  prefetchEditUI();
}

// 編集ページ用UI読み込み（DOMContentLoaded時）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadEditUIIfNeeded);
} else {
  loadEditUIIfNeeded();
}

// 編集ページ用UI読み込み（hashchange時）
window.addEventListener('hashchange', loadEditUIIfNeeded);
