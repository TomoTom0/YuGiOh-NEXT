import { describe, it, expect, vi } from 'vitest';
import { formatDisabledReason } from '../../../src/utils/disabled-reason-formatter';

// mappingManager をモック
vi.mock('../../../src/utils/mapping-manager', () => ({
  mappingManager: {
    getMonsterTypeIdToText: vi.fn(() => ({
      fusion: '融合',
      synchro: 'シンクロ',
      xyz: 'エクシーズ',
      link: 'リンク',
      normal: '通常',
      effect: '効果',
    })),
    getAttributeIdToText: vi.fn(() => ({
      light: '光',
      dark: '闇',
      water: '水',
      fire: '炎',
      earth: '地',
      wind: '風',
      divine: '神',
    })),
    getRaceIdToText: vi.fn(() => ({
      dragon: 'ドラゴン',
      warrior: '戦士',
      spellcaster: '魔法使い',
      zombie: 'アンデット',
    })),
  },
}));

describe('disabled-reason-formatter', () => {
  describe('formatDisabledReason - field-to-attribute', () => {
    it('単一フィールドの場合正しくフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', 'level-rank');
      expect(result).toBe('レベル/ランクが選択/入力されているため');
    });

    it('複数フィールドの場合カンマ区切りでフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', ['level-rank', 'def']);
      expect(result).toBe('レベル/ランク、DEFが選択/入力されているため');
    });

    it('複数フィールド（3つ）の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', ['atk', 'def', 'level-rank']);
      expect(result).toBe('ATK、DEF、レベル/ランクが選択/入力されているため');
    });

    it('未知のフィールド名の場合そのまま表示する', () => {
      const result = formatDisabledReason('field-to-attribute', 'unknown-field');
      expect(result).toBe('unknown-fieldが選択/入力されているため');
    });
  });

  describe('formatDisabledReason - attribute-exclusion', () => {
    it('monster-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'monster-type_fusion');
      expect(result).toBe('融合が選択されているため');
    });

    it('card-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'card-type_spell');
      expect(result).toBe('魔法が選択されているため');
    });

    it('attribute_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'attribute_water');
      expect(result).toBe('水が選択されているため');
    });

    it('race_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'race_dragon');
      expect(result).toBe('ドラゴンが選択されているため');
    });

    it('spell-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'spell-type_quick');
      expect(result).toBe('速攻魔法が選択されているため');
    });

    it('trap-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'trap-type_counter');
      expect(result).toBe('カウンター罠が選択されているため');
    });
  });

  describe('formatDisabledReason - attribute-unavailable', () => {
    it('monster-type_link の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-unavailable', 'monster-type_link');
      expect(result).toBe('リンクが選択されているため');
    });

    it('attribute_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-unavailable', 'attribute_dark');
      expect(result).toBe('闇が選択されているため');
    });

    it('配列形式の場合最初の要素を使用する', () => {
      const result = formatDisabledReason('attribute-unavailable', [
        'monster-type_synchro',
        'monster-type_xyz',
      ]);
      expect(result).toBe('シンクロが選択されているため');
    });
  });

  describe('formatDisabledReason - attribute-to-field', () => {
    it('monster-type_link の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'monster-type_link');
      expect(result).toBe('リンクが選択されているため');
    });

    it('card-type_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'card-type_trap');
      expect(result).toBe('罠が選択されているため');
    });

    it('race_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'race_warrior');
      expect(result).toBe('戦士が選択されているため');
    });
  });

  describe('formatDisabledReason - unknown type', () => {
    it('未知のタイプの場合空文字列を返す', () => {
      const result = formatDisabledReason('unknown-type' as any, 'some-value');
      expect(result).toBe('');
    });
  });
});
