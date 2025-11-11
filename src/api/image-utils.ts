/**
 * Official Yu-Gi-Oh! DB image utilities
 */

const BASE_IMAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/external/image/parts'

/**
 * Get attribute icon URL
 * @param attribute - Attribute name (DARK, LIGHT, WATER, FIRE, EARTH, WIND, DIVINE)
 */
export function getAttributeIconUrl(attribute: string): string {
  if (!attribute) return ''
  const attrLower = attribute.toLowerCase()
  return `${BASE_IMAGE_URL}/attribute/attribute_icon_${attrLower}.png`
}

/**
 * Get level icon URL
 */
export function getLevelIconUrl(): string {
  return `${BASE_IMAGE_URL}/icon_level.png`
}

/**
 * Get rank icon URL
 */
export function getRankIconUrl(): string {
  return `${BASE_IMAGE_URL}/icon_rank.png`
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
