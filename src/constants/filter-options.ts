/**
 * フィルター選択肢の定義
 * SearchInputBarとSearchFilterDialogで共通使用
 *
 * card-maps.ts から動的に生成（REQ-20対応）
 */

import {
  ATTRIBUTE_ID_TO_NAME,
  CARD_TYPE_ID_TO_NAME,
  RACE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_NAME,
  SPELL_EFFECT_TYPE_ID_TO_NAME,
  TRAP_EFFECT_TYPE_ID_TO_NAME
} from '../types/card-maps'

export interface FilterOption {
  value: string;
  label: string;
  aliases?: string[];
}

// card-maps.ts から動的生成
export const ATTRIBUTE_OPTIONS: FilterOption[] = Object.entries(ATTRIBUTE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const CARD_TYPE_OPTIONS: FilterOption[] = Object.entries(CARD_TYPE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const RACE_OPTIONS: FilterOption[] = Object.entries(RACE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const MONSTER_TYPE_OPTIONS: FilterOption[] = Object.entries(MONSTER_TYPE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const SPELL_TYPE_OPTIONS: FilterOption[] = Object.entries(SPELL_EFFECT_TYPE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const TRAP_TYPE_OPTIONS: FilterOption[] = Object.entries(TRAP_EFFECT_TYPE_ID_TO_NAME).map(([value, label]) => ({
  value,
  label
}));

export const LEVEL_OPTIONS: FilterOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' }
];

export const LINK_OPTIONS: FilterOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' }
];

export const SEARCH_MODE_OPTIONS: FilterOption[] = [
  { value: 'name', label: 'カード名' },
  { value: 'text', label: 'テキスト' },
  { value: 'pend', label: 'ペンデュラム' }
];
