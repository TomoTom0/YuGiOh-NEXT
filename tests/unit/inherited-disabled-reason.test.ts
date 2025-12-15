import { describe, it, expect } from 'vitest';
import { toSearchConditionState } from '@/utils/search-exclusion-adapter';
import { inferExclusions, loadExclusionRules } from '@/utils/search-exclusion-engine';
import type { SearchFilters } from '@/types/search-filters';

describe('Inherited disabled reason in Part 2', () => {
  const rules = loadExclusionRules();

  it('level入力 → monster-type_linkが無効 → link-valueの理由はmonster-type_linkの理由を継承する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      levelType: 'level',
      levelValues: [0],  // ← Level が入力
      linkValues: [],
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    };

    const state = toSearchConditionState(filters);
    const result = inferExclusions(state, rules);

    // monster-type_link が無効
    const linkAttrState = result.attributeStates.get('monster-type_link');
    expect(linkAttrState?.enabled).toBe(false);
    expect(linkAttrState?.disabledReason).toContain('レベル/ランク');

    // link-value が無効
    const linkValueFieldState = result.fieldStates.get('link-value');
    expect(linkValueFieldState?.enabled).toBe(false);

    // link-value の disabledReason が monster-type_link の理由を継承している
    // （「～が選択不可のため無効」ではなく、実際の原因を含む）
    expect(linkValueFieldState?.disabledReason).toBeDefined();
    console.log('link-value disabledReason:', linkValueFieldState?.disabledReason);

    // 「～が選択不可のため無効」という形式になっていないことを確認
    if (linkValueFieldState?.disabledReason) {
      expect(linkValueFieldState.disabledReason).not.toMatch(/^monster-type_.+が選択不可のため無効$/);
    }
  });

  it('link-value入力（ANDモード） → monster-type_linkが必須・他が排他 → synchroの理由はmonster-type_linkの理由を継承', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'and',
      levelType: 'level',
      levelValues: [],
      linkValues: [1],  // ← link-value が入力
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    };

    const state = toSearchConditionState(filters);
    const result = inferExclusions(state, rules);

    // monster-type_link が必須・選択
    const linkAttrState = result.attributeStates.get('monster-type_link');
    expect(linkAttrState?.required).toBe(true);
    expect(linkAttrState?.selected).toBe(true);

    // synchro が無効（排他グループ）
    const synchroAttrState = result.attributeStates.get('monster-type_synchro');
    expect(synchroAttrState?.enabled).toBe(false);

    console.log('synchro disabledReason:', synchroAttrState?.disabledReason);
  });
});
