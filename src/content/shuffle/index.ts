/**
 * シャッフル機能のエントリーポイント
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
import { initSortfixForCards } from './sortfixCards';

// 重複実行防止フラグと再試行管理
let isAttachingListeners = false;
let attachRetryCount = 0;
const MAX_ATTACH_RETRIES = 50; // 最大再試行回数（100ms * 50 = 5秒）

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
  // 重複実行を防ぐ
  if (isAttachingListeners) {
    console.debug('[Shuffle] attachEventListeners is already in progress, skipping');
    return;
  }

  // メインデッキ
  const shuffleBtnMain = document.getElementById('ygo-shuffle-btn-main');
  const sortBtnMain = document.getElementById('ygo-sort-btn-main');

  if (!shuffleBtnMain || !sortBtnMain) {
    // 最大再試行回数を超えた場合はエラーをログして終了
    if (attachRetryCount >= MAX_ATTACH_RETRIES) {
      console.error('[Shuffle] Failed to attach event listeners after', MAX_ATTACH_RETRIES, 'retries. Main shuffle buttons not found.');
      isAttachingListeners = false;
      attachRetryCount = 0;
      return;
    }

    // 再試行
    attachRetryCount++;
    isAttachingListeners = false; // 再試行前に フラグをリセット
    setTimeout(attachEventListeners, 100);
    return;
  }

  // ボタンが見つかった場合、フラグとカウンタをリセット
  isAttachingListeners = true;
  attachRetryCount = 0;

  // メインデッキのシャッフルボタン
  shuffleBtnMain.addEventListener('click', () => {
    shuffleCards();
  });

  // メインデッキのソートボタン
  sortBtnMain.addEventListener('click', () => {
    sortCards();
  });

  // エクストラデッキ
  const shuffleBtnExtra = document.getElementById('ygo-shuffle-btn-extra');
  const sortBtnExtra = document.getElementById('ygo-sort-btn-extra');

  if (shuffleBtnExtra && sortBtnExtra) {
    shuffleBtnExtra.addEventListener('click', () => {
      shuffleCardsExtra();
    });

    sortBtnExtra.addEventListener('click', () => {
      sortCardsExtra();
    });
  }

  // サイドデッキ
  const shuffleBtnSide = document.getElementById('ygo-shuffle-btn-side');
  const sortBtnSide = document.getElementById('ygo-sort-btn-side');

  if (shuffleBtnSide && sortBtnSide) {
    shuffleBtnSide.addEventListener('click', () => {
      shuffleCardsSide();
    });

    sortBtnSide.addEventListener('click', () => {
      sortCardsSide();
    });
  }

  // 完了時にフラグをリセット
  isAttachingListeners = false;
  console.debug('[Shuffle] Event listeners attached successfully');
}

// 再エクスポート
export { addShuffleButtons, initShuffleButtons, shuffleCards, sortCards };
