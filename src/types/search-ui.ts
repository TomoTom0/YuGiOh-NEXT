/**
 * 検索UI関連の型定義
 */

/**
 * 候補リスト項目の型定義
 */
export interface Suggestion {
  value: string
  label: string
}

/**
 * プレビューチップの型定義
 */
export interface PreviewChip {
  label: string
  isNot: boolean
  filterType: string
  value: string
}

/**
 * デッキ候補の型定義
 */
export interface DeckSuggestion {
  dno: number
  name: string
  value: string
  label: string
}
