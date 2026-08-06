import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeckThumbnailCache } from '../../../src/utils/deck-thumbnail-cache';

const STORAGE_KEY_INDEX = 'ygo_deck_thumbnail_index';
const STORAGE_KEY_ORDER = 'ygo_deck_thumbnail_order';
const MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024;

const makeEntry = (hash: string, imageDataUrl = `data:${hash}`, imageSize = imageDataUrl.length) => ({
  dno: Number(hash.replace(/\D/g, '')) || 1,
  name: `Deck ${hash}`,
  hash,
  imageDataUrl,
  imageSize,
  lastAccessTime: 1000,
  createdTime: 500,
});

describe('deck-thumbnail-cache', () => {
  let mockStorage: Record<string, any>;
  let mockLastError: { message: string } | undefined;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockStorage = {};
    mockLastError = undefined;

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

  describe('constructor / getCacheStats', () => {
    it('デフォルトmaxItemsを設定し、統計に10MB上限を返す [covers:constructor.default_max_items] [covers:stats.returns_memory_state]', () => {
      const cache = new DeckThumbnailCache();

      expect(cache.getCacheStats()).toEqual({
        itemCount: 0,
        totalSize: 0,
        maxItems: 200,
        maxSize: MAX_CACHE_SIZE_BYTES,
      });
    });

    it('カスタムmaxItemsを設定できる [covers:constructor.custom_max_items]', () => {
      const cache = new DeckThumbnailCache(100);

      expect(cache.getCacheStats().maxItems).toBe(100);
    });
  });

  describe('loadCacheIndex', () => {
    it('保存済みインデックスを読み込んで返す [covers:load_index.storage_hit_assigns] [covers:storage_get.success_resolves_result]', async () => {
      const testIndex = { hash1: makeEntry('hash1') };
      mockStorage[STORAGE_KEY_INDEX] = testIndex;

      const cache = new DeckThumbnailCache();

      await expect(cache.loadCacheIndex()).resolves.toBe(testIndex);
    });

    it('インデックスが無い場合は現在値を返す [covers:load_index.storage_missing_keeps_current]', async () => {
      const cache = new DeckThumbnailCache();

      await expect(cache.loadCacheIndex()).resolves.toEqual({});
    });

    it('getエラーは警告して飲み込む [covers:load_index.get_error_swallows] [covers:storage_get.last_error_rejects]', async () => {
      mockLastError = { message: 'Storage error' };
      const cache = new DeckThumbnailCache();

      await expect(cache.loadCacheIndex()).resolves.toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to load cache index:',
        expect.any(Error)
      );
    });
  });

  describe('loadCacheOrder', () => {
    it('保存済み順序を読み込んで返す [covers:load_order.storage_hit_assigns]', async () => {
      const testOrder = { order: ['hash1', 'hash2'], maxItems: 200, currentSize: 1000 };
      mockStorage[STORAGE_KEY_ORDER] = testOrder;

      const cache = new DeckThumbnailCache();

      await expect(cache.loadCacheOrder()).resolves.toBe(testOrder);
    });

    it('順序が無い場合は現在値を返す [covers:load_order.storage_missing_keeps_current]', async () => {
      const cache = new DeckThumbnailCache(50);

      await expect(cache.loadCacheOrder()).resolves.toEqual({
        order: [],
        maxItems: 50,
        currentSize: 0,
      });
    });

    it('getエラーは警告して飲み込む [covers:load_order.get_error_swallows]', async () => {
      mockLastError = { message: 'Storage error' };
      const cache = new DeckThumbnailCache(50);

      await expect(cache.loadCacheOrder()).resolves.toEqual({
        order: [],
        maxItems: 50,
        currentSize: 0,
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to load cache order:',
        expect.any(Error)
      );
    });
  });

  describe('getImage / updateAccessTime', () => {
    it('存在しないハッシュはnullを返す [covers:get_image.missing_returns_null]', async () => {
      const cache = new DeckThumbnailCache();

      await expect(cache.getImage('missing')).resolves.toBeNull();
    });

    it('存在する画像を返し、アクセス時刻と順序を更新する [covers:get_image.found_updates_access_and_returns] [covers:update_access.entry_present_moves_to_tail_and_saves]', async () => {
      const oldTime = Date.now() - 10_000;
      mockStorage[STORAGE_KEY_INDEX] = {
        hash1: { ...makeEntry('hash1', 'data:image/webp;base64,1'), lastAccessTime: oldTime },
        hash2: makeEntry('hash2', 'data:image/webp;base64,2'),
      };
      mockStorage[STORAGE_KEY_ORDER] = { order: ['hash1', 'hash2'], maxItems: 200, currentSize: 48 };

      const cache = new DeckThumbnailCache();

      await expect(cache.getImage('hash1')).resolves.toBe('data:image/webp;base64,1');
      expect(mockStorage[STORAGE_KEY_INDEX].hash1.lastAccessTime).toBeGreaterThan(oldTime);
      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual(['hash2', 'hash1']);
    });

    it('アクセス時刻保存エラーでも画像を返す [covers:get_image.update_error_swallows_and_returns] [covers:update_access.storage_error_swallows]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = { hash1: makeEntry('hash1', 'data:image/webp;base64,1') };
      mockStorage[STORAGE_KEY_ORDER] = { order: ['hash1'], maxItems: 200, currentSize: 24 };
      vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
        Object.assign(mockStorage, items);
        mockLastError = { message: 'Storage error' };
        callback?.();
        mockLastError = undefined;
      });

      const cache = new DeckThumbnailCache();

      await expect(cache.getImage('hash1')).resolves.toBe('data:image/webp;base64,1');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to update access time in storage:',
        expect.any(Error)
      );
    });

    it('entryが無いupdateAccessTimeは何もしない [covers:update_access.entry_absent_noop]', async () => {
      const cache = new DeckThumbnailCache() as any;

      await expect(cache.updateAccessTime('missing')).resolves.toBeUndefined();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('saveImage / enforceMaxItems', () => {
    it('新規画像はentryを作成し、サイズを加算し、order末尾に追加する [covers:save_image.new_entry_fields_and_size] [covers:save_image.new_hash_appends_order] [covers:storage_set.success_resolves]', async () => {
      const cache = new DeckThumbnailCache();
      const imageData = 'data:image/webp;base64,test';

      await cache.saveImage('hash1', 1, 'Test Deck', imageData);

      expect(mockStorage[STORAGE_KEY_INDEX].hash1).toMatchObject({
        dno: 1,
        name: 'Test Deck',
        hash: 'hash1',
        imageDataUrl: imageData,
        imageSize: imageData.length,
      });
      expect(mockStorage[STORAGE_KEY_ORDER]).toMatchObject({
        order: ['hash1'],
        currentSize: imageData.length,
      });
    });

    it('既存画像の上書きは古いサイズを差し引き、orderを重複させない [covers:save_image.existing_subtracts_old_size] [covers:save_image.existing_order_not_duplicated]', async () => {
      const cache = new DeckThumbnailCache();
      const newImage = 'data:image/webp;base64,new-longer';

      await cache.saveImage('hash1', 1, 'Old Name', 'data:old');
      await cache.saveImage('hash1', 1, 'New Name', newImage);

      expect(mockStorage[STORAGE_KEY_INDEX].hash1).toMatchObject({
        name: 'New Name',
        imageDataUrl: newImage,
        imageSize: newImage.length,
      });
      expect(mockStorage[STORAGE_KEY_ORDER].currentSize).toBe(newImage.length);
      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual(['hash1']);
    });

    it('保存エラーは再throwする [covers:save_image.storage_error_rethrows] [covers:storage_set.last_error_rejects]', async () => {
      vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
        Object.assign(mockStorage, items);
        mockLastError = { message: 'Storage error' };
        callback?.();
        mockLastError = undefined;
      });
      const cache = new DeckThumbnailCache();

      await expect(cache.saveImage('hash1', 1, 'Test', 'data:test')).rejects.toThrow('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to save cache:',
        expect.any(Error)
      );
    });

    it('個数上限を超えるとorder先頭のentryを削除する [covers:enforce.item_count_over_limit_deletes_oldest]', async () => {
      const cache = new DeckThumbnailCache(3);

      await cache.saveImage('hash1', 1, 'Test1', 'data:1');
      await cache.saveImage('hash2', 2, 'Test2', 'data:2');
      await cache.saveImage('hash3', 3, 'Test3', 'data:3');
      await cache.saveImage('hash4', 4, 'Test4', 'data:4');

      expect(mockStorage[STORAGE_KEY_INDEX].hash1).toBeUndefined();
      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual(['hash2', 'hash3', 'hash4']);
      await expect(cache.getImage('hash1')).resolves.toBeNull();
    });

    it('個数上限処理はstaleなorder要素だけをshiftする [covers:enforce.item_count_stale_order_only_shifts]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = {};
      mockStorage[STORAGE_KEY_ORDER] = { order: ['stale'], maxItems: 1, currentSize: 0 };
      const cache = new DeckThumbnailCache(1);

      await cache.saveImage('hash1', 1, 'Test', 'data:1');

      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual(['hash1']);
      expect(mockStorage[STORAGE_KEY_ORDER].currentSize).toBe('data:1'.length);
    });

    it('サイズ上限を超えると削除できる古いentryを削除する [covers:enforce.size_over_limit_deletes_oldest]', async () => {
      const cache = new DeckThumbnailCache();
      const hugeImage = 'x'.repeat(MAX_CACHE_SIZE_BYTES + 1);

      await cache.saveImage('huge', 1, 'Huge', hugeImage);

      expect(mockStorage[STORAGE_KEY_INDEX].huge).toBeUndefined();
      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual([]);
      expect(mockStorage[STORAGE_KEY_ORDER].currentSize).toBe(0);
    });

    it('サイズ上限処理は削除対象が無い場合breakする [covers:enforce.size_over_limit_no_deletable_breaks]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = {};
      mockStorage[STORAGE_KEY_ORDER] = {
        order: [],
        maxItems: 200,
        currentSize: MAX_CACHE_SIZE_BYTES + 1,
      };
      const cache = new DeckThumbnailCache();

      await cache.saveImage('hash1', 1, 'Test', 'data:1');

      expect(mockStorage[STORAGE_KEY_INDEX]).toEqual({});
      expect(mockStorage[STORAGE_KEY_ORDER].order).toEqual([]);
      expect(mockStorage[STORAGE_KEY_ORDER].currentSize).toBe(MAX_CACHE_SIZE_BYTES + 1);
    });
  });

  describe('deleteCacheEntry', () => {
    it('存在するentryを削除し、サイズを減らす [covers:delete_entry.present_deletes_and_subtracts]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = { hash1: makeEntry('hash1', 'data:1', 100) };
      mockStorage[STORAGE_KEY_ORDER] = { order: ['hash1'], maxItems: 200, currentSize: 100 };
      const cache = new DeckThumbnailCache();

      await cache.deleteCacheEntry('hash1');

      expect(mockStorage[STORAGE_KEY_INDEX].hash1).toBeUndefined();
      expect(mockStorage[STORAGE_KEY_ORDER]).toMatchObject({ order: [], currentSize: 0 });
    });

    it('存在しないentryはorderだけをfilterする [covers:delete_entry.absent_filters_order_only]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = {};
      mockStorage[STORAGE_KEY_ORDER] = { order: ['missing', 'hash1'], maxItems: 200, currentSize: 100 };
      const cache = new DeckThumbnailCache();

      await cache.deleteCacheEntry('missing');

      expect(mockStorage[STORAGE_KEY_ORDER]).toMatchObject({ order: ['hash1'], currentSize: 100 });
    });

    it('保存エラーは飲み込む [covers:delete_entry.storage_error_swallows]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = { hash1: makeEntry('hash1', 'data:1', 100) };
      mockStorage[STORAGE_KEY_ORDER] = { order: ['hash1'], maxItems: 200, currentSize: 100 };
      vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
        Object.assign(mockStorage, items);
        mockLastError = { message: 'Storage error' };
        callback?.();
        mockLastError = undefined;
      });
      const cache = new DeckThumbnailCache();

      await expect(cache.deleteCacheEntry('hash1')).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to delete cache entry:',
        expect.any(Error)
      );
    });
  });

  describe('clearAll', () => {
    it('メモリをリセットしてstorageを削除する [covers:clear_all.resets_memory_and_removes_storage]', async () => {
      mockStorage[STORAGE_KEY_INDEX] = { hash1: makeEntry('hash1', 'data:1', 100) };
      mockStorage[STORAGE_KEY_ORDER] = { order: ['hash1'], maxItems: 200, currentSize: 100 };
      const cache = new DeckThumbnailCache(50);
      await cache.loadCacheIndex();
      await cache.loadCacheOrder();

      await cache.clearAll();

      expect(mockStorage[STORAGE_KEY_INDEX]).toBeUndefined();
      expect(mockStorage[STORAGE_KEY_ORDER]).toBeUndefined();
      expect(cache.getCacheStats()).toMatchObject({ itemCount: 0, totalSize: 0, maxItems: 50 });
    });

    it('remove例外は飲み込む [covers:clear_all.remove_error_swallows]', async () => {
      vi.mocked(chrome.storage.local.remove).mockImplementation(() => {
        throw new Error('Remove error');
      });
      const cache = new DeckThumbnailCache();

      await expect(cache.clearAll()).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeckThumbnailCache] Failed to clear cache:',
        expect.any(Error)
      );
    });
  });
});
