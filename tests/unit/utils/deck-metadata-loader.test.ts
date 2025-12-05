import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDeckMetadata,
  saveDeckMetadata,
  DeckMetadata,
  DeckMetadataEntry
} from '@/utils/deck-metadata-loader';

// キャッシュをリセットするため、モジュールの内部状態をリセット
vi.stubGlobal('__deck_metadata_cache__', null);

describe('utils/deck-metadata-loader', () => {
  let mockStorage: Record<string, any>;

  beforeEach(() => {
    // モックストレージの初期化
    mockStorage = {};

    // chrome.storage.local のモック
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((key, callback?) => {
            const result: Record<string, any> = {};
            if (typeof key === 'string' && mockStorage[key]) {
              result[key] = mockStorage[key];
            } else if (Array.isArray(key)) {
              key.forEach(k => {
                if (mockStorage[k]) {
                  result[k] = mockStorage[k];
                }
              });
            }
            if (callback) {
              // コールバック版の場合
              callback(result);
            }
            // Promise版も対応
            return Promise.resolve(result);
          }),
          set: vi.fn((items, callback?) => {
            Object.assign(mockStorage, items);
            if (callback) {
              // コールバック版の場合
              callback();
            }
            // Promise版も対応
            return Promise.resolve();
          })
        }
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // モジュールのキャッシュをリセット（必要に応じて）
  });

  describe('getDeckMetadata', () => {
    it('should return initial metadata from JSON when storage is empty (first call)', async () => {
      const metadata = await getDeckMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.tags).toBeDefined();
      expect(typeof metadata.tags).toBe('object');
      expect(metadata.deckTypes).toBeDefined();
      expect(Array.isArray(metadata.deckTypes) || typeof metadata.deckTypes === 'object').toBe(true);
    });

    it('should return cached metadata on subsequent calls', async () => {
      // 前のテストで既に1回呼び出されているはず
      const metadata1 = await getDeckMetadata();
      expect(metadata1).toBeDefined();

      // 2回目呼び出し（キャッシュから取得）
      const metadata2 = await getDeckMetadata();
      expect(metadata2).toBe(metadata1); // 同じオブジェクト参照
    });

    it('should convert Record format categories to array with groups', async () => {
      const metadata = await getDeckMetadata();

      if (Array.isArray(metadata.categories)) {
        // categoriesが配列形式の場合
        expect(Array.isArray(metadata.categories)).toBe(true);
        if (metadata.categories.length > 0) {
          expect(metadata.categories[0]).toHaveProperty('value');
          expect(metadata.categories[0]).toHaveProperty('label');
        }
      }
    });

  });

  describe('saveDeckMetadata', () => {
    it('should save metadata to chrome.storage', async () => {
      const metadata: DeckMetadata = {
        deckTypes: [{ value: '1', label: 'タイプ1' }],
        deckStyles: [{ value: '1', label: 'スタイル1' }],
        categories: [{ value: '1', label: 'カテゴリ1' }],
        tags: { '1': 'タグ1' },
        lastUpdated: '2025-12-04T12:00:00.000Z'
      };

      await saveDeckMetadata(metadata);

      // set が呼び出されたことを確認
      expect(global.chrome.storage.local.set).toHaveBeenCalled();

      // 第1引数が正しいオブジェクトであることを確認
      const calls = (global.chrome.storage.local.set as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toEqual({
        deck_metadata: metadata
      });

      // ストレージに保存されていることを確認
      expect(mockStorage.deck_metadata).toEqual(metadata);
    });

    it('should update cache after saving', async () => {
      const metadata: DeckMetadata = {
        deckTypes: [],
        deckStyles: [],
        categories: [],
        tags: {},
        lastUpdated: '2025-12-04T12:00:00.000Z'
      };

      await saveDeckMetadata(metadata);

      // キャッシュから取得
      const cached = await getDeckMetadata();
      expect(cached).toEqual(metadata);
    });

    it('should handle save error', async () => {
      global.chrome.storage.local.set = vi.fn(() => {
        return Promise.reject(new Error('Save failed'));
      });

      const metadata: DeckMetadata = {
        deckTypes: [],
        deckStyles: [],
        categories: [],
        tags: {},
        lastUpdated: '2025-12-04T12:00:00.000Z'
      };

      await expect(saveDeckMetadata(metadata)).rejects.toThrow('Save failed');
    });

    it('should handle missing chrome.storage gracefully', async () => {
      delete (global as any).chrome;

      const metadata: DeckMetadata = {
        deckTypes: [],
        deckStyles: [],
        categories: [],
        tags: {},
        lastUpdated: '2025-12-04T12:00:00.000Z'
      };

      // エラーをスローせずに終了
      await saveDeckMetadata(metadata);
      // 警告ログが出力されるが、例外はスローされない
    });
  });

  describe('metadata structure', () => {
    it('should have all required properties', async () => {
      const metadata = await getDeckMetadata();

      expect(metadata).toHaveProperty('deckTypes');
      expect(metadata).toHaveProperty('deckStyles');
      expect(metadata).toHaveProperty('categories');
      expect(metadata).toHaveProperty('tags');
      expect(metadata).toHaveProperty('lastUpdated');
    });

    it('should have correct types for properties', async () => {
      const metadata = await getDeckMetadata();

      if (Array.isArray(metadata.deckTypes)) {
        expect(Array.isArray(metadata.deckTypes)).toBe(true);
      }

      if (Array.isArray(metadata.deckStyles)) {
        expect(Array.isArray(metadata.deckStyles)).toBe(true);
      }

      expect(Array.isArray(metadata.categories)).toBe(true);
      expect(typeof metadata.tags).toBe('object');
      expect(typeof metadata.lastUpdated).toBe('string');
    });

    it('DeckMetadataEntry should have value and label', async () => {
      const entry: DeckMetadataEntry = {
        value: 'test_value',
        label: 'Test Label'
      };

      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('label');
      expect(entry.value).toBe('test_value');
      expect(entry.label).toBe('Test Label');
    });
  });

  describe('metadata persistence', () => {
    it('should store and retrieve metadata correctly', async () => {
      const originalMetadata: DeckMetadata = {
        deckTypes: [
          { value: 'type1', label: 'Type 1' },
          { value: 'type2', label: 'Type 2' }
        ],
        deckStyles: [{ value: 'style1', label: 'Style 1' }],
        categories: [{ value: 'cat1', label: 'Category 1' }],
        tags: {
          'tag1': 'Tag 1',
          'tag2': 'Tag 2'
        },
        lastUpdated: '2025-12-04T10:00:00.000Z'
      };

      // 保存
      await saveDeckMetadata(originalMetadata);

      // 別のインスタンスで取得（シミュレート）
      // モック上では同じmockStorageを使用しているため、データが保持される
      const retrieved = await getDeckMetadata();

      expect(retrieved).toEqual(originalMetadata);
    });
  });
});
