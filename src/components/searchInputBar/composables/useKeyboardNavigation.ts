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

    // Tab, ArrowDown, ArrowUp のナビゲーション
    if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      // ArrowUp または Shift+Tab で前の候補へ
      if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
        if (selectedIndex.value < 0) {
          selectedIndex.value = suggestions.length - 1
        } else if (selectedIndex.value <= 0) {
          selectedIndex.value = suggestions.length - 1
        } else {
          selectedIndex.value--
        }
      } else {
        // ArrowDown または Tab で次の候補へ
        if (selectedIndex.value < 0) {
          selectedIndex.value = 0
        } else {
          selectedIndex.value = (selectedIndex.value + 1) % suggestions.length
        }
      }

      // スクロール処理
      const container = document.querySelector(containerSelector)
      if (container) {
        const selectedItem = container.querySelector('.suggestion-item.selected')
        if (selectedItem) {
          selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
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
