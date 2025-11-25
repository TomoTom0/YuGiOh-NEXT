/**
 * 一時的なカード情報データベース
 * デッキ編集中のセッションでカード情報を一元管理する
 * Chrome Storageを使用してキャッシュを永続化する
 * UnifiedCacheDBと連携してTierベースのキャッシュ管理を行う
 */

import type { CardInfo } from '../types/card';
import { getUnifiedCacheDB, initUnifiedCacheDB, saveUnifiedCacheDB } from './unified-cache-db';

// キャッシュの有効期限（ミリ秒）- デフォルト24時間
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000;

// キャッシュされたカード情報（タイムスタンプ付き）
interface CachedCardInfo {
  card: CardInfo;
  lastUpdated: number; // Unix timestamp in milliseconds
}

/**
 * TempCardDB - カード情報の一時的なキャッシュ
 * cidをキーとしてCardInfoを保持する
 * キャッシュの有効期限を管理し、一定時間経過後のみ更新を許可
 */
export class TempCardDB {
  private cards: Map<string, CachedCardInfo> = new Map();
  private cacheTTL: number = DEFAULT_CACHE_TTL;

  /**
   * キャッシュの有効期限を設定
   * @param ttl 有効期限（ミリ秒）
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * カード情報を取得
   * @param cid カードID
   * @returns カード情報、存在しない場合はundefined
   */
  get(cid: string): CardInfo | undefined {
    const cached = this.cards.get(cid);
    return cached?.card;
  }

  /**
   * カード情報を設定
   * キャッシュが有効期限内の場合は更新しない
   * @param cid カードID
   * @param card カード情報
   * @param forceUpdate 強制更新フラグ（デフォルト: false）
   * @returns 更新された場合true、スキップされた場合false
   */
  set(cid: string, card: CardInfo, forceUpdate: boolean = false): boolean {
    const existing = this.cards.get(cid);
    const now = Date.now();

    // 既存のキャッシュがあり、有効期限内の場合はスキップ
    if (existing && !forceUpdate) {
      const age = now - existing.lastUpdated;
      if (age < this.cacheTTL) {
        // キャッシュは有効期限内なので更新しない
        return false;
      }
    }

    // 新規追加または有効期限切れなので更新
    this.cards.set(cid, {
      card,
      lastUpdated: now
    });

    // UnifiedCacheDBにも登録（Tier管理用）
    const unifiedDB = getUnifiedCacheDB();
    if (unifiedDB.isInitialized()) {
      unifiedDB.setCardInfo(card, forceUpdate);
    }

    return true;
  }

  /**
   * カード情報が存在するか確認
   * @param cid カードID
   * @returns 存在する場合true
   */
  has(cid: string): boolean {
    return this.cards.has(cid);
  }

  /**
   * カード情報を削除
   * @param cid カードID
   * @returns 削除された場合true
   */
  delete(cid: string): boolean {
    return this.cards.delete(cid);
  }

  /**
   * 全てのカード情報をクリア
   */
  clear(): void {
    this.cards.clear();
  }

  /**
   * 保持しているカード数を取得
   */
  get size(): number {
    return this.cards.size;
  }

  /**
   * 全てのカードIDを取得
   */
  keys(): IterableIterator<string> {
    return this.cards.keys();
  }

  /**
   * 全てのカード情報を取得
   */
  *values(): IterableIterator<CardInfo> {
    for (const cached of this.cards.values()) {
      yield cached.card;
    }
  }

  /**
   * 全てのエントリを取得
   */
  *entries(): IterableIterator<[string, CardInfo]> {
    for (const [cid, cached] of this.cards.entries()) {
      yield [cid, cached.card];
    }
  }

  /**
   * DeckCardRefから画像URLを取得するためのヘルパー
   * @param cid カードID
   * @param ciid 画像識別子
   * @returns 画像ハッシュ、見つからない場合はundefined
   */
  getImageHash(cid: string, ciid: string): string | undefined {
    const cached = this.cards.get(cid);
    if (!cached) return undefined;

    const imgInfo = cached.card.imgs.find(img => img.ciid === ciid);
    return imgInfo?.imgHash;
  }

  /**
   * 複数のカード情報を一括登録
   * @param cards cidとCardInfoのペア配列
   * @param forceUpdate 強制更新フラグ（デフォルト: false）
   */
  setMany(cards: Array<[string, CardInfo]>, forceUpdate: boolean = false): void {
    for (const [cid, card] of cards) {
      this.set(cid, card, forceUpdate);
    }
  }

