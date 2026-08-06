import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ForbiddenLimitedCacheData, ForbiddenLimitedList, LimitRegulation } from '@/types/card';

const apiMocks = vi.hoisted(() => ({
  fetchForbiddenLimitedList: vi.fn(),
  fetchAvailableEffectiveDates: vi.fn(),
  getNextEffectiveDate: vi.fn()
}));

const storageMocks = vi.hoisted(() => ({
  safeStorageGet: vi.fn(),
  safeStorageSet: vi.fn()
}));

vi.mock('@/api/forbidden-limited', () => apiMocks);
vi.mock('@/utils/extension-context-checker', () => storageMocks);

import { ForbiddenLimitedCache, forbiddenLimitedCache } from '@/utils/forbidden-limited-cache';

const STORAGE_KEY = 'forbiddenLimitedList';
const DAY = 24 * 60 * 60 * 1000;

function createList(
  effectiveDate: string,
  fetchedAt: number,
  regulations: Record<string, LimitRegulation> = {}
): ForbiddenLimitedList {
  return { effectiveDate, fetchedAt, regulations };
}

function createCacheData(overrides: Partial<ForbiddenLimitedCacheData> = {}): ForbiddenLimitedCacheData {
  const now = Date.now();
  const latest = createList('2026-01-01', now, {
    '100': 'limited',
    '200': 'forbidden'
  });
  return {
    lists: { [latest.effectiveDate]: latest },
    latestEffectiveDate: latest.effectiveDate,
    availableDates: [latest.effectiveDate],
    discoveredAt: now,
    ...overrides
  };
}

function setInternalCache(cache: ForbiddenLimitedCache, data: ForbiddenLimitedCacheData | null): void {
  (cache as unknown as { cache: ForbiddenLimitedCacheData | null }).cache = data;
}

function getInternalCache(cache: ForbiddenLimitedCache): ForbiddenLimitedCacheData | null {
  return (cache as unknown as { cache: ForbiddenLimitedCacheData | null }).cache;
}

