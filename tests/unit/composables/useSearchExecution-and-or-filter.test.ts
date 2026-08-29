import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useSearchExecution } from '@/components/searchInputBar/composables/useSearchExecution';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';
import type { MonsterCard } from '@/types/card';

// TASK-373: 「ANDを指定してもORの検索結果が表示されるままだ」の回帰テスト
//
// モンスタータイプのAND/ORはクライアント側(applyClientSideFilters)でのみ正しく実装されており、
// サーバー側の`othercon`パラメータは実際には期待通りに絞り込まない（もしくは反映されない）。
// これまでhandleSearchはautoモードの分岐内でしかapplyClientSideFiltersを呼んでおらず、
// name/text/pendulum検索（キーワード2文字以下でautoから委譲される場合を含む）では
// サーバーの生の応答をそのまま表示していたため、AND指定時も実質ORの結果が表示されていた。

vi.mock('@/api/card-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/card-search')>();
  return {
    ...actual,
    searchCards: vi.fn(),
    searchCardsAuto: vi.fn()
  };
});

import { searchCards } from '@/api/card-search';

function monsterCard(cardId: string, types: MonsterCard['types']): MonsterCard {
  return {
    name: `カード${cardId}`,
    cardId,
    ciid: cardId,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    attribute: 'LIGHT',
    levelType: 'level',
    levelValue: 4,
    race: 'dragon',
    types,
    isExtraDeck: true
  };
}

describe('useSearchExecution.handleSearch - 通常検索経路でのAND/ORフィルタ適用(回帰テスト)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(searchCards).mockReset();
  });

  it('name検索モードでも、サーバーが絞り込んでいないANDを満たさないカードをクライアント側で除外する', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    // searchMode='name' は auto を経由しない通常検索経路
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });

    // サーバーはAND指定でも絞り込まず、fusionのみ/synchroのみ/両方持つカードを混在して返す想定
    const fusionOnly = monsterCard('1', ['fusion']);
    const synchroOnly = monsterCard('2', ['synchro']);
    const both = monsterCard('3', ['fusion', 'synchro']);
    vi.mocked(searchCards).mockResolvedValueOnce([fusionOnly, synchroOnly, both]);

    searchStore.searchQuery = 'ドラゴン';
    searchStore.searchFilters.monsterTypes = [
      { type: 'fusion', state: 'normal' },
      { type: 'synchro', state: 'normal' }
    ];
    searchStore.searchFilters.monsterTypeMatchMode = 'and';

    await handleSearch();

    // ANDなので両方のタイプを持つカードのみが残るはず
    expect(searchStore.searchResults).toEqual([both]);
  });

  it('name検索モードでOR指定時はいずれかのタイプを持つカードを全て残す', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('name') });

    const fusionOnly = monsterCard('1', ['fusion']);
    const synchroOnly = monsterCard('2', ['synchro']);
    const neither = monsterCard('4', ['xyz']);
    vi.mocked(searchCards).mockResolvedValueOnce([fusionOnly, synchroOnly, neither]);

    searchStore.searchQuery = 'ドラゴン';
    searchStore.searchFilters.monsterTypes = [
      { type: 'fusion', state: 'normal' },
      { type: 'synchro', state: 'normal' }
    ];
    searchStore.searchFilters.monsterTypeMatchMode = 'or';

    await handleSearch();

    expect(searchStore.searchResults).toEqual([fusionOnly, synchroOnly]);
  });
});
