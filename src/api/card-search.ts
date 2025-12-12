import {
  CardInfo,
  CardType,
  CardBase,
  MonsterCard,
  SpellCard,
  TrapCard,
  LevelType,
  Race,
  MonsterType,
  Attribute,
  SpellEffectType,
  TrapEffectType,
  CardDetail,
  PackInfo,
  LimitRegulation,
  CardTableC
} from '@/types/card';
import { getCardFAQList } from './card-faq';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import { getTempCardDB } from '@/utils/temp-card-db';
import { safeQueryAs, isHTMLInputElement, isHTMLImageElement } from '@/utils/type-guards';
import { safeQuery } from '@/utils/safe-dom-query';
import {
  ATTRIBUTE_ID_TO_PATH,
  SPELL_EFFECT_TYPE_ID_TO_NAME,
  TRAP_EFFECT_TYPE_ID_TO_NAME
} from '@/types/card-maps';
import { detectCardType } from '@/content/card/detector';
import { detectLanguage } from '@/utils/language-detector';
import { mappingManager } from '@/utils/mapping-manager';
import { isSameDay } from '@/utils/date-utils';
import { detectCardGameType } from '@/utils/page-detector';
import { buildApiUrl } from '@/utils/url-builder';
import { queuedFetch } from '@/utils/request-queue';
import {
  ATTRIBUTE_PATH_TO_ID,
  SPELL_EFFECT_TYPE_PATH_TO_ID,
  TRAP_EFFECT_TYPE_PATH_TO_ID,
  getAttributeAttrValue,
  getRaceSpeciesValue,
  getMonsterTypeOtherValue,
  getSpellEffectTypeEffeValue,
  getTrapEffectTypeEffeValue,
  cardTypeToCtype,
  SORT_ORDER_TO_API_VALUE
} from './mappers/card-search-mapper';
import {
  SearchOptions,
  SearchAutoResult,
  CardDetailCacheResult
} from '@/types/api/search-types';

// 外部モジュールから使用されている定数と型を再エクスポート
export { SORT_ORDER_TO_API_VALUE };
export type { SearchOptions, SearchAutoResult, CardDetailCacheResult };

// ============================================================================
// 以下のマッピング定数と関数は ./mappers/card-search-mapper.ts に移動しました
// ============================================================================

/**
 * link値（例: "13"）を9bit整数に変換する
 *
 * @param linkValue link値の数字部分（例: "13", "246", "123456789"）
 * @returns 9bit整数（各ビットが方向を表す）
 *
 * 方向番号とビット位置の対応:
 *   方向1（左下） → bit 0
 *   方向2（下）   → bit 1
 *   方向3（右下） → bit 2
 *   方向4（左）   → bit 3
 *   方向5（中央） → bit 4 （常に0、存在しない）
 *   方向6（右）   → bit 5
 *   方向7（左上） → bit 6
 *   方向8（上）   → bit 7
 *   方向9（右上） → bit 8
 *
 * 例: "13" → 方向1と3 → bit 0とbit 2 → 0b000000101 = 5
 */
// SearchOptions は @/types/api/search-types.ts に移動しました

export function parseLinkValue(linkValue: string): number {
  let result = 0;

  // 各文字を方向番号として解析
  for (const char of linkValue) {
    const direction = parseInt(char, 10);

    // 方向番号が1〜9の範囲で、5（中央）でない場合
    if (direction >= 1 && direction <= 9 && direction !== 5) {
      // 方向番号 → ビット位置（direction - 1）
      const bitPos = direction - 1;
      result |= (1 << bitPos);
    }
  }

  return result;
}

/**
 * カード名で検索する
 *
 * @param keyword 検索キーワード
 * @param ctype カードタイプ（オプション）
 * @returns カード情報の配列
 */
/**
 * SearchOptionsからURLSearchParamsを構築する
 * @param options 検索オプション
 * @returns URLSearchParams
 */
export function buildSearchParams(options: SearchOptions): URLSearchParams {
  const params = new URLSearchParams();

  // ============================================================================
  // 基本パラメータ
  // ============================================================================
  params.append('ope', '1'); // 操作種別: 1=検索
  params.append('sess', '1'); // セッション: 1=初回ロード
  params.append('keyword', options.keyword);
  params.append('stype', options.searchType || '1'); // デフォルト: カード名検索

  // カードタイプ
  const ctypeValue = cardTypeToCtype(options.cardType);
  params.append('ctype', ctypeValue);

  // ============================================================================
  // モンスターフィルタ
  // ============================================================================

  // 属性
  if (options.attributes) {
    options.attributes.forEach(attr => {
      params.append('attr', getAttributeAttrValue(attr));
    });
  }

  // 種族
  if (options.races) {
    options.races.forEach(race => {
      params.append('species', getRaceSpeciesValue(race));
    });
  }

  // モンスタータイプ
  if (options.monsterTypes) {
    options.monsterTypes.forEach(type => {
      params.append('other', getMonsterTypeOtherValue(type));
    });
  }

  // モンスタータイプの論理演算（AND/OR）
  params.append('othercon', options.monsterTypeLogic === 'AND' ? '1' : '2');

  // 除外条件
  if (options.excludeMonsterTypes) {
    options.excludeMonsterTypes.forEach(type => {
      params.append('jogai', getMonsterTypeOtherValue(type));
    });
  }

  // ============================================================================
  // レベル・ステータス
  // ============================================================================

  // レベル/ランク
  if (options.levels) {
    options.levels.forEach(level => {
      if (level >= 0 && level <= 13) {
        params.append(`level${level}`, 'on');
      }
    });
  }

  // 攻撃力範囲
  params.append('atkfr', options.atk?.from?.toString() || '');
  params.append('atkto', options.atk?.to?.toString() || '');

  // 守備力範囲
  params.append('deffr', options.def?.from?.toString() || '');
  params.append('defto', options.def?.to?.toString() || '');

  // ============================================================================
  // ペンデュラム・リンク
  // ============================================================================

  // ペンデュラムスケール
  if (options.pendulumScales) {
    options.pendulumScales.forEach(scale => {
      if (scale >= 0 && scale <= 13) {
        params.append(`Pscale${scale}`, 'on');
      }
    });
  }

  // リンク数
  if (options.linkNumbers) {
    options.linkNumbers.forEach(num => {
      if (num >= 1 && num <= 6) {
        params.append(`Link${num}`, 'on');
      }
    });
  }

  // リンクマーカー方向
  if (options.linkMarkers) {
    options.linkMarkers.forEach(direction => {
      // 方向番号: 1-9（5は除く）
      if (direction >= 1 && direction <= 9 && direction !== 5) {
        params.append(`linkbtn${direction}`, direction.toString());
      }
    });
  }

  // リンクマーカーの論理演算（AND/OR）
  params.append('link_m', options.linkMarkerLogic === 'AND' ? '1' : '2');

  // ============================================================================
  // 魔法・罠フィルタ
  // ============================================================================

  // 魔法効果タイプ
  if (options.spellEffectTypes) {
    options.spellEffectTypes.forEach(type => {
      params.append('effe', getSpellEffectTypeEffeValue(type));
    });
  }

  // 罠効果タイプ
  if (options.trapEffectTypes) {
    options.trapEffectTypes.forEach(type => {
      params.append('effe', getTrapEffectTypeEffeValue(type));
    });
  }

  // ============================================================================
  // 範囲検索パラメータ（空文字列で送信）
  // ============================================================================
  const emptyRangeParams = ['starfr', 'starto', 'pscalefr', 'pscaleto',
    'linkmarkerfr', 'linkmarkerto'];
  emptyRangeParams.forEach(param => {
    params.append(param, '');
  });

  // ============================================================================
  // その他オプション
  // ============================================================================

  // ソート順（デフォルト: 1=50音順）
  params.append('sort', (options.sort || 1).toString());

  // ページあたり件数（デフォルト: 100）
  params.append('rp', (options.resultsPerPage || 100).toString());

  // 表示モード
  if (options.mode) {
    params.append('mode', options.mode.toString());
  } else {
    params.append('mode', '');
  }

  // 発売日範囲
  if (options.releaseDate) {
    if (options.releaseDate.start) {
      params.append('releaseYStart', options.releaseDate.start.year.toString());
      params.append('releaseMStart', options.releaseDate.start.month.toString());
      params.append('releaseDStart', options.releaseDate.start.day.toString());
    }
    if (options.releaseDate.end) {
      params.append('releaseYEnd', options.releaseDate.end.year.toString());
      params.append('releaseMEnd', options.releaseDate.end.month.toString());
      params.append('releaseDEnd', options.releaseDate.end.day.toString());
    }
  }

  return params;
}

