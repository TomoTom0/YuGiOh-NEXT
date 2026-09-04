import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedRegulation } from '@/types/regulation';

vi.mock('@/utils/forbidden-limited-cache', () => ({
  forbiddenLimitedCache: {
    hasList: vi.fn(),
    getRegulation: vi.fn()
  }
}));

vi.mock('@/utils/genesys-cache', () => ({
  genesysPointCache: {
    getPoint: vi.fn()
  }
}));

import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache';
import { genesysPointCache } from '@/utils/genesys-cache';
import {
  isGenesysForbiddenCard,
  genesysPtTier,
  getOcgLimitOverride,
  getGenesysPoint
} from '@/utils/regulation-card-badge';

function resolved(overrides: Partial<ResolvedRegulation> = {}): ResolvedRegulation {
  return {
    mode: 'none',
    tag: null,
    effectiveDate: null,
    listParam: null,
    fallback: undefined,
    ...overrides
  };
}

describe('regulation-card-badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGenesysForbiddenCard', () => {
    it('[covers:genesys_forbidden.null_or_undefined_returns_false] カード情報がnull/undefinedならfalseを返す', () => {
      expect(isGenesysForbiddenCard(null)).toBe(false);
      expect(isGenesysForbiddenCard(undefined)).toBe(false);
    });

    it('[covers:genesys_forbidden.non_monster_returns_false] cardTypeがmonster以外ならfalseを返す', () => {
      expect(isGenesysForbiddenCard({ cardType: 'spell', types: ['link'] })).toBe(false);
    });

    it('[covers:genesys_forbidden.monster_without_types_returns_false] monsterでもtypesが無ければfalseを返す', () => {
      expect(isGenesysForbiddenCard({ cardType: 'monster' })).toBe(false);
    });

    it('[covers:genesys_forbidden.link_or_pendulum_returns_true] monsterでtypesにlinkまたはpendulumを含めばtrueを返す', () => {
      expect(isGenesysForbiddenCard({ cardType: 'monster', types: ['link'] })).toBe(true);
      expect(isGenesysForbiddenCard({ cardType: 'monster', types: ['pendulum', 'effect'] })).toBe(true);
    });

    it('[covers:genesys_forbidden.other_monster_types_return_false] monsterでlink/pendulum以外のtypesならfalseを返す', () => {
      expect(isGenesysForbiddenCard({ cardType: 'monster', types: ['effect', 'synchro'] })).toBe(false);
    });
  });

  describe('genesysPtTier', () => {
    it('[covers:pt_tier.low_up_to_4] 1-4ptはlowを返す', () => {
      expect(genesysPtTier(0)).toBe('low');
      expect(genesysPtTier(1)).toBe('low');
      expect(genesysPtTier(4)).toBe('low');
    });

    it('[covers:pt_tier.mid_5_to_9] 5-9ptはmidを返す', () => {
      expect(genesysPtTier(5)).toBe('mid');
      expect(genesysPtTier(9)).toBe('mid');
    });

    it('[covers:pt_tier.high_10_or_more] 10pt以上はhighを返す', () => {
      expect(genesysPtTier(10)).toBe('high');
      expect(genesysPtTier(100)).toBe('high');
    });
  });

  describe('getOcgLimitOverride', () => {
    it('[covers:limit_override.genesys_returns_undefined] mode=genesysならキャッシュを参照せずundefinedを返す', () => {
      expect(getOcgLimitOverride('100', resolved({ mode: 'genesys' }))).toBeUndefined();
      expect(forbiddenLimitedCache.hasList).not.toHaveBeenCalled();
    });

    it('[covers:limit_override.none_or_ocg_latest_returns_null] mode=none、またはmode=ocgでeffectiveDate無しならnullを返す', () => {
      expect(getOcgLimitOverride('100', resolved({ mode: 'none' }))).toBeNull();
      expect(getOcgLimitOverride('100', resolved({ mode: 'ocg', effectiveDate: null }))).toBeNull();
      expect(forbiddenLimitedCache.hasList).not.toHaveBeenCalled();
    });

    it('[covers:limit_override.list_not_in_cache_returns_null] hasListがfalseならgetRegulationを呼ばずnullを返す', () => {
      vi.mocked(forbiddenLimitedCache.hasList).mockReturnValue(false);
      expect(getOcgLimitOverride('100', resolved({ mode: 'ocg', effectiveDate: '2025-01-01' }))).toBeNull();
      expect(forbiddenLimitedCache.getRegulation).not.toHaveBeenCalled();
    });

    it('[covers:limit_override.ocg_effective_date_reads_cache] mode=ocgかつeffectiveDateがありhasListがtrueならgetRegulationの戻り値を返す', () => {
      vi.mocked(forbiddenLimitedCache.hasList).mockReturnValue(true);
      vi.mocked(forbiddenLimitedCache.getRegulation).mockReturnValue('limited');
      expect(getOcgLimitOverride('100', resolved({ mode: 'ocg', effectiveDate: '2026-08-01' }))).toBe('limited');
      expect(forbiddenLimitedCache.getRegulation).toHaveBeenCalledWith('100', '2026-08-01');
    });
  });

  describe('getGenesysPoint', () => {
    it('[covers:genesys_point.non_genesys_returns_undefined] mode=genesys以外ならキャッシュを参照せずundefinedを返す', () => {
      expect(getGenesysPoint('100', resolved({ mode: 'ocg', effectiveDate: '2026-08-01' }))).toBeUndefined();
      expect(genesysPointCache.getPoint).not.toHaveBeenCalled();
    });

    it('[covers:genesys_point.genesys_reads_cache_with_optional_list_param] mode=genesysならgetPoint(cid, listParam ?? undefined)の戻り値を返す', () => {
      vi.mocked(genesysPointCache.getPoint).mockReturnValue(42);
      expect(getGenesysPoint('100', resolved({ mode: 'genesys', listParam: '202608' }))).toBe(42);
      expect(genesysPointCache.getPoint).toHaveBeenCalledWith('100', '202608');

      expect(getGenesysPoint('100', resolved({ mode: 'genesys', listParam: null }))).toBe(42);
      expect(genesysPointCache.getPoint).toHaveBeenCalledWith('100', undefined);
    });
  });
});
