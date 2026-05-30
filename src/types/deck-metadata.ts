/**
 * デッキタイプ（表示名）
 * デッキ検索フォームから取得した実際の値
 *
 * 注: この型は既知の値のみを含む。
 * 実行時には getDeckMetadata() で最新の値を取得すること。
 */
export type DeckType =
  | 'OCG（マスタールール）'
  | 'OCG（スピードルール）'
  | 'デュエルリンクス'
  | 'マスターデュエル'
  | string; // 将来追加される値に対応

/**
 * デッキタイプのvalue値（フォーム送信時の値）
 */
export type DeckTypeValue = '0' | '1' | '2' | '3' | string;

/**
 * デッキスタイル（表示名）
 * デッキ検索フォームから取得した実際の値
 *
 * 注: この型は既知の値のみを含む。
 * 実行時には getDeckMetadata() で最新の値を取得すること。
 */
export type DeckStyle =
  | 'キャラクター'
  | 'トーナメント'
  | 'コンセプト'
  | string; // 将来追加される値に対応

/**
 * デッキスタイルのvalue値（フォーム送信時の値）
 * '-1' は「未選択」を示す
 */
export type DeckStyleValue = '-1' | '0' | '1' | '2' | string;

/**
 * カテゴリID
 * 
 * カテゴリIDは公式DBで定義された固定値（例: '4', '517', '645'）
 * カテゴリは複数選択可能なため、ID配列として扱う
 *
 * 例: ['4', '517', '645'] = ['アクアアクトレス', '悪魔嬢', 'アザミナ']
 *
 * 注: 
 * - カテゴリIDと名前のマップは getDeckMetadata() で取得すること
 * - 400個以上の値が存在するため、型定義は string として扱う
 * - 実行時のバリデーションは isValidCategoryId() を使用すること
 */
export type CategoryId = string;

/**
 * カテゴリID配列
 */
export type DeckCategory = CategoryId[];

/**
 * タグID
 * 
 * タグIDは公式DBで定義された固定値（例: '8', '108', '93'）
 * タグは複数選択可能なため、ID配列として扱う
 *
 * 例: ['8', '108', '93'] = ['リンク', '公式紹介デッキ', 'マスターデュエル用']
 *
 * 注:
 * - タグIDと名前のマップは getDeckMetadata() で取得すること
 * - 実行時のバリデーションは isValidTagId() を使用すること
 */
export type TagId = string;

/**
 * タグID配列
 */
export type DeckTags = TagId[];

// ============================================================================
// マッピング定数
// ============================================================================

/**
 * デッキタイプ表示名 → value値への変換マップ
 * HTMLから取得した表示名をvalue値に変換する
 */
export const DECK_TYPE_LABEL_TO_VALUE: Record<string, DeckTypeValue> = {
  'OCG（マスタールール）': '0',
  'OCG（スピードルール）': '1',
  'デュエルリンクス': '2',
  'マスターデュエル': '3',
};

/**
 * デッキスタイル表示名 → value値への変換マップ
 * HTMLから取得した表示名をvalue値に変換する
 */
export const DECK_STYLE_LABEL_TO_VALUE: Record<string, DeckStyleValue> = {
  'キャラクター': '0',
  'トーナメント': '1',
  'コンセプト': '2',
};

// ============================================================================
// バリデーション関数
// ============================================================================

/**
 * カテゴリIDが有効かどうかを検証
 * 
 * @param categoryId - 検証するカテゴリID
 * @param validCategories - 有効なカテゴリIDのマップ（getDeckMetadata()から取得）
 * @returns カテゴリIDが有効な場合はtrue
 */
export function isValidCategoryId(
  categoryId: string,
  validCategories: Record<string, string>
): categoryId is CategoryId {
  return categoryId in validCategories;
}

/**
 * タグIDが有効かどうかを検証
 * 
 * @param tagId - 検証するタグID
 * @param validTags - 有効なタグIDのマップ（getDeckMetadata()から取得）
 * @returns タグIDが有効な場合はtrue
 */
export function isValidTagId(
  tagId: string,
  validTags: Record<string, string>
): tagId is TagId {
  return tagId in validTags;
}

/**
 * カテゴリID配列をフィルタして有効なIDのみを返す
 * 
 * @param categoryIds - フィルタするカテゴリID配列
 * @param validCategories - 有効なカテゴリIDのマップ
 * @returns 有効なカテゴリIDのみの配列
 */
export function filterValidCategoryIds(
  categoryIds: string[],
  validCategories: Record<string, string>
): CategoryId[] {
  return categoryIds.filter((id) => isValidCategoryId(id, validCategories));
}

/**
 * タグID配列をフィルタして有効なIDのみを返す
 * 
 * @param tagIds - フィルタするタグID配列
 * @param validTags - 有効なタグIDのマップ
 * @returns 有効なタグIDのみの配列
 */
export function filterValidTagIds(
  tagIds: string[],
  validTags: Record<string, string>
): TagId[] {
  return tagIds.filter((id) => isValidTagId(id, validTags));
}
