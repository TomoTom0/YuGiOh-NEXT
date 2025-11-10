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
  "monster": "モンスター",
  "spell": "魔法",
  "trap": "罠"
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
  "light": "光",
  "dark": "闇",
  "water": "水",
  "fire": "炎",
  "earth": "地",
  "wind": "風",
  "divine": "神"
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
  "dragon": "ドラゴン族",
  "warrior": "戦士族",
  "spellcaster": "魔法使い族",
  "fairy": "天使族",
  "fiend": "悪魔族",
  "zombie": "アンデット族",
  "machine": "機械族",
  "aqua": "水族",
  "pyro": "炎族",
  "rock": "岩石族",
  "windbeast": "鳥獣族",
  "plant": "植物族",
  "insect": "昆虫族",
  "thunder": "雷族",
  "beast": "獣族",
  "beastwarrior": "獣戦士族",
  "dinosaur": "恐竜族",
  "fish": "魚族",
  "seaserpent": "海竜族",
  "reptile": "爬虫類族",
  "psychic": "サイキック族",
  "divine": "幻神獣族",
  "creatorgod": "創造神族",
  "wyrm": "幻竜族",
  "cyberse": "サイバース族",
  "illusion": "幻想魔族"
} as const;

export type Race = keyof typeof RACE_MAP;

/**
 * 各言語のテキスト → 識別子への変換マップ
 */
export const RACE_TEXT_TO_ID_JA: Record<string, Race> = {
  "魔法使い族": "spellcaster",
  "ドラゴン族": "dragon",
  "アンデット族": "zombie",
  "戦士族": "warrior",
  "獣戦士族": "beastwarrior",
  "獣族": "beast",
  "鳥獣族": "windbeast",
  "悪魔族": "fiend",
  "天使族": "fairy",
  "昆虫族": "insect",
  "恐竜族": "dinosaur",
  "爬虫類族": "reptile",
  "魚族": "fish",
  "海竜族": "seaserpent",
  "水族": "aqua",
  "炎族": "pyro",
  "雷族": "thunder",
  "岩石族": "rock",
  "植物族": "plant",
  "機械族": "machine",
  "サイキック族": "psychic",
  "幻神獣族": "divine",
  "創造神族": "creatorgod",
  "幻竜族": "wyrm",
  "サイバース族": "cyberse",
  "幻想魔族": "illusion"
};

export const RACE_TEXT_TO_ID_KO: Record<string, Race> = {
  "마법사족": "spellcaster",
  "드래곤족": "dragon",
  "언데드족": "zombie",
  "전사족": "warrior",
  "야수전사족": "beastwarrior",
  "야수족": "beast",
  "비행야수족": "windbeast",
  "악마족": "fiend",
  "천사족": "fairy",
  "곤충족": "insect",
  "공룡족": "dinosaur",
  "파충류족": "reptile",
  "어류족": "fish",
  "해룡족": "seaserpent",
  "물족": "aqua",
  "화염족": "pyro",
  "번개족": "thunder",
  "암석족": "rock",
  "식물족": "plant",
  "기계족": "machine",
  "사이킥족": "psychic",
  "환신야수족": "divine",
  "환룡족": "wyrm",
  "사이버스족": "cyberse",
  "환상마족": "illusion"
};

export const RACE_TEXT_TO_ID_AE: Record<string, Race> = {
  "Spellcaster": "spellcaster",
  "Dragon": "dragon",
  "Zombie": "zombie",
  "Warrior": "warrior",
  "Beast-Warrior": "beastwarrior",
  "Beast": "beast",
  "Winged Beast": "windbeast",
  "Fiend": "fiend",
  "Fairy": "fairy",
  "Insect": "insect",
  "Dinosaur": "dinosaur",
  "Reptile": "reptile",
  "Fish": "fish",
  "Sea Serpent": "seaserpent",
  "Aqua": "aqua",
  "Pyro": "pyro",
  "Thunder": "thunder",
  "Rock": "rock",
  "Plant": "plant",
  "Machine": "machine",
  "Psychic": "psychic",
  "Wyrm": "wyrm",
  "Cyberse": "cyberse",
  "Illusion": "illusion",
  "Divine-Beast": "divine"
};

