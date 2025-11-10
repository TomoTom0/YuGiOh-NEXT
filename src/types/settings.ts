/**
 * 機能の有効/無効設定の型定義
 */

export type FeatureId = 'shuffle-sort' | 'deck-image';

export interface FeatureSettings {
  [key: string]: boolean;
  'shuffle-sort': boolean;
  'deck-image': boolean;
}

/**
 * chrome.storage.localに保存される設定オブジェクト
 */
export interface StorageSettings {
  featureSettings?: FeatureSettings;
}

/**
 * デフォルトの機能設定（全て有効）
 */
export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  'shuffle-sort': true,
  'deck-image': true,
};
