/**
 * API パラメータ定数
 *
 * 公式サイトのAPI呼び出しで使用するパラメータを定数化
 * - マジックナンバーを排除
 * - 可読性を向上
 * - 変更時の影響範囲を限定
 */

/**
 * member_deck.action の ope パラメータ
 *
 * デッキ操作APIで使用する操作タイプ
 */
export const DECK_OPE = {
  /** デッキ詳細表示 */
  VIEW: '1',
  /** デッキ編集フォーム取得 */
  EDIT: '2',
  /** デッキ保存 */
  SAVE: '3',
  /** デッキ一覧取得 */
  LIST: '4',
  /** デッキ新規作成 */
  CREATE: '6',
  /** デッキ削除 */
  DELETE: '7'
} as const;

/**
 * card_search.action の ope パラメータ
 *
 * カード検索APIで使用する操作タイプ
 */
export const CARD_SEARCH_OPE = {
  /** カード検索（一覧） */
  SEARCH: '1',
  /** カード詳細表示 */
  DETAIL: '2'
} as const;

/**
 * faq_search.action の ope パラメータ
 *
 * FAQ検索APIで使用する操作タイプ
 */
export const FAQ_OPE = {
  /** カード別FAQ一覧（推測） */
  CARD_FAQ_LIST: '4',
  /** FAQ詳細表示 */
  FAQ_DETAIL: '5'
} as const;

/**
 * wname パラメータ
 *
 * 一部のAPI呼び出しで使用されるウィジェット名
 */
export const WNAME = {
  /** メンバーデッキウィジェット */
  MEMBER_DECK: 'MemberDeck'
} as const;

/**
 * API エンドポイント名
 */
export const API_ENDPOINT = {
  /** メンバーデッキ操作API */
  MEMBER_DECK: 'member_deck.action',
  /** カード検索API */
  CARD_SEARCH: 'card_search.action',
  /** FAQ検索API */
  FAQ_SEARCH: 'faq_search.action'
} as const;

// 型エクスポート（TypeScript用）
export type DeckOpe = typeof DECK_OPE[keyof typeof DECK_OPE];
export type CardSearchOpe = typeof CARD_SEARCH_OPE[keyof typeof CARD_SEARCH_OPE];
export type FaqOpe = typeof FAQ_OPE[keyof typeof FAQ_OPE];
export type Wname = typeof WNAME[keyof typeof WNAME];
export type ApiEndpoint = typeof API_ENDPOINT[keyof typeof API_ENDPOINT];
