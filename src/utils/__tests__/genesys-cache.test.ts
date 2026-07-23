/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchGenesysIndexMock = vi.fn();
const fetchGenesysPointListMock = vi.fn();

vi.mock('../../api/genesys', () => ({
  fetchGenesysIndex: (...args: unknown[]) => fetchGenesysIndexMock(...args),
  fetchGenesysPointList: (...args: unknown[]) => fetchGenesysPointListMock(...args),
  listParamToEffectiveDate: (listParam: string) =>
    `${listParam.slice(0, 4)}-${listParam.slice(4, 6)}-01`,
}));

vi.mock('../genesys-name-resolver', () => ({
  resolveGenesysEntries: (entries: Array<{ cardName: string; point: number }>) => {
    const points: Record<string, number> = {};
    entries.forEach((e, i) => {
      points[`cid-${i}`] = e.point;
    });
    return { points, unresolved: [] };
  },
}));

vi.mock('../extension-context-checker', () => ({
  safeStorageGet: vi.fn(async () => ({})),
  safeStorageSet: vi.fn(async () => undefined),
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
});
