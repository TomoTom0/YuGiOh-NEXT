/**
 * GENESYS名前解決（カード名+種類 -> cid）のテスト
 * - 同名カード1件の解決
 * - 同名カード複数（通常/儀式等）を種類classで絞り込み
 * - resolveEntries での cid->ポイント 変換
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// UnifiedCacheDBをモック（vi.mockファクトリ内にデータを埋め込みhoisting問題を回避）
vi.mock('@/utils/unified-cache-db', () => {
  type CT = 'monster' | 'spell' | 'trap';
  const data: Record<string, {
    tableA?: { langsName?: Record<string, string> };
    tableB?: { cardType: CT; types?: string[] };
  }> = {
    '1001': { tableA: { langsName: { ja: 'BF－精鋭のゼピュロス' } }, tableB: { cardType: 'monster', types: ['effect'] } },
    // 同名カード: 通常モンスター と 儀式モンスター
    '1002': { tableA: { langsName: { ja: 'カオス・ソルジャー' } }, tableB: { cardType: 'monster', types: ['normal'] } },
    '1003': { tableA: { langsName: { ja: 'カオス・ソルジャー' } }, tableB: { cardType: 'monster', types: ['ritual'] } },
    '1004': { tableA: { langsName: { ja: 'サイクロン' } }, tableB: { cardType: 'spell', types: [] } },
  };
  return {
    getUnifiedCacheDB: () => ({
      getAllCardIds: () => Object.keys(data),
      getCardBasicInfo: (cid: string) => data[cid] ?? {},
    }),
  };
});

import { GenesysNameResolver } from '@/utils/genesys-name-resolver';

describe('utils/genesys-name-resolver', () => {
  let resolver: GenesysNameResolver;

  beforeEach(() => {
    resolver = new GenesysNameResolver();
  });

  it('同名カードが1件のみの場合はcidを返す', () => {
    expect(resolver.resolveCid('BF－精鋭のゼピュロス', 'effect')).toBe('1001');
  });

  it('同名カードが複数の場合、種類classで儀式モンスターを絞り込む', () => {
    expect(resolver.resolveCid('カオス・ソルジャー', 'ritual')).toBe('1003');
  });

  it('同名カードが複数の場合、effect classで通常モンスター（extra deck種でない）を絞り込む', () => {
    // 通常モンスター(types=['normal'])はextra deck種でないため 'effect' classに該当
    expect(resolver.resolveCid('カオス・ソルジャー', 'effect')).toBe('1002');
  });

  it('魔法カードを magic class で解決する', () => {
    expect(resolver.resolveCid('サイクロン', 'magic')).toBe('1004');
  });

  it('存在しないカード名はnullを返す', () => {
    expect(resolver.resolveCid('存在しないカード', 'effect')).toBeNull();
  });

  it('resolveEntries でエントリ配列をcid->ポイントに解決する', () => {
    const result = resolver.resolveEntries([
      { name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' },
      { name: 'サイクロン', point: 5, cardKindClass: 'magic' },
      { name: '存在しない', point: 99, cardKindClass: 'effect' },
    ]);
    expect(result.points).toEqual({ '1001': 13, '1004': 5 });
    expect(result.unresolved).toEqual(['存在しない']);
  });
});
