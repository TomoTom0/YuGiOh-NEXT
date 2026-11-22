import { describe, it, expect } from 'vitest';
import { convertFiltersToIcons } from '../../../src/utils/filter-icons';
import type { SearchFilters } from '../../../src/types/search-filters';
import type { CardType, Attribute, MonsterType } from '../../../src/types/card-maps';

// tests/design/filter-icons/conditions.toml と対応。
// 各テストのコメントに [covers:<id>] を付与し、どの条件をカバーしているかを明示する。

describe('convertFiltersToIcons', () => {
  it('[covers:convert-filters-to-icons.all-empty-returns-empty-array] 空のフィルターの場合、空の配列を返す', () => {
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

  it('[covers:convert-filters-to-icons.card-type-present-pushes-mapped-icon] カードタイプのアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'cardType', label: 'M', value: 'monster' }]);
  });

  it('[covers:convert-filters-to-icons.card-type-unmapped-fallback] CARD_TYPE_ID_TO_SHORTNAMEに無いカードタイプは生値をlabelにフォールバックする', () => {
    const filters: SearchFilters = {
      cardType: 'unknown' as unknown as CardType,
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
    expect(result).toEqual([{ type: 'cardType', label: 'unknown', value: 'unknown' }]);
  });

  it('[covers:convert-filters-to-icons.spell-types-each-produces-icon-in-order] 魔法タイプのアイコンを配列順に生成する', () => {
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
      spellTypes: ['normal', 'quick'],
      trapTypes: [],
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([
      { type: 'spellType', label: '通常', value: 'normal' },
      { type: 'spellType', label: '速攻', value: 'quick' }
    ]);
  });

  it('[covers:convert-filters-to-icons.trap-types-each-produces-icon-in-order] 罠タイプのアイコンを配列順に生成する', () => {
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
      trapTypes: ['normal', 'counter'],
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: { from: '', to: '' }
    };

    const result = convertFiltersToIcons(filters);
    expect(result).toEqual([
      { type: 'trapType', label: '通常', value: 'normal' },
      { type: 'trapType', label: 'カウンター', value: 'counter' }
    ]);
  });

  it('[covers:convert-filters-to-icons.attributes-each-produces-mapped-icon] 属性のアイコンを生成する', () => {
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
      { type: 'attr', label: '光', value: 'light' },
      { type: 'attr', label: '闇', value: 'dark' }
    ]);
  });

  it('[covers:convert-filters-to-icons.attribute-unmapped-fallback] ATTRIBUTE_ID_TO_NAMEに無い属性は生値をlabelにフォールバックする', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: ['unknownAttr'] as unknown as Attribute[],
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
    expect(result).toEqual([{ type: 'attr', label: 'unknownAttr', value: 'unknownAttr' }]);
  });

  it('[covers:convert-filters-to-icons.races-each-produces-icon] 種族のアイコンを生成する', () => {
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
    expect(result).toContainEqual({ type: 'race', label: expect.any(String), value: expect.any(String) });
    expect(result.length).toBe(2);
  });

  it('[covers:convert-filters-to-icons.level-values-present-pushes-range-icon] レベル範囲のアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'level', label: '★4-6', value: 'all' }]);
  });

  it('[covers:convert-filters-to-icons.level-values-empty-no-icon] レベル範囲未指定の場合、levelアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'level')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.atk-label-present-pushes-icon] ATKのアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'atk', label: 'ATK=2500', value: 'atk' }]);
  });

  it('[covers:convert-filters-to-icons.atk-label-null-no-icon] ATK条件なしの場合、atkアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'atk')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.def-label-present-pushes-icon] DEFのアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'def', label: 'DEF≥2000', value: 'def' }]);
  });

  it('[covers:convert-filters-to-icons.def-label-null-no-icon] DEF条件なしの場合、defアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'def')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.monster-types-each-is-not-false-when-normal] モンスタータイプのアイコンを生成する（state=normalはisNot=false）', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [
        { type: 'fusion', state: 'normal' },
        { type: 'synchro', state: 'normal' }
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
      { type: 'mtype', label: '融', value: 'fusion', isNot: false },
      { type: 'mtype', label: 'S', value: 'synchro', isNot: false }
    ]);
  });

  it('[covers:convert-filters-to-icons.monster-types-is-not-true-when-state-not] モンスタータイプのstateがnotの場合、isNot=trueになる', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [{ type: 'xyz', state: 'not' }],
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
    expect(result).toEqual([{ type: 'mtype', label: 'X', value: 'xyz', isNot: true }]);
  });

  it('[covers:convert-filters-to-icons.monster-type-unmapped-fallback-first-char] MONSTER_TYPE_ID_TO_SHORTNAMEに無いモンスタータイプは先頭1文字をlabelにフォールバックする', () => {
    const filters: SearchFilters = {
      cardType: null,
      attributes: [],
      races: [],
      levelValues: [],
      levelType: 'level',
      monsterTypes: [{ type: 'unknownType' as unknown as MonsterType, state: 'normal' }],
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
    expect(result).toEqual([{ type: 'mtype', label: 'u', value: 'unknownType', isNot: false }]);
  });

  it('[covers:convert-filters-to-icons.link-values-present-pushes-range-icon] リンク数のアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'link', label: 'L2-4', value: 'all' }]);
  });

  it('[covers:convert-filters-to-icons.link-values-empty-no-icon] リンク数未指定の場合、linkアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'link')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.scale-values-present-pushes-range-icon] ペンデュラムスケールのアイコンを生成する', () => {
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
    expect(result).toEqual([{ type: 'scale', label: 'PS1,13', value: 'all' }]);
  });

  it('[covers:convert-filters-to-icons.scale-values-empty-no-icon] ペンデュラムスケール未指定の場合、scaleアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'scale')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.link-markers-present-pushes-icon] リンクマーカーのアイコンを生成する', () => {
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
    expect(result).toContainEqual({ type: 'linkMarker', label: expect.any(String), value: 'all' });
  });

  it('[covers:convert-filters-to-icons.link-markers-empty-no-icon] リンクマーカー未指定の場合、linkMarkerアイコンを含まない', () => {
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
    expect(result.some(icon => icon.type === 'linkMarker')).toBe(false);
  });

  it('[covers:convert-filters-to-icons.icons-pushed-in-fixed-source-order] 複数のフィルターを組み合わせた場合、正しい順序でアイコンを生成する', () => {
    const filters: SearchFilters = {
      cardType: 'monster',
      attributes: ['light'],
      races: ['dragon'],
      levelValues: [8],
      levelType: 'level',
      monsterTypes: [{ type: 'synchro', state: 'normal' }],
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
    // pushの実装順: cardType -> spellType -> trapType -> attr -> race -> level -> atk -> def -> mtype -> link -> scale -> linkMarker
    expect(result.map(icon => icon.type)).toEqual(['cardType', 'attr', 'race', 'level', 'atk', 'mtype']);
    expect(result[0]).toEqual({ type: 'cardType', label: 'M', value: 'monster' });
    expect(result[1]).toEqual({ type: 'attr', label: '光', value: 'light' });
    expect(result).toContainEqual({ type: 'race', label: expect.any(String), value: expect.any(String) });
    expect(result).toContainEqual({ type: 'level', label: '★8', value: 'all' });
    expect(result).toContainEqual({ type: 'atk', label: 'ATK=3000', value: 'atk' });
    expect(result).toContainEqual({ type: 'mtype', label: 'S', value: 'synchro', isNot: false });
  });
});
