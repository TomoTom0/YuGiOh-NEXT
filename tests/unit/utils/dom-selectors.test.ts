import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OFFICIAL_SITE_SELECTORS,
  EXTENSION_IDS,
  EXTENSION_CLASSES,
  MISC_SELECTORS,
  getExtensionIdSelector,
  getExtensionElement,
  getExtensionClassSelector,
} from '../../../src/utils/dom-selectors';

describe('dom-selectors', () => {
  describe('定数オブジェクトの存在確認', () => {
    it('OFFICIAL_SITE_SELECTORS が定義されている', () => {
      expect(OFFICIAL_SITE_SELECTORS).toBeDefined();
      expect(typeof OFFICIAL_SITE_SELECTORS).toBe('object');
      expect(OFFICIAL_SITE_SELECTORS.session).toBeDefined();
      expect(OFFICIAL_SITE_SELECTORS.navigation).toBeDefined();
      expect(OFFICIAL_SITE_SELECTORS.layout).toBeDefined();
    });

    it('EXTENSION_IDS が定義されている', () => {
      expect(EXTENSION_IDS).toBeDefined();
      expect(typeof EXTENSION_IDS).toBe('object');
      expect(EXTENSION_IDS.loading).toBeDefined();
      expect(EXTENSION_IDS.deckEdit).toBeDefined();
      expect(EXTENSION_IDS.shuffle).toBeDefined();
    });

    it('EXTENSION_CLASSES が定義されている', () => {
      expect(EXTENSION_CLASSES).toBeDefined();
      expect(typeof EXTENSION_CLASSES).toBe('object');
      expect(EXTENSION_CLASSES.common).toBeDefined();
      expect(EXTENSION_CLASSES.deckImage).toBeDefined();
      expect(EXTENSION_CLASSES.deckDisplay).toBeDefined();
    });

    it('MISC_SELECTORS が定義されている', () => {
      expect(MISC_SELECTORS).toBeDefined();
      expect(typeof MISC_SELECTORS).toBe('object');
      expect(MISC_SELECTORS.favicon).toBeDefined();
    });
  });

  describe('getExtensionIdSelector', () => {
    it('IDに # プレフィックスを付与する', () => {
      expect(getExtensionIdSelector('test-id')).toBe('#test-id');
      expect(getExtensionIdSelector('ygo-next-edit-btn')).toBe('#ygo-next-edit-btn');
      expect(getExtensionIdSelector('my-element')).toBe('#my-element');
    });

    it('空文字列でも # を付与する', () => {
      expect(getExtensionIdSelector('')).toBe('#');
    });
  });

  describe('getExtensionClassSelector', () => {
    it('クラス名に . プレフィックスを付与する', () => {
      expect(getExtensionClassSelector('test-class')).toBe('.test-class');
      expect(getExtensionClassSelector('ygo-next')).toBe('.ygo-next');
      expect(getExtensionClassSelector('my-class')).toBe('.my-class');
    });

    it('空文字列でも . を付与する', () => {
      expect(getExtensionClassSelector('')).toBe('.');
    });
  });

  describe('getExtensionElement', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      // モック要素を作成
      mockElement = document.createElement('div');
      mockElement.id = 'test-element';
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      // モック要素を削除
      if (mockElement && mockElement.parentNode) {
        mockElement.parentNode.removeChild(mockElement);
      }
    });

    it('存在する要素を取得できる', () => {
      const element = getExtensionElement('test-element');
      expect(element).toBe(mockElement);
      expect(element?.id).toBe('test-element');
    });

    it('存在しない要素の場合nullを返す', () => {
      const element = getExtensionElement('non-existent-id');
      expect(element).toBeNull();
    });
  });
});
