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
  isRecordOfStringKeys,
} from '../../../src/utils/type-guards';

describe('type-guards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('HTML要素型ガード', () => {
    describe('isHTMLElement', () => {
      it('HTMLElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const div = document.createElement('div');
        expect(isHTMLElement(div)).toBe(true);
      });

      it('非HTMLElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        expect(isHTMLElement(null)).toBe(false);
        expect(isHTMLElement(undefined)).toBe(false);
        expect(isHTMLElement({})).toBe(false);
        expect(isHTMLElement('string')).toBe(false);
      });
    });

    describe('isHTMLInputElement', () => {
      it('HTMLInputElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const input = document.createElement('input');
        expect(isHTMLInputElement(input)).toBe(true);
      });

      it('非HTMLInputElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
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
      it('HTMLImageElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const img = document.createElement('img');
        expect(isHTMLImageElement(img)).toBe(true);
      });

      it('非HTMLImageElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLImageElement(div)).toBe(false);
        expect(isHTMLImageElement(null)).toBe(false);
      });
    });

    describe('isHTMLSelectElement', () => {
      it('HTMLSelectElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const select = document.createElement('select');
        expect(isHTMLSelectElement(select)).toBe(true);
      });

      it('非HTMLSelectElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLSelectElement(div)).toBe(false);
        expect(isHTMLSelectElement(null)).toBe(false);
      });
    });

    describe('isHTMLButtonElement', () => {
      it('HTMLButtonElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const button = document.createElement('button');
        expect(isHTMLButtonElement(button)).toBe(true);
      });

      it('非HTMLButtonElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLButtonElement(div)).toBe(false);
        expect(isHTMLButtonElement(null)).toBe(false);
      });
    });

    describe('isHTMLAnchorElement', () => {
      it('HTMLAnchorElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const anchor = document.createElement('a');
        expect(isHTMLAnchorElement(anchor)).toBe(true);
      });

      it('非HTMLAnchorElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLAnchorElement(div)).toBe(false);
        expect(isHTMLAnchorElement(null)).toBe(false);
      });
    });

    describe('isHTMLOptionElement', () => {
      it('HTMLOptionElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const option = document.createElement('option');
        expect(isHTMLOptionElement(option)).toBe(true);
      });

      it('非HTMLOptionElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLOptionElement(div)).toBe(false);
        expect(isHTMLOptionElement(null)).toBe(false);
      });
    });

    describe('isHTMLTextAreaElement', () => {
      it('HTMLTextAreaElementの場合trueを返す [covers:html_guard.instanceof_true]', () => {
        const textarea = document.createElement('textarea');
        expect(isHTMLTextAreaElement(textarea)).toBe(true);
      });

      it('非HTMLTextAreaElementの場合falseを返す [covers:html_guard.property_fallback_false]', () => {
        const div = document.createElement('div');
        expect(isHTMLTextAreaElement(div)).toBe(false);
        expect(isHTMLTextAreaElement(null)).toBe(false);
      });
    });

    it('plain objectは各要素ガードのプロパティ条件を満たす場合にtrueを返す [covers:html_guard.property_fallback_true] [covers:is_html_element.property_shape] [covers:is_html_input.property_shape] [covers:is_html_image.property_shape] [covers:is_html_select.property_shape] [covers:is_html_button.property_shape] [covers:is_html_anchor.property_shape] [covers:is_html_option.property_shape] [covers:is_html_textarea.property_shape]', () => {
      expect(isHTMLElement({ tagName: 'DIV', nodeType: 1 })).toBe(true);
      expect(isHTMLElement({ tagName: 'DIV', nodeType: 3 })).toBe(false);
      expect(isHTMLInputElement({ tagName: 'INPUT', value: '' })).toBe(true);
      expect(isHTMLInputElement({ tagName: 'INPUT' })).toBe(false);
      expect(isHTMLImageElement({ tagName: 'IMG', src: '' })).toBe(true);
      expect(isHTMLImageElement({ tagName: 'IMG' })).toBe(false);
      expect(isHTMLSelectElement({ tagName: 'SELECT', options: [] })).toBe(true);
      expect(isHTMLSelectElement({ tagName: 'SELECT' })).toBe(false);
      expect(isHTMLButtonElement({ tagName: 'BUTTON' })).toBe(true);
      expect(isHTMLButtonElement({ tagName: 'DIV' })).toBe(false);
      expect(isHTMLAnchorElement({ tagName: 'A', href: '' })).toBe(true);
      expect(isHTMLAnchorElement({ tagName: 'A' })).toBe(false);
      expect(isHTMLOptionElement({ tagName: 'OPTION', value: '' })).toBe(true);
      expect(isHTMLOptionElement({ tagName: 'OPTION' })).toBe(false);
      expect(isHTMLTextAreaElement({ tagName: 'TEXTAREA', value: '' })).toBe(true);
      expect(isHTMLTextAreaElement({ tagName: 'TEXTAREA' })).toBe(false);
    });
  });

  describe('基本型ガード', () => {
    describe('isRecord', () => {
      it('オブジェクトの場合trueを返す [covers:is_record.object_non_null_non_array]', () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord({ key: 'value' })).toBe(true);
        expect(isRecord(new Date())).toBe(true);
      });

      it('非オブジェクトの場合falseを返す [covers:is_record.object_non_null_non_array]', () => {
        expect(isRecord(null)).toBe(false);
        expect(isRecord(undefined)).toBe(false);
        expect(isRecord([])).toBe(false);
        expect(isRecord('string')).toBe(false);
        expect(isRecord(123)).toBe(false);
      });
    });

    describe('hasProperty', () => {
      it('プロパティが存在する場合trueを返す [covers:has_property.key_in_record]', () => {
        const obj = { name: 'test', age: 25 };
        expect(hasProperty(obj, 'name')).toBe(true);
        expect(hasProperty(obj, 'age')).toBe(true);
      });

      it('継承プロパティが存在する場合trueを返す [covers:has_property.key_in_record]', () => {
        const obj = Object.create({ inherited: 'value' });
        expect(hasProperty(obj, 'inherited')).toBe(true);
      });

      it('プロパティが存在しない場合falseを返す [covers:has_property.false_when_missing_or_not_record]', () => {
        const obj = { name: 'test' };
        expect(hasProperty(obj, 'age')).toBe(false);
      });

      it('非Recordの場合falseを返す [covers:has_property.false_when_missing_or_not_record]', () => {
        expect(hasProperty(null, 'name')).toBe(false);
        expect(hasProperty('string', 'length')).toBe(false);
        expect(hasProperty([], 'length')).toBe(false);
      });

      it('型安全にプロパティにアクセスできる', () => {
        const obj: unknown = { name: 'test' };
        if (hasProperty(obj, 'name')) {
          expect(obj.name).toBe('test');
        }
      });
    });

    describe('isDefined', () => {
      it('値が定義されている場合trueを返す [covers:is_defined.not_nullish]', () => {
        expect(isDefined(0)).toBe(true);
        expect(isDefined('')).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined({})).toBe(true);
        expect(isDefined([])).toBe(true);
      });

      it('nullまたはundefinedの場合falseを返す [covers:is_defined.not_nullish]', () => {
        expect(isDefined(null)).toBe(false);
        expect(isDefined(undefined)).toBe(false);
      });
    });

    describe('isString', () => {
      it('文字列の場合trueを返す [covers:is_string.typeof_string]', () => {
        expect(isString('')).toBe(true);
        expect(isString('hello')).toBe(true);
      });

      it('非文字列の場合falseを返す [covers:is_string.typeof_string]', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString(new String('hello'))).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('数値の場合trueを返す [covers:is_number.typeof_number_not_nan]', () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-45.67)).toBe(true);
        expect(isNumber(Infinity)).toBe(true);
      });

      it('NaNの場合falseを返す [covers:is_number.typeof_number_not_nan]', () => {
        expect(isNumber(NaN)).toBe(false);
      });

      it('非数値の場合falseを返す [covers:is_number.typeof_number_not_nan]', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumber(new Number(1))).toBe(false);
      });
    });

    describe('isBoolean', () => {
      it('真偽値の場合trueを返す [covers:is_boolean.typeof_boolean]', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
      });

      it('非真偽値の場合falseを返す [covers:is_boolean.typeof_boolean]', () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });

    describe('isArray', () => {
      it('配列の場合trueを返す [covers:is_array.array_is_array]', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(['a', 'b'])).toBe(true);
      });

      it('非配列の場合falseを返す [covers:is_array.array_is_array]', () => {
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

      it('enum値の場合trueを返す [covers:is_enum_member.object_values_includes]', () => {
        expect(isEnumMember('a', TestEnum)).toBe(true);
        expect(isEnumMember('b', TestEnum)).toBe(true);
        expect(isEnumMember('c', TestEnum)).toBe(true);
      });

      it('非enum値の場合falseを返す [covers:is_enum_member.object_values_includes]', () => {
        expect(isEnumMember('d', TestEnum)).toBe(false);
        expect(isEnumMember('A', TestEnum)).toBe(false);
        expect(isEnumMember(null, TestEnum)).toBe(false);
      });

      it('数値enumではreverse mappingのメンバー名文字列もtrueを返す [covers:is_enum_member.object_values_includes]', () => {
        enum NumEnum {
          Zero = 0,
          One = 1,
          Two = 2,
        }
        expect(isEnumMember(0, NumEnum)).toBe(true);
        expect(isEnumMember(1, NumEnum)).toBe(true);
        expect(isEnumMember('Zero', NumEnum)).toBe(true);
        expect(isEnumMember(3, NumEnum)).toBe(false);
      });
    });

    describe('isRecordOfStringKeys', () => {
      it('非null objectかつ非配列の場合trueを返す [covers:is_record_of_string_keys.object_non_null_non_array]', () => {
        expect(isRecordOfStringKeys({})).toBe(true);
        expect(isRecordOfStringKeys({ key: 'value' })).toBe(true);
        expect(isRecordOfStringKeys(new Date())).toBe(true);
      });

      it('null、配列、primitiveの場合falseを返す [covers:is_record_of_string_keys.object_non_null_non_array]', () => {
        expect(isRecordOfStringKeys(null)).toBe(false);
        expect(isRecordOfStringKeys(undefined)).toBe(false);
        expect(isRecordOfStringKeys([])).toBe(false);
        expect(isRecordOfStringKeys('string')).toBe(false);
        expect(isRecordOfStringKeys(123)).toBe(false);
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

      it('要素が存在し型ガードを通過する場合、要素を返す [covers:safe_query_as.found_and_guard_true]', () => {
        const input = safeQueryAs('#test-input', isHTMLInputElement);
        expect(input).not.toBeNull();
        expect(input?.value).toBe('input-value');
      });

      it('要素が存在するが型ガードを通過しない場合、nullを返す [covers:safe_query_as.found_but_guard_false]', () => {
        const div = safeQueryAs('#test-div', isHTMLInputElement);
        expect(div).toBeNull();
      });

      it('要素が存在しない場合、nullを返す [covers:safe_query_as.not_found]', () => {
        const notFound = safeQueryAs('#not-found', isHTMLElement);
        expect(notFound).toBeNull();
      });

      it('親要素を指定できる [covers:safe_query_as.uses_parent_when_truthy]', () => {
        const parent = document.getElementById('test-div');
        document.getElementById('test-div')!.innerHTML = '<span id="child">Child</span>';
        const child = safeQueryAs('#child', isHTMLElement, parent!);
        expect(child).not.toBeNull();
      });
    });

    describe('safeCastAs', () => {
      it('型ガードを通過する場合、値を返す [covers:safe_cast_as.guard_true_returns_obj]', () => {
        const obj = { key: 'value' };
        const result = safeCastAs(obj, isRecord);
        expect(result).toBe(obj);
      });

      it('型ガードを通過しない場合、nullを返す [covers:safe_cast_as.guard_false_returns_null]', () => {
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
      it('全ての型ガードを通過する場合trueを返す [covers:all_guards.every_all_true]', () => {
        const obj = { name: 'test', age: 25 };
        const result = allGuards(
          obj,
          isRecord,
          (v) => hasProperty(v, 'name'),
          (v) => hasProperty(v, 'age')
        );
        expect(result).toBe(true);
      });

      it('1つでも型ガードを通過しない場合falseを返す [covers:all_guards.every_any_false]', () => {
        const obj = { name: 'test' };
        const result = allGuards(
          obj,
          isRecord,
          (v) => hasProperty(v, 'name'),
          (v) => hasProperty(v, 'age')
        );
        expect(result).toBe(false);
      });

      it('型ガードが1つもない場合trueを返す [covers:all_guards.empty_guards_true]', () => {
        const result = allGuards('anything');
        expect(result).toBe(true);
      });
    });

    describe('anyGuard', () => {
      it('少なくとも1つの型ガードを通過する場合trueを返す [covers:any_guard.some_any_true]', () => {
        const value = 'test';
        const result = anyGuard(value, isString, isNumber);
        expect(result).toBe(true);
      });

      it('全ての型ガードを通過しない場合falseを返す [covers:any_guard.some_all_false]', () => {
        const value = true;
        const result = anyGuard(value, isString, isNumber);
        expect(result).toBe(false);
      });

      it('型ガードが1つもない場合falseを返す [covers:any_guard.empty_guards_false]', () => {
        const result = anyGuard('anything');
        expect(result).toBe(false);
      });
    });
  });

  describe('ドメイン固有型ガード', () => {
    describe('isDeckTypeValue', () => {
      it('有効なデッキタイプ値の場合trueを返す [covers:is_deck_type_value.string_0_to_3]', () => {
        expect(isDeckTypeValue('0')).toBe(true);
        expect(isDeckTypeValue('1')).toBe(true);
        expect(isDeckTypeValue('2')).toBe(true);
        expect(isDeckTypeValue('3')).toBe(true);
      });

      it('無効なデッキタイプ値の場合falseを返す [covers:is_deck_type_value.string_0_to_3]', () => {
        expect(isDeckTypeValue('4')).toBe(false);
        expect(isDeckTypeValue('-1')).toBe(false);
        expect(isDeckTypeValue('a')).toBe(false);
        expect(isDeckTypeValue(0)).toBe(false);
        expect(isDeckTypeValue(null)).toBe(false);
      });
    });

    describe('isDeckStyleValue', () => {
      it('有効なデッキスタイル値の場合trueを返す [covers:is_deck_style_value.string_minus1_to_2]', () => {
        expect(isDeckStyleValue('-1')).toBe(true);
        expect(isDeckStyleValue('0')).toBe(true);
        expect(isDeckStyleValue('1')).toBe(true);
        expect(isDeckStyleValue('2')).toBe(true);
      });

      it('無効なデッキスタイル値の場合falseを返す [covers:is_deck_style_value.string_minus1_to_2]', () => {
        expect(isDeckStyleValue('3')).toBe(false);
        expect(isDeckStyleValue('-2')).toBe(false);
        expect(isDeckStyleValue('a')).toBe(false);
        expect(isDeckStyleValue(0)).toBe(false);
        expect(isDeckStyleValue(null)).toBe(false);
      });
    });
  });
});
