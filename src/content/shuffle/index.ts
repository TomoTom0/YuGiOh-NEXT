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
    console.debug('[Shuffle] Already initialized, skipping');
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
 * イベントリスナーを登録
 *
 * 重複登録を防ぐため、registeredListeners Set で追跡する。
 * 再試行ロジックを簡潔にし、無限ループの可能性を排除。
 */
function attachEventListeners(retryCount: number = 0): void {
  // メインデッキ
  const shuffleBtnMain = document.getElementById('ygo-shuffle-btn-main');
  const sortBtnMain = document.getElementById('ygo-sort-btn-main');

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

  // メインデッキのシャッフルボタン（重複登録防止）
  if (!registeredListeners.has('ygo-shuffle-btn-main')) {
    shuffleBtnMain.addEventListener('click', () => {
      shuffleCards();
    });
    registeredListeners.add('ygo-shuffle-btn-main');
  }

  // メインデッキのソートボタン（重複登録防止）
  if (!registeredListeners.has('ygo-sort-btn-main')) {
    sortBtnMain.addEventListener('click', () => {
      sortCards();
    });
    registeredListeners.add('ygo-sort-btn-main');
  }

  // エクストラデッキ
  const shuffleBtnExtra = document.getElementById('ygo-shuffle-btn-extra');
  const sortBtnExtra = document.getElementById('ygo-sort-btn-extra');

  if (shuffleBtnExtra && !registeredListeners.has('ygo-shuffle-btn-extra')) {
    shuffleBtnExtra.addEventListener('click', () => {
      shuffleCardsExtra();
    });
    registeredListeners.add('ygo-shuffle-btn-extra');
  }

  if (sortBtnExtra && !registeredListeners.has('ygo-sort-btn-extra')) {
    sortBtnExtra.addEventListener('click', () => {
      sortCardsExtra();
    });
    registeredListeners.add('ygo-sort-btn-extra');
  }

  // サイドデッキ
  const shuffleBtnSide = document.getElementById('ygo-shuffle-btn-side');
  const sortBtnSide = document.getElementById('ygo-sort-btn-side');

  if (shuffleBtnSide && !registeredListeners.has('ygo-shuffle-btn-side')) {
    shuffleBtnSide.addEventListener('click', () => {
      shuffleCardsSide();
    });
    registeredListeners.add('ygo-shuffle-btn-side');
  }

  if (sortBtnSide && !registeredListeners.has('ygo-sort-btn-side')) {
    sortBtnSide.addEventListener('click', () => {
      sortCardsSide();
    });
    registeredListeners.add('ygo-sort-btn-side');
  }

  console.debug('[Shuffle] Event listeners attached successfully');
}

// 再エクスポート
export { addShuffleButtons, initShuffleButtons, shuffleCards, sortCards };
