import { DeckCardRef } from '@/types/card';
import { DeckInfo } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';
import { detectLanguage } from '@/utils/language-detector';
import {
  DeckTypeValue,
  DeckStyleValue,
  DeckCategory,
  DECK_TYPE_LABEL_TO_VALUE,
  DECK_STYLE_LABEL_TO_VALUE,
} from '@/types/deck-metadata';
import { parseSearchResultRow, extractImageInfo } from '@/api/card-search';
import { getDeckMetadata } from '@/utils/deck-metadata-loader';
import { mappingManager } from '@/utils/mapping-manager';

/**
 * parseCardSection の戻り値型
 */
interface ParseCardSectionResult {
  cards: DeckCardRef[];
  skippedCount: number;
  skippedCards: Array<{ cid: string; name: string; lang: string }>;
}

/**
 * カテゴリラベル（日本語）をIDに変換
 */
export function convertCategoryLabelsToIds(labels: string[], metadata: any): string[] {
  if (!metadata || !metadata.categories) {
    return [];
  }
  
  const labelToId: Record<string, string> = {};
  metadata.categories.forEach((cat: any) => {
    labelToId[cat.label] = cat.value;
  });
  
  return labels.map(label => labelToId[label]).filter(id => id !== undefined);
}

/**
 * タグラベル（日本語）をIDに変換
 */
export function convertTagLabelsToIds(labels: string[], metadata: any): string[] {
  if (!metadata || !metadata.tags) {
    return [];
  }
  
  const labelToId: Record<string, string> = {};
  Object.entries(metadata.tags).forEach(([id, label]) => {
    labelToId[label as string] = id;
  });
  
  return labels.map(label => labelToId[label]).filter(id => id !== undefined);
}

/**
 * デッキ詳細ページ（表示ページ、ope=1）からデッキ情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント（表示ページ）
 * @returns デッキ情報
 *
 * 注意: 表示ページのHTMLから情報を取得します。
 * カード情報は検索結果ページと同じ構造（tr.row）からパースします。
 */
export async function parseDeckDetail(doc: Document): Promise<DeckInfo> {
  // デッキ表示ページのDOM構造を検証
  validateDeckDetailPageStructure(doc);

  // **重要**: マッピング情報を確保してからカード解析を実行
  // ページの言語を検出して、その言語のマッピングをロード
  const lang = detectLanguage(doc);
  console.log(`[parseDeckDetail] Ensuring mappings for language: ${lang}`);
  await mappingManager.ensureMappingForLanguage(lang);
  console.log(`[parseDeckDetail] Mappings ensured, proceeding with card parsing`);

  // デッキ番号をURLから取得
  const dno = extractDnoFromPage(doc);

  // デッキ名をmetaタグから取得
  const name = extractDeckNameFromMeta(doc);

  // 画像情報を抽出（JavaScriptから）
  const imageInfoMap = extractImageInfo(doc);

  // ciidごとの枚数情報を抽出（HTMLの<img>タグから）
  const ciidCountMap = extractCiidCounts(doc);

  // メインデッキのカードを抽出
  const mainDeckResult = parseCardSection(doc, imageInfoMap, ciidCountMap, 'main');

  // エクストラデッキのカードを抽出
  const extraDeckResult = parseCardSection(doc, imageInfoMap, ciidCountMap, 'extra');

  // サイドデッキのカードを抽出
  const sideDeckResult = parseCardSection(doc, imageInfoMap, ciidCountMap, 'side');

  // スキップされたカード数の合計
  const skippedCardsCount = mainDeckResult.skippedCount + extraDeckResult.skippedCount + sideDeckResult.skippedCount;

  // スキップされたカード詳細情報の合計
  const skippedCards = [
    ...mainDeckResult.skippedCards,
    ...extraDeckResult.skippedCards,
    ...sideDeckResult.skippedCards
  ];

  // 公開/非公開をタイトルから取得
  const isPublic = extractIsPublicFromTitle(doc);

  // cgidを取得（公開デッキの場合）
  const cgid = extractCgidFromPage(doc);

  // デッキタイプ、デッキスタイル（オプショナル）
  const deckType = extractDeckType(doc);
  const deckStyle = extractDeckStyle(doc);

  // カテゴリ、タグ、コメント、デッキコード（必須）
  const categoryLabels = extractCategory(doc);
  const tagLabels = extractTags(doc);
  const comment = extractComment(doc);
  const deckCode = extractDeckCode(doc);
  
  // 日本語ラベル→IDに変換（メタデータは1回だけ取得）
  const metadata = await getDeckMetadata();
  const category = convertCategoryLabelsToIds(categoryLabels, metadata);
  const tags = convertTagLabelsToIds(tagLabels, metadata);

  return {
    dno,
    name,
    mainDeck: mainDeckResult.cards,
    extraDeck: extraDeckResult.cards,
    sideDeck: sideDeckResult.cards,
    skippedCardsCount,
    skippedCards,
    isPublic,
    cgid,
    deckType,
    deckStyle,
    category,
    tags,
    comment,
    deckCode
  };
}

