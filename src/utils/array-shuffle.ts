/**
 * 配列シャッフル用のユーティリティ関数
 *
 * Fisher-Yates アルゴリズムを使用した公平なシャッフルを提供する
 */

/**
 * Fisher-Yatesアルゴリズムを使用して配列をシャッフルする
 *
 * @param array - シャッフル対象の配列
 * @returns 新しいシャッフルされた配列（元の配列は変更されない）
 *
 * @remarks
 * - 各要素が各位置に現れる確率が均等（O(n)時間で公平なシャッフル）
 * - 元の配列を変更せず、新しい配列を返す（イミュータブル）
 *
 * @example
 * ```typescript
 * const cards = [1, 2, 3, 4, 5];
 * const shuffled = fisherYatesShuffle(cards);
 * console.log(shuffled); // [3, 1, 5, 2, 4] (ランダム)
 * console.log(cards);    // [1, 2, 3, 4, 5] (元の配列は不変)
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