/**
 * 各種検索条件でカードを検索する
 * 
 * @param options 検索オプション
 * @returns カード情報の配列
 * 
 * @example
 * ```typescript
 * // 基本的なカード名検索
 * const cards = await searchCards({
 *   keyword: 'ブラック・マジシャン'
 * });
 * 
 * // 効果モンスターで攻撃力2000以上を検索
 * const cards = await searchCards({
 *   keyword: '',
 *   cardType: 'monster',
 *   monsterTypes: ['effect'],
 *   atk: { from: 2000 }
 * });
 * 
 * // 光属性のドラゴン族を検索
 * const cards = await searchCards({
 *   keyword: '',
 *   cardType: 'monster',
 *   attributes: ['light'],
 *   races: ['dragon']
 * });
 * ```
 */
export async function searchCards(options: SearchOptions): Promise<CardInfo[]> {
  try {
    const gameType = detectCardGameType();
    const params = buildSearchParams(options);

    const url = buildApiUrl('card_search.action', gameType, params);
    const response = await queuedFetch(url, {
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
    console.error('Failed to search cards:', error);
    return [];
  }
}

/**
 * 「auto」検索モード: キーワードの長さに応じて最適な検索方式を自動選択
 *
 * 検索ロジック:
 * - 1文字: カード名検索のみ
 * - 2文字以上: カード名・テキスト・ペンデュラムテキストを同時検索して結果をマージ
 *
 * @param keyword 検索キーワード
 * @param limit 結果の上限（デフォルト: 100）
 * @param ctype カードタイプフィルタ（オプション）
 * @returns マージされたカード情報の配列
 *
 * @example
 * ```typescript
 * const results = await searchCardsAuto('光');
 * // 1文字のため、カード名検索のみを実行
 *
 * const results2 = await searchCardsAuto('融合');
 * // 2文字のため、カード名・テキスト・ペンデュラムテキストを並列検索
 * ```
 */
// SearchAutoResult は @/types/api/search-types.ts に移動しました

export async function searchCardsAuto(
  keyword: string,
  limit?: number,
  ctype?: CardType
): Promise<SearchAutoResult> {
  // 1文字の場合はカード名検索のみ
  if (keyword.length === 1) {
    return {
      cards: await searchCards({
        keyword,
        searchType: '1',
        cardType: ctype,
        resultsPerPage: limit || 100
      })
    };
  }

  // 2文字以上の場合：3つの検索を並列実行
  try {
    const searchLimit = limit || 100;

    // 3つの検索を並列実行
    const [nameResults, textResults, pendulumResults] = await Promise.all([
      searchCards({
        keyword,
        searchType: '1',
        cardType: ctype,
        resultsPerPage: searchLimit
      }),
      searchCards({
        keyword,
        searchType: '2',
        cardType: ctype,
        resultsPerPage: searchLimit
      }),
      searchCards({
        keyword,
        searchType: '3',
        cardType: ctype,
        resultsPerPage: searchLimit
      })
    ]);

    // name検索が100件以上ならname検索のみを返す（追加取得Promiseあり）
    if (nameResults.length >= 100) {
      const baseParams: Record<string, string> = {
        ope: '1',
        sess: '1',
        keyword: keyword,
        stype: '1',
        othercon: '2',
        link_m: '2'
      };

      const ctypeValue = cardTypeToCtype(ctype);
      if (ctypeValue) {
        baseParams['ctype'] = ctypeValue;
      }

      return {
        cards: nameResults,
        fetchMorePromise: fetchAdditionalPages(baseParams, parseSearchResults, 'searchCardsAuto')
      };
    }

    // name検索が100件未満なら、すべての結果をマージ
    const mergedMap = new Map<string, CardInfo>();

    // 各検索結果を追加（順序: name > text > pendulum）
    nameResults.forEach(card => {
      mergedMap.set(card.cardId, card);
    });

    textResults.forEach(card => {
      if (!mergedMap.has(card.cardId)) {
        mergedMap.set(card.cardId, card);
      }
    });

    pendulumResults.forEach(card => {
      if (!mergedMap.has(card.cardId)) {
        mergedMap.set(card.cardId, card);
      }
    });

    const merged = Array.from(mergedMap.values());

    return {
      cards: merged
    };
  } catch (error) {
    console.error('[searchCardsAuto] Failed to perform auto search:', error);
    return {
      cards: []
    };
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
    const gameType = detectCardGameType();
    const params = new URLSearchParams({
      ope: '2',
      cid: cardId
    });

    const url = buildApiUrl('card_search.action', gameType, params);

    const response = await queuedFetch(url, {
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
    console.error('[searchCardById] Error:', error);
    return null;
  }
}

/**
 * パックIDからカード一覧を取得
 * 
 * @param packId パックID（例: "1000009524000"）
 * @returns カード情報の配列
 * 
 * @example
 * ```typescript
 * const cards = await searchCardsByPackId('1000009524000');
 * console.log(`${cards.length}枚のカードが見つかりました`);
 * ```
 */
export async function searchCardsByPackId(packId: string): Promise<CardInfo[]> {
  try {
    const gameType = detectCardGameType();
    const params = new URLSearchParams({
      ope: '1',
      sess: '1',
      pid: packId,
      rp: '99999',
      sort: '1'
    });

    const url = buildApiUrl('card_search.action', gameType, params);

    const response = await queuedFetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('[searchCardsByPackId] HTTP error:', response.status);
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return parseSearchResults(doc);
  } catch (error) {
    console.error('[searchCardsByPackId] Error:', error);
    return [];
  }
}

/**
 * HTMLから画像URL情報（ciid, imgHash）を抽出する
 * JavaScriptコード内の画像URL設定からcidごとのマッピングを作成
 */
export function extractImageInfo(doc: Document): Map<string, { ciid?: string; imgHash?: string }> {
  const imageInfoMap = new Map<string, { ciid?: string; imgHash?: string }>();

  // scriptタグとインラインJavaScriptから画像URL設定を検索
  const htmlText = doc.documentElement.innerHTML;

  // パターン: get_image.action?...cid=123&ciid=1&enc=xxxxx
  // HTMLエスケープされた &amp; にも対応
  const regex = /get_image\.action\?[^'"]*cid=(\d+)(?:&(?:amp;)?ciid=(\d+))?(?:&(?:amp;)?enc=([^&'"\s]+))?/g;
  let match;

  while ((match = regex.exec(htmlText)) !== null) {
    const cid = match[1];
    if (!cid) continue;

    const ciid = match[2] || undefined;
    const imgHash = match[3] || undefined;

    imageInfoMap.set(cid, { ciid, imgHash });
  }

  return imageInfoMap;
}

/**
 * 検索結果ページからカード情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns カード情報の配列
 */
export function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];

  // #main980 > #article_body > #card_list の階層を使用
  const main980 = doc.querySelector('#main980');
  if (!main980) {
    return cards;
  }

  const articleBody = main980.querySelector('#article_body');
  if (!articleBody) {
    return cards;
  }

  const cardList = articleBody.querySelector('#card_list');
  if (!cardList) {
    return cards;
  }

  const rows = cardList.querySelectorAll('.t_row');

  // 画像情報を事前に抽出
  const imageInfoMap = extractImageInfo(doc);

  rows.forEach(row => {
    const cardInfo = parseSearchResultRow(row as HTMLElement, imageInfoMap);
    if (cardInfo) {
      cards.push(cardInfo);
    }
  });

  // 検索結果のカードをUnifiedDBに登録（Table A, B, B2）
  import('@/utils/unified-cache-db').then(({ getUnifiedCacheDB }) => {
    const unifiedDB = getUnifiedCacheDB();
    cards.forEach(card => {
      unifiedDB.setCardInfo(card);
    });
  });

  return cards;
}

/**
 * カード基本情報を抽出する（全カードタイプ共通）
 *
 * @param row 検索結果行のHTML要素
 * @param imageInfoMap cidごとの画像情報マップ
 * @returns カード基本情報、パースできない場合はnull
 */
export function parseCardBase(row: HTMLElement, imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>): CardBase | null {
  // カード名（必須）
  const nameElem = row.querySelector('.card_name');
  if (!nameElem?.textContent) {
    return null;
  }
  const name = nameElem.textContent.trim();

  // カードID（必須）
  // input.link_value の値から cid= を抽出
  const linkValueInput = safeQueryAs('input.link_value', isHTMLInputElement, row);
  if (!linkValueInput?.value) {
    return null;
  }

  // "/yugiohdb/card_search.action?ope=2&cid=13903&request_locale=en" から cid を抽出
  const match = linkValueInput.value.match(/[?&]cid=(\d+)/);
  if (!match || !match[1]) {
    return null;
  }

  const cardId = match[1];

  // ふりがな（オプション）
  const rubyElem = row.querySelector('.card_ruby');
  const ruby = rubyElem?.textContent?.trim() || undefined;

  // 画像識別子（JavaScriptコードから抽出）
  const imageInfo = imageInfoMap.get(cardId);
  const ciid = imageInfo?.ciid || '1';
  const imgHash = imageInfo?.imgHash || `${cardId}_1_1_1`;

  // imgs配列を構築
  const imgs = [{ ciid, imgHash }];

  // 効果テキスト（オプション）
  const textElem = row.querySelector('.box_card_text');
  let text: string | undefined = undefined;
  if (textElem) {
    // <br>を改行に変換してからtextContentを取得
    const cloned = textElem.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    text = cloned.textContent?.trim() || undefined;
  }

  // 禁止制限（オプション）
  let limitRegulation: LimitRegulation | undefined = undefined;
  const lrIconElem = row.querySelector('.lr_icon');
  if (lrIconElem) {
    if (lrIconElem.classList.contains('fl_1')) {
      limitRegulation = 'forbidden';
    } else if (lrIconElem.classList.contains('fl_2')) {
      limitRegulation = 'limited';
    } else if (lrIconElem.classList.contains('fl_3')) {
      limitRegulation = 'semi-limited';
    }
  }

  const base: CardBase = {
    name,
    ruby,
    cardId,
    ciid,
    lang: detectLanguage(document),
    imgs,
    text,
    limitRegulation
  };

  return base;
}

/**
 * 種族・タイプ情報をパースして識別子に変換する（多言語対応）
 * 例: "【ドラゴン族／融合／効果】" → { race: "dragon", types: ["fusion", "effect"] }
 * 例: "[Dragon／Fusion／Effect]" → { race: "dragon", types: ["fusion", "effect"] }
 *
 * @param doc ページのDocument（言語検出に使用）
 * @param speciesText 種族・タイプのテキスト
 * @returns パース結果、パースできない場合はnull
 */
function parseSpeciesAndTypes(doc: Document, speciesText: string): { race: Race; types: MonsterType[] } | null {
  // 言語を検出して適切なマッピングテーブルを取得
  const lang = detectLanguage(doc);
  const raceMap = mappingManager.getRaceTextToId(lang);
  const typeMap = mappingManager.getMonsterTypeTextToId(lang);

  // 括弧を除去し、複数の改行・スペースを単一スペースに統一してからスラッシュで分割
  // （日本語【】、英語[]に対応、全角スラッシュ・半角スラッシュに対応）
  let cleaned = speciesText
    .replace(/【|】|\[|\]/g, '') // 括弧を除去
    .replace(/\s+/g, ' ') // 複数のホワイトスペース（改行含む）を単一スペースに統一
    .trim();

  // スラッシュで分割（全角・半角両方に対応）
  const parts = cleaned.split(/[／\/]/).map(p => p.trim()).filter(p => p);

  if (parts.length === 0) return null;

  // 最初の要素が種族、残りがタイプ
  const raceText = parts[0];
  if (!raceText) return null;
  const typeTexts = parts.slice(1);

  // テキスト → 識別子に変換（言語別マッピングを使用）
  const race = raceMap[raceText];
  if (!race) {
    console.error(`[parseSpeciesAndTypes] Race text not found in mapping: "${raceText}" (lang: ${lang})`);
    return null;
  }

  const types: MonsterType[] = [];
  for (const typeText of typeTexts) {
    const type = typeMap[typeText];
    if (type) {
      types.push(type);
    } else {
      console.warn(`[parseSpeciesAndTypes] Monster type text not found in mapping: "${typeText}" (lang: ${lang})`);
    }
  }

  return { race, types };
}

/**
 * モンスターのタイプ配列からエクストラデッキ判定
 * Fusion, Synchro, Xyz, Link が含まれればエクストラデッキ
 */
function isMonsterExtraDeckCard(types: MonsterType[]): boolean {
  return types.some(t => ['fusion', 'synchro', 'xyz', 'link'].includes(t));
}

/**
 * モンスターカード固有情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @param base カード基本情報
 * @returns モンスターカード情報、パースできない場合はnull
 */
export function parseMonsterCard(row: HTMLElement, base: CardBase): MonsterCard | null {
  let extractedLinkValue: string | null = null;
  // 属性取得（必須）
  const attrImg = safeQueryAs('.box_card_attribute img', isHTMLImageElement, row);
  if (!attrImg?.src) {
    console.error('[parseMonsterCard] Attribute image not found for card:', base.name);
    return null;
  }

  // src属性から属性名を抽出: "attribute_icon_light.png" → "light"
  const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
  if (!attrMatch || !attrMatch[1]) {
    console.error('[parseMonsterCard] Failed to parse attribute from image src:', attrImg.src, 'for card:', base.name);
    return null;
  }
  const attrPath = attrMatch[1];

  // パス → 識別子に変換（逆引きマップで O(1) ルックアップ）
  const attribute = ATTRIBUTE_PATH_TO_ID[attrPath];
  if (!attribute) {
    console.error('[parseMonsterCard] Unknown attribute path:', attrPath, 'for card:', base.name);
    return null;
  }

  // レベル/ランク/リンク取得
  const levelRankElem = row.querySelector('.box_card_level_rank');
  const linkMarkerElem = row.querySelector('.box_card_linkmarker');
  let levelType: LevelType;
  let levelValue: number;

  if (levelRankElem) {
    // class名から種別判定
    if (levelRankElem.classList.contains('level')) {
      levelType = 'level';
    } else if (levelRankElem.classList.contains('rank')) {
      levelType = 'rank';
    } else {
      levelType = 'level'; // デフォルト
    }

    // アイコンからも種別を判定（二重チェック）
    const levelImg = safeQueryAs('img', isHTMLImageElement, levelRankElem);
    if (levelImg?.src) {
      if (levelImg.src.includes('icon_rank.png')) {
        levelType = 'rank';
      } else if (levelImg.src.includes('icon_level.png')) {
        levelType = 'level';
      }
    }

    // 値取得: "レベル 8" → 8
    const levelSpan = levelRankElem.querySelector('span');
    if (levelSpan?.textContent) {
      const match = levelSpan.textContent.match(/\d+/);
      if (match) {
        levelValue = parseInt(match[0], 10);
      } else {
        console.error('[parseMonsterCard] Failed to extract level/rank value from:', levelSpan.textContent, 'for card:', base.name);
        return null; // レベル/ランク値が取得できない
      }
    } else {
      console.error('[parseMonsterCard] Level/rank span text not found for card:', base.name);
      return null;
    }
  } else if (linkMarkerElem) {
    // リンクモンスター
    levelType = 'link';

    // リンク数取得: "リンク 1" → 1
    const linkSpan = linkMarkerElem.querySelector('span');
    if (linkSpan?.textContent) {
      const match = linkSpan.textContent.match(/\d+/);
      if (match) {
        levelValue = parseInt(match[0], 10);
      } else {
        console.error('[parseMonsterCard] Failed to extract link value from:', linkSpan.textContent, 'for card:', base.name);
        return null; // リンク数が取得できない
      }
    } else {
      console.error('[parseMonsterCard] Link marker span text not found for card:', base.name);
      return null;
    }

    // リンクマーカー方向情報を画像パスから取得
    // 例: "external/image/parts/link_pc/link13.png" → "13" (方向1と3)
    const linkImg = safeQueryAs('img', isHTMLImageElement, linkMarkerElem);
    if (linkImg?.src) {
      const linkMatch = linkImg.src.match(/link(\d+)\.png/);
      if (linkMatch && linkMatch[1]) {
        extractedLinkValue = linkMatch[1];
      }
    }
  } else {
    // レベル/ランク/リンク要素が存在しない
    console.error('[parseMonsterCard] Level/rank/link element not found for card:', base.name);
    return null;
  }

  // 種族・タイプ取得（必須）
  const speciesElem = row.querySelector('.card_info_species_and_other_item');
  if (!speciesElem?.textContent) {
    console.error('[parseMonsterCard] Species element not found for card:', base.name);
    return null;
  }

  const parsed = parseSpeciesAndTypes(row.ownerDocument!, speciesElem.textContent);
  if (!parsed) {
    console.error('[parseMonsterCard] Failed to parse species and types from:', speciesElem.textContent, 'for card:', base.name);
    return null;
  }
  const { race, types } = parsed;

  // ATK/DEF取得
  // クラス名で言語に依存しない判定
  let atk: number | string | undefined;
  let def: number | string | undefined;

  // ATK: .atk_power クラスから取得
  const atkElem = row.querySelector('.atk_power');
  if (atkElem?.textContent) {
    const value = atkElem.textContent.match(/([0-9X?-]+)/);
    if (value && value[1]) {
      const atkValue = value[1];
      atk = /^\d+$/.test(atkValue) ? parseInt(atkValue, 10) : atkValue;
    }
  }

  // DEF: .def_power クラスから取得
  const defElem = row.querySelector('.def_power');
  if (defElem?.textContent) {
    const value = defElem.textContent.match(/([0-9X?-]+)/);
    if (value && value[1]) {
      const defValue = value[1];
      def = /^\d+$/.test(defValue) ? parseInt(defValue, 10) : defValue;
    }
  }

  // ペンデュラム情報取得（オプション）
  let pendulumScale: number | undefined;
  let pendulumText: string | undefined;

  const pendulumScaleElem = row.querySelector('.box_card_pen_scale');
  if (pendulumScaleElem?.textContent) {
    const match = pendulumScaleElem.textContent.match(/\d+/);
    if (match) {
      pendulumScale = parseInt(match[0], 10);
    }
  }

  const pendulumTextElem = row.querySelector('.box_card_pen_effect');
  if (pendulumTextElem) {
    // <br>を改行に変換
    const cloned = pendulumTextElem.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    pendulumText = cloned.textContent?.trim();
  }

  // リンクマーカー取得
  let linkMarkers: number | undefined;
  if (levelType === 'link' && extractedLinkValue) {
    // extractedLinkValue（例: "13"）を9bit整数に変換
    // "13" → 方向1と3 → bit 0とbit 2 → 0b000000101 = 5
    linkMarkers = parseLinkValue(extractedLinkValue);
  }

  return {
    ...base,
    cardType: 'monster',
    attribute,
    levelType,
    levelValue,
    race,
    types,
    atk,
    def,
    linkMarkers,
    pendulumScale,
    pendulumText,
    isExtraDeck: isMonsterExtraDeckCard(types)
  };
}

/**
 * 魔法カード固有情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @param base カード基本情報
 * @returns 魔法カード情報、パースできない場合はnull
 */
export function parseSpellCard(row: HTMLElement, base: CardBase): SpellCard | null {
  // 魔法であることを確認
  const attrImg = safeQueryAs('.box_card_attribute img', isHTMLImageElement, row);
  if (!attrImg?.src?.includes('attribute_icon_spell')) {
    console.error('[parseSpellCard] Attribute is not spell for card:', base.name, 'src:', attrImg?.src);
    return null;
  }

  // 効果種類取得（box_card_effectのimg要素から判定）
  const effectElem = safeQuery('.box_card_effect', row);
  let effectType: SpellEffectType | undefined = undefined;

  if (effectElem) {
    const effectImg = safeQueryAs('img', isHTMLImageElement, effectElem);
    if (effectImg?.src) {
      const match = effectImg.src.match(/effect_icon_([^.]+)\.png/);
      if (match && match[1]) {
        // パス → 識別子に変換（O(1) 逆引き）
        effectType = SPELL_EFFECT_TYPE_PATH_TO_ID[match[1]];
      }
    }
  }

  // 効果アイコンがない場合は'normal'（通常魔法）
  if (!effectType) {
    effectType = 'normal';
  }

  return {
    ...base,
    cardType: 'spell',
    effectType
  };
}

/**
 * 罠カード固有情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @param base カード基本情報
 * @returns 罠カード情報、パースできない場合はnull
 */
export function parseTrapCard(row: HTMLElement, base: CardBase): TrapCard | null {
  // 罠であることを確認
  const attrImg = safeQueryAs('.box_card_attribute img', isHTMLImageElement, row);
  if (!attrImg?.src?.includes('attribute_icon_trap')) {
    console.error('[parseTrapCard] Attribute is not trap for card:', base.name, 'src:', attrImg?.src);
    return null;
  }

  // 効果種類取得（box_card_effectのimg要素から判定）
  const effectElem = safeQuery('.box_card_effect', row);
  let effectType: TrapEffectType | undefined = undefined;

  if (effectElem) {
    const effectImg = safeQueryAs('img', isHTMLImageElement, effectElem);
    if (effectImg?.src) {
      const match = effectImg.src.match(/effect_icon_([^.]+)\.png/);
      if (match && match[1]) {
        // パス → 識別子に変換（O(1) 逆引き）
        effectType = TRAP_EFFECT_TYPE_PATH_TO_ID[match[1]];
      }
    }
  }

  // 効果アイコンがない場合は'normal'（通常罠）
  if (!effectType) {
    effectType = 'normal';
  }

  return {
    ...base,
    cardType: 'trap',
    effectType
  };
}

/**
 * 検索結果の行からカード情報を抽出する（統合パーサー）
 *
 * @param row 検索結果行のHTML要素
 * @param imageInfoMap cidごとの画像情報マップ
 * @returns カード情報、パースできない場合はnull
 */
export function parseSearchResultRow(
  row: HTMLElement,
  imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>
): CardInfo | null {
  // 1. 共通情報を取得
  const base = parseCardBase(row, imageInfoMap);
  if (!base) {
    const cardNameElem = row.querySelector('.card_info_name');
    const cardName = cardNameElem?.textContent || 'UNKNOWN';
    console.error('[parseSearchResultRow] Failed to parse card base for card:', cardName);
    return null;
  }

  // 2. カードタイプを判定
  const cardType = detectCardType(row);
  if (!cardType) {
    console.error('[parseSearchResultRow] Could not detect card type for card:', base.name);
    return null;
  }

  // 3. カードタイプ別にパース
  switch (cardType) {
    case 'monster':
      return parseMonsterCard(row, base);
    case 'spell':
      return parseSpellCard(row, base);
    case 'trap':
      return parseTrapCard(row, base);
    default:
      console.error('[parseSearchResultRow] Unknown card type:', cardType, 'for card:', base.name);
      return null;
  }
}

/**
 * カード詳細情報を取得する（収録シリーズ・関連カードを含む）
 *
 * @param cardId カードID
 * @returns カード詳細情報、取得失敗時はnull
 *
 * @example
 * ```typescript
 * const detail = await getCardDetail('4335'); // ブラック・マジシャン
 * console.log('Packs:', detail.packs.length);
 * console.log('Related cards:', detail.relatedCards.length);
 * ```
 */
/**
 * 収録シリーズ情報をパースする
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns 収録シリーズ情報の配列
 */
function parsePackInfo(doc: Document): PackInfo[] {
  const packs: PackInfo[] = [];

  // #update_list 配下の .t_row を探す
  const updateList = doc.querySelector('#update_list');
  if (!updateList) {
    return packs;
  }

  const rows = updateList.querySelectorAll('.t_row');

  rows.forEach(row => {
    const rowElement = row as HTMLElement;

    // 発売日を取得
    const timeElem = rowElement.querySelector('.time');
    const releaseDate = timeElem?.textContent?.trim() || undefined;

    // カード番号を取得
    const cardNumberElem = rowElement.querySelector('.card_number');
    const code = cardNumberElem?.textContent?.trim() || undefined;

    // パック名を取得
    const packNameElem = rowElement.querySelector('.pack_name');
    const name = packNameElem?.textContent?.trim() || '';

    // パックIDを取得
    const linkValueInput = safeQueryAs('input.link_value', isHTMLInputElement, rowElement);
    let packId: string | undefined;
    if (linkValueInput?.value) {
      const pidMatch = linkValueInput.value.match(/pid=(\d+)/);
      if (pidMatch && pidMatch[1]) {
        packId = pidMatch[1];
      }
    }

    // レアリティを取得
    const rarityElem = rowElement.querySelector('.lr_icon');
    let rarity = '';
    let rarityColor = '';
    if (rarityElem) {
      // <p>タグ内のテキストを取得（"SR"など）
      const rarityText = rarityElem.querySelector('p')?.textContent?.trim();
      if (rarityText) {
        rarity = rarityText;
      }
      // 背景色を取得
      const bgColor = (rarityElem as HTMLElement).style.backgroundColor;
      if (bgColor) {
        rarityColor = bgColor;
      }
    }

    // 少なくともパック名がある場合のみ追加
    if (name) {
      packs.push({
        name,
        code,
        releaseDate,
        rarity: rarity || undefined,
        rarityColor: rarityColor || undefined,
        packId
      });
    }
  });

  return packs;
}

/**
 * 関連カード情報をパースする
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns 関連カード情報の配列
 */
function parseRelatedCards(doc: Document): CardInfo[] {
  const relatedCards: CardInfo[] = [];

  // 関連カードセクションは検索結果と同じ構造
  // カード詳細ページでは .list_style.list 配下の .t_row を探す
  // 検索結果ページでは #card_list 配下の .t_row を探す
  let cardList = doc.querySelector('#card_list');
  if (!cardList) {
    // カード詳細ページの場合
    cardList = doc.querySelector('.list_style.list');
  }

  if (!cardList) {
    return relatedCards;
  }

  const rows = cardList.querySelectorAll('.t_row');

  // 画像情報を事前に抽出
  const imageInfoMap = extractImageInfo(doc);

  rows.forEach(row => {
    const card = parseSearchResultRow(row as HTMLElement, imageInfoMap);
    if (card) {
      relatedCards.push(card);
    }
  });

  return relatedCards;
}

/**
 * カード詳細ページから基本カード情報をパースする（FAQリンク用）
 *
 * @param doc 詳細ページのDocument
 * @param cardId カードID
 * @returns 基本カード情報、パースできない場合はnull
 */
function parseCardDetailBasicInfo(doc: Document, cardId: string): CardInfo | null {
  const cardNameElem = doc.querySelector('#cardname h1, .cardname h1');
  if (!cardNameElem) {
    console.error('[parseCardDetailBasicInfo] Card name element not found');
    return null;
  }

  let cardName = '';
  cardNameElem.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        cardName += text;
      }
    }
  });

  if (!cardName) {
    console.error('[parseCardDetailBasicInfo] Card name is empty');
    return null;
  }

  const base: CardBase = {
    name: cardName,
    cardId,
    ciid: '1',
    lang: detectLanguage(document),
    imgs: [{ ciid: '1', imgHash: '' }]
  };

  // カードタイプを判定（属性アイコンがあればモンスター、なければ魔法・罠）
  const attrImg = safeQueryAs('.CardText .frame .item_box .item_box_title img[src*="attribute_icon"]', isHTMLImageElement, doc);

  if (attrImg) {
    // モンスターカード
    return parseMonsterDetailBasicInfo(doc, base);
  } else {
    // 魔法・罠カード
    return parseSpellTrapDetailBasicInfo(doc, base);
  }
}

