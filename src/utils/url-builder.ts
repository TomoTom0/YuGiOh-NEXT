/**
 * URLビルダーユーティリティ
 *
 * OCG/Rush Duel両対応のURL生成関数を提供
 */

import type { CardGameType } from '../types/settings';
import { getGamePath } from './page-detector';
import { detectLanguage } from './language-detector';

/**
 * ベースURL
 */
const BASE_URL = 'https://www.db.yugioh-card.com';

/**
 * APIパスのタイプ定義
 */
type ApiPathType = 'card_search' | 'faq_search' | 'member_deck_new' | 'member_deck_other' | 'forbidden_limited' | 'deck_search' | 'get_image' | 'other';

/**
 * APIパスからタイプを判定
 * member_deck は ope パラメータで区別：
 * - ope=6（新規作成）: member_deck_new -> request_locale なし
 * - ope=4（デッキ一覧取得）: deck_search -> request_locale なし
 * - その他: member_deck_other -> request_locale 付与
 *
 * その他のエンドポイント：
 * - get_image.action: request_locale 付与
 */
function getApiPathType(path: string): ApiPathType {
  if (path.includes('card_search')) return 'card_search';
  if (path.includes('faq_search')) return 'faq_search';
  if (path.includes('get_image')) return 'get_image';
  if (path.includes('member_deck')) {
    // ope=6 の場合は新規作成（request_locale なし）
    if (path.includes('ope=6')) return 'member_deck_new';
    // ope=4 の場合はデッキ一覧取得（request_locale なし）
    if (path.includes('ope=4')) return 'deck_search';
    // それ以外は表示等（request_locale 付与）
    return 'member_deck_other';
  }
  if (path.includes('forbidden_limited')) return 'forbidden_limited';
  if (path.includes('deck_search')) return 'deck_search';
  return 'other';
}

/**
 * APIのURLを構築（request_locale を自動付与）
 *
 * request_locale 付与ルール：
 * - デッキ新規作成（member_deck.action?ope=2）: 付与しない
 * - デッキリスト取得（deck_search.action）: 付与しない
 * - FAQ系統（faq_search）: 必ず 'ja' を付与
 * - その他: 現在の言語を自動付与
 *
 * @param path APIパス（例: 'faq_search.action' や 'card_search.action'）
 * @param gameType カードゲームタイプ
 * @param params URLSearchParams（オプション、既存パラメータがあれば渡す）
 * @returns 完全なURL（必要に応じて request_locale を含む）
 */
export function buildApiUrl(path: string, gameType: CardGameType, params?: URLSearchParams): string {
  const gamePath = getGamePath(gameType);
  const apiPathType = getApiPathType(path);

  // リクエストローカルを付与しないケース：
  // - デッキ新規作成（member_deck_new）
  // - デッキリスト取得（deck_search）
  const shouldAddLocale =
    apiPathType !== 'member_deck_new' &&
    apiPathType !== 'deck_search';

  const url = new URL(`${BASE_URL}/${gamePath}/${path}`);

  // 呼び出し側から提供されたパラメータをマージ
  if (params) {
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
  }

  if (!shouldAddLocale) {
    // request_locale を付与しない（既に存在する場合は削除）
    url.searchParams.delete('request_locale');
    return url.toString();
  }

  // request_locale が既に存在する場合はスキップ
  if (url.searchParams.has('request_locale')) {
    return url.toString();
  }

  // request_locale を付与
  if (apiPathType === 'faq_search') {
    // FAQ系統は必ず 'ja' を付与
    url.searchParams.set('request_locale', 'ja');
  } else {
    // その他は現在の言語を付与
    const lang = detectLanguage(document);
    url.searchParams.set('request_locale', lang);
  }

  return url.toString();
}


/**
 * 相対URLパスから完全なURLを生成
 * @param relativePath 相対パス（例: '/yugiohdb/get_image.action?...'）
 * @returns 完全なURL
 */
