/**
 * カード属性・種族・タイプ・効果種類のマップ定義（ハードコード）
 *
 * 各マップの命名規則：
 * - {TYPE}_ID_TO_INT: 内部値 → 整数ID
 * - {TYPE}_ID_TO_NAME: 内部値 → 日本語表示名
 * - {TYPE}_ID_TO_SHORTNAME: 内部値 → 日本語短名称（Raceのみ）
 *
 * 言語別マッピング（表示テキスト → 内部値）は extract-mappings.ts で動的に取得
 */

// ============================================================================
// 種族（Race）
// ============================================================================

/**
 * 種族の内部ID → 整数ID マッピング
 * HTMLの種族フィルタの value 属性で使用されるID
 */
export const RACE_ID_TO_INT = {
  'dragon': 1,
  'zombie': 2,
  'fiend': 3,
  'pyro': 4,
  'seaserpent': 5,
  'rock': 6,
  'machine': 7,
  'fish': 8,
  'dinosaur': 9,
  'insect': 10,
  'beast': 11,
  'beastwarrior': 12,
  'plant': 13,
  'aqua': 14,
  'warrior': 15,
  'windbeast': 16,
  'fairy': 17,
  'spellcaster': 18,
  'thunder': 19,
  'reptile': 20,
  'psychic': 21,
  'divine': 22,
  'creatorgod': 23,
  'wyrm': 26,
  'cyberse': 27,
  'illusion': 34,
} as const;

export type Race = keyof typeof RACE_ID_TO_INT;

/**
 * 種族の内部ID → 日本語フルネーム マッピング
 */
export const RACE_ID_TO_NAME = {
  'dragon': 'ドラゴン族',
  'zombie': 'アンデット族',
  'fiend': '悪魔族',
  'pyro': '炎族',
  'seaserpent': '海竜族',
  'rock': '岩石族',
  'machine': '機械族',
  'fish': '魚族',
  'dinosaur': '恐竜族',
  'insect': '昆虫族',
  'beast': '獣族',
  'beastwarrior': '獣戦士族',
  'plant': '植物族',
  'aqua': '水族',
  'warrior': '戦士族',
  'windbeast': '鳥獣族',
  'fairy': '天使族',
  'spellcaster': '魔法使い族',
  'thunder': '雷族',
  'reptile': '爬虫類族',
  'psychic': 'サイキック族',
  'divine': '幻神獣族',
  'creatorgod': '創造神族',
  'wyrm': '幻竜族',
  'cyberse': 'サイバース族',
  'illusion': '幻想魔族',
} as const;

/**
 * 種族の内部ID → 日本語短名称 マッピング（族の字なし）
 */
export const RACE_ID_TO_SHORTNAME = {
  'dragon': 'ドラゴン',
  'zombie': 'アンデット',
  'fiend': '悪魔',
  'pyro': '炎',
  'seaserpent': '海竜',
  'rock': '岩石',
  'machine': '機械',
  'fish': '魚',
  'dinosaur': '恐竜',
  'insect': '昆虫',
  'beast': '獣',
  'beastwarrior': '獣戦士',
  'plant': '植物',
  'aqua': '水',
  'warrior': '戦士',
  'windbeast': '鳥獣',
  'fairy': '天使',
  'spellcaster': '魔法使い',
  'thunder': '雷',
  'reptile': '爬虫類',
  'psychic': 'サイキック',
  'divine': '幻神獣',
  'creatorgod': '創造神',
  'wyrm': '幻竜',
  'cyberse': 'サイバース',
  'illusion': '幻想魔族',
} as const;

// ============================================================================
// 属性（Attribute）
// ============================================================================

/**
 * 属性の内部ID → 整数ID マッピング
 * HTMLの属性フィルタの value 属性で使用されるID
 */
export const ATTRIBUTE_ID_TO_INT = {
  'light': 11,
  'dark': 12,
  'water': 13,
  'fire': 14,
  'earth': 15,
  'wind': 16,
  'divine': 17,
} as const;

export type Attribute = keyof typeof ATTRIBUTE_ID_TO_INT;

/**
 * 属性の内部ID → 日本語表示名 マッピング
 */
export const ATTRIBUTE_ID_TO_NAME = {
  'light': '光',
  'dark': '闇',
  'water': '水',
  'fire': '炎',
  'earth': '地',
  'wind': '風',
  'divine': '神',
} as const;

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

// ============================================================================
// モンスタータイプ（MonsterType）
// ============================================================================

/**
 * モンスタータイプの内部ID → 整数ID マッピング
 */
export const MONSTER_TYPE_ID_TO_INT = {
  'normal': 1,
  'effect': 2,
  'fusion': 3,
  'ritual': 4,
  'synchro': 5,
  'xyz': 6,
  'pendulum': 7,
  'link': 8,
  'tuner': 9,
  'spirit': 10,
  'union': 11,
  'gemini': 12,
  'flip': 13,
  'toon': 14,
  'special': 15,
} as const;