function isSpellEffectType(value: string): value is SpellEffectType {
  return value in SPELL_EFFECT_TYPE_ID_TO_NAME;
}

function isTrapEffectType(value: string): value is TrapEffectType {
  return value in TRAP_EFFECT_TYPE_ID_TO_NAME;
}

function parseSpellTrapDetailBasicInfo(doc: Document, base: CardBase): CardInfo | null {
  const frameElems = doc.querySelectorAll('.CardText .frame .item_box');
  let cardType: 'spell' | 'trap' | null = null;
  let effectType: string | undefined;

  for (const elem of frameElems) {
    const title = elem.querySelector('.item_box_title')?.textContent?.trim();
    const value = elem.querySelector('.item_box_value')?.textContent?.trim();

    if (title === '効果' && value) {
      if (value.includes('魔法')) {
        cardType = 'spell';
        effectType = value.replace('魔法', '').trim() || undefined;
      } else if (value.includes('罠')) {
        cardType = 'trap';
        effectType = value.replace('罠', '').trim() || undefined;
      }
    }
  }

  if (!cardType) {
    console.error('[parseSpellTrapDetailBasicInfo] Cannot determine card type');
    return null;
  }

  if (cardType === 'spell') {
    const finalEffectType = effectType && isSpellEffectType(effectType) ? effectType : undefined;
    return {
      ...base,
      cardType: 'spell',
      effectType: finalEffectType
    } as SpellCard;
  } else {
    const finalEffectType = effectType && isTrapEffectType(effectType) ? effectType : undefined;
    return {
      ...base,
      cardType: 'trap',
      effectType: finalEffectType
    } as TrapCard;
  }
}

