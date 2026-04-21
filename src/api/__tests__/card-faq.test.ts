import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCardFAQList, getFAQDetail } from '../card-faq';

// fetch APIをモック
global.fetch = vi.fn();

// DOMParserをモック
global.DOMParser = class MockDOMParser {
  parseFromString(htmlString: string, mimeType: string): Document {
    const parser = new (require('happy-dom').Window)().document;
    const doc = parser.implementation.createHTMLDocument();
    doc.documentElement.innerHTML = htmlString;
    return doc as unknown as Document;
  }
} as any;

describe('card-faq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCardFAQList', () => {
    // SKIP: HTML parsing requires integration test with real DOM
    it.skip('should return FAQ list for valid card ID', async () => {
      const mockHTML = `
        <html>
          <head><title>ブラック・マジシャン | カードに関連するＱ＆Ａ</title></head>
          <body>
            <div class="supplement">
              <div class="title"><span class="name" id="supplement">補足情報</span></div>
              <div class="text" id="supplement">補足テキスト</div>
            </div>
            <div class="t_row">
              <div class="dack_name"><span class="name">質問1</span></div>
              <input class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=123" />
              <div class="div date">2023-01-01</div>
            </div>
            <div class="t_row">
              <div class="dack_name"><span class="name">質問2</span></div>
              <input class="link_value" value="/yugiohdb/faq_search.action?ope=5&fid=456" />
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHTML
      } as Response);

      const result = await getCardFAQList('4335');

      expect(result).toBeDefined();
      expect(result?.cardName).toBe('ブラック・マジシャン');
      expect(result?.faqs).toHaveLength(2);
      expect(result?.faqs[0].faqId).toBe('123');
      expect(result?.faqs[0].question).toBe('質問1');
      expect(result?.faqs[1].faqId).toBe('456');
    });

    it('should return null for failed fetch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      const result = await getCardFAQList('99999');

      expect(result).toBeNull();
    });

    it('should return null for fetch error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await getCardFAQList('4335');

      expect(result).toBeNull();
    });

    // SKIP: HTML parsing requires integration test
    it.skip('should handle HTML without FAQs', async () => {
      const mockHTML = `
        <html>
          <head><title>カード名 | カードに関連するＱ＆Ａ</title></head>
          <body>
            <div class="no_faq">該当するQ&Aはありません</div>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHTML
      } as Response);

      const result = await getCardFAQList('12345');

      expect(result).toBeDefined();
      expect(result?.cardName).toBe('カード名');
      expect(result?.faqs).toHaveLength(0);
    });
  });

  describe('getFAQDetail', () => {
    // SKIP: HTML parsing requires integration test
    it.skip('should return FAQ detail for valid FAQ ID', async () => {
      const mockHTML = `
        <html>
          <head><title>詳細Q&A</title></head>
          <body>
            <div class="card_name">ブラック・マジシャン</div>
            <div class="t_row">
              <div class="ques">
                <div class="inner">質問内容がここに入ります</div>
              </div>
              <div class="ans">
                <div class="inner">回答内容がここに入ります</div>
              </div>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHTML
      } as Response);

      const result = await getFAQDetail('123');

      expect(result).toBeDefined();
      expect(result?.cardName).toBe('ブラック・マジシャン');
      expect(result?.question).toContain('質問内容');
      expect(result?.answer).toContain('回答内容');
    });

    it('should return null for failed fetch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      const result = await getFAQDetail('99999');

      expect(result).toBeNull();
    });

    it('should return null for fetch error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await getFAQDetail('123');

      expect(result).toBeNull();
    });

    // SKIP: HTML parsing requires integration test
    it.skip('should handle HTML with missing elements', async () => {
      const mockHTML = `
        <html>
          <head><title>Q&A</title></head>
          <body>
            <div class="card_name">カード名</div>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHTML
      } as Response);

      const result = await getFAQDetail('123');

      // パーサーがundefined/nullを返す可能性があるが、関数はそれを処理できるべき
      expect(result?.cardName).toBe('カード名');
    });
  });
});
