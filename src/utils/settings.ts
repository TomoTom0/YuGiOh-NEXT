/**
 * 設定管理のユーティリティ関数
 */

import type { FeatureSettings, StorageSettings, FeatureId } from '../types/settings';
import { DEFAULT_FEATURE_SETTINGS } from '../types/settings';

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
