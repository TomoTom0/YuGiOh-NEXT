import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  safeQuery,
  safeQueryWithWarn,
  safeQueryAll,
  safeQueryAndRun,
  safeGetAttribute,
  safeGetText,
  safeSetHTML,
  safeSetAttribute,
  safeAddClass,
  safeRemoveClass,
  safeAddEventListener
} from '../safe-dom-query';

describe('safe-dom-query', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // テスト用のコンテナを作成
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // テスト用の HTML を追加
    container.innerHTML = `
      <div id="test-element" class="test-class" data-value="hello">
        <p class="paragraph">Test Content</p>
        <a href="https://example.com" id="test-link">Link</a>
        <span class="item">Item 1</span>
        <span class="item">Item 2</span>
        <span class="item">Item 3</span>
      </div>
    `;
  });

  afterEach(() => {
    // クリーンアップ
    document.body.removeChild(container);
  });

  describe('safeQuery', () => {
    it('should find an element by selector', () => {
      const elem = safeQuery('#test-element');
      expect(elem).not.toBeNull();
      expect(elem?.id).toBe('test-element');
    });

    it('should return null when element is not found', () => {
      const elem = safeQuery('#non-existent');
      expect(elem).toBeNull();
    });

    it('should support parent element parameter', () => {
      const parent = safeQuery('#test-element');
      expect(parent).not.toBeNull();
      const child = safeQuery('.paragraph', parent || undefined);
      expect(child).not.toBeNull();
      expect(child?.textContent).toContain('Test Content');
    });

    it('should default to document when parent is not provided', () => {
      // When parent is not provided, it should search from document
      const elem = safeQuery('.paragraph');
      expect(elem).not.toBeNull();
      expect(elem?.textContent).toContain('Test Content');
    });
  });

  describe('safeQueryWithWarn', () => {
    it('should find an element and not warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const elem = safeQueryWithWarn('#test-element');
      expect(elem).not.toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should warn when element is not found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const elem = safeQueryWithWarn('#non-existent');
      expect(elem).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should use custom error message', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const customMsg = 'Custom error message';
      const elem = safeQueryWithWarn('#non-existent', customMsg);
      expect(elem).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(customMsg);
      consoleSpy.mockRestore();
    });
  });

  describe('safeQueryAll', () => {
    it('should find all matching elements', () => {
      const elements = safeQueryAll('.item');
      expect(elements).toHaveLength(3);
      expect(elements[0].textContent).toBe('Item 1');
      expect(elements[1].textContent).toBe('Item 2');
      expect(elements[2].textContent).toBe('Item 3');
    });

    it('should return empty array when no elements found', () => {
      const elements = safeQueryAll('.non-existent-class');
      expect(elements).toEqual([]);
      expect(Array.isArray(elements)).toBe(true);
    });

    it('should support parent element parameter', () => {
      const parent = safeQuery('#test-element');
      const elements = safeQueryAll('.item', parent || undefined);
      expect(elements).toHaveLength(3);
    });
  });

  describe('safeQueryAndRun', () => {
    it('should call callback when element is found', () => {
      const callback = vi.fn();
      safeQueryAndRun('#test-element', callback);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback.mock.calls[0][0].id).toBe('test-element');
    });

    it('should not call callback when element is not found', () => {
      const callback = vi.fn();
      safeQueryAndRun('#non-existent', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should modify element in callback', () => {
      safeQueryAndRun('#test-element', (elem) => {
        elem.setAttribute('data-modified', 'true');
      });
      const elem = safeQuery('#test-element');
      expect(elem?.getAttribute('data-modified')).toBe('true');
    });
  });

  describe('safeGetAttribute', () => {
    it('should get attribute value', () => {
      const href = safeGetAttribute('#test-link', 'href');
      expect(href).toBe('https://example.com');
    });

    it('should return null when attribute does not exist', () => {
      const value = safeGetAttribute('#test-link', 'non-existent');
      expect(value).toBeNull();
    });

    it('should return null when element does not exist', () => {
      const value = safeGetAttribute('#non-existent', 'href');
      expect(value).toBeNull();
    });

    it('should get data attributes', () => {
      const value = safeGetAttribute('#test-element', 'data-value');
      expect(value).toBe('hello');
    });
  });

  describe('safeGetText', () => {
    it('should get element text content', () => {
      const text = safeGetText('.paragraph');
      expect(text).toBe('Test Content');
    });

    it('should return null when element does not exist', () => {
      const text = safeGetText('#non-existent');
      expect(text).toBeNull();
    });

    it('should trim whitespace', () => {
      const elem = safeQuery('#test-element');
      if (elem) {
        elem.textContent = '   Trimmed   ';
      }
      const text = safeGetText('#test-element');
      expect(text).toBe('Trimmed');
    });
  });

  describe('safeSetHTML', () => {
    it('should set HTML content', () => {
      const success = safeSetHTML('#test-element', '<b>Bold</b>');
      expect(success).toBe(true);
      const elem = safeQuery('#test-element');
      expect(elem?.innerHTML).toContain('<b>Bold</b>');
    });

    it('should return false when element does not exist', () => {
      const success = safeSetHTML('#non-existent', '<p>Content</p>');
      expect(success).toBe(false);
    });
  });

  describe('safeSetAttribute', () => {
    it('should set attribute value', () => {
      const success = safeSetAttribute('#test-element', 'data-new', 'value');
      expect(success).toBe(true);
      const elem = safeQuery('#test-element');
      expect(elem?.getAttribute('data-new')).toBe('value');
    });

    it('should return false when element does not exist', () => {
      const success = safeSetAttribute('#non-existent', 'attr', 'value');
      expect(success).toBe(false);
    });
  });

  describe('safeAddClass', () => {
    it('should add class to element', () => {
      const success = safeAddClass('#test-element', 'new-class');
      expect(success).toBe(true);
      const elem = safeQuery('#test-element');
      expect(elem?.classList.contains('new-class')).toBe(true);
    });

    it('should return false when element does not exist', () => {
      const success = safeAddClass('#non-existent', 'class');
      expect(success).toBe(false);
    });

    it('should keep existing classes', () => {
      safeAddClass('#test-element', 'new-class');
      const elem = safeQuery('#test-element');
      expect(elem?.classList.contains('test-class')).toBe(true);
      expect(elem?.classList.contains('new-class')).toBe(true);
    });
  });

  describe('safeRemoveClass', () => {
    it('should remove class from element', () => {
      const success = safeRemoveClass('#test-element', 'test-class');
      expect(success).toBe(true);
      const elem = safeQuery('#test-element');
      expect(elem?.classList.contains('test-class')).toBe(false);
    });

    it('should return false when element does not exist', () => {
      const success = safeRemoveClass('#non-existent', 'class');
      expect(success).toBe(false);
    });
  });

  describe('safeAddEventListener', () => {
    it('should add click event listener', () => {
      const handler = vi.fn();
      const success = safeAddEventListener('#test-element', 'click', handler);
      expect(success).toBe(true);

      const elem = safeQuery('#test-element');
      elem?.dispatchEvent(new MouseEvent('click'));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should return false when element does not exist', () => {
      const handler = vi.fn();
      const success = safeAddEventListener('#non-existent', 'click', handler);
      expect(success).toBe(false);
    });

    it('should support multiple event types', () => {
      const clickHandler = vi.fn();
      const changeHandler = vi.fn();

      safeAddEventListener('#test-link', 'click', clickHandler);
      const elem = safeQuery('#test-link');
      elem?.dispatchEvent(new MouseEvent('click'));
      expect(clickHandler).toHaveBeenCalledOnce();
    });
  });
});
