/**
 * AIテキストリンク抽出関連の型定義
 */

import type { SearchFilters } from './search-filters'

/**
 * 条件タイプ
 */
export type ConditionType =
  | 'attribute'    // 属性: 光、闇、地、水、炎、風
  | 'race'         // 種族: ドラゴン族、魔法使い族等
  | 'level'        // レベル: レベル7、レベル4以下等
  | 'rank'         // ランク: ランク4等
  | 'link'         // リンク: リンク2等
  | 'atk'          // 攻撃力: 攻撃力2000以上等
  | 'def'          // 守備力: 守備力1000以下等
  | 'cardName'     // カード名: 「ブラック・マジシャン」
  | 'category'     // カテゴリ: 「V（ヴァレット）」等
  | 'composite'    // 複合条件: 光属性ドラゴン族等

/**
 * 演算子
 */
export type Operator =
  | 'exact'      // 完全一致: 「レベル7」「ドラゴン族」
  | 'at_least'   // 以上: 「レベル5以上」「攻撃力2000以上」
  | 'at_most'    // 以下: 「レベル4以下」「守備力1000以下」
  | 'not'        // 以外: 「レベル5以外」「光属性以外」

/**
 * 抽出されたテキスト条件
 */
export interface TextCondition {
  /** 条件タイプ */
  type: ConditionType
  /** テキストの抜粋（表示用） */
  text: string
  /** 検索に使用する値 */
  value: string | number
  /** 演算子 */
  operator: Operator
  /** 複合条件の場合のフィルタ */
  filters?: Partial<SearchFilters>
  /** テキスト内の開始位置 */
  startIndex: number
  /** テキスト内の終了位置 */
  endIndex: number
}

/**
 * AI抽出結果
 */
export interface ExtractResult {
  /** 抽出された条件リスト */
  conditions: TextCondition[]
}

/**
 * テキストリンクパーツ（描画用）
 */
export interface TextLinkPart {
  /** パーツタイプ */
  type: 'text' | 'link'
  /** 表示テキスト */
  text: string
  /** リンクの場合の条件情報 */
  condition?: TextCondition
}
