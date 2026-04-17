import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUnifiedCacheDB, resetUnifiedCacheDB } from '@/utils/unified-cache-db';
import type { CardInfo } from '@/types/card';

// detectLanguage をモック
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja')
}));

describe('utils/unified-cache-db', () => {
  let mockStorage: Record<string, any>;

  beforeEach(() => {
    // chrome.storage.local のモック
    mockStorage = {};
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keysOrNull, callback) => {
            let result: Record<string, any> = {};
            if (Array.isArray(keysOrNull)) {
              keysOrNull.forEach(key => {
                if (mockStorage[key]) {
                  result[key] = mockStorage[key];
                }
              });
            } else if (keysOrNull === null || keysOrNull === undefined) {
              // keys が指定されていない場合、全てのキーを返す
              result = { ...mockStorage };
            }
            // コールバックベースと Promise ベースの両方に対応
            if (callback) {
              callback(result);
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(mockStorage, items);
            if (callback) callback();
            return Promise.resolve();
          }),
          remove: vi.fn((keys, callback) => {
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                delete mockStorage[key];
              });
            }
            if (callback) callback();
            return Promise.resolve();
          })
        }
      },
      runtime: {}
    } as any;

    resetUnifiedCacheDB();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('キャッシュ TTL 境界値テスト', () => {
    it('age < cacheTTL の判定テスト: age = 0 のとき valid', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-1',
        name: 'Test Card',
        cardType: 'monster',
        attribute: 'water',
        race: 'aqua',
        levelType: 'normal',
        levelValue: 4,
        atk: 1000,
        def: 2000,
        types: ['aqua', 'effect'],
        text: 'Test card effect',
        imgs: [{ ciid: 'ciid-1', url: 'http://example.com/card1.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：キャッシュなし、保存成功
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // 2回目：即座にアクセス（age = 0）、キャッシュ有効のため false を返す
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(false);
    });

    it('age = cacheTTL - 1 のとき valid', async () => {
      // vi.useFakeTimers() を先に呼ぶ（時刻制御を開始）
      vi.useFakeTimers();

      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-2',
        name: 'Test Card 2',
        cardType: 'spell',
        text: 'Spell effect',
        imgs: [{ ciid: 'ciid-2', url: 'http://example.com/card2.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：キャッシュなし、保存成功
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // TTLを取得
      const cacheTTL = (db as any).cacheTTL;

      // TTL - 1 ミリ秒進める
      vi.setSystemTime(Date.now() + (cacheTTL - 1));

      // 2回目：キャッシュ有効
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(false);

      vi.useRealTimers();
    });

    it('age = cacheTTL のとき expired', async () => {
      // vi.useFakeTimers() を先に呼ぶ（時刻制御を開始）
      vi.useFakeTimers();

      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-3',
        name: 'Test Card 3',
        cardType: 'trap',
        text: 'Trap effect',
        imgs: [{ ciid: 'ciid-3', url: 'http://example.com/card3.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：キャッシュなし、保存成功
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // TTLを取得
      const cacheTTL = (db as any).cacheTTL;

      // TTL ミリ秒進める
      vi.setSystemTime(Date.now() + cacheTTL);

      // 2回目：キャッシュ無効、新規保存（true を返す）
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(true);

      vi.useRealTimers();
    });

    it('age = cacheTTL + 1 のとき expired', async () => {
      // vi.useFakeTimers() を先に呼ぶ（時刻制御を開始）
      vi.useFakeTimers();

      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-4',
        name: 'Test Card 4',
        cardType: 'monster',
        attribute: 'fire',
        race: 'dragon',
        levelType: 'normal',
        levelValue: 5,
        atk: 1500,
        def: 1000,
        types: ['dragon', 'effect'],
        text: 'Dragon effect',
        imgs: [{ ciid: 'ciid-4', url: 'http://example.com/card4.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：キャッシュなし、保存成功
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // TTLを取得
      const cacheTTL = (db as any).cacheTTL;

      // TTL + 1 ミリ秒進める
      vi.setSystemTime(Date.now() + (cacheTTL + 1));

      // 2回目：キャッシュ無効、新規保存（true を返す）
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('言語別キャッシュ有効期限テスト', () => {
    it('ja キャッシュが有効な状態で en をリクエスト → 新規取得', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      // en言語のモックに切り替える
      const { detectLanguage: detectLanguageMock } = await import('@/utils/language-detector');
      const mockFn = detectLanguageMock as any;

      const cardInfoJa: CardInfo = {
        cardId: 'test-card-5',
        name: '日本語カード',
        cardType: 'monster',
        attribute: 'water',
        race: 'fish',
        levelType: 'normal',
        levelValue: 3,
        atk: 500,
        def: 1500,
        types: ['fish'],
        text: '日本語効果',
        imgs: [{ ciid: 'ciid-5', url: 'http://example.com/card5-ja.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      const cardInfoEn: CardInfo = {
        ...cardInfoJa,
        cardId: 'test-card-5', // 同じカード
        name: 'English Card',
        text: 'English effect',
        imgs: [{ ciid: 'ciid-5-en', url: 'http://example.com/card5-en.jpg' }],
        lang: 'en'
      };

      // 1回目：ja で保存
      const resultJa1 = db.setCardInfo(cardInfoJa, false);
      expect(resultJa1).toBe(true);

      // 2回目：ja で即座にアクセス（キャッシュ有効）
      const resultJa2 = db.setCardInfo(cardInfoJa, false);
      expect(resultJa2).toBe(false);

      // 3回目：en で保存（別言語なので新規取得）
      const resultEn1 = db.setCardInfo(cardInfoEn, false);
      expect(resultEn1).toBe(true);
    });

    it('ja キャッシュが無効な状態で ja をリクエスト → 新規取得', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-6',
        name: 'Test Card 6',
        cardType: 'spell',
        text: 'Spell effect',
        imgs: [{ ciid: 'ciid-6', url: 'http://example.com/card6.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：ja で保存
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // TTLを取得
      const cacheTTL = (db as any).cacheTTL;

      // TTL ミリ秒進める
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + cacheTTL);

      // 2回目：ja で再度保存（キャッシュ無効）
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('完全なCardInfoキャッシュ (getCardInfo / setCardInfoFull / hasCardInfo / clearCardInfoCache)', () => {
    const createTestCard = (cid: string): CardInfo => ({
      cardId: cid,
      name: `Card ${cid}`,
      cardType: 'monster',
      attribute: 'dark',
      race: 'warrior',
      levelType: 'normal',
      levelValue: 4,
      atk: 2000,
      def: 1500,
      types: ['warrior', 'effect'],
      text: 'Effect text',
      imgs: [{ ciid: `ciid-${cid}`, url: `http://example.com/${cid}.jpg` }],
      ruby: {},
      lang: 'ja'
    });

    it('getCardInfo: 存在しないカードはundefinedを返す', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      expect(db.getCardInfo('non-existent')).toBeUndefined();
    });

    it('setCardInfoFull + getCardInfo: カードを保存・取得できる', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const card = createTestCard('full-1');
      const result = db.setCardInfoFull('full-1', card);
      expect(result).toBe(true);

      const retrieved = db.getCardInfo('full-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Card full-1');
    });

    it('setCardInfoFull: TTL内の再設定はスキップされる', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const card = createTestCard('full-2');
      expect(db.setCardInfoFull('full-2', card)).toBe(true);
      expect(db.setCardInfoFull('full-2', card)).toBe(false);
    });

    it('setCardInfoFull: forceUpdate=trueでTTL内でも更新される', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const card = createTestCard('full-3');
      expect(db.setCardInfoFull('full-3', card)).toBe(true);
      expect(db.setCardInfoFull('full-3', card, true)).toBe(true);
    });

    it('setCardInfoFull: TTL経過後は更新される', async () => {
      vi.useFakeTimers();
      const db = getUnifiedCacheDB();
      await db.initialize();

      const card = createTestCard('full-4');
      expect(db.setCardInfoFull('full-4', card)).toBe(true);

      const cacheTTL = (db as any).cacheTTL;
      vi.setSystemTime(Date.now() + cacheTTL);

      expect(db.setCardInfoFull('full-4', card)).toBe(true);
      vi.useRealTimers();
    });

    it('hasCardInfo: 存在チェックが正しく動作する', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      expect(db.hasCardInfo('full-5')).toBe(false);

      db.setCardInfoFull('full-5', createTestCard('full-5'));
      expect(db.hasCardInfo('full-5')).toBe(true);
    });

    it('clearCardInfoCache: キャッシュがクリアされる', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      db.setCardInfoFull('full-6', createTestCard('full-6'));
      db.setCardInfoFull('full-7', createTestCard('full-7'));

      expect(db.hasCardInfo('full-6')).toBe(true);
      expect(db.hasCardInfo('full-7')).toBe(true);

      db.clearCardInfoCache();

      expect(db.hasCardInfo('full-6')).toBe(false);
      expect(db.hasCardInfo('full-7')).toBe(false);
      expect(db.getCardInfo('full-6')).toBeUndefined();
    });
  });

  describe('forceUpdate フラグテスト', () => {
    it('forceUpdate = true の場合、キャッシュ有効期限に関係なく新規保存される', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-7',
        name: 'Test Card 7',
        cardType: 'monster',
        attribute: 'light',
        race: 'fairy',
        levelType: 'normal',
        levelValue: 4,
        atk: 1200,
        def: 1800,
        types: ['fairy'],
        text: 'Fairy effect',
        imgs: [{ ciid: 'ciid-7', url: 'http://example.com/card7.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：保存成功
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // 2回目：即座にアクセス、forceUpdate = false（キャッシュ有効）
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(false);

      // 3回目：forceUpdate = true（強制更新）
      const result3 = db.setCardInfo(cardInfo, true);
      expect(result3).toBe(true);
    });
  });

  describe('langsFetchedAt フォールバックテスト', () => {
    it('langsFetchedAt[lang] が存在: その値を使用', async () => {
      const db = getUnifiedCacheDB();
      await db.initialize();

      const cardInfo: CardInfo = {
        cardId: 'test-card-8',
        name: 'Test Card 8',
        cardType: 'spell',
        text: 'Spell effect',
        imgs: [{ ciid: 'ciid-8', url: 'http://example.com/card8.jpg' }],
        ruby: {},
        lang: 'ja'
      };

      // 1回目：ja で保存
      const result1 = db.setCardInfo(cardInfo, false);
      expect(result1).toBe(true);

      // キャッシュから取得
      const cached = (db as any).cardTableA.get('test-card-8');
      expect(cached.langsFetchedAt['ja']).toBeDefined();

      // 2回目：キャッシュ有効
      const result2 = db.setCardInfo(cardInfo, false);
      expect(result2).toBe(false);
    });
  });
});
