import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadDeckListOrder,
  saveDeckListOrder,
  isDeckListOrderChanged,
  loadThumbnailCache,
  saveThumbnailCache,
  MAX_THUMBNAIL_CACHE_ENTRIES,
  loadDeckInfoCache,
  saveDeckInfoCache,
  calculateDeckHash,
  isDeckInfoChanged,
  isCacheExpired,
  generateAndCacheThumbnail,
  updateDeckInfoAndThumbnail,
  updateDeckInfoAndThumbnailWithData,
  generateThumbnailsInBackground,
  type CachedDeckInfo,
} from '@/utils/deck-cache';
import { generateDeckThumbnailImage } from '@/utils/deck-thumbnail';
import type { DeckInfo, DeckListItem } from '@/types/deck';

// deck-thumbnail をモック
vi.mock('@/utils/deck-thumbnail', () => ({
  generateDeckThumbnailImage: vi.fn(async () => 'data:image/png;base64,mock')
}));

describe('deck-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateDeckThumbnailImage).mockResolvedValue('data:image/png;base64,mock');
    localStorage.clear();
    delete (window as any).ygoNextCurrentSettings;
    delete (window as any).requestIdleCallback;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    delete (window as any).ygoNextCurrentSettings;
    delete (window as any).requestIdleCallback;
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
    it('[covers:save-order.serializes-dnos] [covers:load-order.cached-returns-parsed] デッキリスト順序を保存・読み込みできる', () => {
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

    it('[covers:load-order.missing-returns-empty] localStorageが空の場合は空配列を返す', () => {
      const loaded = loadDeckListOrder();
      expect(loaded).toEqual([]);
    });

    it('[covers:load-order.catch-returns-empty] 不正なJSONの場合は空配列を返す', () => {
      localStorage.setItem('ygoNext:deckListOrder', 'invalid json');
      const loaded = loadDeckListOrder();
      expect(loaded).toEqual([]);
    });

    it('[covers:save-order.catch-swallows] 保存時にlocalStorageが例外を投げても再throwしない', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      expect(() => saveDeckListOrder([{ dno: 1, name: 'Deck 1' }])).not.toThrow();
    });
  });

  describe('isDeckListOrderChanged', () => {
    it('[covers:order-changed.same-false] 順序が変わっていない場合はfalse', () => {
      const deckList: DeckListItem[] = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' }
      ];

      saveDeckListOrder(deckList);
      const changed = isDeckListOrderChanged(deckList);

      expect(changed).toBe(false);
    });

    it('[covers:order-changed.element-mismatch-true] 順序が変わった場合はtrue', () => {
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

    it('[covers:order-changed.length-mismatch-true] デッキが追加された場合はtrue', () => {
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

    it('[covers:order-changed.length-mismatch-true] デッキが削除された場合はtrue', () => {
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
    it('[covers:save-thumbnail.map-to-object-json] [covers:load-thumbnail.cached-object-to-map] サムネイルキャッシュを保存・読み込みできる', () => {
      const thumbnails = new Map<number, string>();
      thumbnails.set(1, 'data:image/png;base64,abc');
      thumbnails.set(2, 'data:image/png;base64,def');

      saveThumbnailCache(thumbnails);
      const loaded = loadThumbnailCache();

      expect(loaded.size).toBe(2);
      expect(loaded.get(1)).toBe('data:image/png;base64,abc');
      expect(loaded.get(2)).toBe('data:image/png;base64,def');
    });

    it('[covers:save-thumbnail.evicts-oldest-beyond-cap] 上限を超えたら古いものから捨て、メモリと保存内容が一致する', () => {
      const thumbnails = new Map<number, string>();
      for (let dno = 1; dno <= MAX_THUMBNAIL_CACHE_ENTRIES + 5; dno++) {
        thumbnails.set(dno, `data:image/webp;base64,${dno}`);
      }

      saveThumbnailCache(thumbnails);

      expect(thumbnails.size).toBe(MAX_THUMBNAIL_CACHE_ENTRIES);
      expect(thumbnails.has(5)).toBe(false);
      expect(thumbnails.has(6)).toBe(true);
      const loaded = loadThumbnailCache();
      expect(loaded.size).toBe(MAX_THUMBNAIL_CACHE_ENTRIES);
      expect(loaded.has(MAX_THUMBNAIL_CACHE_ENTRIES + 5)).toBe(true);
    });

    it('[covers:save-thumbnail.evicts-oldest-beyond-cap] 上限以下なら何も捨てない', () => {
      const thumbnails = new Map<number, string>();
      thumbnails.set(1, 'data:a');
      thumbnails.set(2, 'data:b');

      saveThumbnailCache(thumbnails);

      expect(thumbnails.size).toBe(2);
      expect(loadThumbnailCache().size).toBe(2);
    });

    it('空のMapを保存・読み込みできる', () => {
      saveThumbnailCache(new Map());
      const loaded = loadThumbnailCache();

      expect(loaded.size).toBe(0);
    });

    it('[covers:load-thumbnail.missing-returns-empty-map] localStorageが空の場合は空Mapを返す', () => {
      const loaded = loadThumbnailCache();
      expect(loaded.size).toBe(0);
    });

    it('[covers:load-thumbnail.catch-returns-empty-map] 不正なJSONの場合は空Mapを返す', () => {
      localStorage.setItem('ygoNext:deckThumbnails', 'invalid json');
      const loaded = loadThumbnailCache();
      expect(loaded.size).toBe(0);
    });

    it('[covers:save-thumbnail.catch-swallows] 保存時にlocalStorageが例外を投げても再throwしない', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      expect(() => saveThumbnailCache(new Map([[1, 'data:image/png;base64,abc']]))).not.toThrow();
    });
  });

  describe('loadDeckInfoCache / saveDeckInfoCache', () => {
    it('[covers:save-info.map-to-object-json] [covers:load-info.cached-with-card-count-preserved] デッキ情報キャッシュを保存・読み込みできる', () => {
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

    it('[covers:load-info.missing-card-count-computed] cardCountがない場合は自動計算される', () => {
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

    it('[covers:load-info.missing-returns-empty-map] localStorageが空の場合は空Mapを返す', () => {
      const loaded = loadDeckInfoCache();
      expect(loaded.size).toBe(0);
    });

    it('[covers:load-info.catch-returns-empty-map] 不正なJSONの場合は空Mapを返す', () => {
      localStorage.setItem('ygoNext:deckInfoCache', 'invalid json');
      const loaded = loadDeckInfoCache();
      expect(loaded.size).toBe(0);
    });

    it('[covers:save-info.catch-swallows] 保存時にlocalStorageが例外を投げても再throwしない', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      const info: CachedDeckInfo = {
        dno: 1,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash: 'test',
      };
      expect(() => saveDeckInfoCache(new Map([[1, info]]))).not.toThrow();
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

    it('[covers:hash.uses-original-name-or-empty] originalNameが異なるとハッシュも変わる', () => {
      const deck1 = createDeckInfo(1, 'Test Deck 1');
      const deck2 = createDeckInfo(1, 'Test Deck 2');

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('[covers:hash.includes-ordered-cards-by-section] カードの順序が変わるとハッシュも変わる', () => {
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

    it('[covers:hash.includes-ordered-cards-by-section] 数量が変わるとハッシュも変わる', () => {
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

    it('[covers:hash.returns-unsigned-base36] 空のデッキでもハッシュを生成できる', () => {
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

    it('[covers:hash.uses-original-name-or-empty] dnameだけが違ってもoriginalNameが同じなら同じハッシュになる', () => {
      const deck1 = createDeckInfo(1, 'Original');
      const deck2 = {
        ...createDeckInfo(1, 'Original'),
        dname: 'Renamed',
        name: 'Renamed',
      } as DeckInfo & { name: string };

      expect(calculateDeckHash(deck1)).toBe(calculateDeckHash(deck2));
    });
  });

  describe('isDeckInfoChanged', () => {
    it('[covers:info-changed.no-cache-true] キャッシュがない場合はtrueを返す', () => {
      const deck = createDeckInfo(1);
      const cache = new Map<number, CachedDeckInfo>();

      const changed = isDeckInfoChanged(1, deck, cache);

      expect(changed).toBe(true);
    });

    it('[covers:info-changed.hash-match-false] ハッシュが一致する場合はfalseを返す', () => {
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

    it('[covers:info-changed.hash-mismatch-true] ハッシュが異なる場合はtrueを返す', () => {
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
    it('[covers:cache-expired.age-within-or-equal-false] 有効期限内の場合はfalseを返す', () => {
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

    it('[covers:cache-expired.age-greater-than-expiration-true] 有効期限切れの場合はtrueを返す', () => {
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

    it('[covers:cache-expired.age-greater-than-expiration-true] カスタム有効期限を指定できる', () => {
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

    it('[covers:cache-expired.age-within-or-equal-false] 経過時間が有効期限ちょうどならfalseを返す', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T00:00:00.000Z'));
      const cachedInfo: CachedDeckInfo = {
        dno: 1,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now() - 1000,
        hash: 'test',
        cardCount: { main: 0, extra: 0, side: 0 }
      };

      expect(isCacheExpired(cachedInfo, 1000)).toBe(false);
    });
  });

  describe('generateAndCacheThumbnail', () => {
    it('[covers:generate-cache.saves-deck-info-before-thumbnail] [covers:generate-cache.truthy-image-saved] デッキ情報を先に保存し、truthyなサムネイルURLを保存する', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T00:00:00.000Z'));
      const deckInfo = { ...createDeckInfo(1), category: 'favorite' as any };
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      await generateAndCacheThumbnail(1, deckInfo, ['12345'], deckThumbnails, cachedDeckInfos);

      const cached = cachedDeckInfos.get(1);
      expect(cached).toMatchObject({
        dno: 1,
        name: deckInfo.originalName,
        category: 'favorite',
        mainDeck: deckInfo.mainDeck,
        extraDeck: deckInfo.extraDeck,
        sideDeck: deckInfo.sideDeck,
        cardCount: { main: 5, extra: 1, side: 0 },
        lastUpdated: Date.now(),
        lastThumbnailUpdate: Date.now(),
      });
      expect(cached?.hash).toBe(calculateDeckHash(deckInfo));
      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
      expect(JSON.parse(localStorage.getItem('ygoNext:deckInfoCache') || '{}')['1'].name).toBe(deckInfo.originalName);
      expect(JSON.parse(localStorage.getItem('ygoNext:deckThumbnails') || '{}')['1']).toBe('data:image/png;base64,mock');
      expect(generateDeckThumbnailImage).toHaveBeenCalledWith(deckInfo, ['12345']);
    });

    it('[covers:generate-cache.falsy-image-empty-marker] サムネイル生成がfalsy値を返す場合は空文字列を保存する', async () => {
      vi.mocked(generateDeckThumbnailImage).mockResolvedValueOnce('');
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      await generateAndCacheThumbnail(1, createDeckInfo(1), [], deckThumbnails, cachedDeckInfos);

      expect(deckThumbnails.get(1)).toBe('');
      expect(JSON.parse(localStorage.getItem('ygoNext:deckThumbnails') || '{}')['1']).toBe('');
    });

    it('[covers:generate-cache.catch-swallows] サムネイル生成がrejectしても再throwしない', async () => {
      vi.mocked(generateDeckThumbnailImage).mockRejectedValueOnce(new Error('thumbnail failed'));

      await expect(generateAndCacheThumbnail(1, createDeckInfo(1), [], new Map(), new Map())).resolves.toBeUndefined();
    });
  });

  describe('updateDeckInfoAndThumbnail', () => {
    it('[covers:check-needs.changed-or-expired-true] [covers:update-fetch.needs-update-generates] キャッシュがない場合は詳細取得後に生成してtrueを返す', async () => {
      const deckInfo = createDeckInfo(1);
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      const result = await updateDeckInfoAndThumbnail(1, getDeckDetail, [], deckThumbnails, cachedDeckInfos);

      expect(result).toBe(true);
      expect(getDeckDetail).toHaveBeenCalledWith(1);
      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
    });

    it('[covers:check-needs.null-detail-false] [covers:update-fetch.no-update-or-no-detail-skips-generation] getDeckDetailがnullを返した場合は生成せずfalseを返す', async () => {
      const getDeckDetail = vi.fn().mockResolvedValue(null);
      const deckThumbnails = new Map<number, string>();

      const result = await updateDeckInfoAndThumbnail(1, getDeckDetail, [], deckThumbnails, new Map());

      expect(result).toBe(false);
      expect(deckThumbnails.has(1)).toBe(false);
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:check-needs.unchanged-and-fresh-false] [covers:update-fetch.no-update-or-no-detail-skips-generation] hash一致かつ期限内の場合は生成せずfalseを返す', async () => {
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, {
          dno: 1,
          name: deckInfo.originalName,
          mainDeck: deckInfo.mainDeck,
          extraDeck: deckInfo.extraDeck,
          sideDeck: deckInfo.sideDeck,
          lastUpdated: Date.now(),
          hash: calculateDeckHash(deckInfo),
          cardCount: { main: 5, extra: 1, side: 0 },
        }],
      ]);
      const deckThumbnails = new Map<number, string>();

      const result = await updateDeckInfoAndThumbnail(1, vi.fn().mockResolvedValue(deckInfo), [], deckThumbnails, cachedDeckInfos);

      expect(result).toBe(false);
      expect(deckThumbnails.has(1)).toBe(false);
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:check-needs.changed-or-expired-true] hash一致でも期限切れなら生成してtrueを返す', async () => {
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, {
          dno: 1,
          name: deckInfo.originalName,
          mainDeck: deckInfo.mainDeck,
          extraDeck: deckInfo.extraDeck,
          sideDeck: deckInfo.sideDeck,
          lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000,
          hash: calculateDeckHash(deckInfo),
          cardCount: { main: 5, extra: 1, side: 0 },
        }],
      ]);
      const deckThumbnails = new Map<number, string>();

      const result = await updateDeckInfoAndThumbnail(1, vi.fn().mockResolvedValue(deckInfo), [], deckThumbnails, cachedDeckInfos);

      expect(result).toBe(true);
      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
    });

    it('[covers:check-needs.catch-false-null] getDeckDetailがrejectした場合は生成せずfalseを返す', async () => {
      const deckThumbnails = new Map<number, string>();

      const result = await updateDeckInfoAndThumbnail(
        1,
        vi.fn().mockRejectedValue(new Error('detail failed')),
        [],
        deckThumbnails,
        new Map()
      );

      expect(result).toBe(false);
      expect(deckThumbnails.has(1)).toBe(false);
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });
  });

  describe('updateDeckInfoAndThumbnailWithData', () => {
    it('[covers:update-with-data.setting-disabled-returns] 設定で無効なら更新しない', async () => {
      (window as any).ygoNextCurrentSettings = { updateThumbnailWithoutFetch: false };
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      await updateDeckInfoAndThumbnailWithData(1, createDeckInfo(1), [], deckThumbnails, cachedDeckInfos);

      expect(deckThumbnails.size).toBe(0);
      expect(cachedDeckInfos.size).toBe(0);
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:update-with-data.setting-access-error-continues] 設定取得がthrowしても通常の更新判定へ進む', async () => {
      Object.defineProperty(window, 'ygoNextCurrentSettings', {
        configurable: true,
        get: () => {
          throw new Error('settings failed');
        },
      });
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      await updateDeckInfoAndThumbnailWithData(1, createDeckInfo(1), [], deckThumbnails, cachedDeckInfos);

      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
      expect(cachedDeckInfos.has(1)).toBe(true);
    });

    it('[covers:update-with-data.needs-update-or-thumbnail-missing-generates] hash一致でもサムネイルが無ければ生成する', async () => {
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, {
          dno: 1,
          name: deckInfo.originalName,
          mainDeck: deckInfo.mainDeck,
          extraDeck: deckInfo.extraDeck,
          sideDeck: deckInfo.sideDeck,
          lastUpdated: Date.now(),
          hash: calculateDeckHash(deckInfo),
          cardCount: { main: 5, extra: 1, side: 0 },
        }],
      ]);
      const deckThumbnails = new Map<number, string>();

      await updateDeckInfoAndThumbnailWithData(1, deckInfo, [], deckThumbnails, cachedDeckInfos);

      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
    });

    it('[covers:update-with-data.no-need-and-thumbnail-exists-skips] hash一致かつサムネイルありなら生成しない', async () => {
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, {
          dno: 1,
          name: deckInfo.originalName,
          mainDeck: deckInfo.mainDeck,
          extraDeck: deckInfo.extraDeck,
          sideDeck: deckInfo.sideDeck,
          lastUpdated: Date.now(),
          hash: calculateDeckHash(deckInfo),
          cardCount: { main: 5, extra: 1, side: 0 },
        }],
      ]);
      const deckThumbnails = new Map<number, string>([[1, 'existing']]);

      await updateDeckInfoAndThumbnailWithData(1, deckInfo, [], deckThumbnails, cachedDeckInfos);

      expect(deckThumbnails.get(1)).toBe('existing');
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:update-with-data.catch-swallows] 更新判定中に例外が出ても再throwしない', async () => {
      const invalidDeckInfo = { originalName: 'invalid' } as DeckInfo;

      await expect(updateDeckInfoAndThumbnailWithData(1, invalidDeckInfo, [], new Map(), new Map())).resolves.toBeUndefined();
    });
  });

  describe('generateThumbnailsInBackground', () => {
    const allowBackgroundSettings = () => {
      (window as any).ygoNextCurrentSettings = {
        backgroundDeckInfoFetch: true,
        enableDeckThumbnailGeneration: true,
      };
    };

    const cacheForDeck = (deckInfo: DeckInfo, overrides: Partial<CachedDeckInfo> = {}): CachedDeckInfo => ({
      dno: deckInfo.dno,
      name: deckInfo.originalName,
      mainDeck: deckInfo.mainDeck,
      extraDeck: deckInfo.extraDeck,
      sideDeck: deckInfo.sideDeck,
      lastUpdated: Date.now(),
      hash: calculateDeckHash(deckInfo),
      cardCount: { main: 5, extra: 1, side: 0 },
      ...overrides,
    });

    it('[covers:background.empty-deck-list-returns] 空のデッキリストでは何もしない', async () => {
      const getDeckDetail = vi.fn();

      await generateThumbnailsInBackground(0, 50, [], getDeckDetail, [], new Map(), new Map(), true);

      expect(getDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:background.force-false-requires-background-fetch-enabled] force=falseで設定が無い場合は何もしない', async () => {
      const getDeckDetail = vi.fn();

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], new Map(), new Map());

      expect(getDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:background.force-false-thumbnail-generation-disabled-returns] force=falseでサムネイル生成が無効なら何もしない', async () => {
      (window as any).ygoNextCurrentSettings = {
        backgroundDeckInfoFetch: true,
        enableDeckThumbnailGeneration: false,
      };
      const getDeckDetail = vi.fn();

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], new Map(), new Map());

      expect(getDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:background.force-bypasses-settings] force=trueなら設定未設定でも処理する', async () => {
      (window as any).requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      const deckInfo = createDeckInfo(1);
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], new Map(), new Map(), true);

      expect(getDeckDetail).toHaveBeenCalledWith(1);
      expect(generateDeckThumbnailImage).toHaveBeenCalledWith(deckInfo, []);
    });

    it('[covers:background.slices-target-decks] startIndexとbatchSizeの範囲だけを処理する', async () => {
      (window as any).requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      const getDeckDetail = vi.fn((dno: number) => Promise.resolve(createDeckInfo(dno)));
      const deckList = [1, 2, 3, 4].map(dno => ({ dno, name: `Deck ${dno}` }));

      await generateThumbnailsInBackground(1, 2, deckList, getDeckDetail, [], new Map(), new Map(), true);

      expect(getDeckDetail).toHaveBeenCalledTimes(2);
      expect(getDeckDetail).toHaveBeenCalledWith(2);
      expect(getDeckDetail).toHaveBeenCalledWith(3);
      expect(getDeckDetail).not.toHaveBeenCalledWith(1);
      expect(getDeckDetail).not.toHaveBeenCalledWith(4);
    });

    it('[covers:background.recent-update-skips-api] 1日以内に更新済みならAPI確認をスキップする', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T00:00:00.000Z'));
      allowBackgroundSettings();
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, cacheForDeck(deckInfo, { lastThumbnailUpdate: Date.now() })],
      ]);
      const getDeckDetail = vi.fn();

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], new Map([[1, 'data:image/png;base64,existing']]), cachedDeckInfos);

      expect(getDeckDetail).not.toHaveBeenCalled();
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:subsequence.all-found-in-order-true] [covers:background.order-preserved-no-update-skip-records-check-time] 順序保持かつ変更なしならチェック時刻を記録して生成しない', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T00:00:00.000Z'));
      allowBackgroundSettings();
      saveDeckListOrder([{ dno: 1, name: 'Deck 1' }, { dno: 2, name: 'Deck 2' }]);
      const deckInfo = createDeckInfo(2);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [2, cacheForDeck(deckInfo, { lastThumbnailUpdate: undefined })],
      ]);
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);

      await generateThumbnailsInBackground(1, 1, [{ dno: 1, name: 'Deck 1' }, { dno: 2, name: 'Deck 2' }], getDeckDetail, [], new Map([[2, 'data:image/png;base64,existing']]), cachedDeckInfos);

      expect(getDeckDetail).toHaveBeenCalledWith(2);
      expect(cachedDeckInfos.get(2)?.lastThumbnailUpdate).toBe(Date.now());
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:subsequence.missing-or-reordered-false] 順序が保持されていない場合は順序保持スキップ扱いにしない', async () => {
      allowBackgroundSettings();
      saveDeckListOrder([{ dno: 1, name: 'Deck 1' }, { dno: 2, name: 'Deck 2' }]);
      const deck1 = createDeckInfo(1);
      const deck2 = createDeckInfo(2);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, cacheForDeck(deck1, { lastThumbnailUpdate: undefined })],
        [2, cacheForDeck(deck2, { lastThumbnailUpdate: undefined })],
      ]);
      const getDeckDetail = vi.fn((dno: number) => Promise.resolve(dno === 1 ? deck1 : deck2));

      await generateThumbnailsInBackground(
        0,
        2,
        [{ dno: 2, name: 'Deck 2' }, { dno: 1, name: 'Deck 1' }],
        getDeckDetail,
        [],
        new Map([[1, 'data:image/png;base64,existing'], [2, 'data:image/png;base64,existing']]),
        cachedDeckInfos,
        true
      );

      expect(getDeckDetail).toHaveBeenCalledTimes(2);
      expect(cachedDeckInfos.get(2)?.lastThumbnailUpdate).toBeUndefined();
    });

    it('[covers:background.consecutive-five-skips-breaks] 5件連続スキップで残りを確認しない', async () => {
      const deckList = [1, 2, 3, 4, 5, 6, 7].map(dno => ({ dno, name: `Deck ${dno}` }));
      saveDeckListOrder(deckList);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();
      for (const deck of deckList) {
        const deckInfo = createDeckInfo(deck.dno);
        cachedDeckInfos.set(deck.dno, cacheForDeck(deckInfo));
      }
      const getDeckDetail = vi.fn((dno: number) => Promise.resolve(createDeckInfo(dno)));
      const deckThumbnails = new Map<number, string>(deckList.map(d => [d.dno, 'data:image/png;base64,existing']));

      await generateThumbnailsInBackground(0, 50, deckList, getDeckDetail, [], deckThumbnails, cachedDeckInfos, true);

      expect(getDeckDetail).toHaveBeenCalledTimes(5);
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:background.non-skip-changed-deck-queued] [covers:background.generates-each-queued-after-idle] [covers:wait-idle.uses-request-idle-callback] 更新対象をidle後に順番に生成する', async () => {
      const idle = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      (window as any).requestIdleCallback = idle;
      const getDeckDetail = vi.fn((dno: number) => Promise.resolve(createDeckInfo(dno)));
      const deckThumbnails = new Map<number, string>();
      const cachedDeckInfos = new Map<number, CachedDeckInfo>();

      await generateThumbnailsInBackground(
        0,
        50,
        [{ dno: 1, name: 'Deck 1' }, { dno: 2, name: 'Deck 2' }],
        getDeckDetail,
        [],
        deckThumbnails,
        cachedDeckInfos,
        true
      );

      expect(idle).toHaveBeenCalledTimes(2);
      expect(deckThumbnails.size).toBe(2);
      expect(cachedDeckInfos.size).toBe(2);
    });

    it('[covers:background.missing-thumbnail-regenerates] サムネイルが無いデッキは1日以内の更新済みでも再生成する', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T00:00:00.000Z'));
      allowBackgroundSettings();
      (window as any).requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, cacheForDeck(deckInfo, { lastThumbnailUpdate: Date.now() })],
      ]);
      const deckThumbnails = new Map<number, string>();
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], deckThumbnails, cachedDeckInfos);

      expect(getDeckDetail).toHaveBeenCalledWith(1);
      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
    });

    it('[covers:background.missing-thumbnail-regenerates] サムネイルが無いデッキは内容が変わっていなくても再生成する（force）', async () => {
      (window as any).requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      saveDeckListOrder([{ dno: 1, name: 'Deck 1' }]);
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([
        [1, cacheForDeck(deckInfo, { lastThumbnailUpdate: undefined })],
      ]);
      const deckThumbnails = new Map<number, string>();
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);

      await generateThumbnailsInBackground(0, 50, [{ dno: 1, name: 'Deck 1' }], getDeckDetail, [], deckThumbnails, cachedDeckInfos, true);

      expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');
    });

    it('[covers:background.no-decks-to-update-returns-after-save] 更新対象が無い場合はdeck info cache保存後に戻る', async () => {
      const deckList = [{ dno: 1, name: 'Deck 1' }];
      saveDeckListOrder(deckList);
      const deckInfo = createDeckInfo(1);
      const cachedDeckInfos = new Map<number, CachedDeckInfo>([[1, cacheForDeck(deckInfo)]]);
      const getDeckDetail = vi.fn().mockResolvedValue(deckInfo);

      await generateThumbnailsInBackground(0, 50, deckList, getDeckDetail, [], new Map([[1, 'data:image/png;base64,existing']]), cachedDeckInfos, true);

      expect(localStorage.getItem('ygoNext:deckInfoCache')).toBeTruthy();
      expect(generateDeckThumbnailImage).not.toHaveBeenCalled();
    });

    it('[covers:wait-idle.fallback-set-timeout] requestIdleCallbackが無い場合は200msのsetTimeoutで生成へ進む', async () => {
      vi.useFakeTimers();
      const deckThumbnails = new Map<number, string>();
      const promise = generateThumbnailsInBackground(
        0,
        50,
        [{ dno: 1, name: 'Deck 1' }],
        vi.fn().mockResolvedValue(createDeckInfo(1)),
        [],
        deckThumbnails,
        new Map(),
        true
      );

      await vi.advanceTimersByTimeAsync(199);
      expect(deckThumbnails.size).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      await promise;

      expect(deckThumbnails.size).toBe(1);
    });

    it('[covers:background.random-delay-before-second-api-when-not-force] force=falseの2回目以降のAPI確認前にランダム待機する', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      allowBackgroundSettings();
      (window as any).requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 1 });
        return 1;
      });
      const getDeckDetail = vi.fn((dno: number) => Promise.resolve(createDeckInfo(dno)));
      const promise = generateThumbnailsInBackground(
        0,
        2,
        [{ dno: 1, name: 'Deck 1' }, { dno: 2, name: 'Deck 2' }],
        getDeckDetail,
        [],
        new Map(),
        new Map(),
        false
      );

      await Promise.resolve();
      expect(getDeckDetail).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(499);
      expect(getDeckDetail).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await promise;

      expect(getDeckDetail).toHaveBeenCalledTimes(2);
    });
  });
});
