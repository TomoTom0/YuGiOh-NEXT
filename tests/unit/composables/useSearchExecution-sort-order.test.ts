import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { SearchFilters } from '@/types/search-filters';

// PR#211 独立レビュー指摘 (TASK-578) の固定テスト:
// useSearchExecution の sortOrder 実行時検証（isSortOrder）が、実検索の
// API sort 値へどう反映されるかを固定する。
// - 属性・種族ソートは CardList が発行する正規値で、API に対応が無いため
//   50音順（sort=1）で取得し、実ソートはクライアント側で行う（Codex P2 の回帰防止）
// - SortOrder 外の値はストア初期値 release_desc へ倒れる（sort=21）。
//   buildSearchOptions の未対応値フォールバック（sort=1）とは意図的に異なる

vi.mock('@/api/card-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/card-search')>();
  return {
    ...actual,
    searchCards: vi.fn(),
    searchCardsAuto: vi.fn()
  };
});

function emptyFilters(): SearchFilters {
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
    releaseDate: {}
  };
}

describe('useSearchExecution.handleSearch - sortOrder検証のAPI sortへの反映 (TASK-578)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function executeSearch(sortOrder: string): Promise<number | undefined> {
    const { useSearchExecution } = await import('@/components/searchInputBar/composables/useSearchExecution');
    const { useDeckEditStore } = await import('@/stores/deck-edit');
    const { useSearchStore } = await import('@/stores/search');
    const { searchCards } = await import('@/api/card-search');

    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });

    vi.mocked(searchCards).mockResolvedValue([]);
    deckStore.sortOrder = sortOrder;
    searchStore.searchQuery = 'テスト';
    searchStore.searchFilters = emptyFilters();

    await handleSearch();

    expect(vi.mocked(searchCards)).toHaveBeenCalledTimes(1);
    return vi.mocked(searchCards).mock.calls[0]?.[0].sort;
  }

  it('属性ソート（attribute_asc）は50音順（sort=1）で取得される', async () => {
    expect(await executeSearch('attribute_asc')).toBe(1);
  });

  it('種族ソート（race_desc）は50音順（sort=1）で取得される', async () => {
    expect(await executeSearch('race_desc')).toBe(1);
  });

  it('リリース日降順（release_desc）はそのまま sort=21 で取得される', async () => {
    expect(await executeSearch('release_desc')).toBe(21);
  });

  it('SortOrder外の値は初期値 release_desc へ倒れて sort=21 で取得される', async () => {
    expect(await executeSearch('unknown_value')).toBe(21);
  });
});
