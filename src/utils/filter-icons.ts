import type { SearchFilters } from '../types/search-filters'
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from './filter-chip-formatter'
import { getRaceLabel } from './filter-label'

/**
 * SearchFiltersをアイコン形式に変換する共通関数
 */
export function convertFiltersToIcons(filters: SearchFilters): { type: string; label: string }[] {
  const icons: { type: string; label: string }[] = []

  // カードタイプ
  if (filters.cardType) {
    const typeLabels: Record<string, string> = { monster: 'M', spell: '魔', trap: '罠' }
    icons.push({ type: 'cardType', label: typeLabels[filters.cardType] || filters.cardType })
  }

  // 属性
  const attrLabels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
  filters.attributes.forEach(attr => {
    icons.push({ type: 'attr', label: attrLabels[attr] || attr })
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
  const monsterTypeLabels: Record<string, string> = {
    normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
    pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
    union: 'U', gemini: 'D', special: '特'
  }
  filters.monsterTypes.forEach(mt => {
    icons.push({ type: 'monsterType', label: monsterTypeLabels[mt.type] || mt.type.slice(0, 1) })
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
