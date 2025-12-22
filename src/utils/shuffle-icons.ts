/**
 * Shuffle/Sort関連のアイコン定義
 *
 * この module では、shuffle/sort 機能で使用される SVG アイコンを一元管理します。
 * 複数のファイルに散在していた SVG 定義を統一して、保守性と再利用性を向上させます。
 */

/**
 * シャッフルアイコン（ランダム/シャッフル）
 * Feather アイコンの shuffle icon
 */
export const SHUFFLE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 3 21 3 21 8"></polyline>
  <line x1="4" y1="20" x2="21" y2="3"></line>
  <polyline points="21 16 21 21 16 21"></polyline>
  <line x1="15" y1="15" x2="21" y2="21"></line>
  <line x1="4" y1="4" x2="9" y2="9"></line>
</svg>
`;

/**
 * ソート（ヒストグラム昇順）アイコン
 * Feather アイコンの bar-chart-2 icon を参考に
 */
export const SORT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="20" x2="4" y2="14"></line>
  <line x1="10" y1="20" x2="10" y2="10"></line>
  <line x1="16" y1="20" x2="16" y2="6"></line>
  <line x1="22" y1="20" x2="22" y2="2"></line>
</svg>
`;

/**
 * 南京錠アイコン（閉じた状態）- sort fix ON
 */
export const LOCK_CLOSED_ICON = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
</svg>
`;

/**
 * 南京錠アイコン（開いた状態）- sort fix OFF
 */
export const LOCK_OPEN_ICON = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
  <path d="M7 11V7a5 5 0 0 1 5-5c1.5 0 2.8 0.6 3.7 1.5M17 11V8" stroke="currentColor" stroke-width="2"/>
</svg>
`;
