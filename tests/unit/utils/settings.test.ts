import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFeatureSettings,
  isFeatureEnabled,
  loadDeckEditSettings,
  saveDeckEditSettings,
  saveFeatureSettings,
  loadAppSettings,
  saveAppSettings,
} from '@/utils/settings';
import {
  DEFAULT_FEATURE_SETTINGS,
  DEFAULT_DECK_EDIT_SETTINGS,
  DEFAULT_APP_SETTINGS,
} from '@/types/settings';
import type { FeatureSettings, DeckEditSettings, AppSettings } from '@/types/settings';

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
    it('保存された設定を読み込める', async () => {
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

    it('設定が存在しない場合はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await loadFeatureSettings();

      expect(result).toEqual(DEFAULT_FEATURE_SETTINGS);
    });

    it('部分的な設定はデフォルト値とマージされる', async () => {
      const partialSettings: Partial<FeatureSettings> = {
        enableCardSearchFeature: false,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: partialSettings });

      const result = await loadFeatureSettings();

      expect(result.enableCardSearchFeature).toBe(false);
      expect(result.enableAllFeatures).toBe(DEFAULT_FEATURE_SETTINGS.enableAllFeatures);
    });

    it('読み込み失敗時はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadFeatureSettings();

      expect(result).toEqual(DEFAULT_FEATURE_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load feature settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isFeatureEnabled', () => {
    it('特定の機能が有効かどうかを確認できる', async () => {
      const settings: Partial<FeatureSettings> = {
        enableCardSearchFeature: true,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: settings });

      const result = await isFeatureEnabled('enableCardSearchFeature');

      expect(result).toBe(true);
    });

    it('機能が無効の場合はfalseを返す', async () => {
      const settings: Partial<FeatureSettings> = {
        enableCardSearchFeature: false,
      };
      mockChromeStorage.get.mockResolvedValue({ featureSettings: settings });

      const result = await isFeatureEnabled('enableCardSearchFeature');

      expect(result).toBe(false);
    });

    it('設定が存在しない場合はデフォルト値を使用する', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await isFeatureEnabled('enableAllFeatures');

      expect(result).toBe(DEFAULT_FEATURE_SETTINGS.enableAllFeatures);
    });
  });

  describe('loadDeckEditSettings', () => {
    it('保存されたデッキ編集設定を読み込める', async () => {
      const savedSettings: Partial<DeckEditSettings> = {
        sortOrder: 'nameAsc',
        displayMode: 'grid',
      };
      mockChromeStorage.get.mockResolvedValue({ deckEditSettings: savedSettings });

      const result = await loadDeckEditSettings();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['deckEditSettings']);
      expect(result.sortOrder).toBe('nameAsc');
      expect(result.displayMode).toBe('grid');
    });

    it('設定が存在しない場合はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await loadDeckEditSettings();

      expect(result).toEqual(DEFAULT_DECK_EDIT_SETTINGS);
    });

    it('部分的な設定はデフォルト値とマージされる', async () => {
      const partialSettings: Partial<DeckEditSettings> = {
        sortOrder: 'nameDesc',
      };
      mockChromeStorage.get.mockResolvedValue({ deckEditSettings: partialSettings });

      const result = await loadDeckEditSettings();

      expect(result.sortOrder).toBe('nameDesc');
      expect(result.displayMode).toBe(DEFAULT_DECK_EDIT_SETTINGS.displayMode);
    });

    it('読み込み失敗時はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadDeckEditSettings();

      expect(result).toEqual(DEFAULT_DECK_EDIT_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load deck edit settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveDeckEditSettings', () => {
    it('デッキ編集設定を保存できる', async () => {
      const settings: DeckEditSettings = {
        ...DEFAULT_DECK_EDIT_SETTINGS,
        sortOrder: 'nameAsc',
      };

      await saveDeckEditSettings(settings);

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ deckEditSettings: settings });
    });

    it('保存失敗時はエラーをスローする', async () => {
      const settings = DEFAULT_DECK_EDIT_SETTINGS;
      const error = new Error('Storage error');
      mockChromeStorage.set.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(saveDeckEditSettings(settings)).rejects.toThrow('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save deck edit settings:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveFeatureSettings', () => {
    it('機能設定を保存できる', async () => {
      const settings: FeatureSettings = {
        ...DEFAULT_FEATURE_SETTINGS,
        enableCardSearchFeature: false,
      };

      await saveFeatureSettings(settings);

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ featureSettings: settings });
    });

    it('保存失敗時はエラーをスローする', async () => {
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
    it('保存されたアプリ設定を読み込める', async () => {
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

    it('設定が存在しない場合はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const result = await loadAppSettings();

      expect(result).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('部分的な設定はデフォルト値とマージされる', async () => {
      const partialSettings: Partial<AppSettings> = {
        theme: 'light',
      };
      mockChromeStorage.get.mockResolvedValue({ appSettings: partialSettings });

      const result = await loadAppSettings();

      expect(result.theme).toBe('light');
      expect(result.language).toBe(DEFAULT_APP_SETTINGS.language);
    });

    it('読み込み失敗時はデフォルト値を返す', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadAppSettings();

      expect(result).toEqual(DEFAULT_APP_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load app settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveAppSettings', () => {
    it('アプリ設定を保存できる', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
      };

      await saveAppSettings(settings);

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ appSettings: settings });
    });

    it('保存失敗時はエラーをスローする', async () => {
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
