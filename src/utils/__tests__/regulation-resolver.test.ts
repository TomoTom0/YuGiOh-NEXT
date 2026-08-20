import { describe, it, expect } from 'vitest';
import { resolveDeckRegulation, type AvailableRegulations } from '../regulation-resolver';

function available(overrides: Partial<AvailableRegulations> = {}): AvailableRegulations {
  return {
    ocgDates: [],
    genesysListParams: [],
    ...overrides
  };
}

describe('resolveDeckRegulation', () => {
  describe('タグ無し', () => {
    it('デッキ名にタグが無い場合は mode=none を返す', () => {
      const result = resolveDeckRegulation('ただのデッキ名', available());
      expect(result.mode).toBe('none');
      expect(result.tag).toBeNull();
    });
  });

  describe('OCG タグ', () => {
    it('YYMM省略（最新版指定）は effectiveDate=null で返す', () => {
      const result = resolveDeckRegulation('[OCG] マイデッキ', available());
      expect(result.mode).toBe('ocg');
      expect(result.effectiveDate).toBeNull();
      expect(result.listParam).toBeNull();
      expect(result.fallback).toBeUndefined();
    });

    it('YYMM指定で実在一覧に該当あり → exact match', () => {
      const result = resolveDeckRegulation(
        '[OCG-2501] マイデッキ',
        available({ ocgDates: ['2024-10-01', '2025-01-01', '2025-04-01'] })
      );
      expect(result.mode).toBe('ocg');
      expect(result.effectiveDate).toBe('2025-01-01');
      expect(result.fallback).toBeUndefined();
    });

    it('YYMM指定で実在一覧に該当なし → 直近過去版にフォールバック', () => {
      const result = resolveDeckRegulation(
        '[OCG-2502] マイデッキ',
        available({ ocgDates: ['2024-10-01', '2025-01-01'] })
      );
      expect(result.mode).toBe('ocg');
      // 2502 → 2025-02-01。直近過去は 2025-01-01
      expect(result.effectiveDate).toBe('2025-01-01');
      expect(result.fallback).toEqual({
        requestedYymm: '2502',
        reason: 'not-exist',
        appliedIdentifier: '2025-01-01',
        appliedYymm: '2501'
      });
    });

    it('YYMM指定が最古より前 → 最古版にフォールバック', () => {
      const result = resolveDeckRegulation(
        '[OCG-2001] マイデッキ',
        available({ ocgDates: ['2024-10-01', '2025-01-01'] })
      );
      expect(result.mode).toBe('ocg');
      // 2001 = 2020-01-01。全実在より前なので最古の 2024-10-01 にフォールバック
      expect(result.effectiveDate).toBe('2024-10-01');
      expect(result.fallback?.reason).toBe('not-exist');
    });

    it('実在一覧が空の場合は YYMMから計算した effectiveDate を返し ensureList に取得を試行させる', () => {
      const result = resolveDeckRegulation(
        '[OCG-2501] マイデッキ',
        available({ ocgDates: [] })
      );
      expect(result.mode).toBe('ocg');
      // 実在一覧が空でも YYMM=2501 → effectiveDate=2025-01-01 を返す
      expect(result.effectiveDate).toBe('2025-01-01');
      expect(result.fallback).toBeUndefined();
    });
  });

  describe('GENESYS タグ', () => {
    it('YYMM省略（最新版指定）は listParam=null で返す', () => {
      const result = resolveDeckRegulation('[GENESYS] マイデッキ', available());
      expect(result.mode).toBe('genesys');
      expect(result.effectiveDate).toBeNull();
      expect(result.listParam).toBeNull();
      expect(result.fallback).toBeUndefined();
    });

    it('GENE 省略形も GENESYS として解決する', () => {
      const result = resolveDeckRegulation('[GENE] マイデッキ', available());
      expect(result.mode).toBe('genesys');
    });

    it('YYMM指定で実在一覧に該当あり → exact match', () => {
      const result = resolveDeckRegulation(
        '[GENESYS-2608] マイデッキ',
        available({ genesysListParams: ['202606', '202608'] })
      );
      expect(result.mode).toBe('genesys');
      expect(result.listParam).toBe('202608');
      expect(result.fallback).toBeUndefined();
    });

    it('YYMM指定で実在一覧に該当なし → 直近過去版にフォールバック', () => {
      const result = resolveDeckRegulation(
        '[GENESYS-2608] マイデッキ',
        available({ genesysListParams: ['202606'] })
      );
      expect(result.mode).toBe('genesys');
      // 2608 → 202608。直近過去は 202606
      expect(result.listParam).toBe('202606');
      expect(result.fallback).toEqual({
        requestedYymm: '2608',
        reason: 'not-exist',
        appliedIdentifier: '202606',
        appliedYymm: '2606'
      });
    });

    it('実在一覧が空の場合は YYMMから計算した listParam を返し ensureList に取得を試行させる', () => {
      const result = resolveDeckRegulation(
        '[GENESYS-2608] マイデッキ',
        available({ genesysListParams: [] })
      );
      expect(result.mode).toBe('genesys');
      // 実在一覧が空でも YYMM=2608 → listParam=202608 を返す
      expect(result.listParam).toBe('202608');
      expect(result.fallback).toBeUndefined();
    });
  });

  describe('GENE 省略形 + YYMM', () => {
    it('[GENE-2608] を GENESYS-2608 として解決する', () => {
      const result = resolveDeckRegulation(
        '[GENE-2608] マイデッキ',
        available({ genesysListParams: ['202608'] })
      );
      expect(result.mode).toBe('genesys');
      expect(result.listParam).toBe('202608');
      expect(result.tag?.type).toBe('genesys');
      expect(result.tag?.yymm).toBe('2608');
    });
  });
});
