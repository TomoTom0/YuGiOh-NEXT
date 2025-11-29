/**
 * ATK/DEFのチップラベルを生成する共通関数
 */
export function formatStatLabel(
  stat: 'ATK' | 'DEF',
  filter: { exact: boolean; unknown: boolean; min?: number; max?: number }
): string | null {
  // 有効な値かチェック
  const isValidMin = filter.min !== undefined && !isNaN(filter.min) && filter.min >= 0
  const isValidMax = filter.max !== undefined && !isNaN(filter.max) && filter.max >= 0

  if (filter.unknown) {
    return `${stat}=?`
  } else if (filter.exact && isValidMin) {
    return `${stat}=${filter.min}`
  } else if (isValidMin && isValidMax) {
    // max < min の場合は無効
    if (filter.max! < filter.min!) {
      return null
    }
    return `${stat}:${filter.min}-${filter.max}`
  } else if (isValidMin) {
    return `${stat}≥${filter.min}`
  } else if (isValidMax) {
    return `${stat}≤${filter.max}`
  }
  return null
}

/**
 * リンクマーカーのチップラベルを生成する共通関数
 */
export function formatLinkMarkerLabel(markers: number[]): string | null {
  if (markers.length === 0) return null

  const markerSymbols: Record<number, string> = {
    1: '↙', 2: '↓', 3: '↘',
    4: '←', 6: '→',
    7: '↖', 8: '↑', 9: '↗'
  }

  const symbols = markers.map(m => markerSymbols[m] || m).join('')
  return `L${symbols}`
}

/**
 * 数値範囲を統合表示する（レベル/リンク数用）
 */
export function formatNumberRange(numbers: number[], prefix: string): string {
  if (numbers.length === 0) return ''
  const sorted = [...numbers].sort((a, b) => a - b)

  // 連続した数値をグループ化
  const groups: number[][] = []
  let currentGroup: number[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentGroup.push(sorted[i])
    } else {
      groups.push(currentGroup)
      currentGroup = [sorted[i]]
    }
  }
  groups.push(currentGroup)

  // グループを文字列に変換
  const parts = groups.map(group => {
    if (group.length >= 3) {
      return `${group[0]}-${group[group.length - 1]}`
    } else {
      return group.join(',')
    }
  })

  return `${prefix}${parts.join(',')}`
}
