/**
 * テーマカラーの定義
 */

export interface ThemeColors {
  // 背景色
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-tertiary': string;

  // テキスト色
  '--text-primary': string;
  '--text-secondary': string;
  '--text-tertiary': string;

  // ボーダー色
  '--border-primary': string;
  '--border-secondary': string;

  // アクセントカラー（既存のグラデーション維持）
  '--theme-gradient': string;
  '--theme-color-start': string;
  '--theme-color-end': string;

  // 状態色
  '--color-success': string;
  '--color-warning': string;
  '--color-error': string;
  '--color-info': string;

  // カード関連
  '--card-bg': string;
  '--card-border': string;
  '--card-hover-bg': string;

  // ボタン
  '--button-bg': string;
  '--button-hover-bg': string;
  '--button-text': string;

  // 入力欄
  '--input-bg': string;
  '--input-border': string;
  '--input-text': string;
}

/**
 * ライトテーマ
 */
export const LIGHT_THEME: ThemeColors = {
  // 背景色
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f5f5f5',
  '--bg-tertiary': '#e0e0e0',

  // テキスト色
  '--text-primary': '#333333',
  '--text-secondary': '#666666',
  '--text-tertiary': '#999999',

  // ボーダー色
  '--border-primary': '#ddd',
  '--border-secondary': '#e0e0e0',

  // アクセントカラー
  '--theme-gradient': 'linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%)',
  '--theme-color-start': '#00d9b8',
  '--theme-color-end': '#b84fc9',

  // 状態色
  '--color-success': '#4caf50',
  '--color-warning': '#ff9800',
  '--color-error': '#f44336',
  '--color-info': '#2196f3',

  // カード関連
  '--card-bg': '#ffffff',
  '--card-border': '#ddd',
  '--card-hover-bg': '#f5f5f5',

  // ボタン
  '--button-bg': '#4a9eff',
  '--button-hover-bg': '#3a8eef',
  '--button-text': '#ffffff',

  // 入力欄
  '--input-bg': '#ffffff',
  '--input-border': '#ddd',
  '--input-text': '#333',
};

/**
 * ダークテーマ
 */
export const DARK_THEME: ThemeColors = {
  // 背景色
  '--bg-primary': '#1a1a1a',
  '--bg-secondary': '#2a2a2a',
  '--bg-tertiary': '#3a3a3a',

  // テキスト色
  '--text-primary': '#e0e0e0',
  '--text-secondary': '#b0b0b0',
  '--text-tertiary': '#808080',

  // ボーダー色
  '--border-primary': '#444',
  '--border-secondary': '#555',

  // アクセントカラー（ライトテーマと同じ）
  '--theme-gradient': 'linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%)',
  '--theme-color-start': '#00d9b8',
  '--theme-color-end': '#b84fc9',

  // 状態色
  '--color-success': '#66bb6a',
  '--color-warning': '#ffa726',
  '--color-error': '#ef5350',
  '--color-info': '#42a5f5',

  // カード関連
  '--card-bg': '#2a2a2a',
  '--card-border': '#444',
  '--card-hover-bg': '#3a3a3a',

  // ボタン
  '--button-bg': '#4a9eff',
  '--button-hover-bg': '#3a8eef',
  '--button-text': '#ffffff',

  // 入力欄
  '--input-bg': '#2a2a2a',
  '--input-border': '#444',
  '--input-text': '#e0e0e0',
};

/**
 * テーマを取得
 */
export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}
