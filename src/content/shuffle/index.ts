/**
 * シャッフル機能のエントリーポイント
 */

import { addShuffleButtons, initShuffleButtons } from './addShuffleButtons';
import { shuffleCards, sortCards } from './shuffleCards';
import { initSortfixForCards } from './sortfixCards';

/**
 * シャッフル機能を初期化
 */
export function initShuffle(): void {
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
 * イベントリスナーを登録
 */
function attachEventListeners(): void {
  const shuffleBtn = document.getElementById('ygo-shuffle-btn');
  const sortBtn = document.getElementById('ygo-sort-btn');

  if (!shuffleBtn || !sortBtn) {
    setTimeout(attachEventListeners, 100);
    return;
  }

  // シャッフルボタン
  shuffleBtn.addEventListener('click', () => {
    shuffleCards();
  });

  // ソートボタン
  sortBtn.addEventListener('click', () => {
    sortCards();
  });
}

// 再エクスポート
export { addShuffleButtons, initShuffleButtons, shuffleCards, sortCards };
