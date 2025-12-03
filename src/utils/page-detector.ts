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
 * URL例:
 * - https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit
 * - https://www.db.yugioh-card.com/yugiohdb?request_locale=ja#/ytomo/edit
 * - https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?request_locale=ja
 *
 * パス部分は /yugiohdb または /yugiohdb/ の両方に対応
 * ハッシュ直前のUSP（?request_locale=ja等）も許容
 */
export function isVueEditPage(): boolean {
  const hashBase = window.location.hash.split('?')[0];

  // ハッシュが #/ytomo/edit であることを確認（直前のUSPは許容）
  if (hashBase !== '#/ytomo/edit') {
    return false;
  }

  // パス部分を確認
  // /yugiohdb または /yugiohdb/ （末尾の / は optional）
  // /rushdb または /rushdb/ （末尾の / は optional）
  const pathname = window.location.pathname;
  return /^\/(yugiohdb|rushdb)\/?$/.test(pathname);
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

/**
 * ページのHTMLから自分の cgid を取得
 * フッターメニューの「マイデッキ」リンクから取得する
 * @returns 自分の cgid、または null（未取得の場合）
 */
export function getMyDeckCgid(): string | null {
  // フッターメニューの「マイデッキ」リンクから cgid を取得
  // セレクタ：#footer_menu > ul > li.my.menu_my_decks.sab_menu > ul > li:nth-child(1) > a
  const myDeckLink = document.querySelector('#footer_menu > ul > li.my.menu_my_decks.sab_menu > ul > li:nth-child(1) > a');

  if (myDeckLink) {
    const href = myDeckLink.getAttribute('href');
    if (href) {
      const match = href.match(/cgid=([a-f0-9]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  console.warn('[YGO Helper] Unable to determine current user cgid from footer menu');
  return null;
}

/**
 * URLから表示しているデッキの cgid を取得
 * @returns デッキの cgid、または null
 */
export function getDeckCgid(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('cgid');
}

/**
 * 現在表示しているデッキが自分のものかどうかを判定
 * @returns 自分のデッキの場合は true、他人のデッキの場合は false、判定できない場合は false
 */
export function isOwnDeck(): boolean {
  const myCgid = getMyDeckCgid();
  const deckCgid = getDeckCgid();

  // cgid が取得できない場合は保守的に false を返す
  if (!myCgid || !deckCgid) {
    console.warn('[YGO Helper] Cannot determine deck ownership', { myCgid, deckCgid });
    return false;
  }

  return myCgid === deckCgid;
}
