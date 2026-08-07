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
    // [covers:add_to_history.new_item_always_not_favorite_with_derived_count_and_timestamp]
    // [covers:add_to_history.unshifts_new_item_to_front]
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

    // [covers:load_from_storage.parses_stored_json_when_present]
    // [covers:use_search_history.loads_once_via_module_level_flag]
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

      // 2回目以降の呼び出しはloadFromStorageを再実行しない（loadedフラグにより1回きり）
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      const second = useSearchHistory();
      expect(second.historyItems.value).toHaveLength(1);
      expect(second.historyItems.value[0]?.query).toBe('test query');
    });

    // [covers:load_from_storage.no_data_keeps_default_empty_array]
    it('LocalStorageに未保存の場合は空配列のまま初期化される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { historyItems } = useSearchHistory();

      expect(historyItems.value).toEqual([]);
    });

    // [covers:load_from_storage.catch_swallows_error_and_preserves_previous_state]
    it('LocalStorageの内容が不正なJSONの場合はエラーを投げず空配列のままになる', async () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { historyItems } = useSearchHistory();

      expect(historyItems.value).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    // [covers:save_to_storage.catch_swallows_error_without_rethrow]
    it('LocalStorageへの保存が失敗してもaddToHistoryは例外を投げない', async () => {
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

    // [covers:toggle_favorite.in_range_toggles_and_saves]
    it('お気に入りを追加できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(0);

      expect(historyItems.value[0]?.isFavorite).toBe(true);
    });

    // [covers:toggle_favorite.out_of_range_index_is_noop]
    it('範囲外indexでtoggleFavoriteを呼んでも何も変化しない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(5);
      toggleFavorite(-1);

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.isFavorite).toBe(false);
    });

    // [covers:remove_from_history.in_range_splices_and_saves]
    it('履歴を削除できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, removeFromHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      removeFromHistory(0);

      expect(historyItems.value).toHaveLength(0);
    });

    // [covers:remove_from_history.out_of_range_index_is_noop]
    it('範囲外indexでremoveFromHistoryを呼んでも何も削除されない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, removeFromHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      removeFromHistory(5);

      expect(historyItems.value).toHaveLength(1);
    });

    // [covers:favorite_items.filters_is_favorite_true]
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

    // [covers:regular_items.filters_is_favorite_false]
    it('お気に入り以外の通常履歴のみを取得できる', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, regularItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('ブラック・マジシャン', 'name', filters, ['4335']);
      toggleFavorite(0); // 最新の項目（ブラック・マジシャン）をお気に入りに

      expect(regularItems.value).toHaveLength(1);
      expect(regularItems.value[0]?.query).toBe('青眼の白龍');
    });

    // [covers:clear_history.keeps_only_favorites_and_saves]
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

    // [covers:update_results.different_date_updates_and_returns_true]
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

    // [covers:update_results.same_date_returns_false_without_update]
    it('検索結果は更新されない（日付が同じ場合）', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, updateResults, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      const updated = updateResults(0, ['4007', '12345']);

      expect(updated).toBe(false);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007']);
    });

    // [covers:update_results.out_of_range_returns_false_without_save]
    it('範囲外indexでupdateResultsを呼ぶとfalseを返し更新されない', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, updateResults, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      const updated = updateResults(5, ['9999']);

      expect(updated).toBe(false);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007']);
    });

    // [covers:save_to_storage.persists_current_history_as_json]
    // [covers:add_to_history.always_saves_to_storage]
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

  describe('重複排除・上限トリム', () => {
    // [covers:add_to_history.dedup_removes_matching_non_favorite_entries]
    it('同一query+searchMode+filtersの非お気に入り項目は追加時に除去される', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      addToHistory('青眼の白龍', 'name', filters, ['4007', '4008']);

      expect(historyItems.value).toHaveLength(1);
      expect(historyItems.value[0]?.resultCids).toEqual(['4007', '4008']);
    });

    // [covers:add_to_history.dedup_keeps_favorites_even_if_matching]
    it('同一条件でもお気に入り項目は除去されず新規項目と共存する', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, toggleFavorite, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      toggleFavorite(0);
      addToHistory('青眼の白龍', 'name', filters, ['4007']);

      expect(historyItems.value).toHaveLength(2);
      expect(historyItems.value.filter(item => item.query === '青眼の白龍')).toHaveLength(2);
    });

    // [covers:add_to_history.trims_regulars_to_max_size_when_exceeded]
    it('非お気に入りが50件を超えると直近50件のみ残りお気に入りが前方に集約される', async () => {
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

    // [covers:add_to_history.no_trim_when_regulars_within_limit]
    it('非お気に入りが50件以下ならお気に入りの位置は前方集約されず維持される', async () => {
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
    // [covers:add_to_history.filters_shallow_copy_shares_nested_references]
    it('filtersはトップレベルのみのシャローコピーでネスト配列は参照を共有する', async () => {
      const { useSearchHistory } = await import('@/composables/useSearchHistory');
      const { addToHistory, historyItems } = useSearchHistory();
      const filters = createDefaultFilters();
      filters.attributes = ['DARK'];

      addToHistory('青眼の白龍', 'name', filters, ['4007']);
      filters.attributes.push('LIGHT');

      expect(historyItems.value[0]?.filters.attributes).toEqual(['DARK', 'LIGHT']);
    });

    // [covers:add_to_history.result_cids_deep_enough_copy_protects_from_external_mutation]
    it('resultCidsは複製されるため呼び出し後の元配列変更の影響を受けない', async () => {
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
