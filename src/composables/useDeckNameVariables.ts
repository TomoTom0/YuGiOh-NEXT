/**
 * デッキ名入力欄の @-mark 変数入力（@orig で元のデッキ名挿入 等）を管理するComposable
 */

import { ref, computed, nextTick, type Ref, type ComputedRef } from 'vue'

// SuggestionList.vue の Suggestion 型と同一の形状（.vue からの named export は shims-vue.d.ts の都合で型解決できないため複製）
export interface Suggestion {
  value: string
  label: string
}

export interface DeckNameVariable {
  key: string
  label: string
  resolve: () => string
}

export interface UseDeckNameVariablesOptions {
  inputValue: Ref<string>
  inputElement: Ref<HTMLInputElement | null>
  variables: DeckNameVariable[]
}

export interface UseDeckNameVariablesReturn {
  suggestions: ComputedRef<Suggestion[]>
  selectedIndex: Ref<number>
  handleInput: () => void
  handleKeydown: (event: KeyboardEvent) => boolean
  selectSuggestion: (suggestion: Suggestion) => void
  resetSuggestion: () => void
}

// カーソル直前の "@word" パターン（wordは空文字列も許容し、@直後の候補一覧表示に対応）
const TRIGGER_PATTERN = /@([a-zA-Z0-9_-]*)$/

export function useDeckNameVariables(options: UseDeckNameVariablesOptions): UseDeckNameVariablesReturn {
  const { inputValue, inputElement, variables } = options

  const matchedQuery = ref<string | null>(null)
  const selectedIndex = ref(-1)

  const getCursorPos = (): number => {
    return inputElement.value?.selectionStart ?? inputValue.value.length
  }

  const handleInput = (): void => {
    const before = inputValue.value.slice(0, getCursorPos())
    const match = TRIGGER_PATTERN.exec(before)
    matchedQuery.value = match ? (match[1] ?? '') : null
    selectedIndex.value = -1
  }

  const suggestions = computed<Suggestion[]>(() => {
    if (matchedQuery.value === null) return []
    const query = matchedQuery.value.toLowerCase()
    return variables
      .filter(v => v.key.toLowerCase().startsWith(query))
      .map(v => ({ value: `@${v.key}`, label: v.label }))
  })

  const applyVariable = (variableKey: string): void => {
    const query = matchedQuery.value ?? ''
    const cursorPos = getCursorPos()
    const triggerStart = cursorPos - query.length - 1 // '@' 分を含める
    const variable = variables.find(v => v.key === variableKey)
    if (!variable || triggerStart < 0) return

    const value = variable.resolve()
    const before = inputValue.value.slice(0, triggerStart)
    const after = inputValue.value.slice(cursorPos)
    inputValue.value = `${before}${value}${after}`
    matchedQuery.value = null
    selectedIndex.value = -1

    const newCursorPos = before.length + value.length
    void nextTick(() => {
      inputElement.value?.setSelectionRange(newCursorPos, newCursorPos)
      inputElement.value?.focus()
    })
  }

  const selectSuggestion = (suggestion: Suggestion): void => {
    applyVariable(suggestion.value.replace(/^@/, ''))
  }

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (suggestions.value.length === 0) return false

    if (event.key === 'ArrowDown' || event.key === 'Tab') {
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIndex.value = selectedIndex.value <= 0
        ? suggestions.value.length - 1
        : selectedIndex.value - 1
      return true
    }
    if (event.key === 'Enter') {
      const index = selectedIndex.value >= 0 ? selectedIndex.value : 0
      const suggestion = suggestions.value[index]
      if (suggestion) {
        event.preventDefault()
        selectSuggestion(suggestion)
        return true
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      resetSuggestion()
      return true
    }
    return false
  }

  const resetSuggestion = (): void => {
    matchedQuery.value = null
    selectedIndex.value = -1
  }

  return {
    suggestions,
    selectedIndex,
    handleInput,
    handleKeydown,
    selectSuggestion,
    resetSuggestion
  }
}
