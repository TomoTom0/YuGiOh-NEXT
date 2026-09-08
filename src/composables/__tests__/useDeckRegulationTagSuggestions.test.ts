import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDeckRegulationTagSuggestions } from '../useDeckRegulationTagSuggestions'
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache'
import { genesysPointCache } from '@/utils/genesys-cache'
import { parseRegulationTag } from '@/utils/regulation-tag-parser'

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
    it('[covers:handle_input.trigger_matched_sets_bracket_and_query] [covers:close_char_for.square_bracket] [covers:candidates.includes_latest_and_sorted_dated_entries] [covers:suggestions.empty_string_query_returns_all_candidates] 冒頭で [ を入力すると候補一覧を表示する', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value).toEqual([
        { value: '[OCG]', label: 'OCG' },
        { value: '[GENESYS]', label: 'GENESYS' },
        { value: '[OCG-2501]', label: 'OCG-2501' },
        { value: '[OCG-2410]', label: 'OCG-2410' },
        { value: '[GENESYS-2606]', label: 'GENESYS-2606' },
        { value: '[GENESYS-2408]', label: 'GENESYS-2408' }
      ])
    })

    it('[covers:close_char_for.corner_bracket] 冒頭で 【 を入力すると隅付き括弧の候補一覧を表示する', () => {
      const inputValue = ref('【')
      const inputElement = ref(createInputWithCursor('【', 1))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value[0]).toEqual({ value: '【OCG】', label: 'OCG' })
    })

    it('[covers:handle_input.no_trigger_clears_bracket_and_query] [covers:suggestions.null_query_returns_empty] 冒頭以外の [ では候補を表示しない', () => {
      const inputValue = ref('デッキ[')
      const inputElement = ref(createInputWithCursor('デッキ[', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value).toEqual([])
    })

    it('[covers:suggestions.query_filters_case_insensitive_by_stripped_content] 入力文字列で候補を絞り込む', () => {
      const inputValue = ref('[GEN')
      const inputElement = ref(createInputWithCursor('[GEN', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value.every(s => s.value.startsWith('[GENESYS'))).toBe(true)
      expect(suggestions.value.length).toBe(3)
    })

    it('括弧が無い入力では候補を表示しない', () => {
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value).toEqual([])
    })
  })

  describe('selectSuggestion', () => {
    it('[covers:apply_suggestion.replaces_up_to_cursor_when_no_immediate_close] 未閉じの [ に候補を確定すると閉じ括弧まで含めて挿入される', async () => {
      const inputValue = ref('[OCG デッキ名')
      const inputElement = ref(createInputWithCursor('[OCG デッキ名', 4))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[OCG]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[OCG] デッキ名')
    })

    it('[covers:apply_suggestion.replaces_through_immediate_close_bracket] [covers:get_cursor_pos.uses_selection_start] 空の [] の間で確定すると閉じ括弧を含めて置換される', async () => {
      const inputValue = ref('[] デッキ名')
      const inputElement = ref(createInputWithCursor('[] デッキ名', 1))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

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
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[OCG-2501]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[OCG-2501] デッキ名')
    })

    it('後続テキストが空白で始まらない場合、閉じ括弧との間に自動で空白が挿入される', async () => {
      const inputValue = ref('[OCGテスト')
      // カーソルは "[OCG" の直後（4文字目）
      const inputElement = ref(createInputWithCursor('[OCGテスト', 4))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()
      const suggestion = suggestions.value.find(s => s.value === '[OCG-2501]')
      expect(suggestion).toBeDefined()
      selectSuggestion(suggestion!)
      await nextTick()

      expect(inputValue.value).toBe('[OCG-2501] テスト')
    })

    it('[covers:apply_suggestion.dated_tag_with_space_ensures_regex_match] 日付付きタグを補完した場合も後続テキストとの間に空白が挿入され、parseRegulationTagが成功する形式になる', async () => {
      const inputValue = ref('[GENESYSテスト')
      const inputElement = ref(createInputWithCursor('[GENESYSテスト', 8))
      const { suggestions, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()
      // 日付付きのGENESYSタグを選択
      const datedSuggestion = suggestions.value.find(s => s.value === '[GENESYS-2606]')
      expect(datedSuggestion).toBeDefined()
      selectSuggestion(datedSuggestion!)
      await nextTick()

      // 日付付きタグの後に空白が挿入され、後続テキストと分離される
      // これにより regulation-tag-parser の prefix パターン (?=\s|$) がマッチする
      expect(inputValue.value).toBe('[GENESYS-2606] テスト')

      // parseRegulationTag が成功することを確認（日付が抽出できること）
      const tag = parseRegulationTag(inputValue.value)
      expect(tag).not.toBeNull()
      expect(tag?.type).toBe('genesys')
      expect(tag?.yymm).toBe('2606')
    })
  })

  describe('handleKeydown', () => {
    it('[covers:handle_keydown.no_suggestions_returns_false] 候補が無い場合は何も処理しない', () => {
      const inputValue = ref('テスト')
      const inputElement = ref(createInputWithCursor('テスト', 3))
      const { handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(handled).toBe(false)
    })

    it('[covers:handle_keydown.enter_uses_selected_or_first_index] Enter で選択中の候補が確定される', async () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
      await nextTick()

      expect(handled).toBe(true)
      expect(inputValue.value).toBe('[OCG]')
    })

    it('[covers:handle_keydown.escape_resets_and_returns_true] [covers:reset_suggestion.clears_state] Escape で候補が閉じる', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { selectedIndex, handleInput, handleKeydown, suggestions } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()
      expect(suggestions.value.length).toBeGreaterThan(0)
      selectedIndex.value = 1

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(handled).toBe(true)
      expect(suggestions.value).toEqual([])
      expect(selectedIndex.value).toBe(-1)
    })

    it('[covers:handle_keydown.arrow_down_or_tab_wraps_index] ArrowDown/TabでselectedIndexが末尾から先頭へ循環する', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, selectedIndex, handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()
      const last = suggestions.value.length - 1

      selectedIndex.value = last
      expect(handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(true)
      expect(selectedIndex.value).toBe(0)

      selectedIndex.value = last
      expect(handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }))).toBe(true)
      expect(selectedIndex.value).toBe(0)
    })

    it('[covers:handle_keydown.arrow_up_wraps_from_start] [covers:handle_keydown.arrow_up_decrements] ArrowUpはselectedIndexを減らし、0以下では末尾へ循環する', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, selectedIndex, handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()
      selectedIndex.value = 2

      expect(handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe(true)
      expect(selectedIndex.value).toBe(1)

      selectedIndex.value = 0
      expect(handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe(true)
      expect(selectedIndex.value).toBe(suggestions.value.length - 1)
    })

    it('[covers:handle_keydown.enter_with_out_of_range_index_falls_through] selectedIndexが候補数以上のEnterは確定せずfalseを返す', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, selectedIndex, handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()
      selectedIndex.value = suggestions.value.length + 10

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(handled).toBe(false)
      expect(inputValue.value).toBe('[')
    })

    it('[covers:handle_keydown.unhandled_key_returns_false] 候補があっても対象外キーはfalseを返す', () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { handleInput, handleKeydown } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()

      const handled = handleKeydown(new KeyboardEvent('keydown', { key: 'a' }))

      expect(handled).toBe(false)
    })
  })

  describe('getCursorPos', () => {
    it('[covers:get_cursor_pos.fallback_to_input_length] inputElementが未設定の場合はinputValueの文字列長をカーソル位置として扱う', () => {
      const inputValue = ref('[OCG')
      const inputElement = ref<HTMLInputElement | null>(null)
      const { suggestions, handleInput } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      handleInput()

      expect(suggestions.value.length).toBe(3)
      expect(suggestions.value.every(s => s.value.startsWith('[OCG'))).toBe(true)
    })
  })

  describe('applySuggestion', () => {
    it('[covers:apply_suggestion.no_bracket_is_noop] トリガー未検出のままselectSuggestionを呼んでもinputValueは変化しない', () => {
      const inputValue = ref('テストデッキ')
      const inputElement = ref(createInputWithCursor('テストデッキ', 4))
      const { selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })

      selectSuggestion({ value: '[OCG]', label: 'OCG' })

      expect(inputValue.value).toBe('テストデッキ')
    })

    it('[covers:apply_suggestion.resets_matched_state] 候補確定後はselectedIndexが-1にリセットされ候補が閉じる', async () => {
      const inputValue = ref('[')
      const inputElement = ref(createInputWithCursor('[', 1))
      const { suggestions, selectedIndex, handleInput, selectSuggestion } = useDeckRegulationTagSuggestions({ inputValue, inputElement, isGenesysEnabled: () => true })
      handleInput()
      selectedIndex.value = 2
      const suggestion = suggestions.value[0]
      expect(suggestion).toBeDefined()

      selectSuggestion(suggestion!)
      await nextTick()

      expect(selectedIndex.value).toBe(-1)
      expect(suggestions.value).toEqual([])
    })
  })
})
