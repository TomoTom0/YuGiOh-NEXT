/**
 * カードラベル変換ユーティリティ
 *
 * カードの属性、種族、タイプなどの内部値を
 * 表示用の日本語ラベルに変換する関数群
 */

import {
  RACE_ID_TO_NAME,
  ATTRIBUTE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_NAME,
} from '@/types/card-maps';

/**
 * 属性の内部値を日本語ラベルに変換
 */
export const getAttributeLabel = (attr: string): string => {
  return (ATTRIBUTE_ID_TO_NAME as Record<string, string>)[attr] || attr;
};

/**
 * 種族の内部値を日本語ラベルに変換
 */
export const getRaceLabel = (race: string): string => {
  return (RACE_ID_TO_NAME as Record<string, string>)[race] || race;
};

/**
 * モンスタータイプの内部値を日本語ラベルに変換
 */
export const getMonsterTypeLabel = (type: string): string => {
  return (MONSTER_TYPE_ID_TO_NAME as Record<string, string>)[type] || type;
};

/**
 * カードのレベル/ランク/リンク値をラベルに変換
 */
export const getLevelLabel = (card: { levelValue: number; levelType: string }): string => {
  const value = card.levelValue
  switch (card.levelType) {
    case 'level': return `Lv.${value}`
    case 'rank': return `Rank ${value}`
    case 'link': return `LINK-${value}`
    default: return `Lv.${value}`
  }
}

/**
 * 魔法カードの効果タイプを日本語ラベルに変換
 */
export const getSpellTypeLabel = (effectType: string): string => {
  const labels: Record<string, string> = {
    normal: '通常魔法', continuous: '永続魔法', equip: '装備魔法',
    quickplay: '速攻魔法', field: 'フィールド魔法', ritual: '儀式魔法'
  }
  return labels[effectType] || '魔法'
}

/**
 * 罠カードの効果タイプを日本語ラベルに変換
 */
export const getTrapTypeLabel = (effectType: string): string => {
  const labels: Record<string, string> = {
    normal: '通常罠', continuous: '永続罠', counter: 'カウンター罠'
  }
  return labels[effectType] || '罠'
}
