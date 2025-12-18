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

/**
 * カード移動履歴エントリ
 */
interface MoveHistoryEntry {
  action: string;
  cardId?: string;
  from?: string;
  to?: string;
  uuid?: string;
  info?: unknown;
  ts: number;
}

// 定数
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

// ストレージキー
export const STORAGE_KEYS = {
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
  private moveHistory: MoveHistoryEntry[] = [];

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
    // 現在のメモリ内データ
    const memoryData = Object.fromEntries(this.cardTableA);

    // Chrome Storage の既存データを読み込み
    const storageData = await safeStorageGet(STORAGE_KEYS.cardTableA) as Record<string, CardTableA>;

    // cardId ごとに langsImgs と langs_ciids をマージ
    const mergedData: Record<string, CardTableA> = { ...memoryData };

    for (const [cardId, memoryRecord] of Object.entries(memoryData)) {
      const storageRecord = storageData?.[cardId];

      if (storageRecord) {
        // 既存レコードがある場合、Chrome Storage の langsImgs をベースにする
        const mergedLangsImgs = { ...storageRecord.langsImgs };

        // Chrome Storage の langs_ciids をベースにする
        const mergedLangsCiids = { ...storageRecord.langs_ciids };

        // Chrome Storage の langsRuby をベースにする
        const mergedLangsRuby = { ...storageRecord.langsRuby, ...memoryRecord.langsRuby };

        // メモリのlangsImgsで各言語の imgs を確認
        for (const [lang, memoryImgs] of Object.entries(memoryRecord.langsImgs || {})) {
          const storageImgs = mergedLangsImgs[lang] || [];

          if (memoryImgs && memoryImgs.length > 0) {
            if (storageImgs.length > 0) {
              // 既存の imgs に新しい ciid が含まれるかで判定
              const existingCiidSet = new Set(storageImgs.map(img => img.ciid));
              const newImgs = memoryImgs.filter(img => !existingCiidSet.has(img.ciid));

              // 新しい ciid があれば追加（既存 imgs は保持）
              if (newImgs.length > 0) {
                mergedLangsImgs[lang] = [...storageImgs, ...newImgs];
              }
            } else {
              // 既存 imgs がなければメモリのimgsをそのまま使用
              mergedLangsImgs[lang] = memoryImgs;
            }
          }
        }

        // メモリの langs_ciids で各言語の ciid リストを確認
        for (const [lang, memoryCiids] of Object.entries(memoryRecord.langs_ciids || {})) {
          const storageCiids = mergedLangsCiids[lang] || [];

          if (memoryCiids && memoryCiids.length > 0) {
            // 既存の ciids と新しい ciids をマージ（重複を排除）
            const mergedCiids = Array.from(new Set([...storageCiids, ...memoryCiids]));
            mergedLangsCiids[lang] = mergedCiids;
          }
        }

        // langsImgs、langs_ciids、langsRuby をマージして、他は新しいデータで上書き
        mergedData[cardId] = {
          ...memoryRecord,
          langsImgs: mergedLangsImgs,
          langs_ciids: mergedLangsCiids,
          langsRuby: mergedLangsRuby
        };
      }
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.cardTableA]: mergedData });
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
  recordMove(entry: Omit<MoveHistoryEntry, 'ts'>) {
    const record: MoveHistoryEntry = { ...entry, ts: Date.now() };
    this.moveHistory.push(record);
    // cap history to last 1000 entries
    if (this.moveHistory.length > 1000) this.moveHistory.splice(0, this.moveHistory.length - 1000);
    // persist asynchronously
    this.saveMoveHistory().catch(err => {
      console.error('[UnifiedCacheDB] Failed to save move history:', err);
    });
  }

  getMoveHistory(limit?: number) {
    if (typeof limit === 'number') return this.moveHistory.slice(-limit);
    return [...this.moveHistory];
  }

  clearMoveHistory() {
    this.moveHistory = [];
    this.saveMoveHistory().catch(err => {
      console.error('[UnifiedCacheDB] Failed to clear move history:', err);
    });
  }

  /**
   * CardInfoからTableA/Bを生成して保存
   */
  setCardInfo(card: CardInfo, forceUpdate: boolean = false): boolean {
    const now = Date.now();
    const existing = this.cardTableA.get(card.cardId);

    // 言語を取得（CardInfo.langまたはドキュメントから）
    const lang = card.lang || detectLanguage(document);

    // 既存の langs_ciids を取得（言語ごとの利用可能ciidリスト）
    let langs_ciids = existing?.langs_ciids || {};
    const existingCiids = langs_ciids[lang] || [];

    // 新しいciidが存在するかチェック
    let hasNewCiids = false;
    if (card.imgs && card.imgs.length > 0) {
      const currentCiids = card.imgs.map(img => img.ciid);
      hasNewCiids = currentCiids.some(ciid => !existingCiids.includes(ciid));
    }

    // 言語ごとの TTLチェック
    if (existing && !forceUpdate && !hasNewCiids) {
      // 既にこの言語で取得済みで、新しいciidがない場合のみ TTL チェック
      const langFetchedAt = existing.langsFetchedAt?.[lang];
      if (langFetchedAt !== undefined) {
        const age = now - langFetchedAt;
        if (age < this.cacheTTL) {
          return false;  // キャッシュ有効
        }
      }
      // langsFetchedAt[lang] が存在しない場合（新規言語）は、新規取得 (true を返す)
    }

    // 既存のlangsNameを取得
    const langsName = existing?.langsName || {};

    // 既存の langsImgs を取得
    const langsImgs = existing?.langsImgs || {};

    // 現在の言語で利用可能なciidを抽出してマージ
    let mergedCiids: string[] = existingCiids;
    if (card.imgs && card.imgs.length > 0) {
      const currentCiids = card.imgs.map(img => img.ciid);
      // 既存のciidと新しいciidをマージ（重複を排除）
      mergedCiids = Array.from(new Set([...existingCiids, ...currentCiids]));
      langs_ciids = {
        ...langs_ciids,
        [lang]: mergedCiids
      };
    }

    // 既存の langsImgs を取得
    const existingImgs = langsImgs[lang] || [];

    // 新しいciidに対応するimgをマージ（既存のimgと統合）
    let mergedImgs = existingImgs;
    if (card.imgs && card.imgs.length > 0) {
      // 既存のimgのciid一覧を取得
      const existingCiidSet = new Set(existingImgs.map(img => img.ciid));
      
      // 新しいimgを追加（既に存在しない場合のみ）
      const newImgs = card.imgs.filter(img => !existingCiidSet.has(img.ciid));
      mergedImgs = [...existingImgs, ...newImgs];
    }

    // 既存の langsFetchedAt を取得
    const langsFetchedAt = existing?.langsFetchedAt || {};

    // 既存の langsRuby を取得
    const langsRuby = existing?.langsRuby || {};

    // TableA
    const tableA: CardTableA = {
      cardId: card.cardId,
      langsName: {
        ...langsName,
        [lang]: card.name
      },
      langsRuby: card.ruby ? {
        ...langsRuby,
        [lang]: card.ruby
      } : langsRuby,  // ルビがない場合は既存のlangsRubyを保持
      langsImgs: {
        ...langsImgs,
        [lang]: mergedImgs
      },
      langs_ciids,  // 言語ごとの利用可能ciidリスト
      langsFetchedAt: {
        ...langsFetchedAt,
        [lang]: now
      }
    };
    this.cardTableA.set(card.cardId, tableA);

    // TableB
    const existingB = this.cardTableB.get(card.cardId);
    
    // 既存の langsLimitRegulation を取得
    let langsLimitRegulation = existingB?.langsLimitRegulation || {};
    if (card.limitRegulation) {
      langsLimitRegulation = {
        ...langsLimitRegulation,
        [lang]: card.limitRegulation
      };
    }

    const tableB: CardTableB = {
      cardId: card.cardId,
      cardType: card.cardType,
      langsLimitRegulation
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

      // 既存のlangsTextを取得
      let langsText = existingB2?.langsText || {};
      if (cardAny.text) {
        langsText = { ...langsText, [lang]: cardAny.text };
      }

      // 既存のlangsPendTextを取得
      let langsPendText = existingB2?.langsPendText || {};
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
        }
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
   * @param data 保存するCardTableC
   * @param lang 言語コード（未指定時はドキュメントから検出）
   */
  async setCardTableC(data: CardTableC, lang?: string): Promise<void> {
    const now = Date.now();
    const targetLang = lang || detectLanguage(document);

    // 既存のデータを取得
    const existing = this.cardTableCCache.get(data.cardId) ||
      (await this.getCardTableC(data.cardId));

    // 既存の言語別データをマージ
    const langsFetchedAt = existing?.langsFetchedAt || {};
    const langsRelatedCards = existing?.langsRelatedCards || {};
    const langsRelatedProducts = existing?.langsRelatedProducts || {};
    const langsRelatedProductDetail = existing?.langsRelatedProductDetail || {};

    // 言語ごとのデータを更新（既存データをマージ）
    data.langsFetchedAt = {
      ...langsFetchedAt,
      [targetLang]: now
    };

    // 言語別関連カードをマージ（新規データで該当言語を上書き）
    if (data.langsRelatedCards) {
      data.langsRelatedCards = {
        ...langsRelatedCards,
        ...data.langsRelatedCards
      };
    } else {
      data.langsRelatedCards = langsRelatedCards;
    }

    // 言語別関連製品をマージ（新規データで該当言語を上書き）
    if (data.langsRelatedProducts) {
      data.langsRelatedProducts = {
        ...langsRelatedProducts,
        ...data.langsRelatedProducts
      };
    } else {
      data.langsRelatedProducts = langsRelatedProducts;
    }

    // 言語別パック詳細情報をマージ（新規データで該当言語を上書き）
    if (data.langsRelatedProductDetail) {
      data.langsRelatedProductDetail = {
        ...langsRelatedProductDetail,
        ...data.langsRelatedProductDetail
      };
    } else {
      data.langsRelatedProductDetail = langsRelatedProductDetail;
    }

    // メモリキャッシュに保存
    this.cardTableCCache.set(data.cardId, data);

    // ストレージに保存
    const key = STORAGE_KEYS.cardTableCPrefix + data.cardId;
    await safeStorageSet({ [key]: data });

    // Tierテーブル更新（詳細表示として記録）
    this.updateCardTier(data.cardId, { lastShownDetail: now });
  }

  /**
   * CardTableCの言語別fetchedAtを更新
   * キャッシュヒット時に呼び出す
   * @param cardId カードID
   * @param lang 言語コード（未指定時はドキュメントから検出）
   */
  async updateCardTableCFetchedAt(cardId: string, lang?: string): Promise<void> {
    const now = Date.now();
    const targetLang = lang || detectLanguage(document);

    const cached = this.cardTableCCache.get(cardId);
    if (!cached) {
      // メモリにない場合はストレージから読み込み
      const key = STORAGE_KEYS.cardTableCPrefix + cardId;
      const result = await chrome.storage.local.get(key);
      const data = result[key] as CardTableC | undefined;
      if (data) {
        // 既存の langsFetchedAt を取得
        const langsFetchedAt = data.langsFetchedAt || {};
        // 言語ごとのfetchedAtを更新（langsFetchedAtのみ使用）
        data.langsFetchedAt = {
          ...langsFetchedAt,
          [targetLang]: now
        };
        this.cardTableCCache.set(cardId, data);
        await chrome.storage.local.set({ [key]: data });
      }
      return;
    }

    // メモリキャッシュとストレージの両方を更新
    // 既存の langsFetchedAt を取得
    const langsFetchedAt = cached.langsFetchedAt || {};
    // 言語ごとのfetchedAtを更新（langsFetchedAtのみ使用）
    cached.langsFetchedAt = {
      ...langsFetchedAt,
      [targetLang]: now
    };

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
  reconstructCardInfo(cardId: string, lang?: string): CardInfo | undefined {
    const tableA = this.cardTableA.get(cardId);
    const tableB = this.cardTableB.get(cardId);

    if (!tableA || !tableB) {
      return undefined;
    }

    // 言語を取得（パラメータで指定されていればそれを使用、なければドキュメントから）
    const targetLang = lang || detectLanguage(document);

    // langsNameから適切な言語を抽出（新形式）
    // 重要: 指定言語が存在しない場合はフォールバックせず undefined を返す
    // これにより呼び出し元で API から再取得できる
    const name = tableA.langsName?.[targetLang];

    if (!name) {
      console.debug(`[reconstructCardInfo] Language (${targetLang}) not found in cache for cardId=${cardId}, will re-fetch from API`);
      return undefined;
    }

    // langsImgsから適切な言語の画像情報を抽出（新形式）
    // 重要: 指定言語が存在しない場合はフォールバックせず undefined を返す
    const imgs = tableA.langsImgs?.[targetLang];

    if (!imgs || imgs.length === 0) {
      console.debug(`[reconstructCardInfo] Language (${targetLang}) not found in langsImgs for cardId=${cardId}, will re-fetch from API`);
      return undefined;
    }

    // langsLimitRegulationから言語別の禁止制限を取得
    const limitRegulation = tableB.langsLimitRegulation?.[targetLang];

    // 基本情報
    const baseInfo = {
      cardId: tableA.cardId,
      name,
      lang: targetLang,
      imgs,
      ciid: imgs[0]?.ciid || '',
      ruby: tableA.langsRuby?.[targetLang],
      limitRegulation
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
      // langsTextから適切な言語を抽出（新形式）
      const text = tableB2.langsText?.[targetLang];
      if (text) {
        resultCard.text = text;
      }

      // langsPendTextから適切な言語を抽出（新形式）
      const pendulumText = tableB2.langsPendText?.[targetLang];
      if (pendulumText) {
        resultCard.pendulumText = pendulumText;
      }
    }

    // Synchronous merge: if CardTableC for this card is present in the in-memory cache,
    // copy detail fields into the reconstructed CardInfo.
    // This is purely in-memory (Map lookup) and does not perform async storage access,
    // so it introduces negligible latency.
    try {
      const tableC = this.cardTableCCache.get(cardId)
      if (tableC) {
        // CardTableCの補足情報をマージ
        if (tableC.supplInfo !== undefined) resultCard.supplInfo = tableC.supplInfo
        if (tableC.supplDate !== undefined) resultCard.supplDate = tableC.supplDate
        if (tableC.pendSupplInfo !== undefined) resultCard.pendSupplInfo = tableC.pendSupplInfo
        if (tableC.pendSupplDate !== undefined) resultCard.pendSupplDate = tableC.pendSupplDate
      }
    } catch (e) {
      // Defensive: don't break reconstruction on merge errors
    }

    return resultCard
  }

  /**
   * CardTableCがマージされているか確認
   */
  hasCardTableC(cardId: string): boolean {
    return this.cardTableCCache.has(cardId);
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
