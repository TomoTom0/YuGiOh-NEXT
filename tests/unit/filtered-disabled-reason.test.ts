import { describe, it, expect } from 'vitest';

describe('Filtered field disabled reason', () => {
  // hasFieldInput と getFieldDisabledReason のフィルタリングロジック

  const hasFieldInput = (fieldName: string, filters: any): boolean => {
    switch (fieldName) {
      case 'level-rank':
        return filters.levelValues.length > 0;
      case 'link-value':
        return filters.linkValues.length > 0;
      case 'link-marker':
        return filters.linkMarkers.length > 0;
      case 'p-scale':
        return filters.scaleValues.length > 0;
      case 'def':
        return filters.def.exact || filters.def.unknown ||
               filters.def.min !== undefined || filters.def.max !== undefined;
      case 'atk':
        return filters.atk.exact || filters.atk.unknown ||
               filters.atk.min !== undefined || filters.atk.max !== undefined;
      case 'attribute':
        return filters.attributes.length > 0;
      case 'race':
        return filters.races.length > 0;
      case 'spell-type':
        return filters.spellTypes.length > 0;
      case 'trap-type':
        return filters.trapTypes.length > 0;
      default:
        return false;
    }
  };

  it('level-rankだけが入力されている場合、defは理由に含めない', () => {
    // filters: level-rank は入力、def は入力なし
    const filters = {
      levelValues: [0],  // ← level が入力
      linkValues: [],
      linkMarkers: [],
      scaleValues: [],
      def: { exact: false, unknown: false },  // ← def は入力なし
      atk: { exact: false, unknown: false },
      attributes: [],
      races: [],
      spellTypes: [],
      trapTypes: []
    };

    // reason に含まれている項目: level-rank, def
    const reasonFields = ['level-rank', 'def'];

    // 実際に入力されている項目だけをフィルタリング
    const actualInputFields = reasonFields.filter(f => hasFieldInput(f, filters));

    expect(actualInputFields).toEqual(['level-rank']);
    expect(actualInputFields).not.toContain('def');
  });

  it('level-rankとdefの両方が入力されている場合、両方を含める', () => {
    const filters = {
      levelValues: [0],  // ← level が入力
      linkValues: [],
      linkMarkers: [],
      scaleValues: [],
      def: { exact: true },  // ← def も入力
      atk: { exact: false, unknown: false },
      attributes: [],
      races: [],
      spellTypes: [],
      trapTypes: []
    };

    const reasonFields = ['level-rank', 'def'];
    const actualInputFields = reasonFields.filter(f => hasFieldInput(f, filters));

    expect(actualInputFields).toEqual(['level-rank', 'def']);
  });

  it('どちらも入力されていない場合は空配列', () => {
    const filters = {
      levelValues: [],  // ← level は入力なし
      linkValues: [],
      linkMarkers: [],
      scaleValues: [],
      def: { exact: false, unknown: false },  // ← def も入力なし
      atk: { exact: false, unknown: false },
      attributes: [],
      races: [],
      spellTypes: [],
      trapTypes: []
    };

    const reasonFields = ['level-rank', 'def'];
    const actualInputFields = reasonFields.filter(f => hasFieldInput(f, filters));

    expect(actualInputFields).toEqual([]);
  });

  it('link-value と link-marker が両方理由に含まれているが、link-value だけが入力', () => {
    const filters = {
      levelValues: [],
      linkValues: [1],  // ← link-value が入力
      linkMarkers: [],  // ← link-marker は入力なし
      scaleValues: [],
      def: { exact: false, unknown: false },
      atk: { exact: false, unknown: false },
      attributes: [],
      races: [],
      spellTypes: [],
      trapTypes: []
    };

    const reasonFields = ['link-value', 'link-marker'];
    const actualInputFields = reasonFields.filter(f => hasFieldInput(f, filters));

    expect(actualInputFields).toEqual(['link-value']);
  });
});
