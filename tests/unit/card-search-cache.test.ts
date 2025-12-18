/**
 * カード検索・キャッシュ機能のテスト
 * - parseSearchResults()のカード情報パース
 * - saveCardDetailToCache()のUnifiedCacheDB保存
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseSearchResults, saveCardDetailToCache } from '@/api/card-search';
import { getTempCardDB, resetTempCardDB } from '@/utils/temp-card-db';
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

    resetTempCardDB();
    resetUnifiedCacheDB();
  });

  const htmlPath = path.join(__dirname, '../combine/data/card-search-result.html');
  const hasHtmlFile = fs.existsSync(htmlPath);

  it.skipIf(!hasHtmlFile)('検索結果のカードを正しくパースできる', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action'
    });
    const doc = dom.window.document as unknown as Document;
    global.document = doc as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLImageElement = dom.window.HTMLImageElement as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(0);

    // parseSearchResults は単にカード情報を返すだけで、TempCardDB への保存は行わない
    // 保存は呼び出し側（CardList.vueなど）で行う
    const firstCard = cards[0];
    expect(firstCard).toBeDefined();
    expect(firstCard!.cardId).toBeDefined();
    expect(firstCard!.name).toBeDefined();
  });

  it.skipIf(!hasHtmlFile)('複数のカードを正しくパースできる', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action'
    });
    const doc = dom.window.document as unknown as Document;
    global.document = doc as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLImageElement = dom.window.HTMLImageElement as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(1);

    // parseSearchResults は単にカード情報を返すだけで、TempCardDB への保存は行わない
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

    resetTempCardDB();
    resetUnifiedCacheDB();
  });

  it('カード詳細と関連カードがUnifiedCacheDBに保存される', async () => {
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

  it('複数の関連カードが全て保存される', async () => {
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
});
