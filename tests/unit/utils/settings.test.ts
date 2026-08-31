import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFeatureSettings,
  isFeatureEnabled,
  saveFeatureSettings,
  loadAppSettings,
  saveAppSettings,
} from '@/utils/settings';
import {
  DEFAULT_FEATURE_SETTINGS,
  DEFAULT_APP_SETTINGS,
} from '@/types/settings';
import type { FeatureSettings, AppSettings } from '@/types/settings';

// chrome.storage.local のモック
const mockChromeStorage = {
  get: vi.fn(),
  set: vi.fn(),
};

global.chrome = {
  storage: {
    local: mockChromeStorage,
  },
} as any;

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChromeStorage.get.mockResolvedValue({});
    mockChromeStorage.set.mockResolvedValue(undefined);
  });

  describe('loadFeatureSettings', () => {
    // 注: このテストは src/types/settings.ts の FeatureId に存在しない
    // 'enableAllFeatures'/'enableCardSearchFeature' というキーを使っている（tests/design/settings/conditions.toml参照）。
    // FeatureSettingsの`[key: string]: boolean` index signatureにより型エラーにはならず、
    // マージ処理自体（load_feature_settings.merge_with_stored）は実際に検証できているため
    // covers タグを付けて残す。実FeatureIdでの検証は下の補完テストで行う。
    it('[covers:load_feature_settings.merge_with_stored] 保存された設定を読み込める', async () => {
      const savedSettings: Partial<FeatureSettings> = {
        enableAllFeatures: false,
        enableCardSearchFeature: true,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: savedSettings });

      const result = await loadFeatureSettings();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['featureSettings']);
      expect(result.enableAllFeatures).toBe(false);
      expect(result.enableCardSearchFeature).toBe(true);
    });

    it('[covers:load_feature_settings.merge_with_stored] 実FeatureIdの保存値のみが上書きされ、未指定キーはDEFAULT値を保持する', async () => {
      mockChromeStorage.get.mockResolvedValue({
        featureSettings: { 'shuffle-sort': false, chat: true },
      });

      const result = await loadFeatureSettings();

      expect(result['shuffle-sort']).toBe(false);
      expect(result['chat']).toBe(true);
      expect(result['deck-image']).toBe(DEFAULT_FEATURE_SETTINGS['deck-image']);
      expect(result['deck-edit']).toBe(DEFAULT_FEATURE_SETTINGS['deck-edit']);
    });

    it('[covers:load_feature_settings.no_stored_returns_default] 設定が存在しない場合はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await loadFeatureSettings();

      expect(result).toEqual(DEFAULT_FEATURE_SETTINGS);
    });

    it('[covers:load_feature_settings.merge_with_stored] 部分的な設定はデフォルト値とマージされる', async () => {
      const partialSettings: Partial<FeatureSettings> = {
        enableCardSearchFeature: false,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: partialSettings });

      const result = await loadFeatureSettings();

      expect(result.enableCardSearchFeature).toBe(false);
      expect(result.enableAllFeatures).toBe(DEFAULT_FEATURE_SETTINGS.enableAllFeatures);
    });

    it('[covers:load_feature_settings.storage_get_throws_returns_default] 読み込み失敗時はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadFeatureSettings();

      expect(result).toEqual(DEFAULT_FEATURE_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load feature settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    // category3（practice）の本番強制OFFロジック（src/utils/settings.ts L25）。
    // vitest実行環境ではimport.meta.env.DEVが常にtrueのため、DEFAULT_FEATURE_SETTINGS.practice
    // も常にtrueになり通常のテストでは「本番ビルドでのDEFAULT=false」を再現できない。
    // '@/types/settings' をvi.doMockで差し替え、DEFAULT側をfalseにして検証する。
    // genesysはcategory 1（常時有効）に移行したため強制OFF対象外で、別テストで
    // 保存値が保持されることを検証する。
    describe('category3強制OFF（本番ビルド相当のシミュレーション）', () => {
      afterEach(() => {
        vi.doUnmock('@/types/settings');
        vi.resetModules();
      });

      it('[covers:load_feature_settings.category3_force_off_practice] DEFAULT.practiceがfalseの場合、保存値がtrueでも強制的にfalseになる', async () => {
        vi.doMock('@/types/settings', async (importOriginal) => {
          const original = await importOriginal<typeof import('@/types/settings')>();
          return {
            ...original,
            DEFAULT_FEATURE_SETTINGS: {
              ...original.DEFAULT_FEATURE_SETTINGS,
              practice: false,
            },
          };
        });
        vi.resetModules();
        mockChromeStorage.get.mockResolvedValue({
          featureSettings: { practice: true },
        });

        const { loadFeatureSettings: loadFeatureSettingsMocked } = await import('@/utils/settings');
        const result = await loadFeatureSettingsMocked();

        expect(result.practice).toBe(false);
      });

      it('[covers:load_feature_settings.genesys_keeps_stored_value] genesys（category 1）は強制OFF対象外のため、DEFAULTがfalseでも保存値が保持される', async () => {
        vi.doMock('@/types/settings', async (importOriginal) => {
          const original = await importOriginal<typeof import('@/types/settings')>();
          return {
            ...original,
            DEFAULT_FEATURE_SETTINGS: {
              ...original.DEFAULT_FEATURE_SETTINGS,
              genesys: false,
            },
          };
        });
        vi.resetModules();
        mockChromeStorage.get.mockResolvedValue({
          featureSettings: { genesys: true },
        });

        const { loadFeatureSettings: loadFeatureSettingsMocked } = await import('@/utils/settings');
        const result = await loadFeatureSettingsMocked();

        expect(result.genesys).toBe(true);
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('[covers:is_feature_enabled.returns_defined_value] 特定の機能が有効かどうかを確認できる', async () => {
      const settings: Partial<FeatureSettings> = {
        enableCardSearchFeature: true,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: settings });

      const result = await isFeatureEnabled('enableCardSearchFeature');

      expect(result).toBe(true);
    });

    it('[covers:is_feature_enabled.returns_defined_value] 機能が無効の場合はfalseを返す', async () => {
      const settings: Partial<FeatureSettings> = {
        enableCardSearchFeature: false,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: settings });

      const result = await isFeatureEnabled('enableCardSearchFeature');

      expect(result).toBe(false);
    });

    it("[covers:is_feature_enabled.returns_defined_value] 実FeatureId('shuffle-sort')でも有効/無効を確認できる", async () => {
      mockChromeStorage.get.mockResolvedValue({
        featureSettings: { 'shuffle-sort': false },
      });

      const result = await isFeatureEnabled('shuffle-sort');

      expect(result).toBe(false);
    });

    it('[covers:load_feature_settings.no_stored_returns_default] 設定が存在しない場合はデフォルト値を使用する', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await isFeatureEnabled('enableAllFeatures');

      expect(result).toBe(DEFAULT_FEATURE_SETTINGS.enableAllFeatures);
    });

    it('[covers:is_feature_enabled.fallback_to_default_when_undefined] settings[featureId]がundefinedならDEFAULT_FEATURE_SETTINGSにフォールバックする', async () => {
      mockChromeStorage.get.mockResolvedValue({
        featureSettings: { chat: undefined },
      });

      const result = await isFeatureEnabled('chat');

      expect(result).toBe(DEFAULT_FEATURE_SETTINGS.chat);
    });
  });

  describe('saveFeatureSettings', () => {
    it('[covers:save_feature_settings.success] 機能設定を保存できる', async () => {
      const settings: FeatureSettings = {
        ...DEFAULT_FEATURE_SETTINGS,
        enableCardSearchFeature: false,
      };

      await saveFeatureSettings(settings);

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ featureSettings: settings });
    });

    it('[covers:save_feature_settings.failure_rethrows] 保存失敗時はエラーをスローする', async () => {
      const settings = DEFAULT_FEATURE_SETTINGS;
      const error = new Error('Storage error');
      mockChromeStorage.set.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(saveFeatureSettings(settings)).rejects.toThrow('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save feature settings:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadAppSettings', () => {
    it('[covers:load_app_settings.merge_with_stored] 保存されたアプリ設定を読み込める', async () => {
      const savedSettings: Partial<AppSettings> = {
        theme: 'dark',
        language: 'en',
      };
      mockChromeStorage.get.mockResolvedValue({ appSettings: savedSettings });

      const result = await loadAppSettings();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['appSettings']);
      expect(result.theme).toBe('dark');
      expect(result.language).toBe('en');
    });

    it('[covers:load_app_settings.no_stored_returns_default] 設定が存在しない場合はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await loadAppSettings();

      expect(result).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('[covers:load_app_settings.merge_with_stored] 部分的な設定はデフォルト値とマージされる', async () => {
      const partialSettings: Partial<AppSettings> = {
        theme: 'light',
      };
      mockChromeStorage.get.mockResolvedValue({ appSettings: partialSettings });

      const result = await loadAppSettings();

      expect(result.theme).toBe('light');
      expect(result.language).toBe(DEFAULT_APP_SETTINGS.language);
    });

    it('[covers:load_app_settings.storage_get_throws_returns_default] 読み込み失敗時はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadAppSettings();

      expect(result).toEqual(DEFAULT_APP_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load app settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveAppSettings', () => {
    it('[covers:save_app_settings.success] アプリ設定を保存できる', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
      };

      await saveAppSettings(settings);

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ appSettings: settings });
    });

    it('[covers:save_app_settings.failure_rethrows] 保存失敗時はエラーをスローする', async () => {
      const settings = DEFAULT_APP_SETTINGS;
      const error = new Error('Storage error');
      mockChromeStorage.set.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(saveAppSettings(settings)).rejects.toThrow('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save app settings:', error);

      consoleErrorSpy.mockRestore();
    });
  });
});
