/**
 * フィルター条件のラベル変換ユーティリティ
 * SearchInputBarとSearchFilterDialogで共通使用
 */

import {
  RACE_ID_TO_SHORTNAME,
  ATTRIBUTE_ID_TO_NAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  MONSTER_TYPE_ID_TO_SHORTNAME,
  SPELL_EFFECT_TYPE_ID_TO_LABEL,
  TRAP_EFFECT_TYPE_ID_TO_LABEL
} from '@/types/card-maps';

/**
 * 属性のラベルを取得（チップ用）
 */
export function getAttributeLabel(value: string): string {
  return (ATTRIBUTE_ID_TO_NAME as Record<string, string>)[value] || value;
}

/**
 * カードタイプのラベルを取得（チップ用短縮形）
 */
export function getCardTypeLabel(value: string): string {
  return (CARD_TYPE_ID_TO_SHORTNAME as Record<string, string>)[value] || value;
}

/**
 * モンスタータイプのラベルを取得（チップ用短縮形）
 */
export function getMonsterTypeLabel(value: string): string {
  return (MONSTER_TYPE_ID_TO_SHORTNAME as Record<string, string>)[value] || value;
}

/**
 * 種族のラベルを取得（チップ用短縮形）
 */
export function getRaceLabel(value: string): string {
  return (RACE_ID_TO_SHORTNAME as Record<string, string>)[value] || value.slice(0, 1);
}

/**
 * 魔法タイプのラベルを取得（フルネーム）
 */
export function getSpellTypeLabel(value: string): string {
  return (SPELL_EFFECT_TYPE_ID_TO_LABEL as Record<string, string>)[value] || value;
}

/**
 * 罠タイプのラベルを取得（フルネーム）
 */
export function getTrapTypeLabel(value: string): string {
  return (TRAP_EFFECT_TYPE_ID_TO_LABEL as Record<string, string>)[value] || value;
}

/**
 * フィルターチップのラベルを取得（SearchInputBarで使用）
 * 注意: ATK/DEFについてはformatStatLabelを使用すること
 */
export function getChipLabel(type: string, value: string): string {
  switch (type) {
    case 'attributes':
      return getAttributeLabel(value);
    case 'cardType':
      return getCardTypeLabel(value);
    case 'monsterTypes':
      return getMonsterTypeLabel(value);
    case 'levels':
      return `★${value}`;
    case 'linkNumbers':
      return `L${value}`;
    case 'atk':
    case 'def':
      // ATK/DEFは使用すべきでない - formatStatLabelを使うこと
      throw new Error(`getChipLabel should not be used for ${type}. Use formatStatLabel instead.`);
    case 'races':
      return getRaceLabel(value);
    default:
      return value;
  }
}
