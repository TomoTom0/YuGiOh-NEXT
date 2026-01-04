import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadDeckListOrder,
  saveDeckListOrder,
  isDeckListOrderChanged,
  loadThumbnailCache,
  saveThumbnailCache,
  loadDeckInfoCache,
  saveDeckInfoCache,
  calculateDeckHash,
  isDeckInfoChanged,
  isCacheExpired,
  type CachedDeckInfo,
} from '@/utils/deck-cache';
import type { DeckInfo, DeckListItem } from '@/types/deck';

// deck-thumbnail をモック
vi.mock('@/utils/deck-thumbnail', () => ({
  generateDeckThumbnailImage: vi.fn(async () => 'data:image/png;base64,mock')
}));

describe('deck-cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createDeckInfo = (dno: number, name: string = `Deck ${dno}`): DeckInfo => ({
    dno,
    dname: name,
    dtype: '0',
    dstyle: '0',
    originalName: name,
    mainDeck: [
      { cid: '12345', ciid: 'ciid1', quantity: 3 },
      { cid: '67890', ciid: 'ciid2', quantity: 2 }
    ],
    extraDeck: [
      { cid: '11111', ciid: 'ciid3', quantity: 1 }
    ],
    sideDeck: []
  });

  describe('loadDeckListOrder / saveDeckListOrder', () => {
    it('デッキリスト順序を保存・読み込みできる', () => {
      const deckList: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
        { dno: 3, name: 'Deck 3' }
      ];

      saveDeckListOrder(deckList);
      const loaded = loadDeckListOrder();

      expect(loaded).toEqual([1, 2, 3]);
    });

    it('空のリストを保存・読み込みできる', () => {
      saveDeckListOrder([]);
      const loaded = loadDeckListOrder();

      expect(loaded).toEqual([]);
    });

    it('localStorageが空の場合は空配列を返す', () => {
      const loaded = loadDeckListOrder();
      expect(loaded).toEqual([]);
    });

    it('不正なJSONの場合は空配列を返す', () => {
      localStorage.setItem('ygoNext:deckListOrder', 'invalid json');
      const loaded = loadDeckListOrder();
      expect(loaded).toEqual([]);
    });
  });

  describe('isDeckListOrderChanged', () => {
    it('順序が変わっていない場合はfalse', () => {
      const deckList: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' }
      ];

      saveDeckListOrder(deckList);
      const changed = isDeckListOrderChanged(deckList);

      expect(changed).toBe(false);
    });

    it('順序が変わった場合はtrue', () => {
      const deckList1: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' }
      ];
      const deckList2: DeckListItem[] = [
        { dno: 2, name: 'Deck 2' },
        { dno: 1, name: 'Deck 1' }
      ];

      saveDeckListOrder(deckList1);
      const changed = isDeckListOrderChanged(deckList2);

      expect(changed).toBe(true);
    });

    it('デッキが追加された場合はtrue', () => {
      const deckList1: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' }
      ];
      const deckList2: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' }
      ];

      saveDeckListOrder(deckList1);
      const changed = isDeckListOrderChanged(deckList2);

      expect(changed).toBe(true);
    });

    it('デッキが削除された場合はtrue', () => {
      const deckList1: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' }
      ];
      const deckList2: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' }
      ];

      saveDeckListOrder(deckList1);
      const changed = isDeckListOrderChanged(deckList2);

      expect(changed).toBe(true);
    });

    it('前回の順序がない場合でも動作する', () => {
      const deckList: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' }
      ];

      const changed = isDeckListOrderChanged(deckList);
      expect(changed).toBe(true);
    });
  });

  describe('loadThumbnailCache / saveThumbnailCache', () => {
    it('サムネイルキャッシュを保存・読み込みできる', () => {
      const thumbnails = new Map<number, string>();
      thumbnails.set(1, 'data:image/png;base64,abc');
      thumbnails.set(2, 'data:image/png;base64,def');

      saveThumbnailCache(thumbnails);
      const loaded = loadThumbnailCache();

      expect(loaded.size).toBe(2);
      expect(loaded.get(1)).toBe('data:image/png;base64,abc');
      expect(loaded.get(2)).toBe('data:image/png;base64,def');
    });

    it('空のMapを保存・読み込みできる', () => {
      saveThumbnailCache(new Map());
      const loaded = loadThumbnailCache();

      expect(loaded.size).toBe(0);
    });

    it('localStorageが空の場合は空Mapを返す', () => {
      const loaded = loadThumbnailCache();
      expect(loaded.size).toBe(0);
    });
  });

  describe('loadDeckInfoCache / saveDeckInfoCache', () => {
    it('デッキ情報キャッシュを保存・読み込みできる', () => {
      const cache = new Map<number, CachedDeckInfo>();
      const info: CachedDeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [{ cid: '12345', ciid: 'ciid1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash: 'abc123',
        cardCount: { main: 3, extra: 0, side: 0 }
      };
      cache.set(1, info);

      saveDeckInfoCache(cache);
      const loaded = loadDeckInfoCache();

      expect(loaded.size).toBe(1);
      expect(loaded.get(1)?.dno).toBe(1);
      expect(loaded.get(1)?.name).toBe('Test Deck');
      expect(loaded.get(1)?.hash).toBe('abc123');
    });

    it('cardCountがない場合は自動計算される', () => {
      // 手動でcardCountなしのデータを作成
      const data = {
        1: {
          dno: 1,
          name: 'Test',
          mainDeck: [
            { cid: '1', ciid: 'c1', quantity: 2 },
            { cid: '2', ciid: 'c2', quantity: 3 }
          ],
          extraDeck: [{ cid: '3', ciid: 'c3', quantity: 1 }],
          sideDeck: [],
          lastUpdated: Date.now(),
          hash: 'test'
        }
      };
      localStorage.setItem('ygoNext:deckInfoCache', JSON.stringify(data));

      const loaded = loadDeckInfoCache();

      expect(loaded.get(1)?.cardCount).toEqual({
        main: 5,
        extra: 1,
        side: 0
      });
    });

    it('localStorageが空の場合は空Mapを返す', () => {
      const loaded = loadDeckInfoCache();
      expect(loaded.size).toBe(0);
    });
  });

  describe('calculateDeckHash', () => {
    it('同じデッキ情報からは同じハッシュが生成される', () => {
      const deck1 = createDeckInfo(1, 'Test Deck');
      const deck2 = createDeckInfo(1, 'Test Deck');

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).toBe(hash2);
    });

    it('異なるデッキ情報からは異なるハッシュが生成される', () => {
      const deck1 = createDeckInfo(1, 'Test Deck 1');
      const deck2 = createDeckInfo(1, 'Test Deck 2');

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('カードの順序が変わるとハッシュも変わる', () => {
      const deck1 = createDeckInfo(1);
      const deck2 = {
        ...createDeckInfo(1),
        mainDeck: [
          { cid: '67890', ciid: 'ciid2', quantity: 2 },
          { cid: '12345', ciid: 'ciid1', quantity: 3 }
        ]
      };

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('数量が変わるとハッシュも変わる', () => {
      const deck1 = createDeckInfo(1);
      const deck2 = {
        ...createDeckInfo(1),
        mainDeck: [
          { cid: '12345', ciid: 'ciid1', quantity: 2 },
          { cid: '67890', ciid: 'ciid2', quantity: 2 }
        ]
      };

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('空のデッキでもハッシュを生成できる', () => {
      const deck: DeckInfo = {
        dno: 1,
        dname: 'Empty',
        dtype: '0',
        dstyle: '0',
        originalName: 'Empty',
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      const hash = calculateDeckHash(deck);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });
  });

  describe('isDeckInfoChanged', () => {
    it('キャッシュがない場合はtrueを返す', () => {
      const deck = createDeckInfo(1);
      const cache = new Map<number, CachedDeckInfo>();

      const changed = isDeckInfoChanged(1, deck, cache);

      expect(changed).toBe(true);
    });

    it('ハッシュが一致する場合はfalseを返す', () => {
      const deck = createDeckInfo(1);
      const hash = calculateDeckHash(deck);
      const cache = new Map<number, CachedDeckInfo>();
      cache.set(1, {
        dno: 1,
        name: 'Deck 1',
        mainDeck: deck.mainDeck,
        extraDeck: deck.extraDeck,
        sideDeck: deck.sideDeck,
        lastUpdated: Date.now(),
        hash,
        cardCount: { main: 5, extra: 1, side: 0 }
      });

      const changed = isDeckInfoChanged(1, deck, cache);

      expect(changed).toBe(false);
    });

    it('ハッシュが異なる場合はtrueを返す', () => {
      const deck = createDeckInfo(1);
      const cache = new Map<number, CachedDeckInfo>();
      cache.set(1, {
        dno: 1,
        name: 'Deck 1',
        mainDeck: deck.mainDeck,
        extraDeck: deck.extraDeck,
        sideDeck: deck.sideDeck,
        lastUpdated: Date.now(),
        hash: 'different-hash',
        cardCount: { main: 5, extra: 1, side: 0 }
      });

      const changed = isDeckInfoChanged(1, deck, cache);

      expect(changed).toBe(true);
    });
  });

  describe('isCacheExpired', () => {
    it('有効期限内の場合はfalseを返す', () => {
      const cachedInfo: CachedDeckInfo = {
        dno: 1,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now() - 1000, // 1秒前
        hash: 'test',
        cardCount: { main: 0, extra: 0, side: 0 }
      };

      const expired = isCacheExpired(cachedInfo);

      expect(expired).toBe(false);
    });

    it('有効期限切れの場合はtrueを返す', () => {
      const cachedInfo: CachedDeckInfo = {
        dno: 1,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8日前
        hash: 'test',
        cardCount: { main: 0, extra: 0, side: 0 }
      };

      const expired = isCacheExpired(cachedInfo);

      expect(expired).toBe(true);
    });

    it('カスタム有効期限を指定できる', () => {
      const cachedInfo: CachedDeckInfo = {
        dno: 1,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now() - 2000, // 2秒前
        hash: 'test',
        cardCount: { main: 0, extra: 0, side: 0 }
      };

      const expired = isCacheExpired(cachedInfo, 1000); // 1秒の有効期限

      expect(expired).toBe(true);
    });
  });
});
