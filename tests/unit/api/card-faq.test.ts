import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardFAQList, getFAQDetail } from '@/api/card-faq';
import type { CardFAQList, CardFAQ } from '@/types/card';

// queuedFetch をモック化
vi.mock('@/utils/request-queue', () => ({
  queuedFetch: vi.fn()
}));

// detectCardGameType をモック化
vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'yugioh')
}));

// buildApiUrl をモック化
vi.mock('@/utils/url-builder', () => ({
  buildApiUrl: vi.fn((action: string, gameType: string, params: URLSearchParams) => {
    const queryString = params.toString();
    return `https://www.db.yugioh-card.com/yugiohdb/${action}?${queryString}`;
  })
}));

import * as requestQueue from '@/utils/request-queue';

describe('api/card-faq', () => {
  const mockFetch = vi.mocked(requestQueue.queuedFetch);

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCardFAQList', () => {
    const mockFAQListHTML = (cardId: string = '1', cardName: string = 'ブラック・マジシャン') => `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cardName} | カードに関連するＱ＆Ａ | 遊戯王ニューロン</title>
        </head>
        <body>
          <div class="supplement">
            <div class="title">カードテキスト補足 <span class="update">2024-01-15</span></div>
            <div class="text" id="supplement">
              テキスト補足情報<br>
              複数行の補足
            </div>
          </div>
          <div class="supplement">
            <div class="title">ペンデュラム補足 <span class="update">2024-02-20</span></div>
            <div class="text" id="pen_supplement">
              ペンデュラムテキスト補足<br>
              複数行
            </div>
          </div>
          <table>
            <tr class="t_row">
              <td><div class="dack_name"><span class="name">質問1: カード効果について</span></div></td>
              <td><div class="date">2024-01-10</div></td>
              <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1"></td>
            </tr>
            <tr class="t_row">
              <td><div class="dack_name"><span class="name">質問2: カード相互作用について</span></div></td>
              <td><div class="date">2024-01-20</div></td>
              <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=116&keyword=&tag=-1"></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    it('should fetch FAQ list successfully', async () => {
      const mockHtml = mockFAQListHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result?.cardId).toBe('1');
      expect(result?.cardName).toBe('ブラック・マジシャン');
      expect(Array.isArray(result?.faqs)).toBe(true);
      expect(result?.faqs.length).toBeGreaterThan(0);
    });

    it('should extract card name from title correctly', async () => {
      const mockHtml = mockFAQListHTML('12345', 'テストカード');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('12345');

      expect(result?.cardName).toBe('テストカード');
    });

    it('should extract FAQs with correct structure', async () => {
      const mockHtml = mockFAQListHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.faqs).toHaveLength(2);
      expect(result?.faqs[0]).toEqual({
        faqId: '115',
        question: '質問1: カード効果について',
        answer: '',
        updatedAt: '2024-01-10'
      });
      expect(result?.faqs[1]).toEqual({
        faqId: '116',
        question: '質問2: カード相互作用について',
        answer: '',
        updatedAt: '2024-01-20'
      });
    });

    it('should extract supplement information correctly', async () => {
      const mockHtml = mockFAQListHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.supplementInfo).toBeDefined();
      expect(result?.supplementDate).toBe('2024-01-15');
      expect(result?.pendulumSupplementInfo).toBeDefined();
      expect(result?.pendulumSupplementDate).toBe('2024-02-20');
    });

    it('should handle missing supplement information gracefully', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>テストカード | カードに関連するＱ＆Ａ | 遊戯王ニューロン</title></head>
          <body>
            <table>
              <tr class="t_row">
                <td><div class="dack_name"><span class="name">質問</span></div></td>
                <td><div class="date">更新日: 2024-01-10</div></td>
                <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1"></td>
              </tr>
            </table>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.supplementInfo).toBeUndefined();
      expect(result?.pendulumSupplementInfo).toBeUndefined();
      expect(result?.faqs.length).toBe(1);
    });

    it('should return null when API response is not OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      const result = await getCardFAQList('1');

      expect(result).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getCardFAQList('1');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should skip FAQ entries without question text', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>テストカード | カードに関連するＱ＆Ａ | 遊戯王ニューロン</title></head>
          <body>
            <table>
              <tr class="t_row">
                <td><div class="dack_name"><span class="name">有効な質問</span></div></td>
                <td><div class="date">2024-01-10</div></td>
                <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1"></td>
              </tr>
              <tr class="t_row">
                <td><div class="dack_name"></div></td>
                <td><div class="date">2024-01-20</div></td>
                <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=116&keyword=&tag=-1"></td>
              </tr>
            </table>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.faqs).toHaveLength(1);
      expect(result?.faqs[0].question).toBe('有効な質問');
    });

    it('should skip FAQ entries without link_value input', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>テストカード | カードに関連するＱ＆Ａ | 遊戯王ニューロン</title></head>
          <body>
            <table>
              <tr class="t_row">
                <td><div class="dack_name"><span class="name">有効な質問</span></div></td>
                <td><div class="date">2024-01-10</div></td>
                <td><input type="hidden" class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1"></td>
              </tr>
              <tr class="t_row">
                <td><div class="dack_name"><span class="name">無効な質問（リンクなし）</span></div></td>
                <td><div class="date">2024-01-20</div></td>
              </tr>
            </table>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.faqs).toHaveLength(1);
      expect(result?.faqs[0].faqId).toBe('115');
    });

    it('should handle carriage returns and newlines in supplement info', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>テストカード | カードに関連するＱ＆Ａ | 遊戯王ニューロン</title></head>
          <body>
            <div class="supplement">
              <div class="text" id="supplement">テキスト1<br>テキスト2<br>テキスト3</div>
            </div>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getCardFAQList('1');

      expect(result?.supplementInfo).toContain('テキスト1');
      expect(result?.supplementInfo).toContain('テキスト2');
    });

    it('should use GET method with credentials', async () => {
      const mockHtml = mockFAQListHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await getCardFAQList('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should include correct parameters in API URL', async () => {
      const mockHtml = mockFAQListHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await getCardFAQList('12345');

      const callUrl = mockFetch.mock.calls[0][0];
      if (typeof callUrl === 'string') {
        expect(callUrl).toContain('ope=4');
        expect(callUrl).toContain('cid=12345');
      }
    });
  });

  describe('getFAQDetail', () => {
    const mockFAQDetailHTML = (faqId: string = '115') => `
      <!DOCTYPE html>
      <html>
        <head>
          <title>FAQ詳細 | 遊戯王ニューロン</title>
        </head>
        <body>
          <div id="question_text">
            質問：「<a href="faq_search.action?ope=4&cid=5533">王家の眠る谷－ネクロバレー</a>」の効果について
          </div>
          <div id="answer_text">
            回答：このカードの効果は以下の通りです。<br>
            「<a href="faq_search.action?ope=4&cid=1234">別のカード</a>」と相互作用します。
          </div>
          <div id="tag_update">
            <span class="date">2024-01-15</span>
          </div>
        </body>
      </html>
    `;

    it('should fetch FAQ detail successfully', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result?.faqId).toBe('115');
      expect(result?.question).toBeDefined();
      expect(result?.answer).toBeDefined();
    });

    it('should convert card links to template format', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      // Card links should be converted to {{cardName|cid}} format
      expect(result?.question).toContain('{{');
      expect(result?.question).toContain('|');
      expect(result?.question).toContain('}}');
      expect(result?.answer).toContain('{{');
    });

    it('should extract question correctly', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result?.question).toBeTruthy();
      expect(result?.question?.length).toBeGreaterThan(0);
    });

    it('should extract answer correctly', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result?.answer).toBeTruthy();
      expect(result?.answer?.length).toBeGreaterThan(0);
    });

    it('should extract updated date correctly', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result?.updatedAt).toBe('2024-01-15');
    });

    it('should handle missing answer element gracefully', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <div id="question_text">質問文</div>
            <div id="tag_update"><span class="date">2024-01-15</span></div>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result).toBeDefined();
      expect(result?.answer).toBe('');
    });

    it('should return null when question element not found', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <div id="answer_text">回答文</div>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result).toBeNull();
    });

    it('should return null when API response is not OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      const result = await getFAQDetail('115');

      expect(result).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getFAQDetail('115');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle question that becomes empty after parsing', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <div id="question_text"></div>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result).toBeNull();
    });

    it('should use GET method with credentials', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await getFAQDetail('115');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should include correct parameters in API URL', async () => {
      const mockHtml = mockFAQDetailHTML();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      await getFAQDetail('54321');

      const callUrl = mockFetch.mock.calls[0][0];
      if (typeof callUrl === 'string') {
        expect(callUrl).toContain('ope=5');
        expect(callUrl).toContain('fid=54321');
      }
    });

    it('should handle card links with different card IDs', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <div id="question_text">
              <a href="faq_search.action?ope=4&cid=1000">カード1</a>
              <a href="faq_search.action?ope=4&cid=2000">カード2</a>
            </div>
            <div id="answer_text">
              <a href="faq_search.action?ope=4&cid=3000">カード3</a>
            </div>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      });

      const result = await getFAQDetail('115');

      expect(result?.question).toContain('{{カード1|1000}}');
      expect(result?.question).toContain('{{カード2|2000}}');
      expect(result?.answer).toContain('{{カード3|3000}}');
    });
  });

  describe('Error handling', () => {
    it('getCardFAQList should log error message', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      await getCardFAQList('1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get card FAQ list:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('getFAQDetail should log error message', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      await getFAQDetail('115');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get FAQ detail:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
