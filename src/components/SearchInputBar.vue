<template>
  <div class="search-input-bar" :class="{ compact: compact }">
    <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
      <span class="menu-icon">...</span>
      <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
    </button>
    <button class="search-mode-btn" @click.stop="showSearchModeDropdown = !showSearchModeDropdown">
      <span class="mode-icon">▼</span>
      <span class="mode-text">{{ searchModeLabel }}</span>
    </button>
    <div v-if="showSearchModeDropdown" class="mode-dropdown-overlay" @click="showSearchModeDropdown = false"></div>
    <Transition name="dropdown">
      <div v-if="showSearchModeDropdown" class="mode-dropdown">
        <div class="mode-option" @click="selectSearchMode('name')">カード名で検索</div>
        <div class="mode-option" @click="selectSearchMode('text')">テキストで検索</div>
        <div class="mode-option" @click="selectSearchMode('pendulum')">ペンデュラムテキストで検索</div>
      </div>
    </Transition>
    <button class="search-btn" @click="handleSearch">
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
      </svg>
    </button>
    <input
      ref="inputRef"
      v-model="deckStore.searchQuery"
      type="text"
      class="search-input"
      :placeholder="placeholder"
      @keyup.enter="handleSearch"
      @keydown.escape="$emit('escape')"
    >
    <button
      v-if="deckStore.searchQuery"
      class="clear-btn"
      @click="deckStore.searchQuery = ''"
    >x</button>

    <SearchFilterDialog
      :is-visible="showFilterDialog"
      :initial-filters="searchFilters"
      @close="showFilterDialog = false"
      @apply="handleFilterApply"
    />
  </div>
</template>

<script lang="ts">
import { ref, computed, nextTick, defineComponent } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { searchCards, SearchOptions, SORT_ORDER_TO_API_VALUE } from '../api/card-search'
import SearchFilterDialog from './SearchFilterDialog.vue'

export default defineComponent({
  name: 'SearchInputBar',
  components: {
    SearchFilterDialog
  },
  props: {
    compact: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: 'カード名を検索...'
    },
    autoFocus: {
      type: Boolean,
      default: false
    }
  },
  emits: ['search', 'escape'],
  setup(props, { emit, expose }) {
    const deckStore = useDeckEditStore()
    const inputRef = ref<HTMLInputElement | null>(null)
    const searchMode = ref('name')
    const showSearchModeDropdown = ref(false)
    const showFilterDialog = ref(false)
    const searchFilters = ref({
      cardType: null as string | null,
      attributes: [] as string[],
      races: [] as string[],
      levels: [] as number[],
      atk: { from: undefined as number | undefined, to: undefined as number | undefined },
      def: { from: undefined as number | undefined, to: undefined as number | undefined },
      monsterTypes: [] as string[],
      linkNumbers: [] as number[]
    })

    const searchModeLabel = computed(() => {
      switch (searchMode.value) {
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        default: return 'name'
      }
    })

    const hasActiveFilters = computed(() => {
      const f = searchFilters.value
      return f.cardType !== null ||
        f.attributes.length > 0 ||
        f.races.length > 0 ||
        f.levels.length > 0 ||
        f.atk.from !== undefined ||
        f.atk.to !== undefined ||
        f.def.from !== undefined ||
        f.def.to !== undefined ||
        f.monsterTypes.length > 0 ||
        f.linkNumbers.length > 0
    })

    const filterCount = computed(() => {
      const f = searchFilters.value
      let count = 0
      if (f.cardType) count++
      count += f.attributes.length
      count += f.races.length
      count += f.levels.length
      if (f.atk.from !== undefined || f.atk.to !== undefined) count++
      if (f.def.from !== undefined || f.def.to !== undefined) count++
      count += f.monsterTypes.length
      count += f.linkNumbers.length
      return count
    })

    const selectSearchMode = (mode: string) => {
      searchMode.value = mode
      showSearchModeDropdown.value = false
    }

    const handleFilterApply = (filters: typeof searchFilters.value) => {
      searchFilters.value = filters
      if (deckStore.searchQuery.trim()) {
        handleSearch()
      }
    }

    const handleSearch = async () => {
      if (!deckStore.searchQuery.trim() && !hasActiveFilters.value) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }

      deckStore.activeTab = 'search'
      deckStore.isLoading = true

      const searchTypeMap: Record<string, string> = {
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        const apiSort = SORT_ORDER_TO_API_VALUE[deckStore.sortOrder] || 1

        const searchOptions: SearchOptions = {
          keyword: deckStore.searchQuery.trim(),
          searchType: searchType as '1' | '2' | '3' | '4',
          resultsPerPage: 100,
          sort: apiSort
        }

        const f = searchFilters.value
        if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
        if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
        if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
        if (f.levels.length > 0) searchOptions.levels = f.levels
        if (f.atk.from !== undefined || f.atk.to !== undefined) searchOptions.atk = f.atk
        if (f.def.from !== undefined || f.def.to !== undefined) searchOptions.def = f.def
        if (f.monsterTypes.length > 0) searchOptions.monsterTypes = f.monsterTypes as SearchOptions['monsterTypes']
        if (f.linkNumbers.length > 0) searchOptions.linkNumbers = f.linkNumbers

        const results = await searchCards(searchOptions)

        emit('search', results)

        // 検索結果をstore用の形式に変換
        deckStore.searchResults = results as unknown as typeof deckStore.searchResults
        deckStore.allResults = results as unknown as typeof deckStore.allResults

        if (results.length >= 100) {
          deckStore.hasMore = true
          setTimeout(async () => {
            try {
              const moreResults = await searchCards({
                ...searchOptions,
                resultsPerPage: 2000
              })
              if (moreResults.length > 100) {
                deckStore.searchResults = moreResults as unknown as typeof deckStore.searchResults
                deckStore.allResults = moreResults as unknown as typeof deckStore.allResults
                deckStore.hasMore = moreResults.length >= 2000
                deckStore.currentPage = 1
              } else {
                deckStore.hasMore = false
              }
            } catch (error) {
              console.error('Extended search error:', error)
              deckStore.hasMore = false
            }
          }, 1000)
        } else {
          deckStore.hasMore = false
        }
      } catch (error) {
        console.error('Search error:', error)
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
      } finally {
        deckStore.isLoading = false
        deckStore.isGlobalSearchMode = false
      }
    }

    const focus = () => {
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.focus()
        }
      })
    }

    // autoFocusがtrueの場合、マウント時にフォーカス
    if (props.autoFocus) {
      focus()
    }

    expose({ focus, inputRef })

    return {
      deckStore,
      inputRef,
      searchMode,
      searchModeLabel,
      showSearchModeDropdown,
      showFilterDialog,
      searchFilters,
      hasActiveFilters,
      filterCount,
      selectSearchMode,
      handleFilterApply,
      handleSearch
    }
  }
})
</script>

