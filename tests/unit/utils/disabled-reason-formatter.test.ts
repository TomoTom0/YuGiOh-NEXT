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
    // [covers:format.field_to_attribute_string_source] [covers:field_label.found]
    it('単一フィールドの場合正しくフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', 'level-rank');
      expect(result).toBe('レベル/ランクが選択/入力されているため');
    });

    // [covers:format.field_to_attribute_multi_array_joined]
    it('複数フィールドの場合カンマ区切りでフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', ['level-rank', 'def']);
      expect(result).toBe('レベル/ランク、DEFが選択/入力されているため');
    });

    // [covers:format.field_to_attribute_multi_array_joined]
    it('複数フィールド（3つ）の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('field-to-attribute', ['atk', 'def', 'level-rank']);
      expect(result).toBe('ATK、DEF、レベル/ランクが選択/入力されているため');
    });

    // [covers:field_label.not_found_fallback_to_raw_field_name]
    it('未知のフィールド名の場合そのまま表示する', () => {
      const result = formatDisabledReason('field-to-attribute', 'unknown-field');
      expect(result).toBe('unknown-fieldが選択/入力されているため');
    });

    // [covers:format.field_to_attribute_single_element_array]
    it('1要素の配列の場合、文字列指定時と同じ単一フォーマットになる', () => {
      const result = formatDisabledReason('field-to-attribute', ['atk']);
      expect(result).toBe('ATKが選択/入力されているため');
    });

    // [covers:format.field_to_attribute_empty_array_boundary]
    it('空配列の場合、labels[0]がundefinedになりそのまま文字列連結される（バウンダリ挙動）', () => {
      const result = formatDisabledReason('field-to-attribute', []);
      expect(result).toBe('undefinedが選択/入力されているため');
    });
  });

  describe('formatDisabledReason - attribute-exclusion', () => {
    // [covers:format.attribute_exclusion_string_source] [covers:attr_label.monster_type_found]
    it('monster-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'monster-type_fusion');
      expect(result).toBe('融合が選択されているため');
    });

    // [covers:attr_label.card_type_found]
    it('card-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'card-type_spell');
      expect(result).toBe('魔法が選択されているため');
    });

    // [covers:attr_label.attribute_found]
    it('attribute_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'attribute_water');
      expect(result).toBe('水が選択されているため');
    });

    // [covers:attr_label.race_found]
    it('race_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'race_dragon');
      expect(result).toBe('ドラゴンが選択されているため');
    });

    // [covers:attr_label.spell_type_found]
    it('spell-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'spell-type_quick');
      expect(result).toBe('速攻魔法が選択されているため');
    });

    // [covers:attr_label.trap_type_found]
    it('trap-type_* 形式の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-exclusion', 'trap-type_counter');
      expect(result).toBe('カウンター罠が選択されているため');
    });

    // [covers:format.attribute_exclusion_array_source_first_element]
    it('配列形式の場合最初の要素を使用する（2番目以降は無視）', () => {
      const result = formatDisabledReason('attribute-exclusion', [
        'card-type_spell',
        'card-type_trap',
      ]);
      expect(result).toBe('魔法が選択されているため');
    });

    // [covers:format.attribute_exclusion_empty_array_boundary]
    it('空配列の場合、attrIdが空文字にフォールバックし接頭辞なしの固定文言になる', () => {
      const result = formatDisabledReason('attribute-exclusion', []);
      expect(result).toBe('が選択されているため');
    });
  });

  describe('formatDisabledReason - attribute-unavailable', () => {
    // [covers:format.attribute_unavailable_string_source]
    it('monster-type_link の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-unavailable', 'monster-type_link');
      expect(result).toBe('リンクが選択されているため');
    });

    // [covers:format.attribute_unavailable_string_source]
    it('attribute_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-unavailable', 'attribute_dark');
      expect(result).toBe('闇が選択されているため');
    });

    // [covers:format.attribute_unavailable_array_source_first_element]
    it('配列形式の場合最初の要素を使用する', () => {
      const result = formatDisabledReason('attribute-unavailable', [
        'monster-type_synchro',
        'monster-type_xyz',
      ]);
      expect(result).toBe('シンクロが選択されているため');
    });

    // [covers:format.attribute_unavailable_empty_array_boundary]
    it('空配列の場合、attrIdが空文字にフォールバックし接頭辞なしの固定文言になる', () => {
      const result = formatDisabledReason('attribute-unavailable', []);
      expect(result).toBe('が選択されているため');
    });
  });

  describe('formatDisabledReason - attribute-to-field', () => {
    // [covers:format.attribute_to_field_string_source]
    it('monster-type_link の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'monster-type_link');
      expect(result).toBe('リンクが選択されているため');
    });

    // [covers:format.attribute_to_field_string_source]
    it('card-type_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'card-type_trap');
      expect(result).toBe('罠が選択されているため');
    });

    // [covers:format.attribute_to_field_string_source]
    it('race_* の場合正しくフォーマットする', () => {
      const result = formatDisabledReason('attribute-to-field', 'race_warrior');
      expect(result).toBe('戦士が選択されているため');
    });

    // [covers:format.attribute_to_field_array_source_first_element]
    it('配列形式の場合最初の要素を使用する（2番目以降は無視）', () => {
      const result = formatDisabledReason('attribute-to-field', [
        'race_warrior',
        'race_dragon',
      ]);
      expect(result).toBe('戦士が選択されているため');
    });

    // [covers:format.attribute_to_field_empty_array_boundary]
    it('空配列の場合、attrIdが空文字にフォールバックし接頭辞なしの固定文言になる', () => {
      const result = formatDisabledReason('attribute-to-field', []);
      expect(result).toBe('が選択されているため');
    });
  });

  describe('formatDisabledReason - unknown type', () => {
    // [covers:format.unknown_type_returns_empty_string]
    it('未知のタイプの場合空文字列を返す', () => {
      const result = formatDisabledReason('unknown-type' as any, 'some-value');
      expect(result).toBe('');
    });
  });

  describe('getAttributeDisplayLabel のフォールバック（formatDisabledReason経由）', () => {
    // [covers:attr_label.monster_type_not_found_fallback_to_raw_type]
    it('monster-type_* でmapにない値の場合、typeそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'monster-type_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.card_type_not_found_fallback_to_raw_type]
    it('card-type_* でローカルmapにない値の場合、typeそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'card-type_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.attribute_not_found_fallback_to_raw_attr]
    it('attribute_* でmapにない値の場合、attrそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'attribute_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.race_not_found_fallback_to_raw_race]
    it('race_* でmapにない値の場合、raceそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'race_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.spell_type_not_found_fallback_to_raw_type]
    it('spell-type_* でローカルmapにない値の場合、typeそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'spell-type_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.trap_type_not_found_fallback_to_raw_type]
    it('trap-type_* でローカルmapにない値の場合、typeそのままを表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'trap-type_unknown');
      expect(result).toBe('unknownが選択されているため');
    });

    // [covers:attr_label.no_match_returns_raw_attr_id]
    it('いずれの形式にもマッチしない場合、attrIdをそのまま表示する', () => {
      const result = formatDisabledReason('attribute-exclusion', 'unknown-format');
      expect(result).toBe('unknown-formatが選択されているため');
    });
  });
});