export const RACE_TEXT_TO_ID_CN: Record<string, Race> = {
  "魔法师族": "spellcaster",
  "龙族": "dragon",
  "不死族": "zombie",
  "战士族": "warrior",
  "兽战士族": "beastwarrior",
  "兽族": "beast",
  "鸟兽族": "windbeast",
  "恶魔族": "fiend",
  "天使族": "fairy",
  "昆虫族": "insect",
  "恐龙族": "dinosaur",
  "爬虫类族": "reptile",
  "鱼族": "fish",
  "海龙族": "seaserpent",
  "水族": "aqua",
  "炎族": "pyro",
  "雷族": "thunder",
  "岩石族": "rock",
  "植物族": "plant",
  "机械族": "machine",
  "念动力族": "psychic",
  "幻龙族": "wyrm",
  "电子界族": "cyberse",
  "幻想魔族": "illusion",
  "幻神兽族": "divine"
};

export const RACE_TEXT_TO_ID_EN: Record<string, Race> = {
  "Spellcaster": "spellcaster",
  "Dragon": "dragon",
  "Zombie": "zombie",
  "Warrior": "warrior",
  "Beast-Warrior": "beastwarrior",
  "Beast": "beast",
  "Winged Beast": "windbeast",
  "Fiend": "fiend",
  "Fairy": "fairy",
  "Insect": "insect",
  "Dinosaur": "dinosaur",
  "Reptile": "reptile",
  "Fish": "fish",
  "Sea Serpent": "seaserpent",
  "Aqua": "aqua",
  "Pyro": "pyro",
  "Thunder": "thunder",
  "Rock": "rock",
  "Plant": "plant",
  "Machine": "machine",
  "Psychic": "psychic",
  "Divine-Beast": "divine",
  "Wyrm": "wyrm",
  "Cyberse": "cyberse",
  "Illusion": "illusion"
};

export const RACE_TEXT_TO_ID_DE: Record<string, Race> = {
  "Hexer": "spellcaster",
  "Drache": "dragon",
  "Zombie": "zombie",
  "Krieger": "warrior",
  "Ungeheuer-Krieger": "beastwarrior",
  "Ungeheuer": "beast",
  "Geflügeltes Ungeheuer": "windbeast",
  "Unterweltler": "fiend",
  "Fee": "fairy",
  "Insekt": "insect",
  "Dinosaurier": "dinosaur",
  "Reptil": "reptile",
  "Fisch": "fish",
  "Seeschlange": "seaserpent",
  "Aqua": "aqua",
  "Pyro": "pyro",
  "Donner": "thunder",
  "Fels": "rock",
  "Pflanze": "plant",
  "Maschine": "machine",
  "Psi": "psychic",
  "Göttliches Ungeheuer": "divine",
  "Wyrm": "wyrm",
  "Cyberse": "cyberse",
  "Illusion": "illusion"
};

export const RACE_TEXT_TO_ID_FR: Record<string, Race> = {
  "Magicien": "spellcaster",
  "Dragon": "dragon",
  "Zombie": "zombie",
  "Guerrier": "warrior",
  "Bête-Guerrier": "beastwarrior",
  "Bête": "beast",
  "Bête Ailée": "windbeast",
  "Démon": "fiend",
  "Elfe": "fairy",
  "Insecte": "insect",
  "Dinosaure": "dinosaur",
  "Reptile": "reptile",
  "Poisson": "fish",
  "Serpent de Mer": "seaserpent",
  "Aqua": "aqua",
  "Pyro": "pyro",
  "Tonnerre": "thunder",
  "Rocher": "rock",
  "Plante": "plant",
  "Machine": "machine",
  "Psychique": "psychic",
  "Bête Divine": "divine",
  "Wyrm": "wyrm",
  "Cyberse": "cyberse",
  "Illusion": "illusion"
};

export const RACE_TEXT_TO_ID_IT: Record<string, Race> = {
  "Incantatore": "spellcaster",
  "Drago": "dragon",
  "Zombie": "zombie",
  "Guerriero": "warrior",
  "Guerriero-Bestia": "beastwarrior",
  "Bestia": "beast",
  "Bestia Alata": "windbeast",
  "Demone": "fiend",
  "Fata": "fairy",
  "Insetto": "insect",
  "Dinosauro": "dinosaur",
  "Rettile": "reptile",
  "Pesce": "fish",
  "Serpente Marino": "seaserpent",
  "Acqua": "aqua",
  "Pyro": "pyro",
  "Tuono": "thunder",
  "Roccia": "rock",
  "Pianta": "plant",
  "Macchina": "machine",
  "Psichico": "psychic",
  "Divinità-Bestia": "divine",
  "Wyrm": "wyrm",
  "Cyberso": "cyberse",
  "Illusione": "illusion"
};

