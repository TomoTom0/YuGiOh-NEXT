/**
 * sortfix機能（カードの先頭固定）
 */

import { safeQuery, safeQueryAll } from '../../utils/safe-dom-query';
import { OFFICIAL_SITE_SELECTORS } from '../../utils/dom-selectors';
import { LOCK_CLOSED_ICON, LOCK_OPEN_ICON } from '../../utils/shuffle-icons';

/**
 * カード要素にsortfix機能を追加
 */
export function initSortfixForCards(): void {
  // main, extra, side の全セクションを処理
  const sections = ['main', 'extra', 'side'];

  sections.forEach((sectionId) => {
    const imageSet = safeQuery<HTMLElement>(`${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} #${sectionId}.card_set div.image_set`);
    if (!imageSet) {
      return;
    }

    const cardLinks = safeQueryAll<HTMLAnchorElement>(':scope > a', imageSet);
    cardLinks.forEach((cardLink) => {
      initSortfixForCard(cardLink);
    });
  });
}

/**
 * 単一カードにsortfix機能を追加
 * vueSetup.tsで追加された.ygo-next-card-controlsのtop-rightボタンを利用
 */
function initSortfixForCard(cardLink: HTMLAnchorElement): void {
  if (cardLink.hasAttribute('data-ygo-next-sortfix-initialized')) {
    return;
  }

  cardLink.setAttribute('data-ygo-next-sortfix-initialized', 'true');

  // vueSetup.tsで追加されたcard-controlsのtop-rightボタンを取得
  const controls = safeQuery<HTMLElement>('.ygo-next-card-controls', cardLink);
  if (!controls) {
    console.debug('[sortfix] card-controls not found for cardLink', cardLink);
    return;
  }

  const topRightBtn = safeQuery<HTMLButtonElement>('.top-right', controls);
  if (!topRightBtn) {
    console.debug('[sortfix] top-right button not found in card-controls', controls);
    return;
  }

  console.debug('[sortfix] Initializing sortfix for card, sortfix state:', cardLink.hasAttribute('data-ygo-next-sortfix'));

  // sortfix用のSVGアイコンを追加
  updateSortfixIcon(cardLink, topRightBtn);

  // クリックイベントを追加
  topRightBtn.addEventListener('click', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSortfix(cardLink, topRightBtn);
  });
}

/**
 * sortfixアイコンを更新
 */
function updateSortfixIcon(cardLink: HTMLElement, topRightBtn: HTMLElement): void {
  const isSortfixed = cardLink.hasAttribute('data-ygo-next-sortfix');

  if (isSortfixed) {
    // sortfix ON: 南京錠アイコン（閉じた状態）
    topRightBtn.innerHTML = LOCK_CLOSED_ICON;
    topRightBtn.classList.add('is-sortfixed');
  } else {
    // sortfix OFF: 南京錠アイコン（開いた状態）
    topRightBtn.innerHTML = LOCK_OPEN_ICON;
    topRightBtn.classList.remove('is-sortfixed');
  }
}

/**
 * sortfixのON/OFF切り替え
 */
function toggleSortfix(cardLink: HTMLElement, topRightBtn: HTMLElement): void {
  const isSortfixed = cardLink.hasAttribute('data-ygo-next-sortfix');

  if (isSortfixed) {
    // sortfix OFF
    cardLink.removeAttribute('data-ygo-next-sortfix');
  } else {
    // sortfix ON
    cardLink.setAttribute('data-ygo-next-sortfix', 'true');
  }

  // アイコンを更新
  updateSortfixIcon(cardLink, topRightBtn);
}

/**
 * sortfixされたカードを取得（全セクション）
 */
export function getSortfixedCards(): Element[] {
  const sections = ['main', 'extra', 'side'];
  const allSortfixedCards: Element[] = [];

  sections.forEach((sectionId) => {
    const imageSet = safeQuery<HTMLElement>(`${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} #${sectionId}.card_set div.image_set`);
    if (!imageSet) {
      return;
    }

    const sortfixedCards = safeQueryAll<HTMLAnchorElement>(':scope > a[data-ygo-next-sortfix]', imageSet);
    allSortfixedCards.push(...sortfixedCards);
  });

  return allSortfixedCards;
}
