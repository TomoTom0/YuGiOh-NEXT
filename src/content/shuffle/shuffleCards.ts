/**
 * カードをシャッフルする機能
 */

import { getSortfixedCards } from './sortfixCards';

/**
 * 元の順序を保存する変数
 */
let originalOrder: Element[] | null = null;

/**
 * Fisher-Yatesアルゴリズムで配列をシャッフル
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

/**
 * メインデッキのカードをシャッフルする
 */
export function shuffleCards(): void {
  const imageSet = document.querySelector('#deck_image #main.card_set div.image_set');
  if (!imageSet) {
    return;
  }

  // 元の順序を保存（初回のみ）
  if (originalOrder === null) {
    originalOrder = Array.from(imageSet.querySelectorAll(':scope > a'));
  }

  // 現在のカード要素を取得
  const cardElements = Array.from(imageSet.querySelectorAll(':scope > a'));

  // sortfixカードと通常カードに分離
  const sortfixedCards = getSortfixedCards();
  const normalCards = cardElements.filter(card => !sortfixedCards.includes(card));

  // 通常カードのみシャッフル
  const shuffled = fisherYatesShuffle(normalCards);

  // アニメーション開始
  imageSet.classList.add('animating');

  // 再配置：sortfixカードを先頭、その後にシャッフルされた通常カード
  imageSet.innerHTML = '';
  sortfixedCards.forEach(card => imageSet.appendChild(card));
  shuffled.forEach(card => imageSet.appendChild(card));

  // アニメーション終了
  setTimeout(() => {
    imageSet.classList.remove('animating');
  }, 400);
}

/**
 * メインデッキのカードを元の順序に戻す
 */
export function sortCards(): void {
  const imageSet = document.querySelector('#deck_image #main.card_set div.image_set');
  if (!imageSet) {
    return;
  }

  if (originalOrder === null) {
    return;
  }

  // sortfixカードと通常カードに分離
  const sortfixedCards = getSortfixedCards();
  const normalCards = originalOrder.filter(card => !sortfixedCards.includes(card));

  // アニメーション開始
  imageSet.classList.add('animating');

  // 再配置：sortfixカードを先頭（元の順序）、その後に通常カード（元の順序）
  imageSet.innerHTML = '';
  sortfixedCards.forEach(card => imageSet.appendChild(card));
  normalCards.forEach(card => imageSet.appendChild(card));

  // アニメーション終了
  setTimeout(() => {
    imageSet.classList.remove('animating');
  }, 400);
}

