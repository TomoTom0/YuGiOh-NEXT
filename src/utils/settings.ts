/**
 * 設定管理のユーティリティ関数
 */

import type { FeatureSettings, StorageSettings, FeatureId, DeckEditSettings } from '../types/settings';
import { DEFAULT_FEATURE_SETTINGS, DEFAULT_DECK_EDIT_SETTINGS } from '../types/settings';

/**
 * chrome.storage.localから機能設定を読み込む
 *
 * @returns Promise<FeatureSettings> 機能設定オブジェクト（取得失敗時はデフォルト値）
 */
export async function loadFeatureSettings(): Promise<FeatureSettings> {
  try {
    const result = await chrome.storage.local.get(['featureSettings']) as StorageSettings;

    // 設定が存在する場合は、デフォルト値とマージ
    if (result.featureSettings) {
      return {
        ...DEFAULT_FEATURE_SETTINGS,
        ...result.featureSettings,
      };
    }

    // 設定が存在しない場合はデフォルト値を返す
    return DEFAULT_FEATURE_SETTINGS;
  } catch (error) {
    console.error('Failed to load feature settings:', error);
    return DEFAULT_FEATURE_SETTINGS;
  }
}

/**
 * 特定の機能が有効かどうかを確認する
 *
 * @param featureId 確認する機能のID
 * @returns Promise<boolean> 機能が有効な場合true
 */
export async function isFeatureEnabled(featureId: FeatureId): Promise<boolean> {
  const settings = await loadFeatureSettings();
  return settings[featureId] ?? DEFAULT_FEATURE_SETTINGS[featureId];
}

/**
 * デッキ編集設定を読み込む
 *
 * @returns Promise<DeckEditSettings> デッキ編集設定オブジェクト
 */
export async function loadDeckEditSettings(): Promise<DeckEditSettings> {
  try {
    const result = await chrome.storage.local.get(['deckEditSettings']) as StorageSettings;

    if (result.deckEditSettings) {
      return {
        ...DEFAULT_DECK_EDIT_SETTINGS,
        ...result.deckEditSettings,
      };
    }

    return DEFAULT_DECK_EDIT_SETTINGS;
  } catch (error) {
    console.error('Failed to load deck edit settings:', error);
    return DEFAULT_DECK_EDIT_SETTINGS;
  }
}

/**
 * デッキ編集設定を保存する
 *
 * @param settings デッキ編集設定オブジェクト
 * @returns Promise<void>
 */
export async function saveDeckEditSettings(settings: DeckEditSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ deckEditSettings: settings });
  } catch (error) {
    console.error('Failed to save deck edit settings:', error);
    throw error;
  }
}

/**
 * 機能設定を保存する
 *
 * @param settings 機能設定オブジェクト
 * @returns Promise<void>
 */
export async function saveFeatureSettings(settings: FeatureSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ featureSettings: settings });
  } catch (error) {
    console.error('Failed to save feature settings:', error);
    throw error;
  }
}
