import { describe, it, expect } from 'vitest';
import { buildSearchOptions } from '@/utils/search-options-builder';
import type { SearchFilters } from '@/types/search-filters';
import type { SortOrder } from '@/types/settings';

/**
 * tests/design/search-options-builder/conditions.toml の各[[condition]]をカバーする。
 * テスト名の[covers:<id>]タグでconditions.tomlのidと対応付ける。
 */

function baseFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
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
    releaseDate: {},
    ...overrides,
  };
}

describe('search-options-builder / buildSearchOptions', () => {
  it('[covers:sort.known_order_maps_to_api_value] SORT_ORDER_TO_API_VALUEに存在するsortOrderはAPI値にマップされる', () => {
    const result = buildSearchOptions('カード', '1', 'atk_desc', baseFilters());
    expect(result.sort).toBe(4);
  });

  it('[covers:sort.unknown_order_falls_back_to_1] マップに存在しないsortOrderはsort=1にフォールバックする', () => {
    const invalidSortOrder = 'invalid_order' as unknown as SortOrder;
    const result = buildSearchOptions('カード', '1', invalidSortOrder, baseFilters());
    expect(result.sort).toBe(1);
  });

  it('[covers:base.always_includes_keyword_searchtype_resultsperpage] デフォルトfiltersではkeyword/searchType/resultsPerPage/sortのみを持つ', () => {
    const result = buildSearchOptions('青眼', '2', 'name_asc', baseFilters());
    expect(result).toEqual({
      keyword: '青眼',
      searchType: '2',
      resultsPerPage: 100,
      sort: 1,
    });
  });

  it('[covers:card_type.set_when_truthy] cardTypeが指定されている場合はsearchOptions.cardTypeに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ cardType: 'monster' }));
    expect(result.cardType).toBe('monster');
  });

  it('[covers:card_type.omitted_when_null] cardTypeがnullの場合はプロパティ自体が存在しない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ cardType: null }));
    expect('cardType' in result).toBe(false);
  });

  it('[covers:attributes.set_when_non_empty] attributesが1件以上ある場合はそのまま設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ attributes: ['light', 'dark'] }));
    expect(result.attributes).toEqual(['light', 'dark']);
  });

  it('[covers:attributes.omitted_when_empty] attributesが空配列の場合は設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ attributes: [] }));
    expect('attributes' in result).toBe(false);
  });

  it('[covers:races.set_when_non_empty] racesが1件以上ある場合はそのまま設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ races: ['dragon'] }));
    expect(result.races).toEqual(['dragon']);
  });

  it('[covers:races.omitted_when_empty] racesが空配列の場合は設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ races: [] }));
    expect('races' in result).toBe(false);
  });

  it('[covers:levels.set_when_non_empty] levelValuesが1件以上ある場合はlevelsに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ levelValues: [4, 8] }));
    expect(result.levels).toEqual([4, 8]);
  });

  it('[covers:levels.omitted_when_empty] levelValuesが空配列の場合はlevelsは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ levelValues: [] }));
    expect('levels' in result).toBe(false);
  });

  it('[covers:atk.set_when_min_defined] atk.minが定義済みの場合はatk={from,to}が設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: false, unknown: false, min: 1000, max: undefined } })
    );
    expect(result.atk).toEqual({ from: 1000, to: undefined });
  });

  it('[covers:atk.set_when_max_defined] atk.maxのみ定義済みの場合もatkが設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: false, unknown: false, min: undefined, max: 2500 } })
    );
    expect(result.atk).toEqual({ from: undefined, to: 2500 });
  });

  it('[covers:atk.omitted_when_both_undefined] atk.min/maxが両方undefinedの場合、exact/unknownがtrueでもatkは設定されない', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: true, unknown: true, min: undefined, max: undefined } })
    );
    expect('atk' in result).toBe(false);
  });

  it('[covers:def.set_when_min_defined] def.minが定義済みの場合はdef={from,to}が設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ def: { exact: false, unknown: false, min: 500, max: undefined } })
    );
    expect(result.def).toEqual({ from: 500, to: undefined });
  });

  it('[covers:def.omitted_when_both_undefined] def.min/maxが両方undefinedの場合はdefは設定されない', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ def: { exact: false, unknown: false, min: undefined, max: undefined } })
    );
    expect('def' in result).toBe(false);
  });

  it('[covers:monster_types.empty_array_sets_nothing] monsterTypesが空配列の場合は関連3フィールドとも設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ monsterTypes: [] }));
    expect('monsterTypes' in result).toBe(false);
    expect('excludeMonsterTypes' in result).toBe(false);
    expect('monsterTypeLogic' in result).toBe(false);
  });

  it('[covers:monster_types.only_normal_sets_monster_types_not_exclude] normalのみの場合はmonsterTypesのみ設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ monsterTypes: [{ type: 'fusion', state: 'normal' }] })
    );
    expect(result.monsterTypes).toEqual(['fusion']);
    expect('excludeMonsterTypes' in result).toBe(false);
  });

  it('[covers:monster_types.only_not_sets_exclude_not_monster_types] notのみの場合はexcludeMonsterTypesのみ設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ monsterTypes: [{ type: 'synchro', state: 'not' }] })
    );
    expect(result.excludeMonsterTypes).toEqual(['synchro']);
    expect('monsterTypes' in result).toBe(false);
  });

  it('[covers:monster_types.mixed_sets_both_fields] normal/not混在の場合は両方設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({
        monsterTypes: [
          { type: 'fusion', state: 'normal' },
          { type: 'synchro', state: 'not' },
        ],
      })
    );
    expect(result.monsterTypes).toEqual(['fusion']);
    expect(result.excludeMonsterTypes).toEqual(['synchro']);
  });

  it('[covers:monster_type_logic.and_when_match_mode_and] matchMode=andの場合はmonsterTypeLogic=ANDになる', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'and',
      })
    );
    expect(result.monsterTypeLogic).toBe('AND');
  });

  it('[covers:monster_type_logic.or_when_match_mode_not_and] matchMode=orの場合はmonsterTypeLogic=ORになる', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'or',
      })
    );
    expect(result.monsterTypeLogic).toBe('OR');
  });

  it('[covers:link_numbers.set_when_non_empty] linkValuesが1件以上ある場合はlinkNumbersに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkValues: [2, 4] }));
    expect(result.linkNumbers).toEqual([2, 4]);
  });

  it('[covers:link_numbers.omitted_when_empty] linkValuesが空配列の場合はlinkNumbersは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkValues: [] }));
    expect('linkNumbers' in result).toBe(false);
  });

  it('[covers:link_markers.set_with_logic_when_non_empty] linkMarkersが1件以上の場合はlinkMarkersとlinkMarkerLogicが設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ linkMarkers: [1, 3], linkMarkerMatchMode: 'and' })
    );
    expect(result.linkMarkers).toEqual([1, 3]);
    expect(result.linkMarkerLogic).toBe('AND');
  });

  it('[covers:link_markers.omitted_with_logic_when_empty] linkMarkersが空配列の場合はlinkMarkers/linkMarkerLogicとも設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkMarkers: [] }));
    expect('linkMarkers' in result).toBe(false);
    expect('linkMarkerLogic' in result).toBe(false);
  });

  it('[covers:link_marker_logic.or_when_match_mode_not_and] linkMarkerMatchMode=orの場合はlinkMarkerLogic=ORになる', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ linkMarkers: [1], linkMarkerMatchMode: 'or' })
    );
    expect(result.linkMarkerLogic).toBe('OR');
  });

  it('[covers:pendulum_scales.set_when_non_empty] scaleValuesが1件以上ある場合はpendulumScalesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ scaleValues: [1, 8] }));
    expect(result.pendulumScales).toEqual([1, 8]);
  });

  it('[covers:pendulum_scales.omitted_when_empty] scaleValuesが空配列の場合はpendulumScalesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ scaleValues: [] }));
    expect('pendulumScales' in result).toBe(false);
  });

  it('[covers:spell_effect_types.set_when_non_empty] spellTypesが1件以上ある場合はspellEffectTypesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ spellTypes: ['normal'] }));
    expect(result.spellEffectTypes).toEqual(['normal']);
  });

  it('[covers:spell_effect_types.omitted_when_empty] spellTypesが空配列の場合はspellEffectTypesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ spellTypes: [] }));
    expect('spellEffectTypes' in result).toBe(false);
  });

  it('[covers:trap_effect_types.set_when_non_empty] trapTypesが1件以上ある場合はtrapEffectTypesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ trapTypes: ['normal'] }));
    expect(result.trapEffectTypes).toEqual(['normal']);
  });

  it('[covers:trap_effect_types.omitted_when_empty] trapTypesが空配列の場合はtrapEffectTypesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ trapTypes: [] }));
    expect('trapEffectTypes' in result).toBe(false);
  });

  it('[covers:release_date.omitted_when_both_empty] releaseDate.from/toが両方未設定の場合はreleaseDate自体が設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: {} }));
    expect('releaseDate' in result).toBe(false);
  });

  it('[covers:release_date.from_valid_sets_start] fromがYYYY-MM-DD形式の場合はstartが設定されendは含まれない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { from: '2024-03-15' } }));
    expect(result.releaseDate).toEqual({ start: { year: 2024, month: 3, day: 15 } });
  });

  it('[covers:release_date.from_malformed_object_created_but_start_not_set] fromが不正形式の場合はreleaseDate={}になりstartは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { from: '2024-03' } }));
    expect(result.releaseDate).toEqual({});
  });

  it('[covers:release_date.to_valid_sets_end] toがYYYY-MM-DD形式の場合はendが設定されstartは含まれない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { to: '2024-12-31' } }));
    expect(result.releaseDate).toEqual({ end: { year: 2024, month: 12, day: 31 } });
  });

  it('[covers:release_date.to_malformed_object_created_but_end_not_set] toが不正形式の場合はreleaseDate={}になりendは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { to: '2024' } }));
    expect(result.releaseDate).toEqual({});
  });

  it('[covers:release_date.both_valid_sets_start_and_end] from/to両方がYYYY-MM-DD形式の場合はstart/end両方設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ releaseDate: { from: '2020-01-01', to: '2024-12-31' } })
    );
    expect(result.releaseDate).toEqual({
      start: { year: 2020, month: 1, day: 1 },
      end: { year: 2024, month: 12, day: 31 },
    });
  });
});
