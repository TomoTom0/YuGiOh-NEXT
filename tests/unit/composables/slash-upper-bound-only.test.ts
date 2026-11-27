import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useSlashCommands } from '@/components/searchInputBar/composables/useSlashCommands'
import { useFilterInput } from '@/components/searchInputBar/composables/useFilterInput'
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

/**
 * useSlashCommands（検証）と useFilterInput（適用）を実物で繋いだハーネス。
 * 検証から適用までを通しで確認する
 */
function createHarness(initialFilters: Partial<SearchFilters> = {}) {
  const searchQuery = ref('')
  const searchFilters = ref<SearchFilters>(createBaseFilters(initialFilters))
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

  /** `/cmd ` で値入力モードへ移行し、rawInput を入力して確定（Enter 相当）する */
  const confirmInput = (command: string, rawInput: string) => {
    searchQuery.value = `${command} `
    filterInput.handleInput()
    searchQuery.value = rawInput
    filterInput.handleInput()
    const beforeConfirm = {
      valid: slash.isValidCommandInput.value,
      negated: slash.isNegatedInput.value,
      preview: filterInput.previewChip.value
    }
    // 有効な入力のときだけ確定する（SearchInputBar.vue の Enter 処理と同じ条件）
    if (slash.isValidCommandInput.value) {
      filterInput.addFilterChip()
    }
    return beforeConfirm
  }

  return { searchQuery, searchFilters, confirmInput }
}

describe('/atk /def /date の先頭ハイフン（下限省略）は上限だけを確定する', () => {
  it('/atk -2000 は有効な入力で、NOT条件として扲わずに確定時に上限だけを残す', () => {
    const { searchFilters, confirmInput } = createHarness()

    const before = confirmInput('/atk', '-2000')

    expect(before.valid).toBe(true)
    expect(before.negated).toBe(false)
    expect(before.preview?.isNot).toBe(false)
    expect(searchFilters.value.atk).toEqual({ exact: false, unknown: false, max: 2000 })
  })

  it('/def -2000 は有効な入力で、NOT条件として扱わずに確定時に上限だけを残す', () => {
    const { searchFilters, confirmInput } = createHarness()

    const before = confirmInput('/def', '-2000')

    expect(before.valid).toBe(true)
    expect(before.negated).toBe(false)
    expect(before.preview?.isNot).toBe(false)
    expect(searchFilters.value.def).toEqual({ exact: false, unknown: false, max: 2000 })
  })

  it('/atk -2000 は直前の完全一致（1800）を解除し、下限なしの上限 2000 だけにする', () => {
    const { searchFilters, confirmInput } = createHarness({
      atk: { exact: true, unknown: false, min: 1800, max: 1800 }
    })

    confirmInput('/atk', '-2000')

    expect(searchFilters.value.atk).toEqual({ exact: false, unknown: false, max: 2000 })
  })

  it('/def -2000 は直前の下限（1000）を解除し、unknown を保ったまま上限 2000 だけにする', () => {
    const { searchFilters, confirmInput } = createHarness({
      def: { exact: false, unknown: true, min: 1000 }
    })

    confirmInput('/def', '-2000')

    expect(searchFilters.value.def).toEqual({ exact: false, unknown: true, max: 2000 })
  })

  it.each(['-2020-12-31', '-2020/12/31', '-20201231'])(
    '/date %s は YYYY-MM-DD の上限だけを確定する（直前の from も解除）',
    rawInput => {
      const { searchFilters, confirmInput } = createHarness({
        releaseDate: { from: '2020-01-01', to: '2023-06-30' }
      })

      const before = confirmInput('/date', rawInput)

      expect(before.valid).toBe(true)
      expect(before.negated).toBe(false)
      expect(searchFilters.value.releaseDate).toEqual({ to: '2020-12-31' })
    }
  )

  it.each([
    ['/atk', '-abc', 'atk'],
    ['/def', '-', 'def'],
    ['/date', '-2020-12-', 'releaseDate']
  ])('%s %s のみ（上限が確定できない入力）は有効な入力にならない', (command, rawInput) => {
    const { searchFilters, confirmInput } = createHarness()

    const before = confirmInput(command, rawInput)

    expect(before.valid).toBe(false)
    expect(searchFilters.value.atk).toEqual({ exact: false, unknown: false })
    expect(searchFilters.value.def).toEqual({ exact: false, unknown: false })
    expect(searchFilters.value.releaseDate).toEqual({})
  })
})

describe('先頭ハイフン以外の入力の従来挙動は変わらない', () => {
  it.each([
    ['/atk', '2000', { exact: true, unknown: false, min: 2000, max: 2000 }],
    ['/atk', '1000-', { exact: false, unknown: false, min: 1000 }],
    ['/atk', '1000-2000', { exact: false, unknown: false, min: 1000, max: 2000 }]
  ])('/atk %s は従来どおり適用される', (command, rawInput, expected) => {
    const { searchFilters, confirmInput } = createHarness()

    confirmInput(command, rawInput)

    expect(searchFilters.value.atk).toEqual(expected)
  })

  it('/date 2020-01-01~2020-12-31 は従来どおり閉区間として適用される', () => {
    const { searchFilters, confirmInput } = createHarness()

    confirmInput('/date', '2020-01-01~2020-12-31')

    expect(searchFilters.value.releaseDate).toEqual({ from: '2020-01-01', to: '2020-12-31' })
  })

  it('対象外コマンド（/level -4）の先頭ハイフンは従来どおり NOT 接頭辞として扱う', () => {
    const { searchFilters, confirmInput } = createHarness()

    const before = confirmInput('/level', '-4')

    expect(before.negated).toBe(true)
    expect(searchFilters.value.levelValues).toEqual([])
  })
})
