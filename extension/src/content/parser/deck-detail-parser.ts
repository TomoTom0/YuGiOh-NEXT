import { DeckCard } from '@/types/card';
import { DeckInfo } from '@/types/deck';
import { parseSearchResultRow, extractImageInfo } from '@/api/card-search';

/**
 * デッキ詳細ページ（表示ページ、ope=1）からデッキ情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント（表示ページ）
 * @returns デッキ情報
 *
 * 注意: 表示ページのHTMLから情報を取得します。
 * カード情報は検索結果ページと同じ構造（tr.row）からパースします。
 */
export function parseDeckDetail(doc: Document): DeckInfo {
  // デッキ番号をURLから取得
  const dno = extractDnoFromPage(doc);

  // デッキ名をmetaタグから取得
  const name = extractDeckNameFromMeta(doc);

  // 画像情報を抽出（JavaScriptから）
  const imageInfoMap = extractImageInfo(doc);

  // メインデッキのカードを抽出
  const mainDeck = parseCardSection(doc, imageInfoMap, 'main');

  // エクストラデッキのカードを抽出
  const extraDeck = parseCardSection(doc, imageInfoMap, 'extra');

  // サイドデッキのカードを抽出
  const sideDeck = parseCardSection(doc, imageInfoMap, 'side');

  // 公開/非公開をタイトルから取得
  const isPublic = extractIsPublicFromTitle(doc);

  return {
    dno,
    name,
    mainDeck,
    extraDeck,
    sideDeck,
    isPublic
  };
}

/**
 * カードセクションからカード情報を抽出する
 *
 * @param doc ドキュメント
 * @param imageInfoMap 画像情報マップ
 * @param sectionId セクションID ('main' | 'extra' | 'side')
 * @returns デッキ内カード配列
 */
function parseCardSection(
  doc: Document,
  imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>,
  sectionId: 'main' | 'extra' | 'side'
): DeckCard[] {
  const deckCards: DeckCard[] = [];

  // セクションのテーブルIDを決定
  let tableIds: string[] = [];
  if (sectionId === 'main') {
    // メインデッキは複数のテーブルに分かれている
    tableIds = ['#monster_list', '#spell_list', '#trap_list'];
  } else if (sectionId === 'extra') {
    tableIds = ['#extra_list'];
  } else if (sectionId === 'side') {
    tableIds = ['#side_list'];
  }

  // 各テーブルから行を取得
  tableIds.forEach(tableId => {
    const table = doc.querySelector(tableId);
    if (!table) {
      return;
    }

    const rows = table.querySelectorAll('tr.row');

    rows.forEach(row => {
      // 既存の検索結果パーサーを再利用
      const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (!cardInfo) {
        return;
      }

      // 枚数を取得（td.num span）
      const numElem = row.querySelector('td.num span');
      const quantity = numElem?.textContent ? parseInt(numElem.textContent.trim(), 10) : 1;

      if (isNaN(quantity) || quantity <= 0) {
        return;
      }

      deckCards.push({
        card: cardInfo,
        quantity
      });
    });
  });

  return deckCards;
}

/**
 * ページからdnoを抽出する
 *
 * @param doc ドキュメント
 * @returns デッキ番号
 */
function extractDnoFromPage(doc: Document): number {
  // JavaScriptコードから $('#dno').val('4') を探す
  const scriptText = doc.documentElement.innerHTML;
  const dnoMatch = scriptText.match(/\$\('#dno'\)\.val\('(\d+)'\)/);

  if (dnoMatch && dnoMatch[1]) {
    return parseInt(dnoMatch[1], 10);
  }

  // URLパラメータから取得を試みる
  const urlMatch = scriptText.match(/dno=(\d+)/);
  if (urlMatch && urlMatch[1]) {
    return parseInt(urlMatch[1], 10);
  }

  return 0;
}

/**
 * metaタグからデッキ名を抽出する
 *
 * @param doc ドキュメント
 * @returns デッキ名
 */
function extractDeckNameFromMeta(doc: Document): string {
  // <meta name="description" content="完全版テスト成功/ "> から取得
  const descriptionMeta = doc.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    const content = descriptionMeta.getAttribute('content');
    if (content && content.trim()) {
      // "デッキ名/ " の形式から "デッキ名" を抽出
      const name = content.replace(/\s*\/.*$/, '').trim();
      if (name) {
        return name;
      }
    }
  }

  // <meta property="og:description" content="..."> から取得
  const ogDescMeta = doc.querySelector('meta[property="og:description"]');
  if (ogDescMeta) {
    const content = ogDescMeta.getAttribute('content');
    if (content && content.trim()) {
      // "デッキ名 | 遊戯王ニューロン..." の形式から "デッキ名" を抽出
      const parts = content.split('|');
      if (parts.length > 0 && parts[0]) {
        const name = parts[0].trim();
        if (name) {
          return name;
        }
      }
    }
  }

  return 'デッキ';
}

/**
 * タイトルから公開/非公開を判定する
 *
 * @param doc ドキュメント
 * @returns 公開デッキの場合true
 */
function extractIsPublicFromTitle(doc: Document): boolean {
  // <h1>【 非公開 】</h1> の存在を確認
  const h1Elements = doc.querySelectorAll('h1');
  for (const h1 of h1Elements) {
    const text = h1.textContent || '';
    if (text.includes('非公開')) {
      return false;
    }
    if (text.includes('公開')) {
      return true;
    }
  }

  // デフォルトは非公開
  return false;
}
