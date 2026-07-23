import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDeckRegulationTagSuggestions } from '../useDeckRegulationTagSuggestions'
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache'
import { genesysPointCache } from '@/utils/genesys-cache'

function createInputWithCursor(value: string, cursorPos: number): HTMLInputElement {
  const el = document.createElement('input')
  el.value = value
  el.setSelectionRange(cursorPos, cursorPos)
  return el
}

describe('useDeckRegulationTagSuggestions', () => {
  beforeEach(() => {
    vi.spyOn(forbiddenLimitedCache, 'getAvailableDates').mockReturnValue(['2024-10-01', '2025-01-01'])
    vi.spyOn(genesysPointCache, 'getAvailableListParams').mockReturnValue(['202408', '202606'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleInput / suggestions', () => {
    it('冒頭で [ を入力すると候補一覧を表示する', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()

      expect(suggestions.value).toEqual([
        { value: '[OCG]', label: 'OCG 最新版' },
        { value: '[GENESYS]', label: 'GENESYS 最新版' },
        { value: '[OCG-2501]', label: 'OCG 2025年01月版' },
        { value: '[OCG-2410]', label: 'OCG 2024年10月版' },
        { value: '[GENESYS-2606]', label: 'GENESYS 2026年06月版' },
        { value: '[GENESYS-2408]', label: 'GENESYS 2024年08月版' }
      ])
    })

    it('冒頭で 【 を入力すると隅付き括弧の候補一覧を表示する', () => {
      const inputValue = ref('【')
      const inputElement = ref(createInputWithCursor('【', 1))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()

      expect(suggestions.value[0]).toEqual({ value: '【OCG】', label: 'OCG 最新版' })
    })

    it('冒頭以外の [ では候補を表示しない', () => {
      const inputValue = ref('デッキ[')
      const inputElement = ref(createInputWithCursor('デッキ[', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('入力文字列で候補を絞り込む', () => {
      const inputValue = ref('[GEN')
      const inputElement = ref(createInputWithCursor('[GEN', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()

      expect(suggestions.value.every(s => s.value.startsWith('[GENESYS'))).toBe(true)
      expect(suggestions.value.length).toBe(3)
    })

    it('括弧が無い入力では候補を表示しない', () => {
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()

      expect(suggestions.value).toEqual([])
    })
  })

  describe('selectSuggestion', () => {
    it('未閉じの [ に候補を確定すると閉じ括弧まで含めて挿入される', async () => {
      const inputValue = ref('[OCG デッキ名')
      const inputElement = ref(createInputWithCursor('[OCG デッキ名', 4))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[OCG]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[OCG] デッキ名')
    })

    it('空の [] の間で確定すると閉じ括弧を含めて置換される', async () => {
      const inputValue = ref('[] デッキ名')
      const inputElement = ref(createInputWithCursor('[] デッキ名', 1))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[GENESYS-2606]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[GENESYS-2606] デッキ名')
    })

    it('既存タグの閉じ括弧直前で確定すると閉じ括弧を含めて置換される', async () => {
      const inputValue = ref('[OCG] デッキ名')
      // カーソルは "[OCG" の直後、"]" の直前（4文字目）
      const inputElement = ref(createInputWithCursor('[OCG] デッキ名', 4))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[OCG-2501]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[OCG-2501] デッキ名')
    })
  })

  describe('handleKeydown', () => {
    it('候補が無い場合は何も処理しない', () => {
      const inputValue = ref('テスト')
      const inputElement = ref(createInputWithCursor('テスト', 3))
      const { handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement })

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(handled).toBe(false)
    })

    it('Enter で選択中の候補が確定される', async () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement })
      handleInput()

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
      await nextTick()

      expect(handled).toBe(true)
      expect(inputValue.value).toBe('[OCG]')
    })

    it('Escape で候補が閉じる', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { handleInput, handleKeydown, suggestions } = useDeckRegulationTagSuggestions({ inputValue, inputElement })
      handleInput()
      expect(suggestions.value.length).toBeGreaterThan(0)

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(handled).toBe(true)
      expect(suggestions.value).toEqual([])
    })
  })
})
