import { describe, it, expect } from 'vitest';
import {
  ATTRIBUTE_REVERSE_MAP,
  CARD_TYPE_REVERSE_MAP,
  MONSTER_TYPE_REVERSE_MAP,
} from '../../../src/utils/reverse-map-generator';

describe('reverse-map-generator', () => {
  describe('ATTRIBUTE_REVERSE_MAP', () => {
    it('日本語から属性IDへの変換が正しく行われる', () => {
      expect(ATTRIBUTE_REVERSE_MAP['光']).toBe('light');
      expect(ATTRIBUTE_REVERSE_MAP['闇']).toBe('dark');
      expect(ATTRIBUTE_REVERSE_MAP['水']).toBe('water');
      expect(ATTRIBUTE_REVERSE_MAP['炎']).toBe('fire');
      expect(ATTRIBUTE_REVERSE_MAP['地']).toBe('earth');
      expect(ATTRIBUTE_REVERSE_MAP['風']).toBe('wind');
      expect(ATTRIBUTE_REVERSE_MAP['神']).toBe('divine');
    });

    it('英語から属性IDへの変換が正しく行われる（自己参照）', () => {
      expect(ATTRIBUTE_REVERSE_MAP['light']).toBe('light');
      expect(ATTRIBUTE_REVERSE_MAP['dark']).toBe('dark');
      expect(ATTRIBUTE_REVERSE_MAP['water']).toBe('water');
      expect(ATTRIBUTE_REVERSE_MAP['fire']).toBe('fire');
      expect(ATTRIBUTE_REVERSE_MAP['earth']).toBe('earth');
      expect(ATTRIBUTE_REVERSE_MAP['wind']).toBe('wind');
      expect(ATTRIBUTE_REVERSE_MAP['divine']).toBe('divine');
    });
  });

  describe('CARD_TYPE_REVERSE_MAP', () => {
    it('日本語からカードタイプIDへの変換が正しく行われる', () => {
      expect(CARD_TYPE_REVERSE_MAP['モンスター']).toBe('monster');
      expect(CARD_TYPE_REVERSE_MAP['魔法']).toBe('spell');
      expect(CARD_TYPE_REVERSE_MAP['罠']).toBe('trap');
    });

    it('英語からカードタイプIDへの変換が正しく行われる（自己参照）', () => {
      expect(CARD_TYPE_REVERSE_MAP['monster']).toBe('monster');
      expect(CARD_TYPE_REVERSE_MAP['spell']).toBe('spell');
      expect(CARD_TYPE_REVERSE_MAP['trap']).toBe('trap');
    });

    it('短縮形からカードタイプIDへの変換が正しく行われる', () => {
      expect(CARD_TYPE_REVERSE_MAP['m']).toBe('monster');
      expect(CARD_TYPE_REVERSE_MAP['s']).toBe('spell');
      expect(CARD_TYPE_REVERSE_MAP['t']).toBe('trap');
    });
  });

  describe('MONSTER_TYPE_REVERSE_MAP', () => {
    it('日本語からモンスタータイプIDへの変換が正しく行われる', () => {
      expect(MONSTER_TYPE_REVERSE_MAP['通常']).toBe('normal');
      expect(MONSTER_TYPE_REVERSE_MAP['効果']).toBe('effect');
      expect(MONSTER_TYPE_REVERSE_MAP['融合']).toBe('fusion');
      expect(MONSTER_TYPE_REVERSE_MAP['儀式']).toBe('ritual');
      expect(MONSTER_TYPE_REVERSE_MAP['シンクロ']).toBe('synchro');
      expect(MONSTER_TYPE_REVERSE_MAP['エクシーズ']).toBe('xyz');
      expect(MONSTER_TYPE_REVERSE_MAP['ペンデュラム']).toBe('pendulum');
      expect(MONSTER_TYPE_REVERSE_MAP['リンク']).toBe('link');
      expect(MONSTER_TYPE_REVERSE_MAP['チューナー']).toBe('tuner');
      expect(MONSTER_TYPE_REVERSE_MAP['スピリット']).toBe('spirit');
    });

    it('英語からモンスタータイプIDへの変換が正しく行われる（自己参照）', () => {
      expect(MONSTER_TYPE_REVERSE_MAP['normal']).toBe('normal');
      expect(MONSTER_TYPE_REVERSE_MAP['effect']).toBe('effect');
      expect(MONSTER_TYPE_REVERSE_MAP['fusion']).toBe('fusion');
      expect(MONSTER_TYPE_REVERSE_MAP['ritual']).toBe('ritual');
      expect(MONSTER_TYPE_REVERSE_MAP['synchro']).toBe('synchro');
      expect(MONSTER_TYPE_REVERSE_MAP['xyz']).toBe('xyz');
      expect(MONSTER_TYPE_REVERSE_MAP['pendulum']).toBe('pendulum');
      expect(MONSTER_TYPE_REVERSE_MAP['link']).toBe('link');
      expect(MONSTER_TYPE_REVERSE_MAP['tuner']).toBe('tuner');
      expect(MONSTER_TYPE_REVERSE_MAP['spirit']).toBe('spirit');
    });

    it('表記ゆれ対応が正しく行われる', () => {
      expect(MONSTER_TYPE_REVERSE_MAP['dual']).toBe('gemini');
      expect(MONSTER_TYPE_REVERSE_MAP['reverse']).toBe('flip');
    });
  });
});
