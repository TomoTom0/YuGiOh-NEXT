/**
 * フィルター条件のラベル変換ユーティリティ
 * SearchInputBarとSearchFilterDialogで共通使用
 */

import {
  ATTRIBUTE_OPTIONS,
  SPELL_TYPE_OPTIONS,
  TRAP_TYPE_OPTIONS
} from '../constants/filter-options';

/**
 * 属性のラベルを取得（チップ用）
 */
export function getAttributeLabel(value: string): string {
  const option = ATTRIBUTE_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
}

/**
 * カードタイプのラベルを取得（チップ用短縮形）
 */
export function getCardTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    monster: 'M',
    spell: '魔',
    trap: '罠'
  };
  return labels[value] || value;
}

/**
 * モンスタータイプのラベルを取得（チップ用短縮形）
 */
export function getMonsterTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    normal: '通',
    effect: '効',
    fusion: '融',
    ritual: '儀',
    synchro: 'S',
    xyz: 'X',
    pendulum: 'P',
    link: 'L',
    tuner: 'T',
    flip: 'R',
    toon: 'ト',
    spirit: 'ス',
    union: 'U',
    gemini: 'D',
    special: '特'
  };
  return labels[value] || value;
}

/**
 * 種族のラベルを取得（チップ用短縮形）
 */
export function getRaceLabel(value: string): string {
  const labels: Record<string, string> = {
    dragon: '龍',
    spellcaster: '魔使',
    warrior: '戦士',
    machine: '機械',
    fiend: '悪魔',
    fairy: '天使',
    zombie: '不死',
    beast: '獣',
    beastwarrior: '獣戦',
    plant: '植物',
    insect: '昆虫',
    aqua: '水',
    fish: '魚',
    seaserpent: '海竜',
    reptile: '爬虫',
    dinosaur: '恐竜',
    windbeast: '鳥獣',
    rock: '岩石',
    pyro: '炎',
    thunder: '雷',
    psychic: '念動',
    wyrm: '幻竜',
    cyberse: '電脳',
    illusion: '幻想',
    divine: '幻神',
    creatorgod: '創造'
  };
  return labels[value] || value.slice(0, 1);
}

/**
 * 魔法タイプのラベルを取得（フルネーム）
 */
export function getSpellTypeLabel(value: string): string {
  const option = SPELL_TYPE_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
}

/**
 * 罠タイプのラベルを取得（フルネーム）
 */
export function getTrapTypeLabel(value: string): string {
  const option = TRAP_TYPE_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
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