function parseMonsterDetailBasicInfo(doc: Document, base: CardBase): MonsterCard | null {
  // 属性を取得
  const attrImg = safeQueryAs('.CardText .frame .item_box .item_box_title img[src*="attribute_icon"]', isHTMLImageElement, doc);
  if (!attrImg || !attrImg.src) {
    console.error('[parseMonsterDetailBasicInfo] Attribute not found');
    return null;
  }

  const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
  if (!attrMatch || !attrMatch[1]) {
    console.error('[parseMonsterDetailBasicInfo] Cannot parse attribute');
    return null;
  }

  // パス → 識別子に変換（逆引き）
  let attribute: Attribute | null = null;
  for (const [attr, path] of Object.entries(ATTRIBUTE_ID_TO_PATH)) {
    if (path === attrMatch[1]) {
      attribute = attr as Attribute;
      break;
    }
  }
  if (!attribute) {
    console.error('[parseMonsterDetailBasicInfo] Unknown attribute:', attrMatch[1]);
    return null;
  }

  // レベル/ランク/リンクを取得
  // クラス名で言語に依存しない判定
  let levelType: LevelType = 'level';
  let levelValue: number = 0;

  // レベル判定: .box_card_level_rank.level クラスで判定
  const levelElem = doc.querySelector('.box_card_level_rank.level');
  if (levelElem?.textContent) {
    const match = levelElem.textContent.match(/(\d+)/);
    if (match && match[1]) {
      levelType = 'level';
      levelValue = parseInt(match[1], 10);
    }
  } else {
    // ランク判定: .box_card_level_rank.rank クラスで判定
    const rankElem = doc.querySelector('.box_card_level_rank.rank');
    if (rankElem?.textContent) {
      const match = rankElem.textContent.match(/(\d+)/);
      if (match && match[1]) {
        levelType = 'rank';
        levelValue = parseInt(match[1], 10);
      }
    } else {
      // リンク判定: .box_card_linkmarker クラスで判定
      const linkElem = doc.querySelector('.box_card_linkmarker');
      if (linkElem?.textContent) {
        const match = linkElem.textContent.match(/(\d+)/);
        if (match && match[1]) {
          levelType = 'link';
          levelValue = parseInt(match[1], 10);
        }
      }
    }
  }

  // ATK/DEFを取得
  // クラス名で言語に依存しない判定
  let atk: number | string | undefined;
  let def: number | string | undefined;

  // ATK: .atk_power クラスから取得
  const atkElem = doc.querySelector('.atk_power');
  if (atkElem?.textContent) {
    const value = atkElem.textContent.match(/([0-9X?-]+)/);
    if (value && value[1]) {
      const atkValue = value[1];
      atk = atkValue === '-' ? undefined : /^\d+$/.test(atkValue) ? parseInt(atkValue, 10) : atkValue;
    }
  }

  // DEF: .def_power クラスから取得
  const defElem = doc.querySelector('.def_power');
  if (defElem?.textContent) {
    const value = defElem.textContent.match(/([0-9X?-]+)/);
    if (value && value[1]) {
      const defValue = value[1];
      def = defValue === '-' ? undefined : /^\d+$/.test(defValue) ? parseInt(defValue, 10) : defValue;
    }
  }

  // 種族・タイプを取得
  const speciesElem = doc.querySelector('.CardText .frame .item_box .species');
  if (!speciesElem) {
    console.error('[parseMonsterDetailBasicInfo] Species not found');
    return null;
  }

  const spans = Array.from(speciesElem.querySelectorAll('span'));
  const parts = spans.map(span => span.textContent?.trim()).filter((t): t is string => t != null && t !== '／');

  if (parts.length === 0) {
    console.error('[parseMonsterDetailBasicInfo] No species/types found');
    return null;
  }

  const raceText = parts[0]!;
  const typeTexts = parts.slice(1);

  const lang = detectLanguage(doc);
  const raceMap = mappingManager.getRaceTextToId(lang);
  const typeMap = mappingManager.getMonsterTypeTextToId(lang);

  const race = raceMap[raceText];
  if (!race) {
    console.error('[parseMonsterDetailBasicInfo] Unknown race:', raceText);
    return null;
  }

  const types: MonsterType[] = [];
  for (const typeText of typeTexts) {
    const type = typeMap[typeText];
    if (type) {
      types.push(type);
    }
  }

  return {
    ...base,
    cardType: 'monster',
    attribute,
    levelType,
    levelValue,
    race,
    types,
    atk,
    def
  } as MonsterCard;
}

