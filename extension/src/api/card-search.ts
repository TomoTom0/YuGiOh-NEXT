import { CardInfo, CardType } from '@/types/card';
import { detectCardType } from '@/content/card/detector';

const SEARCH_URL = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action';

/**
 * カードタイプをctypeパラメータに変換する
 */
function cardTypeToCtype(cardType?: CardType): string {
  if (!cardType) return '';
  switch (cardType) {
    case 'モンスター':
      return '1';
    case '魔法':
      return '2';
    case '罠':
      return '3';
    default:
      return '';
  }
}

/**
 * カード名で検索する
 *
 * @param keyword 検索キーワード
 * @param ctype カードタイプ（オプション）
 * @returns カード情報の配列
 */
export async function searchCardsByName(
  keyword: string,
  ctype?: CardType
): Promise<CardInfo[]> {
  try {
    const ctypeValue = cardTypeToCtype(ctype);
    const params = new URLSearchParams({
      ope: '1',
      sess: '1',
      keyword: keyword,
      stype: '1',
      othercon: '2',
      link_m: '2'
    });

    if (ctypeValue) {
      params.append('ctype', ctypeValue);
    } else {
      // ctypeが指定されていない場合は空文字列を追加
      params.append('ctype', '');
    }

    // その他の空パラメータを追加（公式サイトの仕様）
    const emptyParams = ['starfr', 'starto', 'pscalefr', 'pscaleto', 'linkmarkerfr', 'linkmarkerto', 'atkfr', 'atkto', 'deffr', 'defto'];
    emptyParams.forEach(param => {
      params.append(param, '');
    });

    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return parseSearchResults(doc);
  } catch (error) {
    console.error('Failed to search cards by name:', error);
    return [];
  }
}

/**
 * カードIDで検索する
 *
 * @param cardId カードID
 * @returns カード情報、見つからない場合はnull
 */
export async function searchCardById(cardId: string): Promise<CardInfo | null> {
  try {
    const params = new URLSearchParams({
      ope: '2',
      cid: cardId,
      request_locale: 'ja'
    });

    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const results = parseSearchResults(doc);
    const firstResult = results[0];
    return firstResult !== undefined ? firstResult : null;
  } catch (error) {
    console.error('Failed to search card by ID:', error);
    return null;
  }
}

/**
 * 検索結果ページからカード情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns カード情報の配列
 */
function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];
  const rows = doc.querySelectorAll('.t_row');

  rows.forEach(row => {
    const cardInfo = parseSearchResultRow(row as HTMLElement);
    if (cardInfo) {
      cards.push(cardInfo);
    }
  });

  return cards;
}

/**
 * 検索結果の行からカード情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @returns カード情報、パースできない場合はnull
 */
function parseSearchResultRow(row: HTMLElement): CardInfo | null {
  // カードタイプを検出
  const cardType = detectCardType(row);
  if (!cardType) {
    return null;
  }

  // カードIDを取得
  const cidInput = row.querySelector('input.cid') as HTMLInputElement;
  if (!cidInput || !cidInput.value) {
    return null;
  }
  const cardId = cidInput.value;

  // カード名を取得
  const nameElement = row.querySelector('.card_name');
  if (!nameElement || !nameElement.textContent) {
    return null;
  }
  const name = nameElement.textContent.trim();

  // 画像IDを取得（オプション、デフォルト '1'）
  const langInput = row.querySelector('input.lang') as HTMLInputElement;
  const imageId = langInput?.value || '1';

  return {
    name,
    cardId,
    cardType,
    imageId
  };
}
