import * as fs from 'fs';

// マッピングデータを読み込み
let raceMappingsAll: any = {};
let monsterTypeMappingsAll: any = {};

try {
  raceMappingsAll = JSON.parse(fs.readFileSync('./tmp/race-mappings-all.json', 'utf-8'));
} catch (error) {
  console.warn('Warning: ./tmp/race-mappings-all.json not found, using empty mapping');
}

try {
  monsterTypeMappingsAll = JSON.parse(fs.readFileSync('./tmp/monster-type-mappings-all.json', 'utf-8'));
} catch (error) {
  console.warn('Warning: ./tmp/monster-type-mappings-all.json not found, using empty mapping');
}

// 全言語リスト
const languages = ['ja', 'ko', 'ae', 'cn', 'en', 'de', 'fr', 'it', 'es', 'pt'];

// ============================================================================
// 定義データ
// ============================================================================

const CARD_TYPE_MAP = {
  monster: 'モンスター',
  spell: '魔法',
  trap: '罠',
};

const ATTRIBUTE_MAP = {
  light: '光',
  dark: '闇',
  water: '水',
  fire: '炎',
  earth: '地',
  wind: '風',
  divine: '神',
};

const RACE_MAP = {
  dragon: 'ドラゴン族',
  warrior: '戦士族',
  spellcaster: '魔法使い族',
  fairy: '天使族',
  fiend: '悪魔族',
  zombie: 'アンデット族',
  machine: '機械族',
  aqua: '水族',
  pyro: '炎族',
  rock: '岩石族',
  windbeast: '鳥獣族',
  plant: '植物族',
  insect: '昆虫族',
  thunder: '雷族',
  beast: '獣族',
  beastwarrior: '獣戦士族',
  dinosaur: '恐竜族',
  fish: '魚族',
  seaserpent: '海竜族',
  reptile: '爬虫類族',
  psychic: 'サイキック族',
  divine: '幻神獣族',
  creatorgod: '創造神族',
  wyrm: '幻竜族',
  cyberse: 'サイバース族',
  illusion: '幻想魔族',
};

const RACE_SHORT_NAME_MAP = {
  dragon: 'ドラゴン',
  warrior: '戦士',
  spellcaster: '魔法使い',
  fairy: '天使',
  fiend: '悪魔',
  zombie: 'アンデット',
  machine: '機械',
  aqua: '水',
  pyro: '炎',
  rock: '岩石',
  windbeast: '鳥獣',
  plant: '植物',
  insect: '昆虫',
  thunder: '雷',
  beast: '獣',
  beastwarrior: '獣戦士',
  dinosaur: '恐竜',
  fish: '魚',
  seaserpent: '海竜',
  reptile: '爬虫類',
  psychic: 'サイキック',
  divine: '幻神獣',
  creatorgod: '創造神',
  wyrm: '幻竜',
  cyberse: 'サイバース',
  illusion: '幻想魔族',
};

const MONSTER_TYPE_MAP = {
  normal: '通常',
  effect: '効果',
  fusion: '融合',
  ritual: '儀式',
  synchro: 'シンクロ',
  xyz: 'エクシーズ',
  pendulum: 'ペンデュラム',
  link: 'リンク',
  tuner: 'チューナー',
  spirit: 'スピリット',
  union: 'ユニオン',
  gemini: 'デュアル',
  flip: 'リバース',
  toon: 'トゥーン',
  special: '特殊召喚',
};

// VALUE_TO_MONSTER_TYPE マッピング（整数値→内部ID）
const VALUE_TO_MONSTER_TYPE: { [key: string]: string } = {
  '1': 'normal',
  '2': 'effect',
  '3': 'fusion',
  '4': 'ritual',
  '5': 'synchro',
  '6': 'xyz',
  '7': 'pendulum',
  '8': 'link',
  '9': 'tuner',
  '10': 'spirit',
  '11': 'union',
  '12': 'gemini',
  '13': 'flip',
  '14': 'toon',
  '15': 'special',
};

const SPELL_EFFECT_TYPE_MAP = {
  normal: '通常',
  quick: '速攻',
  continuous: '永続',
  equip: '装備',
  field: 'フィールド',
  ritual: '儀式',
};

const TRAP_EFFECT_TYPE_MAP = {
  normal: '通常',
  continuous: '永続',
  counter: 'カウンター',
};

// ============================================================================
// マッピング生成
// ============================================================================

// 内部ID→整数IDのマッピング（逆引き）
const internalIdToRaceId: { [key: string]: number } = {};
for (const [strId, internalId] of Object.entries(VALUE_TO_RACE_ID)) {
  internalIdToRaceId[internalId] = parseInt(strId, 10);
}

