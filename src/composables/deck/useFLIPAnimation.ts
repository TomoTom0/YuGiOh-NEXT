/**
 * FLIP（First, Last, Invert, Play）アニメーション用のComposable
 *
 * カードの移動・追加・削除時のスムーズなアニメーションを実現するため、
 * FLIPテクニックを使用してDOM要素の位置変化をアニメーション化する。
 *
 * @see https://aerotwist.com/blog/flip-your-animations/
 */

import { useDeckEditStore } from '@/stores/deck-edit';

/**
 * 全セクションのカード要素の位置情報をUUIDごとに記録する
 *
 * @returns UUIDをキーとした位置情報（DOMRect）のMap
 *
 * @example
 * ```typescript
 * // カード操作前に位置を記録
 * const firstPositions = recordAllCardPositionsByUUID();
 *
 * // カード操作を実行（状態変更）
 * addCard(card, 'main');
 *
 * // DOM更新後にアニメーションを適用
 * await nextTick();
 * animateCardMoveByUUID(firstPositions, new Set(['main']));
 * ```
 */
export function recordAllCardPositionsByUUID(): Map<string, DOMRect> {
  const positions = new Map<string, DOMRect>();
  const sections: Array<'main' | 'extra' | 'side' | 'trash'> = ['main', 'extra', 'side', 'trash'];

  sections.forEach(section => {
    const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
    if (!sectionElement) return;

    const cards = sectionElement.querySelectorAll('.deck-card');
    cards.forEach((card) => {
      const uuid = (card as HTMLElement).getAttribute('data-uuid');
      if (uuid) {
        positions.set(uuid, card.getBoundingClientRect());
      }
    });
  });

  return positions;
}

/**
 * カード要素の位置変化をFLIPアニメーションで表現する
 *
 * @param firstPositions - 操作前の位置情報（recordAllCardPositionsByUUIDで取得）
 * @param affectedSections - アニメーション対象のセクション（'main' | 'extra' | 'side' | 'trash'）
 *
 * @remarks
 * - 移動距離に応じてアニメーション時間を自動調整（300ms〜600ms）
 * - 1px未満の移動は誤差として無視
 * - 横方向の移動を視覚的に強調（係数1.5倍）
 *
 * @example
 * ```typescript
 * const firstPositions = recordAllCardPositionsByUUID();
 * removeCard(cardId, 'main');
 * await nextTick();
 * animateCardMoveByUUID(firstPositions, new Set(['main']));
 * ```
 */
export function animateCardMoveByUUID(firstPositions: Map<string, DOMRect>, affectedSections: Set<string>) {
  // デッキロード中はアニメーションをスキップ
  const deckStore = useDeckEditStore();
  if (deckStore.isLoadingDeck) {
    return;
  }

  const allCards: Array<{ element: HTMLElement; distance: number }> = [];

  affectedSections.forEach(section => {
    const sectionElement = document.querySelector(`.${section}-deck .card-grid`);
    if (!sectionElement) return;

    const cards = sectionElement.querySelectorAll('.deck-card');

    cards.forEach((card) => {
      const cardElement = card as HTMLElement;
      const uuid = cardElement.getAttribute('data-uuid');
      if (!uuid) return;

      const first = firstPositions.get(uuid);
      const last = cardElement.getBoundingClientRect();

      if (first && last) {
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;

        // 1ピクセル未満の移動は誤差として無視
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

        // 移動距離を計算（横方向の移動を重視）
        // 横方向は視覚的に目立ちにくいため、係数を大きくする
        const weightedDeltaX = deltaX * 1.5;
        const distance = Math.sqrt(weightedDeltaX * weightedDeltaX + deltaY * deltaY);

        cardElement.style.transition = 'none';
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        cardElement.style.zIndex = '1000';
        allCards.push({ element: cardElement, distance });
      }
    });
  });

  if (allCards.length === 0) return;

  document.body.getBoundingClientRect();

  requestAnimationFrame(() => {
    allCards.forEach(({ element, distance }) => {
      // 移動距離に応じてアニメーション時間を調整（平方根で非線形）
      // シャッフル/ソートと統一するため、基本を300msに設定
      // 最小300ms、最大600ms
      const baseDuration = 300;
      const maxDuration = 600;
      const distanceFactor = Math.sqrt(distance) * 12; // 調整係数
      const duration = Math.min(maxDuration, baseDuration + distanceFactor);

      element.style.transition = `transform ${duration}ms ease`;
      element.style.transform = '';
    });
  });

  // 最大のdurationを取得してタイムアウトに使用
  const maxDuration = Math.max(...allCards.map(({ distance }) => {
    const baseDuration = 300;
    const maxDuration = 600;
    const distanceFactor = Math.sqrt(distance) * 12;
    return Math.min(maxDuration, baseDuration + distanceFactor);
  }));

  setTimeout(() => {
    allCards.forEach(({ element }) => {
      element.style.transition = '';
      element.style.transform = '';
      element.style.zIndex = '';
    });
  }, maxDuration);
}