/**
 * カード詳細ページからruby（ふりがな）を取得
 */
function parseRuby(doc: Document): string | undefined {
  const cardNameElem = doc.querySelector('#cardname h1, .cardname h1');
  if (!cardNameElem) return undefined;

  const rubyElem = cardNameElem.querySelector('.ruby');
  return rubyElem?.textContent?.trim();
}

/**
 * カード詳細ページからテキストとペンデュラム効果を取得
 */
function parseTextData(doc: Document): { text?: string; pendulumText?: string } | null {
  const result: { text?: string; pendulumText?: string } = {};

  // テキストを取得
  const cardTextElem = doc.querySelector('.item_box_text');
  if (cardTextElem) {
    const cloned = cardTextElem.cloneNode(true) as HTMLElement;
    cloned.querySelector('.text_title')?.remove();
    cloned.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    result.text = cloned.textContent?.trim() || undefined;
  }

  // ペンデュラム効果を取得（検索結果ページと同じセレクタを使用）
  const pendulumTextElem = doc.querySelector('.box_card_pen_effect');
  if (pendulumTextElem) {
    const cloned = pendulumTextElem.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    result.pendulumText = cloned.textContent?.trim() || undefined;
  }

  return result;
}

/**
 * 2000件ずつページング取得する共通関数（バックグラウンド処理用）
 *
 * @param baseParams ベースとなるURLパラメータ
 * @param parseFunc ページのHTMLをパースしてCardInfo[]を返す関数
 * @param logPrefix ログに出力するプリフィックス
 * @returns 全件を含むカード配列のPromise
 */
