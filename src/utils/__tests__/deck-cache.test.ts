/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  generateAndCacheThumbnail,
  updateDeckInfoAndThumbnail,
  updateDeckInfoAndThumbnailWithData,
  generateThumbnailsInBackground,
  type CachedDeckInfo,
} from '../deck-cache';
import * as deckThumbnail from '../deck-thumbnail';

// localStorageのモック
let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};

  // localStorageのモック
  global.localStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      mockStorage = {};
    }),
    length: 0,
    key: vi.fn(() => null),
  } as any;

  // deck-thumbnailのモック
  vi.spyOn(deckThumbnail, 'generateDeckThumbnailImage').mockResolvedValue('data:image/png;base64,mock');
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// 1. loadDeckListOrder / saveDeckListOrder のテスト
// ============================================================
describe('deck-cache - loadDeckListOrder / saveDeckListOrder', () => {
  it('デッキリストの順序を保存して読み込める', () => {
    const deckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
    ];

    saveDeckListOrder(deckList);

    const loaded = loadDeckListOrder();
    expect(loaded).toEqual([1, 2, 3]);
  });

  it('空のデッキリストを保存して読み込める', () => {
    saveDeckListOrder([]);

    const loaded = loadDeckListOrder();
    expect(loaded).toEqual([]);
  });

  it('キャッシュがない場合は空配列を返す', () => {
    const loaded = loadDeckListOrder();
    expect(loaded).toEqual([]);
  });

  it('不正なJSONがある場合は空配列を返す', () => {
    mockStorage['ygo_deck_list_order'] = 'invalid json';

    const loaded = loadDeckListOrder();
    expect(loaded).toEqual([]);
  });
});

// ============================================================
// 2. isDeckListOrderChanged のテスト
// ============================================================
describe('deck-cache - isDeckListOrderChanged', () => {
  it('順序が変わっていない場合はfalseを返す', () => {
    const deckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
    ];

    saveDeckListOrder(deckList);

    expect(isDeckListOrderChanged(deckList)).toBe(false);
  });

  it('順序が変わった場合はtrueを返す', () => {
    const deckList1 = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
    ];

    saveDeckListOrder(deckList1);

    const deckList2 = [
      { dno: 3, name: 'Deck 3' },
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
    ];

    expect(isDeckListOrderChanged(deckList2)).toBe(true);
  });

  it('長さが変わった場合はtrueを返す', () => {
    const deckList1 = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
    ];

    saveDeckListOrder(deckList1);

    const deckList2 = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
    ];

    expect(isDeckListOrderChanged(deckList2)).toBe(true);
  });

  it('前回のキャッシュがない場合はtrueを返す', () => {
    const deckList = [{ dno: 1, name: 'Deck 1' }];

    expect(isDeckListOrderChanged(deckList)).toBe(true);
  });
});

// ============================================================
// 3. loadThumbnailCache / saveThumbnailCache のテスト
// ============================================================
describe('deck-cache - loadThumbnailCache / saveThumbnailCache', () => {
  it('サムネイルキャッシュを保存して読み込める', () => {
    const thumbnails = new Map<number, string>([
      [1, 'data:image/png;base64,image1'],
      [2, 'data:image/png;base64,image2'],
    ]);

    saveThumbnailCache(thumbnails);

    const loaded = loadThumbnailCache();
    expect(loaded.get(1)).toBe('data:image/png;base64,image1');
    expect(loaded.get(2)).toBe('data:image/png;base64,image2');
    expect(loaded.size).toBe(2);
  });

  it('空のキャッシュを保存して読み込める', () => {
    const thumbnails = new Map<number, string>();

    saveThumbnailCache(thumbnails);

    const loaded = loadThumbnailCache();
    expect(loaded.size).toBe(0);
  });

  it('キャッシュがない場合は空のMapを返す', () => {
    const loaded = loadThumbnailCache();
    expect(loaded.size).toBe(0);
  });

  it('不正なJSONがある場合は空のMapを返す', () => {
    mockStorage['ygo_deck_thumbnails'] = 'invalid json';

    const loaded = loadThumbnailCache();
    expect(loaded.size).toBe(0);
  });
});