export const RACE_TEXT_TO_ID_ES: Record<string, Race> = {
  "Lanzador de Conjuros": "spellcaster",
  "Dragón": "dragon",
  "Zombi": "zombie",
  "Guerrero": "warrior",
  "Guerrero-Bestia": "beastwarrior",
  "Bestia": "beast",
  "Bestia Alada": "windbeast",
  "Demonio": "fiend",
  "Hada": "fairy",
  "Insecto": "insect",
  "Dinosaurio": "dinosaur",
  "Reptil": "reptile",
  "Pez": "fish",
  "Serpiente Marina": "seaserpent",
  "Aqua": "aqua",
  "Piro": "pyro",
  "Trueno": "thunder",
  "Roca": "rock",
  "Planta": "plant",
  "Máquina": "machine",
  "Psíquico": "psychic",
  "Bestia Divina": "divine",
  "Wyrm": "wyrm",
  "Ciberso": "cyberse",
  "Ilusión": "illusion"
};

export const RACE_TEXT_TO_ID_PT: Record<string, Race> = {
  "Mago": "spellcaster",
  "Dragão": "dragon",
  "Zumbi": "zombie",
  "Guerreiro": "warrior",
  "Besta-Guerreira": "beastwarrior",
  "Besta": "beast",
  "Besta Alada": "windbeast",
  "Demônio": "fiend",
  "Fada": "fairy",
  "Inseto": "insect",
  "Dinossauro": "dinosaur",
  "Réptil": "reptile",
  "Peixe": "fish",
  "Serpente Marinha": "seaserpent",
  "Aqua": "aqua",
  "Piro": "pyro",
  "Trovão": "thunder",
  "Rocha": "rock",
  "Planta": "plant",
  "Máquina": "machine",
  "Psíquico": "psychic",
  "Besta Divina": "divine",
  "Wyrm": "wyrm",
  "Ciberso": "cyberse",
  "Ilusão": "illusion"
};

/**
 * 言語ごとのマッピングテーブル
 */
export const RACE_TEXT_TO_ID_BY_LANG: Record<string, Record<string, Race>> = {
  'ja': RACE_TEXT_TO_ID_JA,
  'ko': RACE_TEXT_TO_ID_KO,
  'ae': RACE_TEXT_TO_ID_AE,
  'cn': RACE_TEXT_TO_ID_CN,
  'en': RACE_TEXT_TO_ID_EN,
  'de': RACE_TEXT_TO_ID_DE,
  'fr': RACE_TEXT_TO_ID_FR,
  'it': RACE_TEXT_TO_ID_IT,
  'es': RACE_TEXT_TO_ID_ES,
  'pt': RACE_TEXT_TO_ID_PT,
};

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

export const MONSTER_TYPE_MAP = {
  "normal": "通常",
  "effect": "効果",
  "fusion": "融合",
  "ritual": "儀式",
  "synchro": "シンクロ",
  "xyz": "エクシーズ",
  "pendulum": "ペンデュラム",
  "link": "リンク",
  "tuner": "チューナー",
  "spirit": "スピリット",
  "union": "ユニオン",
  "gemini": "デュアル",
  "flip": "リバース",
  "toon": "トゥーン",
  "special": "特殊召喚"
} as const;

export type MonsterType = keyof typeof MONSTER_TYPE_MAP;

/**
 * 各言語のテキスト → 識別子への変換マップ
 */
