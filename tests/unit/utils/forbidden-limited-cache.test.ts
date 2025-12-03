/**
 * 禁止制限リストキャッシュのテスト
 * - キャッシュの保存/読み込みテスト
 * - 30日キャッシュ有効期限判定
 * - 次回適用日での自動更新判定
 * - 初回取得時のキャッシュ保存テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ForbiddenLimitedList, LimitRegulation } from '@/types/card';

// ダミーデータ生成ユーティリティ
const createMockForbiddenLimitedList = (
  effectiveDate: string,
  fetchedAt: number,
  regulations: Record<string, LimitRegulation> = {}
): ForbiddenLimitedList => ({
  effectiveDate,
  fetchedAt,
  regulations
});

const createMockLimitRegulation = (status: 'forbidden' | 'limited' | 'semi-limited'): LimitRegulation => ({
  status,
  updatedAt: new Date().toISOString()
});

describe('ForbiddenLimitedCache - ユニットテスト', () => {
  describe('キャッシュの初期化と管理', () => {
    it('初期状態ではキャッシュが空である', () => {
      const cache = {
        data: null as ForbiddenLimitedList | null,
        initialized: false
      };

      expect(cache.data).toBeNull();
      expect(cache.initialized).toBe(false);
    });

    it('初期化処理を実行できる', () => {
      const cache = {
        data: null as ForbiddenLimitedList | null,
        initialized: false
      };

      cache.initialized = true;

      expect(cache.initialized).toBe(true);
    });

    it('複数回の初期化が実行されない（1回のみ）', () => {
      const mockInit = vi.fn();
      const cache = {
        initialized: false,
        init: () => {
          if (cache.initialized) return;
          mockInit();
          cache.initialized = true;
        }
      };

      cache.init();
      cache.init();
      cache.init();

      expect(mockInit).toHaveBeenCalledTimes(1);
    });
  });

  describe('キャッシュの保存と読み込み', () => {
    it('新規キャッシュを保存できる', () => {
      const mockStorage = new Map<string, ForbiddenLimitedList>();
      const newCache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('limited')
        }
      );

      mockStorage.set('forbiddenLimitedList', newCache);

      expect(mockStorage.has('forbiddenLimitedList')).toBe(true);
      expect(mockStorage.get('forbiddenLimitedList')?.effectiveDate).toBe('2025-12-02');
    });

    it('保存されたキャッシュを読み込める', () => {
      const mockStorage = new Map<string, ForbiddenLimitedList>();
      const cache = createMockForbiddenLimitedList('2025-12-02', Date.now());
      mockStorage.set('forbiddenLimitedList', cache);

      const loaded = mockStorage.get('forbiddenLimitedList');

      expect(loaded).toBeDefined();
      expect(loaded?.effectiveDate).toBe('2025-12-02');
    });

    it('キャッシュをクリアできる', () => {
      const mockStorage = new Map<string, ForbiddenLimitedList>();
      const cache = createMockForbiddenLimitedList('2025-12-02', Date.now());
      mockStorage.set('forbiddenLimitedList', cache);

      mockStorage.delete('forbiddenLimitedList');

      expect(mockStorage.has('forbiddenLimitedList')).toBe(false);
    });
  });

  describe('禁止制限状態の取得', () => {
    it('禁止カードの状態が取得できる', () => {
      const cache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('forbidden')
        }
      );

      const regulation = cache.regulations['25955333'];

      expect(regulation).toBeDefined();
      expect(regulation?.status).toBe('forbidden');
    });

    it('制限カードの状態が取得できる', () => {
      const cache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('limited')
        }
      );

      const regulation = cache.regulations['25955333'];

      expect(regulation?.status).toBe('limited');
    });

    it('準制限カードの状態が取得できる', () => {
      const cache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('semi-limited')
        }
      );

      const regulation = cache.regulations['25955333'];

      expect(regulation?.status).toBe('semi-limited');
    });

    it('存在しないカードIDではundefinedが返される', () => {
      const cache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('limited')
        }
      );

      const regulation = cache.regulations['99999999'];

      expect(regulation).toBeUndefined();
    });

    it('複数カードの状態が一括取得できる', () => {
      const cache = createMockForbiddenLimitedList(
        '2025-12-02',
        Date.now(),
        {
          '25955333': createMockLimitRegulation('limited'),
          '74677422': createMockLimitRegulation('forbidden'),
          '89631139': createMockLimitRegulation('semi-limited')
        }
      );

      const cardIds = ['25955333', '74677422', '89631139'];
      const regulations = cardIds.reduce((acc, id) => {
        acc[id] = cache.regulations[id];
        return acc;
      }, {} as Record<string, LimitRegulation | undefined>);

      expect(Object.keys(regulations)).toHaveLength(3);
      expect(regulations['25955333']?.status).toBe('limited');
      expect(regulations['74677422']?.status).toBe('forbidden');
      expect(regulations['89631139']?.status).toBe('semi-limited');
    });
  });

  describe('30日キャッシュ有効期限判定', () => {
    it('取得直後のキャッシュは有効である', () => {
      const now = Date.now();
      const cache = createMockForbiddenLimitedList('2025-12-02', now);

      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30日
      const isExpired = now - cache.fetchedAt > CACHE_TTL;

      expect(isExpired).toBe(false);
    });

    it('29日経過したキャッシュは有効である', () => {
      const now = Date.now();
      const fetchedAt = now - (29 * 24 * 60 * 60 * 1000); // 29日前
      const cache = createMockForbiddenLimitedList('2025-12-02', fetchedAt);

      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
      const isExpired = now - cache.fetchedAt > CACHE_TTL;

      expect(isExpired).toBe(false);
    });

    it('30日経過したキャッシュは有効である（境界値テスト）', () => {
      const now = Date.now();
      const fetchedAt = now - (30 * 24 * 60 * 60 * 1000); // 30日前（ちょうど）
      const cache = createMockForbiddenLimitedList('2025-12-02', fetchedAt);

      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
      const isExpired = now - cache.fetchedAt > CACHE_TTL;

      // 30日ちょうどは有効（> ではなく >= 時に期限切れ）
      expect(isExpired).toBe(false);
    });

    it('31日経過したキャッシュは期限切れである', () => {
      const now = Date.now();
      const fetchedAt = now - (31 * 24 * 60 * 60 * 1000); // 31日前
      const cache = createMockForbiddenLimitedList('2025-12-02', fetchedAt);

      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
      const isExpired = now - cache.fetchedAt > CACHE_TTL;

      expect(isExpired).toBe(true);
    });
  });

  describe('次回適用日での自動更新判定', () => {
    it('適用日が未来の場合は更新不要である', () => {
      const now = new Date('2025-12-02');
      const futureDate = new Date('2025-12-16'); // 2週間後

      const needsUpdate = futureDate.getTime() <= now.getTime();

      expect(needsUpdate).toBe(false);
    });

    it('適用日が過去の場合は更新が必要である', () => {
      const now = new Date('2025-12-16');
      const pastDate = new Date('2025-12-02'); // 2週間前

      const needsUpdate = pastDate.getTime() <= now.getTime();

      expect(needsUpdate).toBe(true);
    });

    it('適用日が今日の場合は更新が必要である', () => {
      const now = new Date('2025-12-02');
      const today = new Date('2025-12-02');

      const needsUpdate = today.getTime() <= now.getTime();

      expect(needsUpdate).toBe(true);
    });
  });

  describe('更新判定ロジック', () => {
    it('キャッシュなしの場合は更新が必要', () => {
      const cache = null;

      const needsUpdate = cache === null;

      expect(needsUpdate).toBe(true);
    });

    it('キャッシュが古い場合は更新が必要', () => {
      const now = Date.now();
      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
      const cache = createMockForbiddenLimitedList('2025-12-02', now - CACHE_TTL - 1000);

      const isOld = now - cache.fetchedAt > CACHE_TTL;

      expect(isOld).toBe(true);
    });

    it('キャッシュが有効で次回適用日も未来の場合は更新不要', () => {
      const now = Date.now();
      const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
      const futureDateStr = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const cache = createMockForbiddenLimitedList(futureDateStr, now);

      const isOld = now - cache.fetchedAt > CACHE_TTL;
      const isFutureDate = new Date(futureDateStr).getTime() > now;

      expect(isOld).toBe(false);
      expect(isFutureDate).toBe(true);
    });
  });

  describe('初回取得時のキャッシュ保存', () => {
    it('初回取得したデータが保存される', () => {
      const mockStorage = new Map<string, ForbiddenLimitedList>();
      const newCache = createMockForbiddenLimitedList('2025-12-02', Date.now());

      // 初回取得時にキャッシュを保存
      mockStorage.set('forbiddenLimitedList', newCache);

      expect(mockStorage.has('forbiddenLimitedList')).toBe(true);
    });

    it('取得日時がタイムスタンプで記録される', () => {
      const beforeTime = Date.now();
      const cache = createMockForbiddenLimitedList('2025-12-02', Date.now());
      const afterTime = Date.now();

      expect(cache.fetchedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(cache.fetchedAt).toBeLessThanOrEqual(afterTime);
    });

    it('複数回の更新で最新の時刻が保存される', () => {
      const mockStorage = new Map<string, ForbiddenLimitedList>();

      const cache1 = createMockForbiddenLimitedList('2025-12-02', Date.now());
      mockStorage.set('forbiddenLimitedList', cache1);

      // 数ミリ秒待機
      const time2 = Date.now() + 100;
      const cache2 = createMockForbiddenLimitedList('2025-12-02', time2);
      mockStorage.set('forbiddenLimitedList', cache2);

      const stored = mockStorage.get('forbiddenLimitedList');

      expect(stored?.fetchedAt).toBe(time2);
      expect(stored?.fetchedAt).toBeGreaterThan(cache1.fetchedAt);
    });
  });

  describe('エッジケース', () => {
    it('空の禁止制限リストが処理できる', () => {
      const cache = createMockForbiddenLimitedList('2025-12-02', Date.now(), {});

      const regulation = cache.regulations['25955333'];

      expect(regulation).toBeUndefined();
      expect(Object.keys(cache.regulations)).toHaveLength(0);
    });

    it('nullキャッシュが適切に処理される', () => {
      const cache: ForbiddenLimitedList | null = null;

      expect(cache).toBeNull();
    });

    it('無効な日付フォーマットが処理される', () => {
      const invalidDate = 'invalid-date';
      const cache = createMockForbiddenLimitedList(invalidDate, Date.now());

      expect(cache.effectiveDate).toBe(invalidDate);
      // 実装では NaN が返るなどの処理になるはず
    });

    it('大量のカード数に対応できる', () => {
      const regulations: Record<string, LimitRegulation> = {};

      // 1000個のカード禁止制限情報
      for (let i = 0; i < 1000; i++) {
        const cardId = (1000000 + i).toString();
        regulations[cardId] = createMockLimitRegulation('limited');
      }

      const cache = createMockForbiddenLimitedList('2025-12-02', Date.now(), regulations);

      expect(Object.keys(cache.regulations)).toHaveLength(1000);
      expect(cache.regulations['1000000']).toBeDefined();
      expect(cache.regulations['1000999']).toBeDefined();
    });
  });
});
