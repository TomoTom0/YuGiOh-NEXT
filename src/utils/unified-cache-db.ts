/**
 * 統合キャッシュDB
 * Tierベースでカード情報を管理し、使用頻度に応じてキャッシュの保持・破棄を制御
 */

import type {
  CardTier,
  DeckOpenHistory,
  CardTableA,
  CardTableB,
  CardTableB2,
  CardTableC,
  ProductTableA,
  ProductTableB,
  FAQTableA,
  FAQTableB,
  CardInfo
} from '../types/card';
import { safeStorageGet, safeStorageSet } from './extension-context-checker';
import { detectLanguage } from './language-detector';

// 定数
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

// ストレージキー
const STORAGE_KEYS = {
  cardTier: 'cardTierTable',
  deckOpenHistory: 'deckOpenHistory',
  cardTableA: 'cardTableA',
  cardTableB: 'cardTableB',
  cardTableB2: 'cardTableB2',
  productTableA: 'productTableA',
  productTableB: 'productTableB',
  faqTableA: 'faqTableA',
  faqTableB: 'faqTableB',
  lastCleanupAt: 'lastCleanupAt',
  // CardTableC, ProductTableB, FAQTableBは個別キー形式
  cardTableCPrefix: 'cardTableC:',
  // move history (for deck edit actions)
  moveHistory: 'moveHistory',
  productTableBPrefix: 'productTableB:',
  faqTableBPrefix: 'faqTableB:'
} as const;

// クリーンアップ間隔（24時間）
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Tier計算ロジック
 * @param tierData カードのTierデータ
 * @param deckHistory デッキオープン履歴
 * @returns 計算されたTier値 (0-5)
 */
export function calculateTier(
  tierData: CardTier,
  deckHistory: DeckOpenHistory
): number {
  const now = Date.now();

  // Tier 5: 直近5回で開いたデッキに含まれるカード
  const isTier5 = deckHistory.recentDecks.some(deck =>
    deck.cardIds.includes(tierData.cardId)
  );
  if (isTier5) return 5;

  // デッキ追加 or 詳細表示
  const detailAge = now - Math.max(tierData.lastAddedToDeck, tierData.lastShownDetail);
  if (detailAge < ONE_WEEK) return 4;
  if (detailAge < ONE_MONTH) return 3;

  // 検索表示
  const searchAge = now - tierData.lastSearched;
  if (searchAge < ONE_WEEK) return 2;
  if (searchAge < ONE_MONTH) return 1;

  return 0;
}

/**
 * 統合キャッシュDBクラス
 */
export class UnifiedCacheDB {
  // メモリ内データ
  private cardTierTable: Map<string, CardTier> = new Map();
  private deckOpenHistory: DeckOpenHistory = { recentDecks: [] };
  private cardTableA: Map<string, CardTableA> = new Map();
  private cardTableB: Map<string, CardTableB> = new Map();
  private cardTableB2: Map<string, CardTableB2> = new Map();
  private productTableA: Map<string, ProductTableA> = new Map();
  private productTableB: Map<string, ProductTableB> = new Map();
  private faqTableA: Map<string, FAQTableA> = new Map();
  private faqTableB: Map<string, FAQTableB> = new Map();

  // CardTableCはメモリにはキャッシュしない（個別キーで遅延読み込み）
  private cardTableCCache: Map<string, CardTableC> = new Map();

  // Move history for undo/redo
  private moveHistory: any[] = [];

  private cacheTTL: number = DEFAULT_CACHE_TTL;
  private initialized: boolean = false;

  // =========================================
  // 初期化・ロード
  // =========================================

  /**
   * 起動時の初期化（CardTier + TableA + TableB をロード）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      this.loadCardTierTable(),
      this.loadDeckOpenHistory(),
      this.loadCardTableA(),
      this.loadCardTableB(),
      this.loadCardTableB2(),
      this.loadProductTableA(),
      this.loadFAQTableA(),
      this.loadMoveHistory()
    ]);

    this.initialized = true;

    // 自動クリーンアップチェック
    await this.checkAndRunCleanup();
  }

  /**
   * 最終クリーンアップ時刻をチェックし、必要なら実行
   */
  private async checkAndRunCleanup(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.lastCleanupAt);
      const lastCleanupAt = result[STORAGE_KEYS.lastCleanupAt] as number | undefined;
      const now = Date.now();

