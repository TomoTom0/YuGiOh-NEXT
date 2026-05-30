import { describe, it, expect, beforeEach } from 'vitest';
import {
  escapeHtml,
  eSafe,
  escapeAttribute,
  setSafeInnerHTML,
  setSafeTextContent,
  SafeHtmlBuilder,
  checkHTMLSafety,
} from '../safe-html-renderer';

describe('safe-html-renderer', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape all special characters', () => {
      expect(escapeHtml('<div>"test" & \'value\'</div>')).toBe(
        '&lt;div&gt;&quot;test&quot; &amp; &#39;value&#39;&lt;/div&gt;'
      );
    });

    it('should not escape normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('eSafe', () => {
    it('should escape and convert to string', () => {
      expect(eSafe('<img src=x onerror="alert(1)">')).toBe(
        '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
      );
    });

    it('should handle numbers', () => {
      expect(eSafe(123)).toBe('123');
    });

    it('should handle null and undefined', () => {
      expect(eSafe(null)).toBe('null');
      expect(eSafe(undefined)).toBe('undefined');
    });
  });

  describe('escapeAttribute', () => {
    it('should escape quotes in attribute values', () => {
      expect(escapeAttribute('test"value')).toBe('test&quot;value');
    });

    it('should escape single quotes', () => {
      expect(escapeAttribute("test'value")).toBe('test&#39;value');
    });

    it('should escape both quotes', () => {
      expect(escapeAttribute('test"and\'mixed')).toBe(
        'test&quot;and&#39;mixed'
      );
    });

    it('should handle normal URLs', () => {
      expect(escapeAttribute('https://example.com')).toBe(
        'https://example.com'
      );
    });
  });

  describe('setSafeInnerHTML', () => {
    it('should set innerHTML on valid element', () => {
      const result = setSafeInnerHTML(container, '<p>Hello</p>');
      expect(result).toBe(true);
      expect(container.innerHTML).toBe('<p>Hello</p>');
    });

    it('should return false for null element', () => {
      const result = setSafeInnerHTML(null, '<p>Hello</p>');
      expect(result).toBe(false);
    });

    it('should set escaped HTML safely', () => {
      const html = SafeHtmlBuilder.div({
        content: escapeHtml('User <script>alert(1)</script>'),
      });
      setSafeInnerHTML(container, html);
      expect(container.textContent).toContain('<script>');
      expect(container.querySelector('script')).toBeNull();
    });
  });

  describe('setSafeTextContent', () => {
    it('should set textContent on valid element', () => {
      const result = setSafeTextContent(container, 'Hello World');
      expect(result).toBe(true);
      expect(container.textContent).toBe('Hello World');
    });

    it('should return false for null element', () => {
      const result = setSafeTextContent(null, 'Hello');
      expect(result).toBe(false);
    });

    it('should automatically escape HTML in textContent', () => {
      setSafeTextContent(container, '<script>alert(1)</script>');
      expect(container.textContent).toBe('<script>alert(1)</script>');
      expect(container.querySelector('script')).toBeNull();
    });

    it('should handle special characters', () => {
      setSafeTextContent(container, 'A & B <> "quotes"');
      expect(container.textContent).toBe('A & B <> "quotes"');
    });
  });

  describe('SafeHtmlBuilder', () => {
    describe('div', () => {
      it('should build simple div', () => {
        const html = SafeHtmlBuilder.div({ content: 'Hello' });
        expect(html).toBe('<div>Hello</div>');
      });

      it('should include class attribute', () => {
        const html = SafeHtmlBuilder.div({
          class: 'my-class',
          content: 'Hello',
        });
        expect(html).toContain('class="my-class"');
      });

      it('should escape content', () => {
        const html = SafeHtmlBuilder.div({
          content: escapeHtml('<script>alert(1)</script>'),
        });
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
      });

      it('should escape attribute values', () => {
        const html = SafeHtmlBuilder.div({
          attributes: { 'data-value': 'test"value' },
          content: 'Hello',
        });
        expect(html).toContain('data-value="test&quot;value"');
      });

      it('should combine multiple attributes', () => {
        const html = SafeHtmlBuilder.div({
          class: 'box',
          attributes: { id: 'my-id', 'data-test': 'value' },
          content: 'Content',
        });
        expect(html).toContain('class="box"');
        expect(html).toContain('id="my-id"');
        expect(html).toContain('data-test="value"');
      });
    });

    describe('span', () => {
      it('should build span element', () => {
        const html = SafeHtmlBuilder.span({ content: 'Badge' });
        expect(html).toBe('<span>Badge</span>');
      });

      it('should escape span content', () => {
        const html = SafeHtmlBuilder.span({
          content: escapeHtml('<img src=x>'),
        });
        expect(html).toContain('&lt;img');
      });
    });

    describe('p', () => {
      it('should build paragraph element', () => {
        const html = SafeHtmlBuilder.p({ content: 'Paragraph text' });
        expect(html).toBe('<p>Paragraph text</p>');
      });
    });

    describe('a', () => {
      it('should build anchor with href', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com',
          content: 'Link',
        });
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('>Link<');
      });

      it('should escape href attribute', () => {
        const html = SafeHtmlBuilder.a({
          href: 'javascript:alert(1)',
          content: 'Dangerous',
        });
        expect(html).toContain('href="javascript:alert(1)"');
        // Note: escapeAttribute doesn't remove protocol, that's a content validation issue
      });

      it('should escape link text', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com',
          content: escapeHtml('<img src=x>'),
        });
        expect(html).toContain('&lt;img');
      });

      it('should support class and attributes', () => {
        const html = SafeHtmlBuilder.a({
          href: 'https://example.com',
          class: 'external-link',
          attributes: { target: '_blank' },
          content: 'External',
        });
        expect(html).toContain('class="external-link"');
        expect(html).toContain('target="_blank"');
      });
    });
  });

  describe('checkHTMLSafety', () => {
    it('should detect javascript: protocol', () => {
      const issues = checkHTMLSafety('<a href="javascript:alert(1)">Click</a>');
      expect(issues).toContain('javascript: プロトコルが検出されました');
    });

    it('should detect inline event handlers', () => {
      const issues = checkHTMLSafety(
        '<img src=x onerror="alert(1)">'
      );
      expect(issues).toContain('インラインイベントハンドラが検出されました');
    });

    it('should detect script tags', () => {
      const issues = checkHTMLSafety('<script>alert(1)</script>');
      expect(issues).toContain('<script> タグが検出されました');
    });

    it('should detect iframe tags', () => {
      const issues = checkHTMLSafety('<iframe src="evil.com"></iframe>');
      expect(issues).toContain('<iframe> タグが検出されました');
    });

    it('should detect object/embed tags', () => {
      const issues = checkHTMLSafety('<object data="evil.swf"></object>');
      expect(issues).toContain('<object>/<embed> タグが検出されました');
    });

    it('should allow safe HTML', () => {
      const issues = checkHTMLSafety(
        '<div class="card"><p>Safe content</p></div>'
      );
      expect(issues).toHaveLength(0);
    });

    it('should detect multiple issues', () => {
      const html = '<div onclick="alert(1)"><script>x</script></div>';
      const issues = checkHTMLSafety(html);
      expect(issues.length).toBeGreaterThan(1);
    });
  });

  describe('Real-world XSS prevention examples', () => {
    it('should prevent stored XSS from API data', () => {
      const apiData = {
        name: 'Product<img src=x onerror="alert(1)">',
        description: 'Test & Demo',
      };

      // Unsafe approach (DON'T use this)
      // element.innerHTML = `<h1>${apiData.name}</h1>`;

      // Safe approach
      const safeHtml = SafeHtmlBuilder.div({
        content: escapeHtml(apiData.name),
      });
      setSafeInnerHTML(container, safeHtml);

      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toContain('Product');
    });

    it('should prevent DOM-based XSS in template literals', () => {
      const userInput = '"><script>alert(1)</script><div class="';
      const safeUrl = escapeAttribute(`/search?q=${userInput}`);
      const html = `<a href="${safeUrl}">Search</a>`;

      setSafeInnerHTML(container, html);
      expect(container.querySelector('script')).toBeNull();
    });

    it('should safely render user-provided HTML by escaping', () => {
      const userHtml = '<p>Hello</p><img src=x onerror="alert(1)">';
      const safeHtml = escapeHtml(userHtml);

      setSafeInnerHTML(container, safeHtml);
      expect(container.textContent).toContain('<p>Hello</p>');
      expect(container.querySelector('img')).toBeNull();
    });
  });
});
