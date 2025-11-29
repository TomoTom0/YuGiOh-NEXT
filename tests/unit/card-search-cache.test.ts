/**
 * カード検索・キャッシュ機能のテスト
 * - parseSearchResults()のTempCardDB自動保存
 * - saveCardDetailToCache()のTempCardDB自動保存
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseSearchResults, saveCardDetailToCache } from '@/api/card-search';
import { getTempCardDB, resetTempCardDB } from '@/utils/temp-card-db';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import type { CardDetail } from '@/types/card';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('parseSearchResults - TempCardDB自動保存', () => {
  beforeEach(() => {
    resetTempCardDB();
  });

  it('検索結果のカードがTempCardDBに保存される', () => {
    const htmlPath = path.join(__dirname, '../combine/data/card-search-result.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action'
    });
    const doc = dom.window.document as unknown as Document;

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(0);

    const tempCardDB = getTempCardDB();
    const firstCard = cards[0];
    const savedCard = tempCardDB.get(firstCard!.cardId);

    expect(savedCard).toBeDefined();
    expect(savedCard?.cardId).toBe(firstCard!.cardId);
    expect(savedCard?.name).toBe(firstCard!.name);
  });

  it('複数のカードが全てTempCardDBに保存される', () => {
    const htmlPath = path.join(__dirname, '../combine/data/card-search-result.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action'
    });
    const doc = dom.window.document as unknown as Document;

    const cards = parseSearchResults(doc);

    expect(cards.length).toBeGreaterThan(1);

    const tempCardDB = getTempCardDB();

    for (const card of cards) {
      const savedCard = tempCardDB.get(card.cardId);
      expect(savedCard).toBeDefined();
      expect(savedCard?.cardId).toBe(card.cardId);
    }
  });
});

describe('saveCardDetailToCache - TempCardDB自動保存', () => {
  beforeEach(() => {
    resetTempCardDB();
  });

  it('カード詳細と関連カードがTempCardDBに保存される', async () => {
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

    const tempCardDB = getTempCardDB();

    const mainCard = tempCardDB.get('4011');
    expect(mainCard).toBeDefined();
    expect(mainCard?.name).toBe('青眼の白竜');

    const relatedCard = tempCardDB.get('5678');
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

    const tempCardDB = getTempCardDB();

    expect(tempCardDB.get('4011')).toBeDefined();
    expect(tempCardDB.get('5678')).toBeDefined();
    expect(tempCardDB.get('9999')).toBeDefined();
  });
});
