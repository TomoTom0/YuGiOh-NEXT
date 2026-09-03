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

  // カード枚数のspanを取得。top内の最後の子要素が常にカード枚数span
  // （shuffle/sortボタンはこのspanの直前に挿入されるため、他の拡張機能UIが
  // カード枚数spanより前に挿入されても位置がずれない。nth-child(3)は他要素の
  // 挿入で容易にずれるため使用しない: 参照 TASK-450）
  const cardCountSpan = top.lastElementChild as HTMLElement | null;
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
 * ボタン要素を作成。
 * デッキ編集画面(DeckSection.vue .btn-section)と同じ見た目（ニュートラルな枠線ボタン）に揃える。
 * 旧来の .ytomo-neuron-btn（グラデーション）は編集画面のデザインと一致しないため使わない（TASK-450）。
 */
function createButton(id: string, iconSvg: string, title: string): HTMLAnchorElement {
  const button = document.createElement('a');
  button.id = id;
  button.className = 'ygo-next ygo-next-shuffle-sort-btn';
  button.href = '#';
  button.title = title;
  button.style.cssText = 'margin-right: 4px;';

  // アイコンを追加。<span>で包まずaに直接innerHTMLで設定する:
  // サイト側CSS ".subcatergory .top span:not(.icon)"（カード枚数バッジ用の紺背景+枠線+margin）が
  // このボタンは #main .subcatergory .top 配下にあるため、無関係なspan要素にも波及し、
  // 背景の大部分が隠れてしまう（TASK-450で発覚）。spanを使わなければ影響を受けない。
  button.innerHTML = iconSvg;

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
