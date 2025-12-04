import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isHTMLElement,
  isHTMLInputElement,
  isHTMLImageElement,
  isHTMLSelectElement,
  isHTMLButtonElement,
  isHTMLAnchorElement,
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
  anyGuard
} from '../type-guards';

enum TestStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending'
}

describe('type-guards', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    container.innerHTML = `
      <input id="test-input" type="text" value="test" />
      <img id="test-image" src="test.jpg" />
      <select id="test-select"><option>option1</option></select>
      <button id="test-button">Click</button>
      <a id="test-link" href="https://example.com">Link</a>
      <div id="test-div">Content</div>
    `;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('HTML element type guards', () => {
    it('isHTMLElement should identify HTML elements', () => {
      const div = document.getElementById('test-div');
      expect(isHTMLElement(div)).toBe(true);
      expect(isHTMLElement(null)).toBe(false);
      expect(isHTMLElement('string')).toBe(false);
      expect(isHTMLElement(123)).toBe(false);
    });

    it('isHTMLInputElement should identify input elements', () => {
      const input = document.getElementById('test-input');
      expect(isHTMLInputElement(input)).toBe(true);
      expect(isHTMLInputElement(document.getElementById('test-div'))).toBe(false);
    });

    it('isHTMLImageElement should identify image elements', () => {
      const img = document.getElementById('test-image');
      expect(isHTMLImageElement(img)).toBe(true);
      expect(isHTMLImageElement(document.getElementById('test-div'))).toBe(false);
    });

    it('isHTMLSelectElement should identify select elements', () => {
      const select = document.getElementById('test-select');
      expect(isHTMLSelectElement(select)).toBe(true);
      expect(isHTMLSelectElement(document.getElementById('test-div'))).toBe(false);
    });

    it('isHTMLButtonElement should identify button elements', () => {
      const button = document.getElementById('test-button');
      expect(isHTMLButtonElement(button)).toBe(true);
      expect(isHTMLButtonElement(document.getElementById('test-div'))).toBe(false);
    });

    it('isHTMLAnchorElement should identify anchor elements', () => {
      const link = document.getElementById('test-link');
      expect(isHTMLAnchorElement(link)).toBe(true);
      expect(isHTMLAnchorElement(document.getElementById('test-div'))).toBe(false);
    });
  });

  describe('Object type guards', () => {
    it('isRecord should identify objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
    });

    it('hasProperty should check object properties', () => {
      const obj = { name: 'test', age: 30 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'age')).toBe(true);
      expect(hasProperty(obj, 'missing')).toBe(false);
      expect(hasProperty(null, 'key')).toBe(false);
    });
  });

  describe('Value type guards', () => {
    it('isDefined should check for null and undefined', () => {
      expect(isDefined('string')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });

    it('isString should identify strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
    });

    it('isNumber should identify numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
    });

    it('isBoolean should identify booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
    });

    it('isArray should identify arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray('string')).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('Enum type guard', () => {
    it('isEnumMember should check enum membership', () => {
      expect(isEnumMember('active', TestStatus)).toBe(true);
      expect(isEnumMember('inactive', TestStatus)).toBe(true);
      expect(isEnumMember('pending', TestStatus)).toBe(true);
      expect(isEnumMember('unknown', TestStatus)).toBe(false);
      expect(isEnumMember(123, TestStatus)).toBe(false);
    });
  });

  describe('safeQueryAs', () => {
    it('should find and type-guard element', () => {
      const input = safeQueryAs('#test-input', isHTMLInputElement);
      expect(input).not.toBeNull();
      expect(input?.value).toBe('test');
    });

    it('should return null when element not found', () => {
      const input = safeQueryAs('#non-existent', isHTMLInputElement);
      expect(input).toBeNull();
    });

    it('should return null when type guard fails', () => {
      const notAnInput = safeQueryAs('#test-div', isHTMLInputElement);
      expect(notAnInput).toBeNull();
    });

    it('should support parent element parameter', () => {
      // Create a parent div with a child input
      const parent = document.createElement('div');
      const childInput = document.createElement('input');
      childInput.id = 'child-input';
      parent.appendChild(childInput);
      container.appendChild(parent);

      // Search for the child input within the parent
      const found = safeQueryAs('#child-input', isHTMLInputElement, parent);
      expect(found).not.toBeNull();
      expect(found?.id).toBe('child-input');
    });
  });

  describe('safeCastAs', () => {
    it('should cast object when type guard passes', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeCastAs(obj, isRecord);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('test');
    });

    it('should return null when type guard fails', () => {
      const value = 'not an object';
      const result = safeCastAs(value, isRecord);
      expect(result).toBeNull();
    });

    it('should work with multiple type guards', () => {
      const obj = { key: 'value' };
      const result = safeCastAs(obj, (val) => isRecord(val) && hasProperty(val, 'key'));
      expect(result).not.toBeNull();
    });
  });

  describe('allGuards', () => {
    it('should return true when all guards pass', () => {
      const value = { name: 'test' };
      const result = allGuards(
        value,
        isRecord,
        (v) => hasProperty(v, 'name')
      );
      expect(result).toBe(true);
    });

    it('should return false when any guard fails', () => {
      const value = { name: 'test' };
      const result = allGuards(
        value,
        isRecord,
        (v) => hasProperty(v, 'missing')
      );
      expect(result).toBe(false);
    });

    it('should handle empty guards array', () => {
      const result = allGuards('value');
      expect(result).toBe(true);
    });
  });

  describe('anyGuard', () => {
    it('should return true when at least one guard passes', () => {
      const value = 'string';
      const result = anyGuard(
        value,
        isNumber,
        isString,
        isBoolean
      );
      expect(result).toBe(true);
    });

    it('should return false when no guard passes', () => {
      const value = {};
      const result = anyGuard(
        value,
        isString,
        isNumber,
        isBoolean
      );
      expect(result).toBe(false);
    });

    it('should handle empty guards array', () => {
      const result = anyGuard('value');
      expect(result).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    it('should safely handle querySelector results', () => {
      const input = safeQueryAs<HTMLInputElement>(
        '#test-input',
        isHTMLInputElement
      );

      if (input) {
        // TypeScript knows input is HTMLInputElement
        input.value = 'new value';
        expect(input.value).toBe('new value');
      }
    });

    it('should safely cast data from API', () => {
      const apiResponse: unknown = {
        id: '123',
        name: 'Card Name',
        type: 'Monster'
      };

      const result = safeCastAs(apiResponse, isRecord);
      if (result && hasProperty(result, 'id')) {
        expect(result.id).toBe('123');
      }
    });

    it('should compose multiple checks', () => {
      const element: unknown = document.getElementById('test-input');

      if (isHTMLElement(element) && isHTMLInputElement(element)) {
        // Now TypeScript knows it's an HTMLInputElement
        const value = element.value;
        expect(value).toBe('test');
      }
    });
  });
});
