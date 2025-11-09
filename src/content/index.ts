/**
 * Content Scriptのエントリーポイント
 *
 * 全ページで読み込まれ、ページの種類に応じて適切な機能を初期化する
 */

// 共通スタイル
import './styles/buttons.css';

// テストページ用の処理をインポート
import './test-ui';

// デッキ画像作成ボタンの初期化
import { initDeckImageButton } from './deck-recipe';

// シャッフル機能の初期化
import { initShuffle } from './shuffle';

// デッキ画像作成ボタンを初期化（デッキ表示/編集ページで動作）
initDeckImageButton();

// シャッフル機能を初期化（デッキ表示ページで動作）
initShuffle();
