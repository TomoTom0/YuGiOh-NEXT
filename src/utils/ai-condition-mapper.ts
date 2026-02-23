/**
 * AI抽出条件をSearchFiltersに変換するユーティリティ
 */

import type { TextCondition } from '@/types/ai-text-link'
import type { SearchFilters } from '@/types/search-filters'
import type { Attribute, Race } from '@/types/card'

/**
 * レベル値の範囲（1-12）
 */
const LEVEL_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * 全属性
 */
const ALL_ATTRIBUTES: Attribute[] = ['light', 'dark', 'earth', 'water', 'fire', 'wind']

/**
 * 全種族
 */
const ALL_RACES: Race[] = [
  'dragon',
  'spellcaster',
  'zombie',
  'warrior',
  'beast',
  'windbeast',
  'fiend',
  'fairy',
  'insect',
  'dinosaur',
  'reptile',
  'fish',
  'seaserpent',
  'machine',
  'thunder',
  'aqua',
  'pyro',
  'rock',
  'plant',
  'psychic',
  'wyrm',
  'cyberse',
  'illusion',
  'creatorgod'
]

/**
 * 条件をSearchFiltersに変換
 * @param condition 抽出された条件
 * @param currentFilters 現在のフィルタ（マージ用）
 * @returns 更新後のフィルタ
 */
export function conditionToFilters(
  condition: TextCondition,
  currentFilters: SearchFilters
): Partial<SearchFilters> {
  switch (condition.type) {
    case 'attribute':
      return mapAttribute(condition)
    case 'race':
      return mapRace(condition)
    case 'level':
      return mapLevel(condition)
    case 'rank':
      return mapLevel(condition) // ランクもレベルと同じ扱い
    case 'link':
      return mapLevel(condition) // リンクもレベルと同じ扱い
    case 'atk':
      return mapAtk(condition)
    case 'def':
      return mapDef(condition)
    case 'cardName':
      return { cardType: null } // カード名検索はsearchQueryを使用
    case 'category':
      return {} // カテゴリは現在SearchFiltersにないので未実装
    case 'composite':
      return condition.filters || {}
    default:
      return {}
  }
}

/**
 * 属性条件をマッピング
 */
function mapAttribute(condition: TextCondition): Partial<SearchFilters> {
  const value = condition.value as Attribute

  if (condition.operator === 'not') {
    // 「光属性以外」→ 光を除く全属性
    return { attributes: ALL_ATTRIBUTES.filter(a => a !== value) }
  }

  return { attributes: [value] }
}

/**
 * 種族条件をマッピング
 */
function mapRace(condition: TextCondition): Partial<SearchFilters> {
  const value = condition.value as Race

  if (condition.operator === 'not') {
    // 「ドラゴン族以外」→ ドラゴンを除く全種族
    return { races: ALL_RACES.filter(r => r !== value) }
  }

  return { races: [value] }
}

/**
 * レベル条件をマッピング
 */
function mapLevel(condition: TextCondition): Partial<SearchFilters> {
  const value = condition.value as number

  if (condition.operator === 'exact') {
    return { levelValues: [value] }
  }

  if (condition.operator === 'at_least') {
    // 「レベル5以上」→ 5-12
    return { levelValues: LEVEL_RANGE.filter(l => l >= value) }
  }

  if (condition.operator === 'at_most') {
    // 「レベル4以下」→ 1-4
    return { levelValues: LEVEL_RANGE.filter(l => l <= value) }
  }

  if (condition.operator === 'not') {
    // 「レベル5以外」→ 5を除く全レベル
    return { levelValues: LEVEL_RANGE.filter(l => l !== value) }
  }

  return {}
}

/**
 * 攻撃力条件をマッピング
 */
function mapAtk(condition: TextCondition): Partial<SearchFilters> {
  const value = condition.value as number

  if (condition.operator === 'exact') {
    return { atk: { exact: true, unknown: false, min: value, max: value } }
  }

  if (condition.operator === 'at_least') {
    return { atk: { exact: false, unknown: false, min: value } }
  }

  if (condition.operator === 'at_most') {
    return { atk: { exact: false, unknown: false, max: value } }
  }

  return {}
}

/**
 * 守備力条件をマッピング
 */
function mapDef(condition: TextCondition): Partial<SearchFilters> {
  const value = condition.value as number

  if (condition.operator === 'exact') {
    return { def: { exact: true, unknown: false, min: value, max: value } }
  }

  if (condition.operator === 'at_least') {
    return { def: { exact: false, unknown: false, min: value } }
  }

  if (condition.operator === 'at_most') {
    return { def: { exact: false, unknown: false, max: value } }
  }

  return {}
}
