import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  safeAddEventListener,
} from '../../../src/utils/safe-dom-query';

describe('safe-dom-query', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('safeQuery', () => {
    it('要素が存在する場合、その要素を返す [covers:safe_query.found_returns_element]', () => {
      document.body.innerHTML = '<div id="test">Test</div>';
      const element = safeQuery('#test');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('test');
    });

    it('要素が存在しない場合、nullを返す [covers:safe_query.not_found_returns_null]', () => {
      const element = safeQuery('#not-found');
      expect(element).toBeNull();
    });

    it('親要素を指定できる [covers:safe_query.uses_parent_when_truthy]', () => {
      document.body.innerHTML = '<span class="child" id="outside">Outside</span><div id="parent"><span class="child" id="inside">Child</span></div>';
      const parent = document.getElementById('parent');
      const child = safeQuery('.child', parent!);
      expect(child).not.toBeNull();
      expect(child?.id).toBe('inside');
    });

    it('型パラメータで返り値の型を指定できる', () => {
      document.body.innerHTML = '<input id="input-test" />';
      const input = safeQuery<HTMLInputElement>('#input-test');
      expect(input).not.toBeNull();
      if (input) {
        expect(input.tagName).toBe('INPUT');
      }
    });
  });

  describe('safeQueryWithWarn', () => {
    it('要素が存在する場合、警告を出さずに要素を返す [covers:safe_query_warn.found_no_warn]', () => {
      document.body.innerHTML = '<div id="test">Test</div>';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#test');

      expect(element).not.toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('要素が存在しない場合、デフォルトの警告を出す [covers:safe_query_warn.missing_default_warn]', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#not-found');

      expect(element).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[safeQueryWithWarn] Element not found: "#not-found"'
      );

      warnSpy.mockRestore();
    });

    it('要素が存在しない場合、カスタムエラーメッセージを出す [covers:safe_query_warn.missing_custom_warn]', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#not-found', 'Custom error message');

      expect(element).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('Custom error message');

      warnSpy.mockRestore();
    });

    it('空文字列のエラーメッセージはデフォルト警告にフォールバックする [covers:safe_query_warn.falsy_message_uses_default]', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#not-found', '');

      expect(element).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[safeQueryWithWarn] Element not found: "#not-found"'
      );

      warnSpy.mockRestore();
    });

    it('親要素を指定できる [covers:safe_query_warn.uses_parent_when_truthy]', () => {
      document.body.innerHTML = '<div id="parent"><span id="child">Child</span></div>';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const parent = document.getElementById('parent');
      const child = safeQueryWithWarn('#child', undefined, parent!);

      expect(child).not.toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('safeQueryAll', () => {
    it('複数の要素を配列で返す [covers:safe_query_all.matches_array]', () => {
      document.body.innerHTML = `
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
      `;
      const elements = safeQueryAll('.item');
      expect(elements).toHaveLength(3);
      expect(elements[0].textContent).toBe('1');
      expect(elements[1].textContent).toBe('2');
      expect(elements[2].textContent).toBe('3');
    });

    it('要素が存在しない場合、空配列を返す [covers:safe_query_all.no_matches_empty_array]', () => {
      const elements = safeQueryAll('.not-found');
      expect(elements).toEqual([]);
      expect(elements).toHaveLength(0);
    });

    it('親要素を指定できる [covers:safe_query_all.uses_parent_when_truthy]', () => {
      document.body.innerHTML = `
        <div id="parent">
          <span class="child">Child 1</span>
          <span class="child">Child 2</span>
        </div>
        <span class="child">Child 3</span>
      `;
      const parent = document.getElementById('parent');
      const children = safeQueryAll('.child', parent!);
      expect(children).toHaveLength(2);
    });

    it('型パラメータで返り値の型を指定できる', () => {
      document.body.innerHTML = `
        <input class="input-item" />
        <input class="input-item" />
      `;
      const inputs = safeQueryAll<HTMLInputElement>('.input-item');
      expect(inputs).toHaveLength(2);
      inputs.forEach(input => {
        expect(input.tagName).toBe('INPUT');
      });
    });
  });

  describe('safeQueryAndRun', () => {
    it('要素が存在する場合、コールバックを実行する [covers:safe_query_run.found_runs_callback]', () => {
      document.body.innerHTML = '<div id="test">Initial</div>';

      safeQueryAndRun('#test', (elem) => {
        elem.textContent = 'Updated';
      });

      expect(document.getElementById('test')?.textContent).toBe('Updated');
    });

    it('要素が存在しない場合、コールバックを実行しない [covers:safe_query_run.not_found_skips_callback]', () => {
      const callback = vi.fn();

      safeQueryAndRun('#not-found', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><span id="child">Child</span></div>';
      const parent = document.getElementById('parent');

      safeQueryAndRun('#child', (elem) => {
        elem.textContent = 'Modified';
      }, parent!);

      expect(document.getElementById('child')?.textContent).toBe('Modified');
    });
  });

  describe('safeGetAttribute', () => {
    it('属性が存在する場合、その値を返す [covers:safe_get_attribute.present_returns_value]', () => {
      document.body.innerHTML = '<a id="link" href="https://example.com">Link</a>';
      const href = safeGetAttribute('#link', 'href');
      expect(href).toBe('https://example.com');
    });

    it('属性が存在しない場合、nullを返す [covers:safe_get_attribute.attribute_missing_returns_null]', () => {
      document.body.innerHTML = '<div id="div">Div</div>';
      const href = safeGetAttribute('#div', 'href');
      expect(href).toBeNull();
    });

    it('要素が存在しない場合、nullを返す [covers:safe_get_attribute.element_missing_returns_null]', () => {
      const href = safeGetAttribute('#not-found', 'href');
      expect(href).toBeNull();
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><img id="img" src="image.png" /></div>';
      const parent = document.getElementById('parent');
      const src = safeGetAttribute('#img', 'src', parent!);
      expect(src).toBe('image.png');
    });
  });

  describe('safeGetText', () => {
    it('textContentを返す [covers:safe_get_text.present_returns_trimmed_text]', () => {
      document.body.innerHTML = '<div id="test">Hello World</div>';
      const text = safeGetText('#test');
      expect(text).toBe('Hello World');
    });

    it('前後の空白をトリムする [covers:safe_get_text.present_returns_trimmed_text]', () => {
      document.body.innerHTML = '<div id="test">  Trimmed  </div>';
      const text = safeGetText('#test');
      expect(text).toBe('Trimmed');
    });

    it('要素が存在しない場合、nullを返す [covers:safe_get_text.element_missing_returns_null]', () => {
      const text = safeGetText('#not-found');
      expect(text).toBeNull();
    });

    it('空のtextContentの場合、空文字列を返す [covers:safe_get_text.empty_text_returns_empty_string]', () => {
      document.body.innerHTML = '<div id="test"></div>';
      const text = safeGetText('#test');
      expect(text).toBe('');
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><span id="child">Child Text</span></div>';
      const parent = document.getElementById('parent');
      const text = safeGetText('#child', parent!);
      expect(text).toBe('Child Text');
    });
  });

  describe('safeSetHTML', () => {
    it('要素が存在する場合、HTMLを設定してtrueを返す [covers:safe_set_html.found_sets_inner_html_true]', () => {
      document.body.innerHTML = '<div id="container">Old</div>';
      const result = safeSetHTML('#container', '<p>New Content</p>');

      expect(result).toBe(true);
      expect(document.getElementById('container')?.innerHTML).toBe('<p>New Content</p>');
    });

    it('要素が存在しない場合、falseを返す [covers:safe_set_html.element_missing_false]', () => {
      const result = safeSetHTML('#not-found', '<p>Content</p>');
      expect(result).toBe(false);
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><div id="child">Old</div></div>';
      const parent = document.getElementById('parent');
      const result = safeSetHTML('#child', '<span>New</span>', parent!);

      expect(result).toBe(true);
      expect(document.getElementById('child')?.innerHTML).toBe('<span>New</span>');
    });
  });

  describe('safeSetAttribute', () => {
    it('要素が存在する場合、属性を設定してtrueを返す [covers:safe_set_attribute.found_sets_attribute_true]', () => {
      document.body.innerHTML = '<a id="link">Link</a>';
      const result = safeSetAttribute('#link', 'href', 'https://example.com');

      expect(result).toBe(true);
      expect(document.getElementById('link')?.getAttribute('href')).toBe('https://example.com');
    });

    it('要素が存在しない場合、falseを返す [covers:safe_set_attribute.element_missing_false]', () => {
      const result = safeSetAttribute('#not-found', 'href', 'https://example.com');
      expect(result).toBe(false);
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><img id="img" /></div>';
      const parent = document.getElementById('parent');
      const result = safeSetAttribute('#img', 'src', 'image.png', parent!);

      expect(result).toBe(true);
      expect(document.getElementById('img')?.getAttribute('src')).toBe('image.png');
    });
  });

  describe('safeAddClass', () => {
    it('要素が存在する場合、クラスを追加してtrueを返す [covers:safe_add_class.found_adds_class_true]', () => {
      document.body.innerHTML = '<div id="btn">Button</div>';
      const result = safeAddClass('#btn', 'active');

      expect(result).toBe(true);
      expect(document.getElementById('btn')?.classList.contains('active')).toBe(true);
    });

    it('要素が存在しない場合、falseを返す [covers:safe_add_class.element_missing_false]', () => {
      const result = safeAddClass('#not-found', 'active');
      expect(result).toBe(false);
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><div id="child">Child</div></div>';
      const parent = document.getElementById('parent');
      const result = safeAddClass('#child', 'highlight', parent!);

      expect(result).toBe(true);
      expect(document.getElementById('child')?.classList.contains('highlight')).toBe(true);
    });
  });

  describe('safeRemoveClass', () => {
    it('要素が存在する場合、クラスを削除してtrueを返す [covers:safe_remove_class.found_removes_class_true]', () => {
      document.body.innerHTML = '<div id="btn" class="active highlight">Button</div>';
      const result = safeRemoveClass('#btn', 'active');

      expect(result).toBe(true);
      expect(document.getElementById('btn')?.classList.contains('active')).toBe(false);
      expect(document.getElementById('btn')?.classList.contains('highlight')).toBe(true);
    });

    it('要素が存在しない場合、falseを返す [covers:safe_remove_class.element_missing_false]', () => {
      const result = safeRemoveClass('#not-found', 'active');
      expect(result).toBe(false);
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><div id="child" class="visible">Child</div></div>';
      const parent = document.getElementById('parent');
      const result = safeRemoveClass('#child', 'visible', parent!);

      expect(result).toBe(true);
      expect(document.getElementById('child')?.classList.contains('visible')).toBe(false);
    });
  });

  describe('safeAddEventListener', () => {
    it('要素が存在する場合、イベントリスナーを追加してtrueを返す [covers:safe_add_event_listener.found_adds_listener_true]', () => {
      document.body.innerHTML = '<button id="btn">Click</button>';
      const handler = vi.fn();

      const result = safeAddEventListener('#btn', 'click', handler);

      expect(result).toBe(true);

      document.getElementById('btn')?.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('要素が存在しない場合、falseを返す [covers:safe_add_event_listener.element_missing_false]', () => {
      const handler = vi.fn();
      const result = safeAddEventListener('#not-found', 'click', handler);

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><button id="child">Click</button></div>';
      const parent = document.getElementById('parent');
      const handler = vi.fn();

      const result = safeAddEventListener('#child', 'click', handler, parent!);

      expect(result).toBe(true);

      document.getElementById('child')?.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('複数のイベントタイプで動作する', () => {
      document.body.innerHTML = '<input id="input" type="text" />';
      const focusHandler = vi.fn();
      const blurHandler = vi.fn();

      safeAddEventListener('#input', 'focus', focusHandler);
      safeAddEventListener('#input', 'blur', blurHandler);

      const input = document.getElementById('input') as HTMLInputElement;
      input.focus();
      input.blur();

      expect(focusHandler).toHaveBeenCalledTimes(1);
      expect(blurHandler).toHaveBeenCalledTimes(1);
    });
  });
});
