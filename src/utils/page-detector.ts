/**
 * ページタイプ判定ユーティリティ
 *
 * 各ページのURLパターンを判定する共通関数を提供
 */

/**
 * デッキ表示ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=...&dno=...
 */
export function isDeckDisplayPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/member_deck\.action\?.*ope=1/.test(url);
}

/**
 * デッキ編集ページ（従来のフォーム）かどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&...
 */
export function isDeckEditPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/member_deck\.action\?.*ope=2/.test(url);
}

/**
 * デッキ一覧ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4
 */
export function isDeckListPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/member_deck\.action\?.*ope=4/.test(url);
}

/**
 * Vue.jsベースのデッキ編集UIページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit
 */
export function isVueEditPage(): boolean {
  const hashBase = window.location.hash.split('?')[0];
  return hashBase === '#/ytomo/edit';
}

/**
 * カード検索ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1
 */
export function isCardSearchPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/card_search\.action/.test(url);
}

/**
 * カード詳細ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=...
 */
export function isCardDetailPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/card_search\.action\?.*ope=2/.test(url);
}

/**
 * FAQ検索ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action
 */
export function isFAQSearchPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/faq_search\.action/.test(url);
}

/**
 * FAQ詳細ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=...
 */
export function isFAQDetailPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/faq_search\.action\?.*ope=5/.test(url);
}

/**
 * デッキ検索ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/deck_search.action
 */
export function isDeckSearchPage(): boolean {
  const url = window.location.href;
  return /\/yugiohdb\/deck_search\.action/.test(url);
}

/**
 * 遊戯王公式DBサイト内かどうかを判定
 */
export function isYugiohDBSite(): boolean {
  const url = window.location.href;
  return /^https:\/\/www\.db\.yugioh-card\.com\/yugiohdb\//.test(url);
}
