import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { detectLanguage } from '../../../src/utils/language-detector';

describe('language-detector', () => {
  describe('#nowlanguage a.current要素から検出', () => {
    it('日本語を検出できる', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="nowlanguage">
              <a class="current" href="?request_locale=ja">日本語</a>
              <a href="?request_locale=en">English</a>
            </div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('ja');
    });

    it('英語を検出できる', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="nowlanguage">
              <a href="?request_locale=ja">日本語</a>
              <a class="current" href="?request_locale=en">English</a>
            </div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('en');
    });
  });

  describe('#nowlanguage要素のテキストから検出', () => {
    it('韓国語を検出できる（a.currentなし）', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="nowlanguage">한글</div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('ko');
    });
  });

  describe('meta og:urlから検出', () => {
    it('meta og:urlのrequest_localeパラメータから検出できる', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=de" />
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('de');
    });
  });

  describe('URLパラメータから検出', () => {
    it('URLのrequest_localeパラメータから検出できる', () => {
      const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
      const dom = new JSDOM(html, {
        url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=fr'
      });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('fr');
    });
  });

  describe('html lang属性から検出', () => {
    it('html要素のlang属性から検出できる', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="es-ES">
          <head></head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('es');
    });
  });

  describe('デフォルト値', () => {
    it('検出できない場合は日本語を返す', () => {
      const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('ja');
    });
  });

  describe('優先順位', () => {
    it('#nowlanguage a.current > meta og:url', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=de" />
          </head>
          <body>
            <div id="nowlanguage">
              <a class="current" href="?request_locale=en">English</a>
            </div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('en');
    });

    it('meta og:url > URLパラメータ', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=it" />
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, {
        url: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=pt'
      });
      const doc = dom.window.document as unknown as Document;

      const result = detectLanguage(doc);
      expect(result).toBe('it');
    });
  });
});