describe('ForbiddenLimitedCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.fetchForbiddenLimitedList.mockReset();
    apiMocks.fetchAvailableEffectiveDates.mockReset();
    apiMocks.getNextEffectiveDate.mockReset();
    storageMocks.safeStorageGet.mockReset();
    storageMocks.safeStorageSet.mockReset();
    storageMocks.safeStorageSet.mockResolvedValue(undefined);
    apiMocks.getNextEffectiveDate.mockReturnValue('2999-01-01');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('新形式キャッシュを読み込み、2回目のinitはstorageを読まない [covers:cache_data_guard.required_keys_present_true] [covers:init.new_format_loaded] [covers:init.already_initialized_returns_early]', async () => {
      const data = createCacheData();
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: data });
      const cache = new ForbiddenLimitedCache();

      await cache.init();
      await cache.init();

      expect(storageMocks.safeStorageGet).toHaveBeenCalledTimes(1);
      expect(cache.getRegulation('100')).toBe('limited');
      expect(cache.getCurrentEffectiveDate()).toBe('2026-01-01');
    });

    it('旧形式キャッシュを新形式へ移行して保存する [covers:old_list_guard.required_keys_present_true] [covers:migrate_old.wraps_single_list] [covers:init.old_format_migrated_and_persisted]', async () => {
      const oldList = createList('2025-10-01', Date.now(), { '300': 'semi-limited' });
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: oldList });
      const cache = new ForbiddenLimitedCache();

      await cache.init();

      expect(cache.getRegulation('300')).toBe('semi-limited');
      expect(cache.getAvailableDates()).toEqual(['2025-10-01']);
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: {
          lists: { '2025-10-01': oldList },
          latestEffectiveDate: '2025-10-01',
          availableDates: ['2025-10-01'],
          discoveredAt: oldList.fetchedAt
        }
      });
    });

    it('新旧どちらでもないstorage値はcache=nullのまま初期化する [covers:cache_data_guard.non_object_false] [covers:cache_data_guard.required_key_missing_false] [covers:old_list_guard.non_object_false] [covers:old_list_guard.lists_key_present_false] [covers:init.invalid_storage_keeps_cache_null]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: { lists: {}, effectiveDate: '2026-01-01', regulations: {}, fetchedAt: 1 } });
      const cache = new ForbiddenLimitedCache();
      vi.spyOn(cache, 'checkAndUpdate').mockResolvedValue(undefined);

      await cache.init();

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(cache.getAvailableDates()).toEqual([]);
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('初期化後のバックグラウンド更新がrejectしてもinitはrejectしない [covers:init.starts_background_check_and_swallows_rejection]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: createCacheData() });
      const cache = new ForbiddenLimitedCache();
      vi.spyOn(cache, 'checkAndUpdate').mockRejectedValue(new Error('background failed'));

      await expect(cache.init()).resolves.toBeUndefined();
      await vi.runAllTicks();
    });
  });

  describe('read methods', () => {
    it('cacheが無い場合はnull/undefined/空配列を返す [covers:get_list.no_cache_null] [covers:get_regulation.no_cache_undefined] [covers:current_date.cache_or_nullish_undefined] [covers:available_dates.no_cache_empty]', () => {
      const cache = new ForbiddenLimitedCache();

      expect((cache as any).getList(null)).toBeNull();
      expect(cache.getRegulation('100')).toBeUndefined();
      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(cache.getAvailableDates()).toEqual([]);
    });

    it('最新版または指定日のリストから規制値を取得する [covers:get_list.latest_null_uses_latest_effective_date] [covers:get_list.explicit_date_uses_exact_key] [covers:get_regulation.latest_or_explicit_lookup] [covers:get_regulation.missing_card_or_list_undefined]', () => {
      const latest = createList('2026-04-01', Date.now(), { '100': 'forbidden' });
      const old = createList('2026-01-01', Date.now(), { '100': 'limited' });
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({
        lists: { '2026-04-01': latest, '2026-01-01': old },
        latestEffectiveDate: '2026-04-01'
      }));

      expect(cache.getRegulation('100')).toBe('forbidden');
      expect(cache.getRegulation('100', '2026-01-01')).toBe('limited');
      expect(cache.getRegulation('999', '2026-01-01')).toBeUndefined();
      expect(cache.getRegulation('100', '2099-01-01')).toBeUndefined();
    });

    it('複数カードの規制値をcardIdごとのobjectにする [covers:get_regulations.maps_each_card_id]', () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      expect(cache.getRegulations(['100', '200', '999'])).toEqual({
        '100': 'limited',
        '200': 'forbidden',
        '999': undefined
      });
    });

    it('latestEffectiveDateがnullの場合はundefinedを返す [covers:current_date.cache_or_nullish_undefined]', () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ latestEffectiveDate: null }));

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
    });

    it('availableDatesがあればコピーをsortして返し、空ならlistsキーで代用する [covers:available_dates.available_dates_sorted_copy] [covers:available_dates.fallback_list_keys_sorted]', () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({
        availableDates: ['2026-04-01', '2026-01-01']
      }));

      const dates = cache.getAvailableDates();
      expect(dates).toEqual(['2026-01-01', '2026-04-01']);
      dates.push('mutated');
      expect(cache.getAvailableDates()).toEqual(['2026-01-01', '2026-04-01']);

      setInternalCache(cache, createCacheData({
        lists: {
          '2026-04-01': createList('2026-04-01', Date.now()),
          '2026-01-01': createList('2026-01-01', Date.now())
        },
        availableDates: []
      }));
      expect(cache.getAvailableDates()).toEqual(['2026-01-01', '2026-04-01']);
    });
  });

  describe('ensureList', () => {
    it('既存リストがあればfetchせずそのまま返す [covers:ensure_list.existing_returns_without_fetch]', async () => {
      const existing = createList('2026-01-01', Date.now(), { '100': 'limited' });
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ lists: { '2026-01-01': existing } }));

      await expect(cache.ensureList('2026-01-01')).resolves.toBe(existing);
      expect(apiMocks.fetchForbiddenLimitedList).not.toHaveBeenCalled();
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('未キャッシュなら取得してcache作成・日付追加・保存を行う [covers:ensure_list.fetch_success_creates_cache_adds_date_persists] [covers:persist.saves_storage_key_with_current_cache]', async () => {
      const fetched = createList('2026-01-01', Date.now(), { '100': 'limited' });
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(fetched);
      const cache = new ForbiddenLimitedCache();

      await expect(cache.ensureList('2026-01-01')).resolves.toBe(fetched);

      expect(apiMocks.fetchForbiddenLimitedList).toHaveBeenCalledWith('2026-01-01');
      expect(cache.getAvailableDates()).toEqual(['2026-01-01']);
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: {
          lists: { '2026-01-01': fetched },
          latestEffectiveDate: null,
          availableDates: ['2026-01-01'],
          discoveredAt: 0
        }
      });
    });

    it('availableDatesに既にある日付は重複追加しない [covers:ensure_list.fetch_success_date_already_available_not_duplicated]', async () => {
      const fetched = createList('2026-01-01', Date.now(), { '100': 'limited' });
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(fetched);
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ lists: {}, availableDates: ['2026-01-01'] }));

      await cache.ensureList('2026-01-01');

      expect(cache.getAvailableDates()).toEqual(['2026-01-01']);
    });

    it('取得失敗時は例外を投げずnullを返す [covers:ensure_list.fetch_error_returns_null]', async () => {
      apiMocks.fetchForbiddenLimitedList.mockRejectedValue(new Error('network'));
      const cache = new ForbiddenLimitedCache();

      await expect(cache.ensureList('2026-01-01')).resolves.toBeNull();
    });
  });

  describe('needsUpdate and checkAndUpdate', () => {
    it('更新が必要な状態をtrueとして判定する [covers:needs_update.no_cache_true] [covers:needs_update.discovery_ttl_expired_true] [covers:needs_update.latest_missing_true] [covers:needs_update.latest_cache_ttl_expired_true] [covers:needs_update.next_effective_date_reached_true]', () => {
      const cache = new ForbiddenLimitedCache();
      expect((cache as any).needsUpdate()).toBe(true);

      setInternalCache(cache, createCacheData({ discoveredAt: Date.now() - 8 * DAY }));
      expect((cache as any).needsUpdate()).toBe(true);

      setInternalCache(cache, createCacheData({ latestEffectiveDate: null }));
      expect((cache as any).needsUpdate()).toBe(true);

      setInternalCache(cache, createCacheData({
        lists: { '2026-01-01': createList('2026-01-01', Date.now() - 31 * DAY) }
      }));
      expect((cache as any).needsUpdate()).toBe(true);

      apiMocks.getNextEffectiveDate.mockReturnValue('2026-02-01');
      setInternalCache(cache, createCacheData());
      expect((cache as any).needsUpdate()).toBe(true);
    });

    it('全て新鮮で次回適用日が未来なら更新不要と判定する [covers:needs_update.all_fresh_false] [covers:check_update.needs_update_false_returns_without_fetch]', async () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      expect((cache as any).needsUpdate()).toBe(false);
      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      expect(apiMocks.fetchForbiddenLimitedList).not.toHaveBeenCalled();
    });

    it('更新中は内部updatePromiseを再利用して多重fetchしない [covers:check_update.in_flight_reuses_update_promise]', async () => {
      const cache = new ForbiddenLimitedCache();
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(createList('2026-04-01', Date.now()));
      apiMocks.fetchAvailableEffectiveDates.mockResolvedValue(['2026-04-01']);

      const first = cache.checkAndUpdate();
      const second = cache.checkAndUpdate();

      await Promise.all([first, second]);
      expect(apiMocks.fetchForbiddenLimitedList).toHaveBeenCalledTimes(1);
    });

    it('forceUpdateの失敗は握りつぶし、promiseをresetして次回再試行できる [covers:check_update.force_update_error_swallowed_and_promise_reset]', async () => {
      const cache = new ForbiddenLimitedCache();
      apiMocks.fetchForbiddenLimitedList
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce(createList('2026-04-01', Date.now()));
      apiMocks.fetchAvailableEffectiveDates.mockResolvedValue(['2026-04-01']);

      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();

      expect(apiMocks.fetchForbiddenLimitedList).toHaveBeenCalledTimes(2);
    });
  });

  describe('forceUpdate and clear', () => {
    it('最新版と実在日付一覧を取得して保存する [covers:force_update.fetches_latest_and_persists] [covers:force_update.discovery_ttl_expired_fetches_available_dates]', async () => {
      const latest = createList('2026-04-01', Date.now(), { '400': 'semi-limited' });
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(latest);
      apiMocks.fetchAvailableEffectiveDates.mockResolvedValue(['2026-01-01', '2026-04-01']);
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ discoveredAt: Date.now() - 8 * DAY }));

      await cache.forceUpdate();

      expect(apiMocks.fetchForbiddenLimitedList).toHaveBeenCalledWith();
      expect(apiMocks.fetchAvailableEffectiveDates).toHaveBeenCalledTimes(1);
      expect(cache.getCurrentEffectiveDate()).toBe('2026-04-01');
      expect(cache.getAvailableDates()).toEqual(['2026-01-01', '2026-04-01']);
      expect(storageMocks.safeStorageSet).toHaveBeenLastCalledWith({
        [STORAGE_KEY]: getInternalCache(cache)
      });
    });

    it('discovery TTL内なら実在日付一覧fetchをスキップする [covers:force_update.discovery_ttl_fresh_skips_available_dates]', async () => {
      const latest = createList('2026-04-01', Date.now());
      const discoveredAt = Date.now();
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(latest);
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({
        availableDates: ['2026-01-01'],
        discoveredAt
      }));

      await cache.forceUpdate();

      expect(apiMocks.fetchAvailableEffectiveDates).not.toHaveBeenCalled();
      expect(cache.getAvailableDates()).toEqual(['2026-01-01']);
      expect(getInternalCache(cache)?.discoveredAt).toBe(discoveredAt);
    });

    it('実在日付一覧fetchが失敗しても既存値を保持して最新版は保存する [covers:force_update.available_dates_fetch_error_keeps_existing]', async () => {
      const latest = createList('2026-04-01', Date.now());
      const discoveredAt = Date.now() - 8 * DAY;
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(latest);
      apiMocks.fetchAvailableEffectiveDates.mockRejectedValue(new Error('dates failed'));
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({
        availableDates: ['2026-01-01'],
        discoveredAt
      }));

      await expect(cache.forceUpdate()).resolves.toBeUndefined();

      expect(cache.getCurrentEffectiveDate()).toBe('2026-04-01');
      expect(cache.getAvailableDates()).toEqual(['2026-01-01']);
      expect(getInternalCache(cache)?.discoveredAt).toBe(discoveredAt);
    });

    it('最新版fetchが失敗した場合forceUpdateはrejectする [covers:force_update.latest_fetch_error_rejects]', async () => {
      apiMocks.fetchForbiddenLimitedList.mockRejectedValue(new Error('latest failed'));
      const cache = new ForbiddenLimitedCache();

      await expect(cache.forceUpdate()).rejects.toThrow('latest failed');
      expect(apiMocks.fetchAvailableEffectiveDates).not.toHaveBeenCalled();
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('clearはcacheをnullにしstorageにもnullを保存する [covers:clear.sets_cache_null_and_persists_null]', async () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      await cache.clear();

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({ [STORAGE_KEY]: null });
    });

    it('グローバルインスタンスをexportする [covers:singleton.instance_created]', () => {
      expect(forbiddenLimitedCache).toBeInstanceOf(ForbiddenLimitedCache);
    });
  });
});