export function buildFullUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  return `${BASE_URL}${relativePath}`;
}

/**
 * デッキ操作APIのエンドポイントを取得
 * @param gameType カードゲームタイプ
 * @returns APIエンドポイントURL
 */
export function getDeckApiEndpoint(gameType: CardGameType): string {
  return buildApiUrl('member_deck.action', gameType);
}

/**
 * カード検索APIのエンドポイントを取得
 * @param gameType カードゲームタイプ
 * @returns APIエンドポイントURL
 */
export function getCardSearchEndpoint(gameType: CardGameType): string {
  return buildApiUrl('card_search.action', gameType);
}

/**
 * FAQ検索APIのエンドポイントを取得
 * @param gameType カードゲームタイプ
 * @returns APIエンドポイントURL
 */
export function getFaqSearchEndpoint(gameType: CardGameType): string {
  return buildApiUrl('faq_search.action', gameType);
}

/**
 * デッキ検索ページのURLを取得
 * @param gameType カードゲームタイプ
 * @param locale ロケール（デフォルト: 'ja'）
 * @returns デッキ検索ページURL
 */
export function getDeckSearchPageUrl(gameType: CardGameType, locale: string = 'ja'): string {
  return buildApiUrl(`deck_search.action?request_locale=${locale}`, gameType);
}

/**
 * カード検索フォームのURLを取得
 * @param gameType カードゲームタイプ
 * @returns カード検索フォームURL
 */
export function getCardSearchFormUrl(gameType: CardGameType): string {
  return buildApiUrl('card_search.action?ope=1', gameType);
}

/**
 * 画像パーツのベースURLを取得
 * @param gameType カードゲームタイプ
 * @returns 画像パーツベースURL
 */
export function getImagePartsBaseUrl(gameType: CardGameType): string {
  const gamePath = getGamePath(gameType);
  return `${BASE_URL}/${gamePath}/external/image/parts`;
}

/**
 * Vue編集画面のURLを取得
 * @param gameType カードゲームタイプ
 * @param dno デッキ番号（オプション）
 * @param locale ロケール（オプション）。指定されない場合は detectLanguage() で自動取得すること
 * @returns Vue編集画面URL
 *
 * 例：
 * - getVueEditUrl('ocg') -> 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
 * - getVueEditUrl('ocg', 1) -> 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=1'
 * - getVueEditUrl('ocg', undefined, 'ja') -> 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=ja#/ytomo/edit'
 * - getVueEditUrl('ocg', 1, 'ja') -> 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=ja&dno=1#/ytomo/edit'
 */
export function getVueEditUrl(gameType: CardGameType, dno?: number, locale?: string): string {
  const gamePath = getGamePath(gameType);
  const params = new URLSearchParams();

  if (locale) {
    params.append('request_locale', locale);
  }
  if (dno) {
    params.append('dno', dno.toString());
  }

  const base = `${BASE_URL}/${gamePath}`;
  const queryString = params.toString();
  const hash = '#/ytomo/edit';

  return queryString ? `${base}?${queryString}${hash}` : `${base}${hash}`;
}

/**
 * デッキ表示ページのURLを取得
 * @param cgid セッションID
 * @param dno デッキ番号
 * @param gameType カードゲームタイプ
 * @returns デッキ表示ページURL
 */
export function getDeckDisplayUrl(
  cgid: string,
  dno: number,
  gameType: CardGameType
): string {
  return buildApiUrl(`member_deck.action?ope=1&cgid=${cgid}&dno=${dno}`, gameType);
}

/**
 * 禁止・制限リストAPIのエンドポイントを取得
 * @param gameType カードゲームタイプ
 * @returns APIエンドポイントURL
 */
export function getForbiddenLimitedEndpoint(gameType: CardGameType): string {
  return buildApiUrl('forbidden_limited.action', gameType);
}

