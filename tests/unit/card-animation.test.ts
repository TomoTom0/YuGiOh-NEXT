import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { animateCardMove, animateCardsMoveInSection } from '../../src/utils/card-animation';

describe('card-animation.ts', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // モックHTML要素を作成
    mockElement = document.createElement('div');
    mockElement.className = 'deck-card';
    document.body.appendChild(mockElement);

    // getBoundingClientRectをモック
    mockElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 200,
      right: 200,
      width: 100,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  describe('animateCardMove', () => {
    it('カード要素が移動している場合、アニメーションが適用される', async () => {
      let callCount = 0;

      // 1回目: 元の位置 (100, 100)
      // 2回目: 新しい位置 (150, 150)
      mockElement.getBoundingClientRect = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            top: 100,
            left: 100,
            bottom: 200,
            right: 200,
            width: 100,
            height: 100,
            x: 100,
            y: 100,
            toJSON: () => ({}),
          };
        } else {
          return {
            top: 150,
            left: 150,
            bottom: 250,
            right: 250,
            width: 100,
            height: 100,
            x: 150,
            y: 150,
            toJSON: () => ({}),
          };
        }
      });

      animateCardMove(mockElement, 100);

      await new Promise(resolve => setTimeout(resolve, 50));
      // transformが設定されることを確認
      expect(mockElement.style.transform).toBeDefined();
    });

    it('カード要素が移動していない場合、アニメーションは適用されない', async () => {
      // 位置が変わらない場合
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 100,
        bottom: 200,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }));

      animateCardMove(mockElement, 100);

      await new Promise(resolve => setTimeout(resolve, 50));
      // transformが設定されないことを確認
      expect(mockElement.style.transform).toBe('');
    });

    it('アニメーション終了後にスタイルがクリーンアップされる', async () => {
      let callCount = 0;

      mockElement.getBoundingClientRect = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            top: 100,
            left: 100,
            bottom: 200,
            right: 200,
            width: 100,
            height: 100,
            x: 100,
            y: 100,
            toJSON: () => ({}),
          };
        } else {
          return {
            top: 150,
            left: 150,
            bottom: 250,
            right: 250,
            width: 100,
            height: 100,
            x: 150,
            y: 150,
            toJSON: () => ({}),
          };
        }
      });

      animateCardMove(mockElement, 100);

      // アニメーション時間 + 余裕をもって待つ
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockElement.style.transition).toBe('');
      expect(mockElement.style.transform).toBe('');
    });
  });

  describe('animateCardsMoveInSection', () => {
    let sectionElement: HTMLElement;
    let card1: HTMLElement;
    let card2: HTMLElement;

    beforeEach(() => {
      sectionElement = document.createElement('div');
      sectionElement.className = 'deck-section';

      card1 = document.createElement('div');
      card1.className = 'deck-card';
      card1.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 100,
        bottom: 200,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }));

      card2 = document.createElement('div');
      card2.className = 'deck-card';
      card2.getBoundingClientRect = vi.fn(() => ({
        top: 220,
        left: 100,
        bottom: 320,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 220,
        toJSON: () => ({}),
      }));

      sectionElement.appendChild(card1);
      sectionElement.appendChild(card2);
      document.body.appendChild(sectionElement);
    });

    afterEach(() => {
      document.body.removeChild(sectionElement);
    });

    it('セクション内の複数カードにアニメーションが適用される', async () => {
      let call1Count = 0;
      let call2Count = 0;

      // card1: (100, 100) -> (150, 100)
      card1.getBoundingClientRect = vi.fn(() => {
        call1Count++;
        if (call1Count === 1) {
          return {
            top: 100,
            left: 100,
            bottom: 200,
            right: 200,
            width: 100,
            height: 100,
            x: 100,
            y: 100,
            toJSON: () => ({}),
          };
        } else {
          return {
            top: 100,
            left: 150,
            bottom: 200,
            right: 250,
            width: 100,
            height: 100,
            x: 150,
            y: 100,
            toJSON: () => ({}),
          };
        }
      });

      // card2: (220, 100) -> (220, 150)
      card2.getBoundingClientRect = vi.fn(() => {
        call2Count++;
        if (call2Count === 1) {
          return {
            top: 220,
            left: 100,
            bottom: 320,
            right: 200,
            width: 100,
            height: 100,
            x: 100,
            y: 220,
            toJSON: () => ({}),
          };
        } else {
          return {
            top: 220,
            left: 150,
            bottom: 320,
            right: 250,
            width: 100,
            height: 100,
            x: 150,
            y: 220,
            toJSON: () => ({}),
          };
        }
      });

      animateCardsMoveInSection(sectionElement, 100);

      await new Promise(resolve => setTimeout(resolve, 50));
      // 両方のカードにtransformが設定されることを確認
      expect(card1.style.transform).toBeDefined();
      expect(card2.style.transform).toBeDefined();
    });

    it('セクション要素がnullの場合、何も起こらない', () => {
      expect(() => {
        animateCardsMoveInSection(null as any, 100);
      }).not.toThrow();
    });

    it('カードが存在しない場合、何も起こらない', () => {
      const emptySection = document.createElement('div');
      document.body.appendChild(emptySection);

      expect(() => {
        animateCardsMoveInSection(emptySection, 100);
      }).not.toThrow();

      document.body.removeChild(emptySection);
    });

    it('アニメーション終了後にスタイルがクリーンアップされる', async () => {
      let call1Count = 0;
      let call2Count = 0;

      card1.getBoundingClientRect = vi.fn(() => {
        call1Count++;
        return call1Count === 1
          ? { top: 100, left: 100, bottom: 200, right: 200, width: 100, height: 100, x: 100, y: 100, toJSON: () => ({}) }
          : { top: 100, left: 150, bottom: 200, right: 250, width: 100, height: 100, x: 150, y: 100, toJSON: () => ({}) };
      });

      card2.getBoundingClientRect = vi.fn(() => {
        call2Count++;
        return call2Count === 1
          ? { top: 220, left: 100, bottom: 320, right: 200, width: 100, height: 100, x: 100, y: 220, toJSON: () => ({}) }
          : { top: 220, left: 150, bottom: 320, right: 250, width: 100, height: 100, x: 150, y: 220, toJSON: () => ({}) };
      });

      animateCardsMoveInSection(sectionElement, 100);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(card1.style.transition).toBe('');
      expect(card1.style.transform).toBe('');
      expect(card2.style.transition).toBe('');
      expect(card2.style.transform).toBe('');
    });
  });
});
