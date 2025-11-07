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
  // デッキ表示ページのDOM構造を検証
  validateDeckDetailPageStructure(doc);

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
 * デッキ表示ページのDOM構造を検証する
 *
 * @param doc ドキュメント
 * @throws デッキ表示ページでない場合はエラー
 */
function validateDeckDetailPageStructure(doc: Document): void {
  // 1. #main980 > #article_body > #deck_detailtext > #detailtext_main の階層を検証
  const main980 = doc.querySelector('#main980');
  if (!main980) {
    throw new Error('#main980が見つかりません。デッキ表示ページではありません。');
  }

  const articleBody = main980.querySelector('#article_body');
  if (!articleBody) {
    throw new Error('#main980 > #article_bodyが見つかりません。デッキ表示ページではありません。');
  }

  const deckDetailtext = articleBody.querySelector('#deck_detailtext');
  if (!deckDetailtext) {
    throw new Error('#main980 > #article_body > #deck_detailtextが見つかりません。デッキ表示ページではありません。');
  }

  const detailtextMain = deckDetailtext.querySelector('#detailtext_main');
  if (!detailtextMain) {
    throw new Error('#main980 > #article_body > #deck_detailtext > #detailtext_mainが見つかりません。デッキ表示ページではありません。');
  }

  // 2. 存在するカードセクションの内部構造を検証（セクションの有無は検証しない）
  const sections = [
    { selector: '.t_body.mlist_m', name: 'モンスターカードセクション' },
    { selector: '.t_body.mlist_s', name: '魔法カードセクション' },
    { selector: '.t_body.mlist_t', name: '罠カードセクション' }
  ];

  const errors: string[] = [];

  for (const section of sections) {
    const tBody = detailtextMain.querySelector(section.selector);
    
    // セクションが存在しない場合はスキップ（エラーではない）
    if (!tBody) {
      continue;
    }
    
    // セクションが存在する場合、その内部構造を検証
    try {
      tBody.querySelectorAll('.t_row');
    } catch (e) {
      errors.push(`${section.name}内で.t_rowを検索できません`);
      continue;
    }

    // 最初のdiv.t_rowがあれば、その内部構造も検証
    const firstRow = tBody.querySelector('.t_row');
    if (firstRow) {
      const hasCardName = firstRow.querySelector('.card_name') !== null;
      const hasLinkValue = firstRow.querySelector('input.link_value') !== null;
      
      if (!hasCardName) {
        errors.push(`${section.name}の.t_row内に.card_nameが見つかりません`);
      }
      if (!hasLinkValue) {
        errors.push(`${section.name}の.t_row内にinput.link_valueが見つかりません`);
      }
    }
  }

  // 内部構造にエラーがある場合のみエラー
  if (errors.length > 0) {
    throw new Error(
      `デッキ表示ページのDOM構造が不正です:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  // 3. head配下からmetaタグを検証
  const head = doc.querySelector('head');
  if (!head) {
    throw new Error('head要素が見つかりません');
  }

  const descriptionMeta = head.querySelector('meta[name="description"]');
  const ogDescMeta = head.querySelector('meta[property="og:description"]');
  
  if (!descriptionMeta && !ogDescMeta) {
    throw new Error('head配下にデッキ名取得用のmetaタグが見つかりません');
  }

  // 4. body配下からh1タグを検証
  const body = doc.querySelector('body');
  if (!body) {
    throw new Error('body要素が見つかりません');
  }

  const h1Elements = body.querySelectorAll('h1');
  if (h1Elements.length === 0) {
    throw new Error('body配下にページタイトル（h1要素）が見つかりません');
  }

  // 5. デッキ番号の存在確認（JavaScriptコード内）
  const scriptText = doc.documentElement.innerHTML;
  const hasDno = scriptText.includes("$('#dno')") || scriptText.includes('dno=');
  
  if (!hasDno) {
    throw new Error('デッキ表示ページではありません。デッキ番号情報が見つかりません。');
  }
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

  // #main980 > #article_body > #deck_detailtext > #detailtext_main の階層を使用
  const detailtextMain = doc.querySelector('#main980 #article_body #deck_detailtext #detailtext_main');
  if (!detailtextMain) {
    return deckCards;
  }

  // セクションのdiv.t_bodyクラスを決定
  let selectors: string[] = [];
  if (sectionId === 'main') {
    // メインデッキは3種類のカードタイプ
    selectors = ['.t_body.mlist_m', '.t_body.mlist_s', '.t_body.mlist_t'];
  } else if (sectionId === 'extra') {
    // エクストラデッキ（Extra Deck見出しの後のdiv.t_body）
    const extraHeading = Array.from(detailtextMain.querySelectorAll('h3')).find(h3 => h3.textContent?.includes('Extra Deck'));
    if (extraHeading) {
      const extraContainer = extraHeading.closest('.deck_set') || extraHeading.closest('div');
      if (extraContainer) {
        const tBody = extraContainer.querySelector('.t_body');
        if (tBody) {
          const rows = tBody.querySelectorAll('.t_row');
          rows.forEach(row => {
            const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
            if (cardInfo) {
              deckCards.push({ card: cardInfo, quantity: 1 });
            }
          });
        }
      }
    }
    return deckCards;
  } else if (sectionId === 'side') {
    // サイドデッキ（Side Deck見出しの後のdiv.t_body）
    const sideHeading = Array.from(detailtextMain.querySelectorAll('h3')).find(h3 => h3.textContent?.includes('Side Deck'));
    if (sideHeading) {
      const sideContainer = sideHeading.closest('.deck_set') || sideHeading.closest('div');
      if (sideContainer) {
        const tBody = sideContainer.querySelector('.t_body');
        if (tBody) {
          const rows = tBody.querySelectorAll('.t_row');
          rows.forEach(row => {
            const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
            if (cardInfo) {
              deckCards.push({ card: cardInfo, quantity: 1 });
            }
          });
        }
      }
    }
    return deckCards;
  }

  // メインデッキの各セクションから行を取得
  selectors.forEach(selector => {
    const tBody = detailtextMain.querySelector(selector);
    if (!tBody) {
      return;
    }

    const rows = tBody.querySelectorAll('.t_row');

    rows.forEach(row => {
      const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (!cardInfo) {
        return;
      }

      // 枚数は常に1（div.t_rowでは枚数情報がカード毎に独立）
      deckCards.push({
        card: cardInfo,
        quantity: 1
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
