/**
 * Official Yu-Gi-Oh! DB image utilities
 */

import { detectCardGameType } from '../utils/page-detector'
import { getImagePartsBaseUrl } from '../utils/url-builder'

/**
 * Get base image URL based on current game type
 */
function getBaseImageUrl(): string {
  const gameType = detectCardGameType()
  return getImagePartsBaseUrl(gameType)
}

/**
 * Get attribute icon URL
 * @param attribute - Attribute name (DARK, LIGHT, WATER, FIRE, EARTH, WIND, DIVINE)
 */
export function getAttributeIconUrl(attribute: string): string {
  if (!attribute) return ''
  const attrLower = attribute.toLowerCase()
  return `${getBaseImageUrl()}/attribute/attribute_icon_${attrLower}.png`
}

/**
 * Get level icon URL
 */
export function getLevelIconUrl(): string {
  return `${getBaseImageUrl()}/icon_level.png`
}

/**
 * Get rank icon URL
 */
export function getRankIconUrl(): string {
  return `${getBaseImageUrl()}/icon_rank.png`
}

/**
 * Get spell card icon URL
 */
export function getSpellIconUrl(): string {
  return `${getBaseImageUrl()}/attribute/attribute_icon_spell.png`
}

/**
 * Get trap card icon URL
 */
export function getTrapIconUrl(): string {
  return `${getBaseImageUrl()}/attribute/attribute_icon_trap.png`
}

/**
 * Get effect type icon URL
 * @param effectType - Effect type (quick, equip, field, continuous, ritual, counter)
 */
export function getEffectTypeIconUrl(effectType: string): string | null {
  if (!effectType || effectType === 'normal') return null
  
  const pathMap: Record<string, string> = {
    'quick': 'quickplay',
    'continuous': 'continuous',
    'equip': 'equip',
    'field': 'field',
    'ritual': 'ritual',
    'counter': 'counter'
  }
  
  const path = pathMap[effectType.toLowerCase()]
  if (!path) return null

  return `${getBaseImageUrl()}/effect/effect_icon_${path}.png`
}

/**
 * Get link marker classes for official display
 * @param linkMarkers - Link markers bit flag
 * @returns Array of position classes (e.g., ['i_i_1', 'i_i_9'])
 */
export function getLinkMarkerClasses(linkMarkers: number): string[] {
  if (!linkMarkers) return []
  
  const positions: string[] = []
  const positionMap = [
    'i_i_1', 'i_i_2', 'i_i_3',
    'i_i_4', null, 'i_i_6',
    'i_i_7', 'i_i_8', 'i_i_9'
  ]
  
  for (let i = 0; i < 9; i++) {
    if (i !== 4 && (linkMarkers & (1 << i)) && positionMap[i]) {
      positions.push(positionMap[i]!)
    }
  }
  
  return positions
}

/**
 * Get link marker class name based on positions
 * @param linkMarkers - Link markers bit flag
 * @returns Class name like 'link91' for positions 1 and 9
 */
export function getLinkMarkerClassName(linkMarkers: number): string {
  if (!linkMarkers) return ''
  
  const positions: number[] = []
  for (let i = 0; i < 9; i++) {
    if (i !== 4 && (linkMarkers & (1 << i))) {
      positions.push(i + 1) // Position numbers are 1-based
    }
  }
  
  return `link${positions.join('')}`
}
