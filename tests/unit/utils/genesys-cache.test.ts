/**
 * GENESYSポイントキャッシュの選択ロジックのテスト
 *
 * selectApplicableGenesysList: 現在有効なリスト（適用日 <= 今日 で最新）を選択する。
 * ネットワーク不要の純粋関数のため、fetch/storage を mock せずにテスト可能。
 */

import { describe, it, expect } from 'vitest';
import { selectApplicableGenesysList } from '@/utils/genesys-cache';
import type { GenesysPointCacheData, GenesysListEntry } from '@/types/card';

/** listParam と points からリストエントリを生成 */
function entry(listParam: string, effectiveDate: string, points: Record<string, number> = {}): GenesysListEntry {
  return { listParam, effectiveDate, points, fetchedAt: 0 };
}

/** キャッシュデータを生成 */
function cache(lists: GenesysListEntry[], latestListParam: string | null): GenesysPointCacheData {
  const map: Record<string, GenesysListEntry> = {};
  for (const e of lists) {
    map[e.listParam] = e;
  }
  return { lists: map, latestListParam, discoveredAt: 0 };
}

/** YYYY-MM-DD → timestamp（ローカル時刻の正午） */
function ts(ymd: string): number {
  return new Date(`${ymd}T12:00:00`).getTime();
}

describe('selectApplicableGenesysList', () => {
  it('キャッシュがnullの場合はnull', () => {
    expect(selectApplicableGenesysList(null, ts('2026-07-11'))).toBeNull();
  });

  it('リストが空の場合はnull', () => {
    expect(selectApplicableGenesysList(cache([], null), ts('2026-07-11'))).toBeNull();
  });

  it('適用日が今日以前のリストのうち最新を選ぶ（7/11時点では6月が有効、8月は未来）', () => {
    // 実データ状況: 202608(8/1)=未来の最新版, 202606(6/1)=現在有効
    const c = cache(
      [entry('202608', '2026-08-01', { c1: 100 }), entry('202606', '2026-06-01', { c1: 50 })],
      '202608'
    );
    const selected = selectApplicableGenesysList(c, ts('2026-07-11'));
    expect(selected?.listParam).toBe('202606');
    expect(selected?.points.c1).toBe(50);
  });

  it('適用日を過ぎたら最新リストに切り替わる（8/2以降は8月が有効）', () => {
    const c = cache(
      [entry('202608', '2026-08-01', { c1: 100 }), entry('202606', '2026-06-01', { c1: 50 })],
      '202608'
    );
    expect(selectApplicableGenesysList(c, ts('2026-08-02'))?.listParam).toBe('202608');
    expect(selectApplicableGenesysList(c, ts('2026-08-01'))?.listParam).toBe('202608'); // 適用当日
  });

  it('すべて未来適用の場合は最新版を選ぶ', () => {
    const c = cache(
      [entry('202610', '2026-10-01', { c1: 30 }), entry('202608', '2026-08-01', { c1: 20 })],
      '202610'
    );
    // 7月時点では両方未来 -> 最新版(202610)
    expect(selectApplicableGenesysList(c, ts('2026-07-11'))?.listParam).toBe('202610');
  });

  it('すべて未来適用で最新版フラグがない場合は適用日が最新のものを選ぶ', () => {
    const c = cache(
      [entry('202610', '2026-10-01', { c1: 30 }), entry('202608', '2026-08-01', { c1: 20 })],
      null
    );
    expect(selectApplicableGenesysList(c, ts('2026-07-11'))?.listParam).toBe('202610');
  });

  it('複数の過去リストがある場合は最も新しいものを選ぶ', () => {
    const c = cache(
      [
        entry('202606', '2026-06-01', { c1: 1 }),
        entry('202604', '2026-04-01', { c1: 2 }),
        entry('202608', '2026-08-01', { c1: 3 }), // 未来
      ],
      '202608'
    );
    expect(selectApplicableGenesysList(c, ts('2026-07-11'))?.listParam).toBe('202606');
  });
});
