import { describe, it, expect } from 'vitest';
import { resolveDeckRegulation, buildRegulationTagOptions, groupRegulationTagOptionsByYearPair } from '@/utils/regulation-resolver';

const OCG_DATES = [
  '2018-01-01', '2018-04-01', '2018-07-01', '2018-10-01',
  '2024-01-01', '2024-04-01', '2024-07-01', '2024-10-01',
  '2025-01-01', '2025-04-01', '2025-07-01', '2025-10-01',
  '2026-01-01', '2026-04-01', '2026-07-01'
];

const GENESYS_PARAMS = ['202606', '202608'];

const available = { ocgDates: OCG_DATES, genesysListParams: GENESYS_PARAMS };

describe('resolveDeckRegulation', () => {
  describe('タグ無し', () => {
    it('タグ無しは mode=none（OCG最新、特段の処理不要）', () => {
      const r = resolveDeckRegulation('青眼の白龍デッキ', available);
      expect(r.mode).toBe('none');
      expect(r.tag).toBeNull();
      expect(r.fallback).toBeUndefined();
    });
  });

  describe('YYMM省略（最新版）', () => {
    it('[GENESYS] は listParam=null（最新版）', () => {
      const r = resolveDeckRegulation('[GENESYS] デッキ', available);
      expect(r.mode).toBe('genesys');
      expect(r.listParam).toBeNull();
      expect(r.fallback).toBeUndefined();
    });

    it('[OCG] は effectiveDate=null（最新版）', () => {
      const r = resolveDeckRegulation('[OCG] デッキ', available);
      expect(r.mode).toBe('ocg');
      expect(r.effectiveDate).toBeNull();
      expect(r.fallback).toBeUndefined();
    });
  });

  describe('YYMMあり・実在版', () => {
    it('[GENESYS-2608] は listParam=202608、fallback無し', () => {
      const r = resolveDeckRegulation('[GENESYS-2608] デッキ', available);
      expect(r.mode).toBe('genesys');
      expect(r.listParam).toBe('202608');
      expect(r.fallback).toBeUndefined();
    });

    it('[OCG-2501] は effectiveDate=2025-01-01、fallback無し', () => {
      const r = resolveDeckRegulation('[OCG-2501] デッキ', available);
      expect(r.mode).toBe('ocg');
      expect(r.effectiveDate).toBe('2025-01-01');
      expect(r.fallback).toBeUndefined();
    });
  });

  describe('YYMMあり・該当版なし（直近版フォールバック）', () => {
    it('[GENESYS-2607]（6月→8月の飛び月）は直近 202606 を適用 + fallback', () => {
      const r = resolveDeckRegulation('[GENESYS-2607] デッキ', available);
      expect(r.mode).toBe('genesys');
      expect(r.listParam).toBe('202606');
      expect(r.fallback).toBeDefined();
      expect(r.fallback?.requestedYymm).toBe('2607');
      expect(r.fallback?.appliedYymm).toBe('2606');
      expect(r.fallback?.appliedIdentifier).toBe('202606');
      expect(r.fallback?.reason).toBe('not-exist');
    });

    it('[OCG-2503]（四半期外）は直近 2025-01-01 を適用 + fallback', () => {
      const r = resolveDeckRegulation('[OCG-2503] デッキ', available);
      expect(r.mode).toBe('ocg');
      expect(r.effectiveDate).toBe('2025-01-01');
      expect(r.fallback).toBeDefined();
      expect(r.fallback?.requestedYymm).toBe('2503');
      expect(r.fallback?.appliedYymm).toBe('2501');
      expect(r.fallback?.appliedIdentifier).toBe('2025-01-01');
    });

    it('指定月が最古より前の場合は最古版を適用 + fallback', () => {
      const r = resolveDeckRegulation('[OCG-1712] デッキ', available);
      expect(r.mode).toBe('ocg');
      expect(r.effectiveDate).toBe('2018-01-01');
      expect(r.fallback).toBeDefined();
      expect(r.fallback?.requestedYymm).toBe('1712');
      expect(r.fallback?.appliedYymm).toBe('1801');
    });
  });

  describe('実在一覧が空（取得失敗等）', () => {
    it('OCG実在一覧が空ならYYMMから計算したeffectiveDateを返しensureListに取得を試行させる', () => {
      const r = resolveDeckRegulation('[OCG-2501] デッキ', { ocgDates: [], genesysListParams: [] });
      expect(r.mode).toBe('ocg');
      // 実在一覧が空でも YYMM=2501 → effectiveDate=2025-01-01 を返す
      expect(r.effectiveDate).toBe('2025-01-01');
      expect(r.fallback).toBeUndefined();
    });
  });
});

