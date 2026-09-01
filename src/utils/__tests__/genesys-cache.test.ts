/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchGenesysIndexMock = vi.fn();
const fetchGenesysPointListMock = vi.fn();
const resolveGenesysEntriesMock = vi.fn((entries: Array<{ cardName: string; point: number }>) => {
  const points: Record<string, number> = {};
  entries.forEach((e, i) => {
    points[`cid-${i}`] = e.point;
  });
  return { points, unresolved: [] as string[] };
});
const unifiedCacheDbInitializeMock = vi.fn(async () => undefined);

vi.mock('../../api/genesys', () => ({
  fetchGenesysIndex: (...args: unknown[]) => fetchGenesysIndexMock(...args),
  fetchGenesysPointList: (...args: unknown[]) => fetchGenesysPointListMock(...args),
  listParamToEffectiveDate: (listParam: string) =>
    `${listParam.slice(0, 4)}-${listParam.slice(4, 6)}-01`,
}));

vi.mock('../genesys-name-resolver', () => ({
  resolveGenesysEntries: (entries: Array<{ cardName: string; point: number }>) =>
    resolveGenesysEntriesMock(entries),
}));

vi.mock('../extension-context-checker', () => ({
  safeStorageGet: vi.fn(async () => ({})),
  safeStorageSet: vi.fn(async () => undefined),
}));

vi.mock('../unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({
    initialize: unifiedCacheDbInitializeMock,
  }),
}));

import { GenesysPointCache } from '../genesys-cache';

describe('GenesysPointCache - ensureCurrentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // init() 内のバックグラウンド checkAndUpdate() は本テストの対象外。
    // 実行タイミングが不定でensureCurrentList()呼び出しと競合するため無効化する。
    vi.spyOn(GenesysPointCache.prototype, 'checkAndUpdate').mockResolvedValue(undefined);
  });

  it('起動直後（キャッシュ未取得）でも現在有効なリストを取得できる', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yyyymm = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}`;

    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: yyyymm, effectiveDate: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`, isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 3 }],
    });

    const cache = new GenesysPointCache();
    await cache.init();

    // 未取得状態では現在有効なリストが解決できない
    expect(cache.getCurrentListParam()).toBeUndefined();

    const entry = await cache.ensureCurrentList();

    expect(entry).not.toBeNull();
    expect(entry?.listParam).toBe(yyyymm);
    expect(cache.getCurrentListParam()).toBe(yyyymm);
    expect(cache.getPoint('cid-0')).toBe(3);
  });

  it('既にキャッシュ済みなら再取得せずそのまま返す', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yyyymm = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}`;

    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: yyyymm, effectiveDate: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`, isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 5 }],
    });

    const cache = new GenesysPointCache();
    await cache.init();
    await cache.ensureCurrentList();
    expect(fetchGenesysIndexMock).toHaveBeenCalledTimes(1);

    fetchGenesysIndexMock.mockClear();
    const entry = await cache.ensureCurrentList();

    expect(entry?.listParam).toBe(yyyymm);
    expect(fetchGenesysIndexMock).not.toHaveBeenCalled();
  });

  it('インデックス取得に失敗した場合はnullを返す', async () => {
    fetchGenesysIndexMock.mockRejectedValue(new Error('network error'));

    const cache = new GenesysPointCache();
    await cache.init();

    const entry = await cache.ensureCurrentList();

    expect(entry).toBeNull();
  });

  it('未解決カードが残っている場合、再試行間隔(TTL)を過ぎてから再取得する', async () => {
    // 本番再現: 初回fetch時にカードDB未初期化で名前解決が全滅した状態
    // (genesys-cache.ts: ensureList()と同様、ensureCurrentList()もincomplete時は
    //  再取得すべきだが、既存判定が「存在すれば返す」だけになっているとここが失敗する)
    vi.useFakeTimers();
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yyyymm = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}`;

      fetchGenesysIndexMock.mockResolvedValue([
        { listParam: yyyymm, effectiveDate: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`, isLatest: true },
      ]);
      fetchGenesysPointListMock.mockResolvedValue({
        entries: [{ cardName: 'テストカード', point: 3 }],
      });
      resolveGenesysEntriesMock.mockReturnValue({ points: {}, unresolved: ['テストカード'] });

      const cache = new GenesysPointCache();
      await cache.init();
      await cache.ensureCurrentList();
      expect(cache.getPoint('cid-0')).toBeUndefined();

      // TTL内の再呼び出しは外部サーバーへの負荷軽減のため再取得しない
      fetchGenesysPointListMock.mockClear();
      await cache.ensureCurrentList();
      expect(fetchGenesysPointListMock).not.toHaveBeenCalled();

      // TTL経過後、カードDBが揃って解決できるようになった状態を想定
      vi.advanceTimersByTime(11 * 60 * 1000);
      resolveGenesysEntriesMock.mockReturnValue({ points: { 'cid-0': 3 }, unresolved: [] });
      const entry = await cache.ensureCurrentList();

      expect(entry?.incomplete).toBe(false);
      expect(cache.getPoint('cid-0')).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('GenesysPointCache - ensureList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(GenesysPointCache.prototype, 'checkAndUpdate').mockResolvedValue(undefined);
  });

  it('未解決カードが残ったリストは再試行間隔(TTL)を過ぎてから再取得される', async () => {
    // 本番再現: カードDB未初期化のタイミングで初回fetchが全カード未解決のまま
    // キャッシュされ、以後ensureList()が「存在するから」とその壊れたキャッシュを
    // 返し続けてしまう問題(TASK-302)の回帰テスト
    vi.useFakeTimers();
    try {
      fetchGenesysIndexMock.mockResolvedValue([
        { listParam: '202607', effectiveDate: '2026-07-01', isLatest: true },
      ]);
      fetchGenesysPointListMock.mockResolvedValue({
        entries: [{ cardName: 'テストカード', point: 3 }],
      });
      // カードDB未初期化を想定し、名前解決が常に失敗する状態から開始
      resolveGenesysEntriesMock.mockReturnValue({ points: {}, unresolved: ['テストカード'] });

      const cache = new GenesysPointCache();
      await cache.init();
      const first = await cache.ensureList('202607');
      expect(first?.incomplete).toBe(true);
      expect(cache.getPoint('cid-0', '202607')).toBeUndefined();

      // TTL内の再呼び出しは外部サーバーへの負荷軽減のため再取得しない
      fetchGenesysPointListMock.mockClear();
      await cache.ensureList('202607');
      expect(fetchGenesysPointListMock).not.toHaveBeenCalled();

      // TTL経過後、カードDBが揃って解決できるようになった状態を想定
      vi.advanceTimersByTime(11 * 60 * 1000);
      resolveGenesysEntriesMock.mockReturnValue({ points: { 'cid-0': 3 }, unresolved: [] });
      const second = await cache.ensureList('202607');

      expect(second?.incomplete).toBe(false);
      expect(cache.getPoint('cid-0', '202607')).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('完全解決済みのリストは再取得しない', async () => {
    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: '202607', effectiveDate: '2026-07-01', isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 3 }],
    });

    const cache = new GenesysPointCache();
    await cache.init();
    await cache.ensureList('202607');
    expect(fetchGenesysPointListMock).toHaveBeenCalledTimes(1);

    fetchGenesysPointListMock.mockClear();
    const entry = await cache.ensureList('202607');

    expect(fetchGenesysPointListMock).not.toHaveBeenCalled();
    expect(entry?.listParam).toBe('202607');
  });
});

