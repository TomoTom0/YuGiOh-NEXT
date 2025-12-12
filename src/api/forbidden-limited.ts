/**
 * 禁止制限リスト取得API
 *
 * 公式サイトから禁止制限情報を取得してパースする
 */

import type { ForbiddenLimitedList, LimitRegulation } from '../types/card';
import { getForbiddenLimitedEndpoint } from '../utils/url-builder';
import { detectCardGameType } from '../utils/page-detector';
import { safeQueryAs, isHTMLInputElement, isHTMLOptionElement } from '../utils/type-guards';

/**
 * 禁止制限ページのHTMLから制限情報を抽出する
 *
 * @param html 禁止制限ページのHTML
 * @param effectiveDate 適用日（YYYY-MM-DD形式）
 * @returns 禁止制限リスト情報
 */
export function parseForbiddenLimitedHtml(html: string, effectiveDate: string): ForbiddenLimitedList {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const regulations: Record<string, LimitRegulation> = {};

  // 禁止カードを抽出
  const forbiddenSection = doc.querySelector('#list_forbidden');
  if (forbiddenSection) {
    extractCardsFromSection(forbiddenSection, 'forbidden', regulations);
  }

  // 制限カードを抽出
  const limitedSection = doc.querySelector('#list_limited');
  if (limitedSection) {
    extractCardsFromSection(limitedSection, 'limited', regulations);
  }

  // 準制限カードを抽出
  const semiLimitedSection = doc.querySelector('#list_semi_limited');
  if (semiLimitedSection) {
    extractCardsFromSection(semiLimitedSection, 'semi-limited', regulations);
  }

  return {
    effectiveDate,
    regulations,
    fetchedAt: Date.now()
  };
}

/**
 * セクション内のカードを抽出してregulationsマップに追加する
 *
 * @param section セクション要素（#list_forbidden, #list_limited等）
 * @param regulation 制限種別
 * @param regulations 制限情報を格納するマップ
 */
function extractCardsFromSection(
  section: Element,
  regulation: LimitRegulation,
  regulations: Record<string, LimitRegulation>
): void {
  const cardRows = section.querySelectorAll('.t_row');

  for (const row of cardRows) {
    // カード詳細ページへのリンクからcidを抽出
    const linkInput = safeQueryAs('input.link_value', isHTMLInputElement, row);
    if (!linkInput?.value) {
      continue;
    }

    // URLパラメータからcidを抽出
    // 例: /yugiohdb/card_search.action?ope=2&cid=5195
    const match = linkInput.value.match(/[?&]cid=(\d+)/);
    if (match && match[1]) {
      const cid = match[1];
      regulations[cid] = regulation;
    }
  }
}

/**
 * 指定された日付の禁止制限リストをサーバーから取得する
 *
 * @param effectiveDate 適用日（YYYY-MM-DD形式）省略時は最新を取得
 * @returns 禁止制限リスト情報
 */
export async function fetchForbiddenLimitedList(effectiveDate?: string): Promise<ForbiddenLimitedList> {
  // url-builder 経由でエンドポイントを取得（request_locale は自動付与）
  const gameType = detectCardGameType();
  const baseUrl = getForbiddenLimitedEndpoint(gameType);

  const params = new URLSearchParams();
  if (effectiveDate) {
    params.set('forbiddenLimitedDate', effectiveDate);
  }

  const url = params.toString() ? `${baseUrl}&${params.toString()}` : baseUrl;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch forbidden/limited list: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // effectiveDateが指定されていない場合、HTMLから適用日を抽出
  const date = effectiveDate || extractEffectiveDateFromHtml(html);

  return parseForbiddenLimitedHtml(html, date);
}

/**
 * HTMLから適用日を抽出する
 *
 * @param html 禁止制限ページのHTML
 * @returns 適用日（YYYY-MM-DD形式）
 */
function extractEffectiveDateFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // selectタグから選択されているoptionを探す
  const selectedOption = safeQueryAs('select option[selected]', isHTMLOptionElement, doc);
  if (selectedOption?.value) {
    return selectedOption.value;
  }

  // 見つからない場合はデフォルトで最新の適用日を返す
  // (通常は1月1日、4月1日、7月1日、10月1日のいずれか)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-11 → 1-12

  // 直近の適用月を計算（1, 4, 7, 10のいずれか）
  let effectiveMonth: number;
  if (month >= 10) {
    effectiveMonth = 10;
  } else if (month >= 7) {
    effectiveMonth = 7;
  } else if (month >= 4) {
    effectiveMonth = 4;
  } else {
    effectiveMonth = 1;
  }

  return `${year}-${String(effectiveMonth).padStart(2, '0')}-01`;
}

/**
 * 次回の禁止制限適用日を計算する
 *
 * 禁止制限は通常1月、4月、7月、10月の1日に更新される
 *
 * @param currentDate 基準日（省略時は現在日時）
 * @returns 次回の適用日（YYYY-MM-DD形式）
 */
export function getNextEffectiveDate(currentDate?: Date): string {
  const now = currentDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-11 → 1-12

  // 次の適用月を計算
  let nextMonth: number;
  let nextYear: number;

  if (month < 4) {
    nextMonth = 4;
    nextYear = year;
  } else if (month < 7) {
    nextMonth = 7;
    nextYear = year;
  } else if (month < 10) {
    nextMonth = 10;
    nextYear = year;
  } else {
    nextMonth = 1;
    nextYear = year + 1;
  }

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}
