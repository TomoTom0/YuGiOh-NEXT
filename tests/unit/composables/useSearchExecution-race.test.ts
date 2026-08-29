import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useSearchExecution } from '@/components/searchInputBar/composables/useSearchExecution';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';
import type { MonsterCard } from '@/types/card';

// TASK-373: 「一度ORの状態の検索結果が表示されるままだ」の再現・回帰テスト
//
// handleSearchは検索結果が100件以上の場合、1秒後に最大2000件まで取得する
// 「拡張検索」をバックグラウンドでスケジュールする。この拡張検索が完了する前に
// 別の検索（フィルター変更後の再検索等）が実行されると、古い拡張検索の結果が
// 後から新しい検索結果を上書きしてしまうレースコンディションがあった。

vi.mock('@/api/card-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/card-search')>();
  return {
    ...actual,
    searchCards: vi.fn(),
    searchCardsAuto: vi.fn()
  };
});

import { searchCards } from '@/api/card-search';

function monsterCard(cardId: string, name: string): MonsterCard {
  return {
    name,
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

describe('useSearchExecution.handleSearch - 検索世代ガード(レースコンディション回帰テスト)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.mocked(searchCards).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('古い検索の拡張フェッチ(1秒後)が、その後に実行された新しい検索の結果を上書きしない', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });

    const oldCards = Array.from({ length: 120 }, (_, i) => monsterCard(`old-${i}`, 'ドラゴン'));
    const oldExtendedCards = Array.from({ length: 150 }, (_, i) => monsterCard(`old-ext-${i}`, 'ドラゴン'));
    const newCards = [monsterCard('new-1', '青眼の白龍')];

    vi.mocked(searchCards)
      .mockResolvedValueOnce(oldCards)
      .mockResolvedValueOnce(newCards)
      .mockResolvedValueOnce(oldExtendedCards);

    // 1回目: 広いキーワードで検索（100件以上ヒットし、拡張検索がスケジュールされる）
    searchStore.searchQuery = 'ドラゴン';
    await handleSearch();
    expect(searchStore.searchResults).toEqual(oldCards);

    // 2回目: 拡張フェッチが完了する前に、別のキーワードで再検索
    searchStore.searchQuery = '青眼の白龍';
    await handleSearch();
    expect(searchStore.searchResults).toEqual(newCards);

    // 1回目の拡張フェッチ(1秒後)を発火させる
    await vi.advanceTimersByTimeAsync(1000);

    // 古い拡張フェッチの結果で上書きされていないこと
    expect(searchStore.searchResults).toEqual(newCards);
  });

  // TASK-376 (PR#135レビュー指摘): 検索中にクエリ・フィルターをクリアすると
  // isLoadingが残留するバグの回帰テスト
  it('検索実行中にクエリ・フィルターをクリアすると、isLoadingがfalseに戻る', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });

    let resolvePending: (cards: MonsterCard[]) => void = () => {};
    const pending = new Promise<MonsterCard[]>((resolve) => {
      resolvePending = resolve;
    });
    vi.mocked(searchCards).mockReturnValueOnce(pending);

    // 1回目: fetchが完了しない状態で検索中のまま
    searchStore.searchQuery = 'ドラゴン';
    const firstSearch = handleSearch();
    expect(searchStore.isLoading).toBe(true);

    // 検索中にクエリ・フィルターをクリア（早期returnパス）
    searchStore.searchQuery = '';
    await handleSearch();

    expect(searchStore.isLoading).toBe(false);

    // 1回目のfetchが後から解決しても、isLoadingが再度trueになったりしない
    resolvePending([]);
    await firstSearch;
    expect(searchStore.isLoading).toBe(false);
  });
});
