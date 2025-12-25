import { describe, it, expect, beforeEach } from 'vitest';
import {
  isHTMLElement,
  isHTMLInputElement,
  isHTMLImageElement,
  isHTMLSelectElement,
  isHTMLButtonElement,
  isHTMLAnchorElement,
  isHTMLOptionElement,
  isHTMLTextAreaElement,
  isRecord,
  hasProperty,
  isDefined,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isEnumMember,
  safeQueryAs,
  safeCastAs,
  allGuards,
  anyGuard,
  isDeckTypeValue,
  isDeckStyleValue,
} from '../../../src/utils/type-guards';

describe('type-guards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('HTML要素型ガード', () => {
    describe('isHTMLElement', () => {
      it('HTMLElementの場合trueを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLElement(div)).toBe(true);
      });

      it('非HTMLElementの場合falseを返す', () => {
        expect(isHTMLElement(null)).toBe(false);
        expect(isHTMLElement(undefined)).toBe(false);
        expect(isHTMLElement({})).toBe(false);
        expect(isHTMLElement('string')).toBe(false);
      });
    });

    describe('isHTMLInputElement', () => {
      it('HTMLInputElementの場合trueを返す', () => {
        const input = document.createElement('input');
        expect(isHTMLInputElement(input)).toBe(true);
      });

      it('非HTMLInputElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLInputElement(div)).toBe(false);
        expect(isHTMLInputElement(null)).toBe(false);
      });

      it('valueプロパティにアクセスできる', () => {
        const input = document.createElement('input');
        input.value = 'test';
        if (isHTMLInputElement(input)) {
          expect(input.value).toBe('test');
        }
      });
    });

    describe('isHTMLImageElement', () => {
      it('HTMLImageElementの場合trueを返す', () => {
        const img = document.createElement('img');
        expect(isHTMLImageElement(img)).toBe(true);
      });

      it('非HTMLImageElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLImageElement(div)).toBe(false);
        expect(isHTMLImageElement(null)).toBe(false);
      });
    });

    describe('isHTMLSelectElement', () => {
      it('HTMLSelectElementの場合trueを返す', () => {
        const select = document.createElement('select');
        expect(isHTMLSelectElement(select)).toBe(true);
      });

      it('非HTMLSelectElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLSelectElement(div)).toBe(false);
        expect(isHTMLSelectElement(null)).toBe(false);
      });
    });

    describe('isHTMLButtonElement', () => {
      it('HTMLButtonElementの場合trueを返す', () => {
        const button = document.createElement('button');
        expect(isHTMLButtonElement(button)).toBe(true);
      });

      it('非HTMLButtonElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLButtonElement(div)).toBe(false);
        expect(isHTMLButtonElement(null)).toBe(false);
      });
    });

    describe('isHTMLAnchorElement', () => {
      it('HTMLAnchorElementの場合trueを返す', () => {
        const anchor = document.createElement('a');
        expect(isHTMLAnchorElement(anchor)).toBe(true);
      });

      it('非HTMLAnchorElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLAnchorElement(div)).toBe(false);
        expect(isHTMLAnchorElement(null)).toBe(false);
      });
    });

    describe('isHTMLOptionElement', () => {
      it('HTMLOptionElementの場合trueを返す', () => {
        const option = document.createElement('option');
        expect(isHTMLOptionElement(option)).toBe(true);
      });

      it('非HTMLOptionElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLOptionElement(div)).toBe(false);
        expect(isHTMLOptionElement(null)).toBe(false);
      });
    });

    describe('isHTMLTextAreaElement', () => {
      it('HTMLTextAreaElementの場合trueを返す', () => {
        const textarea = document.createElement('textarea');
        expect(isHTMLTextAreaElement(textarea)).toBe(true);
      });

      it('非HTMLTextAreaElementの場合falseを返す', () => {
        const div = document.createElement('div');
        expect(isHTMLTextAreaElement(div)).toBe(false);
        expect(isHTMLTextAreaElement(null)).toBe(false);
      });
    });
  });

  describe('基本型ガード', () => {
    describe('isRecord', () => {
      it('オブジェクトの場合trueを返す', () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord({ key: 'value' })).toBe(true);
      });

      it('非オブジェクトの場合falseを返す', () => {
        expect(isRecord(null)).toBe(false);
        expect(isRecord(undefined)).toBe(false);
        expect(isRecord([])).toBe(false);
        expect(isRecord('string')).toBe(false);
        expect(isRecord(123)).toBe(false);
      });
    });

    describe('hasProperty', () => {
      it('プロパティが存在する場合trueを返す', () => {
        const obj = { name: 'test', age: 25 };
        expect(hasProperty(obj, 'name')).toBe(true);
        expect(hasProperty(obj, 'age')).toBe(true);
      });

      it('プロパティが存在しない場合falseを返す', () => {
        const obj = { name: 'test' };
        expect(hasProperty(obj, 'age')).toBe(false);
      });

      it('非オブジェクトの場合falseを返す', () => {
        expect(hasProperty(null, 'name')).toBe(false);
        expect(hasProperty('string', 'length')).toBe(false);
      });

      it('型安全にプロパティにアクセスできる', () => {
        const obj: unknown = { name: 'test' };
        if (hasProperty(obj, 'name')) {
          expect(obj.name).toBe('test');
        }
      });
    });

    describe('isDefined', () => {
      it('値が定義されている場合trueを返す', () => {
        expect(isDefined(0)).toBe(true);
        expect(isDefined('')).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined({})).toBe(true);
        expect(isDefined([])).toBe(true);
      });

      it('nullまたはundefinedの場合falseを返す', () => {
        expect(isDefined(null)).toBe(false);
        expect(isDefined(undefined)).toBe(false);
      });
    });

    describe('isString', () => {
      it('文字列の場合trueを返す', () => {
        expect(isString('')).toBe(true);
        expect(isString('hello')).toBe(true);
      });

      it('非文字列の場合falseを返す', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('数値の場合trueを返す', () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-45.67)).toBe(true);
      });

      it('NaNの場合falseを返す', () => {
        expect(isNumber(NaN)).toBe(false);
      });

      it('非数値の場合falseを返す', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
      });
    });

    describe('isBoolean', () => {
      it('真偽値の場合trueを返す', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
      });

      it('非真偽値の場合falseを返す', () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });

    describe('isArray', () => {
      it('配列の場合trueを返す', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(['a', 'b'])).toBe(true);
      });

      it('非配列の場合falseを返す', () => {
        expect(isArray({})).toBe(false);
        expect(isArray(null)).toBe(false);
        expect(isArray('array')).toBe(false);
      });
    });

    describe('isEnumMember', () => {
      enum TestEnum {
        A = 'a',
        B = 'b',
        C = 'c',
      }

      it('enum値の場合trueを返す', () => {
        expect(isEnumMember('a', TestEnum)).toBe(true);
        expect(isEnumMember('b', TestEnum)).toBe(true);
        expect(isEnumMember('c', TestEnum)).toBe(true);
      });

      it('非enum値の場合falseを返す', () => {
        expect(isEnumMember('d', TestEnum)).toBe(false);
        expect(isEnumMember('A', TestEnum)).toBe(false);
        expect(isEnumMember(null, TestEnum)).toBe(false);
      });

      it('数値enumでも動作する', () => {
        enum NumEnum {
          Zero = 0,
          One = 1,
          Two = 2,
        }
        expect(isEnumMember(0, NumEnum)).toBe(true);
        expect(isEnumMember(1, NumEnum)).toBe(true);
        expect(isEnumMember(3, NumEnum)).toBe(false);
      });
    });
  });

  describe('ユーティリティ関数', () => {
    describe('safeQueryAs', () => {
      beforeEach(() => {
        document.body.innerHTML = `
          <div id="test-div">Test</div>
          <input id="test-input" type="text" value="input-value" />
          <button id="test-button">Click</button>
        `;
      });

      it('要素が存在し型ガードを通過する場合、要素を返す', () => {
        const input = safeQueryAs('#test-input', isHTMLInputElement);
        expect(input).not.toBeNull();
        expect(input?.value).toBe('input-value');
      });

      it('要素が存在するが型ガードを通過しない場合、nullを返す', () => {
        const div = safeQueryAs('#test-div', isHTMLInputElement);
        expect(div).toBeNull();
      });

      it('要素が存在しない場合、nullを返す', () => {
        const notFound = safeQueryAs('#not-found', isHTMLElement);
        expect(notFound).toBeNull();
      });

      it('親要素を指定できる', () => {
        const parent = document.getElementById('test-div');
        document.getElementById('test-div')!.innerHTML = '<span id="child">Child</span>';
        const child = safeQueryAs('#child', isHTMLElement, parent!);
        expect(child).not.toBeNull();
      });
    });

    describe('safeCastAs', () => {
      it('型ガードを通過する場合、値を返す', () => {
        const obj = { key: 'value' };
        const result = safeCastAs(obj, isRecord);
        expect(result).toBe(obj);
      });

      it('型ガードを通過しない場合、nullを返す', () => {
        const result = safeCastAs(null, isRecord);
        expect(result).toBeNull();
      });

      it('複雑な型ガードでも動作する', () => {
        const value: unknown = 'test';
        const result = safeCastAs(value, isString);
        expect(result).toBe('test');
      });
    });

    describe('allGuards', () => {
      it('全ての型ガードを通過する場合trueを返す', () => {
        const obj = { name: 'test', age: 25 };
        const result = allGuards(
          obj,
          isRecord,
          (v) => hasProperty(v, 'name'),
          (v) => hasProperty(v, 'age')
        );
        expect(result).toBe(true);
      });

      it('1つでも型ガードを通過しない場合falseを返す', () => {
        const obj = { name: 'test' };
        const result = allGuards(
          obj,
          isRecord,
          (v) => hasProperty(v, 'name'),
          (v) => hasProperty(v, 'age')
        );
        expect(result).toBe(false);
      });

      it('型ガードが1つもない場合trueを返す', () => {
        const result = allGuards('anything');
        expect(result).toBe(true);
      });
    });

    describe('anyGuard', () => {
      it('少なくとも1つの型ガードを通過する場合trueを返す', () => {
        const value = 'test';
        const result = anyGuard(value, isString, isNumber);
        expect(result).toBe(true);
      });

      it('全ての型ガードを通過しない場合falseを返す', () => {
        const value = true;
        const result = anyGuard(value, isString, isNumber);
        expect(result).toBe(false);
      });

      it('型ガードが1つもない場合falseを返す', () => {
        const result = anyGuard('anything');
        expect(result).toBe(false);
      });
    });
  });

  describe('ドメイン固有型ガード', () => {
    describe('isDeckTypeValue', () => {
      it('有効なデッキタイプ値の場合trueを返す', () => {
        expect(isDeckTypeValue('0')).toBe(true);
        expect(isDeckTypeValue('1')).toBe(true);
        expect(isDeckTypeValue('2')).toBe(true);
        expect(isDeckTypeValue('3')).toBe(true);
      });

      it('無効なデッキタイプ値の場合falseを返す', () => {
        expect(isDeckTypeValue('4')).toBe(false);
        expect(isDeckTypeValue('-1')).toBe(false);
        expect(isDeckTypeValue('a')).toBe(false);
        expect(isDeckTypeValue(0)).toBe(false);
        expect(isDeckTypeValue(null)).toBe(false);
      });
    });

    describe('isDeckStyleValue', () => {
      it('有効なデッキスタイル値の場合trueを返す', () => {
        expect(isDeckStyleValue('-1')).toBe(true);
        expect(isDeckStyleValue('0')).toBe(true);
        expect(isDeckStyleValue('1')).toBe(true);
        expect(isDeckStyleValue('2')).toBe(true);
      });

      it('無効なデッキスタイル値の場合falseを返す', () => {
        expect(isDeckStyleValue('3')).toBe(false);
        expect(isDeckStyleValue('-2')).toBe(false);
        expect(isDeckStyleValue('a')).toBe(false);
        expect(isDeckStyleValue(0)).toBe(false);
        expect(isDeckStyleValue(null)).toBe(false);
      });
    });
  });
});
