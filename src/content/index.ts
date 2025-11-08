/**
 * Content Scriptのエントリーポイント
 *
 * 全ページで読み込まれ、ページの種類に応じて適切な機能を初期化する
 */

// テストページ用の処理をインポート
import './test-ui';

// デッキ画像作成ボタンの初期化
import { initDeckImageButton } from './deck-recipe';

// デッキ画像作成ボタンを初期化（デッキ表示/編集ページで動作）
initDeckImageButton();
