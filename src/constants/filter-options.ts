/**
 * フィルター選択肢の定義
 * SearchInputBarとSearchFilterDialogで共通使用
 */

export interface FilterOption {
  value: string;
  label: string;
  aliases?: string[];
}

export const ATTRIBUTE_OPTIONS: FilterOption[] = [
  { value: 'light', label: '光' },
  { value: 'dark', label: '闇' },
  { value: 'water', label: '水' },
  { value: 'fire', label: '炎' },
  { value: 'earth', label: '地' },
  { value: 'wind', label: '風' },
  { value: 'divine', label: '神' }
];

export const CARD_TYPE_OPTIONS: FilterOption[] = [
  { value: 'monster', label: 'モンスター' },
  { value: 'spell', label: '魔法' },
  { value: 'trap', label: '罠' }
];

export const RACE_OPTIONS: FilterOption[] = [
  { value: 'dragon', label: 'ドラゴン' },
  { value: 'spellcaster', label: '魔法使い' },
  { value: 'warrior', label: '戦士' },
  { value: 'machine', label: '機械' },
  { value: 'fiend', label: '悪魔' },
  { value: 'fairy', label: '天使' },
  { value: 'zombie', label: 'アンデット' },
  { value: 'beast', label: '獣' },
  { value: 'beastwarrior', label: '獣戦士' },
  { value: 'plant', label: '植物' },
  { value: 'insect', label: '昆虫' },
  { value: 'aqua', label: '水族' },
  { value: 'fish', label: '魚族' },
  { value: 'seaserpent', label: '海竜族' },
  { value: 'reptile', label: '爬虫類' },
  { value: 'dinosaur', label: '恐竜' },
  { value: 'windbeast', label: '鳥獣' },
  { value: 'rock', label: '岩石' },
  { value: 'pyro', label: '炎族' },
  { value: 'thunder', label: '雷族' },
  { value: 'psychic', label: 'サイキック' },
  { value: 'wyrm', label: '幻竜族' },
  { value: 'cyberse', label: 'サイバース' },
  { value: 'illusion', label: '幻想族' },
  { value: 'divine', label: '幻神獣族' },
  { value: 'creatorgod', label: '創造神族' }
];

export const MONSTER_TYPE_OPTIONS: FilterOption[] = [
  { value: 'normal', label: '通常' },
  { value: 'effect', label: '効果' },
  { value: 'fusion', label: '融合' },
  { value: 'ritual', label: '儀式' },
  { value: 'synchro', label: 'シンクロ' },
  { value: 'xyz', label: 'エクシーズ' },
  { value: 'pendulum', label: 'ペンデュラム' },
  { value: 'link', label: 'リンク' },
  { value: 'tuner', label: 'チューナー' },
  { value: 'flip', label: 'リバース' },
  { value: 'toon', label: 'トゥーン' },
  { value: 'spirit', label: 'スピリット' },
  { value: 'union', label: 'ユニオン' },
  { value: 'gemini', label: 'デュアル' },
  { value: 'special', label: '特殊召喚' }
];

export const SPELL_TYPE_OPTIONS: FilterOption[] = [
  { value: 'normal', label: '通常' },
  { value: 'quick', label: '速攻' },
  { value: 'continuous', label: '永続' },
  { value: 'equip', label: '装備' },
  { value: 'field', label: 'フィールド' },
  { value: 'ritual', label: '儀式' }
];

export const TRAP_TYPE_OPTIONS: FilterOption[] = [
  { value: 'normal', label: '通常' },
  { value: 'continuous', label: '永続' },
  { value: 'counter', label: 'カウンター' }
];

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
