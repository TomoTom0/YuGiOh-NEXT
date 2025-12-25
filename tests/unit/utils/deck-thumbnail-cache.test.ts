import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeckThumbnailCache } from '../../../src/utils/deck-thumbnail-cache';

describe('deck-thumbnail-cache', () => {
  let mockStorage: Record<string, any>;
  let mockLastError: { message: string } | undefined;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    mockStorage = {};
    mockLastError = undefined;

    // chrome.storage のモック
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys, callback) => {
            const keyArray = typeof keys === 'string' ? [keys] : keys;
            const result: Record<string, any> = {};
            keyArray.forEach((key: string) => {
              if (mockStorage[key] !== undefined) {
                result[key] = mockStorage[key];
              }
            });
            callback(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(mockStorage, items);
            if (callback) callback();
          }),
          remove: vi.fn((keys, callback) => {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            keyArray.forEach((key) => delete mockStorage[key]);
            if (callback) callback();
          }),
        },
      },
      runtime: {
        get lastError() {
          return mockLastError;
        },
      },
    } as any;

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('デフォルト値でインスタンスを作成できる', () => {
      const cache = new DeckThumbnailCache();
      expect(cache).toBeInstanceOf(DeckThumbnailCache);
      const stats = cache.getCacheStats();
      expect(stats.maxItems).toBe(200);
    });

    it('カスタムmaxItemsを指定できる', () => {
      const cache = new DeckThumbnailCache(100);
      const stats = cache.getCacheStats();
      expect(stats.maxItems).toBe(100);
    });
  });

  describe('loadCacheIndex', () => {
    it('空の状態で読み込める', async () => {
      const cache = new DeckThumbnailCache();
      const index = await cache.loadCacheIndex();
      expect(index).toEqual({});
    });

    it('既存のインデックスを読み込める', async () => {
      const testIndex = {
        hash1: {
          dno: 1,
          name: 'Test Deck',
          hash: 'hash1',
          imageDataUrl: 'data:image/webp;base64,test',
          imageSize: 100,
          lastAccessTime: Date.now(),
          createdTime: Date.now(),
        },
      };
      mockStorage['ygo_deck_thumbnail_index'] = testIndex;

      const cache = new DeckThumbnailCache();
      const index = await cache.loadCacheIndex();
      expect(index).toEqual(testIndex);
    });

    it('読み込みエラー時に警告を出力する', async () => {
      mockLastError = { message: 'Storage error' };

      const cache = new DeckThumbnailCache();
      await cache.loadCacheIndex();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('loadCacheOrder', () => {
    it('空の状態で読み込める', async () => {
      const cache = new DeckThumbnailCache();
      const order = await cache.loadCacheOrder();
      expect(order.order).toEqual([]);
      expect(order.currentSize).toBe(0);
    });

    it('既存の順序情報を読み込める', async () => {
      const testOrder = {
        order: ['hash1', 'hash2'],
        maxItems: 200,
        currentSize: 1000,
      };
      mockStorage['ygo_deck_thumbnail_order'] = testOrder;

      const cache = new DeckThumbnailCache();
      const order = await cache.loadCacheOrder();
      expect(order).toEqual(testOrder);
    });
  });

  describe('getImage', () => {
    it('存在するハッシュの画像を取得できる', async () => {
      const testIndex = {
        hash1: {
          dno: 1,
          name: 'Test Deck',
          hash: 'hash1',
          imageDataUrl: 'data:image/webp;base64,testimage',
          imageSize: 100,
          lastAccessTime: Date.now(),
          createdTime: Date.now(),
        },
      };
      const testOrder = {
        order: ['hash1'],
        maxItems: 200,
        currentSize: 100,
      };
      mockStorage['ygo_deck_thumbnail_index'] = testIndex;
      mockStorage['ygo_deck_thumbnail_order'] = testOrder;

      const cache = new DeckThumbnailCache();
      const image = await cache.getImage('hash1');

      expect(image).toBe('data:image/webp;base64,testimage');
    });

    it('存在しないハッシュの場合nullを返す', async () => {
      const cache = new DeckThumbnailCache();
      const image = await cache.getImage('nonexistent');

      expect(image).toBeNull();
    });

    it('画像取得時にアクセス時刻が更新される', async () => {
      const oldTime = Date.now() - 10000;
      const testIndex = {
        hash1: {
          dno: 1,
          name: 'Test Deck',
          hash: 'hash1',
          imageDataUrl: 'data:image/webp;base64,test',
          imageSize: 100,
          lastAccessTime: oldTime,
          createdTime: oldTime,
        },
      };
      const testOrder = {
        order: ['hash1'],
        maxItems: 200,
        currentSize: 100,
      };
      mockStorage['ygo_deck_thumbnail_index'] = testIndex;
      mockStorage['ygo_deck_thumbnail_order'] = testOrder;

      const cache = new DeckThumbnailCache();
      await cache.getImage('hash1');

      const updatedIndex = mockStorage['ygo_deck_thumbnail_index'];
      expect(updatedIndex.hash1.lastAccessTime).toBeGreaterThan(oldTime);
    });
  });

  describe('saveImage', () => {
    it('新しい画像を保存できる', async () => {
      const cache = new DeckThumbnailCache();
      await cache.saveImage('hash1', 1, 'Test Deck', 'data:image/webp;base64,test');

      const savedIndex = mockStorage['ygo_deck_thumbnail_index'];
      expect(savedIndex.hash1).toBeDefined();
      expect(savedIndex.hash1.dno).toBe(1);
      expect(savedIndex.hash1.name).toBe('Test Deck');
    });

    it('既存の画像を上書きできる', async () => {
      const cache = new DeckThumbnailCache();
      await cache.saveImage('hash1', 1, 'Old Name', 'data:image/webp;base64,old');
      await cache.saveImage('hash1', 1, 'New Name', 'data:image/webp;base64,new');

      const savedIndex = mockStorage['ygo_deck_thumbnail_index'];
      expect(savedIndex.hash1.name).toBe('New Name');
      expect(savedIndex.hash1.imageDataUrl).toBe('data:image/webp;base64,new');
    });

    it('保存時にサイズが更新される', async () => {
      const cache = new DeckThumbnailCache();
      const imageData = 'data:image/webp;base64,testimage';
      await cache.saveImage('hash1', 1, 'Test', imageData);

      const stats = cache.getCacheStats();
      expect(stats.totalSize).toBe(imageData.length);
    });
  });

  describe('deleteCacheEntry', () => {
    it('エントリを削除できる', async () => {
      const testIndex = {
        hash1: {
          dno: 1,
          name: 'Test',
          hash: 'hash1',
          imageDataUrl: 'data:image/webp;base64,test',
          imageSize: 100,
          lastAccessTime: Date.now(),
          createdTime: Date.now(),
        },
      };
      const testOrder = {
        order: ['hash1'],
        maxItems: 200,
        currentSize: 100,
      };
      mockStorage['ygo_deck_thumbnail_index'] = testIndex;
      mockStorage['ygo_deck_thumbnail_order'] = testOrder;

      const cache = new DeckThumbnailCache();
      await cache.deleteCacheEntry('hash1');

      const savedIndex = mockStorage['ygo_deck_thumbnail_index'];
      const savedOrder = mockStorage['ygo_deck_thumbnail_order'];
      expect(savedIndex.hash1).toBeUndefined();
      expect(savedOrder.order).not.toContain('hash1');
      expect(savedOrder.currentSize).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('全てのキャッシュをクリアできる', async () => {
      mockStorage['ygo_deck_thumbnail_index'] = { hash1: {} };
      mockStorage['ygo_deck_thumbnail_order'] = { order: ['hash1'] };

      const cache = new DeckThumbnailCache();
      await cache.clearAll();

      expect(mockStorage['ygo_deck_thumbnail_index']).toBeUndefined();
      expect(mockStorage['ygo_deck_thumbnail_order']).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('キャッシュ統計情報を取得できる', async () => {
      const cache = new DeckThumbnailCache(150);
      const stats = cache.getCacheStats();

      expect(stats.itemCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.maxItems).toBe(150);
      expect(stats.maxSize).toBe(10 * 1024 * 1024);
    });

    it('保存後の統計情報が正しい', async () => {
      const cache = new DeckThumbnailCache();
      await cache.saveImage('hash1', 1, 'Test1', 'data:image/webp;base64,test1');
      await cache.saveImage('hash2', 2, 'Test2', 'data:image/webp;base64,test2');

      const stats = cache.getCacheStats();
      expect(stats.itemCount).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('enforceMaxItems - 個数制限', () => {
    it('maxItemsを超えると古いエントリが削除される', async () => {
      const cache = new DeckThumbnailCache(3);

      // 4つの画像を保存（制限は3個）
      await cache.saveImage('hash1', 1, 'Test1', 'data:image/webp;base64,1');
      await cache.saveImage('hash2', 2, 'Test2', 'data:image/webp;base64,2');
      await cache.saveImage('hash3', 3, 'Test3', 'data:image/webp;base64,3');
      await cache.saveImage('hash4', 4, 'Test4', 'data:image/webp;base64,4');

      const stats = cache.getCacheStats();
      expect(stats.itemCount).toBeLessThanOrEqual(3);

      // 最も古いhash1が削除されているはず
      const image1 = await cache.getImage('hash1');
      expect(image1).toBeNull();
    });
  });
});
