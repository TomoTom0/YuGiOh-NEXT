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
    it('要素が存在する場合、その要素を返す', () => {
      document.body.innerHTML = '<div id="test">Test</div>';
      const element = safeQuery('#test');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('test');
    });

    it('要素が存在しない場合、nullを返す', () => {
      const element = safeQuery('#not-found');
      expect(element).toBeNull();
    });

    it('親要素を指定できる', () => {
      document.body.innerHTML = '<div id="parent"><span id="child">Child</span></div>';
      const parent = document.getElementById('parent');
      const child = safeQuery('#child', parent!);
      expect(child).not.toBeNull();
      expect(child?.id).toBe('child');
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
    it('要素が存在する場合、警告を出さずに要素を返す', () => {
      document.body.innerHTML = '<div id="test">Test</div>';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#test');

      expect(element).not.toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('要素が存在しない場合、デフォルトの警告を出す', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#not-found');

      expect(element).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[safeQueryWithWarn] Element not found: "#not-found"'
      );

      warnSpy.mockRestore();
    });

    it('要素が存在しない場合、カスタムエラーメッセージを出す', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const element = safeQueryWithWarn('#not-found', 'Custom error message');

      expect(element).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('Custom error message');

      warnSpy.mockRestore();
    });

    it('親要素を指定できる', () => {
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
    it('複数の要素を配列で返す', () => {
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

    it('要素が存在しない場合、空配列を返す', () => {
      const elements = safeQueryAll('.not-found');
      expect(elements).toEqual([]);
      expect(elements).toHaveLength(0);
    });

    it('親要素を指定できる', () => {
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
    it('要素が存在する場合、コールバックを実行する', () => {
      document.body.innerHTML = '<div id="test">Initial</div>';

      safeQueryAndRun('#test', (elem) => {
        elem.textContent = 'Updated';
      });

      expect(document.getElementById('test')?.textContent).toBe('Updated');
    });

    it('要素が存在しない場合、コールバックを実行しない', () => {
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
    it('属性が存在する場合、その値を返す', () => {
      document.body.innerHTML = '<a id="link" href="https://example.com">Link</a>';
      const href = safeGetAttribute('#link', 'href');
      expect(href).toBe('https://example.com');
    });

    it('属性が存在しない場合、nullを返す', () => {
      document.body.innerHTML = '<div id="div">Div</div>';
      const href = safeGetAttribute('#div', 'href');
      expect(href).toBeNull();
    });

    it('要素が存在しない場合、nullを返す', () => {
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
    it('textContentを返す', () => {
      document.body.innerHTML = '<div id="test">Hello World</div>';
      const text = safeGetText('#test');
      expect(text).toBe('Hello World');
    });

    it('前後の空白をトリムする', () => {
      document.body.innerHTML = '<div id="test">  Trimmed  </div>';
      const text = safeGetText('#test');
      expect(text).toBe('Trimmed');
    });

    it('要素が存在しない場合、nullを返す', () => {
      const text = safeGetText('#not-found');
      expect(text).toBeNull();
    });

    it('空のtextContentの場合、空文字列を返す', () => {
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
    it('要素が存在する場合、HTMLを設定してtrueを返す', () => {
      document.body.innerHTML = '<div id="container">Old</div>';
      const result = safeSetHTML('#container', '<p>New Content</p>');

      expect(result).toBe(true);
      expect(document.getElementById('container')?.innerHTML).toBe('<p>New Content</p>');
    });

    it('要素が存在しない場合、falseを返す', () => {
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
    it('要素が存在する場合、属性を設定してtrueを返す', () => {
      document.body.innerHTML = '<a id="link">Link</a>';
      const result = safeSetAttribute('#link', 'href', 'https://example.com');

      expect(result).toBe(true);
      expect(document.getElementById('link')?.getAttribute('href')).toBe('https://example.com');
    });

    it('要素が存在しない場合、falseを返す', () => {
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
    it('要素が存在する場合、クラスを追加してtrueを返す', () => {
      document.body.innerHTML = '<div id="btn">Button</div>';
      const result = safeAddClass('#btn', 'active');

      expect(result).toBe(true);
      expect(document.getElementById('btn')?.classList.contains('active')).toBe(true);
    });

    it('要素が存在しない場合、falseを返す', () => {
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
    it('要素が存在する場合、クラスを削除してtrueを返す', () => {
      document.body.innerHTML = '<div id="btn" class="active highlight">Button</div>';
      const result = safeRemoveClass('#btn', 'active');

      expect(result).toBe(true);
      expect(document.getElementById('btn')?.classList.contains('active')).toBe(false);
      expect(document.getElementById('btn')?.classList.contains('highlight')).toBe(true);
    });

    it('要素が存在しない場合、falseを返す', () => {
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
    it('要素が存在する場合、イベントリスナーを追加してtrueを返す', () => {
      document.body.innerHTML = '<button id="btn">Click</button>';
      const handler = vi.fn();

      const result = safeAddEventListener('#btn', 'click', handler);

      expect(result).toBe(true);

      document.getElementById('btn')?.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('要素が存在しない場合、falseを返す', () => {
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
