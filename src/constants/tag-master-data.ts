/**
 * タググループのマスターデータ
 *
 * deck-metadata.jsonから抽出したタグIDのリスト。
 * タグを race/attr/type/others の4グループに分類する。
 */

import { MONSTER_TYPE_ID_TO_NAME, type Attribute, type Race } from '../types/card-maps';

/**
 * タグID → 内部キーへの変換マップ
 * deck-metadata.jsonの実際のマッピングに基づく
 */
export const TAG_ID_TO_ATTR: Record<string, Attribute> = {
  '1': 'dark',
  '2': 'light',
  '3': 'water',
  '4': 'fire',
  '5': 'earth',
  '6': 'wind',
  '7': 'divine'
};

export const TAG_ID_TO_RACE: Record<string, Race> = {
  '20': 'dragon',
  '21': 'zombie',
  '22': 'fiend',
  '23': 'pyro',
  '24': 'seaserpent',
  '25': 'rock',
  '26': 'machine',
  '27': 'fish',
  '28': 'dinosaur',
  '29': 'insect',
  '30': 'beast',
  '31': 'beastwarrior',
  '32': 'plant',
  '33': 'aqua',
  '34': 'warrior',
  '35': 'windbeast',
  '36': 'fairy',
  '37': 'spellcaster',
  '38': 'thunder',
  '39': 'reptile',
  '40': 'psychic',
  '41': 'divine',
  '42': 'wyrm',
  '43': 'cyberse',
  '100': 'illusion'
};

export const TAG_ID_TO_MONSTER_TYPE: Record<string, string> = {
  '8': 'link',
  '9': 'pendulum',
  '10': 'xyz',
  '11': 'synchro',
  '12': 'tuner',
  '13': 'gemini',
  '14': 'union',
  '15': 'spirit',
  '16': 'toon',
  '17': 'ritual',
  '18': 'fusion',
  '110': 'flip'
};

export const TAG_GROUPS = {
  // 属性（7個）
  attr: ['1', '2', '3', '4', '5', '6', '7'],
  
  // 種族（25個）
  race: [
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '100'
  ],
  
  // モンスタータイプ（12個）
  type: ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '110']
} as const;

export type TagGroup = 'attr' | 'race' | 'type' | 'others';

/**
 * タグIDからグループを判定
 * 
 * @param tagId - タグID（文字列）
 * @returns グループ名
 */
export function classifyTagById(tagId: string): TagGroup {
  if ((TAG_GROUPS.attr as readonly string[]).includes(tagId)) {
    return 'attr';
  }
  if ((TAG_GROUPS.race as readonly string[]).includes(tagId)) {
    return 'race';
  }
  if ((TAG_GROUPS.type as readonly string[]).includes(tagId)) {
    return 'type';
  }
  return 'others';
}

/**
 * タグラベルからモンスタータイプを取得
 * MONSTER_TYPE_ID_TO_NAMEを逆引きして使用
 *
 * @param tagLabel - タグのラベル（例: "融合", "シンクロ"）
 * @returns モンスタータイプ（fusion, synchro, xyz など）、該当しない場合は空文字
 */
export function getMonsterTypeFromLabel(tagLabel: string): string {
  for (const [type, label] of Object.entries(MONSTER_TYPE_ID_TO_NAME)) {
    if (tagLabel.includes(label)) {
      return type;
    }
  }
  return '';
}