export function fetchAdditionalPages(
  baseParams: Record<string, string>,
  parseFunc: (doc: Document) => CardInfo[],
  logPrefix: string
): Promise<CardInfo[]> {
  return (async () => {
    const gameType = detectCardGameType();
    const allCards: CardInfo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        ...baseParams,
        rp: '2000',
        page: page.toString()
      });

      try {
        const url = buildApiUrl('card_search.action', gameType, params);
        const response = await queuedFetch(url, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.error(`[${logPrefix}] Failed to fetch page ${page}`);
          break;
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const cards = parseFunc(doc);

        if (cards.length === 0) {
          hasMore = false;
        } else {
          allCards.push(...cards);

          // 2000件未満なら最終ページ
          if (cards.length < 2000) {
            hasMore = false;
          } else {
            page++;
          }
        }
      } catch (error) {
        console.error(`[${logPrefix}] Error fetching page ${page}:`, error);
        break;
      }
    }

    return allCards;
  })();
}

/**
 * 関連カードを2000件ずつ全件取得する（バックグラウンド処理用）
 *
 * @param cardId カードID
 * @param lang 言語コード
 * @param sortOrder ソート順
 * @returns 全件を含むカード配列のPromise
 */
function fetchAdditionalRelatedCards(
  cardId: string,
  lang: string,
  sortOrder: string
): Promise<CardInfo[]> {
  const sortValue = SORT_ORDER_TO_API_VALUE[sortOrder] ?? SORT_ORDER_TO_API_VALUE['release_desc']!;

  const baseParams = {
    ope: '2',
    cid: cardId,
    request_locale: lang,
    sort: sortValue.toString()
  };

  return fetchAdditionalPages(baseParams, parseRelatedCards, 'fetchAdditionalRelatedCards');
}

