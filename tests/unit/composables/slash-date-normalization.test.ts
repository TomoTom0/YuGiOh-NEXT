import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { normalizeReleaseDateInput } from '@/constants/search-constants'
import { useSlashCommands } from '@/components/searchInputBar/composables/useSlashCommands'
import { useFilterInput } from '@/components/searchInputBar/composables/useFilterInput'
import { buildSearchOptions } from '@/utils/search-options-builder'
import type { SearchFilters } from '@/types/search-filters'
import type { SearchMode } from '@/types/settings'

function createBaseFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'or',
    levelType: 'level',
    levelValues: [],
    linkValues: [],
    scaleValues: [],
    linkMarkers: [],
    linkMarkerMatchMode: 'or',
    atk: { exact: false, unknown: false },
    def: { exact: false, unknown: false },
    releaseDate: {},
    ...overrides
  }
}

function createSlashDateHarness(initialReleaseDate: SearchFilters['releaseDate'] = {}) {
  const searchQuery = ref('')
  const searchFilters = ref<SearchFilters>(createBaseFilters({ releaseDate: { ...initialReleaseDate } }))
  const searchMode = ref<SearchMode>('auto')
  const showMydeckDropdown = ref(false)
  const clearAllFilters = vi.fn()
  const activeFiltersOptions = computed(() => [])

  const slash = useSlashCommands({ searchQuery })
  const filterInput = useFilterInput({
    searchQuery,
    pendingCommand: slash.pendingCommand,
    isValidCommandInput: slash.isValidCommandInput,
    actualInputValue: slash.actualInputValue,
    isNegatedInput: slash.isNegatedInput,
    searchFilters,
    activeFiltersOptions,
    clearAllFilters,
    searchMode,
    showMydeckDropdown
  })

  const enterDateCommand = (rawInput: string) => {
    searchQuery.value = '/date '
    filterInput.handleInput()
    searchQuery.value = rawInput
    filterInput.handleInput()
  }

  return {
    searchQuery,
    searchFilters,
    slash,
    filterInput,
    enterDateCommand
  }
}

