import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GenesysPointCacheData, GenesysListEntry } from '@/types/card';

const apiMocks = vi.hoisted(() => ({
  fetchGenesysIndex: vi.fn(),
  fetchGenesysPointList: vi.fn(),
  listParamToEffectiveDate: vi.fn((listParam: string) => {
    if (listParam.length === 6 && /^\d{6}$/.test(listParam)) {
      return `${listParam.slice(0, 4)}-${listParam.slice(4, 6)}-01`;
    }
    return listParam;
  })
}));

const storageMocks = vi.hoisted(() => ({
  safeStorageGet: vi.fn(),
  safeStorageSet: vi.fn()
}));

const resolverMocks = vi.hoisted(() => ({
  resolveGenesysEntries: vi.fn()
}));

const dbMocks = vi.hoisted(() => ({
  db: {
    initialize: vi.fn()
  },
  getUnifiedCacheDB: vi.fn()
}));

vi.mock('@/api/genesys', () => apiMocks);
vi.mock('@/utils/extension-context-checker', () => storageMocks);
vi.mock('@/utils/genesys-name-resolver', () => resolverMocks);
vi.mock('@/utils/unified-cache-db', () => dbMocks);

import { GenesysPointCache, selectApplicableGenesysList } from '@/utils/genesys-cache';

const STORAGE_KEY = 'genesysPointList';
const DAY = 24 * 60 * 60 * 1000;

function entry(
  listParam: string,
  effectiveDate: string,
  points: Record<string, number> = {},
  overrides: Partial<GenesysListEntry> = {}
): GenesysListEntry {
  return { listParam, effectiveDate, points, fetchedAt: Date.now(), ...overrides };
}

function cacheData(
  entries: GenesysListEntry[] = [entry('202606', '2026-06-01', { c1: 50 })],
  overrides: Partial<GenesysPointCacheData> = {}
): GenesysPointCacheData {
  const lists: Record<string, GenesysListEntry> = {};
  for (const item of entries) {
    lists[item.listParam] = item;
  }
  return {
    lists,
    latestListParam: entries[0]?.listParam ?? null,
    availableListParams: entries.map(item => item.listParam),
    discoveredAt: Date.now(),
    ...overrides
  };
}

function ts(ymd: string): number {
  return new Date(`${ymd}T12:00:00`).getTime();
}

function setInternalCache(cache: GenesysPointCache, data: GenesysPointCacheData | null): void {
  (cache as unknown as { cache: GenesysPointCacheData | null }).cache = data;
}

function getInternalCache(cache: GenesysPointCache): GenesysPointCacheData | null {
  return (cache as unknown as { cache: GenesysPointCacheData | null }).cache;
}