describe('GenesysPointCache - forceUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(GenesysPointCache.prototype, 'checkAndUpdate').mockResolvedValue(undefined);
    resolveGenesysEntriesMock.mockImplementation((entries: Array<{ cardName: string; point: number }>) => {
      const points: Record<string, number> = {};
      entries.forEach((e, i) => {
        points[`cid-${i}`] = e.point;
      });
      return { points, unresolved: [] };
    });
  });

  it('カードDB初期化を名前解決前に待機する', async () => {
    const initOrder: string[] = [];
    unifiedCacheDbInitializeMock.mockImplementation(async () => {
      initOrder.push('db-init');
    });
    resolveGenesysEntriesMock.mockImplementation((entries) => {
      initOrder.push('resolve');
      const points: Record<string, number> = {};
      entries.forEach((e, i) => {
        points[`cid-${i}`] = e.point;
      });
      return { points, unresolved: [] };
    });

    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: '202607', effectiveDate: '2026-07-01', isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 3 }],
    });

    const cache = new GenesysPointCache();
    await cache.forceUpdate();

    expect(initOrder).toEqual(['db-init', 'resolve']);
  });

  it('未解決カードが残ったリストは次回forceUpdateで再解決される', async () => {
    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: '202607', effectiveDate: '2026-07-01', isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 3 }],
    });
    // 1回目: カードDB未初期化を想定し未解決のまま
    resolveGenesysEntriesMock.mockReturnValueOnce({ points: {}, unresolved: ['テストカード'] });

    const cache = new GenesysPointCache();
    await cache.forceUpdate();

    expect(cache.getPoint('cid-0', '202607')).toBeUndefined();
    expect(fetchGenesysPointListMock).toHaveBeenCalledTimes(1);

    // 2回目: カードDBが揃って解決できるようになったと想定
    await cache.forceUpdate();

    expect(fetchGenesysPointListMock).toHaveBeenCalledTimes(2);
    expect(cache.getPoint('cid-0', '202607')).toBe(3);
  });

  it('完全解決済みのリストは再取得しない', async () => {
    fetchGenesysIndexMock.mockResolvedValue([
      { listParam: '202607', effectiveDate: '2026-07-01', isLatest: true },
    ]);
    fetchGenesysPointListMock.mockResolvedValue({
      entries: [{ cardName: 'テストカード', point: 3 }],
    });

    const cache = new GenesysPointCache();
    await cache.forceUpdate();
    expect(fetchGenesysPointListMock).toHaveBeenCalledTimes(1);

    await cache.forceUpdate();
    expect(fetchGenesysPointListMock).toHaveBeenCalledTimes(1);
  });
});
