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

    it('should handle chrome.storage.get throwing errors', async () => {
      global.chrome.storage.local.get = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const store = useSettingsStore();
      
      // エラーをキャッチしてデフォルト値で動作することを確認
      try {
        await store.loadSettings();
      } catch (error) {
        // エラーが発生しても処理は継続
      }

      // デフォルト値が使用される
      expect(store.appSettings.theme).toBe('light');
      expect(store.appSettings.language).toBe('auto');
    });

    it('should handle chrome.storage.set failures during save', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // setが失敗するようにモック
      global.chrome.storage.local.set = vi.fn((items, callback) => {
        // コールバックを呼ばずにエラーを発生させる
        throw new Error('Failed to save settings');
      });

      store.appSettings.theme = 'dark';
      
      // エラーをキャッチして処理を継続
      try {
        await store.saveSettings();
      } catch (error) {
        expect(error).toBeDefined();
      }

      // ローカルの状態は変更されている
      expect(store.appSettings.theme).toBe('dark');
    });

    it('should handle async callback errors in chrome.storage.get', async () => {
      // 非同期でエラーが発生するケース
      global.chrome.storage.local.get = vi.fn((keys, callback) => {
        setTimeout(() => {
          callback({}); // 空オブジェクトを返す（エラーではなく空データ）
        }, 10);
      });

      const store = useSettingsStore();
      await store.loadSettings();

      // デフォルト値が適用される
      expect(store.appSettings.theme).toBe('light');
      expect(store.isLoaded).toBe(true);
    });

    it('should handle delayed callbacks in chrome.storage.set', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // 遅延してコールバックを呼ぶ
      global.chrome.storage.local.set = vi.fn((items, callback) => {
        setTimeout(() => {
          Object.assign(mockStorage, items);
          if (callback) callback();
        }, 50);
      });

      store.appSettings.theme = 'dark';
      await store.saveSettings();

      // 遅延後に保存が完了している
      expect(mockStorage.appSettings.theme).toBe('dark');
    });

    it('should handle chrome runtime lastError', async () => {
      global.chrome.runtime = {
        lastError: { message: 'Runtime error occurred' }
      } as any;

      global.chrome.storage.local.get = vi.fn((keys, callback) => {
        callback({});
      });

      const store = useSettingsStore();
      await store.loadSettings();

      // lastErrorが設定されていてもデフォルト値で動作
      expect(store.isLoaded).toBe(true);
      expect(store.appSettings.theme).toBe('light');
    });

    it('should handle corrupted storage data', async () => {
      // 不正なデータ構造
      mockStorage.appSettings = {
        theme: 'invalid-theme' as any,
        language: 123 as any, // 数値（不正）
        deckEditCardSize: null as any
      };

      const store = useSettingsStore();
      
      // 不正なデータでもロードが失敗しないことを確認
      try {
        await store.loadSettings();
      } catch (error) {
        // エラーが発生した場合、最低限動作することを確認
        console.warn('Corrupted data caused error:', error);
      }

      // ロードが完了している（デフォルト値またはそのまま）
      expect(store.isLoaded).toBe(true);
    });
  });

  describe('非同期・競合テスト', () => {
    it('should handle concurrent save operations', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      let saveCount = 0;
      global.chrome.storage.local.set = vi.fn((items, callback) => {
        saveCount++;
        setTimeout(() => {
          Object.assign(mockStorage, items);
          if (callback) callback();
        }, Math.random() * 50);
      });

      // 複数の保存操作を並行実行
      store.appSettings.theme = 'dark';
      const save1 = store.saveSettings();

      store.appSettings.language = 'ja';
      const save2 = store.saveSettings();

      store.appSettings.deckEditCardSize = 'large';
      const save3 = store.saveSettings();

      await Promise.all([save1, save2, save3]);

      // すべての保存操作が完了
      expect(saveCount).toBe(3);
      expect(mockStorage.appSettings.theme).toBe('dark');
      expect(mockStorage.appSettings.language).toBe('ja');
      expect(mockStorage.appSettings.deckEditCardSize).toBe('large');
    });

    it('should handle concurrent get operations', async () => {
      mockStorage.appSettings = {
        theme: 'dark',
        language: 'ja'
      };

      let getCount = 0;
      global.chrome.storage.local.get = vi.fn((keys, callback) => {
        getCount++;
        setTimeout(() => {
          const result: Record<string, any> = {};
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              if (mockStorage[key]) {
                result[key] = mockStorage[key];
              }
            });
          }
          callback(result);
        }, Math.random() * 30);
      });

      // 複数のストアインスタンスが同時にloadを呼ぶ（Piniaは単一インスタンスだが、テストとして）
      const store = useSettingsStore();
      const load1 = store.loadSettings();
      const load2 = store.loadSettings();
      const load3 = store.loadSettings();

      await Promise.all([load1, load2, load3]);

      // すべてのload操作が完了
      expect(getCount).toBeGreaterThan(0);
      expect(store.appSettings.theme).toBe('dark');
      expect(store.appSettings.language).toBe('ja');
    });

    it('should handle read-while-write race condition', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // 書き込み操作を開始
      store.appSettings.theme = 'dark';
      const savePromise = store.saveSettings();

      // 保存中に読み込み操作を実行
      const loadPromise = store.loadSettings();

      await Promise.all([savePromise, loadPromise]);

      // 最終的にいずれかの状態が反映される
      expect(store.isLoaded).toBe(true);
    });
  });

  describe('deepMerge: 配列/オブジェクト境界テスト', () => {
    it('配列のプロトタイプ保持テスト: 空でない配列はそのまま使用される', async () => {
      // deepMergeをテストするため、実装を模式化してテスト
      const target = {
        shortcuts: [
          { key: 'a', ctrl: false }
        ]
      };

      const source = {
        shortcuts: [
          { key: 'a', ctrl: false },
          { key: 'b', ctrl: true }
        ]
      };

      const store = useSettingsStore();
      await store.loadSettings();

      // 配列をマージ
      mockStorage.appSettings = {
        theme: 'light',
        keyboardShortcuts: {
          globalSearch: [{ key: '/', ctrl: false, shift: false, alt: false }],
          undo: [{ key: 'z', ctrl: true, shift: false, alt: false }],
          redo: [{ key: 'y', ctrl: true, shift: false, alt: false }]
        }
      };

      // ストレージから読み込むと、deepMergeでマージされる
      await store.loadCommonSettings();

      // keyboardShortcuts は配列であることを確認
      expect(Array.isArray(store.appSettings.keyboardShortcuts.globalSearch)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.undo)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.redo)).toBe(true);

      // 配列メソッドが使用可能
      expect(typeof store.appSettings.keyboardShortcuts.globalSearch.map).toBe('function');
      expect(typeof store.appSettings.keyboardShortcuts.globalSearch.some).toBe('function');
    });

    it('空配列マージテスト: 空配列はターゲットの配列を使用', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // ストレージに空配列を保存
      mockStorage.appSettings = {
        theme: 'light',
        keyboardShortcuts: {
          globalSearch: [],
          undo: [{ key: 'z', ctrl: true, shift: false, alt: false }],
          redo: []
        }
      };

      await store.loadCommonSettings();

      // 空配列の場合、デフォルト値が使用される
      expect(Array.isArray(store.appSettings.keyboardShortcuts.globalSearch)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.undo)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.redo)).toBe(true);

      // undoは保存されたデータを使用
      expect(store.appSettings.keyboardShortcuts.undo.length).toBeGreaterThan(0);
    });

    it('ネストオブジェクトのマージテスト: 配列はオブジェクト化されない', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // ネストされたオブジェクトに配列を含める
      mockStorage.appSettings = {
        theme: 'light',
        keyboardShortcuts: {
          globalSearch: [{ key: '/', ctrl: false, shift: false, alt: false }],
          undo: [{ key: 'z', ctrl: true, shift: false, alt: false }],
          redo: [{ key: 'y', ctrl: true, shift: false, alt: false }]
        }
      };

      await store.loadCommonSettings();

      // keyboardShortcuts オブジェクト内の各配列が配列のまま保持される
      const { keyboardShortcuts } = store.appSettings;

      for (const [key, value] of Object.entries(keyboardShortcuts)) {
        expect(Array.isArray(value)).toBe(true, `keyboardShortcuts.${key} should be an array`);
      }
    });
  });

  describe('deepMerge: null/undefined のマージテスト', () => {
    it('null/undefined 値はスキップされる', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      const originalTheme = store.appSettings.theme;

      // null/undefined を含むオブジェクト
      mockStorage.appSettings = {
        theme: originalTheme,
        language: null as any,
        keyboardShortcuts: undefined as any
      };

      await store.loadCommonSettings();

      // null/undefined はスキップされ、デフォルト値が使用される
      expect(store.appSettings.theme).toBe(originalTheme);
      expect(store.appSettings.language).toBeDefined();
      expect(store.appSettings.keyboardShortcuts).toBeDefined();
    });
  });

  describe('キーボードショートカット設定保存/復元テスト', () => {
    it('keyboardShortcuts 配列の保存テスト', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // ショートカットを追加
      store.addKeyboardShortcut('globalSearch', {
        key: '?',
        ctrl: false,
        shift: true,
        alt: false
      });

      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBeGreaterThan(0);
      expect(mockStorage.appSettings.keyboardShortcuts.globalSearch).toBeDefined();
      expect(Array.isArray(mockStorage.appSettings.keyboardShortcuts.globalSearch)).toBe(true);
    });

    it('keyboardShortcuts 配列の復元テスト', async () => {
      mockStorage.appSettings = {
        theme: 'light',
        keyboardShortcuts: {
          globalSearch: [{ key: '?', ctrl: false, shift: true, alt: false }],
          undo: [{ key: 'z', ctrl: true, shift: false, alt: false }],
          redo: [{ key: 'y', ctrl: true, shift: false, alt: false }]
        }
      };

      const store = useSettingsStore();
      await store.loadCommonSettings();

      // 復元後も配列は Array.isArray() で true
      expect(Array.isArray(store.appSettings.keyboardShortcuts.globalSearch)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.undo)).toBe(true);
      expect(Array.isArray(store.appSettings.keyboardShortcuts.redo)).toBe(true);

      // 復元後の配列が deepMerge により正しく処理される
      expect(store.appSettings.keyboardShortcuts.globalSearch[0].key).toBe('?');
      expect(store.appSettings.keyboardShortcuts.undo[0].key).toBe('z');
    });

    it('キーボードショートカット追加テスト: 最大3個まで追加可能', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // 初期状態をクリア
      store.appSettings.keyboardShortcuts.globalSearch = [];

      // 1個目追加
      store.addKeyboardShortcut('globalSearch', {
        key: '1',
        ctrl: false,
        shift: false,
        alt: false
      });
      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(1);

      // 2個目追加
      store.addKeyboardShortcut('globalSearch', {
        key: '2',
        ctrl: false,
        shift: false,
        alt: false
      });
      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(2);

      // 3個目追加
      store.addKeyboardShortcut('globalSearch', {
        key: '3',
        ctrl: false,
        shift: false,
        alt: false
      });
      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(3);
    });

    it('キーボードショートカット追加テスト: 4個目は追加されない', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // 初期状態を3個に設定
      store.appSettings.keyboardShortcuts.globalSearch = [
        { key: '1', ctrl: false, shift: false, alt: false },
        { key: '2', ctrl: false, shift: false, alt: false },
        { key: '3', ctrl: false, shift: false, alt: false }
      ];

      const initialLength = store.appSettings.keyboardShortcuts.globalSearch.length;
      const consoleSpy = vi.spyOn(console, 'warn');

      // 4個目を追加しようとする
      store.addKeyboardShortcut('globalSearch', {
        key: '4',
        ctrl: false,
        shift: false,
        alt: false
      });

      // 追加されない
      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(initialLength);
      // 警告がログされる
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot add more than 3 shortcuts')
      );

      consoleSpy.mockRestore();
    });

    it('キーボードショートカット削除テスト', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      // 初期状態を設定
      store.appSettings.keyboardShortcuts.globalSearch = [
        { key: '1', ctrl: false, shift: false, alt: false },
        { key: '2', ctrl: false, shift: false, alt: false },
        { key: '3', ctrl: false, shift: false, alt: false }
      ];

      // 1番目のショートカットを削除
      store.removeKeyboardShortcut('globalSearch', 1);

      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(2);
      expect(store.appSettings.keyboardShortcuts.globalSearch[0].key).toBe('1');
      expect(store.appSettings.keyboardShortcuts.globalSearch[1].key).toBe('3');
    });

    it('キーボードショートカット削除テスト: 無効なインデックスは無視される', async () => {
      const store = useSettingsStore();
      await store.loadSettings();

      store.appSettings.keyboardShortcuts.globalSearch = [
        { key: '1', ctrl: false, shift: false, alt: false }
      ];

      const initialLength = store.appSettings.keyboardShortcuts.globalSearch.length;

      // 無効なインデックスで削除を試みる
      store.removeKeyboardShortcut('globalSearch', 10);
      store.removeKeyboardShortcut('globalSearch', -1);

      // 削除されない
      expect(store.appSettings.keyboardShortcuts.globalSearch.length).toBe(initialLength);
    });
  });
});
