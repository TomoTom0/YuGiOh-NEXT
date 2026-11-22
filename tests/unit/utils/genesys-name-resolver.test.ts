/**
 * GENESYS名前解決（カード名+種類 -> cid）のテスト
 * - 同名カード1件の解決
 * - 同名カード複数（通常/儀式等）を種類classで絞り込み
 * - resolveEntries での cid->ポイント 変換
 *
 * conditions: tests/design/genesys-name-resolver/conditions.toml
 * （実装コードを直接読んで転記した条件一覧。[covers:<id>] タグで対応関係を明示）
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
    // non_monster_false / effect_true(重複) / trims_whitespace 検証用: 1件目がmonster以外
    '2001': { tableA: { langsName: { ja: 'ノンモンスターチェック' } }, tableB: { cardType: 'spell', types: [] } },
    '2002': { tableA: { langsName: { ja: 'ノンモンスターチェック' } }, tableB: { cardType: 'monster', types: ['effect'] } },
    // effect_false 検証用: 1件目がextra deck種のmonster
    '3001': { tableA: { langsName: { ja: 'エフェクト除外テスト' } }, tableB: { cardType: 'monster', types: ['fusion'] } },
    '3002': { tableA: { langsName: { ja: 'エフェクト除外テスト' } }, tableB: { cardType: 'monster', types: ['effect'] } },
    // extra_deck_false/true 検証用
    '4001': { tableA: { langsName: { ja: 'エクストラ種別テスト' } }, tableB: { cardType: 'monster', types: ['synchro'] } },
    '4002': { tableA: { langsName: { ja: 'エクストラ種別テスト' } }, tableB: { cardType: 'monster', types: ['fusion'] } },
    // magic_false/true 検証用: 1件目がspellでない
    'M1': { tableA: { langsName: { ja: 'マジック判定テスト' } }, tableB: { cardType: 'trap', types: [] } },
    'M2': { tableA: { langsName: { ja: 'マジック判定テスト' } }, tableB: { cardType: 'spell', types: [] } },
    // trap_false/true 検証用: 1件目がtrapでない
    'T1': { tableA: { langsName: { ja: 'トラップ判定テスト' } }, tableB: { cardType: 'spell', types: [] } },
    'T2': { tableA: { langsName: { ja: 'トラップ判定テスト' } }, tableB: { cardType: 'trap', types: [] } },
    // どの候補ともmatchesKindClassが一致しないフォールバック検証用
    'F1': { tableA: { langsName: { ja: 'マッチなしフォールバック' } }, tableB: { cardType: 'monster', types: ['synchro'] } },
    'F2': { tableA: { langsName: { ja: 'マッチなしフォールバック' } }, tableB: { cardType: 'monster', types: ['xyz'] } },
    // tableB.types未定義 -> [] フォールバック検証用（1件目がtypesキー無し）
    'U1': { tableA: { langsName: { ja: 'タイプ未定義グループ' } }, tableB: { cardType: 'monster' } },
    'U2': { tableA: { langsName: { ja: 'タイプ未定義グループ' } }, tableB: { cardType: 'monster', types: ['fusion'] } },
    // tableBが無い（欠損）カード: nameToCids/cidToKindどちらにも登録されないことの検証用
    'NB1': { tableA: { langsName: { ja: '欠損テーブルB検証' } } },
    // 日本語名（langsName.ja）が無いカード: buildでスキップされる前提固定用（tableBは持つ）
    'NM1': { tableA: { langsName: { en: 'Name Missing JA' } }, tableB: { cardType: 'monster', types: ['effect'] } },
  };

  const getUnifiedCacheDB = vi.fn(() => ({
    getAllCardIds: () => Object.keys(data),
    getCardBasicInfo: (cid: string) => data[cid] ?? {},
  }));

  return { getUnifiedCacheDB };
});

import { GenesysNameResolver, resolveGenesysEntries, genesysNameResolver } from '@/utils/genesys-name-resolver';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';

describe('utils/genesys-name-resolver', () => {
  let resolver: GenesysNameResolver;

  beforeEach(() => {
    resolver = new GenesysNameResolver();
    vi.mocked(getUnifiedCacheDB).mockClear();
  });

  it('[covers:resolve-cid.single-candidate] 同名カードが1件のみの場合はcidを返す', () => {
    expect(resolver.resolveCid('BF－精鋭のゼピュロス', 'effect')).toBe('1001');
  });

  it('[covers:resolve-cid.multiple-candidates-match-found,matches-kind-class.extra-deck-true,build.groups-duplicate-names] 同名カードが複数の場合、種類classで儀式モンスターを絞り込む', () => {
    expect(resolver.resolveCid('カオス・ソルジャー', 'ritual')).toBe('1003');
  });

  it('[covers:matches-kind-class.effect-true] 同名カードが複数の場合、effect classで通常モンスター（extra deck種でない）を絞り込む', () => {
    // 通常モンスター(types=['normal'])はextra deck種でないため 'effect' classに該当
    expect(resolver.resolveCid('カオス・ソルジャー', 'effect')).toBe('1002');
  });

  it('[covers:resolve-cid.single-candidate] 魔法カードを magic class で解決する', () => {
    expect(resolver.resolveCid('サイクロン', 'magic')).toBe('1004');
  });

  it('[covers:resolve-cid.name-not-found] 存在しないカード名はnullを返す', () => {
    expect(resolver.resolveCid('存在しないカード', 'effect')).toBeNull();
  });

  it('[covers:resolve-entries.resolved-entry-recorded,resolve-entries.unresolved-entry-recorded] resolveEntries でエントリ配列をcid->ポイントに解決する', () => {
    const result = resolver.resolveEntries([
      { name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' },
      { name: 'サイクロン', point: 5, cardKindClass: 'magic' },
      { name: '存在しない', point: 99, cardKindClass: 'effect' },
    ]);
    expect(result.points).toEqual({ '1001': 13, '1004': 5 });
    expect(result.unresolved).toEqual(['存在しない']);
  });

  it('[covers:resolve-entries.duplicate-cid-last-point-wins] resolveEntries で同じcidに解決される複数エントリがある場合、最後のpointで上書きされる', () => {
    const result = resolver.resolveEntries([
      { name: 'BF－精鋭のゼピュロス', point: 10, cardKindClass: 'effect' },
      { name: 'BF－精鋭のゼピュロス', point: 99, cardKindClass: 'effect' },
    ]);
    expect(result.points).toEqual({ '1001': 99 });
    expect(result.unresolved).toEqual([]);
  });

  it('[covers:matches-kind-class.non-monster-false] 種類classがeffectでも候補のcardTypeがmonsterでなければ不一致とみなし次候補に進む', () => {
    // 1件目(2001)はspellでmonsterでないため不一致、2件目(2002)のmonster/effectが一致
    expect(resolver.resolveCid('ノンモンスターチェック', 'effect')).toBe('2002');
  });

  it('[covers:matches-kind-class.trims-whitespace] cardKindClassの前後空白はtrimしてから比較される', () => {
    expect(resolver.resolveCid('ノンモンスターチェック', ' effect ')).toBe('2002');
  });

  it('[covers:matches-kind-class.effect-false] effect class指定時、typesがextra deck種を含む候補は不一致とみなし次候補に進む', () => {
    // 1件目(3001)はtypes=['fusion']でextra deck種のため不一致、2件目(3002)のtypes=['effect']が一致
    expect(resolver.resolveCid('エフェクト除外テスト', 'effect')).toBe('3002');
  });

  it('[covers:matches-kind-class.extra-deck-false] fusion class指定時、typesにfusionを含まない候補は不一致とみなし次候補に進む', () => {
    // 1件目(4001)はtypes=['synchro']で不一致、2件目(4002)のtypes=['fusion']が一致
    expect(resolver.resolveCid('エクストラ種別テスト', 'fusion')).toBe('4002');
  });

  it('[covers:matches-kind-class.magic-false,matches-kind-class.magic-true] magic class指定時、cardTypeがspellでない候補は不一致とみなし次のspell候補が一致する', () => {
    // 1件目(M1)はtrapで不一致、2件目(M2)のspellが一致
    expect(resolver.resolveCid('マジック判定テスト', 'magic')).toBe('M2');
  });

  it('[covers:matches-kind-class.trap-false,matches-kind-class.trap-true] trap class指定時、cardTypeがtrapでない候補は不一致とみなし次のtrap候補が一致する', () => {
    // 1件目(T1)はspellで不一致、2件目(T2)のtrapが一致
    expect(resolver.resolveCid('トラップ判定テスト', 'trap')).toBe('T2');
  });

  it('[covers:resolve-cid.multiple-candidates-no-match-fallback] どの候補もcardKindClassと一致しない場合、先頭候補にフォールバックする', () => {
    // F1(synchro)/F2(xyz)どちらもfusionとは一致しないため、先頭のF1にフォールバック
    expect(resolver.resolveCid('マッチなしフォールバック', 'fusion')).toBe('F1');
  });

  it('[covers:build.types-defaults-to-empty-array] tableB.typesが未定義の候補は空配列として扱われる（extra deck種でないとみなされeffectに一致）', () => {
    // U1はtypesキー自体が無いため []扱い -> extra deck種を含まない -> effectに一致
    expect(resolver.resolveCid('タイプ未定義グループ', 'effect')).toBe('U1');
  });

  it('[covers:build.skip-missing-table-b] tableBが無いカードはnameToCidsにも登録されず、唯一の候補であっても解決できない', () => {
    expect(resolver.resolveCid('欠損テーブルB検証', 'effect')).toBeNull();
  });

  // 日本語名が無いカードはbuildでスキップされる（前提固定テスト）。
  // build.skip_missing_name は verified=false のまま: 公開APIだけでは「除外されている」ことと
  // 「そもそも参照不能」であることを区別できないため、ここでは前提（公開挙動）だけを固定する。
  it('[covers:build.skip-missing-name] 日本語名が無いカードはどの名前でも解決候補にならず、他のカードの解決にも影響しない', () => {
    // NM1は日本語名が無いため、空文字列でも解決候補にならない
    expect(resolver.resolveCid('', 'effect')).toBeNull();
    // 名前のあるカードは通常どおり解決できる（buildがNM1で止まらない）
    expect(resolver.resolveCid('BF－精鋭のゼピュロス', 'effect')).toBe('1001');
  });

  it('[covers:build.idempotent-no-rebuild] build()は一度完了すると以後getUnifiedCacheDB()を再度呼ばない', () => {
    resolver.resolveCid('BF－精鋭のゼピュロス', 'effect');
    resolver.resolveCid('サイクロン', 'magic');
    expect(vi.mocked(getUnifiedCacheDB)).toHaveBeenCalledTimes(1);
  });

  it('[covers:reset.clears-cache-and-rebuilds] reset()後は次のresolveCid呼び出しでgetUnifiedCacheDB()が再度呼ばれる', () => {
    resolver.resolveCid('BF－精鋭のゼピュロス', 'effect');
    expect(vi.mocked(getUnifiedCacheDB)).toHaveBeenCalledTimes(1);

    resolver.reset();
    resolver.resolveCid('BF－精鋭のゼピュロス', 'effect');
    expect(vi.mocked(getUnifiedCacheDB)).toHaveBeenCalledTimes(2);
  });

  it('[covers:resolve-genesys-entries.delegates-to-global-instance] resolveGenesysEntriesはグローバルインスタンス(genesysNameResolver)のresolveEntriesに委譲する', () => {
    genesysNameResolver.reset();
    const result = resolveGenesysEntries([
      { name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' },
      { name: 'サイクロン', point: 5, cardKindClass: 'magic' },
    ]);
    expect(result).toEqual(
      new GenesysNameResolver().resolveEntries([
        { name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' },
        { name: 'サイクロン', point: 5, cardKindClass: 'magic' },
      ])
    );
  });
});
