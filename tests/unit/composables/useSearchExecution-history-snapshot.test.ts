import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { MonsterCard } from '@/types/card';
import type { SearchFilters } from '@/types/search-filters';

// PR#143レビュー指摘 (TASK-395) の回帰テスト:
//
// 空クエリ・フィルターのみの検索が進行中に、ユーザーがフィルターダイアログで
// 全フィルターをクリアすると、結果到着時点でライブのhasActiveFiltersがfalseに
// なる。結果自体はfiltersSnapshotから正しく生成されるが、履歴保存条件が
// ライブ状態を参照していると、完了した検索が履歴に登録されなくなる。

vi.mock('@/api/card-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/card-search')>();
  return {
    ...actual,
    searchCards: vi.fn(),
    searchCardsAuto: vi.fn()
  };
});

function monsterCard(cardId: string): MonsterCard {
  return {
    name: 'テストカード',
    cardId,
    ciid: cardId,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    attribute: 'LIGHT',
    levelType: 'level',
    levelValue: 4,
    race: 'dragon',
    types: [],
    isExtraDeck: false
  };
}

function activeFilters(): SearchFilters {
  return {
    cardType: null,
    attributes: ['LIGHT'],
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

describe('useSearchExecution.handleSearch - 検索履歴保存はfiltersSnapshot基準(TASK-395回帰テスト)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('空クエリ+フィルターのみの検索完了前にフィルターをクリアしても、履歴に登録される', async () => {
    const { useSearchExecution } = await import('@/components/searchInputBar/composables/useSearchExecution');
    const { useDeckEditStore } = await import('@/stores/deck-edit');
    const { useSearchStore } = await import('@/stores/search');
    const { useSearchHistory } = await import('@/composables/useSearchHistory');
    const { searchCards } = await import('@/api/card-search');

    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });
    const { historyItems } = useSearchHistory();

    let resolvePending: (cards: MonsterCard[]) => void = () => {};
    const pending = new Promise<MonsterCard[]>((resolve) => {
      resolvePending = resolve;
    });
    vi.mocked(searchCards).mockReturnValueOnce(pending);

    // 空クエリ + アクティブなフィルターで検索開始
    searchStore.searchQuery = '';
    searchStore.searchFilters = activeFilters();
    const searchPromise = handleSearch();

    // 検索が完了する前に、フィルターダイアログで全フィルターをクリア
    searchStore.searchFilters = emptyFilters();

    // 検索結果が到着
    resolvePending([monsterCard('4007')]);
    await searchPromise;

    // 検索実行時点のフィルター(filtersSnapshot)を基準に履歴が登録されること
    expect(historyItems.value).toHaveLength(1);
    expect(historyItems.value[0].filters).toEqual(activeFilters());
  });
});