const internalIdToMonsterTypeId: { [key: string]: number } = {};
for (const [strId, internalId] of Object.entries(VALUE_TO_MONSTER_TYPE)) {
  internalIdToMonsterTypeId[internalId] = parseInt(strId, 10);
}

// 数値ID→内部IDのマッピングを作成
const raceIdToInternalId: { [key: string]: string } = {};
const monsterTypeIdToInternalId: { [key: string]: string } = {};

// Chrome Storage から取得したマッピングデータを使用
const jaRaceMapping = raceMappingsAll['ja'] || {};
const jaMonsterTypeMapping = monsterTypeMappingsAll['ja'] || {};

for (const [internalId, jaText] of Object.entries(RACE_MAP)) {
  const numericId = jaRaceMapping[jaText];
  if (numericId) {
    raceIdToInternalId[numericId] = internalId;
  }
}

for (const [internalId, jaText] of Object.entries(MONSTER_TYPE_MAP)) {
  const numericId = jaMonsterTypeMapping[jaText];
  if (numericId) {
    monsterTypeIdToInternalId[numericId] = internalId;
  }
}

// ============================================================================
// ファイル生成
// ============================================================================

let output = `/**
 * カード属性・種族・タイプ・効果種類のマップ定義
 *
 * 各マップは以下の構造：
 * - キー: 識別子（英語、小文字）
 * - 値: 表示名（日本語）
 *
 * \`as const\`を使用することで、型を自動生成できる
 */

// ============================================================================
// カードタイプ（CardType）
// ============================================================================

export const CARD_TYPE_MAP = ${JSON.stringify(CARD_TYPE_MAP, null, 2)} as const;

export type CardType = keyof typeof CARD_TYPE_MAP;

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const CARD_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(CARD_TYPE_MAP).map(([id, text]) => [text, id as CardType])
) as Record<string, CardType>;

// ============================================================================
// 属性（Attribute）
// ============================================================================

export const ATTRIBUTE_MAP = ${JSON.stringify(ATTRIBUTE_MAP, null, 2)} as const;

export type Attribute = keyof typeof ATTRIBUTE_MAP;

/**
 * HTMLのimgパス → 識別子への変換マップ
 * imgのsrc属性から "attribute_icon_light.png" → "light" の部分を取り出した後、
 * このマップで識別子に変換する
 */
export const ATTRIBUTE_PATH_TO_ID: Record<string, Attribute> = {
  'light': 'light',
  'dark': 'dark',
  'water': 'water',
  'fire': 'fire',
  'earth': 'earth',
  'wind': 'wind',
  'divine': 'divine',
};

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const ATTRIBUTE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(ATTRIBUTE_MAP).map(([id, text]) => [text, id as Attribute])
) as Record<string, Attribute>;

// ============================================================================
// 種族（Race）
// ============================================================================

export const RACE_MAP = ${JSON.stringify(RACE_MAP, null, 2)} as const;

export type Race = keyof typeof RACE_MAP;

/**
 * 種族の日本語短名称（族の字なし）
 */
export const RACE_SHORT_NAME_MAP = ${JSON.stringify(RACE_SHORT_NAME_MAP, null, 2)} as const;

/**
 * 種族の整数ID（内部値→ID）
 */
export const RACE_ID_MAP = ${JSON.stringify(internalIdToRaceId, null, 2)} as const;

/**
 * 各言語のテキスト → 識別子への変換マップ
 */
`;

// 種族マッピング（全言語）
for (const lang of languages) {
  const mapping = raceMappingsAll[lang];
  const result: { [key: string]: string } = {};

  for (const [text, numericId] of Object.entries(mapping)) {
    const internalId = raceIdToInternalId[numericId];
    if (internalId) {
      result[text] = internalId;
    }
  }

  const varName = lang.toUpperCase();
  output += `export const RACE_TEXT_TO_ID_${varName}: Record<string, Race> = ${JSON.stringify(result, null, 2)};\n\n`;
}

output += `/**
 * 言語ごとのマッピングテーブル
 */
export const RACE_TEXT_TO_ID_BY_LANG: Record<string, Record<string, Race>> = {
`;
for (const lang of languages) {
  output += `  '${lang}': RACE_TEXT_TO_ID_${lang.toUpperCase()},\n`;
}
output += `};

/**
 * 言語コードから適切なマッピングテーブルを取得
 * @param lang 言語コード ('ja', 'en', etc.)
 * @returns マッピングテーブル
 */
export function getRaceTextToId(lang: string): Record<string, Race> {
  return RACE_TEXT_TO_ID_BY_LANG[lang] || RACE_TEXT_TO_ID_JA;
}

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 * @deprecated 言語を指定する getRaceTextToId(lang) を使用してください
 */
export const RACE_TEXT_TO_ID = RACE_TEXT_TO_ID_JA;

// ============================================================================
// モンスタータイプ（MonsterType）
// ============================================================================

export const MONSTER_TYPE_MAP = ${JSON.stringify(MONSTER_TYPE_MAP, null, 2)} as const;

export type MonsterType = keyof typeof MONSTER_TYPE_MAP;

/**
 * モンスタータイプの整数ID（内部値→ID）
 */
export const MONSTER_TYPE_ID_MAP = ${JSON.stringify(internalIdToMonsterTypeId, null, 2)} as const;

/**
 * 各言語のテキスト → 識別子への変換マップ
 */
`;

