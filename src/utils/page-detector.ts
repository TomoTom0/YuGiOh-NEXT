/**
 * ページタイプ判定ユーティリティ
 *
 * 各ページのURLパターンを判定する共通関数を提供
 */

import type { CardGameType } from '../types/settings';

/**
 * URLからカードゲームタイプを自動判定
 * @param url 判定対象のURL（省略時は現在のURL）
 * @returns 'ocg' (yugiohdb) または 'rush' (rushdb)
 */
export function detectCardGameType(url?: string): CardGameType {
  const targetUrl = url || window.location.href;
  return /\/rushdb\//.test(targetUrl) ? 'rush' : 'ocg';
}

/**
 * カードゲームタイプからパス名を取得
 * @param gameType カードゲームタイプ
 * @returns 'yugiohdb' または 'rushdb'
 */
export function getGamePath(gameType: CardGameType): string {
  return gameType === 'rush' ? 'rushdb' : 'yugiohdb';
}

/**
 * デッキ表示ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=...&dno=...
 * 注意: ope=1は省略されることもある（省略時はope=1と解釈される）
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isDeckDisplayPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  // ope=1が明示的にある、またはopeパラメータが存在しない場合（デフォルトでope=1）
  return new RegExp(`\\/${path}\\/member_deck\\.action`).test(url) && 
         (!/[?&]ope=/.test(url) || /[?&]ope=1(&|$)/.test(url));
}

/**
 * デッキ編集ページ（従来のフォーム）かどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&...
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isDeckEditPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/member_deck\\.action\\?.*ope=2`).test(url);
}

/**
 * デッキ一覧ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isDeckListPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/member_deck\\.action\\?.*ope=4`).test(url);
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
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isCardSearchPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/card_search\\.action`).test(url);
}

/**
 * カード詳細ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=...
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isCardDetailPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/card_search\\.action\\?.*ope=2`).test(url);
}

/**
 * FAQ検索ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isFAQSearchPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/faq_search\\.action`).test(url);
}

/**
 * FAQ詳細ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=...
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isFAQDetailPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/faq_search\\.action\\?.*ope=5`).test(url);
}

/**
 * デッキ検索ページかどうかを判定
 * URL例: https://www.db.yugioh-card.com/yugiohdb/deck_search.action
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isDeckSearchPage(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`\\/${path}\\/deck_search\\.action`).test(url);
}

/**
 * 遊戯王公式DBサイト内かどうかを判定
 * @param gameType 判定対象のゲームタイプ（省略時は自動判定）
 */
export function isYugiohDBSite(gameType?: CardGameType): boolean {
  const url = window.location.href;
  const type = gameType || detectCardGameType(url);
  const path = getGamePath(type);
  return new RegExp(`^https:\\/\\/www\\.db\\.yugioh-card\\.com\\/${path}\\/`).test(url);
}
