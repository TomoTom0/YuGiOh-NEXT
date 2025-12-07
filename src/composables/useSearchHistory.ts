/**
 * 検索履歴管理 Composable
 */

import { ref, computed } from 'vue'
import type { SearchHistoryItem } from '@/types/search-history'
import type { SearchFilters } from '@/types/search-filters'

const STORAGE_KEY = 'ygo-next-search-history'
const MAX_HISTORY_SIZE = 50

const historyItems = ref<SearchHistoryItem[]>([])
let loaded = false

// LocalStorageから読み込み
function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    console.log('[useSearchHistory] loadFromStorage:', data ? `${data.length} chars` : 'empty')
    if (data) {
      historyItems.value = JSON.parse(data)
      console.log('[useSearchHistory] loaded items:', historyItems.value.length)
    }
  } catch (error) {
    console.error('[YGO Helper] Failed to load search history:', error)
  }
}

// LocalStorageに保存
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems.value))
  } catch (error) {
    console.error('[YGO Helper] Failed to save search history:', error)
  }
}

export function useSearchHistory() {
  // 初回のみロード
  if (!loaded) {
    loadFromStorage()
    loaded = true
  }

  // お気に入りのみ
  const favoriteItems = computed(() =>
    historyItems.value.filter(item => item.isFavorite)
  )

  // お気に入り以外（通常の履歴）
  const regularItems = computed(() =>
    historyItems.value.filter(item => !item.isFavorite)
  )

  // 検索履歴に追加
  function addToHistory(
    query: string,
    searchMode: string,
    filters: SearchFilters,
    resultCids: string[]
  ) {
    console.log('[useSearchHistory] addToHistory called:', { query, searchMode, resultCount: resultCids.length })

    const newItem: SearchHistoryItem = {
      query,
      searchMode,
      filters: { ...filters },
      resultCids: [...resultCids],
      resultCount: resultCids.length,
      timestamp: Date.now(),
      isFavorite: false
    }

    // 重複削除（同じクエリ+モード+フィルターの組み合わせ）
    historyItems.value = historyItems.value.filter(item => {
      if (item.isFavorite) return true // お気に入りは残す
      return !(
        item.query === query &&
        item.searchMode === searchMode &&
        JSON.stringify(item.filters) === JSON.stringify(filters)
      )
    })

    // 先頭に追加
    historyItems.value.unshift(newItem)
    console.log('[useSearchHistory] 履歴に追加完了 total items:', historyItems.value.length)

    // サイズ制限（お気に入りを除く）
    const favorites = historyItems.value.filter(item => item.isFavorite)
    const regulars = historyItems.value.filter(item => !item.isFavorite)
    if (regulars.length > MAX_HISTORY_SIZE) {
      historyItems.value = [...favorites, ...regulars.slice(0, MAX_HISTORY_SIZE)]
    }

    saveToStorage()
    console.log('[useSearchHistory] localStorage保存完了')
  }

  // お気に入りに追加/削除
  function toggleFavorite(index: number) {
    if (index >= 0 && index < historyItems.value.length) {
      const item = historyItems.value[index]
      if (item) {
        item.isFavorite = !item.isFavorite
        saveToStorage()
      }
    }
  }

  // 履歴から削除
  function removeFromHistory(index: number) {
    if (index >= 0 && index < historyItems.value.length) {
      historyItems.value.splice(index, 1)
      saveToStorage()
    }
  }

  // 検索結果を更新（日付が異なる場合）
  function updateResults(index: number, newResultCids: string[]) {
    if (index >= 0 && index < historyItems.value.length) {
      const item = historyItems.value[index]
      if (!item) return false

      const today = new Date().toDateString()
      const itemDate = new Date(item.timestamp).toDateString()

      // 日付が異なる場合のみ更新
      if (today !== itemDate) {
        item.resultCids = [...newResultCids]
        item.resultCount = newResultCids.length
        item.timestamp = Date.now()
        saveToStorage()
        return true // 更新あり
      }
    }
    return false // 更新なし
  }

  // 全履歴をクリア（お気に入りは残す）
  function clearHistory() {
    historyItems.value = historyItems.value.filter(item => item.isFavorite)
    saveToStorage()
  }

  return {
    historyItems,
    favoriteItems,
    regularItems,
    addToHistory,
    toggleFavorite,
    removeFromHistory,
    updateResults,
    clearHistory
  }
}
