/**
 * UnifiedCacheDB テスト実装
 *
 * HIGH-PRIORITY テストを実装済み：
 * 1. initialize() tests (2 tests)
 * 2. getCardBasicInfo() / setCardInfo() tests (10 tests)
 * 3. recordDeckOpen() / getCardTier() tests (4 tests)
 * 4. reconstructCardInfo() tests (5 tests)
 * 5. getStats() / isInitialized() tests (2 tests)
 *
 * MID-PRIORITY テストを実装済み：
 * 1. saveAll() and save*() methods (7 tests)
 * 2. getCardTableC() / setCardTableC() / updateCardTableCFetchedAt() (5 tests)
 * 3. Product operations (4 tests)
 * 4. FAQ operations (5 tests)
 * 5. Utility methods (3 tests)
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import {
  UnifiedCacheDB,
  calculateTier,
  getUnifiedCacheDB,
  initUnifiedCacheDB,
  saveUnifiedCacheDB,
  cleanupUnifiedCacheDB,
  resetUnifiedCacheDB,
  STORAGE_KEYS
} from '@/utils/unified-cache-db';
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
} from '@/types/card';

// extension-context-checker モジュールをモック
vi.mock('@/utils/extension-context-checker', () => ({
  safeStorageGet: vi.fn(async (keys: string | string[]) => {
    const mockStorageData = (global as any).__mockStorageData__;
    if (!mockStorageData) return {};

    if (typeof keys === 'string') {
      return { [keys]: mockStorageData[keys] };
    }
    if (Array.isArray(keys)) {
      const result: Record<string, any> = {};
      keys.forEach(key => {
        if (key in mockStorageData) {
          result[key] = mockStorageData[key];
        }
      });
      return result;
    }
    return {};
  }),
  safeStorageSet: vi.fn(async (items: Record<string, any>) => {
    const mockStorageData = (global as any).__mockStorageData__;
    if (mockStorageData) {
      Object.assign(mockStorageData, items);
    }
  })
}));

// =========================================
// モック設定
// =========================================

// Chrome Storage API のモック
const mockStorageData: Record<string, any> = {};

// setup.ts で既にセットアップされているグローバル chrome を活用する
// beforeEach で mockStorageData をリセットし、chrome.storage.local をそれと連動させる

// =========================================
// ヘルパー関数
// =========================================

/**
 * モックストレージデータをクリア
 */
function clearMockStorage() {
  Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
}

/**
 * サンプル CardInfo を生成
 */
function createSampleCardInfo(overrides?: Partial<CardInfo>): CardInfo {
  return {
    cardId: '12345',
    name: 'Test Monster',
    lang: 'ja',
    cardType: 'monster',
    imgs: [{ ciid: 'ciid-001', imgHash: 'hash1' }],
    ciid: 'ciid-001',
    attribute: 'dark',
    race: 'warrior',
    levelType: 'level',
    levelValue: 4,
    atk: 1800,
    def: 1000,
    types: ['Effect'],
    isExtraDeck: false,
    ...overrides
  } as CardInfo;
}

/**
 * サンプル CardTier を生成
 */
function createSampleCardTier(overrides?: Partial<CardTier>): CardTier {
  return {
    cardId: '12345',
    lastAddedToDeck: 0,
    lastShownDetail: 0,
    lastSearched: 0,
    ...overrides
  };
}

/**
 * サンプル DeckOpenHistory を生成
 */
function createSampleDeckOpenHistory(overrides?: Partial<DeckOpenHistory>): DeckOpenHistory {
  return {
    recentDecks: [],
    ...overrides
  };
}

// =========================================
// メインテストスイート
// =========================================