export async function getCardDetail(
  cardId: string,
  lang?: string,
  sortOrder: string = 'release_desc',
  fromFAQ: boolean = false
): Promise<CardDetail | null> {
  try {
    // 仕様: card-info-cache.md line 41-50
    // 基本情報は検索結果/デッキ読み込みから取得済みでキャッシュにあるはず
    // 詳細ページからは補足情報のみ取得: 複数画像、ruby、supply、pend-supply、related-cards、related-faq、related-products
    // ただし、FAQリンクからの場合はキャッシュにない可能性があるため、詳細ページから基本情報も取得

    const unifiedDB = getUnifiedCacheDB();

    // 詳細ページを取得（初回100件）
    const gameType = detectCardGameType();
    const requestLocale = lang || detectLanguage(document);
    const sortValue = SORT_ORDER_TO_API_VALUE[sortOrder] ?? SORT_ORDER_TO_API_VALUE['release_desc']!;
    const params = new URLSearchParams({
      ope: '2',
      cid: cardId,
      sort: sortValue.toString(),
      rp: '100', // 初回100件のみ取得
      page: '1'
    });

    const url = buildApiUrl('card_search.action', gameType, params);

    const response = await queuedFetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 基本情報をキャッシュから取得
    let baseCard: CardInfo | undefined = unifiedDB.reconstructCardInfo(cardId);

    // キャッシュにない場合、TempCardDB から取得を試みる（デッキ表示ページ等で使用）
    if (!baseCard) {
      const tempCardDB = getTempCardDB();
      baseCard = tempCardDB.get(cardId);
    }

    // FAQからのアクセスでキャッシュにない場合のみ、詳細ページから基本情報をパース
    // 同時にカード名検索を並行実行して完全な情報を取得
    interface SearchPromiseResult {
      success: boolean;
      data: CardInfo[];
      error?: Error;
    }
    let searchPromise: Promise<SearchPromiseResult> | null = null;

    if (fromFAQ && !baseCard) {
      const parsed = parseCardDetailBasicInfo(doc, cardId);
      if (!parsed) {
        console.error('[getCardDetail] Failed to parse base card info from detail page for', cardId);
        return null;
      }
      baseCard = parsed;

      // カード名で検索（並行実行）- 完全な情報（リンクマーカー、ペンデュラム等）を取得
      searchPromise = searchCards({ keyword: parsed.name })
        .then(results => {
          return { success: true, data: results };
        })
        .catch(err => {
          // エラーを明示的に記録（エラーフラグを返す）
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('[getCardDetail] Card name search failed for cardId:', cardId, 'name:', parsed.name, error);
          return { success: false, data: [], error };
        });
    }

    if (!baseCard) {
      console.error('[getCardDetail] Base card info not available for', cardId);
      return null;
    }

    // 補足情報のみ取得
    const additionalImgs = parseAdditionalImages(doc);
    const ruby = parseRuby(doc);
    const textData = parseTextData(doc);
    const packs = parsePackInfo(doc);

    // 関連カードを取得済みHTMLからパース
    let relatedCards = parseRelatedCards(doc);

    // Related カードに限制規制情報を付与（禁止制限キャッシュから取得）
    const { forbiddenLimitedCache } = await import('@/utils/forbidden-limited-cache');
    relatedCards = relatedCards.map(card => {
      const limitRegulation = forbiddenLimitedCache.getRegulation(card.cardId);
      if (limitRegulation && !card.limitRegulation) {
        return {
          ...card,
          limitRegulation
        };
      }
      return card;
    });

    // 100件以上あれば、バックグラウンドで全件を2000件ずつ取得
    let fetchMorePromise: Promise<CardInfo[]> | undefined;
    if (relatedCards.length >= 100) {
      fetchMorePromise = fetchAdditionalRelatedCards(cardId, requestLocale, sortOrder);
    }

    // Q&A情報を取得
    const faqList = await getCardFAQList(cardId);
    const qaList = faqList?.faqs || [];

    // 並行検索が実行されている場合、結果を待ってマージ
    let searchHadError = false;
    if (searchPromise) {
      const searchResult = await searchPromise;

      if (!searchResult.success) {
        // エラーが発生した場合は parsed な情報を使用することを明示
        console.warn('[getCardDetail] Using fallback parsed info due to search failure for cardId:', cardId, 'error:', searchResult.error?.message);
        searchHadError = true;
      } else {
        const fullCard = searchResult.data.find(c => c.cardId === cardId);

        if (fullCard) {
          // 検索結果の完全な情報で上書き（text/pendulumTextは詳細ページを優先）
          baseCard = {
            ...fullCard,
            text: textData?.text || fullCard.text
          };

          if (baseCard.cardType === 'monster' && textData?.pendulumText) {
            (baseCard as MonsterCard).pendulumText = textData.pendulumText;
          }
        } else {
          console.warn('[getCardDetail] Card not found in search results, using parsed info');
        }
      }
    }

    // 基本情報に補足情報をマージ
    const mergedCard: CardInfo = {
      ...baseCard,
      lang: requestLocale,  // 重要: 取得した言語を明示的に設定
      imgs: additionalImgs.length > 0 ? additionalImgs : baseCard.imgs,
      ruby: ruby || baseCard.ruby,
      text: textData?.text || baseCard.text
    };

    // pendulumTextはMonsterCardのみに存在（既にマージ済みの場合はスキップ）
    if (mergedCard.cardType === 'monster' && textData?.pendulumText && !searchPromise) {
      (mergedCard as MonsterCard).pendulumText = textData.pendulumText;
    }

    return {
      card: mergedCard,
      packs,
      relatedCards,
      qaList,
      fetchMorePromise,
      isPartialFromError: searchHadError ? true : undefined
    };
  } catch (error) {
    console.error('Failed to get card detail:', error);
    return null;
  }
}

// CardDetailCacheResult は @/types/api/search-types.ts に移動しました

/**
 * キャッシュ対応のカード詳細取得
 * - fetch-atが今日の日付ならAPIをスキップ
 * - fetch-atが今日の日付でなければキャッシュを返しつつ、バックグラウンド更新を開始
 * - キャッシュがなければAPI呼び出し
 *
 * @param cardOrId CardInfoまたはcid
 * @param lang 言語（省略時は現在のページから検出）
 * @param autoRefresh キャッシュが古い場合にバックグラウンドで自動更新するか（デフォルト: true）
 * @returns キャッシュ結果
 */
