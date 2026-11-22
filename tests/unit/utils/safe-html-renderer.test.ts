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
    it('[covers:escape-html.escapes-five-special-chars] HTMLエスケープ文字を正しくエスケープする', () => {
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
    it('[covers:e-safe.coerces-then-escapes] 文字列を安全にエスケープする', () => {
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
    it('[covers:escape-attribute.escapes-quotes-only] ダブルクォートをエスケープする', () => {
      const input = 'This is a "test"';
      const result = escapeAttribute(input);

      expect(result).toBe('This is a &quot;test&quot;');
    });

    it('[covers:escape-attribute.escapes-quotes-only] シングルクォートをエスケープする', () => {
      const input = "It's a test";
      const result = escapeAttribute(input);

      expect(result).toBe('It&#39;s a test');
    });

    it('[covers:escape-attribute.escapes-quotes-only] 両方のクォートをエスケープする', () => {
      const input = `"test" and 'data'`;
      const result = escapeAttribute(input);

      expect(result).toBe('&quot;test&quot; and &#39;data&#39;');
    });

    it('[covers:escape-attribute.does-not-escape-ampersand-or-angle-brackets] アンパサンドや山括弧はエスケープしない（escapeHtmlとの違い）', () => {
      const input = 'a & b < c > d';
      const result = escapeAttribute(input);

      expect(result).toBe('a & b < c > d');
    });
  });

  describe('setSafeInnerHTML', () => {
    it('[covers:set-safe-inner-html.sets-html-verbatim-returns-true] 要素のinnerHTMLを設定できる', () => {
      const element = document.createElement('div');
      const html = '<span>Safe HTML</span>';

      const result = setSafeInnerHTML(element, html);

      expect(result).toBe(true);
      expect(element.innerHTML).toBe('<span>Safe HTML</span>');
    });

    it('[covers:set-safe-inner-html.null-element-returns-false] null要素の場合はfalseを返す', () => {
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
    it('[covers:set-safe-text-content.sets-text-returns-true] 要素のtextContentを設定できる', () => {
      const element = document.createElement('div');
      const text = 'Safe text content';

      const result = setSafeTextContent(element, text);

      expect(result).toBe(true);
      expect(element.textContent).toBe('Safe text content');
    });

    it('[covers:set-safe-text-content.null-element-returns-false] null要素の場合はfalseを返す', () => {
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
      it('[covers:safe-html-builder-div.defaults-when-options-empty] 基本的なdiv要素を構築できる', () => {
        const html = SafeHtmlBuilder.div({
          content: 'Test content',
        });

        expect(html).toBe('<div>Test content</div>');
      });

      it('[covers:safe-html-builder-div.defaults-when-options-empty] オプション未指定の場合は空のdiv要素を返す', () => {
        const html = SafeHtmlBuilder.div({});

        expect(html).toBe('<div></div>');
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

      it('[covers:safe-html-builder-div.attribute-values-escaped-keys-not] 属性値はエスケープされるが属性キーはエスケープされない', () => {
        const html = SafeHtmlBuilder.div({
          attributes: { 'data-id': '123"x' },
        });

        expect(html).toContain('data-id="123&quot;x"');
      });

      it('[covers:safe-html-builder-div.class-not-escaped] classはエスケープされずそのまま埋め込まれる', () => {
        const html = SafeHtmlBuilder.div({
          class: 'x"y',
        });

        expect(html).toContain('class="x"y"');
      });

      it('[covers:safe-html-builder-div.content-not-escaped] contentはエスケープされずそのまま埋め込まれる', () => {
        const html = SafeHtmlBuilder.div({
          content: '<script>alert(1)</script>',
        });

        expect(html).toBe('<div><script>alert(1)</script></div>');
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

      it('[covers:safe-html-builder-span.same-construction-pattern-as-div] クラス名と属性を含むspan要素を構築できる', () => {
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
      it('[covers:safe-html-builder-p.same-construction-pattern-as-div] 基本的なp要素を構築できる', () => {
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

      it('[covers:safe-html-builder-a.class-and-content-not-escaped] クラス名と属性を含むa要素を構築できる', () => {
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

      it('[covers:safe-html-builder-a.href-escaped-via-escape-attribute] URLの属性値をエスケープする', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com/path?q="test"',
          content: 'Link with quotes',
        });

        // ダブルクォートがエスケープされることを確認
        expect(html).toContain('&quot;test&quot;');
      });

      it('[covers:safe-html-builder-a.href-escape-does-not-block-javascript-protocol] javascript:プロトコルのhrefはエスケープされずそのまま生成される', () => {
        const html = SafeHtmlBuilder.a({
          href: 'javascript:alert(1)',
          content: 'Click',
        });

        expect(html).toBe('<a href="javascript:alert(1)">Click</a>');
      });
    });
  });

  describe('checkHTMLSafety', () => {
    it('[covers:check-html-safety.javascript-protocol-detected] javascript:プロトコルを検出する', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('javascript:'))).toBe(true);
    });

    it('[covers:check-html-safety.inline-event-handler-detected] インラインイベントハンドラを検出する', () => {
      const html = '<img src=x onerror="alert(1)">';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('イベントハンドラ'))).toBe(true);
    });

    it('[covers:check-html-safety.script-tag-detected] scriptタグを検出する', () => {
      const html = '<script>alert(1)</script>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<script>'))).toBe(true);
    });

    it('[covers:check-html-safety.iframe-tag-detected] iframeタグを検出する', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<iframe>'))).toBe(true);
    });

    it('[covers:check-html-safety.object-or-embed-tag-detected-same-message] object/embedタグを検出する', () => {
      const html = '<object data="https://evil.com"></object>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<object>') || i.includes('<embed>'))).toBe(true);
    });

    it('[covers:check-html-safety.object-or-embed-tag-detected-same-message] embedタグも<object>/<embed>と同一メッセージで検出する', () => {
      const html = '<embed src="https://evil.com">';
      const issues = checkHTMLSafety(html);

      expect(issues).toEqual(['<object>/<embed> タグが検出されました']);
    });

    it('[covers:check-html-safety.empty-array-when-no-pattern-matches] 安全なHTMLの場合は空配列を返す', () => {
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

    it('[covers:check-html-safety.multiple-patterns-accumulate-in-declaration-order] 複数の危険パターンはhtml内の出現順ではなくdangerousPatterns配列の宣言順で返る', () => {
      // html中はiframeがscriptより先に出現するが、
      // dangerousPatterns配列の宣言順は javascript: -> イベントハンドラ -> script -> iframe -> object/embed
      const html = '<iframe src="https://evil.com"></iframe><script>alert(1)</script>';
      const issues = checkHTMLSafety(html);

      expect(issues).toEqual([
        '<script> タグが検出されました',
        '<iframe> タグが検出されました',
      ]);
    });

    it('大文字小文字を区別しない', () => {
      const html = '<SCRIPT>alert(1)</SCRIPT>';
      const issues = checkHTMLSafety(html);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.includes('<script>'))).toBe(true);
    });
  });

  describe('実世界のXSS防止パターン', () => {
    it('APIデータをescapeHtml + SafeHtmlBuilder + setSafeInnerHTMLで描画しても動的要素は生成されない [covers:xss-integration.stored-data-escaped-via-builder-no-dynamic-element]', () => {
      const apiData = {
        name: 'Product<img src=x onerror="alert(1)">',
        description: 'Test & Demo',
      };
      const container = document.createElement('div');

      const safeHtml = SafeHtmlBuilder.div({
        content: escapeHtml(apiData.name),
      });
      const result = setSafeInnerHTML(container, safeHtml);

      expect(result).toBe(true);
      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toContain('Product');
    });

    it('テンプレートリテラルへの埋め込みでもescapeAttributeが属性境界の突破を防ぐ [covers:xss-integration.attribute-boundary-protected-by-escape-attribute]', () => {
      const userInput = '"><script>alert(1)</script><div class="';
      const safeUrl = escapeAttribute(`/search?q=${userInput}`);
      const html = `<a href="${safeUrl}">Search</a>`;
      const container = document.createElement('div');

      setSafeInnerHTML(container, html);

      expect(container.querySelector('script')).toBeNull();
    });

    it('ユーザー提供のHTML文字列をescapeHtmlで文字列化して描画しても要素は生成されない [covers:xss-integration.user-html-escaped-no-dynamic-element]', () => {
      const userHtml = '<p>Hello</p><img src=x onerror="alert(1)">';
      const container = document.createElement('div');

      setSafeInnerHTML(container, escapeHtml(userHtml));

      expect(container.textContent).toContain('<p>Hello</p>');
      expect(container.querySelector('img')).toBeNull();
    });
  });
});
