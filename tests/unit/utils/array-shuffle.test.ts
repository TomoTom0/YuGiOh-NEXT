import { describe, it, expect, afterEach, vi } from 'vitest';
import { fisherYatesShuffle } from '../../../src/utils/array-shuffle';

describe('fisherYatesShuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('入力配列を変更せず、別配列を返す [covers:fisher_yates.returns_new_array_copy]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const input = [1, 2, 3];

    const result = fisherYatesShuffle(input);

    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('空配列と単一要素配列ではループを実行しない [covers:fisher_yates.length_zero_or_one_skips_loop]', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    const emptyInput: number[] = [];
    const emptyResult = fisherYatesShuffle(emptyInput);
    const singleInput = [1];
    const singleResult = fisherYatesShuffle(singleInput);

    expect(emptyResult).toEqual([]);
    expect(emptyResult).not.toBe(emptyInput);
    expect(singleResult).toEqual([1]);
    expect(singleResult).not.toBe(singleInput);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it('Math.randomが0の場合は各iを先頭要素と交換する [covers:fisher_yates.random_zero_swaps_with_first_index]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(fisherYatesShuffle([1, 2, 3])).toEqual([2, 3, 1]);
  });

  it('Math.randomが1未満で1に近い場合は自己交換になる [covers:fisher_yates.random_near_one_self_swaps]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const input = [1, 2, 3];

    const result = fisherYatesShuffle(input);

    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
  });

  it('長さnの配列ではn-1回乱数を使う [covers:fisher_yates.iterates_descending_until_one]', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999999);

    fisherYatesShuffle([1, 2, 3, 4]);

    expect(randomSpy).toHaveBeenCalledTimes(3);
  });
});

