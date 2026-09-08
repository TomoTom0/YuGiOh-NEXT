/**
 * Shuffle/Sort関連のアイコン定義
 *
 * この module では、shuffle/sort 機能で使用される SVG アイコンを一元管理します。
 * 複数のファイルに散在していた SVG 定義を統一して、保守性と再利用性を向上させます。
 */

/**
 * シャッフルアイコン。
 * デッキ編集画面(DeckSection.vue)と同じ mdiShuffle（@mdi/js）に揃える（TASK-450）。
 */
export const SHUFFLE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
  <path fill="currentColor" d="M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,7.46L20,9.5V4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z"></path>
</svg>
`;

/**
 * ソート（元に戻す）アイコン。
 * デッキ編集画面(DeckSection.vue)と同じ mdiSort（@mdi/js）に揃える（TASK-450）。
 */
export const SORT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
  <path fill="currentColor" d="M18 21L14 17H17V7H14L18 3L22 7H19V17H22M2 19V17H12V19M2 13V11H9V13M2 7V5H6V7H2Z"></path>
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
