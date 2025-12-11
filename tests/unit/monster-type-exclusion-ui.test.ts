import { describe, it, expect } from 'vitest';
import { toSearchConditionState } from '@/utils/search-exclusion-adapter';
import { inferExclusions, loadExclusionRules } from '@/utils/search-exclusion-engine';
import type { SearchFilters } from '@/types/search-filters';

describe('Monster Type 属性の無効化', () => {
  const rules = loadExclusionRules();

  it('level-rankが入力されると、monster-type_linkが無効化される', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      levelType: 'level',
      levelValues: [0],
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

    // monster-type_link が attributeStates に存在し、disabled であること
    const linkAttrState = result.attributeStates.get('monster-type_link');
    expect(linkAttrState).toBeDefined();
    expect(linkAttrState?.enabled).toBe(false);
  });

  it('link-valueが入力されると、ANDモードで他のmonster-typeが無効化される', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'and',  // ← ANDモード
      levelType: 'level',
      levelValues: [],
      linkValues: [1],  // ← Link数が入力
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    };

    const state = toSearchConditionState(filters);
    const result = inferExclusions(state, rules);

    // link-value入力 → monster-type_link が必須になる
    const linkAttrState = result.attributeStates.get('monster-type_link');
    expect(linkAttrState?.required).toBe(true);
    expect(linkAttrState?.selected).toBe(true);

    // ANDモードなので、他の属性（normal, fusion, synchro等）が無効化される
    expect(result.attributeStates.get('monster-type_normal')?.enabled).toBe(false);
    expect(result.attributeStates.get('monster-type_fusion')?.enabled).toBe(false);
    expect(result.attributeStates.get('monster-type_synchro')?.enabled).toBe(false);
  });

  it('link-markerが入力されると、ANDモードで他のmonster-typeが無効化される', () => {
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
      linkValues: [],
      scaleValues: [],
      linkMarkers: [1],  // ← Link marker が入力
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    };

    const state = toSearchConditionState(filters);
    const result = inferExclusions(state, rules);

    // link-marker入力 → monster-type_link が必須になる
    const linkAttrState = result.attributeStates.get('monster-type_link');
    expect(linkAttrState?.required).toBe(true);

    // ANDモードなので、他の属性が無効化される
    expect(result.attributeStates.get('monster-type_synchro')?.enabled).toBe(false);
  });
});
