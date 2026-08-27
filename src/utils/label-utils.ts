/**
 * カードラベル変換ユーティリティ（多言語対応）
 *
 * カードの属性、種族、タイプなどの内部値を
 * 現在の言語設定に応じた表示用ラベルに変換する関数群
 */

import {
  RACE_ID_TO_NAME,
  ATTRIBUTE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_NAME,
  SPELL_EFFECT_TYPE_ID_TO_NAME,
  TRAP_EFFECT_TYPE_ID_TO_NAME,
} from '@/types/card-maps';
import { mappingManager } from '@/utils/mapping-manager';
import { detectLanguage } from '@/utils/language-detector';

/**
 * 現在の言語を取得
 */
function currentLang(): string {
  return detectLanguage(document);
}

/**
 * 属性の内部値をラベルに変換（多言語対応）
 */
export const getAttributeLabel = (attr: string): string => {
  const lang = currentLang();
  return (mappingManager.getAttributeIdToText(lang) as Record<string, string>)[attr]
    || (ATTRIBUTE_ID_TO_NAME as Record<string, string>)[attr]
    || attr;
};

/**
 * 種族の内部値をラベルに変換（多言語対応）
 */
export const getRaceLabel = (race: string): string => {
  const lang = currentLang();
  return (mappingManager.getRaceIdToText(lang) as Record<string, string>)[race]
    || (RACE_ID_TO_NAME as Record<string, string>)[race]
    || race;
};

/**
 * モンスタータイプの内部値をラベルに変換（多言語対応）
 */
export const getMonsterTypeLabel = (type: string): string => {
  const lang = currentLang();
  return (mappingManager.getMonsterTypeIdToText(lang) as Record<string, string>)[type]
    || (MONSTER_TYPE_ID_TO_NAME as Record<string, string>)[type]
    || type;
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
 * 魔法カードの効果タイプをラベルに変換（多言語対応）
 */
export const getSpellTypeLabel = (effectType: string): string => {
  const lang = currentLang();
  const nameMap = mappingManager.getSpellEffectIdToText(lang) as Record<string, string>;
  if (nameMap[effectType]) return nameMap[effectType];
  return (SPELL_EFFECT_TYPE_ID_TO_NAME as Record<string, string>)[effectType] || effectType;
}

/**
 * 罠カードの効果タイプをラベルに変換（多言語対応）
 */
export const getTrapTypeLabel = (effectType: string): string => {
  const lang = currentLang();
  const nameMap = mappingManager.getTrapEffectIdToText(lang) as Record<string, string>;
  if (nameMap[effectType]) return nameMap[effectType];
  return (TRAP_EFFECT_TYPE_ID_TO_NAME as Record<string, string>)[effectType] || effectType;
}

/**
 * カードタイプ名をラベルに変換（多言語対応）
 */
export const getCardTypeLabel = (cardType: string): string => {
  const lang = currentLang();
  if (cardType === 'spell') {
    return lang === 'ja' ? '魔法' : 'Spell';
  }
  if (cardType === 'trap') {
    return lang === 'ja' ? '罠' : 'Trap';
  }
  if (cardType === 'monster') {
    return lang === 'ja' ? 'モンスター' : 'Monster';
  }
  return cardType;
}

/**
 * 効果種類をラベルに変換（多言語対応、魔法/罠自動判定）
 */
export const getEffectTypeLabel = (effectType: string, cardType: string): string => {
  if (cardType === 'spell') return getSpellTypeLabel(effectType);
  if (cardType === 'trap') return getTrapTypeLabel(effectType);
  return effectType;
}

/**
 * モンスタータイプリストをラベルに変換（多言語対応）
 */
export const getMonsterTypesLabel = (types: string[]): string => {
  if (!types || !Array.isArray(types)) return '';
  return types.map(t => getMonsterTypeLabel(t)).join(' / ');
}
