/**
 * 設定管理のユーティリティ関数
 */

import type { FeatureSettings, StorageSettings, FeatureId, AppSettings } from '../types/settings';
import { DEFAULT_FEATURE_SETTINGS, DEFAULT_APP_SETTINGS } from '../types/settings';

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
      const merged = {
        ...DEFAULT_FEATURE_SETTINGS,
        ...result.featureSettings,
      };
      // category 3 強制: configs/features.toml で default = "dev-only" の機能は
      // 本番ビルドでは強制OFF（stored値は無視）。category は docs/feature/featureSettings.toml で管理。
      merged.practice = DEFAULT_FEATURE_SETTINGS.practice && merged.practice;
      // genesys（category 1・UIなし）: 旧prodビルドは category 3 強制OFFの結果（genesys=false）を
      // saveSettings() で永続化していた。UIを持たないため保存値はユーザー意図ではなくビルド強制値の
      // アーティファクトであり、デフォルト値を正とする（昇格時にUIを追加した場合はこの行を削除する）。
      merged.genesys = DEFAULT_FEATURE_SETTINGS.genesys;
      return merged;
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

/**
 * アプリ設定を読み込む
 *
 * @returns Promise<AppSettings> アプリ設定オブジェクト
 */
export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.local.get(['appSettings']) as StorageSettings;
    
    if (result.appSettings) {
      return {
        ...DEFAULT_APP_SETTINGS,
        ...result.appSettings,
      };
    }
    
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error('Failed to load app settings:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * アプリ設定を保存する
 *
 * @param settings アプリ設定オブジェクト
 * @returns Promise<void>
 */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ appSettings: settings });
  } catch (error) {
    console.error('Failed to save app settings:', error);
    throw error;
  }
}
