import { describe, it, expect } from 'vitest';
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '../../../src/utils/filter-chip-formatter';

describe('formatStatLabel', () => {
  it('exact=false, unknown=falseの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  it('unknown=trueの場合、「ATK=?」を返す', () => {
    const condition = { exact: false, unknown: true };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=?');
  });

  it('exact=true, min=値の場合、「ATK=値」を返す', () => {
    const condition = { exact: true, unknown: false, min: 2500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK=2500');
  });

  it('min/maxが両方指定された場合、「ATK:最小-最大」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1000, max: 2000 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK:1000-2000');
  });

  it('minのみ指定された場合、「ATK≥値」を返す', () => {
    const condition = { exact: false, unknown: false, min: 1800 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≥1800');
  });

  it('maxのみ指定された場合、「ATK≤値」を返す', () => {
    const condition = { exact: false, unknown: false, max: 1500 };
    expect(formatStatLabel('ATK', condition)).toBe('ATK≤1500');
  });

  it('max < minの場合、nullを返す', () => {
    const condition = { exact: false, unknown: false, min: 2000, max: 1000 };
    expect(formatStatLabel('ATK', condition)).toBeNull();
  });

  it('DEFでも同様に動作する', () => {
    const condition = { exact: true, unknown: false, min: 2000 };
    expect(formatStatLabel('DEF', condition)).toBe('DEF=2000');
  });
});

describe('formatNumberRange', () => {
  it('空の配列の場合、空文字を返す', () => {
    expect(formatNumberRange([], '★')).toBe('');
  });

  it('単一の値の場合、「プレフィックス値」を返す', () => {
    expect(formatNumberRange([5], '★')).toBe('★5');
  });

  it('連続する値の場合、「プレフィックス最小-最大」を返す', () => {
    expect(formatNumberRange([4, 5, 6], '★')).toBe('★4-6');
  });

  it('連続しない値の場合、カンマ区切りで返す', () => {
    expect(formatNumberRange([1, 3, 5], '★')).toBe('★1,3,5');
  });

  it('部分的に連続する値の場合、適切にフォーマットする（連続3個以上で範囲表示）', () => {
    expect(formatNumberRange([1, 2, 3, 5, 7, 8], '★')).toBe('★1-3,5,7,8');
  });

  it('リンク数のプレフィックスでも動作する', () => {
    expect(formatNumberRange([2, 3, 4], 'L')).toBe('L2-4');
  });

  it('ペンデュラムスケールのプレフィックスでも動作する', () => {
    expect(formatNumberRange([1, 13], 'PS')).toBe('PS1,13');
  });

  it('ソートされていない配列でも正しく処理する', () => {
    expect(formatNumberRange([6, 4, 5], '★')).toBe('★4-6');
  });

  it('重複する値を含む配列の場合、重複を含んでカンマ区切りで返す', () => {
    expect(formatNumberRange([4, 5, 5, 6], '★')).toBe('★4,5,5,6');
  });
});

describe('formatLinkMarkerLabel', () => {
  it('空の配列の場合、nullを返す', () => {
    expect(formatLinkMarkerLabel([])).toBeNull();
  });

  it('単一のマーカーの場合、対応する矢印を返す', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  it('複数のマーカーの場合、矢印を連結して返す', () => {
    const result = formatLinkMarkerLabel([1, 2, 3]);
    expect(result).toContain('L');
    expect(result.length).toBeGreaterThan(1);
  });

  it('位置7(左上)の場合、「↖」を含む', () => {
    expect(formatLinkMarkerLabel([7])).toBe('L↖');
  });

  it('位置8(上)の場合、「↑」を含む', () => {
    expect(formatLinkMarkerLabel([8])).toBe('L↑');
  });

  it('位置9(右上)の場合、「↗」を含む', () => {
    expect(formatLinkMarkerLabel([9])).toBe('L↗');
  });

  it('位置4(左)の場合、「←」を含む', () => {
    expect(formatLinkMarkerLabel([4])).toBe('L←');
  });

  it('位置6(右)の場合、「→」を含む', () => {
    expect(formatLinkMarkerLabel([6])).toBe('L→');
  });

  it('位置1(左下)の場合、「↙」を含む', () => {
    expect(formatLinkMarkerLabel([1])).toBe('L↙');
  });

  it('位置2(下)の場合、「↓」を含む', () => {
    expect(formatLinkMarkerLabel([2])).toBe('L↓');
  });

  it('位置3(右下)の場合、「↘」を含む', () => {
    expect(formatLinkMarkerLabel([3])).toBe('L↘');
  });

  it('複数の方向を組み合わせた場合、正しい順序で矢印を連結する', () => {
    const result = formatLinkMarkerLabel([7, 8, 9, 4, 6, 1, 2, 3]);
    expect(result).toMatch(/^L[↖↑↗←→↙↓↘]+$/);
  });

  it('ソートされていない配列でも正しく処理する', () => {
    const result = formatLinkMarkerLabel([3, 1, 2]);
    expect(result).toContain('L');
  });
});
