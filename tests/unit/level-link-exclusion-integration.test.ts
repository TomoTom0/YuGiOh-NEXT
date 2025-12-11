import { describe, it, expect } from 'vitest';
import { toSearchConditionState } from '@/utils/search-exclusion-adapter';
import { inferExclusions, loadExclusionRules } from '@/utils/search-exclusion-engine';
import type { SearchFilters } from '@/types/search-filters';

describe('統合テスト: level 入力 → link が無効化される', () => {
  const rules = loadExclusionRules();

  it('filters に levelValues を入力 → exclusion result で link-value/marker が disabled', () => {
    // Setup: level 0 が選択された状態のfilters
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      levelType: 'level',
      levelValues: [0],  // ← Level 0 が入力された
      linkValues: [],
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    };

    // Step 1: filters → state 変換
    const state = toSearchConditionState(filters);

    // Verify step 1: level-rank が true になっているか
    expect(state.fieldInputs['level-rank']).toBe(true);

    // Step 2: engine で推論実行
    const result = inferExclusions(state, rules);

    // Verify step 2: monster-type_link が無効化されているか
    expect(result.attributeStates.get('monster-type_link')?.enabled).toBe(false);

    // Verify step 2b: link-value と link-marker が無効化されているか
    expect(result.fieldStates.get('link-value')?.enabled).toBe(false);
    expect(result.fieldStates.get('link-marker')?.enabled).toBe(false);
  });
});
