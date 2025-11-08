/**
 * カード属性・種族・タイプ・効果種類のマップ定義
 *
 * 各マップは以下の構造：
 * - キー: 識別子（英語、小文字）
 * - 値: 表示名（日本語）
 *
 * `as const`を使用することで、型を自動生成できる
 */

// ============================================================================
// カードタイプ（CardType）
// ============================================================================

export const CARD_TYPE_MAP = {
  monster: 'モンスター',
  spell: '魔法',
  trap: '罠',
} as const;

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

export const ATTRIBUTE_MAP = {
  light: '光',
  dark: '闇',
  water: '水',
  fire: '炎',
  earth: '地',
  wind: '風',
  divine: '神',
} as const;

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

export const RACE_MAP = {
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
} as const;

export type Race = keyof typeof RACE_MAP;

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const RACE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(RACE_MAP).map(([id, text]) => [text, id as Race])
) as Record<string, Race>;

// ============================================================================
// モンスタータイプ（MonsterType）
// ============================================================================

export const MONSTER_TYPE_MAP = {
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
} as const;

export type MonsterType = keyof typeof MONSTER_TYPE_MAP;

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const MONSTER_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(MONSTER_TYPE_MAP).map(([id, text]) => [text, id as MonsterType])
) as Record<string, MonsterType>;

// ============================================================================
// 魔法効果種類（SpellEffectType）
// ============================================================================

export const SPELL_EFFECT_TYPE_MAP = {
  normal: '通常',
  quick: '速攻',
  continuous: '永続',
  equip: '装備',
  field: 'フィールド',
  ritual: '儀式',
} as const;

export type SpellEffectType = keyof typeof SPELL_EFFECT_TYPE_MAP;

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const SPELL_EFFECT_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(SPELL_EFFECT_TYPE_MAP).map(([id, text]) => [text, id as SpellEffectType])
) as Record<string, SpellEffectType>;

// ============================================================================
// 罠効果種類（TrapEffectType）
// ============================================================================

export const TRAP_EFFECT_TYPE_MAP = {
  normal: '通常',
  continuous: '永続',
  counter: 'カウンター',
} as const;

export type TrapEffectType = keyof typeof TRAP_EFFECT_TYPE_MAP;

/**
 * HTMLテキスト → 識別子への変換マップ（逆引き）
 */
export const TRAP_EFFECT_TYPE_TEXT_TO_ID = Object.fromEntries(
  Object.entries(TRAP_EFFECT_TYPE_MAP).map(([id, text]) => [text, id as TrapEffectType])
) as Record<string, TrapEffectType>;
