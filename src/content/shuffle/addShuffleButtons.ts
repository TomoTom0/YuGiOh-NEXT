/**
 * デッキ表示ページにシャッフル関連のボタンを追加
 */

import { isDeckDisplayPage, detectCardGameType } from '../../utils/page-detector';
import { safeQuery } from '../../utils/safe-dom-query';
import { EXTENSION_IDS } from '../../utils/dom-selectors';
import { SHUFFLE_ICON, SORT_ICON } from '../../utils/shuffle-icons';

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
