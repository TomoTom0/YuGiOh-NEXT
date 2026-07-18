/**
 * デッキ名タグによるリミットレギュレーション判定の型定義
 *
 * 公式APIからデッキ単位の regulationId を取得できないため、デッキ名の
 * 先頭/末尾のタグ（[GENESYS-2608] 等）から適用レギュレーションを判定する。
 *
 * @see src/utils/regulation-tag-parser.ts  タグのパース
 * @see src/utils/regulation-resolver.ts    タグ→適用版の解決
 */

/**
 * デッキ名タグで指定可能なレギュレーション種別（当面は2種）
 */
export type RegType = 'genesys' | 'ocg';

/**
 * タグの括弧の種類
 */
export type RegulationBracket = 'square' | 'corner';

/**
 * デッキ名内のタグ位置（先頭 or 末尾のみ。中央は対象外）
 */
export type RegulationTagPosition = 'prefix' | 'suffix';

/**
 * デッキ名からパースしたレギュレーションタグ
 *
 * デッキ名の先頭または末尾に "[GENESYS-2608]" / "【OCG】" のようなタグがある場合、
 * そのデッキに適用するリミットレギュレーションを判定する。
 *
 * 形式: [レギュレーション名] または [レギュレーション名-YYMM]
 * - YYMM省略（[GENESYS]）= 最新版
 * - YYMMあり（[GENESYS-2608]）= その年月の版
 */
export interface RegulationTag {
  /** レギュレーション種別 */
  type: RegType;
  /** YYMM（例: "2608"）。省略時は null（=最新版） */
  yymm: string | null;
  /** タグ全体の生文字列（例: "[GENESYS-2608]" / "【OCG】"） */
  raw: string;
  /** 括弧の種類 */
  bracket: RegulationBracket;
  /** デッキ名内の位置 */
  position: RegulationTagPosition;
  /** デッキ名内の開始インデックス（0ベース） */
  startIndex: number;
  /** デッキ名内の終了インデックス（slice(startIndex, endIndex) で raw が復元できる） */
  endIndex: number;
}

/**
 * 直近版フォールバックの理由
 */
export type RegulationFallbackReason = 'not-exist';

/**
 * YYMMで指定した版が存在せず直近版を適用した場合の情報
 *
 * データ層ではこの情報を返すのみ。注意表示・修正提案（"[実在版-YYMM]に修正しますか？"
 * + ignore可）は後続のUI層が消費する。
 */
export interface RegulationFallback {
  /** ユーザーが指定したYYMM */
  requestedYymm: string;
  /** フォールバック理由 */
  reason: RegulationFallbackReason;
  /** 実際に適用した直近版の識別子（OCG: effectiveDate "YYYY-MM-DD" / GENESYS: listParam "YYYYMM"） */
  appliedIdentifier: string;
  /** 適用した直近版のYYMM（修正提案の "[実在版-YYMM]" 提示用） */
  appliedYymm: string;
}

/**
 * デッキ名から解決した、適用すべきリミットレギュレーション
 */
export interface ResolvedRegulation {
  /**
   * レギュレーションモード:
   * - 'ocg': OCG禁止制限（effectiveDate指定 or 最新）
   * - 'genesys': GENESYSポイント（listParam指定 or 最新）
   * - 'none': タグ無し = OCG最新（現状通り、特段の処理不要）
   */
  mode: RegType | 'none';
  /** パース元のタグ（タグ無し時は null） */
  tag: RegulationTag | null;
  /** OCGモード時の適用日（YYYY-MM-DD）。null = 最新版 */
  effectiveDate: string | null;
  /** GENESYSモード時のlistParam（YYYYMM）。null = 最新版 */
  listParam: string | null;
  /** 直近版フォールバック情報（該当版が存在した場合は undefined） */
  fallback: RegulationFallback | undefined;
}