describe('/date 受理済み入力形式の適用側正規化', () => {
  describe('normalizeReleaseDateInput 単体', () => {
    it.each([
      ['2020-01-01', { from: '2020-01-01', to: '2020-01-01' }],
      ['2020/01/01', { from: '2020-01-01', to: '2020-01-01' }],
      ['2020.01.01', { from: '2020-01-01', to: '2020-01-01' }],
      ['20200101', { from: '2020-01-01', to: '2020-01-01' }],
      ['2020.01-01', { from: '2020-01-01', to: '2020-01-01' }],
      ['２０２０／０３／１５', { from: '2020-03-15', to: '2020-03-15' }]
    ])('単一日付 %s を YYYY-MM-DD の閉区間 { from, to } に正規化する', (input, expected) => {
      expect(normalizeReleaseDateInput(input)).toEqual(expected)
    })

    it.each([
      ['2020-01-01~2020-12-31', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020/01/01~2020/12/31', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020.01.01~2020.12.31', { from: '2020-01-01', to: '2020-12-31' }],
      ['20200101~20201231', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020/01/01 ~ 20201231', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020-01-01 2020-12-31', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020/01/01   2020.12.31', { from: '2020-01-01', to: '2020-12-31' }],
      ['20200101 20201231', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020.01.01-2020.12.31', { from: '2020-01-01', to: '2020-12-31' }],
      ['2020.01.01-2020.12.31 ', { from: '2020-01-01', to: '2020-12-31' }]
    ])('閉区間 %s を YYYY-MM-DD の { from, to } に正規化する', (input, expected) => {
      expect(normalizeReleaseDateInput(input)).toEqual(expected)
    })

    it.each([
      ['2020-01-01-', { from: '2020-01-01' }],
      ['2020/01/01-', { from: '2020-01-01' }],
      ['2020.01.01-', { from: '2020-01-01' }],
      ['20200101-', { from: '2020-01-01' }],
      ['2020-01-01 -', { from: '2020-01-01' }]
    ])('明らかな右側省略形式 %s を上限なしの { from } に正規化する', (input, expected) => {
      const normalized = normalizeReleaseDateInput(input)
      expect(normalized).toEqual(expected)
      expect(normalized?.to).toBeUndefined()
    })

    it.each([
      '',
      '   ',
      '-2020-12-31',
      '-20201231',
      '-2020-01-01-',
      '2020-01-',
      '2020-01-01~',
      '~2020-12-31',
      '2020/01/01-2020/12/31',
      '20200101-20201231',
      '2020 01 01',
      '2020.01.01 - 2020.12.31',
      'invalid-date'
    ])('先頭ハイフンおよび未受理形式 %s は null を返す', (input) => {
      expect(normalizeReleaseDateInput(input)).toBeNull()
    })
  })

  describe('useSlashCommands 検証から useFilterInput 適用・buildSearchOptions までの整合', () => {
    it.each([
      {
        label: '8桁の単一日付',
        input: '20210417',
        expectedFilter: { from: '2021-04-17', to: '2021-04-17' },
        expectedApi: {
          start: { year: 2021, month: 4, day: 17 },
          end: { year: 2021, month: 4, day: 17 }
        }
      },
      {
        label: 'スラッシュ区切りの単一日付（全角数字混在）',
        input: '２０２１/０４/１７',
        expectedFilter: { from: '2021-04-17', to: '2021-04-17' },
        expectedApi: {
          start: { year: 2021, month: 4, day: 17 },
          end: { year: 2021, month: 4, day: 17 }
        }
      },
      {
        label: 'ドット区切りの単一日付',
        input: '2021.04.17',
        expectedFilter: { from: '2021-04-17', to: '2021-04-17' },
        expectedApi: {
          start: { year: 2021, month: 4, day: 17 },
          end: { year: 2021, month: 4, day: 17 }
        }
      },
      {
        label: 'チルダ区切りの閉区間（非ハイフン日付と空白あり）',
        input: '2020/01/01 ~ 20201231',
        expectedFilter: { from: '2020-01-01', to: '2020-12-31' },
        expectedApi: {
          start: { year: 2020, month: 1, day: 1 },
          end: { year: 2020, month: 12, day: 31 }
        }
      },
      {
        label: 'スペース区切りの閉区間',
        input: '2020-01-01 2020-12-31',
        expectedFilter: { from: '2020-01-01', to: '2020-12-31' },
        expectedApi: {
          start: { year: 2020, month: 1, day: 1 },
          end: { year: 2020, month: 12, day: 31 }
        }
      },
      {
        label: 'ドット区切り日付同士のハイフン閉区間',
        input: '2020.01.01-2020.12.31',
        expectedFilter: { from: '2020-01-01', to: '2020-12-31' },
        expectedApi: {
          start: { year: 2020, month: 1, day: 1 },
          end: { year: 2020, month: 12, day: 31 }
        }
      },
      {
        label: '明らかな右側省略形式（ハイフン日付）',
        input: '2020-01-01-',
        expectedFilter: { from: '2020-01-01' },
        expectedApi: {
          start: { year: 2020, month: 1, day: 1 }
        }
      },
      {
        label: '明らかな右側省略形式（8桁日付）',
        input: '20200101-',
        expectedFilter: { from: '2020-01-01' },
        expectedApi: {
          start: { year: 2020, month: 1, day: 1 }
        }
      }
    ])('$label ($input) は検証を通過し、正規化されて検索オプションへ反映される', ({ input, expectedFilter, expectedApi }) => {
      const { slash, filterInput, searchFilters, searchQuery, enterDateCommand } = createSlashDateHarness()

      enterDateCommand(input)
      expect(slash.pendingCommand.value?.filterType).toBe('releaseDate')
      expect(slash.isNegatedInput.value).toBe(false)
      expect(slash.isValidCommandInput.value).toBe(true)

      filterInput.addFilterChip()

      expect(searchFilters.value.releaseDate).toEqual(expectedFilter)
      expect(slash.pendingCommand.value).toBeNull()
      expect(searchQuery.value).toBe('')

      const options = buildSearchOptions('', '1', 'name_asc', searchFilters.value)
      expect(options.releaseDate).toEqual(expectedApi)
    })

    it('既存の閉区間設定後に右側省略形式を適用すると前回の to が残らない', () => {
      const { filterInput, searchFilters, enterDateCommand } = createSlashDateHarness({
        from: '2019-01-01',
        to: '2019-12-31'
      })

      enterDateCommand('2022/05/01-')
      filterInput.addFilterChip()

      expect(searchFilters.value.releaseDate).toEqual({ from: '2022-05-01' })
      expect(searchFilters.value.releaseDate.to).toBeUndefined()

      const options = buildSearchOptions('', '1', 'name_asc', searchFilters.value)
      expect(options.releaseDate).toEqual({
        start: { year: 2022, month: 5, day: 1 }
      })
      expect('end' in (options.releaseDate ?? {})).toBe(false)
    })

    it('未決の先頭ハイフン入力（-2020-12-31）および NOT 判定の現行挙動を変更しない', () => {
      const { slash, filterInput, searchFilters, enterDateCommand } = createSlashDateHarness()

      enterDateCommand('-2020-12-31')
      expect(slash.isNegatedInput.value).toBe(true)
      expect(slash.actualInputValue.value).toBe('2020-12-31')
      expect(slash.isValidCommandInput.value).toBe(true)

      filterInput.addFilterChip()

      expect(searchFilters.value.releaseDate).toEqual({})
    })
  })
})