  /**
   * Map形式でエクスポート（デバッグ用）
   */
  toMap(): Map<string, CardInfo> {
    const result = new Map<string, CardInfo>();
    for (const [cid, cached] of this.cards.entries()) {
      result.set(cid, cached.card);
    }
    return result;
  }

  /**
   * UnifiedCacheDBに現在のキャッシュを保存
   * @returns Promise<void>
   */
  async saveToStorage(): Promise<void> {
    try {
      // UnifiedCacheDBのみに保存（TempCardDBのデータはset()時に既に同期済み）
      await saveUnifiedCacheDB();
      console.log(`[TempCardDB] Saved to UnifiedCacheDB (${this.cards.size} cards in session)`);
    } catch (error) {
      console.error('[TempCardDB] Failed to save to storage:', error);
      throw error;
    }
  }

  /**
   * UnifiedCacheDBからキャッシュを読み込む
   * @returns Promise<number> 読み込んだカード数
   */
  async loadFromStorage(): Promise<number> {
    try {
      // UnifiedCacheDBを初期化
      await initUnifiedCacheDB();

      // UnifiedCacheDBからCardInfoを再構築して読み込む
      const unifiedDB = getUnifiedCacheDB();
      const allCardInfos = unifiedDB.getAllCardInfos();
      const now = Date.now();

      this.cards.clear();

      for (const [cardId, cardInfo] of allCardInfos) {
        // Try to load CardTableC (detail) and merge text/pendulum info if available
        let mergedCard = { ...cardInfo } as any
        try {
          const tableC = await unifiedDB.getCardTableC(cardId)
          if (tableC) {
            if (tableC.text) mergedCard.text = tableC.text
            if (tableC.pendText) mergedCard.pendulumEffect = tableC.pendText
          }
        } catch (e) {
          // ignore
        }

        // 全てを現在時刻でキャッシュ（UnifiedCacheDBから再構築されたため）。
        this.cards.set(cardId, {
          card: mergedCard,
          lastUpdated: now
        });
      }

      console.log(`[TempCardDB] Loaded ${this.cards.size} cards from UnifiedCacheDB`);
      return this.cards.size;
    } catch (error) {
      console.error('[TempCardDB] Failed to load from storage:', error);
      return 0;
    }
  }

  /**
   * キャッシュをクリア（UnifiedCacheDB経由）
   * @returns Promise<void>
   */
  async clearStorage(): Promise<void> {
    try {
      const unifiedDB = getUnifiedCacheDB();
      await unifiedDB.clearAll();
      this.cards.clear();
      console.log('[TempCardDB] Cleared all cache');
    } catch (error) {
      console.error('[TempCardDB] Failed to clear storage:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス（デッキ編集セッション用）
let instance: TempCardDB | null = null;

/**
 * TempCardDBのシングルトンインスタンスを取得
 */
export function getTempCardDB(): TempCardDB {
  if (!instance) {
    instance = new TempCardDB();
  }
  return instance;
}

/**
 * TempCardDBのシングルトンインスタンスをリセット
 * 新しいデッキを読み込む際などに使用
 */
export function resetTempCardDB(): void {
  if (instance) {
    instance.clear();
  }
  instance = new TempCardDB();
}

/**
 * TempCardDBをChrome Storageから初期化
 * アプリ起動時に呼び出す
 * @returns Promise<number> 読み込んだカード数
 */
export async function initTempCardDBFromStorage(): Promise<number> {
  const db = getTempCardDB();
  return await db.loadFromStorage();
}

/**
 * TempCardDBをChrome Storageに保存
 * デッキ変更後やセッション終了時に呼び出す
 * @returns Promise<void>
 */
export async function saveTempCardDBToStorage(): Promise<void> {
  const db = getTempCardDB();
  await db.saveToStorage();
}

/**
 * Chrome Storageのカードキャッシュをクリア
 * @returns Promise<void>
 */
export async function clearTempCardDBStorage(): Promise<void> {
  const db = getTempCardDB();
  await db.clearStorage();
}

/**
 * デッキオープンを記録（Tier 5管理用）
 * @param dno デッキ番号
 * @param cardIds デッキ内のカードID一覧
 */
export function recordDeckOpen(dno: number, cardIds: string[]): void {
  const unifiedDB = getUnifiedCacheDB();
  if (unifiedDB.isInitialized()) {
    unifiedDB.recordDeckOpen(dno, cardIds);
  }
}

/**
 * カードのTier値を取得
 * @param cardId カードID
 * @returns Tier値（0-5）
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
