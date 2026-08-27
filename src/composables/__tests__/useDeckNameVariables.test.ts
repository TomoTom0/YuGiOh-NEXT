import { describe, it, expect, beforeEach, vi } from 'vitest'
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
      // [covers:handleinput.matches_at_pattern_sets_query]
      // [covers:suggestions.output_at_prefixed_value]
      // [covers:suggestions.case_insensitive_prefix_match]
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { suggestions, handleInput, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
      // [covers:handleinput.always_resets_selected_index]
      expect(selectedIndex.value).toBe(-1)
    })

    it('@ に続く文字列で候補を絞り込む', () => {
      // [covers:suggestions.case_insensitive_prefix_match] （前方一致でフィルタされる側面）
      const inputValue = ref('デッキ@or')
      const inputElement = ref(createInputWithCursor('デッキ@or', 5))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })

    it('一致しない文字列では候補を表示しない', () => {
      // [covers:suggestions.case_insensitive_prefix_match] （マッチしないkeyは除外される側面）
      const inputValue = ref('@xyz')
      const inputElement = ref(createInputWithCursor('@xyz', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('@ を含まない入力では候補を表示しない', () => {
      // [covers:handleinput.no_match_sets_null]
      // [covers:suggestions.empty_when_query_null]
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('inputElement.value が null でもカーソル位置を入力末尾とみなして候補を出す', () => {
      // [covers:getcursor.input_null_fallback_to_value_length]
      const inputValue = ref('@orig')
      const inputElement = ref<HTMLInputElement | null>(null)
      const { suggestions, handleInput } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()

      // inputElementがnullでも inputValue.length(5) をカーソル位置とみなし @orig を認識する
      expect(suggestions.value).toEqual([{ value: '@orig', label: '元のデッキ名' }])
    })
  })

  describe('selectSuggestion / applyVariable', () => {
    it('@orig を選択すると元のデッキ名に置き換わる', async () => {
      // [covers:applyvariable.replaces_at_word_with_resolved_value]
      // [covers:selectsuggestion.strips_at_prefix_and_applies]
      const inputValue = ref('新デッキ@orig')
      const inputElement = ref(createInputWithCursor('新デッキ@orig', 9))
      const { suggestions, handleInput, selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      handleInput()
      const suggestion = suggestions.value[0]
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('新デッキ元のデッキ名テスト')
      // [covers:applyvariable.resets_state_after_apply]
      expect(suggestions.value).toEqual([])
    })

    it('カーソルが文中でも @word の直後だけを置き換える', async () => {
      // [covers:applyvariable.replaces_at_word_with_resolved_value] （前後の文字列を保持する側面）
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

    it('置換後はカーソルが置換後文字列の末尾に移動し input をフォーカスする', async () => {
      // [covers:applyvariable.restores_cursor_and_focus_after_replace]
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

    it('存在しないキーの suggestion を渡した場合は入力値が変わらない', async () => {
      // [covers:applyvariable.early_return_when_variable_not_found]
      const inputValue = ref('@orig')
      const inputElement = ref(createInputWithCursor('@orig', 5))
      const { selectSuggestion } = useDeckNameVariables({ inputValue, inputElement, variables })

      selectSuggestion({ value: '@unknown', label: '存在しない' })
      await nextTick()

      expect(inputValue.value).toBe('@orig')
    })

    it('カーソル位置が異常で triggerStart が負になる場合は入力値が変わらない', async () => {
      // [covers:applyvariable.early_return_when_trigger_start_negative]
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
    it('候補が無い場合は何も処理しない', () => {
      // [covers:handlekeydown.no_suggestions_returns_false]
      const inputValue = ref('テスト')
      const inputElement = ref(createInputWithCursor('テスト', 3))
      const { handleKeydown } = useDeckNameVariables({ inputValue, inputElement, variables })

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const handled = handleKeydown(event)

      expect(handled).toBe(false)
    })

    it('ArrowDown で選択インデックスが進む', () => {
      // [covers:handlekeydown.arrow_down_or_tab_advances_index_wrap_around] （先頭へ進む側面）
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('Tab でも ArrowDown と同じく選択インデックスが進む', () => {
      // [covers:handlekeydown.arrow_down_or_tab_advances_index_wrap_around] （Tab の側面）
      const inputValue = ref('@')
      const inputElement = ref(createInputWithCursor('@', 1))
      const { handleInput, handleKeydown, selectedIndex } = useDeckNameVariables({ inputValue, inputElement, variables })
      handleInput()

      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      const handled = handleKeydown(event)

      expect(handled).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('ArrowUp で選択インデックスが末尾にラップする', () => {
      // [covers:handlekeydown.arrow_up_decrements_index_wrap_around]
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

    it('Enter で選択中の候補が確定される', async () => {
      // [covers:handlekeydown.enter_confirms_selected_or_first]
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

    it('Enter で selectedIndex が範囲外の場合は何もしない', () => {
      // [covers:handlekeydown.enter_out_of_range_returns_false]
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

    it('Escape で候補が閉じる', () => {
      // [covers:handlekeydown.escape_resets_and_returns_true]
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

    it('未対応のキーは何も処理しない', () => {
      // [covers:handlekeydown.unhandled_keys_return_false]
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
    it('候補表示状態をリセットする', () => {
      // [covers:resetsuggestion.clears_state]
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
