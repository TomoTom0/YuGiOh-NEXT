/**
 * deckDisplayLayout.ts のテスト
 *
 * tests/design/deck-display-layout/conditions.toml (TASK-330) のconditionをカバーする。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setCardImageSize, applyDeckDisplayLayout } from '@/content/deck-display/deckDisplayLayout';

describe('deckDisplayLayout.ts', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--deck-display-card-width');
    document.head.querySelectorAll('style').forEach(el => el.remove());
  });

  describe('setCardImageSize', () => {
    it('[covers:set-card-image-size.normal-removes-css-variable] normalの場合CSS変数を削除する', () => {
      document.documentElement.style.setProperty('--deck-display-card-width', '90px');

      setCardImageSize('normal');

      expect(document.documentElement.style.getPropertyValue('--deck-display-card-width')).toBe('');
    });

    it.each([
      ['small', '36px'],
      ['medium', '60px'],
      ['large', '90px'],
      ['xlarge', '120px']
    ] as const)('[covers:set-card-image-size.known-size-sets-mapped-width] %sの場合%sを設定する', (size, expected) => {
      setCardImageSize(size);

      expect(document.documentElement.style.getPropertyValue('--deck-display-card-width')).toBe(expected);
    });

    it('[covers:set-card-image-size.unknown-size-falls-back-to-60px] 未知の値の場合60pxにフォールバックする', () => {
      setCardImageSize('unknown' as never);

      expect(document.documentElement.style.getPropertyValue('--deck-display-card-width')).toBe('60px');
    });
  });

  describe('applyDeckDisplayLayout', () => {
    it('[covers:apply-deck-display-layout.injects-style-element] style要素を1つ追加する', () => {
      const before = document.head.querySelectorAll('style').length;

      applyDeckDisplayLayout();

      expect(document.head.querySelectorAll('style').length).toBe(before + 1);
    });
  });
});
