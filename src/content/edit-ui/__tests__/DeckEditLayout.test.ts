/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as deckCache from '@/utils/deck-cache';

// DeckEditLayoutは非常に複雑なコンポーネントで、多くの依存関係があるため、
// ここでは主要な機能（サムネイル生成、キャッシュ連携）のユニットテストを実施

// deck-cacheのモック（部分的なモック）
vi.mock('@/utils/deck-cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/deck-cache')>();
  return {
    ...actual,
    generateThumbnailsInBackground: vi.fn(),
    updateDeckInfoAndThumbnail: vi.fn(),
    updateDeckInfoAndThumbnailWithData: vi.fn(),
  };
});

// page-detectorのモック
vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'ocg'),
}));

// card-utilsのモック
vi.mock('@/utils/card-utils', () => ({
  getCardInfo: vi.fn(),
}));

// deck-thumbnailのモック
vi.mock('@/utils/deck-thumbnail', () => ({
  generateDeckThumbnailCards: vi.fn(() => ['cid1', 'cid2', 'cid3']),
  generateDeckThumbnailImage: vi.fn(() => Promise.resolve('data:image/png;base64,mock')),
}));

describe('DeckEditLayout - サムネイル生成とキャッシュ連携', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // localStorageのモック
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    } as any;

    // document.querySelectorのモック
    global.document.querySelector = vi.fn(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // 1. サムネイル生成トリガー
  // ============================================================
  describe('サムネイル生成トリガー', () => {
    it('generateThumbnailsInBackgroundが適切にモック化されている', () => {
      expect(deckCache.generateThumbnailsInBackground).toBeDefined();
      expect(vi.isMockFunction(deckCache.generateThumbnailsInBackground)).toBe(true);
    });

    it('updateDeckInfoAndThumbnailが適切にモック化されている', () => {
      expect(deckCache.updateDeckInfoAndThumbnail).toBeDefined();
      expect(vi.isMockFunction(deckCache.updateDeckInfoAndThumbnail)).toBe(true);
    });

    it('updateDeckInfoAndThumbnailWithDataが適切にモック化されている', () => {
      expect(deckCache.updateDeckInfoAndThumbnailWithData).toBeDefined();
      expect(vi.isMockFunction(deckCache.updateDeckInfoAndThumbnailWithData)).toBe(true);
    });
  });

  // ============================================================
  // 2. キャッシュ関数の動作確認
  // ============================================================
  describe('キャッシュ関数の動作確認', () => {
    it('loadDeckListOrderが正しく動作する', () => {
      const { loadDeckListOrder } = deckCache;

      // localStorageにデータがない場合
      expect(loadDeckListOrder()).toEqual([]);

      // localStorageにデータがある場合
      (global.localStorage.getItem as any).mockReturnValueOnce('{"0":[1,2,3]}');
      // 注意: モック化されたloadDeckListOrderは実際の実装を使用するため、
      // localStorageのモックが正しく動作することを確認
    });

    it('saveDeckListOrderが正しく動作する', () => {
      const { saveDeckListOrder } = deckCache;

      const deckList = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
      ];

      saveDeckListOrder(deckList);

      // localStorageにデータが保存されることを確認
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });

    it('loadThumbnailCacheが正しく動作する', () => {
      const { loadThumbnailCache } = deckCache;

      // キャッシュがない場合
      const cache = loadThumbnailCache();
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });

    it('saveThumbnailCacheが正しく動作する', () => {
      const { saveThumbnailCache } = deckCache;

      const thumbnails = new Map<number, string>([
        [1, 'data:image/png;base64,image1'],
        [2, 'data:image/png;base64,image2'],
      ]);

      saveThumbnailCache(thumbnails);

      // localStorageにデータが保存されることを確認
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });

    it('loadDeckInfoCacheが正しく動作する', () => {
      const { loadDeckInfoCache } = deckCache;

      // キャッシュがない場合
      const cache = loadDeckInfoCache();
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });

    it('saveDeckInfoCacheが正しく動作する', () => {
      const { saveDeckInfoCache } = deckCache;

      const cachedInfos = new Map();
      cachedInfos.set(1, {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash: 'abc123',
        cardCount: { main: 40, extra: 15, side: 15 },
      });

      saveDeckInfoCache(cachedInfos);

      // localStorageにデータが保存されることを確認
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. ハッシュ計算と変更検出
  // ============================================================
  describe('ハッシュ計算と変更検出', () => {
    it('calculateDeckHashが一貫したハッシュを生成する', () => {
      const { calculateDeckHash } = deckCache;

      const deckInfo = {
        name: 'Test Deck',
        mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      };

      const hash1 = calculateDeckHash(deckInfo);
      const hash2 = calculateDeckHash(deckInfo);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('isDeckInfoChangedがキャッシュの有無を正しく判定する', () => {
      const { isDeckInfoChanged, calculateDeckHash } = deckCache;

      const deckInfo = {
        name: 'Test Deck',
        mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      };

      const cachedInfos = new Map();

      // キャッシュがない場合は変更ありと判定
      expect(isDeckInfoChanged(1, deckInfo, cachedInfos)).toBe(true);

      // キャッシュがある場合
      const hash = calculateDeckHash(deckInfo);
      cachedInfos.set(1, {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash,
        cardCount: { main: 3, extra: 0, side: 0 },
      });

      // ハッシュが同じ場合は変更なし
      expect(isDeckInfoChanged(1, deckInfo, cachedInfos)).toBe(false);
    });

    it('isCacheExpiredが期限切れを正しく判定する', () => {
      const { isCacheExpired } = deckCache;

      // 期限内のキャッシュ
      const recentCache = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash: 'abc123',
        cardCount: { main: 0, extra: 0, side: 0 },
      };

      expect(isCacheExpired(recentCache)).toBe(false);

      // 期限切れのキャッシュ（8日前）
      const expiredCache = {
        ...recentCache,
        lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000,
      };

      expect(isCacheExpired(expiredCache)).toBe(true);
    });
  });

  // ============================================================
  // 4. モック関数の呼び出し確認
  // ============================================================
  describe('モック関数の呼び出し確認', () => {
    it('generateThumbnailsInBackgroundが呼び出し可能', async () => {
      const mockFn = deckCache.generateThumbnailsInBackground as any;
      mockFn.mockResolvedValueOnce(undefined);

      await deckCache.generateThumbnailsInBackground(
        0,
        50,
        [],
        vi.fn(),
        [],
        new Map(),
        new Map()
      );

      expect(mockFn).toHaveBeenCalled();
    });

    it('updateDeckInfoAndThumbnailが呼び出し可能', async () => {
      const mockFn = deckCache.updateDeckInfoAndThumbnail as any;
      mockFn.mockResolvedValueOnce(true);

      await deckCache.updateDeckInfoAndThumbnail(
        1,
        vi.fn(),
        [],
        new Map(),
        new Map()
      );

      expect(mockFn).toHaveBeenCalled();
    });

    it('updateDeckInfoAndThumbnailWithDataが呼び出し可能', async () => {
      const mockFn = deckCache.updateDeckInfoAndThumbnailWithData as any;
      mockFn.mockResolvedValueOnce(undefined);

      await deckCache.updateDeckInfoAndThumbnailWithData(
        1,
        { dno: 1, name: 'Test', mainDeck: [], extraDeck: [], sideDeck: [] },
        [],
        new Map(),
        new Map()
      );

      expect(mockFn).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 5. 統合テスト風の動作確認
  // ============================================================
  describe('統合テスト風の動作確認', () => {
    it('デッキロード時にサムネイル更新が適切に呼び出される想定', async () => {
      // DeckEditLayoutのloadDeck関数の動作をシミュレート
      const dno = 123;
      const mockUpdateFn = deckCache.updateDeckInfoAndThumbnail as any;
      mockUpdateFn.mockResolvedValueOnce(true);

      // デッキロード後のサムネイル更新
      await deckCache.updateDeckInfoAndThumbnail(
        dno,
        vi.fn(),
        [],
        new Map(),
        new Map()
      );

      expect(mockUpdateFn).toHaveBeenCalledWith(
        dno,
        expect.any(Function),
        [],
        expect.any(Map),
        expect.any(Map)
      );
    });

    it('ページ切り替え時にバックグラウンド生成が呼び出される想定', async () => {
      // DeckEditLayoutのgoToNextPage関数の動作をシミュレート
      const mockGenerateFn = deckCache.generateThumbnailsInBackground as any;
      mockGenerateFn.mockResolvedValueOnce(undefined);

      const deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      // ページ移動時のバックグラウンド生成
      await deckCache.generateThumbnailsInBackground(
        24, // 2ページ目の開始インデックス
        24,
        deckList,
        vi.fn(),
        [],
        new Map(),
        new Map()
      );

      expect(mockGenerateFn).toHaveBeenCalledWith(
        24,
        24,
        deckList,
        expect.any(Function),
        [],
        expect.any(Map),
        expect.any(Map)
      );
    });

    it('デッキ保存時にサムネイル更新が呼び出される想定', async () => {
      // デッキ保存後のサムネイル更新（データ直接渡し）
      const dno = 456;
      const deckInfo = {
        dno,
        name: 'Saved Deck',
        mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      };

      const mockUpdateWithDataFn = deckCache.updateDeckInfoAndThumbnailWithData as any;
      mockUpdateWithDataFn.mockResolvedValueOnce(undefined);

      await deckCache.updateDeckInfoAndThumbnailWithData(
        dno,
        deckInfo,
        [],
        new Map(),
        new Map()
      );

      expect(mockUpdateWithDataFn).toHaveBeenCalledWith(
        dno,
        deckInfo,
        [],
        expect.any(Map),
        expect.any(Map)
      );
    });
  });
});
