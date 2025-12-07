/**
 * DeckThumbnailCache - デッキサムネイルのキャッシュ管理
 *
 * Chrome Storage Localにサムネイル画像（WebP形式）をLRU戦略で管理
 * - 上限個数: 200個（デフォルト）
 * - 容量目安: 10MB（1画像50KB × 200個）
 * - 削除ポリシー: 最後のアクセス時刻が最も古いものから削除
 */

interface CacheEntry {
  dno: number;                    // デッキ番号
  name: string;                   // デッキ名
  hash: string;                   // デッキハッシュ（並び順ベース）
  imageDataUrl: string;           // WebP画像のData URL
  imageSize: number;              // 画像サイズ（バイト）
  lastAccessTime: number;         // 最終アクセス時刻（Unix timestamp）
  createdTime: number;            // 作成時刻（Unix timestamp）
}

interface CacheIndex {
  [deckHash: string]: CacheEntry;
}

interface CacheOrder {
  order: string[];                // [hash1, hash2, ...] 古い順
  maxItems: number;               // 上限個数
  currentSize: number;            // 現在の画像合計サイズ（バイト）
}

const STORAGE_KEY_INDEX = 'ygo_deck_thumbnail_index';
const STORAGE_KEY_ORDER = 'ygo_deck_thumbnail_order';
const DEFAULT_MAX_ITEMS = 200;
const MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class DeckThumbnailCache {
  private maxItems: number;
  private cacheIndex: CacheIndex = {};
  private cacheOrder: CacheOrder = {
    order: [],
    maxItems: DEFAULT_MAX_ITEMS,
    currentSize: 0,
  };

  constructor(maxItems: number = DEFAULT_MAX_ITEMS) {
    this.maxItems = maxItems;
    this.cacheOrder.maxItems = maxItems;
  }

  /**
   * キャッシュインデックスを読み込む
   */
  async loadCacheIndex(): Promise<CacheIndex> {
    try {
      const result = await this.chromeSafeStorageGet(STORAGE_KEY_INDEX);
      if (result && result[STORAGE_KEY_INDEX]) {
        this.cacheIndex = result[STORAGE_KEY_INDEX] as CacheIndex;
      }
    } catch (error) {
      console.warn('[DeckThumbnailCache] Failed to load cache index:', error);
    }
    return this.cacheIndex;
  }

  /**
   * キャッシュ順序を読み込む
   */
  async loadCacheOrder(): Promise<CacheOrder> {
    try {
      const result = await this.chromeSafeStorageGet(STORAGE_KEY_ORDER);
      if (result && result[STORAGE_KEY_ORDER]) {
        this.cacheOrder = result[STORAGE_KEY_ORDER] as CacheOrder;
      }
    } catch (error) {
      console.warn('[DeckThumbnailCache] Failed to load cache order:', error);
    }
    return this.cacheOrder;
  }

  /**
   * キャッシュから画像を取得
   * @param hash デッキハッシュ
   * @returns WebP画像のData URL、またはnull
   */
  async getImage(hash: string): Promise<string | null> {
    await this.loadCacheIndex();
    await this.loadCacheOrder();

    const entry = this.cacheIndex[hash];
    if (!entry) {
      return null;
    }

    // 最終アクセス時刻を更新
    try {
      await this.updateAccessTime(hash);
    } catch (error) {
      console.warn('[DeckThumbnailCache] Failed to update access time:', error);
    }

    return entry.imageDataUrl;
  }

  /**
   * キャッシュに画像を保存
   * @param hash デッキハッシュ
   * @param dno デッキ番号
   * @param name デッキ名
   * @param imageDataUrl WebP画像のData URL
   */
  async saveImage(
    hash: string,
    dno: number,
    name: string,
    imageDataUrl: string
  ): Promise<void> {
    await this.loadCacheIndex();
    await this.loadCacheOrder();

    // 画像サイズを推定（Data URLから）
    const imageSize = imageDataUrl.length;

    const entry: CacheEntry = {
      dno,
      name,
      hash,
      imageDataUrl,
      imageSize,
      lastAccessTime: Date.now(),
      createdTime: Date.now(),
    };

    // 既存エントリを削除（サイズ計算用）
    if (this.cacheIndex[hash]) {
      this.cacheOrder.currentSize -= this.cacheIndex[hash].imageSize;
    }

    // 新しいエントリを追加
    this.cacheIndex[hash] = entry;
    this.cacheOrder.currentSize += imageSize;

    // キャッシュ順序に追加（オーダー配列に存在しない場合）
    if (!this.cacheOrder.order.includes(hash)) {
      this.cacheOrder.order.push(hash);
    }

    // 容量チェック・LRU削除
    await this.enforceMaxItems();

    // ストレージに保存
    try {
      await this.chromeSafeStorageSet(STORAGE_KEY_INDEX, this.cacheIndex);
      await this.chromeSafeStorageSet(STORAGE_KEY_ORDER, this.cacheOrder);
    } catch (error) {
      console.error('[DeckThumbnailCache] Failed to save cache:', error);
      throw error;
    }
  }

  /**
   * キャッシュエントリを削除
   * @param hash デッキハッシュ
   */
  async deleteCacheEntry(hash: string): Promise<void> {
    await this.loadCacheIndex();
    await this.loadCacheOrder();

    if (this.cacheIndex[hash]) {
      this.cacheOrder.currentSize -= this.cacheIndex[hash].imageSize;
      delete this.cacheIndex[hash];
    }

    // オーダー配列から削除
    this.cacheOrder.order = this.cacheOrder.order.filter((h) => h !== hash);

    // ストレージに保存
    try {
      await this.chromeSafeStorageSet(STORAGE_KEY_INDEX, this.cacheIndex);
      await this.chromeSafeStorageSet(STORAGE_KEY_ORDER, this.cacheOrder);
    } catch (error) {
      console.error('[DeckThumbnailCache] Failed to delete cache entry:', error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  async clearAll(): Promise<void> {
    this.cacheIndex = {};
    this.cacheOrder = {
      order: [],
      maxItems: this.maxItems,
      currentSize: 0,
    };

    try {
      await chrome.storage.local.remove([STORAGE_KEY_INDEX, STORAGE_KEY_ORDER]);
    } catch (error) {
      console.error('[DeckThumbnailCache] Failed to clear cache:', error);
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats(): {
    itemCount: number;
    totalSize: number;
    maxItems: number;
    maxSize: number;
  } {
    return {
      itemCount: Object.keys(this.cacheIndex).length,
      totalSize: this.cacheOrder.currentSize,
      maxItems: this.maxItems,
      maxSize: MAX_CACHE_SIZE_BYTES,
    };
  }

  /**
   * 容量チェック・LRU削除（private）
   */
  private async enforceMaxItems(): Promise<void> {
    // アイテム数チェック
    while (this.cacheOrder.order.length > this.maxItems) {
      const oldestHash = this.cacheOrder.order.shift();
      if (oldestHash && this.cacheIndex[oldestHash]) {
        this.cacheOrder.currentSize -= this.cacheIndex[oldestHash].imageSize;
        delete this.cacheIndex[oldestHash];
      }
    }

    // 総サイズチェック
    while (this.cacheOrder.currentSize > MAX_CACHE_SIZE_BYTES) {
      const oldestHash = this.cacheOrder.order.shift();
      if (oldestHash && this.cacheIndex[oldestHash]) {
        this.cacheOrder.currentSize -= this.cacheIndex[oldestHash].imageSize;
        delete this.cacheIndex[oldestHash];
      } else {
        break; // 削除できるものがない
      }
    }
  }

  /**
   * 最終アクセス時刻を更新（private）
   */
  private async updateAccessTime(hash: string): Promise<void> {
    const entry = this.cacheIndex[hash];
    if (entry) {
      entry.lastAccessTime = Date.now();

      // オーダー配列を更新（最後に移動）
      this.cacheOrder.order = this.cacheOrder.order.filter((h) => h !== hash);
      this.cacheOrder.order.push(hash);

      try {
        await this.chromeSafeStorageSet(STORAGE_KEY_INDEX, this.cacheIndex);
        await this.chromeSafeStorageSet(STORAGE_KEY_ORDER, this.cacheOrder);
      } catch (error) {
        console.warn('[DeckThumbnailCache] Failed to update access time in storage:', error);
      }
    }
  }

  /**
   * Chrome Storage.local.get のPromise版
   */
  private chromeSafeStorageGet(key: string): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Chrome Storage.local.set のPromise版
   */
  private chromeSafeStorageSet(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
}

// グローバルインスタンス
export const deckThumbnailCache = new DeckThumbnailCache();
