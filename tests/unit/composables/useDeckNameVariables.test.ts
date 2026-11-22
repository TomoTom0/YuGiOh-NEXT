import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDeckNameVariables, type DeckNameVariable } from '@/composables/useDeckNameVariables'

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
    it('[covers:handleinput.matches-at-pattern-sets-query] [covers:suggestions.output-at-prefixed-value] [covers:suggestions.case-insensitive-prefix-match] [covers:handleinput.always-resets-selected-index] @ 直後は全ての変数候補を表示する', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { suggestions, handleInput, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
      expect(selectedIndex.value).toBe(-1)
    })

    it('[covers:suggestions.case-insensitive-prefix-match] （前方一致でフィルタされる側面） @ に続く文字列で候補を絞り込む', () => {
      const inputValue = ref('デッキ@or')
      const inputElement = ref(createInputWithCursor('デッキ@or', 5))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })

    it('[covers:suggestions.case-insensitive-prefix-match] （マッチしないkeyは除外される側面） 一致しない文字列では候補を表示しない', () => {
      const inputValue = ref('@xyz')
      const inputElement = ref(createInputWithCursor('@xyz', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('[covers:handleinput.no-match-sets-null] [covers:suggestions.empty-when-query-null] @ を含まない入力では候補を表示しない', () => {
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('[covers:getcursor.input-null-fallback-to-value-length] inputElement.value が null でもカーソル位置を入力末尾とみなして候補を出す', () => {
      const inputValue = ref('@orig')
      const inputElement = ref<HTMLInputElement | null>(null)
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      // inputElementがnullでも inputValue.length(5) をカーソル位置とみなし @orig を認識する
      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })
  })

  describe('selectSuggestion / applyVariable', () => {
    it('[covers:applyvariable.replaces-at-word-with-resolved-value] [covers:selectsuggestion.strips-at-prefix-and-applies] [covers:applyvariable.resets-state-after-apply] @orig を選択すると元のデッキ名に置き換わる', async () => {
      const inputValue = ref('新デッキ@orig')
      const inputElement = ref(createInputWithCursor('新デッキ@orig', 9))
      const { suggestions, handleInput, selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      const suggestion = suggestions.value[0]
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('新デッキ元のデッキ名テスト')
      expect(suggestions.value).toEqual([])
    })

    it('[covers:applyvariable.replaces-at-word-with-resolved-value] （前後の文字列を保持する側面） カーソルが文中でも @word の直後だけを置き換える', async () => {
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

    it('[covers:applyvariable.restores-cursor-and-focus-after-replace] 置換後はカーソルが置換後文字列の末尾に移動し input をフォーカスする', async () => {
      const inputValue = ref('@orig')
      const inputElement = ref(createInputWithCursor('@orig', 5))
      const input = inputElement.value
      if (!input) throw new Error('inputElement should not be null')
      const setSelectionRangeSpy = vi.spyOn(input, 'setSelectionRange')
      const focusSpy = vi.spyOn(input, 'focus')
      const { suggestions, handleInput, selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      selectSuggestion(suggestions.value[0]!)
      await nextTick()

      // inputValue='@orig'(cursorPos=5, query='orig') → triggerStart=0, value='元のデッキ名テスト'(9文字)
      // newCursorPos = before.length(0) + value.length(9) = 9
      expect(setSelectionRangeSpy).toHaveBeenCalledWith(9, 9)
      expect(focusSpy).toHaveBeenCalled()
    })

    it('[covers:applyvariable.early-return-when-variable-not-found] 存在しないキーの suggestion を渡した場合は入力値が変わらない', async () => {
      const inputValue = ref('@orig')
      const inputElement = ref(createInputWithCursor('@orig', 5))
      const { selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      selectSuggestion({ value: '@unknown', label: '存在しない' })
      await nextTick()

      expect(inputValue.value).toBe('@orig')
    })

    it('[covers:applyvariable.early-return-when-trigger-start-negative] カーソル位置が異常で triggerStart が負になる場合は入力値が変わらない', async () => {
      const inputValue = ref('@orig')
      const inputElement = ref(createInputWithCursor('@orig', 5))
      const { handleInput, selectSuggestion, suggestions } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      expect(suggestions.value.length).toBeGreaterThan(0)
      // handleInput 後にカーソルを先頭(0)に移動 → triggerStart = 0 - 4 - 1 = -5
      inputElement.value!.setSelectionRange(0, 0)

      selectSuggestion(suggestions.value[0]!)
      await nextTick()

      expect(inputValue.value).toBe('@orig')
    })
  })

  describe('handleKeydown', () => {
    it('[covers:handlekeydown.no-suggestions-returns-false] 候補が無い場合は何も処理しない', () => {
      const inputValue = ref('テスト')
      const inputElement = ref(createInputWithCursor('テスト', 3))
      const { handleKeydown } = useDeckNameVariables({ inputValue, inputElement, variables })

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const handled = handleKeydown(event)

      expect(handled).toBe(false)
    })

    it('[covers:handlekeydown.arrow-down-or-tab-advances-index-wrap-around] （先頭へ進む側面） ArrowDown で選択インデックスが進む', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('[covers:handlekeydown.arrow-down-or-tab-advances-index-wrap-around] （Tab の側面） Tab でも ArrowDown と同じく選択インデックスが進む', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('[covers:handlekeydown.arrow-up-decrements-index-wrap-around] ArrowUp で選択インデックスが末尾にラップする', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex, suggestions } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      // selectedIndex=-1(<=0) → length-1（末尾）にラップ
      expect(selectedIndex.value).toBe(suggestions.value.length - 1)
    })

    it('[covers:handlekeydown.enter-confirms-selected-or-first] Enter で選択中の候補が確定される', async () => {
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

    it('[covers:handlekeydown.enter-out-of-range-returns-false] Enter で selectedIndex が範囲外の場合は何もしない', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()
      // 外部から範囲外の値を設定（ArrowDown/ArrowUp のラップロジック経由では到達しない異常状態）
      selectedIndex.value = 100

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const handled = handleKeydown(event)

      expect(handled).toBe(false)
      expect(inputValue.value).toBe('@')
    })

    it('[covers:handlekeydown.escape-resets-and-returns-true] Escape で候補が閉じる', () => {
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

    it('[covers:handlekeydown.unhandled-keys-return-false] 未対応のキーは何も処理しない', () => {
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'a' })
      const handled = handleKeydown(event)

      expect(handled).toBe(false)
      expect(selectedIndex.value).toBe(-1)
    })
  })

  describe('resetSuggestion', () => {
    it('[covers:resetsuggestion.clears-state] 候補表示状態をリセットする', () => {
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