/**
 * デッキ表示ページのDOM構造を検証する
 *
 * @param doc ドキュメント
 * @throws デッキ表示ページでない場合はエラー
 */
export function validateDeckDetailPageStructure(doc: Document): void {
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
 * HTMLの<img>タグからciidごとの枚数情報とimgHash情報を抽出する
 *
 * @param doc ドキュメント
 * @returns cid -> ciid -> { count, imgHash } のマップ
 */
export function extractCiidCounts(doc: Document): Map<string, Map<string, { count: number; imgHash: string }>> {
  const ciidCountMap = new Map<string, Map<string, { count: number; imgHash: string }>>();

  // カードタイプごとのクラス名
  const cardTypes = ['monster', 'spell', 'trap', 'extra'];

  cardTypes.forEach(type => {
    const imgs = doc.querySelectorAll(`img[class*="card_image_${type}_"]`);

    imgs.forEach(img => {
      const htmlImg = img as HTMLImageElement;
      const className = htmlImg.className;
      const regex = new RegExp(`card_image_${type}_(\\d+)_(\\d+)`);
      const match = className.match(regex);

      if (match && match[1] && match[2]) {
        const index = match[1];
        const ciid = match[2];

        // このindexのカードのcidとimgHashをスクリプトから取得
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || '';
          // パターン: .card_image_TYPE_INDEX_CIID ... cid=123&ciid=1&enc=xxxxx
          const cidRegex = new RegExp(`\\.card_image_${type}_${index}_${ciid}.*?cid=(\\d+)&ciid=${ciid}(?:&(?:amp;)?enc=([^&'"\\s]+))?`, 'g');
          const cidMatch = cidRegex.exec(content);

          if (cidMatch && cidMatch[1]) {
            const cid = cidMatch[1];
            const imgHash = cidMatch[2] || `${cid}_1_1_1`;

            if (!ciidCountMap.has(cid)) {
              ciidCountMap.set(cid, new Map());
            }
            const ciidMap = ciidCountMap.get(cid)!;
            const existing = ciidMap.get(ciid);
            if (existing) {
              ciidMap.set(ciid, { count: existing.count + 1, imgHash: existing.imgHash });
            } else {
              ciidMap.set(ciid, { count: 1, imgHash });
            }
          }
        });
      }
    });
  });

  return ciidCountMap;
}

/**
 * カードセクションからカード情報を抽出する
 *
 * @param doc ドキュメント
 * @param imageInfoMap 画像情報マップ
 * @param ciidCountMap ciidごとの枚数情報マップ
 * @param sectionId セクションID ('main' | 'extra' | 'side')
 * @returns デッキ内カード配列
 */
interface ParseCardSectionResult {
  cards: DeckCardRef[];
  skippedCount: number;
}

