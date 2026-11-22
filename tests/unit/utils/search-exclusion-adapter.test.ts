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
    it('[covers:card-type.null-not-added] 基本的な変換ができる', () => {
      const filters = createBaseFilters();
      const result = toSearchConditionState(filters);

      expect(result.monsterTypeMode).toBe('and');
      expect(result.selectedAttributes).toBeInstanceOf(Set);
      expect(result.selectedAttributes.size).toBe(0);
      expect(result.fieldInputs).toBeDefined();
    });

    it('[covers:card-type.truthy-adds-attribute] カードタイプを属性に変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        cardType: '1', // モンスター
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('card-type_1')).toBe(true);
    });

    it('[covers:attributes.each-prefixed-and-added] 属性を変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        attributes: ['light', 'dark'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('attribute_light')).toBe(true);
      expect(result.selectedAttributes.has('attribute_dark')).toBe(true);
    });

    it('[covers:spell-types.each-prefixed-and-added] 魔法タイプを変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        spellTypes: ['quick-play', 'continuous'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('spell-type_quick-play')).toBe(true);
      expect(result.selectedAttributes.has('spell-type_continuous')).toBe(true);
    });

    it('[covers:trap-types.each-prefixed-and-added] 罠タイプを変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        trapTypes: ['counter', 'continuous'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('trap-type_counter')).toBe(true);
      expect(result.selectedAttributes.has('trap-type_continuous')).toBe(true);
    });

    it('[covers:races.each-prefixed-and-added] 種族を変換できる', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        races: ['dragon', 'spellcaster'],
      };

      const result = toSearchConditionState(filters);

      expect(result.selectedAttributes.has('race_dragon')).toBe(true);
      expect(result.selectedAttributes.has('race_spellcaster')).toBe(true);
    });

    it('[covers:monster-types.normal-state-added] モンスタータイプ（normal状態）を変換できる', () => {
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

    it('[covers:monster-types.not-state-excluded] モンスタータイプ（not状態）は属性に含まれない', () => {
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

    it('[covers:field-inputs.array-length-fields-true-when-nonempty] リンク値の入力状況を正しく判定する', () => {
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

    it('[covers:has-atk-input.exact-true,field-inputs.atk-delegates-to-has-atk-input] ATK入力（exact）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: true, unknown: false },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    it('[covers:has-atk-input.unknown-true] ATK入力（unknown）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: true },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    it('[covers:has-atk-input.min-defined] ATK入力（min）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: false, min: 2000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    it('[covers:has-atk-input.max-defined] ATK入力（max）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        atk: { exact: false, unknown: false, max: 3000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['atk']).toBe(true);
    });

    it('[covers:has-def-input.exact-true,field-inputs.def-delegates-to-has-def-input] DEF入力（exact）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: true, unknown: false },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    it('[covers:has-def-input.unknown-true] DEF入力（unknown）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: false, unknown: true },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    it('[covers:has-def-input.min-defined,has-def-input.max-defined] DEF入力（min/max）の状況を正しく判定する', () => {
      const filters: SearchFilters = {
        ...createBaseFilters(),
        def: { exact: false, unknown: false, min: 1000, max: 2000 },
      };

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['def']).toBe(true);
    });

    it('[covers:field-inputs.array-length-fields-false-when-empty,has-atk-input.all-absent-false,has-def-input.all-absent-false] 入力なしの項目はfalseになる', () => {
      const filters = createBaseFilters();

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['link-value']).toBe(false);
      expect(result.fieldInputs['link-marker']).toBe(false);
      expect(result.fieldInputs['p-scale']).toBe(false);
      expect(result.fieldInputs['level-rank']).toBe(false);
      expect(result.fieldInputs['def']).toBe(false);
      expect(result.fieldInputs['atk']).toBe(false);
    });

    it('[covers:return-value.monster-type-mode-passthrough] モンスタータイプマッチモードを正しく設定する', () => {
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

    it('[covers:field-inputs.array-length-fields-true-when-nonempty] fieldInputsのattribute/race/spell-type/trap-typeも対応配列の有無で判定される', () => {
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

    it('[covers:field-inputs.array-length-fields-false-when-empty] fieldInputsのattribute/race/spell-type/trap-typeは配列が空ならfalseになる', () => {
      const filters = createBaseFilters();

      const result = toSearchConditionState(filters);

      expect(result.fieldInputs['attribute']).toBe(false);
      expect(result.fieldInputs['race']).toBe(false);
      expect(result.fieldInputs['spell-type']).toBe(false);
      expect(result.fieldInputs['trap-type']).toBe(false);
    });

    it('[covers:field-inputs.monster-type-counts-regardless-of-state] fieldInputsのmonster-typeはnot状態のみの要素でもtrueになる', () => {
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

  // 以下、src/utils/__tests__/search-exclusion-adapter.test.ts (TASK-478) から移植。
  // 同ファイルの残り検証（fieldInputs/selectedAttributesの各フィールド・複合条件・
  // monsterTypeMode）はtests/unit側の既存テストが同趣旨を網羅していたため移植対象外。

  it('monsterTypesが空のとき、fieldInputsの"monster-type"はfalseになる [covers:field-inputs.monster-type-false-when-empty]', () => {
    const result = toSearchConditionState(createBaseFilters());

    expect(result.fieldInputs['monster-type']).toBe(false);
  });
});
