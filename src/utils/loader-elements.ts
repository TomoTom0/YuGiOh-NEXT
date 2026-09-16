/**
 * loader.js（先行ローダー）が生成する要素と content.js 側の連携ユーティリティ（TASK-510）
 *
 * loader.js と content.js は同一の要素ID（EXTENSION_IDS.loading）を共有するため、
 * ID一致だけでは「loader由来の要素」と「同IDの他人要素」を区別できない。
 * loaderが生成した要素には data-ygo-next-loader="1" 属性が付与されており、
 * content側の削除・takeoverはこの属性を持つ要素に限定する
 * （loader側のフェイルセーフが自要素を参照ベースで保護しているのと同様の保護）。
 *
 * 注意: public/loader.js の LOADER_ATTR 直書きとの二重管理（webpack外のため共有不能）。
 * ずれは tests/unit/content/loader-early-loading.test.ts が機械検知する。
 */

import { EXTENSION_IDS } from '@/utils/dom-selectors';

/**
 * loader/content のロード機構が生成した要素の識別属性名
 */
export const LOADER_ATTR = 'data-ygo-next-loader';

/**
 * 要素をロード機構由来（削除・takeover対象）として識別属性でマークする
 *
 * content.js が新規生成する early-hide/overlay にも付与する（hashchange経路等、
 * loaderが要素を生成していない場合でも、復帰処理で拡張由来要素を一貫して除去できる）
 */
export function markAsLoaderElement(element: HTMLElement): void {
  element.setAttribute(LOADER_ATTR, '1');
}

const hasLoaderAttr = (element: Element | null): element is Element =>
  element !== null && element.hasAttribute(LOADER_ATTR);

/**
 * ロード機構由来の early-hide/overlay を除去する（公式画面復帰）
 *
 * 識別属性を持つ要素のみ削除する。同IDだが属性を持たない他人要素は保護される
 */
export function removeLoaderDerivedElements(): void {
  const overlay = document.getElementById(EXTENSION_IDS.loading.moduleLoadingOverlay);
  if (hasLoaderAttr(overlay)) {
    overlay.remove();
  }
  const earlyHide = document.getElementById(EXTENSION_IDS.loading.earlyHideStyle);
  if (hasLoaderAttr(earlyHide)) {
    earlyHide.remove();
  }
}

/**
 * overlay テイクオーバー対象か（loader由来識別属性を持つ HTMLDivElement）
 *
 * 属性を持たない同ID要素は他人要素のため再利用（子要素の消去・再構築）せず、
 * 呼び出し側は新規生成に切り替える
 */
export const isLoaderOverlayElement = (value: Element | null): value is HTMLDivElement =>
  value instanceof HTMLDivElement && hasLoaderAttr(value);
