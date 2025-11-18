import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import type { CardSize, Theme, Language } from '@/types/settings';

describe('stores/settings', () => {
  let mockStorage: Record<string, any>;

  beforeEach(() => {
    // Pinia初期化
    setActivePinia(createPinia());

    // chrome.storage.local のモック
    mockStorage = {};
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys, callback) => {
            const result: Record<string, any> = {};
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                if (mockStorage[key]) {
                  result[key] = mockStorage[key];
                }
              });
            }
            callback(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(mockStorage, items);
            if (callback) callback();
          })
        }
      }
    } as any;

    // document.documentElement.style.setProperty のモック（spyに変更）
    vi.spyOn(document.documentElement.style, 'setProperty');

    // matchMedia のモック
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期化と読み込み', () => {
    it('should load default settings when storage is empty', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.appSettings.theme).toBe('light');
      expect(store.appSettings.language).toBe('auto');
      expect(store.isLoaded).toBe(true);
    });

    it('should load settings from chrome.storage', async () => {
      mockStorage.appSettings = {
        theme: 'dark',
        language: 'ja'
      };

      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.appSettings.theme).toBe('dark');
      expect(store.appSettings.language).toBe('ja');
    });

    it('should merge loaded settings with defaults', async () => {
      mockStorage.appSettings = {
        theme: 'dark'
      };

      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.appSettings.theme).toBe('dark');
      expect(store.appSettings.language).toBe('auto'); // デフォルト値
    });
  });

  describe('設定の保存', () => {
    it('should save settings to chrome.storage', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.appSettings.theme = 'dark';
      await store.saveSettings();

      expect(mockStorage.appSettings.theme).toBe('dark');
    });

    it('should save both app and feature settings', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.appSettings.theme = 'dark';
      store.featureSettings.testFeature = true;
      await store.saveSettings();

      expect(mockStorage.appSettings.theme).toBe('dark');
      expect(mockStorage.featureSettings.testFeature).toBe(true);
    });
  });

  describe('カードサイズ変更', () => {
    it('should update deck edit card size', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setDeckEditCardSize('large');

      expect(store.appSettings.deckEditCardSize).toBe('large');
      expect(mockStorage.appSettings.deckEditCardSize).toBe('large');
    });

    it('should update info card size', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setInfoCardSize('small');

      expect(store.appSettings.infoCardSize).toBe('small');
      expect(mockStorage.appSettings.infoCardSize).toBe('small');
    });

    it('should update grid card size', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setGridCardSize('xlarge');

      expect(store.appSettings.gridCardSize).toBe('xlarge');
    });

    it('should update list card size', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setListCardSize('medium');

      expect(store.appSettings.listCardSize).toBe('medium');
    });

    it('should apply CSS variables when card size changes', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setDeckEditCardSize('large');

      expect(document.documentElement.style.setProperty).toHaveBeenCalled();
    });
  });

  describe('テーマ変更', () => {
    it('should change theme', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setTheme('dark');

      expect(store.appSettings.theme).toBe('dark');
      expect(mockStorage.appSettings.theme).toBe('dark');
    });

    it('should apply theme immediately', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
      store.setTheme('dark');

      expect(setPropertySpy).toHaveBeenCalled();
    });

    it('should support system theme', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setTheme('system');

      expect(store.appSettings.theme).toBe('system');
      expect(store.effectiveTheme).toBe('light'); // matchMediaのモックではfalse
    });
  });

  describe('言語変更', () => {
    it('should change language', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setLanguage('ja');

      expect(store.appSettings.language).toBe('ja');
      expect(mockStorage.appSettings.language).toBe('ja');
    });

    it('should support all language codes', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      const languages: Language[] = ['auto', 'ja', 'en', 'ko', 'ae', 'cn', 'de', 'fr', 'it', 'es', 'pt'];

      for (const lang of languages) {
        store.setLanguage(lang);
        expect(store.appSettings.language).toBe(lang);
      }
    });
  });

  describe('算出プロパティ', () => {
    it('should compute effective theme', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setTheme('light');
      expect(store.effectiveTheme).toBe('light');

      store.setTheme('dark');
      expect(store.effectiveTheme).toBe('dark');
    });

    it('should compute effective theme from system preference', async () => {
      // matchMediaをdarkに変更
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const store = useSettingsStore();
      await store.loadSettings();

      store.setTheme('system');
      expect(store.effectiveTheme).toBe('dark');
    });

    it('should compute card size pixels', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.deckEditCardSizePixels).toBeDefined();
      expect(store.infoCardSizePixels).toBeDefined();
      expect(store.gridCardSizePixels).toBeDefined();
      expect(store.listCardSizePixels).toBeDefined();
    });
  });

  describe('レイアウト設定', () => {
    it('should change middle decks layout', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setMiddleDecksLayout('horizontal');

      expect(store.appSettings.middleDecksLayout).toBe('horizontal');
      expect(mockStorage.appSettings.middleDecksLayout).toBe('horizontal');
    });

    it('should support vertical layout', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setMiddleDecksLayout('vertical');

      expect(store.appSettings.middleDecksLayout).toBe('vertical');
    });
  });

  describe('機能設定', () => {
    it('should toggle feature on/off', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.toggleFeature('testFeature', true);
      expect(store.featureSettings.testFeature).toBe(true);

      store.toggleFeature('testFeature', false);
      expect(store.featureSettings.testFeature).toBe(false);
    });

    it('should save feature settings', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.toggleFeature('myFeature', true);

      expect(mockStorage.featureSettings.myFeature).toBe(true);
    });
  });

  describe('カード幅の直接指定', () => {
    it('should set card width for list mode', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setCardWidth('list', 80);

      expect(store.cardWidthList).toBe(80);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--card-width-list',
        '80px'
      );
    });

    it('should set card width for grid mode', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setCardWidth('grid', 100);

      expect(store.cardWidthGrid).toBe(100);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--card-width-grid',
        '100px'
      );
    });

    it('should calculate height automatically', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.setCardWidth('list', 100);

      const expectedHeight = Math.round(100 * 1.46); // 146
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--card-height-list',
        `${expectedHeight}px`
      );
    });
  });

  describe('永続化のテスト', () => {
    it('should persist settings across store instances', async () => {
      const store1 = useSettingsStore();
      await store1.loadSettings();
      store1.setTheme('dark');
      store1.setLanguage('ja');

      // 新しいインスタンス（Piniaの仕組みで同じインスタンスが返る）
      const store2 = useSettingsStore();
      
      expect(store2.appSettings.theme).toBe('dark');
      expect(store2.appSettings.language).toBe('ja');
    });

    it('should load persisted settings on initialization', async () => {
      // 事前にストレージに保存
      mockStorage.appSettings = {
        theme: 'dark',
        language: 'ja',
        deckEditCardSize: 'large'
      };

      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.appSettings.theme).toBe('dark');
      expect(store.appSettings.language).toBe('ja');
      expect(store.appSettings.deckEditCardSize).toBe('large');
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle chrome.storage errors gracefully', async () => {
      global.chrome.storage.local.get = vi.fn((keys, callback) => {
        // エラーを無視してデフォルト値を使用
        callback({});
      });

      const store = useSettingsStore();
      await store.loadSettings();

      expect(store.isLoaded).toBe(true);
      expect(store.appSettings.theme).toBe('light'); // デフォルト値
    });
  });
});