export function parseCardSection(
  doc: Document,
  imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>,
  ciidCountMap: Map<string, Map<string, { count: number; imgHash: string }>>,
  sectionId: 'main' | 'extra' | 'side'
): ParseCardSectionResult {
  const deckCardRefs: DeckCardRef[] = [];
  let skippedCount = 0;
  const skippedCards: Array<{ cid: string; name: string; lang: string }> = [];
  const tempCardDB = getTempCardDB();
  const lang = detectLanguage(doc);

  // #main980 > #article_body > #deck_detailtext までの階層を取得
  const deckDetailtext = doc.querySelector('#main980 #article_body #deck_detailtext');
  if (!deckDetailtext) {
    return {
      cards: deckCardRefs,
      skippedCount,
      skippedCards
    };
  }

  // セクションごとに異なる親要素を使用
  let parentSelector: string;
  if (sectionId === 'main') {
    parentSelector = '#detailtext_main';
  } else if (sectionId === 'extra') {
    parentSelector = '#detailtext_ext';
  } else { // side
    parentSelector = '#detailtext_side';
  }

  const parentElement = deckDetailtext.querySelector(parentSelector);
  if (!parentElement) {
    return {
      cards: deckCardRefs,
      skippedCount,
      skippedCards
    };
  }

  // すべての.listを取得
  const lists = parentElement.querySelectorAll('.list');

  lists.forEach((list) => {
    // .list内のすべての.t_bodyを取得（モンスター、魔法、罠）
    const tBodies = list.querySelectorAll('.t_body');
    if (tBodies.length === 0) {
      return;
    }

    tBodies.forEach((tBody) => {
      const rows = tBody.querySelectorAll('.t_row');

      rows.forEach((row) => {
        // カード名を取得（エラーログ用）
        const cardNameElem = (row as HTMLElement).querySelector('.card_info_name');
        const cardName = cardNameElem?.textContent || 'UNKNOWN';

        // 未発売カード（card_back.png）のチェック
        const cardImgElem = (row as HTMLElement).querySelector('img[src*="card_back.png"]');
        if (cardImgElem) {
          console.warn(
            `[parseCardSection] Card "${cardName}" is not released in ${lang}, skipping this card (showing card_back.png)`
          );
          skippedCount++;

          // スキップされたカード情報を記録
          // CardInfoを先にパースして ciid を取得（未発売でも基本情報は取得可能）
          const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
          if (cardInfo) {
            skippedCards.push({
              cid: cardInfo.cardId,
              name: cardName,
              lang
            });
          }

          return;
        }

        const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
        if (!cardInfo) {
          console.error(`[parseCardSection] Failed to parse card: ${cardName} (section: ${sectionId})`);
          return;
        }

        // Diagnostic logging: confirm whether parsed CardInfo contains text
        // no-op: parsing verified in earlier debugging

        const cid = cardInfo.cardId;
        const ciidCounts = ciidCountMap.get(cid);

        if (!ciidCounts || ciidCounts.size === 0) {
          // ciid情報がない場合は、従来通り1レコードとして追加
          const quantitySpan = (row as HTMLElement).querySelector('.cards_num_set > span');
          const quantity = quantitySpan?.textContent ? parseInt(quantitySpan.textContent.trim(), 10) : 1;

          // TempCardDBにカード情報を登録
          tempCardDB.set(cid, cardInfo);

          deckCardRefs.push({
            cid,
            ciid: cardInfo.ciid,
            lang,
            quantity
          });
        } else if (ciidCounts.size === 1) {
          // 単一ciidの場合も1レコード
          const entry = Array.from(ciidCounts.entries())[0];
          if (entry) {
            const [ciid, info] = entry;
            
            // TempCardDBにカード情報を登録（imgs情報を更新）
            const cardWithImgs = {
              ...cardInfo,
              ciid,
              imgs: [{ ciid, imgHash: info.imgHash }]
            };
            tempCardDB.set(cid, cardWithImgs);

            deckCardRefs.push({
              cid,
              ciid,
              lang,
              quantity: info.count
            });
          }
        } else {
          // 複数ciidの場合、ciidごとに別レコードとして追加
          // imgsには全ciidの情報を含める
          const allImgs = Array.from(ciidCounts.entries()).map(([ciid, info]) => ({
            ciid,
            imgHash: info.imgHash
          }));
          
          const cardWithAllImgs = {
            ...cardInfo,
            imgs: allImgs
          };
          tempCardDB.set(cid, cardWithAllImgs);

          ciidCounts.forEach((info, ciid) => {
            deckCardRefs.push({
              cid,
              ciid,
              lang,
              quantity: info.count
            });
          });
        }
      });
    });
  });

  return {
    cards: deckCardRefs,
    skippedCount,
    skippedCards
  };
}

/**
 * ページからdnoを抽出する
 *
 * @param doc ドキュメント
 * @returns デッキ番号
 */
