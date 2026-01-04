import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSearchStore } from '@/stores/search';
import type { CardInfo } from '@/types/card';

// search-exclusion-engine と search-exclusion-adapter をモック
vi.mock('@/utils/search-exclusion-engine', () => ({
  inferExclusions: vi.fn(() => ({ excluded: [], reasons: {} })),
  loadExclusionRules: vi.fn(() => [])
}));

vi.mock('@/utils/search-exclusion-adapter', () => ({
  toSearchConditionState: vi.fn((filters) => filters)
}));

describe('stores/search', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // サンプルカード情報を作成するヘルパー
  const createCard = (id: string): CardInfo => ({
    cardId: id,
    ciid: 'ciid1',
    cid: id,
    name: `Card ${id}`,
    nameRuby: '',
    imageUrl: '',
    cardType: 'monster',
    cardTypeText: 'Monster',
    attribute: 'light',
    level: 4,
    atk: 1800,
    def: 1000,
    race: 'dragon',
    effect: 'Sample effect',
    forbidden: null
  });

  describe('初期状態', () => {
    it('searchQueryは空文字列', () => {
      const store = useSearchStore();
      expect(store.searchQuery).toBe('');
    });

    it('searchResultsは空配列', () => {
      const store = useSearchStore();
      expect(store.searchResults).toEqual([]);
    });

    it('allResultsは空配列', () => {
      const store = useSearchStore();
      expect(store.allResults).toEqual([]);
    });

    it('currentPageは0', () => {
      const store = useSearchStore();
      expect(store.currentPage).toBe(0);
    });

    it('hasMoreはfalse', () => {
      const store = useSearchStore();
      expect(store.hasMore).toBe(false);
    });

    it('isLoadingはfalse', () => {
      const store = useSearchStore();
      expect(store.isLoading).toBe(false);
    });

    it('isGlobalSearchModeはfalse', () => {
      const store = useSearchStore();
      expect(store.isGlobalSearchMode).toBe(false);
    });

    it('searchFiltersはデフォルト値', () => {
      const store = useSearchStore();
      expect(store.searchFilters).toEqual({
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
      });
    });
  });

  describe('状態の更新', () => {
    it('searchQueryを更新できる', () => {
      const store = useSearchStore();
      store.searchQuery = 'ブラック・マジシャン';
      expect(store.searchQuery).toBe('ブラック・マジシャン');
    });

    it('searchResultsを更新できる', () => {
      const store = useSearchStore();
      const card1 = createCard('card1');
      const card2 = createCard('card2');

      store.searchResults = [{ card: card1 }, { card: card2 }];

      expect(store.searchResults).toHaveLength(2);
      expect(store.searchResults[0]?.card).toMatchObject(card1);
      expect(store.searchResults[1]?.card).toMatchObject(card2);
    });

    it('allResultsを更新できる', () => {
      const store = useSearchStore();
      const card1 = createCard('card1');

      store.allResults = [{ card: card1 }];

      expect(store.allResults).toHaveLength(1);
      expect(store.allResults[0]?.card).toMatchObject(card1);
    });

    it('currentPageを更新できる', () => {
      const store = useSearchStore();
      store.currentPage = 5;
      expect(store.currentPage).toBe(5);
    });

    it('hasMoreを更新できる', () => {
      const store = useSearchStore();
      store.hasMore = true;
      expect(store.hasMore).toBe(true);
    });

    it('isLoadingを更新できる', () => {
      const store = useSearchStore();
      store.isLoading = true;
      expect(store.isLoading).toBe(true);
    });

    it('isGlobalSearchModeを更新できる', () => {
      const store = useSearchStore();
      store.isGlobalSearchMode = true;
      expect(store.isGlobalSearchMode).toBe(true);
    });

    it('searchFiltersを更新できる', () => {
      const store = useSearchStore();
      store.searchFilters.cardType = 'monster';
      store.searchFilters.attributes = ['light', 'dark'];
      store.searchFilters.races = ['dragon', 'spellcaster'];

      expect(store.searchFilters.cardType).toBe('monster');
      expect(store.searchFilters.attributes).toEqual(['light', 'dark']);
      expect(store.searchFilters.races).toEqual(['dragon', 'spellcaster']);
    });
  });

  describe('clearAllFilters', () => {
    it('全てのフィルターをデフォルト値にリセットする', () => {
      const store = useSearchStore();

      // フィルターを設定
      store.searchFilters.cardType = 'monster';
      store.searchFilters.attributes = ['light'];
      store.searchFilters.spellTypes = ['continuous'];
      store.searchFilters.trapTypes = ['counter'];
      store.searchFilters.races = ['dragon'];
      store.searchFilters.monsterTypes = ['fusion'];
      store.searchFilters.monsterTypeMatchMode = 'and';
      store.searchFilters.levelType = 'rank';
      store.searchFilters.levelValues = ['4', '5'];
      store.searchFilters.linkValues = ['2', '3'];
      store.searchFilters.scaleValues = ['1', '2'];
      store.searchFilters.linkMarkers = ['top', 'bottom'];
      store.searchFilters.linkMarkerMatchMode = 'and';
      store.searchFilters.atk = { exact: true, unknown: true };
      store.searchFilters.def = { exact: true, unknown: true };
      store.searchFilters.releaseDate = { from: '2020-01-01', to: '2023-12-31' };

      // クリア
      store.clearAllFilters();

      // デフォルト値に戻っている
      expect(store.searchFilters).toEqual({
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
      });
    });

    it('複数回クリアしても問題ない', () => {
      const store = useSearchStore();

      store.searchFilters.cardType = 'spell';
      store.clearAllFilters();
      store.clearAllFilters();

      expect(store.searchFilters.cardType).toBeNull();
    });
  });

  describe('exclusionResult算出プロパティ', () => {
    it('exclusionResultが計算される', () => {
      const store = useSearchStore();

      // モック関数が呼ばれた結果を確認
      expect(store.exclusionResult).toEqual({ excluded: [], reasons: {} });
    });
  });

  describe('複雑なフィルター操作', () => {
    it('複数のフィルター条件を同時に設定できる', () => {
      const store = useSearchStore();

      store.searchFilters.cardType = 'monster';
      store.searchFilters.attributes = ['light', 'dark', 'fire'];
      store.searchFilters.races = ['dragon', 'spellcaster'];
      store.searchFilters.monsterTypes = ['effect', 'fusion'];
      store.searchFilters.levelValues = ['7', '8'];
      store.searchFilters.atk = { exact: true, unknown: false };

      expect(store.searchFilters.cardType).toBe('monster');
      expect(store.searchFilters.attributes).toHaveLength(3);
      expect(store.searchFilters.races).toHaveLength(2);
      expect(store.searchFilters.monsterTypes).toHaveLength(2);
      expect(store.searchFilters.levelValues).toHaveLength(2);
      expect(store.searchFilters.atk.exact).toBe(true);
    });

    it('フィルターの一部だけをクリアできる', () => {
      const store = useSearchStore();

      store.searchFilters.cardType = 'monster';
      store.searchFilters.attributes = ['light'];
      store.searchFilters.races = ['dragon'];

      // attributesだけクリア
      store.searchFilters.attributes = [];

      expect(store.searchFilters.cardType).toBe('monster');
      expect(store.searchFilters.attributes).toEqual([]);
      expect(store.searchFilters.races).toEqual(['dragon']);
    });
  });

  describe('検索状態の管理', () => {
    it('ローディング状態を正しく管理できる', () => {
      const store = useSearchStore();

      expect(store.isLoading).toBe(false);

      store.isLoading = true;
      expect(store.isLoading).toBe(true);

      store.isLoading = false;
      expect(store.isLoading).toBe(false);
    });

    it('ページネーション状態を管理できる', () => {
      const store = useSearchStore();

      store.currentPage = 0;
      store.hasMore = true;

      expect(store.currentPage).toBe(0);
      expect(store.hasMore).toBe(true);

      store.currentPage = 1;
      store.hasMore = false;

      expect(store.currentPage).toBe(1);
      expect(store.hasMore).toBe(false);
    });
  });
});
