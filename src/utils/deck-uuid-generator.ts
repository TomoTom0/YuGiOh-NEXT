/**
 * デッキカード用のUUID生成器
 *
 * カードID (cid) と カードインスタンスID (ciid) の組み合わせごとに、
 * 一意のUUIDを生成する。同じ cid-ciid の組み合わせに対して、
 * 連番のインデックスを付与することで、複数のインスタンスを区別する。
 */

/**
 * UUID生成のための状態管理用Map
 * Key: `${cid}-${ciid}` の形式
 * Value: 現在の最大インデックス番号
 */
const maxIndexMap = new Map<string, number>();

/**
 * カードIDとカードインスタンスIDから一意のUUIDを生成する
 *
 * @param cid - カードID
 * @param ciid - カードインスタンスID
 * @returns 生成されたUUID（形式: `${cid}-${ciid}-${index}`）
 *
 * @example
 * ```typescript
 * const uuid1 = generateDeckCardUUID('12345', 0); // "12345-0-0"
 * const uuid2 = generateDeckCardUUID('12345', 0); // "12345-0-1"
 * const uuid3 = generateDeckCardUUID('12345', 1); // "12345-1-0"
 * ```
 */
export function generateDeckCardUUID(cid: string, ciid: number): string {
  const baseKey = `${cid}-${ciid}`;
  const currentMax = maxIndexMap.get(baseKey) ?? -1;
  const newIndex = currentMax + 1;
  maxIndexMap.set(baseKey, newIndex);
  return `${baseKey}-${newIndex}`;
}

/**
 * UUID生成器の状態をクリアする
 * 新しいデッキをロードする際に呼び出すことで、
 * 以前のデッキのインデックスが引き継がれないようにする
 *
 * @example
 * ```typescript
 * // デッキロード前にクリア
 * clearDeckUUIDState();
 *
 * // 新しいデッキのカードに対してUUIDを生成
 * const uuid = generateDeckCardUUID('12345', 0); // "12345-0-0" (インデックスが0からスタート)
 * ```
 */
export function clearDeckUUIDState(): void {
  maxIndexMap.clear();
}

/**
 * テスト用: UUID生成器の内部状態を取得する
 *
 * @returns 現在のmaxIndexMapのコピー
 * @internal
 */
export function __getDeckUUIDState(): Map<string, number> {
  return new Map(maxIndexMap);
}
