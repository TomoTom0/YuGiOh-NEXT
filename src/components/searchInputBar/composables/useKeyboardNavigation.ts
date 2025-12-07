/**
 * キーボードナビゲーション管理のComposable
 * 候補リストのキーボード操作を担当
 */

import { ref, type Ref } from 'vue'

export interface UseKeyboardNavigationOptions {
  onEscape?: () => void
}

export interface UseKeyboardNavigationReturn {
  selectedSuggestionIndex: Ref<number>
  selectedCommandIndex: Ref<number>
  selectedMydeckIndex: Ref<number>
  handleSuggestionNavigation: <T>(
    event: KeyboardEvent,
    selectedIndex: Ref<number>,
    suggestions: T[],
    onSelect: (item: T) => void,
    containerSelector: string
  ) => boolean
  resetAllIndices: () => void
}

export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const selectedSuggestionIndex = ref(-1)
  const selectedCommandIndex = ref(-1)
  const selectedMydeckIndex = ref(-1)

  /**
   * 候補リストのナビゲーション処理
   * @returns イベントが処理された場合 true
   */
  const handleSuggestionNavigation = <T>(
    event: KeyboardEvent,
    selectedIndex: Ref<number>,
    suggestions: T[],
    onSelect: (item: T) => void,
    containerSelector: string
  ): boolean => {
    if (suggestions.length === 0) return false

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (selectedIndex.value < suggestions.length - 1) {
        selectedIndex.value++
        // スクロール処理
        const container = document.querySelector(containerSelector)
        if (container) {
          const selectedItem = container.querySelector('.suggestion-item.selected')
          if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }
      }
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (selectedIndex.value > 0) {
        selectedIndex.value--
        // スクロール処理
        const container = document.querySelector(containerSelector)
        if (container) {
          const selectedItem = container.querySelector('.suggestion-item.selected')
          if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }
      } else if (selectedIndex.value === 0) {
        selectedIndex.value = -1
      }
      return true
    }

    if (event.key === 'Enter' && selectedIndex.value >= 0) {
      event.preventDefault()
      const selected = suggestions[selectedIndex.value]
      if (selected) {
        onSelect(selected)
      }
      return true
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      selectedIndex.value = -1
      if (options.onEscape) {
        options.onEscape()
      }
      return true
    }

    return false
  }

  /**
   * 全てのインデックスをリセット
   */
  const resetAllIndices = () => {
    selectedSuggestionIndex.value = -1
    selectedCommandIndex.value = -1
    selectedMydeckIndex.value = -1
  }

  return {
    selectedSuggestionIndex,
    selectedCommandIndex,
    selectedMydeckIndex,
    handleSuggestionNavigation,
    resetAllIndices
  }
}