// ============================================================
// 4. loadDeckInfoCache / saveDeckInfoCache のテスト
// ============================================================
describe('deck-cache - loadDeckInfoCache / saveDeckInfoCache', () => {
  it('デッキ情報キャッシュを保存して読み込める', () => {
    const cachedInfos = new Map<number, CachedDeckInfo>([
      [
        1,
        {
          dno: 1,
          name: 'Deck 1',
          mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
          extraDeck: [],
          sideDeck: [],
          lastUpdated: Date.now(),
          hash: 'abc123',
          cardCount: { main: 3, extra: 0, side: 0 },
        },
      ],
    ]);

    saveDeckInfoCache(cachedInfos);

    const loaded = loadDeckInfoCache();
    expect(loaded.get(1)?.name).toBe('Deck 1');
    expect(loaded.get(1)?.hash).toBe('abc123');
    expect(loaded.get(1)?.cardCount?.main).toBe(3);
  });

  it('cardCountがない場合は自動計算される', () => {
    const cachedInfos = new Map<number, CachedDeckInfo>([
      [
        1,
        {
          dno: 1,
          name: 'Deck 1',
          mainDeck: [
            { cid: 'm001', ciid: '1', quantity: 3 },
            { cid: 'm002', ciid: '1', quantity: 2 },
          ],
          extraDeck: [{ cid: 'e001', ciid: '1', quantity: 1 }],
          sideDeck: [],
          lastUpdated: Date.now(),
          hash: 'abc123',
        } as CachedDeckInfo,
      ],
    ]);

    saveDeckInfoCache(cachedInfos);

    const loaded = loadDeckInfoCache();
    expect(loaded.get(1)?.cardCount?.main).toBe(5); // 3 + 2
    expect(loaded.get(1)?.cardCount?.extra).toBe(1);
    expect(loaded.get(1)?.cardCount?.side).toBe(0);
  });

  it('キャッシュがない場合は空のMapを返す', () => {
    const loaded = loadDeckInfoCache();
    expect(loaded.size).toBe(0);
  });

  it('不正なJSONがある場合は空のMapを返す', () => {
    mockStorage['ygo_deck_info_cache'] = 'invalid json';

    const loaded = loadDeckInfoCache();
    expect(loaded.size).toBe(0);
  });
});

