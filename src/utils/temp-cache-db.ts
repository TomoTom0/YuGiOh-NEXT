/**
 * 一時的なカード情報キャッシュ（UnifiedCacheDBのラッパー）
 *
 * 注意: このモジュールは後方互換性のために残されています。
 * 新しいコードでは getUnifiedCacheDB() を直接使用してください。
 */

import type { CardInfo } from '../types/card';
import { getUnifiedCacheDB, initUnifiedCacheDB, saveUnifiedCacheDB } from './unified-cache-db';

// 初期化待機用のプロミス
let initPromise: Promise<void> | null = null;

/**
 * 初期化を待機してから処理を実行
 */
async function withInit<T>(fn: () => T): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const unifiedDB = getUnifiedCacheDB();
    if (!unifiedDB.isInitialized()) {
      if (!initPromise) {
        initPromise = initUnifiedCacheDB();
      }
      await initPromise;
    }
  }
  return fn();
}

/**
 * カード情報を取得
 * @param cid カードID
 * @returns カード情報、存在しない場合はundefined
 */
export function getTempCacheDB() {
  const unifiedDB = getUnifiedCacheDB();
  return {
    get: (cid: string): CardInfo | undefined => unifiedDB.getCardInfo(cid),
    set: (cid: string, card: CardInfo, forceUpdate: boolean = false): boolean => {
      // 注意: 同期版は初期化待機できないため、既に初期化済みの場合のみ使用可能
      // 未初期化の場合は非同期版の setAsync を使用すること
      if (!unifiedDB.isInitialized() && typeof chrome !== 'undefined' && chrome.storage?.local) {
        console.warn('[TempCacheDB] set() called before initialization, data may be lost. Use setAsync() instead.');
        // 非同期で初期化してから保存を試みる（後続の呼び出しで救済される可能性）
        // initPromiseを使用して初期化が一度だけ実行されることを保証
        if (!initPromise) {
          initPromise = initUnifiedCacheDB();
        }
        initPromise.then(() => {
          unifiedDB.setCardInfoFull(cid, card, forceUpdate);
        }).catch(err => {
          // テスト環境ではエラーを無視
        });
        return false;
      }
      return unifiedDB.setCardInfoFull(cid, card, forceUpdate);
    },
    setAsync: (cid: string, card: CardInfo, forceUpdate: boolean = false): Promise<boolean> => {
      // 初期化を待機してから保存
      return withInit(() => unifiedDB.setCardInfoFull(cid, card, forceUpdate));
    },
    has: (cid: string): boolean => unifiedDB.hasCardInfo(cid),
    delete: (cid: string): boolean => {
      // 現在は実装されていないため、何もしない
      console.warn('[TempCacheDB] delete() is not implemented');
      return false;
    },
    clear: (): void => unifiedDB.clearCardInfoCache(),
    get size(): number {
      // 現在は実装されていない
      console.warn('[TempCacheDB] size is not implemented');
      return 0;
    },
    keys: (): IterableIterator<string> => {
      // 現在は実装されていない
      console.warn('[TempCacheDB] keys() is not implemented');
      return [][Symbol.iterator]();
    },
    values: function* (): IterableIterator<CardInfo> {
      // 現在は実装されていない
      console.warn('[TempCacheDB] values() is not implemented');
    },
    entries: function* (): IterableIterator<[string, CardInfo]> {
      // 現在は実装されていない
      console.warn('[TempCacheDB] entries() is not implemented');
    },
    getImageHash: (cid: string, ciid: string): string | undefined => {
      const card = unifiedDB.getCardInfo(cid);
      if (!card) return undefined;
      const imgInfo = card.imgs.find(img => img.ciid === ciid);
      return imgInfo?.imgHash;
    },
    setMany: (cards: Array<[string, CardInfo]>, forceUpdate: boolean = false): void => {
      for (const [cid, card] of cards) {
        unifiedDB.setCardInfoFull(cid, card, forceUpdate);
      }
    },
    toMap: (): Map<string, CardInfo> => {
      // 現在は実装されていない
      console.warn('[TempCacheDB] toMap() is not implemented');
      return new Map();
    },
    saveToStorage: async (): Promise<void> => {
      await saveUnifiedCacheDB();
    },
    loadFromStorage: async (): Promise<number> => {
      await initUnifiedCacheDB();
      return 0;
    },
    clearStorage: async (): Promise<void> => {
      await unifiedDB.clearAll();
      unifiedDB.clearCardInfoCache();
    }
  };
}

/**
 * TempCacheDBをリセット
 */
export function resetTempCacheDB(): void {
  const unifiedDB = getUnifiedCacheDB();
  unifiedDB.clearCardInfoCache();
}

/**
 * TempCacheDBをChrome Storageから初期化
 */
export async function initTempCacheDBFromStorage(): Promise<number> {
  await initUnifiedCacheDB();
  return 0;
}

/**
 * TempCacheDBをChrome Storageに保存
 */
export async function saveTempCacheDBToStorage(): Promise<void> {
  await saveUnifiedCacheDB();
}

/**
 * Chrome Storageのカードキャッシュをクリア
 */
export async function clearTempCacheDBStorage(): Promise<void> {
  const unifiedDB = getUnifiedCacheDB();
  await unifiedDB.clearAll();
  unifiedDB.clearCardInfoCache();
}

/**
 * デッキオープンを記録（Tier 5管理用）
 */
export function recordDeckOpen(dno: number, cardIds: string[]): void {
  const unifiedDB = getUnifiedCacheDB();
  if (unifiedDB.isInitialized()) {
    unifiedDB.recordDeckOpen(dno, cardIds);
  }
}

/**
 * カードのTier値を取得
 */
export function getCardTier(cardId: string): number {
  const unifiedDB = getUnifiedCacheDB();
  if (unifiedDB.isInitialized()) {
    return unifiedDB.getCardTier(cardId);
  }
  return 0;
}

/**
 * UnifiedCacheDBの統計情報を取得
 */
export function getCacheStats(): {
  cardTierCount: number;
  deckHistoryCount: number;
  cardTableACount: number;
  cardTableBCount: number;
  productTableACount: number;
  faqTableACount: number;
} | null {
  const unifiedDB = getUnifiedCacheDB();
  if (unifiedDB.isInitialized()) {
    return unifiedDB.getStats();
  }
  return null;
}
