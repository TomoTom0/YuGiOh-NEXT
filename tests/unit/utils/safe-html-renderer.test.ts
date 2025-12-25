import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  eSafe,
  escapeAttribute,
  setSafeInnerHTML,
  setSafeTextContent,
  SafeHtmlBuilder,
  checkHTMLSafety,
} from '@/utils/safe-html-renderer';

describe('safe-html-renderer', () => {
  describe('escapeHtml', () => {
    it('HTMLエスケープ文字を正しくエスケープする', () => {
      const input = '<script>alert("XSS")</script>';
      const result = escapeHtml(input);

      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('アンパサンドをエスケープする', () => {
      const input = 'Tom & Jerry';
      const result = escapeHtml(input);

      expect(result).toBe('Tom &amp; Jerry');
    });

    it('シングルクォートをエスケープする', () => {
      const input = "It's a test";
      const result = escapeHtml(input);

      expect(result).toBe('It&#39;s a test');
    });

    it('すべての特殊文字を同時にエスケープする', () => {
      const input = `<div class="test" data-value='test & "data"'>Content</div>`;
      const result = escapeHtml(input);

      expect(result).toBe(
        '&lt;div class=&quot;test&quot; data-value=&#39;test &amp; &quot;data&quot;&#39;&gt;Content&lt;/div&gt;'
      );
    });

    it('通常のテキストはそのまま返す', () => {
      const input = 'Normal text without special characters';
      const result = escapeHtml(input);

      expect(result).toBe('Normal text without special characters');
    });

    it('空文字列を処理できる', () => {
      const input = '';
      const result = escapeHtml(input);

      expect(result).toBe('');
    });
  });

  describe('eSafe', () => {
    it('文字列を安全にエスケープする', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = eSafe(input);

      expect(result).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('数値を文字列に変換してエスケープする', () => {
      const input = 12345;
      const result = eSafe(input);

      expect(result).toBe('12345');
    });

    it('nullやundefinedを文字列に変換する', () => {
      expect(eSafe(null)).toBe('null');
      expect(eSafe(undefined)).toBe('undefined');
    });

    it('オブジェクトを文字列に変換する', () => {
      const input = { key: 'value' };
      const result = eSafe(input);

      expect(result).toBe('[object Object]');
    });
  });

  describe('escapeAttribute', () => {
    it('ダブルクォートをエスケープする', () => {
      const input = 'This is a "test"';
      const result = escapeAttribute(input);

      expect(result).toBe('This is a &quot;test&quot;');
    });

    it('シングルクォートをエスケープする', () => {
      const input = "It's a test";
      const result = escapeAttribute(input);

      expect(result).toBe('It&#39;s a test');
    });

    it('両方のクォートをエスケープする', () => {
      const input = `"test" and 'data'`;
      const result = escapeAttribute(input);

      expect(result).toBe('&quot;test&quot; and &#39;data&#39;');
    });
  });

  describe('setSafeInnerHTML', () => {
    it('要素のinnerHTMLを設定できる', () => {
      const element = document.createElement('div');
      const html = '<span>Safe HTML</span>';

      const result = setSafeInnerHTML(element, html);

      expect(result).toBe(true);
      expect(element.innerHTML).toBe('<span>Safe HTML</span>');
    });

    it('null要素の場合はfalseを返す', () => {
      const result = setSafeInnerHTML(null, '<span>Test</span>');

      expect(result).toBe(false);
    });

    it('エスケープされたHTMLを設定できる', () => {
      const element = document.createElement('div');
      const escapedHtml = escapeHtml('<script>alert(1)</script>');

      setSafeInnerHTML(element, escapedHtml);

      expect(element.textContent).toBe('<script>alert(1)</script>');
    });
  });

  describe('setSafeTextContent', () => {
    it('要素のtextContentを設定できる', () => {
      const element = document.createElement('div');
      const text = 'Safe text content';

      const result = setSafeTextContent(element, text);

      expect(result).toBe(true);
      expect(element.textContent).toBe('Safe text content');
    });

    it('null要素の場合はfalseを返す', () => {
      const result = setSafeTextContent(null, 'Test');

      expect(result).toBe(false);
    });

    it('HTMLタグを含むテキストも安全に設定できる', () => {
      const element = document.createElement('div');
      const text = '<script>alert(1)</script>';

      setSafeTextContent(element, text);

      expect(element.textContent).toBe('<script>alert(1)</script>');
      expect(element.innerHTML).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('SafeHtmlBuilder', () => {
    describe('div', () => {
      it('基本的なdiv要素を構築できる', () => {
        const html = SafeHtmlBuilder.div({
          content: 'Test content',
        });

        expect(html).toBe('<div>Test content</div>');
      });

      it('クラス名を含むdiv要素を構築できる', () => {
        const html = SafeHtmlBuilder.div({
          class: 'test-class',
          content: 'Test content',
        });

        expect(html).toBe('<div class="test-class">Test content</div>');
      });

      it('属性を含むdiv要素を構築できる', () => {
        const html = SafeHtmlBuilder.div({
          attributes: { 'data-id': '123', 'data-type': 'test' },
          content: 'Test content',
        });

        expect(html).toBe('<div data-id="123" data-type="test">Test content</div>');
      });

      it('すべてのオプションを含むdiv要素を構築できる', () => {
        const html = SafeHtmlBuilder.div({
          class: 'test-class',
          attributes: { 'data-id': '123' },
          content: escapeHtml('<script>alert(1)</script>'),
        });

        expect(html).toContain('class="test-class"');
        expect(html).toContain('data-id="123"');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      });
    });

    describe('span', () => {
      it('基本的なspan要素を構築できる', () => {
        const html = SafeHtmlBuilder.span({
          content: 'Test content',
        });

        expect(html).toBe('<span>Test content</span>');
      });

      it('クラス名と属性を含むspan要素を構築できる', () => {
        const html = SafeHtmlBuilder.span({
          class: 'highlight',
          attributes: { 'data-value': '100' },
          content: 'Highlighted text',
        });

        expect(html).toContain('class="highlight"');
        expect(html).toContain('data-value="100"');
        expect(html).toContain('Highlighted text');
      });
    });

    describe('p', () => {
      it('基本的なp要素を構築できる', () => {
        const html = SafeHtmlBuilder.p({
          content: 'Paragraph content',
        });

        expect(html).toBe('<p>Paragraph content</p>');
      });
    });

    describe('a', () => {
      it('基本的なa要素を構築できる', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com',
          content: 'Link text',
        });

        expect(html).toBe('<a href="https://example.com">Link text</a>');
      });

      it('クラス名と属性を含むa要素を構築できる', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com',
          class: 'external-link',
          attributes: { target: '_blank', rel: 'noopener' },
          content: 'External link',
        });

        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('class="external-link"');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener"');
        expect(html).toContain('External link');
      });

      it('URLの属性値をエスケープする', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com/path?q="test"',
          content: 'Link with quotes',
        });

        // ダブルクォートがエスケープされることを確認
        expect(html).toContain('&quot;test&quot;');
      });
    });
  });

  describe('checkHTMLSafety', () => {
    it('javascript:プロトコルを検出する', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('javascript:'))).toBe(true);
    });

    it('インラインイベントハンドラを検出する', () => {
      const html = '<img src=x onerror="alert(1)">';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('イベントハンドラ'))).toBe(true);
    });

    it('scriptタグを検出する', () => {
      const html = '<script>alert(1)</script>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<script>'))).toBe(true);
    });

    it('iframeタグを検出する', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<iframe>'))).toBe(true);
    });

    it('object/embedタグを検出する', () => {
      const html = '<object data="https://evil.com"></object>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<object>') || i.includes('<embed>'))).toBe(true);
    });

    it('安全なHTMLの場合は空配列を返す', () => {
      const html = '<div class="safe">Safe content</div>';
      const issues = checkHTMLSafety(html);

      expect(issues).toEqual([]);
    });

    it('複数の危険なパターンを検出する', () => {
      const html = `
        <script>alert(1)</script>
        <img src=x onerror="alert(2)">
        <a href="javascript:alert(3)">Click</a>
      `;
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    it('大文字小文字を区別しない', () => {
      const html = '<SCRIPT>alert(1)</SCRIPT>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<script>'))).toBe(true);
    });
  });
});
