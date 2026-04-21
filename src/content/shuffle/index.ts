/**
 * シャッフル機能のエントリーポイント
 *
 * 重複初期化防止とリスナー管理を強化し、メモリリークと無限ループを防止
 */

import { addShuffleButtons, initShuffleButtons } from './addShuffleButtons';
import {
  shuffleCards,
  sortCards,
  shuffleCardsExtra,
  sortCardsExtra,
  shuffleCardsSide,
  sortCardsSide
} from './shuffleCards';
import { EXTENSION_IDS } from '../../utils/dom-selectors';
import { initSortfixForCards } from './sortfixCards';

// 初期化済みフラグ（重複初期化防止）
let isShuffleInitialized = false;

// リスナー管理：各ボタンに対して一度だけリスナーを登録するための追跡
const registeredListeners = new Set<string>();

const MAX_ATTACH_RETRIES = 50;
const RETRY_INTERVAL = 100; // 100ms

/**
 * シャッフル機能を初期化（複数回呼び出しは無視）
 *
 * 重複初期化を防ぐため、2回目以降の呼び出しはスキップする。
 * このため、vueSetup.ts と index.ts の両方から呼び出されても問題ない。
 */
export function initShuffle(): void {
  // 既に初期化済みの場合はスキップ
  if (isShuffleInitialized) {
    return;
  }

  isShuffleInitialized = true;

  // ボタンを追加
  initShuffleButtons();

  // イベントリスナーを登録（DOMContentLoaded後）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachEventListeners();
      setTimeout(initSortfixForCards, 200);
    });
  } else {
    setTimeout(attachEventListeners, 150);
    setTimeout(initSortfixForCards, 200);
  }
}

/**
 * ボタンにイベントリスナーを登録（重複登録防止付き）
 *
 * @param buttonId - ボタンのID
 * @param handler - クリック時のハンドラー関数
 */
function attachButtonListener(buttonId: string, handler: () => void): boolean {
  // 既に登録済みの場合はスキップ
  if (registeredListeners.has(buttonId)) {
    return false;
  }

  const button = document.getElementById(buttonId);
  if (!button) {
    return false;
  }

  button.addEventListener('click', handler);
  registeredListeners.add(buttonId);
  return true;
}

/**
 * イベントリスナーを登録
 *
 * 重複登録を防ぐため、registeredListeners Set で追跡する。
 * 再試行ロジックを簡潔にし、無限ループの可能性を排除。
 */
function attachEventListeners(retryCount: number = 0): void {
  // メインデッキのボタン確認
  const shuffleBtnMain = document.getElementById(EXTENSION_IDS.shuffle.mainShuffleButton);
  const sortBtnMain = document.getElementById(EXTENSION_IDS.shuffle.mainSortButton);

  if (!shuffleBtnMain || !sortBtnMain) {
    // 最大再試行回数を超えた場合はエラーをログして終了
    if (retryCount >= MAX_ATTACH_RETRIES) {
      console.error('[Shuffle] Failed to attach event listeners after', MAX_ATTACH_RETRIES, 'retries. Main shuffle buttons not found.');
      return;
    }

    // 再試行（retryCountを引数で渡して状態を保持）
    setTimeout(() => attachEventListeners(retryCount + 1), RETRY_INTERVAL);
    return;
  }

  // メインデッキ
  attachButtonListener(EXTENSION_IDS.shuffle.mainShuffleButton, shuffleCards);
  attachButtonListener(EXTENSION_IDS.shuffle.mainSortButton, sortCards);

  // エクストラデッキ
  attachButtonListener(EXTENSION_IDS.shuffle.extraShuffleButton, shuffleCardsExtra);
  attachButtonListener(EXTENSION_IDS.shuffle.extraSortButton, sortCardsExtra);

  // サイドデッキ
  attachButtonListener(EXTENSION_IDS.shuffle.sideShuffleButton, shuffleCardsSide);
  attachButtonListener(EXTENSION_IDS.shuffle.sideSortButton, sortCardsSide);
}

// 再エクスポート
export { addShuffleButtons, initShuffleButtons, shuffleCards, sortCards };
