/**
 * 統合テスト: 絞り込み検索のAND/OR切り替え
 *
 * 実際にユーザーが操作する経路（FilterTab相当の状態変更 → 検索実行 → 結果反映）を
 * useFilterLogic / useSearchExecution / searchStore を組み合わせて検証する。
 * 単体テスト（useSearchExecution.test.ts）は applyClientSideFilters を直接呼び出すのに対し、
 * ここでは実際の検索フロー（handleSearch経由でのautoモード検索・クライアント側再フィルタリング）
 * を通しで確認する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useSearchExecution } from '@/components/searchInputBar/composables/useSearchExecution';
import { useFilterLogic } from '@/composables/search-filter/useFilterLogic';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';
import type { MonsterCard } from '@/types/card';

const searchCardsAutoMock = vi.fn();

vi.mock('@/api/card-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/card-search')>();
  return {
    ...actual,
    searchCardsAuto: (...args: unknown[]) => searchCardsAutoMock(...args),
    searchCards: vi.fn().mockResolvedValue([])
  };
});

function monsterCard(overrides: Partial<MonsterCard>): MonsterCard {
  return {
    name: 'テストカード',
    cardId: overrides.cardId ?? '1',
    ciid: '1',
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    attribute: 'LIGHT',
    levelType: 'level',
    levelValue: 4,
    race: 'warrior',
    types: [],
    isExtraDeck: false,
    ...overrides
  };
}

describe('統合テスト: 絞り込み検索のAND/OR切り替え', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    searchCardsAutoMock.mockReset();
  });

  it('モンスタータイプをAND指定でトグルすると、両方満たすカードのみ検索結果に残る', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const pageLanguage = ref('ja');

    const filterLogic = useFilterLogic(pageLanguage);
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('auto') });

    // ユーザー操作相当: モンスタータイプを2つ選択し、AND/ORをANDにトグル
    filterLogic.cycleMonsterTypeState('fusion');
    filterLogic.cycleMonsterTypeState('effect');
    expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('or');
    filterLogic.toggleMonsterTypeMatchMode();
    expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('and');

    searchStore.searchQuery = 'ドラゴン'; // autoモードでクライアント側フィルタが効く3文字以上

    const both = monsterCard({ cardId: 'both', types: ['fusion', 'effect'] });
    const onlyOne = monsterCard({ cardId: 'onlyOne', types: ['fusion'] });
    searchCardsAutoMock.mockResolvedValue({ cards: [both, onlyOne] });

    await handleSearch();

    expect(searchCardsAutoMock).toHaveBeenCalledTimes(1);
    expect(searchStore.searchResults.map(c => c.cardId)).toEqual(['both']);
  });

  it('モンスタータイプをOR指定でトグルすると、いずれかを満たすカードが検索結果に残る', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const pageLanguage = ref('ja');

    const filterLogic = useFilterLogic(pageLanguage);
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('auto') });

    filterLogic.cycleMonsterTypeState('fusion');
    filterLogic.cycleMonsterTypeState('effect');
    expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('or');

    searchStore.searchQuery = 'ドラゴン';

    const onlyOne = monsterCard({ cardId: 'onlyOne', types: ['fusion'] });
    const neither = monsterCard({ cardId: 'neither', types: ['normal'] });
    searchCardsAutoMock.mockResolvedValue({ cards: [onlyOne, neither] });

    await handleSearch();

    expect(searchStore.searchResults.map(c => c.cardId)).toEqual(['onlyOne']);
  });

  it('新しい検索を開始した時点で、直前の検索結果を即座にクリアする（fetch完了を待たない）', async () => {
    const deckStore = useDeckEditStore();
    const searchStore = useSearchStore();
    const { handleSearch } = useSearchExecution({ deckStore, searchMode: ref('auto') });

    // 直前の検索結果が残っている状態を再現
    const stale = monsterCard({ cardId: 'stale' });
    searchStore.searchResults = [stale] as unknown as typeof searchStore.searchResults;
    searchStore.allResults = [stale] as unknown as typeof searchStore.allResults;

    searchStore.searchQuery = 'ドラゴン';

    let resolveFetch: (value: { cards: MonsterCard[] }) => void = () => {};
    searchCardsAutoMock.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));

    const searchPromise = handleSearch();

    // fetchが完了する前（awaitする前）の時点で、既に古い結果がクリアされていること
    expect(searchStore.searchResults).toEqual([]);
    expect(searchStore.allResults).toEqual([]);

    resolveFetch({ cards: [] });
    await searchPromise;
  });
});
