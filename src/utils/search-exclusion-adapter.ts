/**
 * SearchFiltersと推論エンジンの間のアダプター
 */

import type { SearchFilters } from '../types/search-filters';
import type { SearchConditionState } from '../types/search-exclusion';

/**
 * SearchFiltersからSearchConditionStateへの変換
 */
export function toSearchConditionState(filters: SearchFilters): SearchConditionState {
  // 選択された属性を構築
  const selectedAttributes = new Set<string>();

  // card-type
  if (filters.cardType) {
    selectedAttributes.add(`card-type_${filters.cardType}`);
  }

  // attributes
  for (const attr of filters.attributes) {
    selectedAttributes.add(`attribute_${attr}`);
  }

  // spell types
  for (const type of filters.spellTypes) {
    selectedAttributes.add(`spell-type_${type}`);
  }

  // trap types
  for (const type of filters.trapTypes) {
    selectedAttributes.add(`trap-type_${type}`);
  }

  // races
  for (const race of filters.races) {
    selectedAttributes.add(`race_${race}`);
  }

  // monster types
  for (const mt of filters.monsterTypes) {
    // 'normal'（選択）のみを属性として扱う
    // 'not'（除外）は排他ルールの対象外なので、selectedAttributesに追加しない
    if (mt.state === 'normal') {
      selectedAttributes.add(`monster-type_${mt.type}`);
    }
  }

  // 項目の入力状況
  const fieldInputs: Record<string, boolean> = {
    'link-value': filters.linkValues.length > 0,
    'link-marker': filters.linkMarkers.length > 0,
    'p-scale': filters.scaleValues.length > 0,
    'level-rank': filters.levelValues.length > 0,
    'def': hasDefInput(filters.def),
    'atk': hasAtkInput(filters.atk),
    'attribute': filters.attributes.length > 0,
    'race': filters.races.length > 0,
    'spell-type': filters.spellTypes.length > 0,
    'trap-type': filters.trapTypes.length > 0,
  };

  return {
    monsterTypeMode: filters.monsterTypeMatchMode,
    selectedAttributes,
    fieldInputs,
  };
}

/**
 * ATK/DEFに入力があるかチェック
 */
function hasAtkInput(stat: { exact: boolean; unknown: boolean; min?: number; max?: number }): boolean {
  return stat.exact || stat.unknown || stat.min !== undefined || stat.max !== undefined;
}

function hasDefInput(stat: { exact: boolean; unknown: boolean; min?: number; max?: number }): boolean {
  return stat.exact || stat.unknown || stat.min !== undefined || stat.max !== undefined;
}
