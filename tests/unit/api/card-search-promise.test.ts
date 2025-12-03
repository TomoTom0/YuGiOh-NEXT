import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAdditionalPages } from '@/api/card-search';
import type { CardInfo } from '@/types/card';

// モック関数
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja')
}));

vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'ocg')
}));

vi.mock('@/utils/url-builder', () => ({
  buildApiUrl: vi.fn((action, gameType, params) => {
    const baseUrl = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action';
    const paramStr = params ? new URLSearchParams(params).toString() : '';
    return paramStr ? `${baseUrl}?${paramStr}` : baseUrl;
  })
}));

describe('api/card-search: fetchAdditionalPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Promise チェーンテスト', () => {
    it('fetchAdditionalPages() が Promise を返す', async () => {
      // fetchを モック
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<html><body></body></html>')
        } as Response)
      );

      const baseParams = { w: 'name', o: '0' };
      const parseFunc = (doc: Document) => [] as CardInfo[];
      const result = fetchAdditionalPages(baseParams, parseFunc, 'test');

      // Promise インスタンスであることを確認
      expect(result).toBeInstanceOf(Promise);

      // await で値が取得できることを確認
      const cards = await result;
      expect(Array.isArray(cards)).toBe(true);
    });

    it('複数ページのカード情報を並列取得', async () => {
      let callCount = 0;

      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // 1ページ目：2000件（最大件数）
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<html><body><div class="card" data-cid="1"></div></body></html>')
          } as Response);
        } else if (callCount === 2) {
          // 2ページ目：500件（最終ページ）
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<html><body><div class="card" data-cid="2"></div></body></html>')
          } as Response);
        }
        return Promise.reject(new Error('Unexpected call'));
      });

      const baseParams = { w: 'name', o: '0' };
      const cardList: CardInfo[] = [];
      const parseFunc = (doc: Document) => {
        // 1ページ分のカードを返す（簡略化）
        const cards: CardInfo[] = [];
        if (doc.body.innerHTML.includes('data-cid="1"')) {
          // 1ページ目の場合、2000件分を返す
          for (let i = 0; i < 2000; i++) {
            cards.push({
              cardId: `card-${callCount}-${i}`,
              name: `Card ${callCount}-${i}`,
              cardType: 'monster',
              imgs: [{ ciid: 'ciid-1', url: 'http://example.com/card.jpg' }],
              ruby: {},
              lang: 'ja'
            } as CardInfo);
          }
        } else {
          // 2ページ目の場合、500件を返す
          for (let i = 0; i < 500; i++) {
            cards.push({
              cardId: `card-${callCount}-${i}`,
              name: `Card ${callCount}-${i}`,
              cardType: 'monster',
              imgs: [{ ciid: 'ciid-2', url: 'http://example.com/card.jpg' }],
              ruby: {},
              lang: 'ja'
            } as CardInfo);
          }
        }
        return cards;
      };

      const result = await fetchAdditionalPages(baseParams, parseFunc, 'test');

      // 2ページ分のカード情報が取得されたか確認
      expect(result.length).toBe(2500);
      expect(callCount).toBe(2);
    });

    it('API 失敗時のエラーハンドリング', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        } as Response)
      );

      const baseParams = { w: 'name', o: '0' };
      const parseFunc = (doc: Document) => [] as CardInfo[];

      const result = await fetchAdditionalPages(baseParams, parseFunc, 'test');

      // エラーが発生した場合、空配列を返す
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('ネットワークエラーハンドリング', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const baseParams = { w: 'name', o: '0' };
      const parseFunc = (doc: Document) => [] as CardInfo[];

      const result = await fetchAdditionalPages(baseParams, parseFunc, 'test');

      // エラーが発生した場合、空配列を返す
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('ページングロジック：最終ページ判定', async () => {
      let callCount = 0;

      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // 1ページ目：1500件（2000件未満 → 最終ページ）
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<html><body></body></html>')
          } as Response);
        }
        return Promise.reject(new Error('Should not reach here'));
      });

      const baseParams = { w: 'name', o: '0' };
      const parseFunc = (doc: Document) => {
        // 1500件のカードを返す
        const cards: CardInfo[] = [];
        for (let i = 0; i < 1500; i++) {
          cards.push({
            cardId: `card-${i}`,
            name: `Card ${i}`,
            cardType: 'monster',
            imgs: [{ ciid: 'ciid-1', url: 'http://example.com/card.jpg' }],
            ruby: {},
            lang: 'ja'
          } as CardInfo);
        }
        return cards;
      };

      const result = await fetchAdditionalPages(baseParams, parseFunc, 'test');

      // 1ページのみ取得される（1500件）
      expect(result.length).toBe(1500);
      expect(callCount).toBe(1);
    });

    it('空のカード結果で終了', async () => {
      let callCount = 0;

      global.fetch = vi.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<html><body></body></html>')
        } as Response);
      });

      const baseParams = { w: 'name', o: '0' };
      const parseFunc = (doc: Document) => [] as CardInfo[];

      const result = await fetchAdditionalPages(baseParams, parseFunc, 'test');

      // 空配列が返される
      expect(result.length).toBe(0);
      expect(callCount).toBe(1);
    });
  });
});