describe('buildRegulationTagOptions', () => {
  // [covers:build_regulation_tag_options.genesys_disabled_excludes_genesys]
  it('isGenesysEnabled=falseの場合、GENESYS関連オプションを一切含まない', () => {
    const options = buildRegulationTagOptions(available, false);
    expect(options.every(o => o.type === 'ocg')).toBe(true);
  });

  // [covers:build_regulation_tag_options.order_and_labels]
  it('OCG最新版→GENESYS最新版→OCG過去版(新しい順)→GENESYS過去版(新しい順)の順で構築する', () => {
    const options = buildRegulationTagOptions(available, true);
    expect(options[0]).toEqual({ type: 'ocg', yymm: null, label: 'OCG' });
    expect(options[1]).toEqual({ type: 'genesys', yymm: null, label: 'GENESYS' });

    const ocgPast = options.filter(o => o.type === 'ocg' && o.yymm !== null);
    expect(ocgPast[0]).toEqual({ type: 'ocg', yymm: '2607', label: 'OCG-2607' });
    expect(ocgPast[ocgPast.length - 1]).toEqual({ type: 'ocg', yymm: '1801', label: 'OCG-1801' });

    const genesysPast = options.filter(o => o.type === 'genesys' && o.yymm !== null);
    expect(genesysPast).toEqual([
      { type: 'genesys', yymm: '2608', label: 'GENESYS-2608' },
      { type: 'genesys', yymm: '2606', label: 'GENESYS-2606' }
    ]);
  });

  // [covers:build_regulation_tag_options.empty_available_returns_latest_only]
  it('実在一覧が空の場合、最新版オプションのみ返す', () => {
    const options = buildRegulationTagOptions({ ocgDates: [], genesysListParams: [] }, true);
    expect(options).toEqual([
      { type: 'ocg', yymm: null, label: 'OCG' },
      { type: 'genesys', yymm: null, label: 'GENESYS' }
    ]);
  });
});

describe('groupRegulationTagOptionsByYearPair', () => {
  // [covers:group_by_year_pair.excludes_latest]
  it('yymm=null（最新版）は無視する', () => {
    const groups = groupRegulationTagOptionsByYearPair([{ type: 'ocg', yymm: null, label: 'OCG' }]);
    expect(groups).toEqual([]);
  });

  // [covers:group_by_year_pair.even_year_start_pairing]
  it('偶数年始まりの2年単位でグルーピングする（例: 2024/2025が同じグループ）', () => {
    const options = buildRegulationTagOptions(available, false).filter(o => o.yymm !== null);
    const groups = groupRegulationTagOptionsByYearPair(options);

    expect(groups.map(g => g.rangeLabel)).toEqual(['26-27', '24-25', '18-19']);
    expect(groups[0]?.options.map(o => o.yymm)).toEqual(['2607', '2604', '2601']);
    expect(groups[1]?.options.map(o => o.yymm)).toEqual(['2510', '2507', '2504', '2501', '2410', '2407', '2404', '2401']);
    expect(groups[2]?.options.map(o => o.yymm)).toEqual(['1810', '1807', '1804', '1801']);
  });

  // [covers:group_by_year_pair.groups_and_items_sorted_desc]
  it('入力（新しい順）の並びをグループ内でも保持する（呼び出し側が既に新しい順で渡す前提）', () => {
    const options = [
      { type: 'ocg' as const, yymm: '2307', label: 'OCG 23/07' },
      { type: 'ocg' as const, yymm: '2301', label: 'OCG 23/01' },
      { type: 'ocg' as const, yymm: '2201', label: 'OCG 22/01' }
    ];
    const groups = groupRegulationTagOptionsByYearPair(options);
    expect(groups.map(g => g.rangeLabel)).toEqual(['22-23']);
    expect(groups[0]?.options.map(o => o.yymm)).toEqual(['2307', '2301', '2201']);
  });
});
