/**
 * カード移動アニメーション
 * FLIP (First, Last, Invert, Play) 技法を使用
 */

/**
 * カード要素に移動アニメーションを適用
 * 
 * @param cardElement カード要素
 * @param duration アニメーション時間（ミリ秒）
 */
export function animateCardMove(cardElement: HTMLElement, duration: number = 300): void {
  // First: 元の位置を記録
  const first = cardElement.getBoundingClientRect();
  
  // アニメーション開始を次のフレームに遅延
  requestAnimationFrame(() => {
    // Last: 新しい位置を取得
    const last = cardElement.getBoundingClientRect();
    
    // Invert: 差分を計算
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    
    // 移動がない場合はアニメーション不要
    if (deltaX === 0 && deltaY === 0) {
      return;
    }
    
    // transformで元の位置に一瞬戻す（transitionなし）
    cardElement.style.transition = 'none';
    cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // 強制的にリフローさせる
    cardElement.getBoundingClientRect();
    
    // Play: transformを0にしてアニメーション開始
    requestAnimationFrame(() => {
      cardElement.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
      cardElement.style.transform = '';
    });
    
    // アニメーション終了後のクリーンアップ
    setTimeout(() => {
      cardElement.style.transition = '';
      cardElement.style.transform = '';
    }, duration);
  });
}

/**
 * 複数のカード要素に移動アニメーションを適用
 * 
 * @param cardElements カード要素の配列
 * @param duration アニメーション時間（ミリ秒）
 */
export function animateCardsMoveInSection(sectionElement: HTMLElement, duration: number = 300): void {
  if (!sectionElement) return;
  
  const cards = Array.from(sectionElement.querySelectorAll('.deck-card')) as HTMLElement[];
  
  // First: 全カードの元の位置を記録
  const firstPositions = new Map<HTMLElement, DOMRect>();
  cards.forEach(card => {
    firstPositions.set(card, card.getBoundingClientRect());
  });
  
  // 次のフレームで処理
  requestAnimationFrame(() => {
    // Last: 全カードの新しい位置を取得
    cards.forEach(card => {
      const first = firstPositions.get(card);
      const last = card.getBoundingClientRect();
      
      if (first && last) {
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        
        // 移動がない場合はスキップ
        if (deltaX === 0 && deltaY === 0) {
          return;
        }
        
        // Invert: transformで元の位置に戻す
        card.style.transition = 'none';
        card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      }
    });
    
    // 強制的にリフローさせる
    sectionElement.getBoundingClientRect();
    
    // Play: transformを0にしてアニメーション開始
    requestAnimationFrame(() => {
      cards.forEach(card => {
        if (card.style.transform) {
          card.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
          card.style.transform = '';
        }
      });
    });
    
    // アニメーション終了後のクリーンアップ
    setTimeout(() => {
      cards.forEach(card => {
        card.style.transition = '';
        card.style.transform = '';
      });
    }, duration);
  });
}