      // 前回クリーンアップから24時間以上経過していれば実行
      if (!lastCleanupAt || (now - lastCleanupAt) > CLEANUP_INTERVAL) {
        await this.cleanup();
        await chrome.storage.local.set({ [STORAGE_KEYS.lastCleanupAt]: now });
      }
    } catch (error) {
      console.error('[UnifiedCacheDB] Auto cleanup failed:', error);
    }
  }

  private async loadCardTierTable(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.cardTier);
    const data = result[STORAGE_KEYS.cardTier];
    if (data && typeof data === 'object') {
      this.cardTierTable = new Map(Object.entries(data));
    }
  }

  private async loadDeckOpenHistory(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.deckOpenHistory);
    const data = result[STORAGE_KEYS.deckOpenHistory] as DeckOpenHistory | undefined;
    if (data) {
      this.deckOpenHistory = data;
    }
  }

  private async loadCardTableA(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.cardTableA);
    const data = result[STORAGE_KEYS.cardTableA];
    if (data && typeof data === 'object') {
      this.cardTableA = new Map(Object.entries(data));
    }
  }

  private async loadCardTableB(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.cardTableB);
    const data = result[STORAGE_KEYS.cardTableB];
    if (data && typeof data === 'object') {
      this.cardTableB = new Map(Object.entries(data));
    }
  }

  private async loadCardTableB2(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.cardTableB2);
    const data = result[STORAGE_KEYS.cardTableB2];
    if (data && typeof data === 'object') {
      this.cardTableB2 = new Map(Object.entries(data));
    }
  }

  private async loadProductTableA(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.productTableA);
    const data = result[STORAGE_KEYS.productTableA];
    if (data && typeof data === 'object') {
      this.productTableA = new Map(Object.entries(data));
    }
  }

  private async loadFAQTableA(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.faqTableA);
    const data = result[STORAGE_KEYS.faqTableA];
    if (data && typeof data === 'object') {
      this.faqTableA = new Map(Object.entries(data));
    }
  }

  private async loadMoveHistory(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.moveHistory);
      const data = result[STORAGE_KEYS.moveHistory];
      if (Array.isArray(data)) {
        this.moveHistory = data;
      }
    } catch (e) {
      // ignore
    }
  }

  // =========================================
  // 保存
  // =========================================

  /**
   * 全データをストレージに保存
   */
  async saveAll(): Promise<void> {
    await Promise.all([
      this.saveCardTierTable(),
      this.saveDeckOpenHistory(),
      this.saveCardTableA(),
      this.saveCardTableB(),
      this.saveCardTableB2(),
      this.saveProductTableA(),
      this.saveFAQTableA()
      , this.saveMoveHistory()
    ]);
  }

  private async saveMoveHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.moveHistory]: this.moveHistory });
    } catch (e) {
      // ignore
    }
  }

  private async saveCardTierTable(): Promise<void> {
    const data = Object.fromEntries(this.cardTierTable);
    await chrome.storage.local.set({ [STORAGE_KEYS.cardTier]: data });
  }

  private async saveDeckOpenHistory(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.deckOpenHistory]: this.deckOpenHistory });
  }

  private async saveCardTableA(): Promise<void> {
    const data = Object.fromEntries(this.cardTableA);
    await chrome.storage.local.set({ [STORAGE_KEYS.cardTableA]: data });
  }

  private async saveCardTableB(): Promise<void> {
    const data = Object.fromEntries(this.cardTableB);
    await chrome.storage.local.set({ [STORAGE_KEYS.cardTableB]: data });
  }

  private async saveCardTableB2(): Promise<void> {
    const data = Object.fromEntries(this.cardTableB2);
    await chrome.storage.local.set({ [STORAGE_KEYS.cardTableB2]: data });
  }

  private async saveProductTableA(): Promise<void> {
    const data = Object.fromEntries(this.productTableA);
    await chrome.storage.local.set({ [STORAGE_KEYS.productTableA]: data });
  }

  private async saveFAQTableA(): Promise<void> {
    const data = Object.fromEntries(this.faqTableA);
    await chrome.storage.local.set({ [STORAGE_KEYS.faqTableA]: data });
  }

  // =========================================
  // カード操作
  // =========================================

  /**
   * カードの基本情報を取得（TableA + TableB）
   */
  getCardBasicInfo(cardId: string): { tableA?: CardTableA; tableB?: CardTableB } {
    return {
      tableA: this.cardTableA.get(cardId),
      tableB: this.cardTableB.get(cardId)
    };
  }

  // move history APIs
  recordMove(entry: { action: string; cardId?: string; from?: string; to?: string; uuid?: string; info?: any }) {
    const record = { ...entry, ts: Date.now() };
    this.moveHistory.push(record);
    // cap history to last 1000 entries
    if (this.moveHistory.length > 1000) this.moveHistory.splice(0, this.moveHistory.length - 1000);
    // persist asynchronously
    this.saveMoveHistory().catch(() => {});
  }

  getMoveHistory(limit?: number) {
    if (typeof limit === 'number') return this.moveHistory.slice(-limit);
    return [...this.moveHistory];
  }

  clearMoveHistory() {
    this.moveHistory = [];
    this.saveMoveHistory().catch(() => {});
  }

  /**
   * CardInfoからTableA/Bを生成して保存
   */
  setCardInfo(card: CardInfo, forceUpdate: boolean = false): boolean {
    const now = Date.now();
    const existing = this.cardTableA.get(card.cardId);

    // 言語を取得（CardInfo.langまたはドキュメントから）
    const lang = card.lang || detectLanguage(document);

    // 言語ごとの TTLチェック
    if (existing && !forceUpdate) {
      const langFetchedAt = existing.langsFetchedAt?.[lang] || existing.fetchedAt;
      if (langFetchedAt) {
        const age = now - langFetchedAt;
        if (age < this.cacheTTL) {
          return false;
        }
      }
    }

    // 既存のlangsNameを取得（旧形式のnameもサポート）
    let langsName = existing?.langsName || {};
    if (!existing?.langsName && existing?.name) {
      // 旧形式のnameから langsName に変換（マイグレーション）
      langsName = { [lang]: existing.name };
    }

    // 既存の langsImgs を取得（旧形式のimgsもサポート）
    let langsImgs = existing?.langsImgs || {};
    if (!existing?.langsImgs && existing?.imgs) {
      // 旧形式のimgsから langsImgs に変換（マイグレーション）
      langsImgs = { [lang]: existing.imgs };
    }

    // 既存の langs_ciids を取得（言語ごとの利用可能ciidリスト）
    let langs_ciids = existing?.langs_ciids || {};

    // 現在の言語で利用可能なciidを抽出してマージ
    if (card.imgs && card.imgs.length > 0) {
      const currentCiids = card.imgs.map(img => img.ciid);
      // 既存のciidと新しいciidをマージ（重複を排除）
      const existingCiids = langs_ciids[lang] || [];
      const mergedCiids = Array.from(new Set([...existingCiids, ...currentCiids]));
      langs_ciids = {
        ...langs_ciids,
        [lang]: mergedCiids
      };
    }

    // 既存の langsFetchedAt を取得
    const langsFetchedAt = existing?.langsFetchedAt || {};

    // TableA
    const tableA: CardTableA = {
      cardId: card.cardId,
      langsName: {
        ...langsName,
        [lang]: card.name
      },
      ruby: card.ruby,
      langsImgs: {
        ...langsImgs,
        [lang]: card.imgs
      },
      imgs: card.imgs,  // フォールバック用（古いコードとの互換性）
      langs_ciids,  // 言語ごとの利用可能ciidリスト
      langsFetchedAt: {
        ...langsFetchedAt,
        [lang]: now
      },
      fetchedAt: existing?.fetchedAt || now
    };
    this.cardTableA.set(card.cardId, tableA);

    // TableB
    const tableB: CardTableB = {
      cardId: card.cardId,
      cardType: card.cardType,
      limitRegulation: card.limitRegulation,
      fetchedAt: now
    };

    // モンスター固有フィールド
    if (card.cardType === 'monster') {
      tableB.attribute = card.attribute;
      tableB.race = card.race;
      tableB.levelType = card.levelType;
      tableB.levelValue = card.levelValue;
      tableB.atk = typeof card.atk === 'number' ? card.atk : null;
      tableB.def = typeof card.def === 'number' ? card.def : null;
      tableB.linkMarkers = card.linkMarkers;
      tableB.scale = card.pendulumScale;
      tableB.isExtraDeck = card.isExtraDeck;
      tableB.types = card.types;
    } else {
      // 魔法・罠
      tableB.effectType = card.effectType;
    }

    this.cardTableB.set(card.cardId, tableB);

    // TableB2 (langsText, langsPendText)
    const cardAny = card as any;
    if (cardAny.text || cardAny.pendulumText) {
      const existingB2 = this.cardTableB2.get(card.cardId);

      // 既存のlangsTextを取得（旧形式のtextもサポート）
      let langsText = existingB2?.langsText || {};
      if (!existingB2?.langsText && existingB2?.text) {
        // 旧形式のtextから langsText に変換（マイグレーション）
        langsText = { [lang]: existingB2.text };
      }
      if (cardAny.text) {
        langsText = { ...langsText, [lang]: cardAny.text };
      }

      // 既存のlangsPendTextを取得（旧形式のpendTextもサポート）
      let langsPendText = existingB2?.langsPendText || {};
      if (!existingB2?.langsPendText && existingB2?.pendText) {
        // 旧形式のpendTextから langsPendText に変換（マイグレーション）
        langsPendText = { [lang]: existingB2.pendText };
      }
      if (cardAny.pendulumText) {
        langsPendText = { ...langsPendText, [lang]: cardAny.pendulumText };
      }

      // 既存の langsFetchedAt を取得
      const langsFetchedAt = existingB2?.langsFetchedAt || {};

      const tableB2: CardTableB2 = {
        cardId: card.cardId,
        langsText: Object.keys(langsText).length > 0 ? langsText : undefined,
        langsPendText: Object.keys(langsPendText).length > 0 ? langsPendText : undefined,
        langsFetchedAt: {
          ...langsFetchedAt,
          [lang]: now
        },
        fetchedAt: existingB2?.fetchedAt || now
      };
      this.cardTableB2.set(card.cardId, tableB2);
    }

    // Tierテーブル更新（検索表示として記録）
    this.updateCardTier(card.cardId, { lastSearched: now });

    return true;
  }

  /**
   * CardTableCを取得（遅延読み込み）
   */
  async getCardTableC(cardId: string): Promise<CardTableC | undefined> {
    // メモリキャッシュを確認
    if (this.cardTableCCache.has(cardId)) {
      return this.cardTableCCache.get(cardId);
    }

    // ストレージから読み込み
    const key = STORAGE_KEYS.cardTableCPrefix + cardId;
    const result = await safeStorageGet(key);
    const data = result[key] as CardTableC | undefined;
    if (data) {
      this.cardTableCCache.set(cardId, data);
      return data;
    }

    return undefined;
  }

  /**
   * CardTableCを保存
   */
  async setCardTableC(data: CardTableC): Promise<void> {
    const now = Date.now();
    data.fetchedAt = now;

    // メモリキャッシュに保存
    this.cardTableCCache.set(data.cardId, data);

    // ストレージに保存
    const key = STORAGE_KEYS.cardTableCPrefix + data.cardId;
    await safeStorageSet({ [key]: data });

    // Tierテーブル更新（詳細表示として記録）
    this.updateCardTier(data.cardId, { lastShownDetail: now });
  }

  /**
   * CardTableCのfetchedAtのみを更新
   * キャッシュヒット時に呼び出す
   */
  async updateCardTableCFetchedAt(cardId: string): Promise<void> {
    const cached = this.cardTableCCache.get(cardId);
    if (!cached) {
      // メモリにない場合はストレージから読み込み
      const key = STORAGE_KEYS.cardTableCPrefix + cardId;
      const result = await chrome.storage.local.get(key);
      const data = result[key] as CardTableC | undefined;
      if (data) {
        data.fetchedAt = Date.now();
        this.cardTableCCache.set(cardId, data);
        await chrome.storage.local.set({ [key]: data });
      }
      return;
    }

    // メモリキャッシュとストレージの両方を更新
    const now = Date.now();
    cached.fetchedAt = now;
    const key = STORAGE_KEYS.cardTableCPrefix + cardId;
    await chrome.storage.local.set({ [key]: cached });

    // Tierテーブルも更新
    this.updateCardTier(cardId, { lastShownDetail: now });
  }

  // =========================================
  // Tier管理
  // =========================================

  /**
   * カードのTierを更新
   */
  updateCardTier(
    cardId: string,
    updates: Partial<Omit<CardTier, 'cardId'>>
  ): void {
    const existing = this.cardTierTable.get(cardId) || {
      cardId,
      lastAddedToDeck: 0,
      lastShownDetail: 0,
      lastSearched: 0
    };

    this.cardTierTable.set(cardId, {
      ...existing,
      ...updates
    });
  }

  /**
   * デッキをオープンした記録を追加
   */
  recordDeckOpen(dno: number, cardIds: string[]): void {
    const now = Date.now();

    // 同じdnoが既にあれば削除
    this.deckOpenHistory.recentDecks = this.deckOpenHistory.recentDecks.filter(
      deck => deck.dno !== dno
    );

    // 先頭に追加
    this.deckOpenHistory.recentDecks.unshift({
      dno,
      openedAt: now,
      cardIds
    });

    // 5件を超えたら削除
    if (this.deckOpenHistory.recentDecks.length > 5) {
      this.deckOpenHistory.recentDecks = this.deckOpenHistory.recentDecks.slice(0, 5);
    }

    // デッキ内カードのTierを更新
    for (const cardId of cardIds) {
      this.updateCardTier(cardId, { lastAddedToDeck: now });
    }
  }

  /**
   * カードのTier値を取得
   */
  getCardTier(cardId: string): number {
    const tierData = this.cardTierTable.get(cardId);
    if (!tierData) return 0;
    return calculateTier(tierData, this.deckOpenHistory);
  }

  // =========================================
  // Product操作
  // =========================================

  /**
   * パック基本情報を取得
   */
  getProductA(packId: string): ProductTableA | undefined {
    return this.productTableA.get(packId);
  }

  /**
   * パック基本情報を保存
   */
  setProductA(data: ProductTableA): void {
    data.fetchedAt = Date.now();
    this.productTableA.set(data.packId, data);
  }

  /**
   * パック詳細情報を取得（遅延読み込み）
   */
  async getProductB(packId: string): Promise<ProductTableB | undefined> {
    // メモリキャッシュを確認
    if (this.productTableB.has(packId)) {
      return this.productTableB.get(packId);
    }

    // ストレージから読み込み
    const key = STORAGE_KEYS.productTableBPrefix + packId;
    const result = await chrome.storage.local.get(key);
    const data = result[key] as ProductTableB | undefined;
    if (data) {
      this.productTableB.set(packId, data);
      return data;
    }

    return undefined;
  }

  /**
   * パック詳細情報を保存
   */
  async setProductB(data: ProductTableB): Promise<void> {
    data.fetchedAt = Date.now();
    this.productTableB.set(data.packId, data);

    const key = STORAGE_KEYS.productTableBPrefix + data.packId;
    await chrome.storage.local.set({ [key]: data });
  }

  // =========================================
  // FAQ操作
  // =========================================

  /**
   * FAQ質問情報を取得
   */
  getFAQA(faqId: string): FAQTableA | undefined {
    const data = this.faqTableA.get(faqId);
    if (data) {
      // アクセス時刻を更新
      data.lastAccessedAt = Date.now();
    }
    return data;
  }

  /**
   * FAQ質問情報を保存
   */
  setFAQA(data: FAQTableA): void {
    const now = Date.now();
    data.fetchedAt = now;
    data.lastAccessedAt = now;
    this.faqTableA.set(data.faqId, data);
  }

  /**
   * FAQ回答情報を取得（遅延読み込み）
   */
  async getFAQB(faqId: string): Promise<FAQTableB | undefined> {
    // メモリキャッシュを確認
    if (this.faqTableB.has(faqId)) {
      const data = this.faqTableB.get(faqId)!;
      data.lastAccessedAt = Date.now();
      return data;
    }

    // ストレージから読み込み
    const key = STORAGE_KEYS.faqTableBPrefix + faqId;
    const result = await chrome.storage.local.get(key);
    const data = result[key] as FAQTableB | undefined;
    if (data) {
      data.lastAccessedAt = Date.now();
      this.faqTableB.set(faqId, data);
      return data;
    }

    return undefined;
  }

  /**
   * FAQ回答情報を保存
   */
  async setFAQB(data: FAQTableB): Promise<void> {
    const now = Date.now();
    data.fetchedAt = now;
    data.lastAccessedAt = now;
    this.faqTableB.set(data.faqId, data);

    const key = STORAGE_KEYS.faqTableBPrefix + data.faqId;
    await chrome.storage.local.set({ [key]: data });
  }

  // =========================================
  // クリーンアップ
  // =========================================

  /**
   * キャッシュのクリーンアップ処理
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    // 1. CardTierの再計算とTier判定
    const tier0Cards: string[] = [];
    const tier2OrLessCards: string[] = [];

    for (const [cardId, tierData] of this.cardTierTable.entries()) {
      const tier = calculateTier(tierData, this.deckOpenHistory);
      if (tier === 0) {
        tier0Cards.push(cardId);
      }
      if (tier <= 2) {
        tier2OrLessCards.push(cardId);
      }
    }

    // 2. CardTierからTier 0を削除
    for (const cardId of tier0Cards) {
      this.cardTierTable.delete(cardId);
    }

    // 3. CardTableCからTier 2以下を削除
    const keysToRemove: string[] = [];
    for (const cardId of tier2OrLessCards) {
      this.cardTableCCache.delete(cardId);
      keysToRemove.push(STORAGE_KEYS.cardTableCPrefix + cardId);
    }
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }

    // 4. FAQテーブルのクリーンアップ（アクセス時刻ベース）
    const expiredFaqIds: string[] = [];
    for (const [faqId, data] of this.faqTableA.entries()) {
      if (now - data.lastAccessedAt > ONE_MONTH) {
        expiredFaqIds.push(faqId);
      }
    }

    for (const faqId of expiredFaqIds) {
      this.faqTableA.delete(faqId);
      this.faqTableB.delete(faqId);
    }

    // FAQTableBのストレージからも削除
    const faqKeysToRemove = expiredFaqIds.map(id => STORAGE_KEYS.faqTableBPrefix + id);
    if (faqKeysToRemove.length > 0) {
      await chrome.storage.local.remove(faqKeysToRemove);
    }

    // 5. 保存
    await this.saveAll();
  }

  /**
   * 全キャッシュをクリア
   */
  async clearAll(): Promise<void> {
    // メモリクリア
    this.cardTierTable.clear();
    this.deckOpenHistory = { recentDecks: [] };
    this.cardTableA.clear();
    this.cardTableB.clear();
    this.productTableA.clear();
    this.productTableB.clear();
    this.faqTableA.clear();
    this.faqTableB.clear();
    this.cardTableCCache.clear();

    // ストレージクリア（Cache DB関連キーのみ削除、設定は保護）
    const keysToRemove = [
      STORAGE_KEYS.cardTier,
      STORAGE_KEYS.deckOpenHistory,
      STORAGE_KEYS.cardTableA,
      STORAGE_KEYS.cardTableB,
      STORAGE_KEYS.cardTableB2,
      STORAGE_KEYS.productTableA,
      STORAGE_KEYS.productTableB,
      STORAGE_KEYS.faqTableA,
      STORAGE_KEYS.faqTableB,
      STORAGE_KEYS.moveHistory,
      STORAGE_KEYS.lastCleanupAt
    ];

    // プレフィックス付きキーの削除（cardTableC:*, productTableB:*, faqTableB:*）
    const allStorage = await chrome.storage.local.get();
    const prefixedKeysToRemove = Object.keys(allStorage).filter(
      key =>
        key.startsWith(STORAGE_KEYS.cardTableCPrefix) ||
        key.startsWith(STORAGE_KEYS.productTableBPrefix) ||
        key.startsWith(STORAGE_KEYS.faqTableBPrefix)
    );

    await chrome.storage.local.remove([...keysToRemove, ...prefixedKeysToRemove]);
  }

  // =========================================
  // ユーティリティ
  // =========================================

  /**
   * TableA+BからCardInfoを再構築
   * @param cardId カードID
   * @returns CardInfo（基本情報のみ、text等は含まない）
   */
  reconstructCardInfo(cardId: string): CardInfo | undefined {
    const tableA = this.cardTableA.get(cardId);
    const tableB = this.cardTableB.get(cardId);

    if (!tableA || !tableB) {
      console.debug(`[reconstructCardInfo] Missing tableA or tableB for cardId=${cardId}`);
      return undefined;
    }

    // 言語を取得（ドキュメントから）
    const lang = detectLanguage(document);

    // langsNameから適切な言語を抽出（新形式）
    let name: string | undefined;
    if (tableA.langsName && tableA.langsName[lang]) {
      name = tableA.langsName[lang];
    } else if (tableA.langsName) {
      // 指定言語がない場合は最初の言語を使用
      const firstLang = Object.keys(tableA.langsName)[0];
      name = firstLang ? tableA.langsName[firstLang] : undefined;
    } else if (tableA.name) {
      // フォールバック: 旧形式のnameを使用（互換性保持）
      name = tableA.name;
    }

    if (!name) {
      console.warn(`[reconstructCardInfo] No name found for cardId=${cardId}, langsName=${JSON.stringify(tableA.langsName)}, name=${tableA.name}`);
      return undefined;
    }

    // langsImgsから適切な言語の画像情報を抽出（新形式）
    let imgs: Array<{ciid: string; imgHash: string}>;
    if (tableA.langsImgs && tableA.langsImgs[lang]) {
      imgs = tableA.langsImgs[lang];
    } else if (tableA.langsImgs) {
      // 指定言語がない場合は最初の言語を使用
      const firstLang = Object.keys(tableA.langsImgs)[0];
      imgs = firstLang ? tableA.langsImgs[firstLang] : tableA.imgs || [];
    } else {
      // フォールバック: 旧形式のimgsを使用（互換性保持）
      imgs = tableA.imgs || [];
    }

    if (!imgs || imgs.length === 0) {
      console.warn(`[reconstructCardInfo] No images found for cardId=${cardId}, langsImgs=${JSON.stringify(tableA.langsImgs)}, imgs=${tableA.imgs}`);
      return undefined;
    }

    // 基本情報
    const baseInfo = {
      cardId: tableA.cardId,
      name,
      lang,
      imgs,
      ciid: imgs[0]?.ciid || '',
      ruby: tableA.ruby,
      limitRegulation: tableB.limitRegulation
    };

    // カードタイプに応じて構築
    let resultCard: CardInfo
    if (tableB.cardType === 'monster') {
      resultCard = {
        ...baseInfo,
        cardType: 'monster',
        attribute: tableB.attribute || 'dark',
        race: tableB.race || 'warrior',
        levelType: tableB.levelType || 'level',
        levelValue: tableB.levelValue || 1,
        types: tableB.types || [],
        atk: tableB.atk ?? undefined,
        def: tableB.def ?? undefined,
        linkMarkers: tableB.linkMarkers,
        pendulumScale: tableB.scale,
        isExtraDeck: tableB.isExtraDeck || false
      } as CardInfo;
    } else if (tableB.cardType === 'spell') {
      resultCard = {
        ...baseInfo,
        cardType: 'spell',
        effectType: tableB.effectType
      } as CardInfo;
    } else {
      resultCard = {
        ...baseInfo,
        cardType: 'trap',
        effectType: tableB.effectType
      } as CardInfo;
    }

    // TableB2からlangsText/langsPendTextをマージ
    const tableB2 = this.cardTableB2.get(cardId);
    if (tableB2) {
      const anyCard: any = resultCard as any;

      // langsTextから適切な言語を抽出（新形式）
      if (tableB2.langsText) {
        if (tableB2.langsText[lang]) {
          anyCard.text = tableB2.langsText[lang];
        } else {
          const firstLang = Object.keys(tableB2.langsText)[0];
          if (firstLang) anyCard.text = tableB2.langsText[firstLang];
        }
      } else if (tableB2.text) {
        // フォールバック: 旧形式のtextを使用（互換性保持）
        anyCard.text = tableB2.text;
      }

      // langsPendTextから適切な言語を抽出（新形式）
      if (tableB2.langsPendText) {
        if (tableB2.langsPendText[lang]) {
          anyCard.pendulumText = tableB2.langsPendText[lang];
        } else {
          const firstLang = Object.keys(tableB2.langsPendText)[0];
          if (firstLang) anyCard.pendulumText = tableB2.langsPendText[firstLang];
        }
      } else if (tableB2.pendText) {
        // フォールバック: 旧形式のpendTextを使用（互換性保持）
        anyCard.pendulumText = tableB2.pendText;
      }
    }

    // Synchronous merge: if CardTableC for this card is present in the in-memory cache,
    // copy detail fields into the reconstructed CardInfo.
    // This is purely in-memory (Map lookup) and does not perform async storage access,
    // so it introduces negligible latency.
    try {
      const tableC = this.cardTableCCache.get(cardId)
      if (tableC) {
        // TableCにはtext/pendTextは含まれなくなったので、ここでは何もしない
        // 将来的にTableCに他のフィールドが追加されたらここでマージ
      }
    } catch (e) {
      // Defensive: don't break reconstruction on merge errors
    }

    return resultCard
  }

  /**
   * 全カードIDを取得
   */
  getAllCardIds(): string[] {
    return Array.from(this.cardTableA.keys());
  }

  /**
   * 指定した言語で利用可能なciidのリストを取得
   */
  getValidCiidsForLang(cardId: string, lang: string): string[] {
    const tableA = this.cardTableA.get(cardId);
    if (!tableA?.langs_ciids) return [];
    return tableA.langs_ciids[lang] || [];
  }

  /**
   * 全CardInfoを再構築して取得
   * @returns Map<cardId, CardInfo>
   */
  getAllCardInfos(): Map<string, CardInfo> {
    const result = new Map<string, CardInfo>();
    for (const cardId of this.cardTableA.keys()) {
      const cardInfo = this.reconstructCardInfo(cardId);
      if (cardInfo) {
        result.set(cardId, cardInfo);
      }
    }
    return result;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    cardTierCount: number;
    deckHistoryCount: number;
    cardTableACount: number;
    cardTableBCount: number;
    productTableACount: number;
    faqTableACount: number;
  } {
    return {
      cardTierCount: this.cardTierTable.size,
      deckHistoryCount: this.deckOpenHistory.recentDecks.length,
      cardTableACount: this.cardTableA.size,
      cardTableBCount: this.cardTableB.size,
      productTableACount: this.productTableA.size,
      faqTableACount: this.faqTableA.size
    };
  }

  /**
   * 初期化済みかどうか
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// シングルトンインスタンス
let instance: UnifiedCacheDB | null = null;

/**
 * UnifiedCacheDBのシングルトンインスタンスを取得
 */
export function getUnifiedCacheDB(): UnifiedCacheDB {
  if (!instance) {
    instance = new UnifiedCacheDB();
  }
  return instance;
}

/**
 * UnifiedCacheDBを初期化
 */
export async function initUnifiedCacheDB(): Promise<void> {
  const db = getUnifiedCacheDB();
  await db.initialize();
}

/**
 * UnifiedCacheDBを保存
 */
export async function saveUnifiedCacheDB(): Promise<void> {
  const db = getUnifiedCacheDB();
  await db.saveAll();
}

/**
 * UnifiedCacheDBのクリーンアップを実行
 */
export async function cleanupUnifiedCacheDB(): Promise<void> {
  const db = getUnifiedCacheDB();
  await db.cleanup();
}

/**
 * UnifiedCacheDBをリセット
 */
export function resetUnifiedCacheDB(): void {
  if (instance) {
    instance.clearAll();
  }
  instance = new UnifiedCacheDB();
}