export type MonsterType = keyof typeof MONSTER_TYPE_ID_TO_INT;

/**
 * モンスタータイプの内部ID → 日本語表示名 マッピング
 */
export const MONSTER_TYPE_ID_TO_NAME = {
  'normal': '通常',
  'effect': '効果',
  'fusion': '融合',
  'ritual': '儀式',
  'synchro': 'シンクロ',
  'xyz': 'エクシーズ',
  'pendulum': 'ペンデュラム',
  'link': 'リンク',
  'tuner': 'チューナー',
  'spirit': 'スピリット',
  'union': 'ユニオン',
  'gemini': 'デュアル',
  'flip': 'リバース',
  'toon': 'トゥーン',
  'special': '特殊召喚',
} as const;

// ============================================================================
// 魔法効果種類（SpellEffectType）
// ============================================================================

/**
 * 魔法効果種類の内部ID → 整数ID マッピング
 * HTMLの魔法効果フィルタの value 属性で使用されるID
 */
export const SPELL_EFFECT_TYPE_ID_TO_INT = {
  'normal': 20,
  'quick': 25,
  'continuous': 24,
  'equip': 23,
  'field': 22,
  'ritual': 26,
} as const;

export type SpellEffectType = keyof typeof SPELL_EFFECT_TYPE_ID_TO_INT;

/**
 * 魔法効果種類の内部ID → 日本語表示名 マッピング
 */
export const SPELL_EFFECT_TYPE_ID_TO_NAME = {
  'normal': '通常',
  'quick': '速攻',
  'continuous': '永続',
  'equip': '装備',
  'field': 'フィールド',
  'ritual': '儀式',
} as const;

/**
 * HTMLのimgパス → 識別子への変換マップ
 * imgのsrc属性から "effect_icon_quickplay.png" → "quickplay" の部分を取り出した後、
 * このマップで識別子に変換する
 */
export const SPELL_EFFECT_PATH_TO_ID: Record<string, SpellEffectType> = {
  'quickplay': 'quick',
  'continuous': 'continuous',
  'equip': 'equip',
  'field': 'field',
  'ritual': 'ritual',
};

// ============================================================================
// 罠効果種類（TrapEffectType）
// ============================================================================

/**
 * 罠効果種類の内部ID → 整数ID マッピング
 * HTMLの罠効果フィルタの value 属性で使用されるID
 */
export const TRAP_EFFECT_TYPE_ID_TO_INT = {
  'normal': 20,
  'continuous': 24,
  'counter': 21,
} as const;

export type TrapEffectType = keyof typeof TRAP_EFFECT_TYPE_ID_TO_INT;

/**
 * 罠効果種類の内部ID → 日本語表示名 マッピング
 */
export const TRAP_EFFECT_TYPE_ID_TO_NAME = {
  'normal': '通常',
  'continuous': '永続',
  'counter': 'カウンター',
} as const;

/**
 * HTMLのimgパス → 識別子への変換マップ
 * imgのsrc属性から "effect_icon_counter.png" → "counter" の部分を取り出した後、
 * このマップで識別子に変換する
 */
export const TRAP_EFFECT_PATH_TO_ID: Record<string, TrapEffectType> = {
  'continuous': 'continuous',
  'counter': 'counter',
};

// ============================================================================
// レガシーマッピング（互換性用、廃止予定）
// ============================================================================

/**
 * @deprecated 代わりに RACE_ID_TO_NAME を使用してください
 */
export const RACE_MAP = RACE_ID_TO_NAME;

/**
 * @deprecated 代わりに MONSTER_TYPE_ID_TO_NAME を使用してください
 */
export const MONSTER_TYPE_MAP = MONSTER_TYPE_ID_TO_NAME;

/**
 * @deprecated 代わりに SPELL_EFFECT_TYPE_ID_TO_NAME を使用してください
 */
export const SPELL_EFFECT_TYPE_MAP = SPELL_EFFECT_TYPE_ID_TO_NAME;

/**
 * @deprecated 代わりに TRAP_EFFECT_TYPE_ID_TO_NAME を使用してください
 */
export const TRAP_EFFECT_TYPE_MAP = TRAP_EFFECT_TYPE_ID_TO_NAME;

/**
 * @deprecated 代わりに ATTRIBUTE_ID_TO_NAME を使用してください
 */
export const ATTRIBUTE_MAP = ATTRIBUTE_ID_TO_NAME;

/**
 * @deprecated 言語別マッピングは extract-mappings.ts で動的に取得してください
 */
export const CARD_TYPE_MAP = {
  'monster': 'モンスター',
  'spell': '魔法',
  'trap': '罠',
} as const;

export type CardType = keyof typeof CARD_TYPE_MAP;

/**
 * @deprecated 言語別マッピングは extract-mappings.ts で動的に取得してください
 */
export const CARD_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(CARD_TYPE_MAP).map(([id, text]) => [text, id as CardType])
) as Record<string, CardType>;
