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
    it('新形式キャッシュを読み込み、2回目のinitはstorageを読まない [covers:cache-data-guard.required-keys-present-true] [covers:init.new-format-loaded] [covers:init.already-initialized-returns-early]', async () => {
      const data = createCacheData();
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: data });
      const cache = new ForbiddenLimitedCache();

      await cache.init();
      await cache.init();

      expect(storageMocks.safeStorageGet).toHaveBeenCalledTimes(1);
      expect(cache.getRegulation('100')).toBe('limited');
      expect(cache.getCurrentEffectiveDate()).toBe('2026-01-01');
    });

    it('旧形式キャッシュを新形式へ移行して保存する [covers:old-list-guard.required-keys-present-true] [covers:migrate-old.wraps-single-list] [covers:init.old-format-migrated-and-persisted]', async () => {
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

    it('新旧どちらでもないstorage値はcache=nullのまま初期化する [covers:cache-data-guard.non-object-false] [covers:cache-data-guard.required-key-missing-false] [covers:old-list-guard.non-object-false] [covers:old-list-guard.lists-key-present-false] [covers:init.invalid-storage-keeps-cache-null]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: { lists: {}, effectiveDate: '2026-01-01', regulations: {}, fetchedAt: 1 } });
      const cache = new ForbiddenLimitedCache();
      vi.spyOn(cache, 'checkAndUpdate').mockResolvedValue(undefined);

      await cache.init();

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(cache.getAvailableDates()).toEqual([]);
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('初期化後のバックグラウンド更新がrejectしてもinitはrejectしない [covers:init.starts-background-check-and-swallows-rejection]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: createCacheData() });
      const cache = new ForbiddenLimitedCache();
      vi.spyOn(cache, 'checkAndUpdate').mockRejectedValue(new Error('background failed'));

      await expect(cache.init()).resolves.toBeUndefined();
      await vi.runAllTicks();
    });
  });

  describe('read methods', () => {
    it('cacheが無い場合はnull/undefined/空配列を返す [covers:get-list.no-cache-null] [covers:get-regulation.no-cache-undefined] [covers:current-date.cache-or-nullish-undefined] [covers:available-dates.no-cache-empty]', () => {
      const cache = new ForbiddenLimitedCache();

      expect((cache as any).getList(null)).toBeNull();
      expect(cache.getRegulation('100')).toBeUndefined();
      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(cache.getAvailableDates()).toEqual([]);
    });

    it('最新版または指定日のリストから規制値を取得する [covers:get-list.latest-null-uses-latest-effective-date] [covers:get-list.explicit-date-uses-exact-key] [covers:get-regulation.latest-or-explicit-lookup] [covers:get-regulation.missing-card-or-list-undefined]', () => {
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

    it('複数カードの規制値をcardIdごとのobjectにする [covers:get-regulations.maps-each-card-id]', () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      expect(cache.getRegulations(['100', '200', '999'])).toEqual({
        '100': 'limited',
        '200': 'forbidden',
        '999': undefined
      });
    });

    it('latestEffectiveDateがnullの場合はundefinedを返す [covers:current-date.cache-or-nullish-undefined]', () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ latestEffectiveDate: null }));

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
    });

    it('availableDatesがあればコピーをsortして返し、空ならlistsキーで代用する [covers:available-dates.available-dates-sorted-copy] [covers:available-dates.fallback-list-keys-sorted]', () => {
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
    it('既存リストがあればfetchせずそのまま返す [covers:ensure-list.existing-returns-without-fetch]', async () => {
      const existing = createList('2026-01-01', Date.now(), { '100': 'limited' });
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ lists: { '2026-01-01': existing } }));

      await expect(cache.ensureList('2026-01-01')).resolves.toBe(existing);
      expect(apiMocks.fetchForbiddenLimitedList).not.toHaveBeenCalled();
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('未キャッシュなら取得してcache作成・日付追加・保存を行う [covers:ensure-list.fetch-success-creates-cache-adds-date-persists] [covers:persist.saves-storage-key-with-current-cache]', async () => {
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

    it('availableDatesに既にある日付は重複追加しない [covers:ensure-list.fetch-success-date-already-available-not-duplicated]', async () => {
      const fetched = createList('2026-01-01', Date.now(), { '100': 'limited' });
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(fetched);
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData({ lists: {}, availableDates: ['2026-01-01'] }));

      await cache.ensureList('2026-01-01');

      expect(cache.getAvailableDates()).toEqual(['2026-01-01']);
    });

    it('取得失敗時は例外を投げずnullを返す [covers:ensure-list.fetch-error-returns-null]', async () => {
      apiMocks.fetchForbiddenLimitedList.mockRejectedValue(new Error('network'));
      const cache = new ForbiddenLimitedCache();

      await expect(cache.ensureList('2026-01-01')).resolves.toBeNull();
    });
  });

  describe('needsUpdate and checkAndUpdate', () => {
    it('更新が必要な状態をtrueとして判定する [covers:needs-update.no-cache-true] [covers:needs-update.discovery-ttl-expired-true] [covers:needs-update.latest-missing-true] [covers:needs-update.latest-cache-ttl-expired-true] [covers:needs-update.next-effective-date-reached-true]', () => {
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

    it('全て新鮮で次回適用日が未来なら更新不要と判定する [covers:needs-update.all-fresh-false] [covers:check-update.needs-update-false-returns-without-fetch]', async () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      expect((cache as any).needsUpdate()).toBe(false);
      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      expect(apiMocks.fetchForbiddenLimitedList).not.toHaveBeenCalled();
    });

    it('更新中は内部updatePromiseを再利用して多重fetchしない [covers:check-update.in-flight-reuses-update-promise]', async () => {
      const cache = new ForbiddenLimitedCache();
      apiMocks.fetchForbiddenLimitedList.mockResolvedValue(createList('2026-04-01', Date.now()));
      apiMocks.fetchAvailableEffectiveDates.mockResolvedValue(['2026-04-01']);

      const first = cache.checkAndUpdate();
      const second = cache.checkAndUpdate();

      await Promise.all([first, second]);
      expect(apiMocks.fetchForbiddenLimitedList).toHaveBeenCalledTimes(1);
    });

    it('forceUpdateの失敗は握りつぶし、promiseをresetして次回再試行できる [covers:check-update.force-update-error-swallowed-and-promise-reset]', async () => {
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
    it('最新版と実在日付一覧を取得して保存する [covers:force-update.fetches-latest-and-persists] [covers:force-update.discovery-ttl-expired-fetches-available-dates]', async () => {
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

    it('discovery TTL内なら実在日付一覧fetchをスキップする [covers:force-update.discovery-ttl-fresh-skips-available-dates]', async () => {
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

    it('実在日付一覧fetchが失敗しても既存値を保持して最新版は保存する [covers:force-update.available-dates-fetch-error-keeps-existing]', async () => {
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

    it('最新版fetchが失敗した場合forceUpdateはrejectする [covers:force-update.latest-fetch-error-rejects]', async () => {
      apiMocks.fetchForbiddenLimitedList.mockRejectedValue(new Error('latest failed'));
      const cache = new ForbiddenLimitedCache();

      await expect(cache.forceUpdate()).rejects.toThrow('latest failed');
      expect(apiMocks.fetchAvailableEffectiveDates).not.toHaveBeenCalled();
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('clearはcacheをnullにしstorageにもnullを保存する [covers:clear.sets-cache-null-and-persists-null]', async () => {
      const cache = new ForbiddenLimitedCache();
      setInternalCache(cache, createCacheData());

      await cache.clear();

      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({ [STORAGE_KEY]: null });
    });

    it('グローバルインスタンスをexportする [covers:singleton.instance-created]', () => {
      expect(forbiddenLimitedCache).toBeInstanceOf(ForbiddenLimitedCache);
    });
  });
});
