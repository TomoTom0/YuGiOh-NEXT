import { describe, it, expect } from 'vitest';
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '../../../src/utils/filter-chip-formatter';

// このファイルのテストは tests/design/filter-chip-formatter/conditions.toml の条件に対応する。
// [covers:<id>] タグは各itのコメントとして付与している。

describe('formatStatLabel', () => {
  it('[covers:stat-label.none-valid-null] exact=false, unknown=falseの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  it('[covers:stat-label.unknown-true-priority] unknown=trueの場合、「ATK=?」を返す', () => {
    const condition = { exact: false, unknown: true };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=?');
  });

  it('[covers:stat-label.unknown-true-priority] unknown=trueの場合、exact/min/maxが指定されていても最優先で「ATK=?」を返す', () => {
    const condition = { exact: true, unknown: true, min: 100, max: 200 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=?');
  });

  it('[covers:stat-label.exact-true-valid-min] exact=true, min=値の場合、「ATK=値」を返す', () => {
    const condition = { exact: true, unknown: false, min: 2500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=2500');
  });

  it('[covers:stat-label.exact-true-valid-min] exact=true, min/max両方指定でも、maxを無視して「ATK=min」を返す', () => {
    const condition = { exact: true, unknown: false, min: 2500, max: 100 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=2500');
  });

  it('[covers:stat-label.exact-true-invalid-min-falls-through] exact=trueでもminが無効(負数)な場合、exact指定は無視されmaxのみの判定にフォールスルーする', () => {
    const condition = { exact: true, unknown: false, min: -5, max: 2000 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≤2000');
  });

  it('[covers:stat-label.min-max-both-valid-range] min/maxが両方指定された場合、「ATK:最小-最大」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1000, max: 2000 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK:1000-2000');
  });

  it('[covers:stat-label.min-max-equal-boundary] min===maxの場合、nullにならずrange表記「ATK:値-値」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1500, max: 1500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK:1500-1500');
  });

  it('[covers:stat-label.min-only] minのみ指定された場合、「ATK≥値」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1800 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≥1800');
  });

  it('[covers:stat-label.max-only] maxのみ指定された場合、「ATK≤値」を返す', () => {
    const condition = { exact: false, unknown: false, max: 1500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≤1500');
  });

  it('[covers:stat-label.max-less-than-min-null] max < minの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false, min: 2000, max: 1000 };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  it('[covers:stat-label.zero-min-valid] min=0の場合、falsy値としてではなく有効な値として扱われ「ATK≥0」を返す', () => {
    const condition = { exact: false, unknown: false, min: 0 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≥0');
  });

  it('[covers:stat-label.negative-min-invalid] minが負数の場合、無効値として扱われ他に有効な値がなければnullを返す', () => {
    const condition = { exact: false, unknown: false, min: -5 };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  it('[covers:stat-label.exact-true-valid-min] DEFでも同様に動作する', () => {
    const condition = { exact: true, unknown: false, min: 2000 };
    expect(formatStatLabel('DEF', condition)).toBe('DEF=2000');
  });
});

describe('formatNumberRange', () => {
  it('[covers:number-range.empty-array-empty-string] 空の配列の場合、空文字を返す', () => {
    expect(formatNumberRange([], '★')).toBe('');
  });

  it('[covers:number-range.single-value] 単一の値の場合、「プレフィックス値」を返す', () => {
    expect(formatNumberRange([5], '★')).toBe('★5');
  });

  it('[covers:number-range.group-continues-on-consecutive,number-range.group-length-ge3-range-format] 連続する値の場合、「プレフィックス最小-最大」を返す', () => {
    expect(formatNumberRange([4, 5, 6], '★')).toBe('★4-6');
  });

  it('[covers:number-range.group-breaks-on-non-consecutive] 連続しない値の場合、カンマ区切りで返す', () => {
    expect(formatNumberRange([1, 3, 5], '★')).toBe('★1,3,5');
  });

  it('[covers:number-range.group-length-lt3-comma-format] 連続する値が2個(3個未満)の場合、range表記にならずカンマ区切りで返す', () => {
    expect(formatNumberRange([1, 2, 5], '★')).toBe('★1,2,5');
  });

  it('[covers:number-range.mixed-groups-partial-consecutive] 部分的に連続する値の場合、適切にフォーマットする（連続3個以上で範囲表示）', () => {
    expect(formatNumberRange([1, 2, 3, 5, 7, 8], '★')).toBe('★1-3,5,7,8');
  });

  it('リンク数のプレフィックスでも動作する', () => {
    expect(formatNumberRange([2, 3, 4], 'L')).toBe('L2-4');
  });

  it('ペンデュラムスケールのプレフィックスでも動作する', () => {
    expect(formatNumberRange([1, 13], 'PS')).toBe('PS1,13');
  });

  it('[covers:number-range.sorts-input-before-grouping] ソートされていない配列でも正しく処理する', () => {
    expect(formatNumberRange([6, 4, 5], '★')).toBe('★4-6');
  });

  it('[covers:number-range.group-breaks-on-duplicate] 重複する値を含む配列の場合、重複を含んでカンマ区切りで返す', () => {
    expect(formatNumberRange([4, 5, 5, 6], '★')).toBe('★4,5,5,6');
  });
});

describe('formatLinkMarkerLabel', () => {
  it('[covers:link-marker.empty-array-null] 空の配列の場合、nullを返す', () => {
    expect(formatLinkMarkerLabel([])).toBeNull();
  });

  it('[covers:link-marker.known-marker-mapping] 単一のマーカーの場合、対応する矢印を返す', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  it('[covers:link-marker.multiple-preserve-input-order] 複数のマーカーの場合、矢印を連結して返す', () => {
    const result = formatLinkMarkerLabel([1, 2, 3]);
    expect(result).toBe('L↙↓↘');
  });

  it('[covers:link-marker.known-marker-mapping] 位置7(左上)の場合、「↖」を含む', () => {
    expect(formatLinkMarkerLabel([7])).toBe('L↖');
  });

  it('[covers:link-marker.known-marker-mapping] 位置8(上)の場合、「↑」を含む', () => {
    expect(formatLinkMarkerLabel([8])).toBe('L↑');
  });

  it('[covers:link-marker.known-marker-mapping] 位置9(右上)の場合、「↗」を含む', () => {
    expect(formatLinkMarkerLabel([9])).toBe('L↗');
  });

  it('[covers:link-marker.known-marker-mapping] 位置4(左)の場合、「←」を含む', () => {
    expect(formatLinkMarkerLabel([4])).toBe('L←');
  });

  it('[covers:link-marker.known-marker-mapping] 位置6(右)の場合、「→」を含む', () => {
    expect(formatLinkMarkerLabel([6])).toBe('L→');
  });

  it('[covers:link-marker.known-marker-mapping] 位置1(左下)の場合、「↙」を含む', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  it('[covers:link-marker.known-marker-mapping] 位置2(下)の場合、「↓」を含む', () => {
    expect(formatLinkMarkerLabel([2])).toBe('L↓');
  });

  it('[covers:link-marker.known-marker-mapping] 位置3(右下)の場合、「↘」を含む', () => {
    expect(formatLinkMarkerLabel([3])).toBe('L↘');
  });

  it('[covers:link-marker.unmapped-number-fallback] markerSymbolsに存在しない値(5)の場合、数値そのものにフォールバックする', () => {
    expect(formatLinkMarkerLabel([5])).toBe('L5');
  });

  it('[covers:link-marker.multiple-preserve-input-order] 複数の方向を組み合わせた場合、入力順のまま矢印を連結する', () => {
    const result = formatLinkMarkerLabel([7, 8, 9, 4, 6, 1, 2, 3]);
    expect(result).toBe('L↖↑↗←→↙↓↘');
  });

  it('[covers:link-marker.multiple-preserve-input-order] ソートされていない配列の場合、ソートされず入力順のまま連結する', () => {
    const result = formatLinkMarkerLabel([3, 1, 2]);
    expect(result).toBe('L↘↙↓');
  });
});
