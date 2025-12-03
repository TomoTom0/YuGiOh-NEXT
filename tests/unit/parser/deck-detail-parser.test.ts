import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractDeckNameFromMeta,
  extractDnoFromPage,
  extractCgidFromPage,
  extractDeckCode,
  extractComment,
  extractDeckStyle
} from '../../../src/content/parser/deck-detail-parser';
import { JSDOM } from 'jsdom';

describe('deck-detail-parser', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = window.document;
  });

  describe('extractDeckNameFromMeta', () => {
    it('description metaタグからデッキ名を抽出する', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="完全版テスト成功 / 説明" />
          </head>
          <body></body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('完全版テスト成功');
    });

    it('og:description metaタグからデッキ名を抽出する', () => {
      const html = `
        <html>
          <head>
            <meta property="og:description" content="テストデッキ | 遊戯王ニューロン" />
          </head>
          <body></body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('テストデッキ');
    });

    it('metaタグがない場合はデフォルト値を返す', () => {
      doc.documentElement.innerHTML = '<html><head></head><body></body></html>';

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('デッキ');
    });

    it('空の description は og:description にフォールバックする', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="" />
            <meta property="og:description" content="フォールバックデッキ | 説明" />
          </head>
          <body></body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckNameFromMeta(doc);
      expect(result).toBe('フォールバックデッキ');
    });
  });

  describe('extractDnoFromPage', () => {
    it('JavaScriptコードからデッキ番号を抽出する', () => {
      const html = `
        <html>
          <body>
            <script>
              $('#dno').val('456')
            </script>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(456);
    });

    it('URLパラメータからデッキ番号を抽出する', () => {
      const html = `
        <html>
          <body>
            <script>
              window.location = 'https://example.com?dno=789'
            </script>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDnoFromPage(doc);
      expect(result).toBe(789);
    });

    it('デッキ番号がない場合は0を返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = extractDnoFromPage(doc);
      expect(result).toBe(0);
    });
  });

  describe('extractCgidFromPage', () => {
    it('HTMLからcgid値を抽出する', () => {
      const html = `
        <html>
          <body>
            <a href="?cgid=abc123def456">デッキを表示</a>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBe('abc123def456');
    });

    it('cgidがない場合はundefinedを返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = extractCgidFromPage(doc);
      expect(result).toBeUndefined();
    });

    it('複数のcgidがある場合は最初の1つを返す', () => {
      const html = `
        <html>
          <body>
            <!-- cgidは16進数で表現される -->
            cgid=abc123def456
            cgid=xyz789
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractCgidFromPage(doc);
      expect(result).toBe('abc123def456');
    });
  });

  describe('extractComment', () => {
    it('コメント欄から説明テキストを抽出する', () => {
      const html = `
        <html>
          <body>
            <dt><span>コメント</span></dt>
            <dd class="text_set">
              <span class="biko">これはテストコメントです</span>
            </dd>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toBe('これはテストコメントです');
    });

    it('コメント欄が空の場合は空文字列を返す', () => {
      const html = `
        <html>
          <body>
            <dt><span>コメント</span></dt>
            <dd class="text_set">
              <span class="biko"></span>
            </dd>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractComment(doc);
      expect(result).toBe('');
    });

    it('コメント欄がない場合は空文字列を返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = extractComment(doc);
      expect(result).toBe('');
    });
  });

  describe('extractDeckCode', () => {
    it('デッキコード欄からコードを抽出する', () => {
      const html = `
        <html>
          <body>
            <dt><span>デッキコード</span></dt>
            <dd class="a_set">ABCD1234EFGH5678</dd>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('ABCD1234EFGH5678');
    });

    it('「デッキコードを発行」ボタンのテキストは除外される', () => {
      const html = `
        <html>
          <body>
            <dt><span>デッキコード</span></dt>
            <dd class="a_set">
              デッキコードを発行
            </dd>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckCode(doc);
      expect(result).toBe('');
    });

    it('デッキコード欄がない場合は空文字列を返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = extractDeckCode(doc);
      expect(result).toBe('');
    });
  });

  describe('extractDeckStyle', () => {
    it('デッキスタイルがない場合はundefinedを返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = extractDeckStyle(doc);
      expect(result).toBeUndefined();
    });

    it('DL要素がない場合はundefinedを返す', () => {
      const html = `
        <html>
          <body>
            <div>
              <span>デッキスタイル</span>
            </div>
          </body>
        </html>
      `;
      doc.documentElement.innerHTML = html;

      const result = extractDeckStyle(doc);
      expect(result).toBeUndefined();
    });
  });
});