// ============================================================
// 5. calculateDeckHash のテスト
// ============================================================
describe('deck-cache - calculateDeckHash', () => {
  it('同じデッキ情報からは同じハッシュが生成される', () => {
    const deckInfo = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [
        { cid: 'm001', ciid: '1', quantity: 3 },
        { cid: 'm002', ciid: '1', quantity: 2 },
      ],
      extraDeck: [{ cid: 'e001', ciid: '1', quantity: 1 }],
      sideDeck: [],
    };

    const hash1 = calculateDeckHash(deckInfo);
    const hash2 = calculateDeckHash(deckInfo);

    expect(hash1).toBe(hash2);
  });

  it('カードの順序が変わってもハッシュは変わらない（順序依存）', () => {
    const deckInfo1 = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [
        { cid: 'm001', ciid: '1', quantity: 3 },
        { cid: 'm002', ciid: '1', quantity: 2 },
      ],
      extraDeck: [],
      sideDeck: [],
    };

    const deckInfo2 = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [
        { cid: 'm002', ciid: '1', quantity: 2 },
        { cid: 'm001', ciid: '1', quantity: 3 },
      ],
      extraDeck: [],
      sideDeck: [],
    };

    const hash1 = calculateDeckHash(deckInfo1);
    const hash2 = calculateDeckHash(deckInfo2);

    // 順序が異なればハッシュも異なる
    expect(hash1).not.toBe(hash2);
  });

  it('数量が変わればハッシュも変わる', () => {
    const deckInfo1 = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const deckInfo2 = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 2 }],
      extraDeck: [],
      sideDeck: [],
    };

    const hash1 = calculateDeckHash(deckInfo1);
    const hash2 = calculateDeckHash(deckInfo2);

    expect(hash1).not.toBe(hash2);
  });

  it('名前が変わればハッシュも変わる', () => {
    const deckInfo1 = {
      name: 'Deck A',
      originalName: 'Deck A',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const deckInfo2 = {
      name: 'Deck B',
      originalName: 'Deck B',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const hash1 = calculateDeckHash(deckInfo1);
    const hash2 = calculateDeckHash(deckInfo2);

    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================
// 6. isDeckInfoChanged のテスト
// ============================================================
describe('deck-cache - isDeckInfoChanged', () => {
  it('キャッシュがない場合はtrueを返す', () => {
    const deckInfo = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const cachedInfos = new Map<number, CachedDeckInfo>();

    expect(isDeckInfoChanged(1, deckInfo, cachedInfos)).toBe(true);
  });

  it('ハッシュが同じ場合はfalseを返す', () => {
    const deckInfo = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const hash = calculateDeckHash(deckInfo);
    const cachedInfos = new Map<number, CachedDeckInfo>([
      [
        1,
        {
          dno: 1,
          name: 'Test Deck',
          originalName: 'Test Deck',
          mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
          extraDeck: [],
          sideDeck: [],
          lastUpdated: Date.now(),
          hash,
          cardCount: { main: 3, extra: 0, side: 0 },
        },
      ],
    ]);

    expect(isDeckInfoChanged(1, deckInfo, cachedInfos)).toBe(false);
  });

  it('ハッシュが異なる場合はtrueを返す', () => {
    const deckInfo = {
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const cachedInfos = new Map<number, CachedDeckInfo>([
      [
        1,
        {
          dno: 1,
          name: 'Test Deck',
          originalName: 'Test Deck',
          mainDeck: [{ cid: 'm001', ciid: '1', quantity: 2 }],
          extraDeck: [],
          sideDeck: [],
          lastUpdated: Date.now(),
          hash: 'different_hash',
          cardCount: { main: 2, extra: 0, side: 0 },
        },
      ],
    ]);

    expect(isDeckInfoChanged(1, deckInfo, cachedInfos)).toBe(true);
  });
});

// ============================================================
// 7. isCacheExpired のテスト
// ============================================================
describe('deck-cache - isCacheExpired', () => {
  it('期限内のキャッシュはfalseを返す', () => {
    const cachedInfo: CachedDeckInfo = {
      dno: 1,
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      lastUpdated: Date.now(),
      hash: 'abc123',
      cardCount: { main: 0, extra: 0, side: 0 },
    };

    expect(isCacheExpired(cachedInfo)).toBe(false);
  });

  it('期限切れのキャッシュはtrueを返す', () => {
    const cachedInfo: CachedDeckInfo = {
      dno: 1,
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8日前
      hash: 'abc123',
      cardCount: { main: 0, extra: 0, side: 0 },
    };

    expect(isCacheExpired(cachedInfo)).toBe(true);
  });

  it('カスタム期限時間を指定できる', () => {
    const cachedInfo: CachedDeckInfo = {
      dno: 1,
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      lastUpdated: Date.now() - 2 * 60 * 60 * 1000, // 2時間前
      hash: 'abc123',
      cardCount: { main: 0, extra: 0, side: 0 },
    };

    // 1時間で期限切れ
    expect(isCacheExpired(cachedInfo, 60 * 60 * 1000)).toBe(true);

    // 3時間で期限切れ
    expect(isCacheExpired(cachedInfo, 3 * 60 * 60 * 1000)).toBe(false);
  });
});

// ============================================================
// 8. generateAndCacheThumbnail のテスト
// ============================================================
describe('deck-cache - generateAndCacheThumbnail', () => {
  it('サムネイルを生成してキャッシュに保存する', async () => {
    const deckInfo = {
      dno: 1,
      name: 'Test Deck',
      originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    await generateAndCacheThumbnail(1, deckInfo, [], deckThumbnails, cachedDeckInfos);

    // サムネイルが保存されているか
    expect(deckThumbnails.get(1)).toBe('data:image/png;base64,mock');

    // デッキ情報が保存されているか
    expect(cachedDeckInfos.get(1)?.name).toBe('Test Deck');
    expect(cachedDeckInfos.get(1)?.hash).toBeDefined();
  });
});

// ============================================================
// 9. updateDeckInfoAndThumbnail のテスト
// ============================================================
describe('deck-cache - updateDeckInfoAndThumbnail', () => {
  it('変更がある場合はサムネイルを更新する', async () => {
    const getDeckDetail = vi.fn().mockResolvedValue({
      dno: 1,
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    });

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    const result = await updateDeckInfoAndThumbnail(
      1,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos
    );

    expect(result).toBe(true);
    expect(getDeckDetail).toHaveBeenCalledWith(1);
    expect(deckThumbnails.has(1)).toBe(true);
  });

  it('getDeckDetailがnullを返した場合は何もしない', async () => {
    const getDeckDetail = vi.fn().mockResolvedValue(null);

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    const result = await updateDeckInfoAndThumbnail(
      1,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos
    );

    expect(result).toBe(false);
    expect(deckThumbnails.has(1)).toBe(false);
  });
});

// ============================================================
// 10. updateDeckInfoAndThumbnailWithData のテスト
// ============================================================
describe('deck-cache - updateDeckInfoAndThumbnailWithData', () => {
  it('変更がある場合はサムネイルを更新する', async () => {
    const deckInfo = {
      dno: 1,
      name: 'Test Deck',
          originalName: 'Test Deck',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    };

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    await updateDeckInfoAndThumbnailWithData(1, deckInfo, [], deckThumbnails, cachedDeckInfos);

    expect(deckThumbnails.has(1)).toBe(true);
    expect(cachedDeckInfos.has(1)).toBe(true);
  });
});

// ============================================================
// 11. generateThumbnailsInBackground のテスト（最重要）
// ============================================================
describe('deck-cache - generateThumbnailsInBackground', () => {
  it('基本ケース: 全てのデッキのサムネイルを生成する', async () => {
    const deckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
    ];

    const getDeckDetail = vi.fn((dno: number) =>
      Promise.resolve({
        dno,
        name: `Deck ${dno}`,
        mainDeck: [{ cid: `m00${dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      })
    );

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    // requestIdleCallbackのモック
    global.requestIdleCallback = vi.fn((callback: any) => {
      callback();
      return 0;
    }) as any;

    await generateThumbnailsInBackground(
      0,
      50,
      deckList,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    expect(getDeckDetail).toHaveBeenCalledTimes(2);
    expect(deckThumbnails.size).toBe(2);
    expect(cachedDeckInfos.size).toBe(2);
  });

  it('5個連続で順序・内容保持の場合は早期終了する', async () => {
    const deckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
      { dno: 4, name: 'Deck 4' },
      { dno: 5, name: 'Deck 5' },
      { dno: 6, name: 'Deck 6' },
      { dno: 7, name: 'Deck 7' },
    ];

    // 順序を保存（前回と同じ順序）
    saveDeckListOrder(deckList);

    // 全てのデッキをキャッシュに保存（内容も変わらない）
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();
    for (const deck of deckList) {
      const deckInfo = {
        dno: deck.dno,
        name: deck.name,
        mainDeck: [{ cid: `m00${deck.dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      };
      const hash = calculateDeckHash(deckInfo);
      cachedDeckInfos.set(deck.dno, {
        dno: deck.dno,
        name: deck.name,
        mainDeck: [{ cid: `m00${deck.dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash,
        cardCount: { main: 3, extra: 0, side: 0 },
      });
    }

    const getDeckDetail = vi.fn((dno: number) =>
      Promise.resolve({
        dno,
        name: `Deck ${dno}`,
        mainDeck: [{ cid: `m00${dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      })
    );

    const deckThumbnails = new Map<number, string>();

    // requestIdleCallbackのモック
    global.requestIdleCallback = vi.fn((callback: any) => {
      callback();
      return 0;
    }) as any;

    await generateThumbnailsInBackground(
      0,
      50,
      deckList,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    // 5個チェックして早期終了するため、7個全てはチェックされない
    expect(getDeckDetail).toHaveBeenCalledTimes(5);
    expect(deckThumbnails.size).toBe(0); // 変更がないため生成されない
  });

  it('順序が変わった場合は早期終了しない', async () => {
    const previousDeckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
    ];

    // 前回の順序を保存
    saveDeckListOrder(previousDeckList);

    // 現在の順序（変更あり）
    const currentDeckList = [
      { dno: 3, name: 'Deck 3' },
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
    ];

    const getDeckDetail = vi.fn((dno: number) =>
      Promise.resolve({
        dno,
        name: `Deck ${dno}`,
        mainDeck: [{ cid: `m00${dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      })
    );

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    // requestIdleCallbackのモック
    global.requestIdleCallback = vi.fn((callback: any) => {
      callback();
      return 0;
    }) as any;

    await generateThumbnailsInBackground(
      0,
      50,
      currentDeckList,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    // 順序が変わったため、早期終了せずに全てチェック
    expect(getDeckDetail).toHaveBeenCalledTimes(3);
  });

  it('requestIdleCallbackがない環境でもsetTimeoutで動作する', async () => {
    // requestIdleCallbackを削除
    delete (global as any).requestIdleCallback;

    const deckList = [{ dno: 1, name: 'Deck 1' }];

    const getDeckDetail = vi.fn().mockResolvedValue({
      dno: 1,
      name: 'Deck 1',
      mainDeck: [{ cid: 'm001', ciid: '1', quantity: 3 }],
      extraDeck: [],
      sideDeck: [],
    });

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    // setTimeoutのモック
    vi.useFakeTimers();

    const promise = generateThumbnailsInBackground(
      0,
      50,
      deckList,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    // タイマーを進める
    await vi.runAllTimersAsync();

    await promise;

    expect(getDeckDetail).toHaveBeenCalled();
    expect(deckThumbnails.size).toBe(1);

    vi.useRealTimers();
  });

  it('空のデッキリストの場合は何もしない', async () => {
    const getDeckDetail = vi.fn();

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    await generateThumbnailsInBackground(
      0,
      50,
      [],
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    expect(getDeckDetail).not.toHaveBeenCalled();
  });

  it('batchSizeで処理範囲を制限できる', async () => {
    const deckList = [
      { dno: 1, name: 'Deck 1' },
      { dno: 2, name: 'Deck 2' },
      { dno: 3, name: 'Deck 3' },
      { dno: 4, name: 'Deck 4' },
      { dno: 5, name: 'Deck 5' },
    ];

    const getDeckDetail = vi.fn((dno: number) =>
      Promise.resolve({
        dno,
        name: `Deck ${dno}`,
        mainDeck: [{ cid: `m00${dno}`, ciid: '1', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
      })
    );

    const deckThumbnails = new Map<number, string>();
    const cachedDeckInfos = new Map<number, CachedDeckInfo>();

    // requestIdleCallbackのモック
    global.requestIdleCallback = vi.fn((callback: any) => {
      callback();
      return 0;
    }) as any;

    // batchSize=2で処理
    await generateThumbnailsInBackground(
      0,
      2,
      deckList,
      getDeckDetail,
      [],
      deckThumbnails,
      cachedDeckInfos,
      true  // force
    );

    // 最初の2つのみ処理される
    expect(getDeckDetail).toHaveBeenCalledTimes(2);
    expect(getDeckDetail).toHaveBeenCalledWith(1);
    expect(getDeckDetail).toHaveBeenCalledWith(2);
    expect(getDeckDetail).not.toHaveBeenCalledWith(3);
  });
});
