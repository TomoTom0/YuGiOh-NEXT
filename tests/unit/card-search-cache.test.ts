/**
 * カード検索・キャッシュ機能のテスト
 * - parseSearchResults()のカード情報パース
 * - saveCardDetailToCache()のUnifiedCacheDB保存
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseSearchResults, saveCardDetailToCache } from '@/api/card-search';
import { getTempCacheDB, resetTempCacheDB } from '@/utils/temp-cache-db';
import { getUnifiedCacheDB, resetUnifiedCacheDB } from '@/utils/unified-cache-db';
import type { CardDetail } from '@/types/card';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('parseSearchResults - カード情報パース', () => {
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
              result = { ...mockStorage };
            }
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
      runtime: {
        id: 'test-extension-id'
      }
    } as any;

    resetTempCacheDB();
    resetUnifiedCacheDB();
  });

  const htmlPath = path.join(__dirname, '../combine/data/card-search-result.html');
  const hasHtmlFile = fs.existsSync(htmlPath);

  it.skipIf(!hasHtmlFile)('検索結果のカードを正しくパースできる', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(0);

    // parseSearchResults は単にカード情報を返すだけで、TempCacheDB への保存は行わない
    // 保存は呼び出し側（CardList.vueなど）で行う
    const firstCard = cards[0];
    expect(firstCard).toBeDefined();
    expect(firstCard!.cardId).toBeDefined();
    expect(firstCard!.name).toBeDefined();
  });

  it.skipIf(!hasHtmlFile)('複数のカードを正しくパースできる', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(1);

    // parseSearchResults は単にカード情報を返すだけで、TempCacheDB への保存は行わない
    for (const card of cards) {
      expect(card).toBeDefined();
      expect(card.cardId).toBeDefined();
      expect(card.name).toBeDefined();
    }
  });
});

describe('saveCardDetailToCache - UnifiedCacheDB保存', () => {
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
              result = { ...mockStorage };
            }
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
      runtime: {
        id: 'test-extension-id'
      }
    } as any;

    resetTempCacheDB();
    resetUnifiedCacheDB();
  });

  it('[covers:save_detail_cache.card_and_related_always_set] カード詳細と関連カードがUnifiedCacheDBに保存される', async () => {
    const unifiedDB = getUnifiedCacheDB();

    const detail: CardDetail = {
      card: {
        cardId: '4011',
        ciid: '1',
        name: '青眼の白竜',
        ruby: 'ブルーアイズ・ホワイト・ドラゴン',
        imgs: [{ ciid: '1', imgHash: 'test_hash' }],
        cardType: 'monster',
        attribute: 'light',
        race: 'dragon',
        levelType: 'level',
        levelValue: 8,
        types: ['normal'],
        atk: 3000,
        def: 2500,
        isExtraDeck: false,
        limitRegulation: 'unlimited'
      },
      relatedCards: [
        {
          cardId: '5678',
          ciid: '2',
          name: '青眼の究極竜',
          ruby: '',
          imgs: [{ ciid: '2', imgHash: 'h2' }],
          cardType: 'monster',
          attribute: 'light',
          race: 'dragon',
          levelType: 'level',
          levelValue: 12,
          types: ['fusion'],
          atk: 4500,
          def: 3800,
          isExtraDeck: true,
          limitRegulation: 'unlimited'
        }
      ],
      packs: [],
      qaList: []
    };

    await saveCardDetailToCache(unifiedDB, detail, true);

    // UnifiedCacheDB に保存されることを確認
    const mainCard = unifiedDB.reconstructCardInfo('4011');
    expect(mainCard).toBeDefined();
    expect(mainCard?.name).toBe('青眼の白竜');

    const relatedCard = unifiedDB.reconstructCardInfo('5678');
    expect(relatedCard).toBeDefined();
    expect(relatedCard?.name).toBe('青眼の究極竜');
  });

  it('[covers:save_detail_cache.card_and_related_always_set] 複数の関連カードが全て保存される', async () => {
    const unifiedDB = getUnifiedCacheDB();

    const detail: CardDetail = {
      card: {
        cardId: '4011',
        ciid: '1',
        name: '青眼の白竜',
        ruby: '',
        imgs: [{ ciid: '1', imgHash: 'h1' }],
        cardType: 'monster',
        attribute: 'light',
        race: 'dragon',
        levelType: 'level',
        levelValue: 8,
        types: ['normal'],
        atk: 3000,
        def: 2500,
        isExtraDeck: false,
        limitRegulation: 'unlimited'
      },
      relatedCards: [
        {
          cardId: '5678',
          ciid: '2',
          name: '青眼の究極竜',
          ruby: '',
          imgs: [{ ciid: '2', imgHash: 'h2' }],
          cardType: 'monster',
          attribute: 'light',
          race: 'dragon',
          levelType: 'level',
          levelValue: 12,
          types: ['fusion'],
          atk: 4500,
          def: 3800,
          isExtraDeck: true,
          limitRegulation: 'unlimited'
        },
        {
          cardId: '9999',
          ciid: '3',
          name: '真青眼の究極竜',
          ruby: '',
          imgs: [{ ciid: '3', imgHash: 'h3' }],
          cardType: 'monster',
          attribute: 'light',
          race: 'dragon',
          levelType: 'level',
          levelValue: 12,
          types: ['fusion'],
          atk: 4500,
          def: 3800,
          isExtraDeck: true,
          limitRegulation: 'unlimited'
        }
      ],
      packs: [],
      qaList: []
    };

    await saveCardDetailToCache(unifiedDB, detail, true);

    // UnifiedCacheDB に保存されることを確認
    expect(unifiedDB.reconstructCardInfo('4011')).toBeDefined();
    expect(unifiedDB.reconstructCardInfo('5678')).toBeDefined();
    expect(unifiedDB.reconstructCardInfo('9999')).toBeDefined();
  });

  it('[covers:save_detail_cache.table_c_shape] [covers:save_detail_cache.tier3_persists_table_c] Tier 3以上ではTableCを言語別に保存する', async () => {
    const setCardInfo = vi.fn();
    const setCardTableC = vi.fn().mockResolvedValue(undefined);
    const fakeDB = {
      setCardInfo,
      getCardTier: vi.fn().mockReturnValue(3),
      setCardTableC
    };
    const detail = {
      card: {
        cardId: '4011',
        ciid: '1',
        name: '青眼の白竜',
        imgs: [{ ciid: '1', imgHash: 'h1' }],
        lang: 'ja'
      },
      relatedCards: [
        { cardId: '5678', ciid: '1', name: '関連1', imgs: [{ ciid: '1', imgHash: 'h2' }], lang: 'ja' },
        { cardId: '9999', ciid: '1', name: '関連2', imgs: [{ ciid: '1', imgHash: 'h3' }], lang: 'ja' }
      ],
      packs: [
        { name: 'パック1', packId: 'p1' },
        { name: 'パック2' }
      ],
      qaList: undefined
    } as unknown as CardDetail;

    await saveCardDetailToCache(fakeDB as any, detail, true, 'en');

    expect(setCardInfo).toHaveBeenCalledTimes(3);
    expect(setCardInfo).toHaveBeenNthCalledWith(1, detail.card, true);
    expect(setCardTableC).toHaveBeenCalledWith({
      cardId: '4011',
      langsRelatedCards: { en: ['5678', '9999'] },
      langsRelatedProducts: { en: ['p1'] },
      langsRelatedProductDetail: { en: detail.packs },
      qaList: []
    }, 'en');
  });

  it('[covers:save_detail_cache.tier_below3_no_table_c] Tier 3未満ではTableCを永続保存しない', async () => {
    const fakeDB = {
      setCardInfo: vi.fn(),
      getCardTier: vi.fn().mockReturnValue(2),
      setCardTableC: vi.fn().mockResolvedValue(undefined)
    };
    const detail = {
      card: { cardId: '4011', ciid: '1', name: '青眼の白竜', imgs: [{ ciid: '1', imgHash: 'h1' }], lang: 'ja' },
      relatedCards: [],
      packs: [],
      qaList: []
    } as unknown as CardDetail;

    await saveCardDetailToCache(fakeDB as any, detail, false, 'ja');

    expect(fakeDB.setCardInfo).toHaveBeenCalledWith(detail.card, false);
    expect(fakeDB.setCardTableC).not.toHaveBeenCalled();
  });
});
