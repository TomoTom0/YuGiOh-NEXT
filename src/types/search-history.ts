/**
 * 検索履歴の型定義
 */

import type { SearchFilters } from './search-filters'

export interface SearchHistoryItem {
  /** 検索クエリ */
  query: string
  /** 検索モード */
  searchMode: string
  /** フィルター条件 */
  filters: SearchFilters
  /** 検索結果のcid配列 */
  resultCids: string[]
  /** 検索結果件数 */
  resultCount: number
  /** タイムスタンプ（検索実行日時） */
  timestamp: number
  /** お気に入りフラグ */
  isFavorite: boolean
}
