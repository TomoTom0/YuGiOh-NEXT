import { describe, it, expect } from 'vitest';
import { convertFiltersToIcons } from '../../../src/utils/filter-icons';
import type { SearchFilters } from '../../../src/types/search-filters';

describe('convertFiltersToIcons', () => {
  it('空のフィルターの場合、空の配列を返す', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([]);
  });

  it('カードタイプのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: 'monster',
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'cardType', label: 'M' }]);
  });

  it('属性のアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: ['light', 'dark'],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([
      { type: 'attr', label: '光' },
      { type: 'attr', label: '闇' }
    ]);
  });

  it('種族のアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: ['dragon', 'spellcaster'],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toContainEqual({ type: 'race', label: expect.any(String) });
    expect(result.length).toBe(2);
  });

  it('レベル範囲のアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [4, 5, 6],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'level', label: '★4-6' }]);
  });

  it('ATKのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { exact: true, unknown: false, min: 2500 },
      def: { exact: false, unknown: false },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'atk', label: 'ATK=2500' }]);
  });

  it('DEFのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false, min: 2000 },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'def', label: 'DEF≥2000' }]);
  });

  it('モンスタータイプのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [
        { type: 'fusion', state: 'include' },
        { type: 'synchro', state: 'include' }
      ],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([
      { type: 'monsterType', label: '融' },
      { type: 'monsterType', label: 'S' }
    ]);
  });

  it('リンク数のアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [2, 3, 4],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'link', label: 'L2-4' }]);
  });

  it('ペンデュラムスケールのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [1, 13],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([{ type: 'scale', label: 'PS1,13' }]);
  });

  it('リンクマーカーのアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [1, 2, 3],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { type: 'any' },
      def: { type: 'any' },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toContainEqual({ type: 'linkMarker', label: expect.any(String) });
  });

  it('複数のフィルターを組み合わせた場合、正しい順序でアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: 'monster',
      attributes: ['light'],
      races: ['dragon'],
      levelValues: [8],
      levelType: 'level',
      monsterTypes: [{ type: 'synchro', state: 'include' }],
      monsterTypeMatchMode: 'or',
      linkValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      scaleValues: [],
      spellTypes: [],
      trapTypes: [],
      atk: { exact: true, unknown: false, min: 3000 },
      def: { exact: false, unknown: false },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result[0]).toEqual({ type: 'cardType', label: 'M' });
    expect(result[1]).toEqual({ type: 'attr', label: '光' });
    expect(result).toContainEqual({ type: 'race', label: expect.any(String) });
    expect(result).toContainEqual({ type: 'level', label: '★8' });
    expect(result).toContainEqual({ type: 'atk', label: 'ATK=3000' });
    expect(result).toContainEqual({ type: 'monsterType', label: 'S' });
  });
});
