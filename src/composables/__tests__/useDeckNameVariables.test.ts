import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDeckNameVariables, type DeckNameVariable } from '../useDeckNameVariables'

function createInputWithCursor(value: string, cursorPos: number): HTMLInputElement {
  const el = document.createElement('input')
  el.value = value
  el.setSelectionRange(cursorPos, cursorPos)
  return el
}

describe('useDeckNameVariables', () => {
  let variables: DeckNameVariable[]

  beforeEach(() => {
    variables = [
      { key: 'orig', label: '元のデッキ名', resolve: () => '元のデッキ名テスト' }
    ]
  })

  describe('handleInput / suggestions', () => {
    it('@ 直後は全ての変数候補を表示する', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })

    it('@ に続く文字列で候補を絞り込む', () => {
      const inputValue = ref('デッキ@or')
      const inputElement = ref(createInputWithCursor('デッキ@or', 5))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })

    it('一致しない文字列では候補を表示しない', () => {
      const inputValue = ref('@xyz')
      const inputElement = ref(createInputWithCursor('@xyz', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('@ を含まない入力では候補を表示しない', () => {
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })
  })

  describe('selectSuggestion', () => {
    it('@orig を選択すると元のデッキ名に置き換わる', async () => {
      const inputValue = ref('新デッキ@orig')
      const inputElement = ref(createInputWithCursor('新デッキ@orig', 9))
      const { suggestions, handleInput, selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      const suggestion = suggestions.value[0]
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('新デッキ元のデッキ名テスト')
    })

    it('カーソルが文中でも @word の直後だけを置き換える', async () => {
      const inputValue = ref('@orig の複製')
      // カーソルは "@orig" の直後（5文字目）
      const inputElement = ref(createInputWithCursor('@orig の複製', 5))
      const { suggestions, handleInput, selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      const suggestion = suggestions.value[0]
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('元のデッキ名テスト の複製')
    })
  })

  describe('handleKeydown', () => {
    it('候補が無い場合は何も処理しない', () => {
      const inputValue = ref('テスト')
      const inputElement = ref(createInputWithCursor('テスト', 3))
      const { handleKeydown } = useDeckNameVariables({ inputValue, inputElement, variables })

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const handled = handleKeydown(event)

      expect(handled).toBe(false)
    })

    it('ArrowDown で選択インデックスが進む', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('Enter で選択中の候補が確定される', async () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const handled = handleKeydown(event)
      await nextTick()

      expect(handled).toBe(true)
      expect(inputValue.value).toBe('元のデッキ名テスト')
    })

    it('Escape で候補が閉じる', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, suggestions } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()
      expect(suggestions.value.length).toBeGreaterThan(0)

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(suggestions.value).toEqual([])
    })
  })

  describe('resetSuggestion', () => {
    it('候補表示状態をリセットする', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, resetSuggestion, suggestions } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()
      expect(suggestions.value.length).toBeGreaterThan(0)

      resetSuggestion()

      expect(suggestions.value).toEqual([])
    })
  })
})
