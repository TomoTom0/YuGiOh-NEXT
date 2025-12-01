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
  // メインデッキ
  const shuffleBtnMain = document.getElementById('ygo-shuffle-btn-main');
  const sortBtnMain = document.getElementById('ygo-sort-btn-main');

  if (!shuffleBtnMain || !sortBtnMain) {
    setTimeout(attachEventListeners, 100);
    return;
  }

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
}

// 再エクスポート
export { addShuffleButtons, initShuffleButtons, shuffleCards, sortCards };
