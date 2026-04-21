import { describe, it, expect } from 'vitest';
import { toSearchConditionState } from '../search-exclusion-adapter';
import type { SearchFilters } from '../../types/search-filters';

describe('search-exclusion-adapter: toSearchConditionState', () => {
  describe('fieldInputs - monster-type フィールド', () => {
    it('monsterTypes が選択されたとき、fieldInputs に "monster-type" が含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.fieldInputs['monster-type']).toBe(true);
    });

    it('monsterTypes が空のとき、fieldInputs["monster-type"] は false であること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.fieldInputs['monster-type']).toBe(false);
    });

    it('spellTypes が選択されたとき、fieldInputs に "spell-type" が含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: ['normal', 'quick'],
        trapTypes: [],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.fieldInputs['spell-type']).toBe(true);
    });

    it('trapTypes が選択されたとき、fieldInputs に "trap-type" が含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: ['normal', 'counter'],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.fieldInputs['trap-type']).toBe(true);
    });
  });

  describe('selectedAttributes - monster-type 属性', () => {
    it('state が "normal" の monsterType は selectedAttributes に含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.selectedAttributes.has('monster-type_fusion')).toBe(true);
    });

    it('state が "not" の monsterType は selectedAttributes に含まれないこと', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [{ type: 'fusion', state: 'not' }],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.selectedAttributes.has('monster-type_fusion')).toBe(false);
    });

    it('複数の monsterTypes (state: "normal") が selectedAttributes に含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [
          { type: 'fusion', state: 'normal' },
          { type: 'synchro', state: 'normal' },
          { type: 'xyz', state: 'normal' }
        ],
        monsterTypeMatchMode: 'and',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.selectedAttributes.has('monster-type_fusion')).toBe(true);
      expect(state.selectedAttributes.has('monster-type_synchro')).toBe(true);
      expect(state.selectedAttributes.has('monster-type_xyz')).toBe(true);
    });

    it('spellTypes が selectedAttributes に含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: ['normal', 'quick'],
        trapTypes: [],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.selectedAttributes.has('spell-type_normal')).toBe(true);
      expect(state.selectedAttributes.has('spell-type_quick')).toBe(true);
    });

    it('trapTypes が selectedAttributes に含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: ['normal', 'counter'],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.selectedAttributes.has('trap-type_normal')).toBe(true);
      expect(state.selectedAttributes.has('trap-type_counter')).toBe(true);
    });
  });

  describe('複合条件', () => {
    it('monsterType と spell-type が同時に選択される場合、両方が含まれること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: ['normal'],
        trapTypes: [],
        races: [],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      // selectedAttributes には両方が含まれるべき
      expect(state.selectedAttributes.has('monster-type_fusion')).toBe(true);
      expect(state.selectedAttributes.has('spell-type_normal')).toBe(true);

      // fieldInputs にも両方が true であるべき
      expect(state.fieldInputs['monster-type']).toBe(true);
      expect(state.fieldInputs['spell-type']).toBe(true);
    });

    it('monsterTypeMode が正しく設定されること', () => {
      const filters: SearchFilters = {
        cardType: null,
        attributes: [],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'and',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const state = toSearchConditionState(filters);

      expect(state.monsterTypeMode).toBe('and');
    });
  });
});
