import { describe, it, expect } from 'vitest';
import { resolveDeckRegulation } from '@/utils/regulation-resolver';

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
