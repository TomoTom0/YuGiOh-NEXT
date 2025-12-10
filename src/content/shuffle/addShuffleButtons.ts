/**
 * デッキ表示ページにシャッフル関連のボタンを追加
 */

import { isDeckDisplayPage, detectCardGameType } from '../../utils/page-detector';
import { safeQuery } from '../../utils/safe-dom-query';
import { EXTENSION_IDS } from '../../utils/dom-selectors';

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
 * 指定されたデッキセクションにシャッフルボタンを追加する
 */
function addShuffleButtonsToSection(sectionId: 'main' | 'extra' | 'side'): HTMLElement | null {
  // EXTENSION_IDS から対応するボタンIDを取得
  const shuffleButtonId = EXTENSION_IDS.shuffle[`${sectionId}ShuffleButton` as const];
  const sortButtonId = EXTENSION_IDS.shuffle[`${sectionId}SortButton` as const];

  // 既にボタンが存在する場合はスキップ
  if (safeQuery(`#${shuffleButtonId}`)) {
    return null;
  }

  // #deck_image #main|extra|side.card_set を取得
  const cardSet = safeQuery<HTMLElement>(`#deck_image #${sectionId}.card_set`);
  if (!cardSet) {
    return null;
  }

  // div.subcatergory > div.top を取得
  const top = safeQuery<HTMLElement>('div.subcatergory > div.top', cardSet);
  if (!top) {
    return null;
  }

  // カード枚数のspan（nth-child(3)）を取得
  const cardCountSpan = safeQuery<HTMLElement>('span:nth-child(3)', top);
  if (!cardCountSpan) {
    return null;
  }

  // カード枚数が0の場合はボタンを追加しない
  const cardCount = parseInt(cardCountSpan.textContent || '0', 10);
  if (cardCount === 0) {
    return null;
  }

  // シャッフルボタン
  const shuffleBtn = createButton(shuffleButtonId, SHUFFLE_ICON, 'シャッフル');
  top.insertBefore(shuffleBtn, cardCountSpan);

  // ソートボタン
  const sortBtn = createButton(sortButtonId, SORT_ICON, '元に戻す');
  top.insertBefore(sortBtn, cardCountSpan);

  return shuffleBtn;
}

/**
 * シャッフルボタンを追加する（すべてのデッキセクション）
 */
export function addShuffleButtons(): HTMLElement | null {
  // メインデッキ
  const mainBtn = addShuffleButtonsToSection('main');

  // エクストラデッキ
  addShuffleButtonsToSection('extra');

  // サイドデッキ
  addShuffleButtonsToSection('side');

  return mainBtn;
}

/**
 * ボタン要素を作成（既存のbtn hexスタイルに統一）
 */
function createButton(id: string, iconSvg: string, title: string): HTMLAnchorElement {
  const button = document.createElement('a');
  button.id = id;
  button.className = 'ygo-next ytomo-neuron-btn';
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