export function extractDnoFromPage(doc: Document): number {
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
export function extractDeckNameFromMeta(doc: Document): string {
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
export function extractIsPublicFromTitle(doc: Document): boolean {
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

/**
 * ページからcgidを抽出する
 *
 * @param doc ドキュメント
 * @returns cgid（見つからない場合はundefined）
 */
export function extractCgidFromPage(doc: Document): string | undefined {
  // HTMLのテキストコンテンツからcgid=...を探す
  const scriptText = doc.documentElement.innerHTML;
  const cgidMatch = scriptText.match(/cgid=([a-f0-9]+)/);

  if (cgidMatch && cgidMatch[1]) {
    return cgidMatch[1];
  }

  return undefined;
}

/**
 * デッキタイプを抽出する
 *
 * @param doc ドキュメント
 * @returns デッキタイプ
 */
export function extractDeckType(doc: Document): DeckTypeValue | undefined {
  // <dt><span>デッキタイプ</span></dt><dd class="text_set"><span>OCG（マスタールール）</span></dd>
  const dtElements = doc.querySelectorAll('dt');
  for (const dt of dtElements) {
    if (dt.textContent?.includes('デッキタイプ')) {
      const dd = dt.nextElementSibling;
      if (dd?.classList.contains('text_set')) {
        const span = dd.querySelector('span');
        const label = span?.textContent?.trim();
        if (label) {
          // 表示名からvalue値に変換
          return DECK_TYPE_LABEL_TO_VALUE[label];
        }
      }
    }
  }
  return undefined;
}

/**
 * デッキスタイルを抽出する
 *
 * @param doc ドキュメント
 * @returns デッキスタイル
 */
export function extractDeckStyle(doc: Document): DeckStyleValue | undefined {
  // <dl class="MD_deck_style"><dt><span>デッキスタイル</span></dt><dd class="text_set">...</dd></dl>
  const dl = doc.querySelector('dl.MD_deck_style');
  if (dl) {
    const dd = dl.querySelector('dd.text_set');
    const label = dd?.textContent?.trim();
    if (label) {
      // 表示名からvalue値に変換
      return DECK_STYLE_LABEL_TO_VALUE[label];
    }
  }
  return undefined;
}

/**
 * カテゴリを抽出する
 *
 * @param _doc ドキュメント
 * @returns カテゴリID配列
 */
export function extractCategory(doc: Document): DeckCategory {
  // <dd class="regist_category"><span>マジェスペクター</span><span>竜剣士</span></dd>
  const dd = doc.querySelector('dd.regist_category');
  if (dd) {
    // フィールドが存在する場合、span要素からカテゴリ名を抽出
    const spans = dd.querySelectorAll('span');
    const categories: string[] = [];
    spans.forEach(span => {
      const text = span.textContent?.trim();
      if (text) {
        categories.push(text);
      }
    });
    return categories;
  }
  // フィールドが存在しない場合も空配列を返す
  return [];
}

/**
 * 登録タグを抽出する
 *
 * @param doc ドキュメント
 * @returns 登録タグ（タグ名の配列）
 */
export function extractTags(doc: Document): string[] {
  // <dd class="regist_tag"><span>大会優勝デッキ</span><span>...</span></dd>
  const dd = doc.querySelector('dd.regist_tag');
  if (dd) {
    // フィールドが存在する場合、span要素からタグ名を抽出
    const spans = dd.querySelectorAll('span');
    const tags: string[] = [];
    spans.forEach(span => {
      const text = span.textContent?.trim();
      if (text) {
        tags.push(text);
      }
    });
    return tags;
  }
  // フィールドが存在しない場合も空配列を返す
  return [];
}

/**
 * コメントを抽出する
 *
 * @param doc ドキュメント
 * @returns コメント
 */
export function extractComment(doc: Document): string {
  // <dt><span>コメント</span></dt><dd class="text_set"><span class="biko">...</span></dd>
  const dtElements = doc.querySelectorAll('dt');
  for (const dt of dtElements) {
    if (dt.textContent?.includes('コメント')) {
      const dd = dt.nextElementSibling;
      if (dd?.classList.contains('text_set')) {
        const span = dd.querySelector('span.biko');
        // フィールドが存在する場合は空文字列でも返す
        if (span) {
          return span.textContent?.trim() ?? "";
        }
      }
    }
  }
  // フィールドが存在しない場合も空文字列を返す
  return "";
}

/**
 * デッキコードを抽出する
 *
 * @param _doc ドキュメント
 * @returns デッキコード
 */
export function extractDeckCode(doc: Document): string {
  // <dt><span>デッキコード</span></dt><dd class="a_set">...</dd>
  const dtElements = doc.querySelectorAll('dt');
  for (const dt of dtElements) {
    if (dt.textContent?.includes('デッキコード')) {
      const dd = dt.nextElementSibling;
      if (dd?.classList.contains('a_set')) {
        // フィールドが存在する場合、デッキコードのテキストを探す
        // ボタンやリンク以外のテキストノードを取得
        const text = dd.textContent?.trim() ?? "";
        // 「デッキコードを発行」のようなボタンテキストを除外
        if (text.includes('発行')) {
          return "";
        }
        return text;
      }
    }
  }
  // フィールドが存在しない場合も空文字列を返す
  return "";
}
