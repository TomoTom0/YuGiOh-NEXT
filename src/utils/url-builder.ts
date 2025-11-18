/**
 * URLビルダーユーティリティ
 * 
 * OCG/Rush Duel両対応のURL生成関数を提供
 */

import type { CardGameType } from '../types/settings';
import { getGamePath } from './page-detector';

/**
 * ベースURL
 */
const BASE_URL = 'https://www.db.yugioh-card.com';

/**
 * APIのベースURLを取得
 * @param path APIパス（例: 'member_deck.action'）
 * @param gameType カードゲームタイプ
 * @returns 完全なURL
 */
export function buildApiUrl(path: string, gameType: CardGameType): string {
  const gamePath = getGamePath(gameType);
  return `${BASE_URL}/${gamePath}/${path}`;
}

/**
 * カード画像URLを生成
 * @param cid カードID
 * @param ciid カード画像ID
 * @param imgHash 画像ハッシュ
 * @param gameType カードゲームタイプ
 * @returns 画像URL
 */
export function buildImageUrl(
  cid: number,
  ciid: number,
  imgHash: string,
  gameType: CardGameType
): string {
  const gamePath = getGamePath(gameType);
  return `${BASE_URL}/${gamePath}/get_image.action?type=1&cid=${cid}&ciid=${ciid}&enc=${imgHash}&osplang=1`;
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
 * @returns Vue編集画面URL
 */
export function getVueEditUrl(gameType: CardGameType, dno?: number): string {
  const gamePath = getGamePath(gameType);
  const base = `${BASE_URL}/${gamePath}/#/ytomo/edit`;
  return dno ? `${base}?dno=${dno}` : base;
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
