import { describe, it, expect } from 'vitest';
import { toSearchConditionState } from '@/utils/search-exclusion-adapter';
import type { SearchFilters } from '@/types/search-filters';

describe('search-exclusion-adapter', () => {
  const createBaseFilters = (): SearchFilters => ({
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'and',
    linkValues: [],
    linkMarkers: [],
    scaleValues: [],
    levelValues: [],
    def: { exact: false, unknown: false },
    atk: { exact: false, unknown: false },
  });

  describe('toSearchConditionState', () => {
    // [covers:card_type.null_not_added]
    it('基本的な変換ができる', () => {
      const filters = createBaseFilters();
      const result = toSearchConditionState(filters);

      expect(result.monsterTypeMode).toBe('and');
      expect(result.selectedAttributes).toBeInstanceOf(Set);
      expect(result.selectedAttributes.size).toBe(0);
      expect(result.fieldInputs).toBeDefined();
    });

    // [covers:card_type.truthy_adds_attribute]
    it('カードタイプを属性に変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        cardType: '1', // モンスター
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('card-type_1')).toBe(true);
    });

    // [covers:attributes.each_prefixed_and_added]
    it('属性を変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        attributes: ['light', 'dark'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('attribute_light')).toBe(true);
      expect(result.selectedAttributes.has('attribute_dark')).toBe(true);
    });

    // [covers:spell_types.each_prefixed_and_added]
    it('魔法タイプを変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        spellTypes: ['quick-play', 'continuous'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('spell-type_quick-play')).toBe(true);
      expect(result.selectedAttributes.has('spell-type_continuous')).toBe(true);
    });

    // [covers:trap_types.each_prefixed_and_added]
    it('罠タイプを変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        trapTypes: ['counter', 'continuous'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('trap-type_counter')).toBe(true);
      expect(result.selectedAttributes.has('trap-type_continuous')).toBe(true);
    });

    // [covers:races.each_prefixed_and_added]
    it('種族を変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        races: ['dragon', 'spellcaster'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('race_dragon')).toBe(true);
      expect(result.selectedAttributes.has('race_spellcaster')).toBe(true);
    });

    // [covers:monster_types.normal_state_added]
    it('モンスタータイプ（normal状態）を変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        monsterTypes: [
          { type: 'effect', state: 'normal' },
          { type: 'fusion', state: 'normal' },
        ],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('monster-type_effect')).toBe(true);
      expect(result.selectedAttributes.has('monster-type_fusion')).toBe(true);
    });

    // [covers:monster_types.not_state_excluded]
    it('モンスタータイプ（not状態）は属性に含まれない', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        monsterTypes: [
          { type: 'effect', state: 'not' },
          { type: 'fusion', state: 'normal' },
        ],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('monster-type_effect')).toBe(false);
      expect(result.selectedAttributes.has('monster-type_fusion')).toBe(true);
    });

    // [covers:field_inputs.array_length_fields_true_when_nonempty]
    it('リンク値の入力状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        linkValues: [1, 2, 3],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['link-value']).toBe(true);
    });

    it('リンクマーカーの入力状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        linkMarkers: ['top', 'bottom'],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['link-marker']).toBe(true);
    });

    it('Pスケールの入力状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        scaleValues: [1, 2],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['p-scale']).toBe(true);
    });

    it('レベル/ランクの入力状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        levelValues: [4, 7],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['level-rank']).toBe(true);
    });

    // [covers:has_atk_input.exact_true,field_inputs.atk_delegates_to_has_atk_input]
    it('ATK入力（exact）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: true, unknown: false },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    // [covers:has_atk_input.unknown_true]
    it('ATK入力（unknown）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: true },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    // [covers:has_atk_input.min_defined]
    it('ATK入力（min）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: false, min: 2000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    // [covers:has_atk_input.max_defined]
    it('ATK入力（max）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: false, max: 3000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    // [covers:has_def_input.exact_true,field_inputs.def_delegates_to_has_def_input]
    it('DEF入力（exact）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: true, unknown: false },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    // [covers:has_def_input.unknown_true]
    it('DEF入力（unknown）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: false, unknown: true },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    // [covers:has_def_input.min_defined,has_def_input.max_defined]
    it('DEF入力（min/max）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: false, unknown: false, min: 1000, max: 2000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    // [covers:field_inputs.array_length_fields_false_when_empty,has_atk_input.all_absent_false,has_def_input.all_absent_false]
    it('入力なしの項目はfalseになる', () => {
      const filters = createBaseFilters();

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['link-value']).toBe(false);
      expect(result.fieldInputs['link-marker']).toBe(false);
      expect(result.fieldInputs['p-scale']).toBe(false);
      expect(result.fieldInputs['level-rank']).toBe(false);
      expect(result.fieldInputs['def']).toBe(false);
      expect(result.fieldInputs['atk']).toBe(false);
    });

    // [covers:return_value.monster_type_mode_passthrough]
    it('モンスタータイプマッチモードを正しく設定する', () => {
      const filtersAnd: SearchFilters = {
        ...createBaseFilters(),
        monsterTypeMatchMode: 'and',
      };
      const filtersOr: SearchFilters = {
        ...createBaseFilters(),
        monsterTypeMatchMode: 'or',
      };

      const resultAnd = toSearchConditionState(filtersAnd);
      const resultOr = toSearchConditionState(filtersOr);

      expect(resultAnd.monsterTypeMode).toBe('and');
      expect(resultOr.monsterTypeMode).toBe('or');
    });

    // [covers:field_inputs.array_length_fields_true_when_nonempty]
    it('fieldInputsのattribute/race/spell-type/trap-typeも対応配列の有無で判定される', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        attributes: ['light'],
        races: ['dragon'],
        spellTypes: ['quick-play'],
        trapTypes: ['counter'],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['attribute']).toBe(true);
      expect(result.fieldInputs['race']).toBe(true);
      expect(result.fieldInputs['spell-type']).toBe(true);
      expect(result.fieldInputs['trap-type']).toBe(true);
    });

    // [covers:field_inputs.array_length_fields_false_when_empty]
    it('fieldInputsのattribute/race/spell-type/trap-typeは配列が空ならfalseになる', () => {
      const filters = createBaseFilters();

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['attribute']).toBe(false);
      expect(result.fieldInputs['race']).toBe(false);
      expect(result.fieldInputs['spell-type']).toBe(false);
      expect(result.fieldInputs['trap-type']).toBe(false);
    });

    // [covers:field_inputs.monster_type_counts_regardless_of_state]
    it('fieldInputsのmonster-typeはnot状態のみの要素でもtrueになる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        monsterTypes: [{ type: 'tuner', state: 'not' }],
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['monster-type']).toBe(true);
      expect(result.selectedAttributes.has('monster-type_tuner')).toBe(false);
    });

    it('複合的な検索フィルタを変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        cardType: '1',
        attributes: ['light', 'dark'],
        races: ['dragon'],
        monsterTypes: [
          { type: 'effect', state: 'normal' },
          { type: 'tuner', state: 'not' },
        ],
        monsterTypeMatchMode: 'and',
        linkValues: [2, 3],
        levelValues: [4, 7],
        atk: { exact: false, unknown: false, min: 2000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('card-type_1')).toBe(true);
      expect(result.selectedAttributes.has('attribute_light')).toBe(true);
      expect(result.selectedAttributes.has('attribute_dark')).toBe(true);
      expect(result.selectedAttributes.has('race_dragon')).toBe(true);
      expect(result.selectedAttributes.has('monster-type_effect')).toBe(true);
      expect(result.selectedAttributes.has('monster-type_tuner')).toBe(false);
      expect(result.fieldInputs['link-value']).toBe(true);
      expect(result.fieldInputs['level-rank']).toBe(true);
      expect(result.fieldInputs['atk']).toBe(true);
      expect(result.monsterTypeMode).toBe('and');
    });
  });
});
