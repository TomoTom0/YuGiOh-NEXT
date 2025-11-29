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

// デッキ画像作成ボタンの初期化
import { initDeckImageButton } from './deck-recipe';

// シャッフル機能の初期化
import { initShuffle } from './shuffle';

// 設定読み込み
import { isFeatureEnabled } from '../utils/settings';

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

    // デッキ画像作成機能の初期化（設定で有効な場合のみ）
    if (await isFeatureEnabled('deck-image')) {
      initDeckImageButton();
    }

    // シャッフル機能の初期化（設定で有効な場合のみ）
    if (await isFeatureEnabled('shuffle-sort')) {
      initShuffle();
    }
  } catch (error) {
    console.error('Failed to initialize features:', error);
  }
}

// 機能を初期化
initializeFeatures();
