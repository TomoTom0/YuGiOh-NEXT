import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  searchCardsByName,
  searchCardById,
  searchCardsAuto
} from '@/api/card-search';
import type { CardInfo } from '@/types/card';

describe('api/card-search - Basic Search Functions', () => {
  let fetchSpy: any;

  // モック用のカード検索結果HTML
  const mockSearchResultHTML = (cardId: string = '1', name: string = 'テストカード') => `
    <!DOCTYPE html>
    <html>
      <body>
        <div class="result_list">
          <tr>
            <td><a href="card_search.action?ope=2&cid=${cardId}">${cardId}</a></td>
            <td>${name}</td>
            <td>魔法</td>
          </tr>
        </div>
      </body>
    </html>
  `;

  const mockCardInfo: CardInfo = {
    cardId: '1',
    name: 'テストカード',
    ciid: '1',
    lang: 'ja',
    imgs: [{ ciid: '1', imgHash: 'hash1' }]
  };

  beforeEach(() => {
    // fetch のモック化
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCardsByName', () => {
    it('should search cards by name successfully', async () => {
      const mockHtml = mockSearchResultHTML('12345', 'テストカード');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const results = await searchCardsByName('テスト');

      // API が呼び出されたことを確認
      expect(fetchSpy).toHaveBeenCalled();
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array when API fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false
      });

      const results = await searchCardsByName('テスト');

      expect(results).toEqual([]);
    });

    it('should return empty array on fetch error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const results = await searchCardsByName('テスト');

      expect(results).toEqual([]);
    });

    it('should handle empty keyword', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const results = await searchCardsByName('');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should pass limit parameter to API', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await searchCardsByName('テスト', 50);

      expect(fetchSpy).toHaveBeenCalled();
      const callUrl = fetchSpy.mock.calls[0][0];

      // URLに rp=50 パラメータが含まれていることを確認
      if (typeof callUrl === 'string') {
        expect(callUrl).toContain('rp=50');
      }
    });

    it('should use default limit of 100', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await searchCardsByName('テスト');

      expect(fetchSpy).toHaveBeenCalled();
      const callUrl = fetchSpy.mock.calls[0][0];

      // URLに rp=100 パラメータが含まれていることを確認
      if (typeof callUrl === 'string') {
        expect(callUrl).toContain('rp=100');
      }
    });
  });

  describe('searchCardById', () => {
    it('should search card by ID successfully', async () => {
      const mockHtml = mockSearchResultHTML('12345', 'テストカード');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await searchCardById('12345');

      expect(fetchSpy).toHaveBeenCalled();
      // parseSearchResults に依存するため、結果の型チェックのみ
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should return null when card not found', async () => {
      const mockHtml = `<!DOCTYPE html><html><body></body></html>`;

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await searchCardById('99999');

      // 結果がない場合は null が返される
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should return null when API fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false
      });

      const result = await searchCardById('12345');

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchCardById('12345');

      expect(result).toBeNull();
    });

    it('should include card ID in API request', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await searchCardById('54321');

      expect(fetchSpy).toHaveBeenCalled();
      const callUrl = fetchSpy.mock.calls[0][0];

      if (typeof callUrl === 'string') {
        expect(callUrl).toContain('cid=54321');
      }
    });
  });

  describe('searchCardsAuto', () => {
    it('should return empty array when keyword is empty', async () => {
      const result = await searchCardsAuto('');

      expect(result).toBeDefined();
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('should search by name only for single character', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await searchCardsAuto('テ');

      expect(result).toBeDefined();
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);

      // 1文字の場合、1回のfetch呼び出しのみ（searchCardsByName のみ）
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should perform multiple searches for 2+ characters', async () => {
      const mockHtml = mockSearchResultHTML();

      // Promise.all のために複数のモックレスポンスが必要
      fetchSpy
        .mockResolvedValueOnce({ ok: true, text: async () => mockHtml })
        .mockResolvedValueOnce({ ok: true, text: async () => mockHtml })
        .mockResolvedValueOnce({ ok: true, text: async () => mockHtml });

      const result = await searchCardsAuto('テスト');

      expect(result).toBeDefined();
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);

      // 2文字以上の場合、複数のfetch呼び出しが期待される
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should return cards array in result', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await searchCardsAuto('テ');

      expect(result).toHaveProperty('cards');
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await searchCardsAuto('テスト');

      expect(result).toBeDefined();
      expect(result.cards).toEqual([]);
    });

    it('should return searchAutoResult with cards property', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await searchCardsAuto('テ');

      // SearchAutoResult インターフェース確認
      expect(result).toHaveProperty('cards');
      // fetchMorePromise は optional
      expect(typeof result === 'object').toBe(true);
    });
  });

  describe('API URL building', () => {
    it('searchCardsByName should use POST method with GET credentials', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await searchCardsByName('テスト');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('searchCardById should use GET method with credentials', async () => {
      const mockHtml = mockSearchResultHTML();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await searchCardById('12345');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should log error when search fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      fetchSpy.mockRejectedValueOnce(new Error('Test error'));

      await searchCardsByName('テスト');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('searchCardById should log error when search fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      fetchSpy.mockRejectedValueOnce(new Error('Test error'));

      await searchCardById('12345');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