export async function getCardDetailWithCache(
  cardId: string,
  lang?: string,
  autoRefresh: boolean = true,
  sortOrder: string = 'release_desc',
  fromFAQ: boolean = false
): Promise<CardDetailCacheResult> {
  const unifiedDB = getUnifiedCacheDB();
  const targetLang = lang || detectLanguage(document);

  // キャッシュを確認
  if (unifiedDB.isInitialized()) {
    const cachedTableC = await unifiedDB.getCardTableC(cardId);

    // 言語別関連製品（products ID）が存在するかチェック
    // langsRelatedProducts は必須（qaList、relatedCards の詳細情報は空でも OK）
    if (cachedTableC &&
        cachedTableC.langsRelatedProducts?.[targetLang] !== undefined) {
      const now = Date.now();

      // 言語別のfetchedAtを取得（langsFetchedAtのみ使用）
      const fetchedAt = cachedTableC.langsFetchedAt?.[targetLang];

      // fetchedAtが存在する場合のみキャッシュヒット判定
      if (fetchedAt !== undefined) {
        // 日付ベースの判定: fetch-atが今日の日付と同じかどうか
        const isSameDayToday = isSameDay(fetchedAt, now);

        // 言語別の関連製品（products ID）の存在チェック
        // langsRelatedProducts は絶対に空であってはいけない（products 情報として必須）
        const hasRelatedProducts = !!(cachedTableC.langsRelatedProducts?.[targetLang] &&
                                       cachedTableC.langsRelatedProducts[targetLang].length > 0);

        // isFresh条件: 今日の日付 AND 言語別関連製品が存在する
        // langsRelatedProductDetail の詳細情報、langsQaList や langsRelatedCards は空でも OK（そういうカードもある）
        const isFresh = isSameDayToday && hasRelatedProducts;

        // キャッシュからCardDetailを再構築
        const cachedDetail = await reconstructCardDetailFromCache(unifiedDB, cardId, cachedTableC, targetLang);

        if (cachedDetail) {
          // fetchedAtを更新（今日の日付でない場合のみ）
          if (!isSameDayToday) {
            await unifiedDB.updateCardTableCFetchedAt(cardId, targetLang);
          }

          const result: CardDetailCacheResult = {
            detail: cachedDetail,
            fromCache: true,
            isFresh,
            fetchedAt: !isSameDayToday ? Date.now() : fetchedAt // 更新した場合は新しい時刻
          };

          // キャッシュが古い、または関連製品がない場合、自動更新が有効ならバックグラウンドで更新
          if (!isFresh && autoRefresh) {
            result.refreshPromise = (async () => {
              try {
                const freshDetail = await getCardDetail(cardId, targetLang, sortOrder, fromFAQ);
                if (freshDetail && unifiedDB.isInitialized()) {
                  await saveCardDetailToCache(unifiedDB, freshDetail, true, targetLang);
                  // ストレージに永続化
                  await unifiedDB.saveAll();
                }
                return freshDetail;
              } catch (error) {
                console.error(`[getCardDetailWithCache] Background refresh failed for ${cardId}:`, error);
                return null;
              }
            })();
          }

          return result;
        }
      }
    }
  }

  // キャッシュがない、または不完全な場合はAPIを呼び出し
  const detail = await getCardDetail(cardId, targetLang, sortOrder, fromFAQ);

  if (detail && unifiedDB.isInitialized()) {
    // キャッシュに保存（forceUpdate=trueで強制更新）
    await saveCardDetailToCache(unifiedDB, detail, true, targetLang);
    // ストレージに永続化
    await unifiedDB.saveAll();
  }

  return {
    detail,
    fromCache: false,
    isFresh: true,
    fetchedAt: Date.now(),
    isPartialFromError: detail?.isPartialFromError
  };
}

/**
 * キャッシュからCardDetailを再構築
 */
async function reconstructCardDetailFromCache(
  unifiedDB: ReturnType<typeof getUnifiedCacheDB>,
  cid: string,
  tableC: CardTableC,
  lang?: string
): Promise<CardDetail | null> {
  const targetLang = lang || detectLanguage(document);

  // CardInfoを再構築（指定言語で）
  const cardInfo = unifiedDB.reconstructCardInfo(cid, targetLang);
  if (!cardInfo) {
    return null;
  }

  // cardInfoには既にTableB2からtext/pendTextがマージされている
  // （reconstructCardInfo()内で処理済み）

  // langsRelatedCardsから言語別の関連カードを取得
  const relatedCards: CardInfo[] = [];
  const relatedCardIds = tableC.langsRelatedCards?.[targetLang];
  if (relatedCardIds) {
    for (const relatedCid of relatedCardIds) {
      const relatedInfo = unifiedDB.reconstructCardInfo(relatedCid, targetLang);
      if (relatedInfo) {
        relatedCards.push(relatedInfo);
      }
    }
  }

  // 言語別パック詳細情報を取得（新形式：langsRelatedProductDetail）
  const packs = tableC.langsRelatedProductDetail?.[targetLang];

  // Q&A情報を取得（日本語のみ）
  const qaList = tableC.qaList;

  // packsが存在しない場合はnullを返す
  // キャッシュの形式がリセットされている場合は、APIから再取得する
  if (!packs) {
    return null;
  }

  return {
    card: cardInfo,
    packs: packs || [],
    relatedCards,
    qaList: qaList || []
  };
}

/**
 * CardDetailをキャッシュに保存
 * Tierに応じた保存先の振り分け：
 * - Tier 3以上: Table C をUnifiedCacheDBに永続保存
 * - Tier 0-2: Table C はTempCardDBのみ（セッション中のみ）
 */
export async function saveCardDetailToCache(
  unifiedDB: ReturnType<typeof getUnifiedCacheDB>,
  detail: CardDetail,
  forceUpdate: boolean = false,
  lang?: string
): Promise<void> {
  const cid = detail.card.cardId;
  const targetLang = lang || detectLanguage(document);

  // CardInfoをTableA, Bに保存（全Tierで常に保存）
  // setCardInfoは内部でdetectLanguageを呼び出すので、langパラメータは不要
  unifiedDB.setCardInfo(detail.card, forceUpdate);

  // 関連カードもTableA, Bに保存（全Tierで常に保存）
  for (const relatedCard of detail.relatedCards) {
    unifiedDB.setCardInfo(relatedCard, forceUpdate);
  }

  // Tier値を取得して保存先を決定
  const tier = unifiedDB.getCardTier(cid);

  // CardTableCを作成
  // TableCを作成（text/pendTextはTableB2に保存されるので含めない）
  const packs = detail.packs || [];
  const qaList = detail.qaList || [];
  const relatedCardIds = detail.relatedCards.map(c => c.cardId);
  const relatedProductIds = packs.map(p => p.packId).filter((id): id is string => id !== undefined);

  const tableC: CardTableC = {
    cardId: cid,
    // 言語別の関連カード・製品
    langsRelatedCards: {
      [targetLang]: relatedCardIds
    },
    langsRelatedProducts: {
      [targetLang]: relatedProductIds
    },
    // 言語別パック詳細情報
    langsRelatedProductDetail: {
      [targetLang]: packs
    },
    // Q&A情報（日本語のみ）
    qaList
  };

  // Tier 3以上のカードのみTableCをUnifiedCacheDBに永続保存
  if (tier >= 3) {
    await unifiedDB.setCardTableC(tableC, targetLang);
  }

}

/**
 * 複数画像情報のみ取得（詳細ページから）
 */
function parseAdditionalImages(doc: Document): Array<{ ciid: string, imgHash: string }> {
  const imgs: Array<{ ciid: string, imgHash: string }> = [];

  // HTML全体を文字列として取得
  const html = doc.documentElement.outerHTML;

  // JavaScriptコード内の $('#thumbnail_card_image_X').attr('src', '...') パターンを抽出
  const pattern = /\$\(['"]#thumbnail_card_image_\d+['"]\)\.attr\(['"]src['"],\s*['"]([^'"]+)['"]\)/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1];
    if (!url) continue;

    const ciidMatch = url.match(/ciid=(\d+)/);
    const encMatch = url.match(/enc=([^&]+)/);

    if (ciidMatch?.[1] && encMatch?.[1]) {
      imgs.push({
        ciid: ciidMatch[1],
        imgHash: encMatch[1]
      });
    }
  }

  return imgs;
}

