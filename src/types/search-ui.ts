/**
 * 検索UI関連の型定義
 */

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
