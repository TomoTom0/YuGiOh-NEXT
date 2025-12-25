import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SearchFilters } from '@/types/search-filters';

const STORAGE_KEY = 'ygo-next-search-history';

describe('useSearchHistory', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createDefaultFilters = (): SearchFilters => ({
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'and',
    linkValues: [],
    linkMarkers: [],
    scaleValues: [],
    levelValues: [],
    def: { exact: false, unknown: false },
    atk: { exact: false, unknown: false }
  });

  describe('基本機能', () => {
    it('検索履歴を追加できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]).toEqual({
        query: '青眼の白龍',
        searchMode: 'name',
        filters,
        resultCids: ['4007'],
        resultCount: 1,
        timestamp: expect.any(Number),
        isFavorite: false
      });
    });

    it('LocalStorageから履歴を読み込める', async () => {
      const mockHistory = [
        {
          query: 'test query',
          searchMode: 'name',
          filters: createDefaultFilters(),
          resultCids: ['1', '2', '3'],
          resultCount: 3,
          timestamp: Date.now(),
          isFavorite: false
        }
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockHistory));

      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { historyItems } = useSearchHistory();

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.query).toBe('test query');
    });

    it('お気に入りを追加できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(0);

      expect(historyItems.value[0]?.isFavorite).toBe(true);
    });

    it('履歴を削除できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, removeFromHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      removeFromHistory(0);

      expect(historyItems.value).toHaveLength(0);
    });

    it('お気に入りのみを取得できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, favoriteItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('ブラック・マジシャン', 'name', filters, ['4335']);
      toggleFavorite(0); // 最新の項目（ブラック・マジシャン）をお気に入りに

      expect(favoriteItems.value).toHaveLength(1);
      expect(favoriteItems.value[0]?.query).toBe('ブラック・マジシャン');
    });

    it('通常の履歴をクリアできる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, clearHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('ブラック・マジシャン', 'name', filters, ['4335']);
      toggleFavorite(0); // 最新の項目（ブラック・マジシャン）をお気に入りに
      clearHistory();

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.query).toBe('ブラック・マジシャン');
      expect(historyItems.value[0]?.isFavorite).toBe(true);
    });

    it('検索結果を更新できる（日付が異なる場合）', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, updateResults, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      // 1日前のタイムスタンプを設定
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      historyItems.value[0]!.timestamp = yesterday;

      const updated = updateResults(0, ['4007', '12345']);

      expect(updated).toBe(true);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007', '12345']);
      expect(historyItems.value[0]?.resultCount).toBe(2);
    });

    it('履歴がLocalStorageに保存される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBeGreaterThan(0);
      const firstItem = parsed.find((item: any) => item.query === '青眼の白龍');
      expect(firstItem).toBeDefined();
    });
  });
});
