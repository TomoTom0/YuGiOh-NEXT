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
  it('[covers:sort.known-order-maps-to-api-value] SORT_ORDER_TO_API_VALUEに存在するsortOrderはAPI値にマップされる', () => {
    const result = buildSearchOptions('カード', '1', 'atk_desc', baseFilters());
    expect(result.sort).toBe(4);
    // 属性・種族ソートはAPIに対応が無いため50音順（1）で取得し、実ソートはクライアント側で行う
    expect(buildSearchOptions('カード', '1', 'attribute_asc', baseFilters()).sort).toBe(1);
    expect(buildSearchOptions('カード', '1', 'attribute_desc', baseFilters()).sort).toBe(1);
    expect(buildSearchOptions('カード', '1', 'race_asc', baseFilters()).sort).toBe(1);
    expect(buildSearchOptions('カード', '1', 'race_desc', baseFilters()).sort).toBe(1);
  });

  it('[covers:sort.unknown-order-falls-back-to-1] マップに存在しないsortOrderはsort=1にフォールバックする', () => {
    const invalidSortOrder = 'invalid_order' as unknown as SortOrder;
    const result = buildSearchOptions('カード', '1', invalidSortOrder, baseFilters());
    expect(result.sort).toBe(1);
  });

  it('[covers:base.always-includes-keyword-searchtype-resultsperpage] デフォルトfiltersではkeyword/searchType/resultsPerPage/sortのみを持つ', () => {
    const result = buildSearchOptions('青眼', '2', 'name_asc', baseFilters());
    expect(result).toEqual({
      keyword: '青眼',
      searchType: '2',
      resultsPerPage: 100,
      sort: 1,
    });
  });

  it('[covers:card-type.set-when-truthy] cardTypeが指定されている場合はsearchOptions.cardTypeに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ cardType: 'monster' }));
    expect(result.cardType).toBe('monster');
  });

  it('[covers:card-type.omitted-when-null] cardTypeがnullの場合はプロパティ自体が存在しない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ cardType: null }));
    expect('cardType' in result).toBe(false);
  });

  it('[covers:attributes.set-when-non-empty] attributesが1件以上ある場合はそのまま設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ attributes: ['light', 'dark'] }));
    expect(result.attributes).toEqual(['light', 'dark']);
  });

  it('[covers:attributes.omitted-when-empty] attributesが空配列の場合は設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ attributes: [] }));
    expect('attributes' in result).toBe(false);
  });

  it('[covers:races.set-when-non-empty] racesが1件以上ある場合はそのまま設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ races: ['dragon'] }));
    expect(result.races).toEqual(['dragon']);
  });

  it('[covers:races.omitted-when-empty] racesが空配列の場合は設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ races: [] }));
    expect('races' in result).toBe(false);
  });

  it('[covers:levels.set-when-non-empty] levelValuesが1件以上ある場合はlevelsに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ levelValues: [4, 8] }));
    expect(result.levels).toEqual([4, 8]);
  });

  it('[covers:levels.omitted-when-empty] levelValuesが空配列の場合はlevelsは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ levelValues: [] }));
    expect('levels' in result).toBe(false);
  });

  it('[covers:atk.set-when-min-defined] atk.minが定義済みの場合はatk={from,to}が設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: false, unknown: false, min: 1000, max: undefined } })
    );
    expect(result.atk).toEqual({ from: 1000, to: undefined });
  });

  it('[covers:atk.set-when-max-defined] atk.maxのみ定義済みの場合もatkが設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: false, unknown: false, min: undefined, max: 2500 } })
    );
    expect(result.atk).toEqual({ from: undefined, to: 2500 });
  });

  it('[covers:atk.omitted-when-both-undefined] atk.min/maxが両方undefinedの場合、exact/unknownがtrueでもatkは設定されない', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ atk: { exact: true, unknown: true, min: undefined, max: undefined } })
    );
    expect('atk' in result).toBe(false);
  });

  it('[covers:def.set-when-min-defined] def.minが定義済みの場合はdef={from,to}が設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ def: { exact: false, unknown: false, min: 500, max: undefined } })
    );
    expect(result.def).toEqual({ from: 500, to: undefined });
  });

  it('[covers:def.omitted-when-both-undefined] def.min/maxが両方undefinedの場合はdefは設定されない', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ def: { exact: false, unknown: false, min: undefined, max: undefined } })
    );
    expect('def' in result).toBe(false);
  });

  it('[covers:monster-types.empty-array-sets-nothing] monsterTypesが空配列の場合は関連3フィールドとも設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ monsterTypes: [] }));
    expect('monsterTypes' in result).toBe(false);
    expect('excludeMonsterTypes' in result).toBe(false);
    expect('monsterTypeLogic' in result).toBe(false);
  });

  it('[covers:monster-types.only-normal-sets-monster-types-not-exclude] normalのみの場合はmonsterTypesのみ設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ monsterTypes: [{ type: 'fusion', state: 'normal' }] })
    );
    expect(result.monsterTypes).toEqual(['fusion']);
    expect('excludeMonsterTypes' in result).toBe(false);
  });

  it('[covers:monster-types.only-not-sets-exclude-not-monster-types] notのみの場合はexcludeMonsterTypesのみ設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ monsterTypes: [{ type: 'synchro', state: 'not' }] })
    );
    expect(result.excludeMonsterTypes).toEqual(['synchro']);
    expect('monsterTypes' in result).toBe(false);
  });

  it('[covers:monster-types.mixed-sets-both-fields] normal/not混在の場合は両方設定される', () => {
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

  it('[covers:monster-type-logic.and-when-match-mode-and] matchMode=andの場合はmonsterTypeLogic=ANDになる', () => {
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

  it('[covers:monster-type-logic.or-when-match-mode-not-and] matchMode=orの場合はmonsterTypeLogic=ORになる', () => {
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

  it('[covers:link-numbers.set-when-non-empty] linkValuesが1件以上ある場合はlinkNumbersに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkValues: [2, 4] }));
    expect(result.linkNumbers).toEqual([2, 4]);
  });

  it('[covers:link-numbers.omitted-when-empty] linkValuesが空配列の場合はlinkNumbersは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkValues: [] }));
    expect('linkNumbers' in result).toBe(false);
  });

  it('[covers:link-markers.set-with-logic-when-non-empty] linkMarkersが1件以上の場合はlinkMarkersとlinkMarkerLogicが設定される', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ linkMarkers: [1, 3], linkMarkerMatchMode: 'and' })
    );
    expect(result.linkMarkers).toEqual([1, 3]);
    expect(result.linkMarkerLogic).toBe('AND');
  });

  it('[covers:link-markers.omitted-with-logic-when-empty] linkMarkersが空配列の場合はlinkMarkers/linkMarkerLogicとも設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ linkMarkers: [] }));
    expect('linkMarkers' in result).toBe(false);
    expect('linkMarkerLogic' in result).toBe(false);
  });

  it('[covers:link-marker-logic.or-when-match-mode-not-and] linkMarkerMatchMode=orの場合はlinkMarkerLogic=ORになる', () => {
    const result = buildSearchOptions(
      '',
      '1',
      'name_asc',
      baseFilters({ linkMarkers: [1], linkMarkerMatchMode: 'or' })
    );
    expect(result.linkMarkerLogic).toBe('OR');
  });

  it('[covers:pendulum-scales.set-when-non-empty] scaleValuesが1件以上ある場合はpendulumScalesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ scaleValues: [1, 8] }));
    expect(result.pendulumScales).toEqual([1, 8]);
  });

  it('[covers:pendulum-scales.omitted-when-empty] scaleValuesが空配列の場合はpendulumScalesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ scaleValues: [] }));
    expect('pendulumScales' in result).toBe(false);
  });

  it('[covers:spell-effect-types.set-when-non-empty] spellTypesが1件以上ある場合はspellEffectTypesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ spellTypes: ['normal'] }));
    expect(result.spellEffectTypes).toEqual(['normal']);
  });

  it('[covers:spell-effect-types.omitted-when-empty] spellTypesが空配列の場合はspellEffectTypesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ spellTypes: [] }));
    expect('spellEffectTypes' in result).toBe(false);
  });

  it('[covers:trap-effect-types.set-when-non-empty] trapTypesが1件以上ある場合はtrapEffectTypesに設定される', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ trapTypes: ['normal'] }));
    expect(result.trapEffectTypes).toEqual(['normal']);
  });

  it('[covers:trap-effect-types.omitted-when-empty] trapTypesが空配列の場合はtrapEffectTypesは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ trapTypes: [] }));
    expect('trapEffectTypes' in result).toBe(false);
  });

  it('[covers:release-date.omitted-when-both-empty] releaseDate.from/toが両方未設定の場合はreleaseDate自体が設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: {} }));
    expect('releaseDate' in result).toBe(false);
  });

  it('[covers:release-date.from-valid-sets-start] fromがYYYY-MM-DD形式の場合はstartが設定されendは含まれない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { from: '2024-03-15' } }));
    expect(result.releaseDate).toEqual({ start: { year: 2024, month: 3, day: 15 } });
  });

  it('[covers:release-date.from-malformed-object-created-but-start-not-set] fromが不正形式の場合はreleaseDate={}になりstartは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { from: '2024-03' } }));
    expect(result.releaseDate).toEqual({});
  });

  it('[covers:release-date.to-valid-sets-end] toがYYYY-MM-DD形式の場合はendが設定されstartは含まれない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { to: '2024-12-31' } }));
    expect(result.releaseDate).toEqual({ end: { year: 2024, month: 12, day: 31 } });
  });

  it('[covers:release-date.to-malformed-object-created-but-end-not-set] toが不正形式の場合はreleaseDate={}になりendは設定されない', () => {
    const result = buildSearchOptions('', '1', 'name_asc', baseFilters({ releaseDate: { to: '2024' } }));
    expect(result.releaseDate).toEqual({});
  });

  it('[covers:release-date.both-valid-sets-start-and-end] from/to両方がYYYY-MM-DD形式の場合はstart/end両方設定される', () => {
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
