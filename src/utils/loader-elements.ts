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

// getElementById は文書順最初の要素のみを返すため、同IDの他人要素（識別属性なし）が
// 先在する場合に拡張由来要素を捕捉できない。識別属性をセレクタに含めて除外する
// （ID値は英小文字とハイフンのみのためCSSセレクタにそのまま埋め込める）
const loaderOverlaySelector = `#${EXTENSION_IDS.loading.moduleLoadingOverlay}[${LOADER_ATTR}]`;
const loaderEarlyHideSelector = `#${EXTENSION_IDS.loading.earlyHideStyle}[${LOADER_ATTR}]`;

/**
 * 拡張のロード機構由来の overlay 要素を取得する（他人要素はスキップ）
 */
export function findLoaderOverlay(): HTMLDivElement | null {
  const found = document.querySelector(loaderOverlaySelector);
  return found instanceof HTMLDivElement ? found : null;
}

/**
 * 拡張のロード機構由来の early-hide style 要素を取得する（他人要素はスキップ）
 */
export function findLoaderEarlyHide(): HTMLStyleElement | null {
  const found = document.querySelector(loaderEarlyHideSelector);
  return found instanceof HTMLStyleElement ? found : null;
}

/**
 * ロード機構由来の early-hide/overlay を除去する（公式画面復帰）
 *
 * 識別属性を持つ要素のみ削除する。同IDだが属性を持たない他人要素は保護される。
 * 他人要素との同ID重複時（新規生成で拡張要素が2つ目として存在し得る）の取りこぼしを
 * 防ぐため、単一参照でなく識別属性セレクタで全件取得して削除する
 */
export function removeLoaderDerivedElements(): void {
  document.querySelectorAll(loaderOverlaySelector).forEach(element => element.remove());
  document.querySelectorAll(loaderEarlyHideSelector).forEach(element => element.remove());
}