export const MONSTER_TYPE_TEXT_TO_ID_JA: Record<string, MonsterType> = {
  "通常": "normal",
  "効果": "effect",
  "儀式": "ritual",
  "融合": "fusion",
  "シンクロ": "synchro",
  "エクシーズ": "xyz",
  "トゥーン": "toon",
  "スピリット": "spirit",
  "ユニオン": "union",
  "デュアル": "gemini",
  "チューナー": "tuner",
  "リバース": "flip",
  "ペンデュラム": "pendulum",
  "特殊召喚": "special",
  "リンク": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_KO: Record<string, MonsterType> = {
  "일반": "normal",
  "효과": "effect",
  "의식": "ritual",
  "융합": "fusion",
  "싱크로": "synchro",
  "엑시즈": "xyz",
  "툰": "toon",
  "스피릿": "spirit",
  "유니온": "union",
  "듀얼": "gemini",
  "튜너": "tuner",
  "리버스": "flip",
  "펜듈럼": "pendulum",
  "특수 소환": "special",
  "링크": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_AE: Record<string, MonsterType> = {
  "Normal": "normal",
  "Effect": "effect",
  "Ritual": "ritual",
  "Fusion": "fusion",
  "Synchro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Union": "union",
  "Gemini": "gemini",
  "Tuner": "tuner",
  "Flip": "flip",
  "Pendulum": "pendulum",
  "Link": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_CN: Record<string, MonsterType> = {
  "通常": "normal",
  "效果": "effect",
  "仪式": "ritual",
  "融合": "fusion",
  "同步": "synchro",
  "超量": "xyz",
  "卡通": "toon",
  "灵魂": "spirit",
  "联合": "union",
  "二重": "gemini",
  "协调": "tuner",
  "反转": "flip",
  "灵摆": "pendulum",
  "特殊召唤": "special",
  "连接": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_EN: Record<string, MonsterType> = {
  "Normal": "normal",
  "Effect": "effect",
  "Ritual": "ritual",
  "Fusion": "fusion",
  "Synchro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Union": "union",
  "Gemini": "gemini",
  "Tuner": "tuner",
  "Flip": "flip",
  "Pendulum": "pendulum",
  "Link": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_DE: Record<string, MonsterType> = {
  "Normal": "normal",
  "Effekt": "effect",
  "Ritual": "ritual",
  "Fusion": "fusion",
  "Synchro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Union": "union",
  "Zwilling": "gemini",
  "Empfänger": "tuner",
  "Flipp": "flip",
  "Pendel": "pendulum",
  "Link": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_FR: Record<string, MonsterType> = {
  "Normal": "normal",
  "Effet": "effect",
  "Rituel": "ritual",
  "Fusion": "fusion",
  "Synchro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Union": "union",
  "Gémeau": "gemini",
  "Syntoniseur": "tuner",
  "Flip": "flip",
  "Pendule": "pendulum",
  "Lien": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_IT: Record<string, MonsterType> = {
  "Normale": "normal",
  "Effetto": "effect",
  "Rituale": "ritual",
  "Fusione": "fusion",
  "Synchro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Unione": "union",
  "Gemello": "gemini",
  "Tuner": "tuner",
  "Scoperta": "flip",
  "Pendulum": "pendulum",
  "Link": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_ES: Record<string, MonsterType> = {
  "Normal": "normal",
  "Efecto": "effect",
  "Ritual": "ritual",
  "Fusión": "fusion",
  "Sincronía": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Spirit": "spirit",
  "Unión": "union",
  "Géminis": "gemini",
  "Cantante": "tuner",
  "Volteo": "flip",
  "Péndulo": "pendulum",
  "Enlace": "link"
};

export const MONSTER_TYPE_TEXT_TO_ID_PT: Record<string, MonsterType> = {
  "Normal": "normal",
  "Efeito": "effect",
  "Ritual": "ritual",
  "Fusão": "fusion",
  "Sincro": "synchro",
  "Xyz": "xyz",
  "Toon": "toon",
  "Espírito": "spirit",
  "União": "union",
  "Gêmeos": "gemini",
  "Regulador": "tuner",
  "Virar": "flip",
  "Pêndulo": "pendulum",
  "Link": "link"
};

/**
 * 言語ごとのマッピングテーブル
 */
export const MONSTER_TYPE_TEXT_TO_ID_BY_LANG: Record<string, Record<string, MonsterType>> = {
  'ja': MONSTER_TYPE_TEXT_TO_ID_JA,
  'ko': MONSTER_TYPE_TEXT_TO_ID_KO,
  'ae': MONSTER_TYPE_TEXT_TO_ID_AE,
  'cn': MONSTER_TYPE_TEXT_TO_ID_CN,
  'en': MONSTER_TYPE_TEXT_TO_ID_EN,
  'de': MONSTER_TYPE_TEXT_TO_ID_DE,
  'fr': MONSTER_TYPE_TEXT_TO_ID_FR,
  'it': MONSTER_TYPE_TEXT_TO_ID_IT,
  'es': MONSTER_TYPE_TEXT_TO_ID_ES,
  'pt': MONSTER_TYPE_TEXT_TO_ID_PT,
};

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

export const SPELL_EFFECT_TYPE_MAP = {
  "normal": "通常",
  "quick": "速攻",
  "continuous": "永続",
  "equip": "装備",
  "field": "フィールド",
  "ritual": "儀式"
} as const;

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

export const TRAP_EFFECT_TYPE_MAP = {
  "normal": "通常",
  "continuous": "永続",
  "counter": "カウンター"
} as const;

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
