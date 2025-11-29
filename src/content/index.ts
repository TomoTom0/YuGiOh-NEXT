/**
 * Content Scriptのエントリーポイント
 *
 * 全ページで読み込まれ、ページの種類に応じて適切な機能を初期化する
 */

// 共通スタイル
import './styles/buttons.css';
import '../styles/themes.scss';

// デッキ編集ページ用の処理をインポート
import './edit-ui';

// 設定読み込み
import { isFeatureEnabled } from '../utils/settings';

// ページ判定
import { detectCardGameType, isDeckDisplayPage } from '../utils/page-detector';

// マッピングマネージャー
import { initializeMappingManager } from '../utils/mapping-manager';

// デッキメタデータローダー
import { getDeckMetadata } from '../utils/deck-metadata-loader';

/**
 * 機能設定に基づいて、各機能を初期化する
 */
async function initializeFeatures(): Promise<void> {
  try {
    // マッピングマネージャーを初期化（パーサーより先に実行）
    await initializeMappingManager();
    
    // デッキメタデータを事前ロード（パース時の遅延を防ぐ）
    getDeckMetadata().catch(err => console.warn('Failed to preload deck metadata:', err));

    // デッキ表示ページでのみシャッフル・画像ボタン機能をロード
    const gameType = detectCardGameType();
    if (isDeckDisplayPage(gameType)) {
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
