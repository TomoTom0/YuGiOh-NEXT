import { describe, it, expect } from 'vitest';
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '../../../src/utils/filter-chip-formatter';

// このファイルのテストは tests/design/filter-chip-formatter/conditions.toml の条件に対応する。
// [covers:<id>] タグは各itのコメントとして付与している。

describe('formatStatLabel', () => {
  // [covers:stat_label.none_valid_null]
  it('exact=false, unknown=falseの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  // [covers:stat_label.unknown_true_priority]
  it('unknown=trueの場合、「ATK=?」を返す', () => {
    const condition = { exact: false, unknown: true };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=?');
  });

  // [covers:stat_label.unknown_true_priority]
  it('unknown=trueの場合、exact/min/maxが指定されていても最優先で「ATK=?」を返す', () => {
    const condition = { exact: true, unknown: true, min: 100, max: 200 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=?');
  });

  // [covers:stat_label.exact_true_valid_min]
  it('exact=true, min=値の場合、「ATK=値」を返す', () => {
    const condition = { exact: true, unknown: false, min: 2500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=2500');
  });

  // [covers:stat_label.exact_true_valid_min]
  it('exact=true, min/max両方指定でも、maxを無視して「ATK=min」を返す', () => {
    const condition = { exact: true, unknown: false, min: 2500, max: 100 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=2500');
  });

  // [covers:stat_label.exact_true_invalid_min_falls_through]
  it('exact=trueでもminが無効(負数)な場合、exact指定は無視されmaxのみの判定にフォールスルーする', () => {
    const condition = { exact: true, unknown: false, min: -5, max: 2000 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≤2000');
  });

  // [covers:stat_label.min_max_both_valid_range]
  it('min/maxが両方指定された場合、「ATK:最小-最大」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1000, max: 2000 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK:1000-2000');
  });

  // [covers:stat_label.min_max_equal_boundary]
  it('min===maxの場合、nullにならずrange表記「ATK:値-値」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1500, max: 1500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK:1500-1500');
  });

  // [covers:stat_label.min_only]
  it('minのみ指定された場合、「ATK≥値」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1800 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≥1800');
  });

  // [covers:stat_label.max_only]
  it('maxのみ指定された場合、「ATK≤値」を返す', () => {
    const condition = { exact: false, unknown: false, max: 1500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≤1500');
  });

  // [covers:stat_label.max_less_than_min_null]
  it('max < minの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false, min: 2000, max: 1000 };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  // [covers:stat_label.zero_min_valid]
  it('min=0の場合、falsy値としてではなく有効な値として扱われ「ATK≥0」を返す', () => {
    const condition = { exact: false, unknown: false, min: 0 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≥0');
  });

  // [covers:stat_label.negative_min_invalid]
  it('minが負数の場合、無効値として扱われ他に有効な値がなければnullを返す', () => {
    const condition = { exact: false, unknown: false, min: -5 };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  // [covers:stat_label.exact_true_valid_min]
  it('DEFでも同様に動作する', () => {
    const condition = { exact: true, unknown: false, min: 2000 };
    expect(formatStatLabel('DEF', condition)).toBe('DEF=2000');
  });
});

describe('formatNumberRange', () => {
  // [covers:number_range.empty_array_empty_string]
  it('空の配列の場合、空文字を返す', () => {
    expect(formatNumberRange([], '★')).toBe('');
  });

  // [covers:number_range.single_value]
  it('単一の値の場合、「プレフィックス値」を返す', () => {
    expect(formatNumberRange([5], '★')).toBe('★5');
  });

  // [covers:number_range.group_continues_on_consecutive]
  // [covers:number_range.group_length_ge3_range_format]
  it('連続する値の場合、「プレフィックス最小-最大」を返す', () => {
    expect(formatNumberRange([4, 5, 6], '★')).toBe('★4-6');
  });

  // [covers:number_range.group_breaks_on_non_consecutive]
  it('連続しない値の場合、カンマ区切りで返す', () => {
    expect(formatNumberRange([1, 3, 5], '★')).toBe('★1,3,5');
  });

  // [covers:number_range.group_length_lt3_comma_format]
  it('連続する値が2個(3個未満)の場合、range表記にならずカンマ区切りで返す', () => {
    expect(formatNumberRange([1, 2, 5], '★')).toBe('★1,2,5');
  });

  // [covers:number_range.mixed_groups_partial_consecutive]
  it('部分的に連続する値の場合、適切にフォーマットする（連続3個以上で範囲表示）', () => {
    expect(formatNumberRange([1, 2, 3, 5, 7, 8], '★')).toBe('★1-3,5,7,8');
  });

  it('リンク数のプレフィックスでも動作する', () => {
    expect(formatNumberRange([2, 3, 4], 'L')).toBe('L2-4');
  });

  it('ペンデュラムスケールのプレフィックスでも動作する', () => {
    expect(formatNumberRange([1, 13], 'PS')).toBe('PS1,13');
  });

  // [covers:number_range.sorts_input_before_grouping]
  it('ソートされていない配列でも正しく処理する', () => {
    expect(formatNumberRange([6, 4, 5], '★')).toBe('★4-6');
  });

  // [covers:number_range.group_breaks_on_duplicate]
  it('重複する値を含む配列の場合、重複を含んでカンマ区切りで返す', () => {
    expect(formatNumberRange([4, 5, 5, 6], '★')).toBe('★4,5,5,6');
  });
});

describe('formatLinkMarkerLabel', () => {
  // [covers:link_marker.empty_array_null]
  it('空の配列の場合、nullを返す', () => {
    expect(formatLinkMarkerLabel([])).toBeNull();
  });

  // [covers:link_marker.known_marker_mapping]
  it('単一のマーカーの場合、対応する矢印を返す', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  // [covers:link_marker.multiple_preserve_input_order]
  it('複数のマーカーの場合、矢印を連結して返す', () => {
    const result = formatLinkMarkerLabel([1, 2, 3]);
    expect(result).toBe('L↙↓↘');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置7(左上)の場合、「↖」を含む', () => {
    expect(formatLinkMarkerLabel([7])).toBe('L↖');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置8(上)の場合、「↑」を含む', () => {
    expect(formatLinkMarkerLabel([8])).toBe('L↑');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置9(右上)の場合、「↗」を含む', () => {
    expect(formatLinkMarkerLabel([9])).toBe('L↗');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置4(左)の場合、「←」を含む', () => {
    expect(formatLinkMarkerLabel([4])).toBe('L←');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置6(右)の場合、「→」を含む', () => {
    expect(formatLinkMarkerLabel([6])).toBe('L→');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置1(左下)の場合、「↙」を含む', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置2(下)の場合、「↓」を含む', () => {
    expect(formatLinkMarkerLabel([2])).toBe('L↓');
  });

  // [covers:link_marker.known_marker_mapping]
  it('位置3(右下)の場合、「↘」を含む', () => {
    expect(formatLinkMarkerLabel([3])).toBe('L↘');
  });

  // [covers:link_marker.unmapped_number_fallback]
  it('markerSymbolsに存在しない値(5)の場合、数値そのものにフォールバックする', () => {
    expect(formatLinkMarkerLabel([5])).toBe('L5');
  });

  // [covers:link_marker.multiple_preserve_input_order]
  it('複数の方向を組み合わせた場合、入力順のまま矢印を連結する', () => {
    const result = formatLinkMarkerLabel([7, 8, 9, 4, 6, 1, 2, 3]);
    expect(result).toBe('L↖↑↗←→↙↓↘');
  });

  // [covers:link_marker.multiple_preserve_input_order]
  it('ソートされていない配列の場合、ソートされず入力順のまま連結する', () => {
    const result = formatLinkMarkerLabel([3, 1, 2]);
    expect(result).toBe('L↘↙↓');
  });
});