// モンスタータイプマッピング（全言語）
for (const lang of languages) {
  const mapping = monsterTypeMappingsAll[lang];
  const result: { [key: string]: string } = {};

  for (const [text, numericId] of Object.entries(mapping)) {
    const internalId = monsterTypeIdToInternalId[numericId];
    if (internalId) {
      result[text] = internalId;
    }
  }

  const varName = lang.toUpperCase();
  output += `export const MONSTER_TYPE_TEXT_TO_ID_${varName}: Record<string, MonsterType> = ${JSON.stringify(result, null, 2)};\n\n`;
}

output += `/**
 * 言語ごとのマッピングテーブル
 */
export const MONSTER_TYPE_TEXT_TO_ID_BY_LANG: Record<string, Record<string, MonsterType>> = {
`;
for (const lang of languages) {
  output += `  '${lang}': MONSTER_TYPE_TEXT_TO_ID_${lang.toUpperCase()},\n`;
}
output += `};

/**
 * 言語コードから適切なマッピングテーブルを取得
 * @param lang 言語コード ('ja', 'en', etc.)
 * @returns マッピングテーブル
 */
export function getMonsterTypeTextToId(lang: string): Record<string, MonsterType> {
  return MONSTER_TYPE_TEXT_TO_ID_BY_LANG[lang] || MONSTER_TYPE_TEXT_TO_ID_JA;
}

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 * @deprecated 言語を指定する getMonsterTypeTextToId(lang) を使用してください
 */
export const MONSTER_TYPE_TEXT_TO_ID = MONSTER_TYPE_TEXT_TO_ID_JA;

// ============================================================================
// 魔法効果種類（SpellEffectType）
// ============================================================================

export const SPELL_EFFECT_TYPE_MAP = ${JSON.stringify(SPELL_EFFECT_TYPE_MAP, null, 2)} as const;

export type SpellEffectType = keyof typeof SPELL_EFFECT_TYPE_MAP;

/**
 * HTMLのimgパス → 識別子への変換マップ
 * imgのsrc属性から "effect_icon_quickplay.png" → "quickplay" の部分を取り出した後、
 * このマップで識別子に変換する
 */
export const SPELL_EFFECT_PATH_TO_ID: Record<string, SpellEffectType> = {
  'quickplay': 'quick', // effect_icon_quickplay.png
  'continuous': 'continuous', // effect_icon_continuous.png
  'equip': 'equip', // effect_icon_equip.png
  'field': 'field', // effect_icon_field.png
  'ritual': 'ritual', // effect_icon_ritual.png
  // 'normal'はアイコンがない（デフォルト値として扱う）
};

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const SPELL_EFFECT_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(SPELL_EFFECT_TYPE_MAP).map(([id, text]) => [text, id as SpellEffectType])
) as Record<string, SpellEffectType>;

// ============================================================================
// 罠効果種類（TrapEffectType）
// ============================================================================

export const TRAP_EFFECT_TYPE_MAP = ${JSON.stringify(TRAP_EFFECT_TYPE_MAP, null, 2)} as const;

export type TrapEffectType = keyof typeof TRAP_EFFECT_TYPE_MAP;

/**
 * HTMLのimgパス → 識別子への変換マップ
 * imgのsrc属性から "effect_icon_counter.png" → "counter" の部分を取り出した後、
 * このマップで識別子に変換する
 */
export const TRAP_EFFECT_PATH_TO_ID: Record<string, TrapEffectType> = {
  'continuous': 'continuous', // effect_icon_continuous.png
  'counter': 'counter', // effect_icon_counter.png
  // 'normal'はアイコンがない（デフォルト値として扱う）
};

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const TRAP_EFFECT_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(TRAP_EFFECT_TYPE_MAP).map(([id, text]) => [text, id as TrapEffectType])
) as Record<string, TrapEffectType>;
`;

// ファイルに書き込み
fs.writeFileSync('./src/types/card-maps.ts', output, 'utf-8');
console.log('✓ Generated: ./src/types/card-maps.ts');
console.log('✓ Completely generated from scratch (no dependency on original file)');
