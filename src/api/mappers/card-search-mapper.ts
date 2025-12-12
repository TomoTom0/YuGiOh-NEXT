/**
 * カード検索APIのマッピング関数と定数
 *
 * このモジュールは、カード検索リクエストパラメータの構築に必要な
 * マッピング関数と定数を提供します。
 */

import {
  Attribute,
  Race,
  MonsterType,
  SpellEffectType,
  TrapEffectType,
  CardType
} from '@/types/card';
import {
  ATTRIBUTE_ID_TO_PATH,
  SPELL_EFFECT_TYPE_ID_TO_PATH,
  TRAP_EFFECT_TYPE_ID_TO_PATH,
  ATTRIBUTE_ID_TO_INT,
  RACE_ID_TO_INT,
  MONSTER_TYPE_ID_TO_INT,
  SPELL_EFFECT_TYPE_ID_TO_INT,
  TRAP_EFFECT_TYPE_ID_TO_INT
} from '@/types/card-maps';

// ============================================================================
// 逆引きマップの事前生成（パフォーマンス最適化）
// ============================================================================
// モジュール ロード時に一度だけ生成して、パース時の O(1) ルックアップを実現

/**
 * 属性パス → 属性ID の逆引きマップ
 */
export const ATTRIBUTE_PATH_TO_ID = Object.fromEntries(
  Object.entries(ATTRIBUTE_ID_TO_PATH).map(([id, path]) => [path, id])
) as Record<string, Attribute>;

/**
 * 魔法効果タイプパス → 魔法効果タイプID の逆引きマップ
 */
export const SPELL_EFFECT_TYPE_PATH_TO_ID = Object.fromEntries(
  Object.entries(SPELL_EFFECT_TYPE_ID_TO_PATH).map(([id, path]) => [path, id])
) as Record<string, SpellEffectType>;

/**
 * 罠効果タイプパス → 罠効果タイプID の逆引きマップ
 */
export const TRAP_EFFECT_TYPE_PATH_TO_ID = Object.fromEntries(
  Object.entries(TRAP_EFFECT_TYPE_ID_TO_PATH).map(([id, path]) => [path, id])
) as Record<string, TrapEffectType>;

// ============================================================================
// APIパラメータ値マッピング関数
// ============================================================================
// 注: 実際の値は @/types/card-maps の *_ID_TO_INT マッピングで定義
// 以下は便利関数で、internal ID → API値に変換する

/**
 * 属性 → attr値のマッピング
 * card-maps.ts の ATTRIBUTE_ID_TO_INT から動的に生成
 */
export function getAttributeAttrValue(attr: Attribute): string {
  return (ATTRIBUTE_ID_TO_INT as Record<Attribute, number>)[attr]?.toString() || '';
}

/**
 * 種族 → species値のマッピング
 * card-maps.ts の RACE_ID_TO_INT から動的に生成
 */
export function getRaceSpeciesValue(race: Race): string {
  return (RACE_ID_TO_INT as Record<Race, number>)[race]?.toString() || '';
}

/**
 * モンスタータイプ → other値のマッピング
 * MONSTER_TYPE_ID_TO_INT から type に対応する値を取得
 */
export function getMonsterTypeOtherValue(type: MonsterType): string {
  const value = MONSTER_TYPE_ID_TO_INT[type];
  return value !== undefined ? String(value) : '';
}

/**
 * 魔法効果タイプ → effe値のマッピング
 * card-maps.ts の SPELL_EFFECT_TYPE_ID_TO_INT から動的に生成
 */
export function getSpellEffectTypeEffeValue(type: SpellEffectType): string {
  return (SPELL_EFFECT_TYPE_ID_TO_INT as Record<SpellEffectType, number>)[type]?.toString() || '';
}

/**
 * 罠効果タイプ → effe値のマッピング
 * card-maps.ts の TRAP_EFFECT_TYPE_ID_TO_INT から動的に生成
 */
export function getTrapEffectTypeEffeValue(type: TrapEffectType): string {
  return (TRAP_EFFECT_TYPE_ID_TO_INT as Record<TrapEffectType, number>)[type]?.toString() || '';
}

/**
 * カードタイプ → ctype値のマッピング
 */
export function cardTypeToCtype(cardType?: CardType): string {
  if (!cardType) return '';
  switch (cardType) {
    case 'monster':
      return '1';
    case 'spell':
      return '2';
    case 'trap':
      return '3';
    default:
      return '';
  }
}

/**
 * ソート順 → API値のマッピング
 *
 * 注: APIは一部のソート順（50音順、発売日順等）のみサポートしているため、
 * サポートされていないソート（属性ソート、種族ソート等）は50音順で代用し、
 * クライアント側で追加ソートを行う必要があります。
 */
export const SORT_ORDER_TO_API_VALUE: Record<string, number> = {
  'name_asc': 1,
  'name_desc': 1, // APIは50音順のみ、descはクライアント側で反転
  'release_desc': 20,
  'release_asc': 21,
  'level_desc': 2,
  'level_asc': 3,
  'atk_desc': 4,
  'atk_asc': 5,
  'def_desc': 6,
  'def_asc': 7,
  'attribute_asc': 1, // APIに属性ソートなし、50音順で代用
  'attribute_desc': 1,
  'race_asc': 1, // APIに種族ソートなし、50音順で代用
  'race_desc': 1
};
