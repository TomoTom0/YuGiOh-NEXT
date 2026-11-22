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
    it('[covers:add-to-history.new-item-always-not-favorite-with-derived-count-and-timestamp, add-to-history.unshifts-new-item-to-front] 検索履歴を追加できる', async () => {
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

    it('[covers:load-from-storage.parses-stored-json-when-present, use-search-history.loads-once-via-module-level-flag] LocalStorageから履歴を読み込める', async () => {
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

      // 2回目以降の呼び出しはloadFromStorageを再実行しない（loadedフラグにより1回きり）
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      const second = useSearchHistory();
      expect(second.historyItems.value).toHaveLength(1);
      expect(second.historyItems.value[0]?.query).toBe('test query');
    });

    it('[covers:load-from-storage.no-data-keeps-default-empty-array] LocalStorageに未保存の場合は空配列のまま初期化される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { historyItems } = useSearchHistory();

      expect(historyItems.value).toEqual([]);
    });

    it('[covers:load-from-storage.catch-swallows-error-and-preserves-previous-state] LocalStorageの内容が不正なJSONの場合はエラーを投げず空配列のままになる', async () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { historyItems } = useSearchHistory();

      expect(historyItems.value).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('[covers:save-to-storage.catch-swallows-error-without-rethrow] LocalStorageへの保存が失敗してもaddToHistoryは例外を投げない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => addToHistory('青眼の白龍', 'name', filters, ['4007'])).not.toThrow();
      // インメモリのhistoryItemsは保存失敗の影響を受けず更新済みのまま
      expect(historyItems.value).toHaveLength(1);

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('[covers:toggle-favorite.in-range-toggles-and-saves] お気に入りを追加できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(0);

      expect(historyItems.value[0]?.isFavorite).toBe(true);
    });

    it('[covers:toggle-favorite.out-of-range-index-is-noop] 範囲外indexでtoggleFavoriteを呼んでも何も変化しない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(5);
      toggleFavorite(-1);

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.isFavorite).toBe(false);
    });

    it('[covers:remove-from-history.in-range-splices-and-saves] 履歴を削除できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, removeFromHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      removeFromHistory(0);

      expect(historyItems.value).toHaveLength(0);
    });

    it('[covers:remove-from-history.out-of-range-index-is-noop] 範囲外indexでremoveFromHistoryを呼んでも何も削除されない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, removeFromHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      removeFromHistory(5);

      expect(historyItems.value).toHaveLength(1);
    });

    it('[covers:favorite-items.filters-is-favorite-true] お気に入りのみを取得できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, favoriteItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('ブラック・マジシャン', 'name', filters, ['4335']);
      toggleFavorite(0); // 最新の項目（ブラック・マジシャン）をお気に入りに

      expect(favoriteItems.value).toHaveLength(1);
      expect(favoriteItems.value[0]?.query).toBe('ブラック・マジシャン');
    });

    it('[covers:regular-items.filters-is-favorite-false] お気に入り以外の通常履歴のみを取得できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, regularItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('ブラック・マジシャン', 'name', filters, ['4335']);
      toggleFavorite(0); // 最新の項目（ブラック・マジシャン）をお気に入りに

      expect(regularItems.value).toHaveLength(1);
      expect(regularItems.value[0]?.query).toBe('青眼の白龍');
    });

    it('[covers:clear-history.keeps-only-favorites-and-saves] 通常の履歴をクリアできる', async () => {
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

    it('[covers:update-results.different-date-updates-and-returns-true] 検索結果を更新できる（日付が異なる場合）', async () => {
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

    it('[covers:update-results.same-date-returns-false-without-update] 検索結果は更新されない（日付が同じ場合）', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, updateResults, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      const updated = updateResults(0, ['4007', '12345']);

      expect(updated).toBe(false);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007']);
    });

    it('[covers:update-results.out-of-range-returns-false-without-save] 範囲外indexでupdateResultsを呼ぶとfalseを返し更新されない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, updateResults, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      const updated = updateResults(5, ['9999']);

      expect(updated).toBe(false);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007']);
    });

    it('[covers:save-to-storage.persists-current-history-as-json, add-to-history.always-saves-to-storage] 履歴がLocalStorageに保存される', async () => {
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

  describe('重複排除・上限トリム', () => {
    it('[covers:add-to-history.dedup-removes-matching-non-favorite-entries] 同一query+searchMode+filtersの非お気に入り項目は追加時に除去される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('青眼の白龍', 'name', filters, ['4007', '4008']);

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007', '4008']);
    });

    it('[covers:add-to-history.dedup-keeps-favorites-even-if-matching] 同一条件でもお気に入り項目は除去されず新規項目と共存する', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(0);
      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      expect(historyItems.value).toHaveLength(2);
      expect(historyItems.value.filter(item => item.query === '青眼の白龍')).toHaveLength(2);
    });

    it('[covers:add-to-history.trims-regulars-to-max-size-when-exceeded] 非お気に入りが50件を超えると直近50件のみ残りお気に入りが前方に集約される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      // 通常項目を1件追加後、お気に入りにする（履歴の途中に散在させる）
      addToHistory('お気に入り対象', 'name', filters, ['0']);
      toggleFavorite(0);

      // 非お気に入りを51件追加し、51件目でregulars.length(51) > MAX_HISTORY_SIZE(50)のトリムを発生させる
      for (let i = 0; i <= 50; i++) {
        addToHistory(`query-${i}`, 'name', filters, [String(i)]);
      }

      expect(historyItems.value).toHaveLength(51);
      // お気に入りが先頭に集約される
      expect(historyItems.value[0]?.query).toBe('お気に入り対象');
      // 最も古いquery-0はトリムで除去され、直近のquery-49は残る
      expect(historyItems.value.some(item => item.query === 'query-0')).toBe(false);
      expect(historyItems.value.some(item => item.query === 'query-49')).toBe(true);
    });

    it('[covers:add-to-history.no-trim-when-regulars-within-limit] 非お気に入りが50件以下ならお気に入りの位置は前方集約されず維持される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('お気に入り対象', 'name', filters, ['0']);
      toggleFavorite(0);
      addToHistory('通常項目', 'name', filters, ['1']);

      expect(historyItems.value).toHaveLength(2);
      // unshift直後のまま：通常項目が先頭、お気に入りが2番目（前方集約されていない）
      expect(historyItems.value[0]?.query).toBe('通常項目');
      expect(historyItems.value[1]?.query).toBe('お気に入り対象');
    });
  });

  describe('コピーの独立性', () => {
    it('[covers:add-to-history.filters-shallow-copy-shares-nested-references] filtersはトップレベルのみのシャローコピーでネスト配列は参照を共有する', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();
      filters.attributes = ['DARK'];

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      filters.attributes.push('LIGHT');

      expect(historyItems.value[0]?.filters.attributes).toEqual(['DARK', 'LIGHT']);
    });

    it('[covers:add-to-history.result-cids-deep-enough-copy-protects-from-external-mutation] resultCidsは複製されるため呼び出し後の元配列変更の影響を受けない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();
      const resultCids = ['4007'];

      addToHistory('青眼の白龍', 'name', filters, resultCids);
      resultCids.push('9999');

      expect(historyItems.value[0]?.resultCids).toEqual(['4007']);
    });
  });
});