function deferred(): { promise: Promise<void>; resolve: () => void; reject: (reason?: unknown) => void } {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('selectApplicableGenesysList', () => {
  it('cacheがnullまたはlistsが空ならnullを返す [covers:select.no_cache_null] [covers:select.empty_lists_null]', () => {
    expect(selectApplicableGenesysList(null, ts('2026-07-11'))).toBeNull();
    expect(selectApplicableGenesysList(cacheData([], { latestListParam: null }), ts('2026-07-11'))).toBeNull();
  });

  it('ローカル日付YYYY-MM-DDで今日以前の最新リストを選ぶ [covers:timestamp_to_ymd.local_date_zero_padded] [covers:select.effective_latest_past_or_today]', () => {
    const data = cacheData(
      [
        entry('202608', '2026-08-01', { c1: 100 }),
        entry('202606', '2026-06-01', { c1: 50 }),
        entry('202604', '2026-04-01', { c1: 25 })
      ],
      { latestListParam: '202608' }
    );

    const selected = selectApplicableGenesysList(data, ts('2026-07-01'));

    expect(selected?.listParam).toBe('202606');
    expect(selected?.points.c1).toBe(50);
  });

  it('適用当日のリストは有効扱いになる [covers:select.effective_includes_today]', () => {
    const data = cacheData(
      [entry('202608', '2026-08-01', { c1: 100 }), entry('202606', '2026-06-01', { c1: 50 })],
      { latestListParam: '202608' }
    );

    expect(selectApplicableGenesysList(data, ts('2026-08-01'))?.listParam).toBe('202608');
  });

  it('すべて未来ならlatestListParamを優先し、無ければ適用日最大を返す [covers:select.all_future_uses_latest_list_param] [covers:select.all_future_latest_missing_uses_max_effective_date]', () => {
    const futureEntries = [
      entry('202610', '2026-10-01', { c1: 30 }),
      entry('202608', '2026-08-01', { c1: 20 })
    ];

    expect(selectApplicableGenesysList(cacheData(futureEntries, { latestListParam: '202608' }), ts('2026-07-11'))?.listParam).toBe('202608');
    expect(selectApplicableGenesysList(cacheData(futureEntries, { latestListParam: null }), ts('2026-07-11'))?.listParam).toBe('202610');
    expect(selectApplicableGenesysList(cacheData(futureEntries, { latestListParam: '209999' }), ts('2026-07-11'))?.listParam).toBe('202610');
  });
});

describe('GenesysPointCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T12:00:00.000Z'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.fetchGenesysIndex.mockReset();
    apiMocks.fetchGenesysPointList.mockReset();
    apiMocks.listParamToEffectiveDate.mockClear();
    storageMocks.safeStorageGet.mockReset();
    storageMocks.safeStorageSet.mockReset();
    storageMocks.safeStorageSet.mockResolvedValue(undefined);
    resolverMocks.resolveGenesysEntries.mockReset();
    resolverMocks.resolveGenesysEntries.mockReturnValue({ points: { c1: 10 }, unresolved: [] });
    dbMocks.db.initialize.mockReset();
    dbMocks.db.initialize.mockResolvedValue(undefined);
    dbMocks.getUnifiedCacheDB.mockReset();
    dbMocks.getUnifiedCacheDB.mockReturnValue(dbMocks.db);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('storageのキャッシュを読み込み、2回目のinitは何もしない [covers:init.stored_cache_loaded] [covers:init.already_initialized_returns_early]', async () => {
      const stored = cacheData([entry('202606', '2026-06-01', { c1: 50 })]);
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: stored });
      const cache = new GenesysPointCache();
      const checkSpy = vi.spyOn(cache, 'checkAndUpdate').mockResolvedValue(undefined);

      await cache.init();
      await cache.init();

      expect(storageMocks.safeStorageGet).toHaveBeenCalledTimes(1);
      expect(checkSpy).toHaveBeenCalledTimes(1);
      expect(cache.getPoint('c1')).toBe(50);
      expect(cache.getCurrentListParam()).toBe('202606');
    });

    it('storageにキャッシュが無い場合はnullのまま初期化する [covers:init.no_stored_cache_keeps_null]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue({});
      const cache = new GenesysPointCache();
      vi.spyOn(cache, 'checkAndUpdate').mockResolvedValue(undefined);

      await cache.init();

      expect(cache.getCurrentListParam()).toBeUndefined();
      expect(cache.getAvailableListParams()).toEqual([]);
    });

    it('起動時にdiscoveredAtがTTL以内ならGENESYSインデックスを再取得しない [covers:init.startup_ttl_fresh_skips_update]', async () => {
      const stored = cacheData([entry('202606', '2026-06-01')], {
        discoveredAt: Date.now() - 5 * DAY
      });
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: stored });
      const cache = new GenesysPointCache();

      await cache.init();
      await cache.checkAndUpdate();

      expect(apiMocks.fetchGenesysIndex).not.toHaveBeenCalled();
      expect(getInternalCache(cache)).toEqual(stored);
    });

    it('起動時にdiscoveredAtがTTL超過なら更新し、確認日時をキャッシュへ保存する [covers:init.startup_ttl_expired_updates_and_persists]', async () => {
      const old = cacheData([entry('202606', '2026-06-01')], {
        discoveredAt: Date.now() - 7 * DAY
      });
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: old });
      apiMocks.fetchGenesysIndex.mockResolvedValue([]);
      const cache = new GenesysPointCache();

      await cache.init();
      await cache.checkAndUpdate();

      expect(apiMocks.fetchGenesysIndex).toHaveBeenCalledTimes(1);
      expect(getInternalCache(cache)?.discoveredAt).toBe(Date.now());
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: getInternalCache(cache)
      });
    });

    it('起動時の更新に失敗しても既存キャッシュとdiscoveredAtを保持する [covers:init.startup_update_failure_preserves_cache]', async () => {
      const old = cacheData([entry('202606', '2026-06-01', { c1: 50 })], {
        discoveredAt: Date.now() - 7 * DAY
      });
      storageMocks.safeStorageGet.mockResolvedValue({ [STORAGE_KEY]: old });
      apiMocks.fetchGenesysIndex.mockRejectedValue(new Error('network'));
      const cache = new GenesysPointCache();

      await cache.init();
      await cache.checkAndUpdate();

      expect(getInternalCache(cache)).toEqual(old);
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('バックグラウンド更新がrejectしてもinitはrejectしない [covers:init.starts_background_check_and_swallows_rejection]', async () => {
      storageMocks.safeStorageGet.mockResolvedValue(null);
      const cache = new GenesysPointCache();
      vi.spyOn(cache, 'checkAndUpdate').mockRejectedValue(new Error('background failed'));

      await expect(cache.init()).resolves.toBeUndefined();
      await vi.runAllTicks();
    });
  });

  describe('read methods', () => {
    it('明示listParamは現在有効リストではなく指定リストからpointを読む [covers:get_point.explicit_list_param_lookup]', () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([
        entry('202606', '2026-06-01', { c1: 50 }),
        entry('202608', '2026-08-01', { c1: 100 })
      ], { latestListParam: '202608' }));

      expect(cache.getPoint('c1', '202608')).toBe(100);
      expect(cache.getPoint('missing', '202608')).toBeUndefined();
      expect(cache.getPoint('c1', '209999')).toBeUndefined();
    });

    it('listParam省略時は現在有効リストからpoint/listParam/effectiveDateを読む [covers:get_point.current_applicable_lookup] [covers:current_list_param.selected_or_undefined] [covers:current_effective_date.selected_or_undefined]', () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([
        entry('202606', '2026-06-01', { c1: 50 }),
        entry('202608', '2026-08-01', { c1: 100 })
      ], { latestListParam: '202608' }));

      expect(cache.getPoint('c1')).toBe(50);
      expect(cache.getPoint('missing')).toBeUndefined();
      expect(cache.getCurrentListParam()).toBe('202606');
      expect(cache.getCurrentEffectiveDate()).toBe('2026-06-01');

      setInternalCache(cache, null);
      expect(cache.getCurrentListParam()).toBeUndefined();
      expect(cache.getCurrentEffectiveDate()).toBeUndefined();
    });

    it('availableListParamsはコピーを返し、無ければlistsキーを返す [covers:available_params.no_cache_empty] [covers:available_params.available_copy] [covers:available_params.fallback_list_keys]', () => {
      const cache = new GenesysPointCache();
      expect(cache.getAvailableListParams()).toEqual([]);

      setInternalCache(cache, cacheData([], {
        lists: {
          '202606': entry('202606', '2026-06-01'),
          '202608': entry('202608', '2026-08-01')
        },
        availableListParams: ['202608', '202606']
      }));
      const params = cache.getAvailableListParams();
      expect(params).toEqual(['202608', '202606']);
      params.push('mutated');
      expect(cache.getAvailableListParams()).toEqual(['202608', '202606']);

      setInternalCache(cache, cacheData([], {
        lists: {
          '202606': entry('202606', '2026-06-01'),
          '202608': entry('202608', '2026-08-01')
        },
        availableListParams: []
      }));
      expect(cache.getAvailableListParams()).toEqual(['202606', '202608']);
    });
  });

  describe('ensureCurrentList', () => {
    it('現在有効リストがあればforceUpdateせず返す [covers:ensure_current.existing_returns_without_update]', async () => {
      const current = entry('202606', '2026-06-01', { c1: 50 });
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([current]));
      const forceSpy = vi.spyOn(cache, 'forceUpdate');

      await expect(cache.ensureCurrentList()).resolves.toBe(current);
      expect(forceSpy).not.toHaveBeenCalled();
    });

    it('forceUpdate失敗時はnullを返す [covers:ensure_current.force_update_error_returns_null]', async () => {
      const cache = new GenesysPointCache();
      vi.spyOn(cache, 'forceUpdate').mockRejectedValue(new Error('network'));

      await expect(cache.ensureCurrentList()).resolves.toBeNull();
    });

    it('forceUpdate成功後に再選択したリストを返す [covers:ensure_current.force_update_success_reselects]', async () => {
      const cache = new GenesysPointCache();
      const updated = entry('202606', '2026-06-01', { c1: 50 });
      vi.spyOn(cache, 'forceUpdate').mockImplementation(async () => {
        setInternalCache(cache, cacheData([updated]));
      });

      await expect(cache.ensureCurrentList()).resolves.toBe(updated);
    });
  });

  describe('ensureList', () => {
    it('既存entryがあればfetchせず返す [covers:ensure_list.existing_returns_without_fetch]', async () => {
      const existing = entry('202608', '2026-08-01', { c1: 100 });
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([existing], { availableListParams: ['202608'] }));
      const forceSpy = vi.spyOn(cache, 'forceUpdate');

      await expect(cache.ensureList('202608')).resolves.toBe(existing);
      expect(forceSpy).not.toHaveBeenCalled();
      expect(apiMocks.fetchGenesysPointList).not.toHaveBeenCalled();
      expect(storageMocks.safeStorageSet).not.toHaveBeenCalled();
    });

    it('availableが空でforceUpdateが失敗するとnullを返す [covers:ensure_list.no_available_force_update_error_returns_null]', async () => {
      const cache = new GenesysPointCache();
      vi.spyOn(cache, 'forceUpdate').mockRejectedValue(new Error('index failed'));

      await expect(cache.ensureList('202608')).resolves.toBeNull();
    });

    it('availableに無いlistParamはnullを返しfetchしない [covers:ensure_list.not_in_available_returns_null]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([], { lists: {}, availableListParams: ['202608'] }));

      await expect(cache.ensureList('202606')).resolves.toBeNull();
      expect(apiMocks.fetchGenesysPointList).not.toHaveBeenCalled();
    });

    it('available確認後にcomplete entryがあれば追加fetchせず返す [covers:ensure_list.after_force_complete_returns]', async () => {
      const afterForce = entry('202608', '2026-08-01', { c1: 100 }, { incomplete: false });
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([afterForce], { availableListParams: [] }));

      await expect(cache.ensureList('202608')).resolves.toBe(afterForce);
      expect(apiMocks.fetchGenesysPointList).not.toHaveBeenCalled();
    });

    it('未取得またはincompleteなら取得・解決して保存する [covers:ensure_list.fetch_success_creates_or_updates_cache] [covers:ensure_list.unresolved_marks_incomplete]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([], { lists: {}, availableListParams: ['202608'] }));
      apiMocks.fetchGenesysPointList.mockResolvedValue({ entries: [{ name: '未解決', point: 10, cardKindClass: 'effect' }] });
      resolverMocks.resolveGenesysEntries.mockReturnValue({ points: { c9: 99 }, unresolved: ['未解決'] });

      const result = await cache.ensureList('202608');

      expect(dbMocks.db.initialize).toHaveBeenCalledTimes(1);
      expect(apiMocks.fetchGenesysPointList).toHaveBeenCalledWith('202608');
      expect(result).toMatchObject({
        listParam: '202608',
        effectiveDate: '2026-08-01',
        points: { c9: 99 },
        incomplete: true
      });
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: getInternalCache(cache)
      });
    });

    it('取得または保存で例外が出てもnullを返す [covers:ensure_list.fetch_or_persist_error_returns_null]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([], { lists: {}, availableListParams: ['202608'] }));
      apiMocks.fetchGenesysPointList.mockRejectedValue(new Error('network'));

      await expect(cache.ensureList('202608')).resolves.toBeNull();
    });
  });

  describe('needsUpdate and checkAndUpdate', () => {
    it('cache無しまたはDISCOVERY_TTL超過だけを更新必要と判定する [covers:needs_update.no_cache_true] [covers:needs_update.discovery_ttl_comparison]', () => {
      const cache = new GenesysPointCache();
      expect((cache as any).needsUpdate()).toBe(true);

      setInternalCache(cache, cacheData([], { discoveredAt: Date.now() - 7 * DAY }));
      expect((cache as any).needsUpdate()).toBe(true);

      setInternalCache(cache, cacheData([], { discoveredAt: Date.now() - 6 * DAY }));
      expect((cache as any).needsUpdate()).toBe(false);
    });

    it('更新中のcheckAndUpdateはforceUpdateを多重起動しない [covers:check_update.in_flight_returns_same_promise]', async () => {
      const cache = new GenesysPointCache();
      const pending = deferred();
      const forceSpy = vi.spyOn(cache, 'forceUpdate').mockReturnValue(pending.promise);

      const first = cache.checkAndUpdate();
      const second = cache.checkAndUpdate();

      expect(forceSpy).toHaveBeenCalledTimes(1);
      pending.resolve();
      await expect(first).resolves.toBeUndefined();
      await expect(second).resolves.toBeUndefined();
    });

    it('更新不要ならforceUpdateせずundefinedを返す [covers:check_update.no_update_needed_returns_undefined]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([], { discoveredAt: Date.now() }));
      const forceSpy = vi.spyOn(cache, 'forceUpdate');

      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      expect(forceSpy).not.toHaveBeenCalled();
    });

    it('forceUpdateの失敗は握りつぶし、完了後に再実行できる [covers:check_update.force_update_errors_are_swallowed_and_promise_cleared]', async () => {
      const cache = new GenesysPointCache();
      const forceSpy = vi.spyOn(cache, 'forceUpdate')
        .mockRejectedValueOnce(new Error('update failed'))
        .mockResolvedValueOnce(undefined);

      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      await expect(cache.checkAndUpdate()).resolves.toBeUndefined();
      expect(forceSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('forceUpdate and clear', () => {
    it('indexを取得し、complete既存entryをスキップし、未取得/incompleteを保存する [covers:force_update.fetches_index_initializes_db_and_persists] [covers:force_update.latest_ref_sets_latest_list_param] [covers:force_update.complete_existing_entry_skipped] [covers:force_update.incomplete_or_missing_entry_fetched] [covers:force_update.unresolved_marks_incomplete]', async () => {
      const complete = entry('202606', '2026-06-01', { old: 1 });
      const incomplete = entry('202604', '2026-04-01', { stale: 1 }, { incomplete: true });
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([complete, incomplete], {
        latestListParam: '202606',
        availableListParams: ['202606', '202604']
      }));
      apiMocks.fetchGenesysIndex.mockResolvedValue([
        { listParam: '202608', effectiveDate: '2026-08-01', isLatest: true },
        { listParam: '202606', effectiveDate: '2026-06-01', isLatest: false },
        { listParam: '202604', effectiveDate: '2026-04-01', isLatest: false }
      ]);
      apiMocks.fetchGenesysPointList
        .mockResolvedValueOnce({ entries: [{ name: '新規', point: 10, cardKindClass: 'effect' }] })
        .mockResolvedValueOnce({ entries: [{ name: '未解決', point: 20, cardKindClass: 'effect' }] });
      resolverMocks.resolveGenesysEntries
        .mockReturnValueOnce({ points: { c8: 80 }, unresolved: [] })
        .mockReturnValueOnce({ points: { c4: 40 }, unresolved: ['未解決'] });

      await cache.forceUpdate();

      expect(dbMocks.db.initialize).toHaveBeenCalledTimes(1);
      expect(apiMocks.fetchGenesysPointList).toHaveBeenCalledTimes(2);
      expect(apiMocks.fetchGenesysPointList).toHaveBeenNthCalledWith(1, '202608');
      expect(apiMocks.fetchGenesysPointList).toHaveBeenNthCalledWith(2, '202604');
      expect(getInternalCache(cache)).toMatchObject({
        latestListParam: '202608',
        availableListParams: ['202608', '202606', '202604'],
        lists: {
          '202606': { points: { old: 1 } },
          '202608': { points: { c8: 80 }, incomplete: false },
          '202604': { points: { c4: 40 }, incomplete: true }
        }
      });
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: getInternalCache(cache)
      });
    });

    it('latest refが無ければ既存latestListParamを保持し、個別fetch失敗後も次のrefを処理する [covers:force_update.no_latest_ref_preserves_previous_or_null] [covers:force_update.fetch_list_error_continues]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData([], { lists: {}, latestListParam: '202606', availableListParams: [] }));
      apiMocks.fetchGenesysIndex.mockResolvedValue([
        { listParam: '202608', effectiveDate: '2026-08-01', isLatest: false },
        { listParam: '202606', effectiveDate: '2026-06-01', isLatest: false }
      ]);
      apiMocks.fetchGenesysPointList
        .mockRejectedValueOnce(new Error('one failed'))
        .mockResolvedValueOnce({ entries: [{ name: '成功', point: 10, cardKindClass: 'effect' }] });
      resolverMocks.resolveGenesysEntries.mockReturnValue({ points: { c6: 60 }, unresolved: [] });

      await cache.forceUpdate();

      expect(getInternalCache(cache)).toMatchObject({
        latestListParam: '202606',
        availableListParams: ['202608', '202606'],
        lists: {
          '202606': { points: { c6: 60 } }
        }
      });
      expect(getInternalCache(cache)?.lists['202608']).toBeUndefined();

      const emptyCache = new GenesysPointCache();
      apiMocks.fetchGenesysIndex.mockResolvedValue([]);
      await emptyCache.forceUpdate();
      expect(getInternalCache(emptyCache)?.latestListParam).toBeNull();
    });

    it('clearは内部cacheとstorageをnullにする [covers:clear.clears_cache_and_storage]', async () => {
      const cache = new GenesysPointCache();
      setInternalCache(cache, cacheData());

      await cache.clear();

      expect(cache.getAvailableListParams()).toEqual([]);
      expect(storageMocks.safeStorageSet).toHaveBeenCalledWith({ [STORAGE_KEY]: null });
    });
  });
});
