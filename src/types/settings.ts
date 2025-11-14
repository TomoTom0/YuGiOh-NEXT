/**
 * 機能の有効/無効設定の型定義
 */

export type FeatureId = 'shuffle-sort' | 'deck-image' | 'deck-edit';

export interface FeatureSettings {
  [key: string]: boolean;
  'shuffle-sort': boolean;
  'deck-image': boolean;
  'deck-edit': boolean;
}

/**
 * デッキ編集機能の設定
 */
export type DisplayMode = 'list' | 'grid';
export type SortOrder = 'official' | 'level' | 'atk' | 'def';
export type Language = 'auto' | 'ja' | 'en';

export interface DeckEditSettings {
  enabled: boolean;
  defaultDisplayMode: DisplayMode;
  defaultSortOrder: SortOrder;
  enableAnimation: boolean;
  language: Language;
}

/**
 * chrome.storage.localに保存される設定オブジェクト
 */
export interface StorageSettings {
  featureSettings?: FeatureSettings;
  deckEditSettings?: DeckEditSettings;
}

/**
 * デフォルトの機能設定（全て有効）
 */
export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  'shuffle-sort': true,
  'deck-image': true,
  'deck-edit': true,
};

/**
 * デフォルトのデッキ編集設定
 */
export const DEFAULT_DECK_EDIT_SETTINGS: DeckEditSettings = {
  enabled: true,
  defaultDisplayMode: 'list',
  defaultSortOrder: 'official',
  enableAnimation: true,
  language: 'auto',
};
