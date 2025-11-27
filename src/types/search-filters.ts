/**
 * 検索フィルター型定義
 * SearchFilterDialogとSearchInputBarで共通使用
 */

import type { Attribute, Race, MonsterType, CardType, SpellEffectType, TrapEffectType } from './card';

export interface SearchFilters {
  cardType: CardType | null;
  attributes: Attribute[];
  spellTypes: SpellEffectType[];
  trapTypes: TrapEffectType[];
  races: Race[];
  monsterTypes: { type: MonsterType; state: 'normal' | 'not' }[];
  monsterTypeMatchMode: 'and' | 'or';
  levelType: 'level' | 'link' | 'scale';
  levelValues: number[];
  linkValues: number[];
  scaleValues: number[];
  linkMarkers: number[];
  linkMarkerMatchMode: 'and' | 'or';
  atk: { exact: boolean; unknown: boolean; min?: number; max?: number };
  def: { exact: boolean; unknown: boolean; min?: number; max?: number };
  releaseDate: { from?: string; to?: string };
}
