import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UnifiedCacheDB,
  calculateTier,
  STORAGE_KEYS
} from '../unified-cache-db';
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
} from '../../types/card';

// Chrome Storage APIのモック
const mockStorage: Record<string, any> = {};

global.chrome = {
  runtime: {
    id: 'test-extension-id', // Extension context のモック
    lastError: undefined
  },
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: any) => void) => {
        let result: Record<string, any> = {};

        if (typeof keys === 'string') {
          result = { [keys]: mockStorage[keys] };
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = mockStorage[key];
          });
        } else {
          result = { ...mockStorage };
        }

        // コールバックがある場合は呼び出す（chrome.storage.local.get はコールバックベース）
        if (callback) {
          callback(result);
        }

        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, any>, callback?: () => void) => {
        Object.assign(mockStorage, items);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[], callback?: () => void) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => delete mockStorage[key]);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: vi.fn((callback?: () => void) => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  }
} as any;

describe('unified-cache-db', () => {
  beforeEach(() => {
    // ストレージをクリア
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateTier', () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    it('Tier 5: 直近5回で開いたデッキに含まれるカード', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 100 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 100 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: [
          { dno: 1, cardIds: ['card1', 'card2'], openedAt: now },
          { dno: 2, cardIds: ['card3'], openedAt: now - oneDay }
        ]
      };

      expect(calculateTier(tierData, deckHistory)).toBe(5);
    });

    it('Tier 4: デッキ追加 or 詳細表示が1週間以内', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 3 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 100 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: [
          { dno: 2, cardIds: ['card3'], openedAt: now }
        ]
      };

      expect(calculateTier(tierData, deckHistory)).toBe(4);
    });

    it('Tier 4: 詳細表示が1週間以内（デッキ追加より新しい）', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 100 * oneDay,
        lastShownDetail: now - 2 * oneDay,
        lastSearched: now - 100 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      expect(calculateTier(tierData, deckHistory)).toBe(4);
    });

    it('Tier 3: デッキ追加 or 詳細表示が1ヶ月以内', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 15 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 100 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      expect(calculateTier(tierData, deckHistory)).toBe(3);
    });

    it('Tier 2: 検索表示が1週間以内', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 100 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 3 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      expect(calculateTier(tierData, deckHistory)).toBe(2);
    });

    it('Tier 1: 検索表示が1ヶ月以内', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 100 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 20 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      expect(calculateTier(tierData, deckHistory)).toBe(1);
    });

    it('Tier 0: すべて1ヶ月以上前', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 100 * oneDay,
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 100 * oneDay
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: []
      };

      expect(calculateTier(tierData, deckHistory)).toBe(0);
    });

    it('複数条件: Tier 5が最優先', () => {
      const tierData: CardTier = {
        cardId: 'card1',
        lastAddedToDeck: now - 1 * oneDay, // Tier 4相当
        lastShownDetail: now - 100 * oneDay,
        lastSearched: now - 1 * oneDay // Tier 2相当
      };

      const deckHistory: DeckOpenHistory = {
        recentDecks: [
          { dno: 1, cardIds: ['card1'], openedAt: now }
        ]
      };

      // Tier 5が最優先
      expect(calculateTier(tierData, deckHistory)).toBe(5);
    });
  });

  describe('UnifiedCacheDB - 初期化', () => {
    let db: UnifiedCacheDB;

    beforeEach(() => {
      db = new UnifiedCacheDB();
    });

    it('initialize: 空のストレージから初期化', async () => {
      await db.initialize();

      expect(db.isInitialized()).toBe(true);
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });

    it('initialize: 既存データをロード', async () => {
      const cardTierData: Record<string, CardTier> = {
        'card1': {
          cardId: 'card1',
          lastAddedToDeck: Date.now(),
          lastShownDetail: Date.now(),
          lastSearched: Date.now()
        }
      };

      const cardTableAData: Record<string, CardTableA> = {
        'card1': {
          cardId: 'card1',
          names: { ja: 'カード1' },
          langsImgs: {},
          langs_ciids: {},
          langsRuby: {},
          cardTypes: [1],
          mainTypes: [],
          fetchedAt: Date.now()
        }
      };

      mockStorage[STORAGE_KEYS.cardTier] = cardTierData;
      mockStorage[STORAGE_KEYS.cardTableA] = cardTableAData;

      await db.initialize();

      const basicInfo = db.getCardBasicInfo('card1');
      expect(basicInfo.tableA).toBeDefined();
      expect(basicInfo.tableA?.names.ja).toBe('カード1');
    });

    it('initialize: 複数回呼び出しても問題ない', async () => {
      await db.initialize();
      await db.initialize();
      await db.initialize();

      expect(db.isInitialized()).toBe(true);
      // 初回のみストレージアクセス
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });

    it('initialize: 自動クリーンアップが24時間以上前なら実行される', async () => {
      const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000;
      mockStorage[STORAGE_KEYS.lastCleanupAt] = oneDayAgo;

      await db.initialize();

      // クリーンアップが実行され、lastCleanupAtが更新される
      expect(mockStorage[STORAGE_KEYS.lastCleanupAt]).toBeGreaterThan(oneDayAgo);
    });

    it('initialize: 自動クリーンアップが24時間以内ならスキップ', async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      mockStorage[STORAGE_KEYS.lastCleanupAt] = oneHourAgo;

      await db.initialize();

      // クリーンアップはスキップされ、lastCleanupAtは変わらない
      expect(mockStorage[STORAGE_KEYS.lastCleanupAt]).toBe(oneHourAgo);
    });
  });

  describe('UnifiedCacheDB - カード基本操作', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('setCardInfo: 新しいカード情報を設定', () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'テストカード',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: 'テスト説明',
        icon: 'normal'
      };

      const result = db.setCardInfo(cardInfo);
      expect(result).toBe(true);

      const basicInfo = db.getCardBasicInfo('card1');
      expect(basicInfo.tableA).toBeDefined();
      expect(basicInfo.tableA?.langsName?.ja).toBe('テストカード');
    });

    it('setCardInfo: 既存カード情報を更新', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード旧',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '旧説明',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo1);

      const cardInfo2: CardInfo = {
        ...cardInfo1,
        name: 'カード新',
        desc: '新説明'
      };

      const result = db.setCardInfo(cardInfo2, true);
      expect(result).toBe(true);

      const basicInfo = db.getCardBasicInfo('card1');
      expect(basicInfo.tableA?.langsName?.ja).toBe('カード新');
    });

    it('getCardBasicInfo: 存在しないカードはundefined', () => {
      const basicInfo = db.getCardBasicInfo('nonexistent');
      expect(basicInfo.tableA).toBeUndefined();
      expect(basicInfo.tableB).toBeUndefined();
    });

    it('getAllCardIds: すべてのカードIDを取得', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      const cardInfo2: CardInfo = {
        cardId: 'card2',
        lang: 'ja',
        name: 'カード2',
        imgs: [],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo1);
      db.setCardInfo(cardInfo2);

      const cardIds = db.getAllCardIds();
      expect(cardIds).toContain('card1');
      expect(cardIds).toContain('card2');
      expect(cardIds.length).toBe(2);
    });
  });

  describe('UnifiedCacheDB - 保存', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('saveAll: すべてのデータを保存', async () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo);

      await db.saveAll();

      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(mockStorage[STORAGE_KEYS.cardTableA]).toBeDefined();
    });
  });

  describe('UnifiedCacheDB - Tier管理', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('updateCardTier: カードTierを更新（検索）', () => {
      db.updateCardTier('card1', { lastSearched: Date.now() });

      const tier = db.getCardTier('card1');
      expect(tier).toBeGreaterThan(0);
    });

    it('updateCardTier: カードTierを更新（デッキ追加）', () => {
      db.updateCardTier('card1', { lastAddedToDeck: Date.now() });

      const tier = db.getCardTier('card1');
      expect(tier).toBeGreaterThan(0);
    });

    it('updateCardTier: カードTierを更新（詳細表示）', () => {
      db.updateCardTier('card1', { lastShownDetail: Date.now() });

      const tier = db.getCardTier('card1');
      expect(tier).toBeGreaterThan(0);
    });

    it('recordDeckOpen: デッキオープン履歴を記録', () => {
      db.recordDeckOpen(1, ['card1', 'card2', 'card3']);

      const tier = db.getCardTier('card1');
      expect(tier).toBe(5); // 直近デッキに含まれるのでTier 5
    });

    it('recordDeckOpen: 最大5個のデッキ履歴を保持', () => {
      for (let i = 1; i <= 10; i++) {
        db.recordDeckOpen(i, [`card${i}`]);
      }

      // 古いデッキのカードはTier 5ではない
      const tier1 = db.getCardTier('card1');
      expect(tier1).toBeLessThan(5);

      // 新しいデッキのカードはTier 5
      const tier10 = db.getCardTier('card10');
      expect(tier10).toBe(5);
    });
  });

  describe('UnifiedCacheDB - Move History', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('recordMove: 移動履歴を記録', () => {
      db.recordMove({ action: 'add', cardId: 'card1', to: 'main' });

      const history = db.getMoveHistory();
      expect(history.length).toBe(1);
      expect(history[0].action).toBe('add');
      expect(history[0].cardId).toBe('card1');
    });

    it('getMoveHistory: 制限付きで取得', () => {
      db.recordMove({ action: 'add', cardId: 'card1', to: 'main' });
      db.recordMove({ action: 'move', cardId: 'card1', from: 'main', to: 'side' });
      db.recordMove({ action: 'remove', cardId: 'card1', from: 'side' });

      const history = db.getMoveHistory(2);
      expect(history.length).toBe(2);
      expect(history[0].action).toBe('move');
      expect(history[1].action).toBe('remove');
    });

    it('clearMoveHistory: 履歴をクリア', () => {
      db.recordMove({ action: 'add', cardId: 'card1' });
      db.clearMoveHistory();

      const history = db.getMoveHistory();
      expect(history.length).toBe(0);
    });

    it('recordMove: 最大1000件まで保持', () => {
      for (let i = 0; i < 1100; i++) {
        db.recordMove({ action: 'add', cardId: `card${i}` });
      }

      const history = db.getMoveHistory();
      expect(history.length).toBe(1000);
    });
  });

  describe('UnifiedCacheDB - getStats', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('getStats: 初期状態では0', () => {
      const stats = db.getStats();
      expect(stats.cardTableACount).toBe(0);
      expect(stats.cardTierCount).toBe(0);
    });

    it('getStats: データ追加後に正しくカウント', () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo);
      db.updateCardTier('card1', { lastSearched: Date.now() });

      const stats = db.getStats();
      expect(stats.cardTableACount).toBe(1);
      expect(stats.cardTierCount).toBe(1);
    });
  });

  describe('UnifiedCacheDB - clearAll', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('clearAll: すべてのデータを削除', async () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo);
      await db.saveAll();

      // spy をリセットしてから clearAll を呼ぶ
      vi.clearAllMocks();

      await db.clearAll();

      const stats = db.getStats();
      expect(stats.cardTableACount).toBe(0);
      expect(stats.cardTierCount).toBe(0);
      // clearAll は remove を使う（clear ではない）
      expect(chrome.storage.local.remove).toHaveBeenCalled();
    });
  });

  describe('UnifiedCacheDB - CardTableC', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('getCardTableC: 存在しないカードはundefined', async () => {
      const result = await db.getCardTableC('nonexistent');
      expect(result).toBeUndefined();
    });

    it('setCardTableC: 新しいCardTableCを設定', async () => {
      const cardTableC: CardTableC = {
        cardId: 'card1',
        lang: 'ja',
        text: 'テストテキスト',
        fetchedAt: Date.now()
      };

      await db.setCardTableC(cardTableC, 'ja');

      const result = await db.getCardTableC('card1');
      expect(result).toBeDefined();
      expect(result?.text).toBe('テストテキスト');
    });

    it('hasCardTableC: CardTableCの存在確認', async () => {
      expect(db.hasCardTableC('card1')).toBe(false);

      const cardTableC: CardTableC = {
        cardId: 'card1',
        lang: 'ja',
        text: 'テスト',
        fetchedAt: Date.now()
      };

      await db.setCardTableC(cardTableC, 'ja');

      expect(db.hasCardTableC('card1')).toBe(true);
    });

    it('updateCardTableCFetchedAt: langsFetchedAtを更新', async () => {
      const cardTableC: CardTableC = {
        cardId: 'card1',
        lang: 'ja',
        text: 'テスト',
        fetchedAt: Date.now(),
        langsFetchedAt: { ja: Date.now() - 10000 }
      };

      await db.setCardTableC(cardTableC, 'ja');

      const oldLangFetchedAt = cardTableC.langsFetchedAt!.ja;

      // 少し待ってから更新
      await new Promise(resolve => setTimeout(resolve, 50));
      await db.updateCardTableCFetchedAt('card1', 'ja');

      const result = await db.getCardTableC('card1');
      expect(result).toBeDefined();
      expect(result?.langsFetchedAt?.ja).toBeGreaterThan(oldLangFetchedAt);
    });
  });

  describe('UnifiedCacheDB - Product/FAQ', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('getProductA/setProductA: ProductTableA の取得と設定', () => {
      const productA: ProductTableA = {
        packId: 'pack1',
        names: { ja: 'パック1' },
        fetchedAt: Date.now()
      };

      db.setProductA(productA);

      const result = db.getProductA('pack1');
      expect(result).toBeDefined();
      expect(result?.names.ja).toBe('パック1');
    });

    it('getProductA: 存在しないパックはundefined', () => {
      const result = db.getProductA('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getProductB/setProductB: ProductTableB の取得と設定', async () => {
      const productB: ProductTableB = {
        packId: 'pack1',
        lang: 'ja',
        releaseDate: '2024-01-01',
        fetchedAt: Date.now()
      };

      await db.setProductB(productB);

      const result = await db.getProductB('pack1');
      expect(result).toBeDefined();
      expect(result?.releaseDate).toBe('2024-01-01');
    });

    it('getProductB: 存在しないパックはundefined', async () => {
      const result = await db.getProductB('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getFAQA/setFAQA: FAQTableA の取得と設定', () => {
      const faqA: FAQTableA = {
        faqId: 'faq1',
        cardId: 'card1',
        fetchedAt: Date.now()
      };

      db.setFAQA(faqA);

      const result = db.getFAQA('faq1');
      expect(result).toBeDefined();
      expect(result?.cardId).toBe('card1');
    });

    it('getFAQA: 存在しないFAQはundefined', () => {
      const result = db.getFAQA('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getFAQB/setFAQB: FAQTableB の取得と設定', async () => {
      const faqB: FAQTableB = {
        faqId: 'faq1',
        lang: 'ja',
        question: '質問',
        answer: '回答',
        fetchedAt: Date.now()
      };

      await db.setFAQB(faqB);

      const result = await db.getFAQB('faq1');
      expect(result).toBeDefined();
      expect(result?.question).toBe('質問');
      expect(result?.answer).toBe('回答');
    });

    it('getFAQB: 存在しないFAQはundefined', async () => {
      const result = await db.getFAQB('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('UnifiedCacheDB - setCardInfo 複雑なケース', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('setCardInfo: TTLチェックでキャッシュ有効な場合はfalseを返す', () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      const result1 = db.setCardInfo(cardInfo);
      expect(result1).toBe(true); // 初回はtrue

      const result2 = db.setCardInfo(cardInfo);
      expect(result2).toBe(false); // TTL内なのでfalse
    });

    it('setCardInfo: 新しいciidがある場合はTTL内でもtrueを返す', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo1);

      const cardInfo2: CardInfo = {
        ...cardInfo1,
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }, { ciid: 'img2', imgHash: 'hash2' }]
      };

      const result = db.setCardInfo(cardInfo2);
      expect(result).toBe(true); // 新しいciidがあるのでtrue
    });

    it('setCardInfo: 複数言語のデータを正しく保存', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      const cardInfo2: CardInfo = {
        cardId: 'card1',
        lang: 'en',
        name: 'Card 1',
        imgs: [{ ciid: 'img2', imgHash: 'hash2' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo1);
      db.setCardInfo(cardInfo2);

      const basicInfo = db.getCardBasicInfo('card1');
      expect(basicInfo.tableA?.langsName?.ja).toBe('カード1');
      expect(basicInfo.tableA?.langsName?.en).toBe('Card 1');
      expect(basicInfo.tableA?.langsImgs?.ja).toHaveLength(1);
      expect(basicInfo.tableA?.langsImgs?.en).toHaveLength(1);
    });

    it('setCardInfo: ciidのマージが正しく動作', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo1);

      const cardInfo2: CardInfo = {
        ...cardInfo1,
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }, { ciid: 'img2', imgHash: 'hash2' }]
      };

      db.setCardInfo(cardInfo2, true); // forceUpdate

      const basicInfo = db.getCardBasicInfo('card1');
      const jaImgs = basicInfo.tableA?.langsImgs?.ja || [];
      expect(jaImgs).toHaveLength(2);
      expect(jaImgs.map(img => img.ciid)).toContain('img1');
      expect(jaImgs.map(img => img.ciid)).toContain('img2');
    });
  });

  describe('UnifiedCacheDB - ユーティリティメソッド', () => {
    let db: UnifiedCacheDB;

    beforeEach(async () => {
      db = new UnifiedCacheDB();
      await db.initialize();
    });

    it('getValidCiidsForLang: 言語ごとの有効なciidを取得', () => {
      const cardInfo: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }, { ciid: 'img2', imgHash: 'hash2' }],
        cardTypes: [1],
        mainTypes: [],
        desc: '',
        icon: 'normal'
      };

      db.setCardInfo(cardInfo);

      const ciids = db.getValidCiidsForLang('card1', 'ja');
      expect(ciids).toHaveLength(2);
      expect(ciids).toContain('img1');
      expect(ciids).toContain('img2');
    });

    it('getValidCiidsForLang: 存在しないカードは空配列', () => {
      const ciids = db.getValidCiidsForLang('nonexistent', 'ja');
      expect(ciids).toEqual([]);
    });

    it('getAllCardInfos: 全カード情報を取得', () => {
      const cardInfo1: CardInfo = {
        cardId: 'card1',
        lang: 'ja',
        name: 'カード1',
        cardType: 'monster',
        imgs: [{ ciid: 'img1', imgHash: 'hash1' }],
        attribute: 'dark',
        race: 'warrior',
        levelType: 'level',
        levelValue: 4,
        types: [],
        atk: 1000,
        def: 1000,
        isExtraDeck: false
      };

      const cardInfo2: CardInfo = {
        cardId: 'card2',
        lang: 'ja',
        name: 'カード2',
        cardType: 'spell',
        imgs: [{ ciid: 'img2', imgHash: 'hash2' }],
        effectType: 'normal'
      };

      db.setCardInfo(cardInfo1);
      db.setCardInfo(cardInfo2);

      const allCards = db.getAllCardInfos();
      expect(allCards.size).toBe(2);
      expect(allCards.has('card1')).toBe(true);
      expect(allCards.has('card2')).toBe(true);
    });
  });
});
