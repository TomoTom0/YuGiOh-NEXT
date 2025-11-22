/**
 * デッキ表示ページにシャッフル関連のボタンを追加
 */

import { isDeckDisplayPage, detectCardGameType } from '../../utils/page-detector';

/**
 * シャッフルアイコン（ランダム/シャッフル）
 */
const SHUFFLE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 3 21 3 21 8"></polyline>
  <line x1="4" y1="20" x2="21" y2="3"></line>
  <polyline points="21 16 21 21 16 21"></polyline>
  <line x1="15" y1="15" x2="21" y2="21"></line>
  <line x1="4" y1="4" x2="9" y2="9"></line>
</svg>
`;

/**
 * ソート（ヒストグラム昇順）アイコン
 */
const SORT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="20" x2="4" y2="14"></line>
  <line x1="10" y1="20" x2="10" y2="10"></line>
  <line x1="16" y1="20" x2="16" y2="6"></line>
  <line x1="22" y1="20" x2="22" y2="2"></line>
</svg>
`;

/**
 * シャッフルボタンを追加する
 */
export function addShuffleButtons(): HTMLElement | null {
  // 既にボタンが存在する場合はスキップ
  if (document.querySelector('#ygo-shuffle-buttons')) {
    return null;
  }

  // #deck_image #main.card_set を取得
  const mainCardSet = document.querySelector('#deck_image #main.card_set');
  if (!mainCardSet) {
    return null;
  }

  // div.subcatergory > div.top を取得
  const top = mainCardSet.querySelector('div.subcatergory > div.top');
  if (!top) {
    return null;
  }

  // カード枚数のspan（nth-child(3)）を取得
  const cardCountSpan = top.querySelector('span:nth-child(3)');
  if (!cardCountSpan) {
    return null;
  }

  // シャッフルボタン
  const shuffleBtn = createButton('ygo-shuffle-btn', SHUFFLE_ICON, 'シャッフル');
  top.insertBefore(shuffleBtn, cardCountSpan);

  // ソートボタン
  const sortBtn = createButton('ygo-sort-btn', SORT_ICON, '元に戻す');
  top.insertBefore(sortBtn, cardCountSpan);

  return shuffleBtn;
}

/**
 * ボタン要素を作成（既存のbtn hexスタイルに統一）
 */
function createButton(id: string, iconSvg: string, title: string): HTMLAnchorElement {
  const button = document.createElement('a');
  button.id = id;
  button.className = 'ytomo-neuron-btn';
  button.href = '#';
  button.title = title;
  button.style.cssText = 'margin-right: 8px;';

  // アイコンを追加
  const span = document.createElement('span');
  span.innerHTML = iconSvg;

  button.appendChild(span);

  // クリック時のデフォルト動作を無効化
  button.addEventListener('click', (e) => {
    e.preventDefault();
  });

  return button;
}

/**
 * シャッフルボタンを初期化
 */
export function initShuffleButtons(): void {
  // 現在のページのゲームタイプを検出
  const gameType = detectCardGameType();
  
  // デッキ表示ページでのみ動作（ゲームタイプに対応）
  const isDeckDisplay = isDeckDisplayPage(gameType);

  if (!isDeckDisplay) {
    return;
  }

  // ページ読み込み完了後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(addShuffleButtons, 100);
    });
  } else {
    setTimeout(addShuffleButtons, 100);
  }
}
