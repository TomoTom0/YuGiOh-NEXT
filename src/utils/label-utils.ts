/**
 * カードラベル変換ユーティリティ
 *
 * カードの属性、種族、タイプなどの内部値を
 * 表示用の日本語ラベルに変換する関数群
 */

/**
 * 属性の内部値を日本語ラベルに変換
 */
export const getAttributeLabel = (attr: string): string => {
  const labels: Record<string, string> = {
    light: '光', dark: '闇', water: '水', fire: '炎',
    earth: '地', wind: '風', divine: '神'
  }
  return labels[attr] || attr
}

/**
 * 種族の内部値を日本語ラベルに変換
 */
export const getRaceLabel = (race: string): string => {
  const labels: Record<string, string> = {
    dragon: 'ドラゴン', spellcaster: '魔法使い', warrior: '戦士', machine: '機械',
    fiend: '悪魔', fairy: '天使', zombie: 'アンデット', beast: '獣',
    beastwarrior: '獣戦士', plant: '植物', insect: '昆虫', aqua: '水',
    fish: '魚', seaserpent: '海竜', reptile: '爬虫類', dinosaur: '恐竜',
    windbeast: '鳥獣', rock: '岩石', pyro: '炎', thunder: '雷',
    psychic: 'サイキック', wyrm: '幻竜', cyberse: 'サイバース', illusion: '幻想魔',
    divine: '幻神獣', creatorgod: '創造神'
  }
  return labels[race] || race
}

/**
 * モンスタータイプの内部値を日本語ラベルに変換
 */
export const getMonsterTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    normal: '通常', effect: '効果', fusion: '融合', ritual: '儀式',
    synchro: 'シンクロ', xyz: 'エクシーズ', pendulum: 'ペンデュラム', link: 'リンク',
    tuner: 'チューナー', flip: 'リバース', toon: 'トゥーン', spirit: 'スピリット',
    union: 'ユニオン', gemini: 'デュアル', special: '特殊召喚'
  }
  return labels[type] || type
}

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
