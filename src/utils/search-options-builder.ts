import type { SearchFilters } from '../types/search-filters'
import type { SearchOptions } from '../api/card-search'
import { SORT_ORDER_TO_API_VALUE } from '../api/card-search'
import type { SortOrder } from '../types/settings'

/**
 * SearchFilters から SearchOptions を構築する
 */
export function buildSearchOptions(
  keyword: string,
  searchType: '1' | '2' | '3' | '4',
  sortOrder: SortOrder,
  filters: SearchFilters
): SearchOptions {
  const apiSort = SORT_ORDER_TO_API_VALUE[sortOrder] || 1

  const searchOptions: SearchOptions = {
    keyword,
    searchType,
    resultsPerPage: 100,
    sort: apiSort
  }

  const f = filters
  if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
  if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
  if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
  if (f.levelValues.length > 0) searchOptions.levels = f.levelValues
  if (f.atk.min !== undefined || f.atk.max !== undefined) {
    searchOptions.atk = { from: f.atk.min, to: f.atk.max }
  }
  if (f.def.min !== undefined || f.def.max !== undefined) {
    searchOptions.def = { from: f.def.min, to: f.def.max }
  }
  if (f.monsterTypes.length > 0) {
    const normalTypes = f.monsterTypes.filter(mt => mt.state === 'normal').map(mt => mt.type)
    const notTypes = f.monsterTypes.filter(mt => mt.state === 'not').map(mt => mt.type)
    if (normalTypes.length > 0) searchOptions.monsterTypes = normalTypes as SearchOptions['monsterTypes']
    if (notTypes.length > 0) searchOptions.excludeMonsterTypes = notTypes as SearchOptions['excludeMonsterTypes']
    // normalTypesまたはnotTypesがある場合、AND/OR論理演算を設定
    if (normalTypes.length > 0 || notTypes.length > 0) {
      searchOptions.monsterTypeLogic = f.monsterTypeMatchMode === 'and' ? 'AND' : 'OR'
    }
  }
  if (f.linkValues.length > 0) searchOptions.linkNumbers = f.linkValues
  if (f.linkMarkers.length > 0) {
    searchOptions.linkMarkers = f.linkMarkers
    searchOptions.linkMarkerLogic = f.linkMarkerMatchMode === 'and' ? 'AND' : 'OR'
  }
  if (f.scaleValues.length > 0) searchOptions.pendulumScales = f.scaleValues
  if (f.spellTypes.length > 0) searchOptions.spellEffectTypes = f.spellTypes as SearchOptions['spellEffectTypes']
  if (f.trapTypes.length > 0) searchOptions.trapEffectTypes = f.trapTypes as SearchOptions['trapEffectTypes']
  if (f.releaseDate.from || f.releaseDate.to) {
    searchOptions.releaseDate = {}
    if (f.releaseDate.from) {
      const parts = f.releaseDate.from.split('-')
      if (parts[0] && parts[1] && parts[2]) {
        const year: number = parseInt(parts[0], 10)
        const month: number = parseInt(parts[1], 10)
        const day: number = parseInt(parts[2], 10)
        searchOptions.releaseDate.start = { year, month, day }
      }
    }
    if (f.releaseDate.to) {
      const parts = f.releaseDate.to.split('-')
      if (parts[0] && parts[1] && parts[2]) {
        const year: number = parseInt(parts[0], 10)
        const month: number = parseInt(parts[1], 10)
        const day: number = parseInt(parts[2], 10)
        searchOptions.releaseDate.end = { year, month, day }
      }
    }
  }

  return searchOptions
}
