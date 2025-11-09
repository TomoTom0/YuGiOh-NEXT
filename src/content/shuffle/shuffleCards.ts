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
 * FLIPアニメーションを適用してカードを再配置
 */
function applyFlipAnimation(
  imageSet: Element,
  newOrder: Element[],
  duration: number = 400
): void {
  // 現在のカード要素を取得
  const cards = Array.from(imageSet.querySelectorAll(':scope > a')) as HTMLElement[];

  // First: シャッフル前の位置を記録
  const firstPositions = new Map<Element, DOMRect>();
  cards.forEach(card => {
    firstPositions.set(card, card.getBoundingClientRect());
  });

  // アニメーション開始
  imageSet.classList.add('animating');

  // DOM操作：新しい順序で再配置
  imageSet.innerHTML = '';
  newOrder.forEach(card => imageSet.appendChild(card));

  // Last: シャッフル後の位置を記録
  const lastPositions = new Map<Element, DOMRect>();
  newOrder.forEach(card => {
    lastPositions.set(card, card.getBoundingClientRect());
  });

  // Invert: 差分を計算して元の位置に戻す
  newOrder.forEach(card => {
    const first = firstPositions.get(card);
    const last = lastPositions.get(card);
    if (first && last) {
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;

      // transformで元の位置に一瞬戻す（transitionなし）
      (card as HTMLElement).style.transition = 'none';
      (card as HTMLElement).style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  });

  // 強制的にリフローさせる
  imageSet.getBoundingClientRect();

  // Play: transformを0にしてアニメーション開始
  requestAnimationFrame(() => {
    newOrder.forEach(card => {
      (card as HTMLElement).style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
      (card as HTMLElement).style.transform = '';
    });
  });

  // アニメーション終了後のクリーンアップ
  setTimeout(() => {
    newOrder.forEach(card => {
      (card as HTMLElement).style.transition = '';
      (card as HTMLElement).style.transform = '';
    });
    imageSet.classList.remove('animating');
  }, duration);
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

  // 新しい順序：sortfixカードを先頭、その後にシャッフルされた通常カード
  const newOrder = [...sortfixedCards, ...shuffled];

  // FLIPアニメーションを適用
  applyFlipAnimation(imageSet, newOrder);
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

  // 新しい順序：sortfixカードを先頭（元の順序）、その後に通常カード（元の順序）
  const newOrder = [...sortfixedCards, ...normalCards];

  // FLIPアニメーションを適用
  applyFlipAnimation(imageSet, newOrder);
}

