import type { SearchFilters } from '../types/search-filters'
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from './filter-chip-formatter'
import { getRaceLabel } from './filter-label'
import {
  CARD_TYPE_ID_TO_SHORTNAME,
  ATTRIBUTE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_SHORTNAME
} from '../types/card-maps'

/**
 * SearchFiltersをアイコン形式に変換する共通関数
 */
export function convertFiltersToIcons(filters: SearchFilters): { type: string; label: string }[] {
  const icons: { type: string; label: string }[] = []

  // カードタイプ
  if (filters.cardType) {
    icons.push({ type: 'cardType', label: CARD_TYPE_ID_TO_SHORTNAME[filters.cardType] || filters.cardType })
  }

  // 属性
  filters.attributes.forEach(attr => {
    icons.push({ type: 'attr', label: ATTRIBUTE_ID_TO_NAME[attr] || attr })
  })

  // 種族（短縮表示）
  filters.races.forEach(race => {
    icons.push({ type: 'race', label: getRaceLabel(race) })
  })

  // レベル（統合表示）
  if (filters.levelValues.length > 0) {
    icons.push({ type: 'level', label: formatNumberRange(filters.levelValues, '★') })
  }

  // ATK/DEF
  const atkLabel = formatStatLabel('ATK', filters.atk)
  if (atkLabel) {
    icons.push({ type: 'atk', label: atkLabel })
  }
  const defLabel = formatStatLabel('DEF', filters.def)
  if (defLabel) {
    icons.push({ type: 'def', label: defLabel })
  }

  // モンスタータイプ
  filters.monsterTypes.forEach(mt => {
    icons.push({ type: 'monsterType', label: MONSTER_TYPE_ID_TO_SHORTNAME[mt.type] || mt.type.slice(0, 1) })
  })

  // リンク数（統合表示）
  if (filters.linkValues.length > 0) {
    icons.push({ type: 'link', label: formatNumberRange(filters.linkValues, 'L') })
  }

  // ペンデュラムスケール（統合表示）
  if (filters.scaleValues.length > 0) {
    icons.push({ type: 'scale', label: formatNumberRange(filters.scaleValues, 'PS') })
  }

  // リンクマーカー
  const linkMarkerLabel = formatLinkMarkerLabel(filters.linkMarkers)
  if (linkMarkerLabel) {
    icons.push({ type: 'linkMarker', label: linkMarkerLabel })
  }

  return icons
}