<style lang="scss" scoped>
.search-input-bar {
  display: flex;
  align-items: center;
  position: relative;
  background: white;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 0 10px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover,
  &:focus-within {
    border-color: var(--theme-color-start, #00d9b8);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  &.compact {
    height: 28px;
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: none;
    border-color: var(--border-primary, #ddd);

    &:hover,
    &:focus-within {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .search-input {
      font-size: 13px;
      padding: 4px 6px;
    }

    .menu-btn {
      padding: 4px 6px;
      font-size: 14px;
    }

    .search-mode-btn {
      padding: 2px 6px;
      min-width: 36px;

      .mode-icon {
        font-size: 8px;
      }

      .mode-text {
        font-size: 10px;
      }
    }

    .search-btn {
      padding: 4px;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .clear-btn {
      padding: 0 4px;
      font-size: 16px;
    }

    .mode-dropdown {
      top: 100%;
      bottom: auto;
      margin-top: 2px;
      margin-bottom: 0;
    }
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px;
  background: transparent;
  color: var(--text-primary, #333);
  height: 100%;
  line-height: 1.5;
  min-width: 80px;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  &.active {
    color: var(--theme-color-start, #00d9b8);
  }

  .menu-icon {
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }
}

.filter-count-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 12px;
  height: 12px;
  padding: 0 2px;
  font-size: 8px;
  font-weight: 600;
  line-height: 12px;
  text-align: center;
  background: var(--text-secondary, #666);
  color: white;
  border-radius: 6px;
}

.search-mode-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 48px;
  min-width: 48px;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary);
  }

  .mode-icon {
    font-size: 10px;
    line-height: 1;
  }

  .mode-text {
    font-size: 8px;
    line-height: 1;
    color: var(--text-tertiary, #999);
  }
}

.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.mode-dropdown {
  position: absolute;
  bottom: 100%;
  left: 40px;
  background: white;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-bottom: 4px;
  z-index: 101;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.mode-option {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: var(--text-primary, #333);

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.search-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  svg {
    display: block;
  }
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }
}
</style>
