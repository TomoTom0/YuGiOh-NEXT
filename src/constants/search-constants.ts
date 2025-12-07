/**
 * 検索関連の定数定義
 * SearchInputBarで使用するコマンドやマッピングを集約
 */

import {
  ATTRIBUTE_REVERSE_MAP,
  CARD_TYPE_REVERSE_MAP,
  MONSTER_TYPE_REVERSE_MAP
} from '../utils/reverse-map-generator'

/**
 * 全角数字を半角に変換
 */
export const toHalfWidth = (str: string): string => {
  return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
}

/**
 * 柔軟な日付解析（様々な区切り文字に対応）
 */
export const parseFlexibleDate = (dateStr: string): string | null => {
  // 区切りなしの特殊ケース: 20200101
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }

  // 区切りありの場合：正規表現で数値と非数値を区別
  // YYYY<sep>MM<sep>DD の形式（<sep>は任意の非数値文字）
  const match = dateStr.match(/^(\d{4})\D(\d{2})\D(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * コマンド定義
 */
export const COMMANDS: Record<string, { filterType: string; description: string; isNot?: boolean; isAction?: boolean }> = {
  '/attr': { filterType: 'attributes', description: '属性' },
  '/race': { filterType: 'races', description: '種族' },
  '/level': { filterType: 'levels', description: 'レベル/ランク' },
  '/rank': { filterType: 'levels', description: 'レベル/ランク' }, // levelのエイリアス
  '/atk': { filterType: 'atk', description: 'ATK' },
  '/def': { filterType: 'def', description: 'DEF' },
  '/type': { filterType: 'cardType', description: 'カードタイプ' },
  '/link': { filterType: 'linkNumbers', description: 'リンク数' },
  '/lm': { filterType: 'linkMarkers', description: 'リンクマーカー' },
  '/link-marker': { filterType: 'linkMarkers', description: 'リンクマーカー' },
  '/mtype': { filterType: 'monsterTypes', description: 'モンスタータイプ' },
  '/pscale': { filterType: 'pendulumScales', description: 'Pスケール' },
  '/ps': { filterType: 'pendulumScales', description: 'Pスケール' },
  '/date': { filterType: 'releaseDate', description: '発売日' },
  '/search': { filterType: 'searchMode', description: '検索モード' },
  // NOT条件
  '/attr-not': { filterType: 'attributes', description: '属性(除外)', isNot: true },
  '/race-not': { filterType: 'races', description: '種族(除外)', isNot: true },
  '/level-not': { filterType: 'levels', description: 'レベル(除外)', isNot: true },
  '/rank-not': { filterType: 'levels', description: 'レベル(除外)', isNot: true },
  '/type-not': { filterType: 'cardType', description: 'タイプ(除外)', isNot: true },
  '/link-not': { filterType: 'linkNumbers', description: 'リンク(除外)', isNot: true },
  '/mtype-not': { filterType: 'monsterTypes', description: 'Mタイプ(除外)', isNot: true },
  // クリアコマンド
  '/clear': { filterType: 'action', description: '全てクリア', isAction: true },
  '/clear-cond': { filterType: 'action', description: '条件クリア', isAction: true },
  '/clear-text': { filterType: 'action', description: 'テキストクリア', isAction: true },
  '/clear-one-cond': { filterType: 'action', description: '条件を選択して削除', isAction: true }
}

/**
 * 検索モードマッピング
 */
export const SEARCH_MODE_MAP: Record<string, string> = {
  'name': 'name', 'カード名': 'name', 'n': 'name',
  'text': 'text', 'テキスト': 'text', 't': 'text',
  'pend': 'pendulum', 'pendulum': 'pendulum', 'ペンデュラム': 'pendulum', 'p': 'pendulum',
  'mydeck': 'mydeck', 'マイデッキ': 'mydeck', 'd': 'mydeck'
}

/**
 * 属性マッピング（日本語/英語 -> APIキー）
 * 逆引きマップは reverse-map-generator.ts から動的生成（REQ-20対応）
 */
export const ATTRIBUTE_MAP = ATTRIBUTE_REVERSE_MAP

/**
 * カードタイプマッピング
 */
export const CARD_TYPE_MAP = CARD_TYPE_REVERSE_MAP

/**
 * モンスタータイプマッピング
 */
export const MONSTER_TYPE_MAP = MONSTER_TYPE_REVERSE_MAP

/**
 * リンクマーカーの文字列→数値マッピング
 */
export const LINK_MARKER_MAP: Record<string, number> = {
  'bottom-left': 1,
  'bottom': 2,
  'bottom-right': 4,
  'left': 8,
  'right': 16,
  'top-left': 32,
  'top': 64,
  'top-right': 128
}

/**
 * 各フィルタータイプの選択肢
 */
export const FILTER_OPTIONS: Record<string, { value: string; label: string; aliases?: string[] }[]> = {
  attributes: [
    { value: 'light', label: '光' }, { value: 'dark', label: '闇' },
    { value: 'water', label: '水' }, { value: 'fire', label: '炎' },
    { value: 'earth', label: '地' }, { value: 'wind', label: '風' },
    { value: 'divine', label: '神' }
  ],
  cardType: [
    { value: 'monster', label: 'モンスター' },
    { value: 'spell', label: '魔法' },
    { value: 'trap', label: '罠' }
  ],
  races: [
    { value: 'dragon', label: 'ドラゴン', aliases: ['どらごん', '龍', '竜'] },
    { value: 'spellcaster', label: '魔法使い', aliases: ['まほうつかい', '魔'] },
    { value: 'warrior', label: '戦士', aliases: ['せんし', '戦'] },
    { value: 'machine', label: '機械', aliases: ['きかい', '機'] },
    { value: 'fiend', label: '悪魔', aliases: ['あくま', '悪'] },
    { value: 'fairy', label: '天使', aliases: ['てんし', '天'] },
    { value: 'zombie', label: 'アンデット', aliases: ['あんでっと', '不死', 'ゾンビ'] },
    { value: 'beast', label: '獣', aliases: ['けもの', 'じゅう'] },
    { value: 'beastwarrior', label: '獣戦士', aliases: ['じゅうせんし', '獣戦'] },
    { value: 'plant', label: '植物', aliases: ['しょくぶつ', '植'] },
    { value: 'insect', label: '昆虫', aliases: ['こんちゅう', '昆', '虫'] },
    { value: 'aqua', label: '水族', aliases: ['すいぞく', '水'] },
    { value: 'fish', label: '魚族', aliases: ['ぎょぞく', '魚'] },
    { value: 'seaserpent', label: '海竜族', aliases: ['かいりゅうぞく', '海竜', '海'] },
    { value: 'reptile', label: '爬虫類', aliases: ['はちゅうるい', '爬虫', '爬'] },
    { value: 'dinosaur', label: '恐竜', aliases: ['きょうりゅう', '恐'] },
    { value: 'windbeast', label: '鳥獣', aliases: ['ちょうじゅう', '鳥'] },
    { value: 'rock', label: '岩石', aliases: ['がんせき', '岩'] },
    { value: 'pyro', label: '炎族', aliases: ['ほのおぞく', '炎'] },
    { value: 'thunder', label: '雷族', aliases: ['かみなりぞく', '雷'] },
    { value: 'psychic', label: 'サイキック', aliases: ['さいきっく', '念動', '念'] },
    { value: 'wyrm', label: '幻竜族', aliases: ['げんりゅうぞく', '幻竜', '幻'] },
    { value: 'cyberse', label: 'サイバース', aliases: ['さいばーす', '電脳', '電'] }
  ],
  monsterTypes: [
    { value: 'normal', label: '通常' }, { value: 'effect', label: '効果' },
    { value: 'fusion', label: '融合' }, { value: 'ritual', label: '儀式' },
    { value: 'synchro', label: 'シンクロ' }, { value: 'xyz', label: 'エクシーズ' },
    { value: 'pendulum', label: 'ペンデュラム' }, { value: 'link', label: 'リンク' },
    { value: 'tuner', label: 'チューナー' }, { value: 'flip', label: 'リバース' },
    { value: 'toon', label: 'トゥーン' }, { value: 'spirit', label: 'スピリット' },
    { value: 'union', label: 'ユニオン' }, { value: 'gemini', label: 'デュアル' },
    { value: 'special', label: '特殊召喚' }
  ],
  levels: [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
    { value: '10', label: '10' }, { value: '11', label: '11' }, { value: '12', label: '12' }
  ],
  linkNumbers: [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' }
  ],
  linkMarkers: [
    { value: 'top', label: '上' }, { value: 'bottom', label: '下' },
    { value: 'left', label: '左' }, { value: 'right', label: '右' },
    { value: 'top-left', label: '左上' }, { value: 'top-right', label: '右上' },
    { value: 'bottom-left', label: '左下' }, { value: 'bottom-right', label: '右下' }
  ],
  pendulumScales: [
    { value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' },
    { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' },
    { value: '6', label: '6' }, { value: '7', label: '7' }, { value: '8', label: '8' },
    { value: '9', label: '9' }, { value: '10', label: '10' }, { value: '11', label: '11' },
    { value: '12', label: '12' }, { value: '13', label: '13' }
  ],
  searchMode: [
    { value: 'name', label: 'カード名' },
    { value: 'text', label: 'テキスト' },
    { value: 'pend', label: 'ペンデュラム' },
    { value: 'mydeck', label: 'マイデッキ' }
  ]
}
