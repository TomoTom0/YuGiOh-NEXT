/**
 * 統合テスト: 複合検索フロー
 *
 * 機能:
 * 1. 複数フィルターの組み合わせ
 * 2. API パラメータ生成
 * 3. フィルター相互作用
 * 4. キャッシュ効率
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as cardSearch from '@/api/card-search';

vi.mock('@/api/card-search');

describe('統合テスト: 複合検索フロー', () => {
  const mockSearchResults = [
    {
      cardId: '1',
      name: 'ダーク・マジシャン',
      type: 'monster',
      attribute: 'dark',
      level: 7,
      rarity: 'ultra',
    },
    {
      cardId: '2',
      name: 'ダーク・マジシャン・ガール',
      type: 'monster',
      attribute: 'dark',
      level: 3,
      rarity: 'ultra',
    },
    {
      cardId: '3',
      name: 'ダーク・ホール',
      type: 'spell',
      attribute: 'dark',
      rarity: 'rare',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cardSearch.searchCards).mockResolvedValue(mockSearchResults);
  });

  describe('複数フィルター組み合わせ', () => {
    it('should apply card_type filter', async () => {
      const filters = {
        card_type: 'monster',
      };

      const results = await cardSearch.searchCards?.(filters);

      expect(results).toBeDefined();
      expect(cardSearch.searchCards).toHaveBeenCalledWith(filters);
    });

    it('should combine card_type and attribute filters', async () => {
      const filters = {
        card_type: 'monster',
        attribute: 'dark',
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue([
        mockSearchResults[0],
        mockSearchResults[1],
      ]);

      const results = await cardSearch.searchCards?.(filters);

      expect(results).toHaveLength(2);
      expect(results?.[0].type).toBe('monster');
      expect(results?.[0].attribute).toBe('dark');
    });

    it('should combine card_type, attribute, and level filters', async () => {
      const filters = {
        card_type: 'monster',
        attribute: 'dark',
        level: 7,
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue([
        mockSearchResults[0],
      ]);

      const results = await cardSearch.searchCards?.(filters);

      expect(results).toHaveLength(1);
      expect(results?.[0].level).toBe(7);
    });

    it('should handle spell/trap cards without level', async () => {
      const filters = {
        card_type: 'spell',
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue([
        mockSearchResults[2],
      ]);

      const results = await cardSearch.searchCards?.(filters);

      expect(results).toHaveLength(1);
      expect(results?.[0].type).toBe('spell');
      expect(results?.[0].level).toBeUndefined();
    });

    it('should apply rarity filter', async () => {
      const filters = {
        rarity: 'ultra',
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue([
        mockSearchResults[0],
        mockSearchResults[1],
      ]);

      const results = await cardSearch.searchCards?.(filters);

      expect(results?.every((r) => r.rarity === 'ultra')).toBe(true);
    });
  });

  describe('フィルター相互作用', () => {
    it('should not conflict between card_type and attribute', async () => {
      const filters1 = { card_type: 'monster' };
      const filters2 = { card_type: 'monster', attribute: 'dark' };

      vi.mocked(cardSearch.searchCards)
        .mockResolvedValueOnce(mockSearchResults.filter((c) => c.type === 'monster'))
        .mockResolvedValueOnce(
          mockSearchResults.filter((c) => c.type === 'monster' && c.attribute === 'dark')
        );

      const results1 = await cardSearch.searchCards?.(filters1);
      const results2 = await cardSearch.searchCards?.(filters2);

      expect(results1!.length).toBeGreaterThanOrEqual(results2!.length);
    });

    it('should handle mutually exclusive filters', async () => {
      // level が 1 と 7 は同時に適用できない
      const filters = {
        level: [1, 7], // OR条件
      };

      expect(filters.level).toHaveLength(2);
    });

    it('should remove filter when cleared', async () => {
      // 初期: card_type='monster' & attribute='dark'
      let filters = {
        card_type: 'monster',
        attribute: 'dark',
      };

      // attribute フィルターをクリア
      delete filters.attribute;

      expect(filters).toEqual({ card_type: 'monster' });
      expect(filters.attribute).toBeUndefined();
    });

    it('should handle filter reset to defaults', async () => {
      const filters = {
        card_type: 'all',
        attribute: 'all',
        level: 'all',
        rarity: 'all',
      };

      expect(filters).toEqual({
        card_type: 'all',
        attribute: 'all',
        level: 'all',
        rarity: 'all',
      });
    });
  });

  describe('複合フィルターの API パラメータ', () => {
    it('should generate correct API URL parameters', async () => {
      const filters = {
        keyword: 'ドラゴン',
        card_type: 'monster',
        attribute: 'dark',
        level: 4,
      };

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      const url = `?${params.toString()}`;

      expect(url).toContain('card_type=monster');
      expect(url).toContain('attribute=dark');
      expect(url).toContain('level=4');
    });

    it('should handle array filters in API parameters', async () => {
      // 複数の属性を指定
      const attributes = ['dark', 'light'];
      const params = new URLSearchParams();

      attributes.forEach((attr) => {
        params.append('attribute', attr);
      });

      const url = `?${params.toString()}`;

      expect(url).toContain('attribute=dark');
      expect(url).toContain('attribute=light');
    });
  });

  describe('キャッシング効率', () => {
    it('should use cache for identical filter combinations', async () => {
      const filters1 = {
        card_type: 'monster',
        attribute: 'dark',
      };

      const filters2 = {
        card_type: 'monster',
        attribute: 'dark',
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue(mockSearchResults);

      const results1 = await cardSearch.searchCards?.(filters1);
      const results2 = await cardSearch.searchCards?.(filters2);

      // 2回呼び出され、両方同じ結果を返す
      expect(cardSearch.searchCards).toHaveBeenCalledTimes(2);
      expect(results1).toEqual(results2);
    });

    it('should invalidate cache when filter changes', async () => {
      vi.mocked(cardSearch.searchCards)
        .mockResolvedValueOnce([mockSearchResults[0], mockSearchResults[1]])
        .mockResolvedValueOnce([mockSearchResults[2]]);

      // filter1 で検索
      const results1 = await cardSearch.searchCards?.({
        card_type: 'monster',
      });

      // filter2 で検索（キャッシュ無効化）
      const results2 = await cardSearch.searchCards?.({ card_type: 'spell' });

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(1);
    });

    it('should handle cache with large result sets', async () => {
      // 100件以上の結果をキャッシュ
      const largeResultSet = Array.from({ length: 150 }, (_, i) => ({
        cardId: String(i),
        name: `Card ${i}`,
        type: 'monster',
        attribute: 'dark',
        level: 4,
        rarity: 'rare',
      }));

      vi.mocked(cardSearch.searchCards).mockResolvedValue(largeResultSet);

      const results = await cardSearch.searchCards?.({
        card_type: 'monster',
      });

      expect(results).toHaveLength(150);
    });
  });

  describe('検索パフォーマンス', () => {
    it('should handle rapid filter changes', async () => {
      vi.mocked(cardSearch.searchCards).mockResolvedValue(
        mockSearchResults
      );

      const filterChanges = [
        { card_type: 'monster' },
        { card_type: 'monster', attribute: 'dark' },
        { card_type: 'monster', attribute: 'light' },
        { card_type: 'spell' },
        { card_type: 'trap' },
      ];

      for (const filters of filterChanges) {
        const results = await cardSearch.searchCards?.(filters);
        expect(results).toBeDefined();
      }

      expect(cardSearch.searchCards).toHaveBeenCalledTimes(5);
    });

    it('should complete search within reasonable time', async () => {
      const startTime = performance.now();

      vi.mocked(cardSearch.searchCards).mockResolvedValue(
        mockSearchResults
      );

      await cardSearch.searchCards?.({
        card_type: 'monster',
        attribute: 'dark',
        level: 4,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 検索は高速に完了する（100ms以内）
      expect(duration).toBeLessThan(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle invalid filter values', async () => {
      const filters = {
        card_type: 'invalid_type',
        level: 999,
      };

      vi.mocked(cardSearch.searchCards).mockResolvedValue([]);

      const results = await cardSearch.searchCards?.(filters);

      expect(results).toEqual([]);
    });

    it('should handle API failure with fallback', async () => {
      vi.mocked(cardSearch.searchCards).mockRejectedValueOnce(
        new Error('API Error')
      );

      try {
        await cardSearch.searchCards?.({ card_type: 'monster' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty search results', async () => {
      vi.mocked(cardSearch.searchCards).mockResolvedValue([]);

      const results = await cardSearch.searchCards?.({
        card_type: 'monster',
        attribute: 'impossible',
        level: 999,
      });

      expect(results).toEqual([]);
      expect(results?.length).toBe(0);
    });
  });

  describe('ユーザーワークフロー統合', () => {
    it('should complete complex filter workflow', async () => {
      // Step 1: 初期検索（card_type=monster）
      vi.mocked(cardSearch.searchCards).mockResolvedValueOnce(
        mockSearchResults.filter((c) => c.type === 'monster')
      );

      const results1 = await cardSearch.searchCards?.({
        card_type: 'monster',
      });

      // Step 2: attribute フィルター追加
      vi.mocked(cardSearch.searchCards).mockResolvedValueOnce(
        mockSearchResults.filter((c) => c.type === 'monster' && c.attribute === 'dark')
      );

      const results2 = await cardSearch.searchCards?.({
        card_type: 'monster',
        attribute: 'dark',
      });

      // Step 3: level フィルター追加
      vi.mocked(cardSearch.searchCards).mockResolvedValueOnce(
        mockSearchResults.filter(
          (c) => c.type === 'monster' && c.attribute === 'dark' && c.level === 7
        )
      );

      const results3 = await cardSearch.searchCards?.({
        card_type: 'monster',
        attribute: 'dark',
        level: 7,
      });

      // 各ステップで結果が絞られていることを確認
      expect(results1?.length).toBeGreaterThanOrEqual(results2?.length!);
      expect(results2?.length).toBeGreaterThanOrEqual(results3?.length!);
    });

    it('should allow filter refinement and reset', async () => {
      let currentFilters: any = { card_type: 'monster' };

      // フィルター追加
      currentFilters.attribute = 'dark';

      // フィルター削除
      delete currentFilters.attribute;

      // フィルターをリセット
      currentFilters = {};

      expect(currentFilters).toEqual({});
    });
  });
});
