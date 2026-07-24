/**
 * デッキ名冒頭のレギュレーションタグ（[OCG-YYMM] / [GENESYS-YYMM]）入力補助Composable
 *
 * デッキ名冒頭で "[" / "【"（開き括弧のみ、または対応する閉じ括弧までの範囲）が
 * 入力・編集状態になった時、実在する禁止制限リスト/GENESYSリストの版から
 * 候補タグを提示する。
 *
 * @see src/utils/regulation-tag-parser.ts タグの構文
 */

import { ref, computed, nextTick, type Ref, type ComputedRef } from 'vue'
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache'
import { genesysPointCache } from '@/utils/genesys-cache'

export interface Suggestion {
  value: string
  label: string
}

export interface UseDeckRegulationTagSuggestionsOptions {
  inputValue: Ref<string>
  inputElement: Ref<HTMLInputElement | null>
}

export interface UseDeckRegulationTagSuggestionsReturn {
  suggestions: ComputedRef<Suggestion[]>
  selectedIndex: Ref<number>
  handleInput: () => void
  handleKeydown: (event: KeyboardEvent) => boolean
  selectSuggestion: (suggestion: Suggestion) => void
  resetSuggestion: () => void
}

// デッキ名冒頭の未閉じ括弧（[ または 【）を検出。カーソル直前までが対象
const TRIGGER_PATTERN = /^([[【])([^\]】]*)$/

function closeCharFor(open: string): string {
  return open === '[' ? ']' : '】'
}

function ocgDateToYymm(date: string): string {
  return date.slice(2, 4) + date.slice(5, 7)
}

function genesysListParamToYymm(listParam: string): string {
  return listParam.slice(2)
}

function yymmToLabel(yymm: string): string {
  return `20${yymm.slice(0, 2)}年${yymm.slice(2, 4)}月版`
}

export function useDeckRegulationTagSuggestions(
  options: UseDeckRegulationTagSuggestionsOptions
): UseDeckRegulationTagSuggestionsReturn {
  const { inputValue, inputElement } = options

  const matchedBracket = ref<string | null>(null)
  const matchedQuery = ref<string | null>(null)
  const selectedIndex = ref(-1)

  const getCursorPos = (): number => {
    return inputElement.value?.selectionStart ?? inputValue.value.length
  }

  const handleInput = (): void => {
    const before = inputValue.value.slice(0, getCursorPos())
    const match = TRIGGER_PATTERN.exec(before)
    if (match) {
      matchedBracket.value = match[1] ?? null
      matchedQuery.value = match[2] ?? ''
    } else {
      matchedBracket.value = null
      matchedQuery.value = null
    }
    selectedIndex.value = -1
  }

  const candidates = computed<Suggestion[]>(() => {
    const open = matchedBracket.value
    if (!open) return []
    const close = closeCharFor(open)

    const list: Suggestion[] = [
      { value: `${open}OCG${close}`, label: 'OCG 最新版' },
      { value: `${open}GENESYS${close}`, label: 'GENESYS 最新版' }
    ]

    const ocgDates = [...forbiddenLimitedCache.getAvailableDates()].sort().reverse()
    ocgDates.forEach(date => {
      const yymm = ocgDateToYymm(date)
      list.push({ value: `${open}OCG-${yymm}${close}`, label: `OCG ${yymmToLabel(yymm)}` })
    })

    const genesysParams = [...genesysPointCache.getAvailableListParams()].sort().reverse()
    genesysParams.forEach(param => {
      const yymm = genesysListParamToYymm(param)
      list.push({ value: `${open}GENESYS-${yymm}${close}`, label: `GENESYS ${yymmToLabel(yymm)}` })
    })

    return list
  })

  const suggestions = computed<Suggestion[]>(() => {
    if (matchedQuery.value === null) return []
    const query = matchedQuery.value.toLowerCase()
    return candidates.value.filter(c => {
      const content = c.value.slice(1, -1) // 括弧を除いた中身
      return content.toLowerCase().startsWith(query)
    })
  })

  const applySuggestion = (suggestion: Suggestion): void => {
    const open = matchedBracket.value
    if (!open) return

    const cursorPos = getCursorPos()
    const closeChar = closeCharFor(open)
    // カーソル直後が対応する閉じ括弧なら、それも含めて置換する（"[]" や既存タグの中を編集しているケース）
    const hasImmediateClose = inputValue.value.slice(cursorPos, cursorPos + closeChar.length) === closeChar
    const replaceEnd = hasImmediateClose ? cursorPos + closeChar.length : cursorPos

    const after = inputValue.value.slice(replaceEnd)
    inputValue.value = `${suggestion.value}${after}`
    matchedBracket.value = null
    matchedQuery.value = null
    selectedIndex.value = -1

    const newCursorPos = suggestion.value.length
    void nextTick(() => {
      inputElement.value?.setSelectionRange(newCursorPos, newCursorPos)
      inputElement.value?.focus()
    })
  }

  const selectSuggestion = (suggestion: Suggestion): void => {
    applySuggestion(suggestion)
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
    matchedBracket.value = null
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