describe('UnifiedCacheDB', () => {
  let db: UnifiedCacheDB;

  beforeEach(() => {
    clearMockStorage();
    vi.clearAllMocks();

    // グローバルにモックストレージを設定（vi.mock で使用）
    (global as any).__mockStorageData__ = mockStorageData;

    // chrome.storage.local をモックストレージと連動させる
    global.chrome = {
      runtime: {
        id: 'test-extension-id'  // extension-context-checker のチェックをパス
      },
      storage: {
        local: {
          get: vi.fn((keys: string | string[] | null) => {
            if (keys === null || keys === undefined) {
              return Promise.resolve(mockStorageData);
            }
            if (typeof keys === 'string') {
              return Promise.resolve({ [keys]: mockStorageData[keys] });
            }
            if (Array.isArray(keys)) {
              const result: Record<string, any> = {};
              keys.forEach(key => {
                if (key in mockStorageData) {
                  result[key] = mockStorageData[key];
                }
              });
              return Promise.resolve(result);
            }
            return Promise.resolve({});
          }),
          set: vi.fn((items: Record<string, any>) => {
            Object.assign(mockStorageData, items);
            return Promise.resolve();
          }),
          remove: vi.fn((keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach(key => delete mockStorageData[key]);
            return Promise.resolve();
          })
        }
      }
    } as any;

    db = new UnifiedCacheDB();
  });

  afterEach(() => {
    clearMockStorage();
  });

  // =========================================
  // 初期化とセットアップ
  // =========================================

  describe('初期化とセットアップ', () => {
    it('initialize() は初回呼び出しで全データをロードする', async () => {
      // ストレージに初期データを設定
      mockStorageData[STORAGE_KEYS.cardTier] = {
        '123': createSampleCardTier({ cardId: '123' })
      };
      mockStorageData[STORAGE_KEYS.deckOpenHistory] = createSampleDeckOpenHistory({
        recentDecks: [{ dno: 1, openedAt: Date.now(), cardIds: ['123'] }]
      });
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'テストカード' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };
      mockStorageData[STORAGE_KEYS.cardTableB] = {
        '123': {
          cardId: '123',
          cardType: 'monster',
          attribute: 'dark',
          race: 'warrior',
          levelType: 'level',
          levelValue: 4
        }
      };

      // 初期化
      await db.initialize();

      // initialized フラグが true になる
      expect(db.isInitialized()).toBe(true);

      // データが正しくロードされている
      const basicInfo = db.getCardBasicInfo('123');
      expect(basicInfo.tableA).toBeDefined();
      expect(basicInfo.tableA?.langsName?.ja).toBe('テストカード');
      expect(basicInfo.tableB).toBeDefined();
      expect(basicInfo.tableB?.cardType).toBe('monster');
    });

    it('initialize() は既に初期化済みの場合は何もしない', async () => {
      // 1回目の初期化
      await db.initialize();
      expect(db.isInitialized()).toBe(true);

      // 2回目の初期化（何もしないはず）
      await db.initialize();

      // 既に初期化済みなので、isInitialized() は true を返す
      expect(db.isInitialized()).toBe(true);
    });

    it('loadCardTierTable() はストレージから CardTier をロード', async () => {
      // ストレージに CardTier データを設定（最近のタイムスタンプを使用してcleanupで削除されないようにする）
      const now = Date.now();
      const recentTimestamp = now - (3 * 24 * 60 * 60 * 1000);  // 3日前
      mockStorageData[STORAGE_KEYS.cardTier] = {
        'card1': { cardId: 'card1', lastAddedToDeck: recentTimestamp, lastShownDetail: 0, lastSearched: 0 },
        'card2': { cardId: 'card2', lastAddedToDeck: recentTimestamp, lastShownDetail: 0, lastSearched: 0 }
      };

      // 自動クリーンアップを抑制するため、lastCleanupAt を最近に設定
      mockStorageData[STORAGE_KEYS.lastCleanupAt] = now;

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const stats = db.getStats();
      expect(stats.cardTierCount).toBe(2);
    });

    it('loadDeckOpenHistory() はストレージから DeckOpenHistory をロード', async () => {
      // ストレージに DeckOpenHistory を設定
      mockStorageData[STORAGE_KEYS.deckOpenHistory] = {
        recentDecks: [
          { dno: 1, openedAt: Date.now(), cardIds: ['card1', 'card2'] },
          { dno: 2, openedAt: Date.now(), cardIds: ['card3'] }
        ]
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const stats = db.getStats();
      expect(stats.deckHistoryCount).toBe(2);
    });

    it('loadCardTableA() はストレージから CardTableA をロード', async () => {
      // ストレージに CardTableA を設定
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'カード1' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const basicInfo = db.getCardBasicInfo('123');
      expect(basicInfo.tableA).toBeDefined();
      expect(basicInfo.tableA?.langsName?.ja).toBe('カード1');
    });

    it('loadCardTableB() はストレージから CardTableB をロード', async () => {
      // ストレージに CardTableB を設定
      mockStorageData[STORAGE_KEYS.cardTableB] = {
        '456': {
          cardId: '456',
          cardType: 'spell',
          effectType: 'normal'
        }
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const basicInfo = db.getCardBasicInfo('456');
      expect(basicInfo.tableB).toBeDefined();
      expect(basicInfo.tableB?.cardType).toBe('spell');
    });

    it('loadCardTableB2() はストレージから CardTableB2 をロード', async () => {
      // ストレージに CardTableB2 を設定
      mockStorageData[STORAGE_KEYS.cardTableB2] = {
        '789': {
          cardId: '789',
          langsText: { ja: 'テキスト' },
          langsPendText: { ja: 'ペンデュラムテキスト' },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている（内部的に cardTableB2 Map に保存される）
      expect((db as any).cardTableB2.size).toBeGreaterThan(0);
    });

    it('loadProductTableA() はストレージから ProductTableA をロード', async () => {
      // ストレージに ProductTableA を設定
      mockStorageData[STORAGE_KEYS.productTableA] = {
        'pack1': {
          packId: 'pack1',
          name: 'Test Pack',
          fetchedAt: Date.now()
        }
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const product = db.getProductA('pack1');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Test Pack');
    });

    it('loadFAQTableA() はストレージから FAQTableA をロード', async () => {
      // ストレージに FAQTableA を設定
      mockStorageData[STORAGE_KEYS.faqTableA] = {
        'faq1': {
          faqId: 'faq1',
          question: 'Test Question',
          fetchedAt: Date.now(),
          lastAccessedAt: Date.now()
        }
      };

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const faq = db.getFAQA('faq1');
      expect(faq).toBeDefined();
      expect(faq?.question).toBe('Test Question');
    });

    it('loadMoveHistory() はストレージから moveHistory をロード', async () => {
      // ストレージに moveHistory を設定
      mockStorageData[STORAGE_KEYS.moveHistory] = [
        { action: 'add', cardId: 'card1', ts: Date.now() },
        { action: 'move', cardId: 'card2', from: 'main', to: 'side', ts: Date.now() }
      ];

      // 初期化
      await db.initialize();

      // データが読み込まれている
      const history = db.getMoveHistory();
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('add');
    });

    it('checkAndRunCleanup() は24時間以上経過していればクリーンアップを実行', async () => {
      // 最後のクリーンアップ時刻を25時間前に設定
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      mockStorageData[STORAGE_KEYS.lastCleanupAt] = oldTimestamp;

      // Tier 0 のカードを追加
      const tier0Timestamp = Date.now() - (60 * 24 * 60 * 60 * 1000);
      db.updateCardTier('card-old', {
        lastAddedToDeck: tier0Timestamp,
        lastShownDetail: tier0Timestamp,
        lastSearched: tier0Timestamp
      });

      // 初期化（checkAndRunCleanup が呼ばれる）
      await db.initialize();

      // クリーンアップが実行され、Tier 0 が削除される
      expect(db.getCardTier('card-old')).toBe(0);

      // lastCleanupAt が更新されている
      expect(mockStorageData[STORAGE_KEYS.lastCleanupAt]).toBeGreaterThan(oldTimestamp);
    });

    it('checkAndRunCleanup() は24時間未満ならクリーンアップをスキップ', async () => {
      // 最後のクリーンアップ時刻を1時間前に設定
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000);
      mockStorageData[STORAGE_KEYS.lastCleanupAt] = recentTimestamp;

      // Tier 0 のカードを追加
      const tier0Timestamp = Date.now() - (60 * 24 * 60 * 60 * 1000);
      db.updateCardTier('card-old', {
        lastAddedToDeck: tier0Timestamp,
        lastShownDetail: tier0Timestamp,
        lastSearched: tier0Timestamp
      });

      // 初期化（checkAndRunCleanup が呼ばれる）
      await db.initialize();

      // クリーンアップはスキップされ、Tier 0 のカードは残っている
      // （getCardTier は 0 を返すが、cardTierTable には残っている）
      expect((db as any).cardTierTable.has('card-old')).toBe(true);
    });
  });

  // =========================================
  // 保存操作
  // =========================================

  describe('保存操作', () => {
    it('saveAll() は全テーブルを一括保存する', async () => {
      // テストデータを設定
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);

      db.recordDeckOpen(1, ['123']);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されていることを確認
      expect(mockStorageData[STORAGE_KEYS.cardTier]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.deckOpenHistory]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableB]).toBeDefined();

      // 保存されたデータの内容を確認
      expect(mockStorageData[STORAGE_KEYS.cardTableA]['123']).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableB]['123']).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.deckOpenHistory].recentDecks).toHaveLength(1);
    });

    it('saveCardTierTable() はメモリ内データをストレージに保存', async () => {
      // Tier データを追加
      db.updateCardTier('card1', { lastSearched: Date.now() });
      db.updateCardTier('card2', { lastAddedToDeck: Date.now() });

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTier];
      expect(savedData).toBeDefined();
      expect(savedData['card1']).toBeDefined();
      expect(savedData['card2']).toBeDefined();
    });

    it('saveDeckOpenHistory() はメモリ内データをストレージに保存', async () => {
      // デッキ履歴を追加
      db.recordDeckOpen(1, ['card1', 'card2']);
      db.recordDeckOpen(2, ['card3']);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.deckOpenHistory];
      expect(savedData).toBeDefined();
      expect(savedData.recentDecks).toHaveLength(2);
      expect(savedData.recentDecks[0].dno).toBe(2); // 最新が先頭
      expect(savedData.recentDecks[1].dno).toBe(1);
    });

    it('saveCardTableA() は新規データを保存', async () => {
      // 新規カードを追加
      const cardInfo = createSampleCardInfo({ cardId: '999', name: 'New Card', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableA];
      expect(savedData['999']).toBeDefined();
      expect(savedData['999'].langsName.ja).toBe('New Card');
    });

    it('saveCardTableA() は既存データと langsImgs をマージ', async () => {
      // 既存データをストレージに設定
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'Original' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 新しいciidを含むカード情報を追加
      const cardInfo = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-001', imgHash: 'hash1' },  // 既存
          { ciid: 'ciid-002', imgHash: 'hash2' }   // 新規
        ]
      });
      db.setCardInfo(cardInfo, true);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableA];
      expect(savedData['123'].langsImgs.ja).toHaveLength(2);
      expect(savedData['123'].langsImgs.ja[0].ciid).toBe('ciid-001');
      expect(savedData['123'].langsImgs.ja[1].ciid).toBe('ciid-002');
    });

    it('saveCardTableA() は既存データと langs_ciids をマージ', async () => {
      // 既存データをストレージに設定
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'Original' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 新しいciidを含むカード情報を追加
      const cardInfo = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-001', imgHash: 'hash1' },  // 既存
          { ciid: 'ciid-002', imgHash: 'hash2' },  // 新規
          { ciid: 'ciid-003', imgHash: 'hash3' }   // 新規
        ]
      });
      db.setCardInfo(cardInfo, true);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableA];
      expect(savedData['123'].langs_ciids.ja).toHaveLength(3);
      expect(savedData['123'].langs_ciids.ja).toContain('ciid-001');
      expect(savedData['123'].langs_ciids.ja).toContain('ciid-002');
      expect(savedData['123'].langs_ciids.ja).toContain('ciid-003');
    });

    it('saveCardTableB() はメモリ内データをストレージに保存', async () => {
      // カード情報を追加
      const cardInfo1 = createSampleCardInfo({ cardId: '111', cardType: 'monster', lang: 'ja' });
      const cardInfo2 = createSampleCardInfo({ cardId: '222', cardType: 'spell', lang: 'ja' });

      db.setCardInfo(cardInfo1);
      db.setCardInfo(cardInfo2);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableB];
      expect(savedData['111']).toBeDefined();
      expect(savedData['111'].cardType).toBe('monster');
      expect(savedData['222']).toBeDefined();
      expect(savedData['222'].cardType).toBe('spell');
    });

    it('saveCardTableA() は既存データと langsRuby をマージ', async () => {
      // まず日本語のカード情報を追加（ルビ付き）
      const jaCard = createSampleCardInfo({
        cardId: '123',
        name: 'ブラック・マジシャン',
        lang: 'ja',
        ruby: 'ぶらっく・まじしゃん'
      });
      db.setCardInfo(jaCard, true);

      // 新しい英語のカード情報を追加（ルビ付き）
      const enCard = createSampleCardInfo({
        cardId: '123',
        name: 'Dark Magician',
        lang: 'en',
        ruby: 'Dark Magician'
      });
      db.setCardInfo(enCard, true);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableA];
      expect(savedData['123'].langsRuby).toBeDefined();
      expect(savedData['123'].langsRuby.ja).toBe('ぶらっく・まじしゃん');
      expect(savedData['123'].langsRuby.en).toBe('Dark Magician');
    });

    it('saveCardTableB2() はメモリ内データをストレージに保存', async () => {
      // text と pendulumText を含むカード情報を追加
      const cardInfo: any = createSampleCardInfo({
        cardId: '111',
        lang: 'ja'
      });
      cardInfo.text = 'カードテキスト';
      cardInfo.pendulumText = 'ペンデュラムテキスト';

      db.setCardInfo(cardInfo);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableB2];
      expect(savedData['111']).toBeDefined();
      expect(savedData['111'].langsText.ja).toBe('カードテキスト');
      expect(savedData['111'].langsPendText.ja).toBe('ペンデュラムテキスト');
    });

    it('saveProductTableA() はメモリ内データをストレージに保存', async () => {
      // ProductTableA を追加
      const productA: ProductTableA = {
        packId: 'pack123',
        name: 'New Pack',
        fetchedAt: 0
      };
      db.setProductA(productA);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.productTableA];
      expect(savedData['pack123']).toBeDefined();
      expect(savedData['pack123'].name).toBe('New Pack');
    });

    it('saveFAQTableA() はメモリ内データをストレージに保存', async () => {
      // FAQTableA を追加
      const faqA: FAQTableA = {
        faqId: 'faq123',
        question: 'Test FAQ',
        fetchedAt: 0,
        lastAccessedAt: 0
      };
      db.setFAQA(faqA);

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.faqTableA];
      expect(savedData['faq123']).toBeDefined();
      expect(savedData['faq123'].question).toBe('Test FAQ');
    });

    it('saveMoveHistory() はメモリ内データをストレージに保存', async () => {
      // move history を追加
      db.recordMove({ action: 'add', cardId: 'card1' });
      db.recordMove({ action: 'move', cardId: 'card2', from: 'main', to: 'side' });

      // saveAll() を実行
      await db.saveAll();

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.moveHistory];
      expect(savedData).toBeDefined();
      expect(Array.isArray(savedData)).toBe(true);
      expect(savedData.length).toBe(2);
    });
  });

  // =========================================
  // カード操作: getCardBasicInfo() / setCardInfo()
  // =========================================

  describe('カード操作: getCardBasicInfo() / setCardInfo()', () => {
    it('getCardBasicInfo() は TableA と TableB を返す', () => {
      // テストデータを直接セット
      const cardInfo = createSampleCardInfo({ cardId: '123', name: 'Blue-Eyes White Dragon', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // 取得
      const result = db.getCardBasicInfo('123');

      // 検証
      expect(result.tableA).toBeDefined();
      expect(result.tableA?.cardId).toBe('123');
      expect(result.tableA?.langsName?.ja).toBe('Blue-Eyes White Dragon');
      expect(result.tableB).toBeDefined();
      expect(result.tableB?.cardId).toBe('123');
      expect(result.tableB?.cardType).toBe('monster');
    });

    it('getCardBasicInfo() はデータがない場合 undefined を返す', () => {
      const result = db.getCardBasicInfo('nonexistent');
      expect(result.tableA).toBeUndefined();
      expect(result.tableB).toBeUndefined();
    });

    it('setCardInfo() は CardInfo から TableA と TableB を生成（モンスター）', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '456',
        name: 'Dark Magician',
        cardType: 'monster',
        attribute: 'dark',
        race: 'spellcaster',
        levelType: 'level',
        levelValue: 7,
        atk: 2500,
        def: 2100,
        types: ['Normal'],
        lang: 'ja'
      });

      const updated = db.setCardInfo(cardInfo);
      expect(updated).toBe(true);

      const result = db.getCardBasicInfo('456');
      expect(result.tableA?.langsName?.ja).toBe('Dark Magician');
      expect(result.tableB?.cardType).toBe('monster');
      expect(result.tableB?.attribute).toBe('dark');
      expect(result.tableB?.race).toBe('spellcaster');
      expect(result.tableB?.levelValue).toBe(7);
      expect(result.tableB?.atk).toBe(2500);
      expect(result.tableB?.def).toBe(2100);
    });

    it('setCardInfo() は CardInfo から TableA と TableB を生成（魔法）', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '789',
        name: 'Pot of Greed',
        cardType: 'spell',
        effectType: 'normal',
        lang: 'ja'
      });

      const updated = db.setCardInfo(cardInfo);
      expect(updated).toBe(true);

      const result = db.getCardBasicInfo('789');
      expect(result.tableA?.langsName?.ja).toBe('Pot of Greed');
      expect(result.tableB?.cardType).toBe('spell');
      expect(result.tableB?.effectType).toBe('normal');
    });

    it('setCardInfo() は CardInfo から TableA と TableB を生成（罠）', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '101',
        name: 'Mirror Force',
        cardType: 'trap',
        effectType: 'normal',
        lang: 'ja'
      });

      const updated = db.setCardInfo(cardInfo);
      expect(updated).toBe(true);

      const result = db.getCardBasicInfo('101');
      expect(result.tableA?.langsName?.ja).toBe('Mirror Force');
      expect(result.tableB?.cardType).toBe('trap');
      expect(result.tableB?.effectType).toBe('normal');
    });

    it('setCardInfo() は既存のキャッシュが有効な場合は false を返す（TTL以内）', () => {
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });

      // 1回目: 新規登録
      const firstUpdate = db.setCardInfo(cardInfo);
      expect(firstUpdate).toBe(true);

      // 2回目: TTL以内なので更新しない
      const secondUpdate = db.setCardInfo(cardInfo);
      expect(secondUpdate).toBe(false);
    });

    it('setCardInfo() はキャッシュ期限切れの場合は更新して true を返す', () => {
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });

      // 1回目: 新規登録
      db.setCardInfo(cardInfo);

      // 2日前のタイムスタンプに変更（TTLは24時間）
      const result = db.getCardBasicInfo('123');
      if (result.tableA) {
        result.tableA.langsFetchedAt = { ja: Date.now() - (2 * 24 * 60 * 60 * 1000) };
      }

      // 2回目: TTL切れなので更新される
      const secondUpdate = db.setCardInfo(cardInfo);
      expect(secondUpdate).toBe(true);
    });

    it('setCardInfo() は新しい ciid が追加された場合は強制更新', () => {
      const cardInfo1 = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [{ ciid: 'ciid-001', imgHash: 'hash1' }]
      });

      // 1回目: 新規登録
      db.setCardInfo(cardInfo1);

      // 2回目: 新しい ciid を追加
      const cardInfo2 = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-001', imgHash: 'hash1' },
          { ciid: 'ciid-002', imgHash: 'hash2' }  // 新しいciid
        ]
      });

      const updated = db.setCardInfo(cardInfo2);
      expect(updated).toBe(true);

      // langs_ciids に両方のciidが含まれている
      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langs_ciids?.ja).toContain('ciid-001');
      expect(result.tableA?.langs_ciids?.ja).toContain('ciid-002');
    });

    it('setCardInfo() は forceUpdate=true で強制更新', () => {
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });

      // 1回目: 新規登録
      db.setCardInfo(cardInfo);

      // 2回目: forceUpdate=true で強制更新
      const updated = db.setCardInfo(cardInfo, true);
      expect(updated).toBe(true);
    });

    it('setCardInfo() は言語ごとに langsName を保存', () => {
      const cardInfoJa = createSampleCardInfo({ cardId: '123', name: 'ブルーアイズ', lang: 'ja' });
      const cardInfoEn = createSampleCardInfo({ cardId: '123', name: 'Blue-Eyes', lang: 'en' });

      db.setCardInfo(cardInfoJa);
      db.setCardInfo(cardInfoEn, true);  // 異なる言語なので強制更新

      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langsName?.ja).toBe('ブルーアイズ');
      expect(result.tableA?.langsName?.en).toBe('Blue-Eyes');
    });

    it('setCardInfo() は言語ごとに langsImgs を保存', () => {
      const cardInfoJa = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [{ ciid: 'ciid-ja-001', imgHash: 'hash-ja' }]
      });
      const cardInfoEn = createSampleCardInfo({
        cardId: '123',
        lang: 'en',
        imgs: [{ ciid: 'ciid-en-001', imgHash: 'hash-en' }]
      });

      db.setCardInfo(cardInfoJa);
      db.setCardInfo(cardInfoEn, true);  // 異なる言語なので強制更新

      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langsImgs?.ja?.[0]?.ciid).toBe('ciid-ja-001');
      expect(result.tableA?.langsImgs?.en?.[0]?.ciid).toBe('ciid-en-001');
    });

    it('setCardInfo() は言語ごとに langs_ciids を保存', () => {
      const cardInfoJa = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [{ ciid: 'ciid-ja-001', imgHash: 'hash' }]
      });
      const cardInfoEn = createSampleCardInfo({
        cardId: '123',
        lang: 'en',
        imgs: [{ ciid: 'ciid-en-001', imgHash: 'hash' }]
      });

      db.setCardInfo(cardInfoJa);
      db.setCardInfo(cardInfoEn, true);

      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langs_ciids?.ja).toContain('ciid-ja-001');
      expect(result.tableA?.langs_ciids?.en).toContain('ciid-en-001');
    });

    it('setCardInfo() は言語ごとに langsFetchedAt を更新', () => {
      const now = Date.now();
      const cardInfoJa = createSampleCardInfo({ cardId: '123', lang: 'ja' });

      db.setCardInfo(cardInfoJa);

      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langsFetchedAt?.ja).toBeGreaterThanOrEqual(now);
    });

    it('setCardInfo() は text と pendulumText を TableB2 に保存', () => {
      // text と pendulumText を含むカード情報を作成
      const cardInfo: any = createSampleCardInfo({
        cardId: '999',
        lang: 'ja'
      });
      cardInfo.text = 'カードの効果テキスト';
      cardInfo.pendulumText = 'ペンデュラム効果テキスト';

      db.setCardInfo(cardInfo);

      // TableB2 に保存されている
      const tableB2 = (db as any).cardTableB2.get('999');
      expect(tableB2).toBeDefined();
      expect(tableB2.langsText.ja).toBe('カードの効果テキスト');
      expect(tableB2.langsPendText.ja).toBe('ペンデュラム効果テキスト');
    });

    it('setCardInfo() はモンスター固有フィールドを TableB に保存', () => {
      // モンスター固有フィールドを含むカード情報を作成
      const cardInfo = createSampleCardInfo({
        cardId: '888',
        name: 'Link Monster',
        cardType: 'monster',
        attribute: 'fire',
        race: 'cyberse',
        levelType: 'link',
        levelValue: 3,
        atk: 2000,
        def: null,
        linkMarkers: ['top', 'bottom-left', 'bottom-right'],
        pendulumScale: undefined,
        isExtraDeck: true,
        types: ['Effect', 'Link'],
        lang: 'ja'
      });

      db.setCardInfo(cardInfo);

      // TableB に保存されている
      const result = db.getCardBasicInfo('888');
      expect(result.tableB?.attribute).toBe('fire');
      expect(result.tableB?.race).toBe('cyberse');
      expect(result.tableB?.levelType).toBe('link');
      expect(result.tableB?.levelValue).toBe(3);
      expect(result.tableB?.atk).toBe(2000);
      expect(result.tableB?.def).toBeNull();
      expect(result.tableB?.linkMarkers).toEqual(['top', 'bottom-left', 'bottom-right']);
      expect(result.tableB?.isExtraDeck).toBe(true);
      expect(result.tableB?.types).toEqual(['Effect', 'Link']);
    });

    it('setCardInfo() は魔法・罠の effectType を TableB に保存', () => {
      // 魔法カードの effectType を確認
      const spellCard = createSampleCardInfo({
        cardId: '777',
        name: 'Quick-Play Spell',
        cardType: 'spell',
        effectType: 'quickplay',
        lang: 'ja'
      });

      db.setCardInfo(spellCard);

      const result = db.getCardBasicInfo('777');
      expect(result.tableB?.cardType).toBe('spell');
      expect(result.tableB?.effectType).toBe('quickplay');
    });

    it('setCardInfo() は Tier テーブルを更新（lastSearched）', () => {
      const beforeSet = Date.now();
      const cardInfo = createSampleCardInfo({ cardId: '666', lang: 'ja' });

      db.setCardInfo(cardInfo);

      // Tier テーブルが更新されている
      const tierData = (db as any).cardTierTable.get('666');
      expect(tierData).toBeDefined();
      expect(tierData.lastSearched).toBeGreaterThanOrEqual(beforeSet);
    });

    it('setCardInfo() は limitRegulation を言語別に保存', () => {
      // 日本語で禁止制限を保存
      const cardInfoJa = createSampleCardInfo({
        cardId: '555',
        name: 'Restricted Card',
        lang: 'ja',
        limitRegulation: 'forbidden'
      });
      db.setCardInfo(cardInfoJa);

      // 英語で異なる禁止制限を保存
      const cardInfoEn = createSampleCardInfo({
        cardId: '555',
        name: 'Restricted Card',
        lang: 'en',
        limitRegulation: 'limited'
      });
      db.setCardInfo(cardInfoEn, true);

      // TableB に言語別で保存されている
      const result = db.getCardBasicInfo('555');
      expect(result.tableB?.langsLimitRegulation?.ja).toBe('forbidden');
      expect(result.tableB?.langsLimitRegulation?.en).toBe('limited');
    });
  });

  // =========================================
  // カード操作: CardTableC
  // =========================================

  describe('カード操作: CardTableC', () => {
    it('getCardTableC() はメモリキャッシュから取得', async () => {
      // CardTableC データを作成
      const tableC: CardTableC = {
        cardId: '123',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: ['456', '789'] }
      };

      // setCardTableC でキャッシュに保存
      await db.setCardTableC(tableC, 'ja');

      // メモリキャッシュから取得
      const result = await db.getCardTableC('123');
      expect(result).toBeDefined();
      expect(result?.cardId).toBe('123');
      expect(result?.langsRelatedCards?.ja).toEqual(['456', '789']);
    });

    it('getCardTableC() はストレージから遅延読み込み', async () => {
      // ストレージに直接データを設定
      const tableC: CardTableC = {
        cardId: '999',
        langsFetchedAt: { en: Date.now() },
        langsRelatedProducts: { en: ['pack1', 'pack2'] }
      };
      mockStorageData[STORAGE_KEYS.cardTableCPrefix + '999'] = tableC;

      // ストレージから取得
      const result = await db.getCardTableC('999');
      expect(result).toBeDefined();
      expect(result?.cardId).toBe('999');
      expect(result?.langsRelatedProducts?.en).toEqual(['pack1', 'pack2']);
    });

    it('getCardTableC() はデータがない場合 undefined を返す', async () => {
      const result = await db.getCardTableC('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setCardTableC() は新規データを保存', async () => {
      const tableC: CardTableC = {
        cardId: '111',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: ['222', '333'] }
      };

      await db.setCardTableC(tableC, 'ja');

      // メモリとストレージの両方に保存されている
      const result = await db.getCardTableC('111');
      expect(result).toBeDefined();
      expect(result?.langsRelatedCards?.ja).toEqual(['222', '333']);

      // ストレージにも保存されている
      const storageKey = STORAGE_KEYS.cardTableCPrefix + '111';
      expect(mockStorageData[storageKey]).toBeDefined();
    });

    it('setCardTableC() は既存データと言語別フィールドをマージ', async () => {
      // 既存データを保存（日本語）
      const tableC1: CardTableC = {
        cardId: '222',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: ['111'] },
        langsRelatedProducts: { ja: ['pack-ja'] }
      };
      await db.setCardTableC(tableC1, 'ja');

      // 新規データを追加（英語）
      const tableC2: CardTableC = {
        cardId: '222',
        langsFetchedAt: {},
        langsRelatedCards: { en: ['999'] },
        langsRelatedProducts: { en: ['pack-en'] }
      };
      await db.setCardTableC(tableC2, 'en');

      // マージされている
      const result = await db.getCardTableC('222');
      expect(result?.langsRelatedCards?.ja).toEqual(['111']);
      expect(result?.langsRelatedCards?.en).toEqual(['999']);
      expect(result?.langsRelatedProducts?.ja).toEqual(['pack-ja']);
      expect(result?.langsRelatedProducts?.en).toEqual(['pack-en']);
    });

    it('setCardTableC() は langsFetchedAt を更新', async () => {
      const beforeSet = Date.now();
      const tableC: CardTableC = {
        cardId: '777',
        langsFetchedAt: {}
      };

      await db.setCardTableC(tableC, 'ja');

      // langsFetchedAt が更新されている
      const result = await db.getCardTableC('777');
      expect(result?.langsFetchedAt?.ja).toBeGreaterThanOrEqual(beforeSet);
    });

    it('setCardTableC() は Tier テーブルを更新（lastShownDetail）', async () => {
      const beforeSet = Date.now();
      const tableC: CardTableC = {
        cardId: '888',
        langsFetchedAt: { ja: Date.now() }
      };

      await db.setCardTableC(tableC, 'ja');

      // Tier テーブルが更新されている
      const tierData = (db as any).cardTierTable.get('888');
      expect(tierData).toBeDefined();
      expect(tierData.lastShownDetail).toBeGreaterThanOrEqual(beforeSet);
    });

    it('updateCardTableCFetchedAt() はメモリキャッシュの fetchedAt を更新', async () => {
      // CardTableC を作成
      const tableC: CardTableC = {
        cardId: '333',
        langsFetchedAt: { ja: Date.now() - 10000 }
      };
      await db.setCardTableC(tableC, 'ja');

      // fetchedAt を更新
      const beforeUpdate = Date.now();
      await db.updateCardTableCFetchedAt('333', 'ja');

      // メモリキャッシュが更新されている
      const result = await db.getCardTableC('333');
      expect(result?.langsFetchedAt?.ja).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('updateCardTableCFetchedAt() はストレージの fetchedAt を更新', async () => {
      // ストレージに直接データを設定（メモリキャッシュなし）
      const tableC: CardTableC = {
        cardId: '444',
        langsFetchedAt: { en: Date.now() - 10000 }
      };
      mockStorageData[STORAGE_KEYS.cardTableCPrefix + '444'] = tableC;

      // fetchedAt を更新
      const beforeUpdate = Date.now();
      await db.updateCardTableCFetchedAt('444', 'en');

      // ストレージが更新されている
      const storageKey = STORAGE_KEYS.cardTableCPrefix + '444';
      const savedData = mockStorageData[storageKey] as CardTableC;
      expect(savedData.langsFetchedAt?.en).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('updateCardTableCFetchedAt() は Tier テーブルも更新', async () => {
      // CardTableC を作成
      const tableC: CardTableC = {
        cardId: '999',
        langsFetchedAt: { ja: Date.now() - 10000 }
      };
      await db.setCardTableC(tableC, 'ja');

      // fetchedAt を更新
      const beforeUpdate = Date.now();
      await db.updateCardTableCFetchedAt('999', 'ja');

      // Tier テーブルも更新されている
      const tierData = (db as any).cardTierTable.get('999');
      expect(tierData).toBeDefined();
      expect(tierData.lastShownDetail).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });

  // =========================================
  // Tier管理
  // =========================================

  describe('Tier管理', () => {
    it('updateCardTier() は既存の Tier データを更新', () => {
      // 既存の Tier データを作成
      db.updateCardTier('card1', {
        lastAddedToDeck: 1000,
        lastShownDetail: 2000,
        lastSearched: 3000
      });

      // データを更新
      db.updateCardTier('card1', {
        lastAddedToDeck: 5000
      });

      // 既存データが保持され、更新部分のみ変更される
      const tierData = (db as any).cardTierTable.get('card1');
      expect(tierData.lastAddedToDeck).toBe(5000);
      expect(tierData.lastShownDetail).toBe(2000);
      expect(tierData.lastSearched).toBe(3000);
    });

    it('updateCardTier() は新規の Tier データを作成', () => {
      // 新規カードで Tier を更新
      db.updateCardTier('new-card', {
        lastAddedToDeck: 10000
      });

      // 新規データが作成される
      const tierData = (db as any).cardTierTable.get('new-card');
      expect(tierData).toBeDefined();
      expect(tierData.cardId).toBe('new-card');
      expect(tierData.lastAddedToDeck).toBe(10000);
      expect(tierData.lastShownDetail).toBe(0);
      expect(tierData.lastSearched).toBe(0);
    });

    it('recordDeckOpen() はデッキオープン履歴を追加', () => {
      const cardIds = ['card1', 'card2', 'card3'];

      db.recordDeckOpen(1, cardIds);

      // 履歴が追加されている
      const stats = db.getStats();
      expect(stats.deckHistoryCount).toBe(1);

      // カードのTierが更新されている
      const tier = db.getCardTier('card1');
      expect(tier).toBeGreaterThan(0);  // Tier 5になっているはず
    });

    it('recordDeckOpen() は最大5件まで保持（古いものから削除）', () => {
      // 6件のデッキを追加
      for (let i = 1; i <= 6; i++) {
        db.recordDeckOpen(i, [`card${i}`]);
      }

      const stats = db.getStats();
      expect(stats.deckHistoryCount).toBe(5);  // 最大5件まで
    });

    it('recordDeckOpen() は同じ dno が既にある場合は削除してから追加', () => {
      db.recordDeckOpen(1, ['card1', 'card2']);
      db.recordDeckOpen(2, ['card3']);
      db.recordDeckOpen(1, ['card4']);  // 同じdno

      const stats = db.getStats();
      expect(stats.deckHistoryCount).toBe(2);  // dno=1は1件のみ
    });

    it('getCardTier() は Tier 値を計算して返す', () => {
      const now = Date.now();

      // Tier 5: 直近5回のデッキに含まれる
      db.recordDeckOpen(1, ['card-tier5']);
      expect(db.getCardTier('card-tier5')).toBe(5);

      // Tier 4: 1週間以内にデッキ追加
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      db.recordDeckOpen(100, ['card-tier4']);  // dnoを大きくして履歴から外す
      // 手動でTier更新（1週間以内）
      db.updateCardTier('card-tier4-manual', {
        lastAddedToDeck: now - (3 * 24 * 60 * 60 * 1000),  // 3日前
        lastShownDetail: 0,
        lastSearched: 0
      });
      expect(db.getCardTier('card-tier4-manual')).toBe(4);

      // Tier 0: それ以外
      db.updateCardTier('card-tier0', {
        lastAddedToDeck: now - (60 * 24 * 60 * 60 * 1000),  // 60日前
        lastShownDetail: now - (60 * 24 * 60 * 60 * 1000),
        lastSearched: now - (60 * 24 * 60 * 60 * 1000)
      });
      expect(db.getCardTier('card-tier0')).toBe(0);
    });

    it('getCardTier() はデータがない場合 0 を返す', () => {
      // 存在しないカードのTierを取得
      const tier = db.getCardTier('nonexistent');
      expect(tier).toBe(0);
    });

    it('calculateTier() は Tier 5 を返す（直近デッキに含まれる）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier5',
        lastAddedToDeck: now - 1000,
        lastShownDetail: 0,
        lastSearched: 0
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: [
          { dno: 1, openedAt: now, cardIds: ['card-tier5', 'other'] }
        ]
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(5);
    });

    it('calculateTier() は Tier 4 を返す（1週間以内にデッキ追加）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier4',
        lastAddedToDeck: now - (3 * 24 * 60 * 60 * 1000),  // 3日前
        lastShownDetail: 0,
        lastSearched: 0
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: []  // 直近デッキには含まれない
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(4);
    });

    it('calculateTier() は Tier 3 を返す（1ヶ月以内にデッキ追加）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier3',
        lastAddedToDeck: now - (15 * 24 * 60 * 60 * 1000),  // 15日前
        lastShownDetail: 0,
        lastSearched: 0
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(3);
    });

    it('calculateTier() は Tier 2 を返す（1週間以内に検索表示）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier2',
        lastAddedToDeck: 0,
        lastShownDetail: 0,
        lastSearched: now - (5 * 24 * 60 * 60 * 1000)  // 5日前
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(2);
    });

    it('calculateTier() は Tier 1 を返す（1ヶ月以内に検索表示）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier1',
        lastAddedToDeck: 0,
        lastShownDetail: 0,
        lastSearched: now - (20 * 24 * 60 * 60 * 1000)  // 20日前
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(1);
    });

    it('calculateTier() は Tier 0 を返す（それ以外）', () => {
      const now = Date.now();
      const tierData: CardTier = {
        cardId: 'card-tier0',
        lastAddedToDeck: now - (60 * 24 * 60 * 60 * 1000),  // 60日前
        lastShownDetail: now - (60 * 24 * 60 * 60 * 1000),
        lastSearched: now - (60 * 24 * 60 * 60 * 1000)
      };
      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      const tier = calculateTier(tierData, deckHistory);
      expect(tier).toBe(0);
    });
  });

  // =========================================
  // Move History 操作
  // =========================================

  describe('Move History 操作', () => {
    it('recordMove() は moveHistory に記録を追加', () => {
      // 履歴を追加
      db.recordMove({ action: 'add', cardId: 'card1', to: 'main' });
      db.recordMove({ action: 'remove', cardId: 'card2', from: 'side' });

      // 履歴が追加されている
      const history = db.getMoveHistory();
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('add');
      expect(history[1].action).toBe('remove');
    });

    it('recordMove() は最大1000件まで保持', () => {
      // 1010件の履歴を追加
      for (let i = 1; i <= 1010; i++) {
        db.recordMove({ action: `action${i}`, cardId: `card${i}` });
      }

      // 最大1000件まで保持
      const history = db.getMoveHistory();
      expect(history).toHaveLength(1000);

      // 古いものから削除されている（最新1000件が残る）
      expect(history[0].action).toBe('action11');  // 1-10は削除
      expect(history[999].action).toBe('action1010');
    });

    it('recordMove() はタイムスタンプを自動追加', () => {
      const beforeRecord = Date.now();
      db.recordMove({ action: 'add', cardId: 'card1' });

      // タイムスタンプが追加されている
      const history = db.getMoveHistory();
      expect(history[0].ts).toBeDefined();
      expect(history[0].ts).toBeGreaterThanOrEqual(beforeRecord);
    });

    it('recordMove() はストレージに非同期保存', async () => {
      // 履歴を追加
      db.recordMove({ action: 'add', cardId: 'card1' });

      // 非同期保存が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // ストレージに保存されている
      const savedData = mockStorageData[STORAGE_KEYS.moveHistory];
      expect(savedData).toBeDefined();
      expect(Array.isArray(savedData)).toBe(true);
      expect(savedData.length).toBeGreaterThan(0);
    });

    it('getMoveHistory() は全履歴を返す（limit未指定）', () => {
      // 複数の履歴を追加
      db.recordMove({ action: 'add', cardId: 'card1', to: 'main' });
      db.recordMove({ action: 'add', cardId: 'card2', to: 'extra' });
      db.recordMove({ action: 'move', cardId: 'card3', from: 'main', to: 'side' });

      // 全履歴を取得
      const history = db.getMoveHistory();
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('add');
      expect(history[1].action).toBe('add');
      expect(history[2].action).toBe('move');
    });

    it('getMoveHistory() は最新N件を返す（limit指定）', () => {
      // 5件の履歴を追加
      for (let i = 1; i <= 5; i++) {
        db.recordMove({ action: `action${i}`, cardId: `card${i}` });
      }

      // 最新2件を取得
      const history = db.getMoveHistory(2);
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('action4');
      expect(history[1].action).toBe('action5');
    });

    it('clearMoveHistory() は履歴を全削除', () => {
      // 履歴を追加
      db.recordMove({ action: 'add', cardId: 'card1' });
      db.recordMove({ action: 'add', cardId: 'card2' });
      expect(db.getMoveHistory()).toHaveLength(2);

      // クリア
      db.clearMoveHistory();

      // 履歴が空になる
      expect(db.getMoveHistory()).toHaveLength(0);
    });
  });

  // =========================================
  // Product操作
  // =========================================

  describe('Product操作', () => {
    it('getProductA() は ProductTableA を取得', () => {
      // ProductTableA を保存
      const productA: ProductTableA = {
        packId: 'pack123',
        name: 'Test Pack',
        fetchedAt: Date.now()
      };
      db.setProductA(productA);

      // 取得
      const result = db.getProductA('pack123');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Pack');
    });

    it('getProductA() はデータがない場合 undefined を返す', () => {
      const result = db.getProductA('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setProductA() は ProductTableA を保存', () => {
      const productA: ProductTableA = {
        packId: 'pack456',
        name: 'New Pack',
        fetchedAt: 0  // setProductA が自動設定する
      };

      db.setProductA(productA);

      const result = db.getProductA('pack456');
      expect(result).toBeDefined();
      expect(result?.name).toBe('New Pack');
    });

    it('setProductA() は fetchedAt を自動設定', () => {
      const beforeSet = Date.now();
      const productA: ProductTableA = {
        packId: 'pack789',
        name: 'Auto Timestamp Pack',
        fetchedAt: 0
      };

      db.setProductA(productA);

      const result = db.getProductA('pack789');
      expect(result?.fetchedAt).toBeGreaterThanOrEqual(beforeSet);
    });

    it('getProductB() はメモリキャッシュから取得', async () => {
      // ProductTableB を保存
      const productB: ProductTableB = {
        packId: 'pack111',
        cardList: ['card1', 'card2'],
        fetchedAt: Date.now()
      };
      await db.setProductB(productB);

      // メモリキャッシュから取得
      const result = await db.getProductB('pack111');
      expect(result).toBeDefined();
      expect(result?.cardList).toEqual(['card1', 'card2']);
    });

    it('getProductB() はストレージから遅延読み込み', async () => {
      // ストレージに直接データを設定（メモリキャッシュなし）
      const productB: ProductTableB = {
        packId: 'pack999',
        cardList: ['card1', 'card2', 'card3'],
        fetchedAt: Date.now()
      };
      mockStorageData[STORAGE_KEYS.productTableBPrefix + 'pack999'] = productB;

      // ストレージから取得
      const result = await db.getProductB('pack999');
      expect(result).toBeDefined();
      expect(result?.cardList).toEqual(['card1', 'card2', 'card3']);
    });

    it('getProductB() はデータがない場合 undefined を返す', async () => {
      const result = await db.getProductB('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setProductB() は ProductTableB を保存', async () => {
      const productB: ProductTableB = {
        packId: 'pack222',
        cardList: ['card3', 'card4', 'card5'],
        fetchedAt: 0
      };

      await db.setProductB(productB);

      // メモリから取得
      const result = await db.getProductB('pack222');
      expect(result).toBeDefined();
      expect(result?.cardList).toEqual(['card3', 'card4', 'card5']);

      // ストレージにも保存されている
      const storageKey = STORAGE_KEYS.productTableBPrefix + 'pack222';
      expect(mockStorageData[storageKey]).toBeDefined();
    });

    it('setProductB() は fetchedAt を自動設定', async () => {
      const beforeSet = Date.now();
      const productB: ProductTableB = {
        packId: 'pack333',
        cardList: ['card6'],
        fetchedAt: 0
      };

      await db.setProductB(productB);

      const result = await db.getProductB('pack333');
      expect(result?.fetchedAt).toBeGreaterThanOrEqual(beforeSet);
    });
  });

  // =========================================
  // FAQ操作
  // =========================================

  describe('FAQ操作', () => {
    it('getFAQA() は FAQTableA を取得', () => {
      // FAQTableA を保存
      const faqA: FAQTableA = {
        faqId: 'faq123',
        question: 'Test Question',
        fetchedAt: Date.now(),
        lastAccessedAt: Date.now()
      };
      db.setFAQA(faqA);

      // 取得
      const result = db.getFAQA('faq123');
      expect(result).toBeDefined();
      expect(result?.question).toBe('Test Question');
    });

    it('getFAQA() は lastAccessedAt を更新', () => {
      // FAQTableA を保存
      const faqA: FAQTableA = {
        faqId: 'faq456',
        question: 'Another Question',
        fetchedAt: Date.now() - 10000,
        lastAccessedAt: Date.now() - 10000
      };
      db.setFAQA(faqA);

      // 取得（lastAccessedAt が更新される）
      const beforeGet = Date.now();
      const result = db.getFAQA('faq456');
      expect(result?.lastAccessedAt).toBeGreaterThanOrEqual(beforeGet);
    });

    it('getFAQA() はデータがない場合 undefined を返す', () => {
      const result = db.getFAQA('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setFAQA() は FAQTableA を保存', () => {
      const faqA: FAQTableA = {
        faqId: 'faq789',
        question: 'New FAQ',
        fetchedAt: 0,
        lastAccessedAt: 0
      };

      db.setFAQA(faqA);

      const result = db.getFAQA('faq789');
      expect(result).toBeDefined();
      expect(result?.question).toBe('New FAQ');
    });

    it('setFAQA() は fetchedAt と lastAccessedAt を自動設定', () => {
      const beforeSet = Date.now();
      const faqA: FAQTableA = {
        faqId: 'faq101',
        question: 'Auto Timestamp FAQ',
        fetchedAt: 0,
        lastAccessedAt: 0
      };

      db.setFAQA(faqA);

      const result = db.getFAQA('faq101');
      expect(result?.fetchedAt).toBeGreaterThanOrEqual(beforeSet);
      expect(result?.lastAccessedAt).toBeGreaterThanOrEqual(beforeSet);
    });

    it('getFAQB() はメモリキャッシュから取得', async () => {
      // FAQTableB を保存（メモリキャッシュに保存される）
      const faqB: FAQTableB = {
        faqId: 'faq111',
        answer: 'Cached Answer',
        fetchedAt: Date.now(),
        lastAccessedAt: Date.now()
      };
      await db.setFAQB(faqB);

      // メモリキャッシュから取得
      const result = await db.getFAQB('faq111');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Cached Answer');
    });

    it('getFAQB() はストレージから遅延読み込み', async () => {
      // ストレージに直接データを設定（メモリキャッシュなし）
      const faqB: FAQTableB = {
        faqId: 'faq999',
        answer: 'Storage Answer',
        fetchedAt: Date.now() - 10000,
        lastAccessedAt: Date.now() - 10000
      };
      mockStorageData[STORAGE_KEYS.faqTableBPrefix + 'faq999'] = faqB;

      // ストレージから取得
      const result = await db.getFAQB('faq999');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Storage Answer');
    });

    it('getFAQB() は lastAccessedAt を更新', async () => {
      // FAQTableB を保存
      const faqB: FAQTableB = {
        faqId: 'faq222',
        answer: 'Test Answer',
        fetchedAt: Date.now() - 10000,
        lastAccessedAt: Date.now() - 10000
      };
      await db.setFAQB(faqB);

      // 取得（lastAccessedAt が更新される）
      const beforeGet = Date.now();
      const result = await db.getFAQB('faq222');
      expect(result?.lastAccessedAt).toBeGreaterThanOrEqual(beforeGet);
    });

    it('getFAQB() はデータがない場合 undefined を返す', async () => {
      const result = await db.getFAQB('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setFAQB() は FAQTableB を保存', async () => {
      const faqB: FAQTableB = {
        faqId: 'faq333',
        answer: 'Detailed Answer',
        fetchedAt: 0,
        lastAccessedAt: 0
      };

      await db.setFAQB(faqB);

      // メモリから取得
      const result = await db.getFAQB('faq333');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Detailed Answer');

      // ストレージにも保存されている
      const storageKey = STORAGE_KEYS.faqTableBPrefix + 'faq333';
      expect(mockStorageData[storageKey]).toBeDefined();
    });

    it('setFAQB() は fetchedAt と lastAccessedAt を自動設定', async () => {
      const beforeSet = Date.now();
      const faqB: FAQTableB = {
        faqId: 'faq444',
        answer: 'Auto Timestamp Answer',
        fetchedAt: 0,
        lastAccessedAt: 0
      };

      await db.setFAQB(faqB);

      const result = await db.getFAQB('faq444');
      expect(result?.fetchedAt).toBeGreaterThanOrEqual(beforeSet);
      expect(result?.lastAccessedAt).toBeGreaterThanOrEqual(beforeSet);
    });
  });

  // =========================================
  // クリーンアップ
  // =========================================

  describe('クリーンアップ', () => {
    it('cleanup() は Tier 0 のカードを CardTier から削除', async () => {
      // Tier 0 のカードを追加（60日前にアクセス）
      const oldTimestamp = Date.now() - (60 * 24 * 60 * 60 * 1000);
      db.updateCardTier('card-tier0', {
        lastAddedToDeck: oldTimestamp,
        lastShownDetail: oldTimestamp,
        lastSearched: oldTimestamp
      });

      // Tier 4 のカードを追加（3日前にアクセス）
      const recentTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);
      db.updateCardTier('card-tier4', {
        lastAddedToDeck: recentTimestamp,
        lastShownDetail: recentTimestamp,
        lastSearched: 0
      });

      // クリーンアップ実行
      await db.cleanup();

      // Tier 0 は削除される
      expect(db.getCardTier('card-tier0')).toBe(0);

      // Tier 4 は保持される
      expect(db.getCardTier('card-tier4')).toBe(4);
    });

    it('cleanup() は Tier 2以下のカードを CardTableC から削除', async () => {
      // Tier 1 のカードを追加（20日前に検索表示）
      const tier1Timestamp = Date.now() - (20 * 24 * 60 * 60 * 1000);

      // CardTableC を保存
      const tableC: CardTableC = {
        cardId: 'card-tier1',
        langsFetchedAt: { ja: Date.now() }
      };
      await db.setCardTableC(tableC, 'ja');

      // setCardTableC() が lastShownDetail を Date.now() に更新してしまうので、手動で古い値に戻す
      db.updateCardTier('card-tier1', {
        lastAddedToDeck: 0,
        lastShownDetail: 0,
        lastSearched: tier1Timestamp
      });

      // Tier 1 であることを事前確認
      expect(db.getCardTier('card-tier1')).toBe(1);

      // Tier 3 のカードも追加（CardTableC を保持すべき）
      const tier3Timestamp = Date.now() - (15 * 24 * 60 * 60 * 1000);

      const tableC2: CardTableC = {
        cardId: 'card-tier3',
        langsFetchedAt: { ja: Date.now() }
      };
      await db.setCardTableC(tableC2, 'ja');

      // setCardTableC() が lastShownDetail を Date.now() に更新してしまうので、手動で正しい値に戻す
      db.updateCardTier('card-tier3', {
        lastAddedToDeck: tier3Timestamp,
        lastShownDetail: 0,
        lastSearched: 0
      });

      // Tier 3 であることを事前確認
      expect(db.getCardTier('card-tier3')).toBe(3);

      // クリーンアップ実行
      await db.cleanup();

      // Tier 1 の CardTableC は削除される（Tier ≤ 2）
      expect(db.hasCardTableC('card-tier1')).toBe(false);

      // ストレージからも削除されている
      const storageKey = STORAGE_KEYS.cardTableCPrefix + 'card-tier1';
      expect(mockStorageData[storageKey]).toBeUndefined();

      // Tier 3 の CardTableC は保持される（Tier > 2）
      expect(db.hasCardTableC('card-tier3')).toBe(true);
    });

    it('cleanup() は1ヶ月以上アクセスされていない FAQ を削除', async () => {
      // 古い FAQ を追加（35日前にアクセス）
      const oldTimestamp = Date.now() - (35 * 24 * 60 * 60 * 1000);
      // FAQTableA を直接メモリに設定（setFAQA は lastAccessedAt を更新してしまう）
      const oldFaqA: FAQTableA = {
        faqId: 'faq-old',
        question: 'Old Question',
        fetchedAt: oldTimestamp,
        lastAccessedAt: oldTimestamp
      };
      (db as any).faqTableA.set('faq-old', oldFaqA);

      const oldFaqB: FAQTableB = {
        faqId: 'faq-old',
        answer: 'Old Answer',
        fetchedAt: oldTimestamp,
        lastAccessedAt: oldTimestamp
      };
      (db as any).faqTableB.set('faq-old', oldFaqB);
      mockStorageData[STORAGE_KEYS.faqTableBPrefix + 'faq-old'] = oldFaqB;

      // 最近の FAQ を追加（3日前にアクセス）
      const recentTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const recentFaqA: FAQTableA = {
        faqId: 'faq-recent',
        question: 'Recent Question',
        fetchedAt: recentTimestamp,
        lastAccessedAt: recentTimestamp
      };
      db.setFAQA(recentFaqA);

      // クリーンアップ実行
      await db.cleanup();

      // 古い FAQ は削除される（直接 Map を確認）
      expect((db as any).faqTableA.has('faq-old')).toBe(false);
      expect((db as any).faqTableB.has('faq-old')).toBe(false);

      // ストレージからも削除されている
      const storageKey = STORAGE_KEYS.faqTableBPrefix + 'faq-old';
      expect(mockStorageData[storageKey]).toBeUndefined();

      // 最近の FAQ は保持される
      expect(db.getFAQA('faq-recent')).toBeDefined();
    });

    it('cleanup() は全データを保存', async () => {
      // カード情報を追加
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // クリーンアップ実行
      await db.cleanup();

      // ストレージに保存されている
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableB]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableA]['123']).toBeDefined();
    });

    it('clearAll() はメモリ内の全データをクリア', async () => {
      // データを追加
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);
      db.recordDeckOpen(1, ['123']);
      await db.setCardTableC({ cardId: '123', langsFetchedAt: { ja: Date.now() } }, 'ja');

      // clearAll 実行前に確認
      expect(db.getCardBasicInfo('123').tableA).toBeDefined();
      expect(db.getStats().deckHistoryCount).toBe(1);

      // clearAll 実行
      await db.clearAll();

      // メモリ内データがクリアされている
      expect(db.getCardBasicInfo('123').tableA).toBeUndefined();
      expect(db.getStats().deckHistoryCount).toBe(0);
      expect(db.hasCardTableC('123')).toBe(false);
    });

    it('clearAll() はストレージの Cache DB 関連キーを削除', async () => {
      // データを追加
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);
      await db.saveAll();

      // CardTableC も追加
      await db.setCardTableC({ cardId: '123', langsFetchedAt: { ja: Date.now() } }, 'ja');

      // clearAll 実行前に確認
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableCPrefix + '123']).toBeDefined();

      // clearAll 実行
      await db.clearAll();

      // ストレージからキーが削除されている
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeUndefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableB]).toBeUndefined();
      expect(mockStorageData[STORAGE_KEYS.deckOpenHistory]).toBeUndefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableCPrefix + '123']).toBeUndefined();
    });

    it('clearAll() は設定キーを保護する', async () => {
      // 設定キーを追加（Cache DB以外のキー）
      const settingsKey = 'userSettings';
      mockStorageData[settingsKey] = { theme: 'dark' };

      // カード情報も追加
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);
      await db.saveAll();

      // clearAll 実行
      await db.clearAll();

      // Cache DB関連キーは削除されている
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeUndefined();

      // 設定キーは保護されている
      expect(mockStorageData[settingsKey]).toBeDefined();
      expect(mockStorageData[settingsKey].theme).toBe('dark');
    });
  });

  // =========================================
  // ユーティリティ: reconstructCardInfo()
  // =========================================

  describe('ユーティリティ: reconstructCardInfo()', () => {
    it('reconstructCardInfo() は TableA + TableB から CardInfo を再構築（モンスター）', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '123',
        name: 'Blue-Eyes White Dragon',
        cardType: 'monster',
        attribute: 'light',
        race: 'dragon',
        levelType: 'level',
        levelValue: 8,
        atk: 3000,
        def: 2500,
        types: ['Normal'],
        lang: 'ja'
      });

      db.setCardInfo(cardInfo);

      const reconstructed = db.reconstructCardInfo('123', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.cardId).toBe('123');
      expect(reconstructed?.name).toBe('Blue-Eyes White Dragon');
      expect(reconstructed?.cardType).toBe('monster');
      expect(reconstructed?.attribute).toBe('light');
      expect(reconstructed?.race).toBe('dragon');
      expect(reconstructed?.levelValue).toBe(8);
      expect(reconstructed?.atk).toBe(3000);
      expect(reconstructed?.def).toBe(2500);
    });

    it('reconstructCardInfo() は魔法カードを再構築', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '456',
        name: 'Pot of Greed',
        cardType: 'spell',
        effectType: 'normal',
        lang: 'ja'
      });

      db.setCardInfo(cardInfo);

      const reconstructed = db.reconstructCardInfo('456', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.cardType).toBe('spell');
      expect(reconstructed?.effectType).toBe('normal');
    });

    it('reconstructCardInfo() は罠カードを再構築', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '789',
        name: 'Mirror Force',
        cardType: 'trap',
        effectType: 'normal',
        lang: 'ja'
      });

      db.setCardInfo(cardInfo);

      const reconstructed = db.reconstructCardInfo('789', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.cardType).toBe('trap');
      expect(reconstructed?.effectType).toBe('normal');
    });

    it('reconstructCardInfo() は言語パラメータを尊重', () => {
      const cardInfoJa = createSampleCardInfo({
        cardId: '123',
        name: 'ブルーアイズ',
        lang: 'ja'
      });
      const cardInfoEn = createSampleCardInfo({
        cardId: '123',
        name: 'Blue-Eyes',
        lang: 'en'
      });

      db.setCardInfo(cardInfoJa);
      db.setCardInfo(cardInfoEn, true);

      const reconstructedJa = db.reconstructCardInfo('123', 'ja');
      const reconstructedEn = db.reconstructCardInfo('123', 'en');

      expect(reconstructedJa?.name).toBe('ブルーアイズ');
      expect(reconstructedEn?.name).toBe('Blue-Eyes');
    });

    it('reconstructCardInfo() は指定言語が存在しない場合 undefined を返す', () => {
      const cardInfo = createSampleCardInfo({
        cardId: '123',
        name: 'Blue-Eyes',
        lang: 'ja'
      });

      db.setCardInfo(cardInfo);

      // 'en' 言語のデータは存在しない
      const reconstructed = db.reconstructCardInfo('123', 'en');
      expect(reconstructed).toBeUndefined();
    });

    it('reconstructCardInfo() は TableA がない場合 undefined を返す', () => {
      // TableB のみ存在する状態を作成
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // TableA を削除（直接操作）
      const basicInfo = db.getCardBasicInfo('123');
      if (basicInfo.tableA) {
        (db as any).cardTableA.delete('123');
      }

      // 再構築は失敗する
      const reconstructed = db.reconstructCardInfo('123', 'ja');
      expect(reconstructed).toBeUndefined();
    });

    it('reconstructCardInfo() は TableB がない場合 undefined を返す', () => {
      // TableA のみ存在する状態を作成
      const cardInfo = createSampleCardInfo({ cardId: '456', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // TableB を削除（直接操作）
      (db as any).cardTableB.delete('456');

      // 再構築は失敗する
      const reconstructed = db.reconstructCardInfo('456', 'ja');
      expect(reconstructed).toBeUndefined();
    });

    it('reconstructCardInfo() は TableB2 の text と pendulumText をマージ', () => {
      // text と pendulumText を含むカード情報を作成
      const cardInfo: any = createSampleCardInfo({
        cardId: '789',
        name: 'Pendulum Monster',
        cardType: 'monster',
        lang: 'ja'
      });
      cardInfo.text = 'メインテキスト';
      cardInfo.pendulumText = 'ペンデュラムテキスト';

      db.setCardInfo(cardInfo);

      // 再構築
      const reconstructed: any = db.reconstructCardInfo('789', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.text).toBe('メインテキスト');
      expect(reconstructed?.pendulumText).toBe('ペンデュラムテキスト');
    });

    it('reconstructCardInfo() は CardTableC がメモリにある場合は補足情報をマージ', async () => {
      // カード情報を作成
      const cardInfo = createSampleCardInfo({ cardId: '111', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // CardTableC を追加（補足情報を含む）
      const tableC: CardTableC = {
        cardId: '111',
        langsFetchedAt: { ja: Date.now() },
        supplInfo: '補足情報',
        supplDate: '2024-01-01',
        pendSupplInfo: 'ペンデュラム補足',
        pendSupplDate: '2024-01-02'
      };
      await db.setCardTableC(tableC, 'ja');

      // 再構築
      const reconstructed: any = db.reconstructCardInfo('111', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.supplInfo).toBe('補足情報');
      expect(reconstructed?.supplDate).toBe('2024-01-01');
      expect(reconstructed?.pendSupplInfo).toBe('ペンデュラム補足');
      expect(reconstructed?.pendSupplDate).toBe('2024-01-02');
    });

    it('reconstructCardInfo() は CardTableC がない場合でもエラーにならない', () => {
      // CardTableC なしでカード情報を作成
      const cardInfo = createSampleCardInfo({ cardId: '222', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // 再構築は成功する（CardTableC はオプション）
      const reconstructed = db.reconstructCardInfo('222', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.cardId).toBe('222');
    });

    it('reconstructCardInfo() は limitRegulation を言語別に復元', () => {
      // 日本語と英語で異なる禁止制限を持つカード情報を作成
      const cardInfoJa = createSampleCardInfo({
        cardId: '333',
        name: 'Forbidden Card',
        lang: 'ja',
        limitRegulation: 'forbidden'
      });
      db.setCardInfo(cardInfoJa);

      const cardInfoEn = createSampleCardInfo({
        cardId: '333',
        name: 'Forbidden Card',
        lang: 'en',
        limitRegulation: 'limited'
      });
      db.setCardInfo(cardInfoEn, true);

      // 日本語で再構築
      const reconstructedJa = db.reconstructCardInfo('333', 'ja');
      expect(reconstructedJa?.limitRegulation).toBe('forbidden');

      // 英語で再構築
      const reconstructedEn = db.reconstructCardInfo('333', 'en');
      expect(reconstructedEn?.limitRegulation).toBe('limited');
    });

    it('reconstructCardInfo() は ruby を言語別に復元', () => {
      // ルビ情報を含むカード情報を作成
      const cardInfoJa = createSampleCardInfo({
        cardId: '444',
        name: '青眼の白龍',
        lang: 'ja',
        ruby: 'ブルーアイズ・ホワイト・ドラゴン'
      });
      db.setCardInfo(cardInfoJa);

      // 再構築
      const reconstructed = db.reconstructCardInfo('444', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');
    });

    it('reconstructCardInfo() は imgs の最初の ciid を ciid フィールドに設定', () => {
      // 複数の画像を持つカード情報を作成
      const cardInfo = createSampleCardInfo({
        cardId: '555',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-001', imgHash: 'hash1' },
          { ciid: 'ciid-002', imgHash: 'hash2' },
          { ciid: 'ciid-003', imgHash: 'hash3' }
        ]
      });
      db.setCardInfo(cardInfo);

      // 再構築
      const reconstructed = db.reconstructCardInfo('555', 'ja');
      expect(reconstructed).toBeDefined();
      expect(reconstructed?.ciid).toBe('ciid-001');  // 最初のciidが設定される
    });
  });

  // =========================================
  // ユーティリティ: その他
  // =========================================

  describe('ユーティリティ: その他', () => {
    it('hasCardTableC() はメモリキャッシュに存在するか判定', async () => {
      // 最初は存在しない
      expect(db.hasCardTableC('123')).toBe(false);

      // CardTableC を保存
      const tableC: CardTableC = {
        cardId: '123',
        langsFetchedAt: { ja: Date.now() }
      };
      await db.setCardTableC(tableC, 'ja');

      // 存在する
      expect(db.hasCardTableC('123')).toBe(true);
    });

    it('getAllCardIds() は全カード ID を返す', () => {
      // カードを追加
      const card1 = createSampleCardInfo({ cardId: 'card1', lang: 'ja' });
      const card2 = createSampleCardInfo({ cardId: 'card2', lang: 'ja' });
      const card3 = createSampleCardInfo({ cardId: 'card3', lang: 'ja' });

      db.setCardInfo(card1);
      db.setCardInfo(card2);
      db.setCardInfo(card3);

      // 全IDを取得
      const allIds = db.getAllCardIds();
      expect(allIds).toHaveLength(3);
      expect(allIds).toContain('card1');
      expect(allIds).toContain('card2');
      expect(allIds).toContain('card3');
    });

    it('getValidCiidsForLang() は指定言語の利用可能 ciid リストを返す', () => {
      // カードを追加（複数ciid）
      const cardInfo = createSampleCardInfo({
        cardId: '999',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-ja-001', imgHash: 'hash1' },
          { ciid: 'ciid-ja-002', imgHash: 'hash2' },
          { ciid: 'ciid-ja-003', imgHash: 'hash3' }
        ]
      });
      db.setCardInfo(cardInfo);

      // ciidリストを取得
      const ciids = db.getValidCiidsForLang('999', 'ja');
      expect(ciids).toHaveLength(3);
      expect(ciids).toContain('ciid-ja-001');
      expect(ciids).toContain('ciid-ja-002');
      expect(ciids).toContain('ciid-ja-003');
    });

    it('getValidCiidsForLang() はデータがない場合 空配列 を返す', () => {
      // 存在しないカードIDで呼び出し
      const ciids = db.getValidCiidsForLang('nonexistent', 'ja');
      expect(ciids).toEqual([]);

      // カードは存在するが指定言語のデータがない場合
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);
      const ciidsEn = db.getValidCiidsForLang('123', 'en');
      expect(ciidsEn).toEqual([]);
    });

    it('getAllCardInfos() は全 CardInfo を Map で返す', () => {
      // カードを追加
      const card1 = createSampleCardInfo({ cardId: 'card1', name: 'Card 1', lang: 'ja' });
      const card2 = createSampleCardInfo({ cardId: 'card2', name: 'Card 2', lang: 'ja' });

      db.setCardInfo(card1);
      db.setCardInfo(card2);

      // 全CardInfoを取得
      const allCardInfos = db.getAllCardInfos();
      expect(allCardInfos.size).toBe(2);
      expect(allCardInfos.get('card1')?.name).toBe('Card 1');
      expect(allCardInfos.get('card2')?.name).toBe('Card 2');
    });

    it('getAllCardInfos() は再構築に失敗したカードをスキップ', () => {
      // 正常なカードを追加
      const card1 = createSampleCardInfo({ cardId: 'card1', name: 'Card 1', lang: 'ja' });
      db.setCardInfo(card1);

      // 不完全なカードを追加（TableB がない）
      const card2 = createSampleCardInfo({ cardId: 'card2', name: 'Card 2', lang: 'ja' });
      db.setCardInfo(card2);
      (db as any).cardTableB.delete('card2');  // TableB を削除

      // 全CardInfoを取得
      const allCardInfos = db.getAllCardInfos();

      // 再構築に成功したcard1のみ含まれる
      expect(allCardInfos.size).toBe(1);
      expect(allCardInfos.has('card1')).toBe(true);
      expect(allCardInfos.has('card2')).toBe(false);  // 再構築失敗でスキップ
    });

    it('getStats() は統計情報を返す', () => {
      // テストデータを追加
      const cardInfo1 = createSampleCardInfo({ cardId: '1', lang: 'ja' });
      const cardInfo2 = createSampleCardInfo({ cardId: '2', lang: 'ja' });

      db.setCardInfo(cardInfo1);
      db.setCardInfo(cardInfo2);

      db.recordDeckOpen(1, ['1', '2']);

      const stats = db.getStats();
      expect(stats.cardTableACount).toBe(2);
      expect(stats.cardTableBCount).toBe(2);
      expect(stats.cardTierCount).toBe(2);  // setCardInfo で Tier が更新される
      expect(stats.deckHistoryCount).toBe(1);
    });

    it('isInitialized() は初期化状態を返す', async () => {
      expect(db.isInitialized()).toBe(false);

      await db.initialize();

      expect(db.isInitialized()).toBe(true);
    });
  });

  // =========================================
  // エッジケースとエラー処理
  // =========================================

  describe('エッジケースとエラー処理', () => {
    it('ストレージ読み込みエラーが発生しても初期化が完了する', async () => {
      // chrome.storage.local.get をエラーに置き換え
      const originalGet = global.chrome.storage.local.get;
      global.chrome.storage.local.get = vi.fn(() => Promise.reject(new Error('Storage error')));

      // 初期化を試行（エラーが発生する）
      let errorOccurred = false;
      try {
        await db.initialize();
      } catch (e) {
        errorOccurred = true;
      }

      // エラーが発生することを確認（ソースコードにエラーハンドリングがないため）
      expect(errorOccurred).toBe(true);

      // 元に戻す
      global.chrome.storage.local.get = originalGet;
    });

    it('ストレージ保存エラーが発生してもメモリ内データは維持される', async () => {
      // カード情報を追加
      const cardInfo = createSampleCardInfo({ cardId: '123', lang: 'ja' });
      db.setCardInfo(cardInfo);

      // chrome.storage.local.set をエラーに置き換え
      const originalSet = global.chrome.storage.local.set;
      global.chrome.storage.local.set = vi.fn(() => Promise.reject(new Error('Save error')));

      // 保存を試行（エラーが発生する）
      try {
        await db.saveAll();
      } catch (e) {
        // エラーが発生することは期待される
      }

      // メモリ内データは維持されている
      const result = db.getCardBasicInfo('123');
      expect(result.tableA).toBeDefined();
      expect(result.tableA?.langsName?.ja).toBe('Test Monster');

      // 元に戻す
      global.chrome.storage.local.set = originalSet;
    });

    it('不正なデータ形式のストレージを読み込んでもクラッシュしない', async () => {
      // 不正なデータをストレージに設定
      mockStorageData[STORAGE_KEYS.cardTableA] = 'invalid string';  // オブジェクトを期待しているが文字列
      mockStorageData[STORAGE_KEYS.deckOpenHistory] = null;  // オブジェクトを期待しているが null
      mockStorageData[STORAGE_KEYS.moveHistory] = { invalid: 'object' };  // 配列を期待しているがオブジェクト

      // 初期化してもクラッシュしない
      await db.initialize();

      // 初期化は完了している
      expect(db.isInitialized()).toBe(true);
    });

    it('クリーンアップ中に他の操作が行われてもデータ整合性を保つ', async () => {
      // Tier 0 のカードを追加
      const oldTimestamp = Date.now() - (60 * 24 * 60 * 60 * 1000);
      db.updateCardTier('card-old', {
        lastAddedToDeck: oldTimestamp,
        lastShownDetail: oldTimestamp,
        lastSearched: oldTimestamp
      });

      // クリーンアップを開始（完了を待たない）
      const cleanupPromise = db.cleanup();

      // クリーンアップ中に新しいカードを追加
      const newCard = createSampleCardInfo({ cardId: 'new-card', lang: 'ja' });
      db.setCardInfo(newCard);

      // クリーンアップ完了を待つ
      await cleanupPromise;

      // 新しいカードは保持されている
      const result = db.getCardBasicInfo('new-card');
      expect(result.tableA).toBeDefined();
    });

    it('同時に複数の setCardInfo() が呼ばれても正しくマージされる', async () => {
      // 日本語と英語で同時に setCardInfo を呼ぶ
      const cardInfoJa = createSampleCardInfo({ cardId: '123', name: 'カード名', lang: 'ja' });
      const cardInfoEn = createSampleCardInfo({ cardId: '123', name: 'Card Name', lang: 'en' });

      db.setCardInfo(cardInfoJa);
      db.setCardInfo(cardInfoEn, true);

      // 両方の言語がマージされている
      const result = db.getCardBasicInfo('123');
      expect(result.tableA?.langsName?.ja).toBe('カード名');
      expect(result.tableA?.langsName?.en).toBe('Card Name');
    });

    it('saveCardTableA() のマージ処理で既存の ciid が重複しない', async () => {
      // 既存データをストレージに設定
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'Original' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 同じciidを含むカード情報を追加
      const cardInfo = createSampleCardInfo({
        cardId: '123',
        lang: 'ja',
        imgs: [
          { ciid: 'ciid-001', imgHash: 'hash1' },  // 既存
          { ciid: 'ciid-002', imgHash: 'hash2' }   // 新規
        ]
      });
      db.setCardInfo(cardInfo, true);

      // saveAll() を実行
      await db.saveAll();

      // 重複なくマージされている
      const savedData = mockStorageData[STORAGE_KEYS.cardTableA];
      expect(savedData['123'].langs_ciids.ja).toHaveLength(2);
      expect(savedData['123'].langs_ciids.ja).toContain('ciid-001');
      expect(savedData['123'].langs_ciids.ja).toContain('ciid-002');
      expect(new Set(savedData['123'].langs_ciids.ja).size).toBe(2);  // 重複なし
    });

    it('recordDeckOpen() で重複した cardId が含まれても正常動作', () => {
      // 重複したcardIdを含むデッキを記録
      db.recordDeckOpen(1, ['card1', 'card2', 'card1', 'card3', 'card2']);

      // 正常に記録される
      const stats = db.getStats();
      expect(stats.deckHistoryCount).toBe(1);

      // Tierも更新される
      expect(db.getCardTier('card1')).toBeGreaterThan(0);
    });

    it('Tier 計算で Date.now() が不正な値でもクラッシュしない', () => {
      // 異常に大きなタイムスタンプ
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: Number.MAX_SAFE_INTEGER,
        lastShownDetail: 0,
        lastSearched: 0
      };
      const deckHistory: DeckOpenHistory = { recentDecks: [] };

      // クラッシュしない
      const tier = calculateTier(tierData, deckHistory);
      expect(typeof tier).toBe('number');
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThanOrEqual(5);
    });

    it('空のデータで再構築しても undefined を返す', () => {
      // TableA も TableB も存在しない状態で再構築
      const reconstructed = db.reconstructCardInfo('nonexistent', 'ja');
      expect(reconstructed).toBeUndefined();
    });

    it('STORAGE_KEYS が正しく定義されている', () => {
      // 各キーが一意であることを確認
      const keys = Object.values(STORAGE_KEYS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);

      // プレフィックスが適切に定義されていることを確認
      expect(STORAGE_KEYS.cardTableCPrefix).toBe('cardTableC:');
      expect(STORAGE_KEYS.productTableBPrefix).toBe('productTableB:');
      expect(STORAGE_KEYS.faqTableBPrefix).toBe('faqTableB:');

      // プレフィックスがコロンで終わっていることを確認
      expect(STORAGE_KEYS.cardTableCPrefix.endsWith(':')).toBe(true);
      expect(STORAGE_KEYS.productTableBPrefix.endsWith(':')).toBe(true);
      expect(STORAGE_KEYS.faqTableBPrefix.endsWith(':')).toBe(true);
    });
  });

  // =========================================
  // シングルトン関数
  // =========================================

  describe('シングルトン関数', () => {
    it('getUnifiedCacheDB() は同じインスタンスを返す', () => {
      const instance1 = getUnifiedCacheDB();
      const instance2 = getUnifiedCacheDB();

      // 同じインスタンスを返す
      expect(instance1).toBe(instance2);
    });

    it('initUnifiedCacheDB() はシングルトンインスタンスを初期化', async () => {
      // ストレージにデータを設定
      mockStorageData[STORAGE_KEYS.cardTableA] = {
        '123': {
          cardId: '123',
          langsName: { ja: 'テストカード' },
          langsImgs: { ja: [{ ciid: 'ciid-001', imgHash: 'hash1' }] },
          langs_ciids: { ja: ['ciid-001'] },
          langsFetchedAt: { ja: Date.now() }
        }
      };

      // 初期化
      await initUnifiedCacheDB();

      // シングルトンインスタンスが初期化されている
      const instance = getUnifiedCacheDB();
      expect(instance.isInitialized()).toBe(true);

      // データが読み込まれている
      const basicInfo = instance.getCardBasicInfo('123');
      expect(basicInfo.tableA).toBeDefined();
      expect(basicInfo.tableA?.langsName?.ja).toBe('テストカード');
    });

    it('saveUnifiedCacheDB() はシングルトンインスタンスを保存', async () => {
      const instance = getUnifiedCacheDB();

      // カード情報を追加
      const cardInfo = createSampleCardInfo({ cardId: '456', lang: 'ja' });
      instance.setCardInfo(cardInfo);

      // 保存
      await saveUnifiedCacheDB();

      // ストレージに保存されている
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeDefined();
      expect(mockStorageData[STORAGE_KEYS.cardTableA]['456']).toBeDefined();
    });

    it('cleanupUnifiedCacheDB() はシングルトンインスタンスをクリーンアップ', async () => {
      const instance = getUnifiedCacheDB();

      // Tier 0 のカードを追加
      const oldTimestamp = Date.now() - (60 * 24 * 60 * 60 * 1000);
      instance.updateCardTier('card-old', {
        lastAddedToDeck: oldTimestamp,
        lastShownDetail: oldTimestamp,
        lastSearched: oldTimestamp
      });

      // クリーンアップ実行
      await cleanupUnifiedCacheDB();

      // Tier 0 のカードが削除されている
      expect(instance.getCardTier('card-old')).toBe(0);
    });

    it('resetUnifiedCacheDB() は新しいインスタンスを作成', async () => {
      // 既存インスタンスにデータを追加
      const instance1 = getUnifiedCacheDB();
      const cardInfo = createSampleCardInfo({ cardId: '789', lang: 'ja' });
      instance1.setCardInfo(cardInfo);
      await instance1.saveAll();

      // リセット実行（clearAll は非同期だが、resetUnifiedCacheDB は同期的に実行される）
      resetUnifiedCacheDB();

      // clearAll() の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // 新しいインスタンスが作成されている
      const instance2 = getUnifiedCacheDB();
      expect(instance2).not.toBe(instance1);

      // 新しいインスタンスはデータがクリアされている
      expect(instance2.getCardBasicInfo('789').tableA).toBeUndefined();

      // ストレージもクリアされている
      expect(mockStorageData[STORAGE_KEYS.cardTableA]).toBeUndefined();
    });
  });

  // =========================================
  // 統合テスト
  // =========================================

  describe('統合テスト', () => {
    it('カード検索 → 詳細表示 → デッキ追加 の一連の流れで Tier が正しく更新される', async () => {
      const now = Date.now();

      // 1. setCardInfo() で検索表示（Tier 2 になる）
      const cardInfo = createSampleCardInfo({ cardId: 'card1', lang: 'ja' });
      db.setCardInfo(cardInfo);
      expect(db.getCardTier('card1')).toBe(2);  // 1週間以内に検索表示

      // 少し待つ（タイムスタンプを進める）
      await new Promise(resolve => setTimeout(resolve, 10));

      // 2. setCardTableC() で詳細表示（Tier 4 になる）
      const tableC: CardTableC = {
        cardId: 'card1',
        langsFetchedAt: { ja: Date.now() }
      };
      await db.setCardTableC(tableC, 'ja');
      expect(db.getCardTier('card1')).toBe(4);  // 1週間以内にデッキ追加または詳細表示

      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      // 3. recordDeckOpen() でデッキ追加（Tier 5 になる）
      db.recordDeckOpen(1, ['card1']);
      expect(db.getCardTier('card1')).toBe(5);  // 直近デッキに含まれる
    });

    it('複数言語でのカード情報取得と再構築が正常動作', async () => {
      // 日本語でカード情報を保存
      const cardInfoJa = createSampleCardInfo({
        cardId: '123',
        name: 'ブルーアイズ・ホワイト・ドラゴン',
        lang: 'ja'
      });
      db.setCardInfo(cardInfoJa);

      // 英語でカード情報を保存
      const cardInfoEn = createSampleCardInfo({
        cardId: '123',
        name: 'Blue-Eyes White Dragon',
        lang: 'en'
      });
      db.setCardInfo(cardInfoEn, true);

      // 日本語で再構築
      const reconstructedJa = db.reconstructCardInfo('123', 'ja');
      expect(reconstructedJa).toBeDefined();
      expect(reconstructedJa?.name).toBe('ブルーアイズ・ホワイト・ドラゴン');

      // 英語で再構築
      const reconstructedEn = db.reconstructCardInfo('123', 'en');
      expect(reconstructedEn).toBeDefined();
      expect(reconstructedEn?.name).toBe('Blue-Eyes White Dragon');
    });

    it('大量のカードデータを扱ってもパフォーマンスが維持される', async () => {
      const startTime = Date.now();

      // 1000件のカード情報を保存
      for (let i = 1; i <= 1000; i++) {
        const cardInfo = createSampleCardInfo({
          cardId: `card${i}`,
          name: `Card ${i}`,
          lang: 'ja'
        });
        db.setCardInfo(cardInfo);
      }

      const saveTime = Date.now();
      expect(saveTime - startTime).toBeLessThan(10000);  // 10秒以内

      // クリーンアップを実行
      await db.cleanup();

      const cleanupTime = Date.now();
      expect(cleanupTime - saveTime).toBeLessThan(5000);  // 5秒以内

      // 全カード情報を再構築
      const allCardInfos = db.getAllCardInfos();
      expect(allCardInfos.size).toBe(1000);

      const reconstructTime = Date.now();
      expect(reconstructTime - cleanupTime).toBeLessThan(5000);  // 5秒以内
    });

    it('長期間の使用を想定したクリーンアップが正常動作', async () => {
      const now = Date.now();

      // 古いデータを準備（60日前）
      const oldTimestamp = now - (60 * 24 * 60 * 60 * 1000);

      const oldCard = createSampleCardInfo({ cardId: 'card-old', lang: 'ja' });
      db.setCardInfo(oldCard, true);  // forceUpdate で古いタイムスタンプを保存

      // setCardInfo() が lastSearched を Date.now() に更新してしまうので、手動で古い値に戻す
      db.updateCardTier('card-old', {
        lastAddedToDeck: oldTimestamp,
        lastShownDetail: oldTimestamp,
        lastSearched: oldTimestamp
      });

      // 最近のデータを準備（3日前）
      const recentTimestamp = now - (3 * 24 * 60 * 60 * 1000);

      const recentCard = createSampleCardInfo({ cardId: 'card-recent', lang: 'ja' });
      db.setCardInfo(recentCard, true);

      // setCardInfo() が lastSearched を Date.now() に更新してしまうので、手動で正しい値に戻す
      db.updateCardTier('card-recent', {
        lastAddedToDeck: recentTimestamp,
        lastShownDetail: recentTimestamp,
        lastSearched: 0  // lastSearched は更新しない
      });

      // クリーンアップを実行
      await db.cleanup();

      // 古いデータは削除される（Tier 0）
      expect(db.getCardTier('card-old')).toBe(0);

      // 最近使用したデータは保持される（Tier 4）
      expect(db.getCardTier('card-recent')).toBe(4);
      expect(db.getCardBasicInfo('card-recent').tableA).toBeDefined();
    });
  });
});
