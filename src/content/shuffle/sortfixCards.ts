/**
 * sortfix機能（カードの先頭固定）
 */

import { safeQuery, safeQueryAll } from '../../utils/safe-dom-query';

/**
 * カード要素にsortfix機能を追加
 */
export function initSortfixForCards(): void {
  const imageSet = safeQuery<HTMLElement>('#deck_image #main.card_set div.image_set');
  if (!imageSet) {
    return;
  }

  const cardLinks = safeQueryAll<HTMLAnchorElement>(':scope > a', imageSet);
  cardLinks.forEach((cardLink) => {
    if (cardLink.hasAttribute('data-sortfix-initialized')) {
      return;
    }

    cardLink.setAttribute('data-sortfix-initialized', 'true');

    // カード画像要素を取得
    const img = safeQuery<HTMLImageElement>('img', cardLink);
    if (!img) {
      return;
    }

    // aタグをrelativeにしてSVGを配置できるようにする
    (cardLink as HTMLElement).style.position = 'relative';
    (cardLink as HTMLElement).style.display = 'inline-block';

    // マウスムーブイベント（ホバー時の色変更）
    cardLink.addEventListener('mousemove', (e) => {
      const imgRect = img.getBoundingClientRect();
      const x = (e as MouseEvent).clientX - imgRect.left;
      const y = (e as MouseEvent).clientY - imgRect.top;

      const isRightTop = x > imgRect.width / 2 && y < imgRect.height / 2;

      (cardLink as HTMLElement).classList.add('hover-overlay');
      if (isRightTop) {
        (cardLink as HTMLElement).classList.add('cursor-in-area');
      } else {
        (cardLink as HTMLElement).classList.remove('cursor-in-area');
      }
    });

    // マウスリーブイベント
    cardLink.addEventListener('mouseleave', () => {
      (cardLink as HTMLElement).classList.remove('hover-overlay', 'cursor-in-area');
    });

    // クリックイベントを追加
    cardLink.addEventListener('click', (e) => {
      // 画像要素の位置を基準に判定
      const imgRect = img.getBoundingClientRect();
      const x = (e as MouseEvent).clientX - imgRect.left;
      const y = (e as MouseEvent).clientY - imgRect.top;

      // 右上1/4の領域かチェック（右半分かつ上半分）
      const isRightTop = x > imgRect.width / 2 && y < imgRect.height / 2;

      if (isRightTop) {
        e.preventDefault();
        toggleSortfix(cardLink as HTMLElement);
      }
    });
  });
}

/**
 * sortfixのON/OFF切り替え
 */
function toggleSortfix(cardLink: HTMLElement): void {
  const isSortfixed = cardLink.hasAttribute('data-sortfix');

  if (isSortfixed) {
    // sortfix OFF
    cardLink.removeAttribute('data-sortfix');
  } else {
    // sortfix ON
    cardLink.setAttribute('data-sortfix', 'true');
  }
}

/**
 * sortfixされたカードを取得
 */
export function getSortfixedCards(): Element[] {
  const imageSet = safeQuery<HTMLElement>('#deck_image #main.card_set div.image_set');
  if (!imageSet) {
    return [];
  }

  const sortfixedCards = safeQueryAll<HTMLAnchorElement>(':scope > a[data-sortfix]', imageSet);
  return sortfixedCards;
}
