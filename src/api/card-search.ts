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
import {
  ATTRIBUTE_PATH_TO_ID,
  SPELL_EFFECT_PATH_TO_ID,
  TRAP_EFFECT_PATH_TO_ID
} from '@/types/card-maps';
import { detectCardType, isExtraDeckMonster } from '@/content/card/detector';
import { detectLanguage } from '@/utils/language-detector';
import { mappingManager } from '@/utils/mapping-manager';
import { isSameDay } from '@/utils/date-utils';
import { detectCardGameType } from '@/utils/page-detector';
import { getCardSearchEndpoint } from '@/utils/url-builder';

/**
 * カード検索APIのURLを取得
 * 現在のページのゲームタイプ（OCG/Rush）に応じたURLを返す
 */
function getSearchUrl(): string {
  const gameType = detectCardGameType();
  return getCardSearchEndpoint(gameType);
}

// ============================================================================
// APIパラメータ値マッピング
// ============================================================================

/**
 * 属性 → attr値のマッピング
 * 調査結果より: 11=光, 12=闇, 13=水, 14=炎, 15=地, 16=風, 17=神
 */
const ATTRIBUTE_TO_ATTR_VALUE: Record<Attribute, string> = {
  light: '11',
  dark: '12',
  water: '13',
  fire: '14',
  earth: '15',
  wind: '16',
  divine: '17'
};

/**
 * 種族 → species値のマッピング
 * HTMLの表示順序から推測（要検証）
 */
const RACE_TO_SPECIES_VALUE: Record<Race, string> = {
  dragon: '1',
  zombie: '2',
  fiend: '3',
  pyro: '4',
  seaserpent: '5',
  rock: '6',
  machine: '7',
  fish: '8',
  dinosaur: '9',
  insect: '10',
  beast: '11',
  beastwarrior: '12',
  plant: '13',
  aqua: '14',
  warrior: '15',
  windbeast: '16',
  fairy: '17',
  spellcaster: '18',
  thunder: '19',
  reptile: '20',
  psychic: '21',
  divine: '22',
  creatorgod: '23',
  wyrm: '26',
  cyberse: '27',
  illusion: '34'
};

/**
 * モンスタータイプ → other値のマッピング
 * 調査結果より: 0-17の値
 */
const MONSTER_TYPE_TO_OTHER_VALUE: Record<MonsterType, string> = {
  normal: '0',
  effect: '1',
  fusion: '2',
  ritual: '3',
  toon: '4',
  spirit: '5',
  union: '6',
  gemini: '7',
  tuner: '8',
  synchro: '9',
  xyz: '10',
  flip: '14',
  pendulum: '15',
  special: '16',
  link: '17'
};

/**
 * 魔法効果タイプ → effe値のマッピング
 * 調査結果より: 20=通常, 21=カウンター, 22=フィールド, 23=装備, 24=永続, 25=速攻, 26=儀式
 */
const SPELL_EFFECT_TYPE_TO_EFFE_VALUE: Record<SpellEffectType, string> = {
  normal: '20',
  quick: '25',
  continuous: '24',
  equip: '23',
  field: '22',
  ritual: '26'
};

/**
 * 罠効果タイプ → effe値のマッピング
 * 調査結果より: 20=通常, 21=カウンター, 24=永続
 */
const TRAP_EFFECT_TYPE_TO_EFFE_VALUE: Record<TrapEffectType, string> = {
  normal: '20',
  continuous: '24',
  counter: '21'
};

/**
 * 内部sortOrder → API sortパラメータのマッピング
 * API値: 1=50音順, 2-3=レベル/ランク, 4-7=攻守, 8-9=Pスケール, 11-12=リンク数, 20-21=発売日
 */
export const SORT_ORDER_TO_API_VALUE: Record<string, number> = {
  'name_asc': 1,
  'name_desc': 1, // APIは50音順のみ、descはクライアント側で反転
  'release_desc': 20,
  'release_asc': 21,
  'level_desc': 2,
  'level_asc': 3,
  'atk_desc': 4,
  'atk_asc': 5,
  'def_desc': 6,
  'def_asc': 7,
  'attribute_asc': 1, // APIに属性ソートなし、50音順で代用
  'attribute_desc': 1,
  'race_asc': 1, // APIに種族ソートなし、50音順で代用
  'race_desc': 1
};

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
/**
 * カード検索オプション
 * 
 * 設計仕様書（docs/design/functions/intro.md）に基づき、
 * 「queryや各種検索条件の辞書」として各種フィルタリング条件を指定可能にする
 */
export interface SearchOptions {
  // ============================================================================
  // 基本検索条件
  // ============================================================================

  /** 検索キーワード */
  keyword: string;

  /** カードタイプ（モンスター/魔法/罠） */
  cardType?: CardType;

  /** 
   * 検索対象フィールド
   * - 1: カード名検索（デフォルト）
   * - 2: カードテキスト検索
   * - 3: ペンデュラム効果検索
   * - 4: カード番号検索
   */
  searchType?: '1' | '2' | '3' | '4';

  // ============================================================================
  // モンスターフィルタ
  // ============================================================================

  /** 属性フィルタ（複数選択可） */
  attributes?: Attribute[];

  /** 種族フィルタ（複数選択可） */
  races?: Race[];

  /** 
   * モンスタータイプフィルタ（複数選択可）
   * 例: ['effect', 'fusion'] = 効果または融合モンスター
   */
  monsterTypes?: MonsterType[];

  /** 
   * モンスタータイプの論理演算
   * - 'AND': すべてのタイプを持つカード
   * - 'OR': いずれかのタイプを持つカード（デフォルト）
   */
  monsterTypeLogic?: 'AND' | 'OR';

  /** 除外するモンスタータイプ（複数選択可） */
  excludeMonsterTypes?: MonsterType[];

  // ============================================================================
  // レベル・ステータス
  // ============================================================================

  /** レベル/ランクフィルタ（0-13、複数選択可） */
  levels?: number[];

  /** 攻撃力範囲 */
  atk?: { from?: number; to?: number };

  /** 守備力範囲 */
  def?: { from?: number; to?: number };

  // ============================================================================
  // ペンデュラム・リンク
  // ============================================================================

  /** ペンデュラムスケールフィルタ（0-13、複数選択可） */
  pendulumScales?: number[];

  /** リンク数フィルタ（1-6、複数選択可） */
  linkNumbers?: number[];

  /** 
   * リンクマーカー方向フィルタ（複数選択可）
   * 方向番号: 1=左下, 2=下, 3=右下, 4=左, 6=右, 7=左上, 8=上, 9=右上
   */
  linkMarkers?: number[];

  /** 
   * リンクマーカーの論理演算
   * - 'AND': すべての方向を持つカード
   * - 'OR': いずれかの方向を持つカード（デフォルト）
   */
  linkMarkerLogic?: 'AND' | 'OR';

  // ============================================================================
  // 魔法・罠フィルタ
  // ============================================================================

  /** 魔法効果タイプフィルタ（複数選択可） */
  spellEffectTypes?: SpellEffectType[];

  /** 罠効果タイプフィルタ（複数選択可） */
  trapEffectTypes?: TrapEffectType[];

  // ============================================================================
  // その他オプション
  // ============================================================================

  /** 
   * ソート順
   * 1=50音順, 2-3=レベル/ランク, 4-7=攻守, 8-9=Pスケール, 
   * 11-12=リンク数, 20-21=発売日
   * デフォルト: 1
   */
  sort?: number;

  /** ページあたりの結果数（デフォルト: 99） */
  resultsPerPage?: number;

  /** 
   * 表示モード
   * 1=画像表示, 2=テキスト表示
   */
  mode?: number;

  /** 発売日範囲 */
  releaseDate?: {
    start?: { year: number; month: number; day: number };
    end?: { year: number; month: number; day: number };
  };
}

function parseLinkValue(linkValue: string): number {
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
 * カードタイプをctypeパラメータに変換する
 */
function cardTypeToCtype(cardType?: CardType): string {
  if (!cardType) return '';
  switch (cardType) {
    case 'monster':
      return '1';
    case 'spell':
      return '2';
    case 'trap':
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
/**
 * SearchOptionsからURLSearchParamsを構築する
 * @param options 検索オプション
 * @returns URLSearchParams
 */
function buildSearchParams(options: SearchOptions): URLSearchParams {
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
      params.append('attr', ATTRIBUTE_TO_ATTR_VALUE[attr]);
    });
  }

  // 種族
  if (options.races) {
    options.races.forEach(race => {
      params.append('species', RACE_TO_SPECIES_VALUE[race]);
    });
  }

  // モンスタータイプ
  if (options.monsterTypes) {
    options.monsterTypes.forEach(type => {
      params.append('other', MONSTER_TYPE_TO_OTHER_VALUE[type]);
    });
  }

  // モンスタータイプの論理演算（AND/OR）
  params.append('othercon', options.monsterTypeLogic === 'AND' ? '1' : '2');

  // 除外条件
  if (options.excludeMonsterTypes) {
    options.excludeMonsterTypes.forEach(type => {
      params.append('jogai', MONSTER_TYPE_TO_OTHER_VALUE[type]);
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
        params.append(`linkbtn${direction}`, 'on');
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
      params.append('effe', SPELL_EFFECT_TYPE_TO_EFFE_VALUE[type]);
    });
  }

  // 罠効果タイプ
  if (options.trapEffectTypes) {
    options.trapEffectTypes.forEach(type => {
      params.append('effe', TRAP_EFFECT_TYPE_TO_EFFE_VALUE[type]);
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

  // ページあたり件数（デフォルト: 99）
  params.append('rp', (options.resultsPerPage || 99).toString());

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
    const params = buildSearchParams(options);

    const response = await fetch(`${getSearchUrl()}?${params.toString()}`, {
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

export async function searchCardsByName(
  keyword: string,
  limit?: number,
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
      link_m: '2',
      rp: (limit || 99).toString()
    });

    if (ctypeValue) {
      params.append('ctype', ctypeValue);
    } else {
      params.append('ctype', '');
    }

    const emptyParams = ['starfr', 'starto', 'pscalefr', 'pscaleto', 'linkmarkerfr', 'linkmarkerto', 'atkfr', 'atkto', 'deffr', 'defto'];
    emptyParams.forEach(param => {
      params.append(param, '');
    });

    const response = await fetch(`${getSearchUrl()}?${params.toString()}`, {
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

    const url = `${getSearchUrl()}?${params.toString()}`;

    const response = await fetch(url, {
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
    const params = new URLSearchParams({
      ope: '1',
      sess: '1',
      pid: packId,
      rp: '99999'
    });

    const url = `${getSearchUrl()}?${params.toString()}`;

    const response = await fetch(url, {
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
 * カード情報から画像URLを構築する（非推奨: getCardImageUrlを使用してください）
 * @deprecated types/card.tsのgetCardImageUrlを使用してください
 */
export function buildCardImageUrl(card: CardBase): string | undefined {
  // types/card.tsのgetCardImageUrlに委譲
  const { getCardImageUrl } = require('../types/card');
  return getCardImageUrl(card);
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

  return cards;
}

/**
 * カード基本情報を抽出する（全カードタイプ共通）
 *
 * @param row 検索結果行のHTML要素
 * @param imageInfoMap cidごとの画像情報マップ
 * @returns カード基本情報、パースできない場合はnull
 */
function parseCardBase(row: HTMLElement, imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>): CardBase | null {
  // カード名（必須）
  const nameElem = row.querySelector('.card_name');
  if (!nameElem?.textContent) {
    return null;
  }
  const name = nameElem.textContent.trim();

  // カードID（必須）
  // input.link_value の値から cid= を抽出
  const linkValueInput = row.querySelector('input.link_value') as HTMLInputElement;
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

  // 括弧を除去してスラッシュで分割（日本語【】、英語[]に対応）
  const cleaned = speciesText.replace(/【|】|\[|\]/g, '').trim();
  const parts = cleaned.split('／').map(p => p.trim()).filter(p => p);

  if (parts.length === 0) return null;

  // 最初の要素が種族、残りがタイプ
  const raceText = parts[0];
  if (!raceText) return null;
  const typeTexts = parts.slice(1);

  // テキスト → 識別子に変換（言語別マッピングを使用）
  const race = raceMap[raceText];
  if (!race) {
    return null;
  }

  const types: MonsterType[] = [];
  for (const typeText of typeTexts) {
    const type = typeMap[typeText];
    if (type) {
      types.push(type);
    } else {
    }
  }

  return { race, types };
}

/**
 * モンスターカード固有情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @param base カード基本情報
 * @returns モンスターカード情報、パースできない場合はnull
 */
function parseMonsterCard(row: HTMLElement, base: CardBase): MonsterCard | null {
  let extractedLinkValue: string | null = null;
  // 属性取得（必須）
  const attrImg = row.querySelector('.box_card_attribute img') as HTMLImageElement;
  if (!attrImg?.src) {
    return null;
  }

  // src属性から属性名を抽出: "attribute_icon_light.png" → "light"
  const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
  if (!attrMatch || !attrMatch[1]) {
    return null;
  }
  const attrPath = attrMatch[1];

  // パス → 識別子に変換
  const attribute = ATTRIBUTE_PATH_TO_ID[attrPath];
  if (!attribute) {
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
    const levelImg = levelRankElem.querySelector('img') as HTMLImageElement;
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
        return null; // レベル/ランク値が取得できない
      }
    } else {
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
        return null; // リンク数が取得できない
      }
    } else {
      return null;
    }

    // リンクマーカー方向情報を画像パスから取得
    // 例: "external/image/parts/link_pc/link2.png" → "2"
    const linkImg = linkMarkerElem.querySelector('img') as HTMLImageElement;
    if (linkImg?.src) {
      const linkMatch = linkImg.src.match(/link(\d+)\.png/);
      if (linkMatch && linkMatch[1]) {
        extractedLinkValue = linkMatch[1];
      }
    }
  } else {
    // レベル/ランク/リンク要素が存在しない
    return null;
  }

  // 種族・タイプ取得（必須）
  const speciesElem = row.querySelector('.card_info_species_and_other_item');
  if (!speciesElem?.textContent) {
    return null;
  }

  const parsed = parseSpeciesAndTypes(row.ownerDocument!, speciesElem.textContent);
  if (!parsed) {
    return null;
  }
  const { race, types } = parsed;

  // ATK/DEF取得
  const specElem = row.querySelector('.box_card_spec');
  let atk: number | string | undefined;
  let def: number | string | undefined;

  if (specElem) {
    const spans = Array.from(specElem.querySelectorAll('span'));
    spans.forEach(span => {
      const text = span.textContent || '';

      // "攻撃力 3000" → 3000
      const atkMatch = text.match(/攻撃力[:\s]*([0-9X?]+)/);
      if (atkMatch && atkMatch[1]) {
        const value = atkMatch[1];
        atk = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      }

      // "守備力 2500" → 2500
      const defMatch = text.match(/守備力[:\s]*([0-9X?]+)/);
      if (defMatch && defMatch[1]) {
        const value = defMatch[1];
        def = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      }
    });
  }

  // ペンデュラム情報取得（オプション）
  let pendulumScale: number | undefined;
  let pendulumEffect: string | undefined;

  const pendulumScaleElem = row.querySelector('.box_card_pen_scale');
  if (pendulumScaleElem?.textContent) {
    const match = pendulumScaleElem.textContent.match(/\d+/);
    if (match) {
      pendulumScale = parseInt(match[0], 10);
    }
  }

  const pendulumEffectElem = row.querySelector('.box_card_pen_effect');
  if (pendulumEffectElem) {
    // <br>を改行に変換
    const cloned = pendulumEffectElem.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    pendulumEffect = cloned.textContent?.trim();
  }

  // リンクマーカー取得
  let linkMarkers: number | undefined;
  if (levelType === 'link' && extractedLinkValue) {
    // extractedLinkValue（例: "13"）を9bit整数に変換
    // "13" → 方向1と3 → bit 0とbit 2 → 0b000000101 = 5
    linkMarkers = parseLinkValue(extractedLinkValue);
  }

  // エクストラデッキ判定
  const isExtraDeck = isExtraDeckMonster(row);


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
    pendulumEffect,
    isExtraDeck
  };
}

/**
 * 魔法カード固有情報を抽出する
 *
 * @param row 検索結果行のHTML要素
 * @param base カード基本情報
 * @returns 魔法カード情報、パースできない場合はnull
 */
function parseSpellCard(row: HTMLElement, base: CardBase): SpellCard | null {
  // 魔法であることを確認
  const attrImg = row.querySelector('.box_card_attribute img') as HTMLImageElement;
  if (!attrImg?.src?.includes('attribute_icon_spell')) return null;

  // 効果種類取得（box_card_effectのimg要素から判定）
  const effectElem = row.querySelector('.box_card_effect');
  let effectType: SpellEffectType | undefined = undefined;

  if (effectElem) {
    const effectImg = effectElem.querySelector('img') as HTMLImageElement;
    if (effectImg?.src) {
      const match = effectImg.src.match(/effect_icon_([^.]+)\.png/);
      if (match && match[1]) {
        effectType = SPELL_EFFECT_PATH_TO_ID[match[1]];
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
function parseTrapCard(row: HTMLElement, base: CardBase): TrapCard | null {
  // 罠であることを確認
  const attrImg = row.querySelector('.box_card_attribute img') as HTMLImageElement;
  if (!attrImg?.src?.includes('attribute_icon_trap')) return null;

  // 効果種類取得（box_card_effectのimg要素から判定）
  const effectElem = row.querySelector('.box_card_effect');
  let effectType: TrapEffectType | undefined = undefined;

  if (effectElem) {
    const effectImg = effectElem.querySelector('img') as HTMLImageElement;
    if (effectImg?.src) {
      const match = effectImg.src.match(/effect_icon_([^.]+)\.png/);
      if (match && match[1]) {
        effectType = TRAP_EFFECT_PATH_TO_ID[match[1]];
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
    return null;
  }

  // 2. カードタイプを判定
  const cardType = detectCardType(row);
  if (!cardType) {
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
    const linkValueInput = rowElement.querySelector('input.link_value') as HTMLInputElement;
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
 * カード詳細ページから基本カード情報をパースする
 * カード詳細ページの構造は検索結果ページと異なるため、専用のパーサーが必要
 */
/**
 * カード詳細情報を取得する
 *
 * @param cardOrId 既存のCardInfoまたはcardId文字列
 * @param lang 言語コード（省略時は現在のページから自動検出）
 * @returns カード詳細情報
 */
export async function getCardDetail(
  cardId: string,
  lang?: string
): Promise<CardDetail | null> {
  try {
    // 言語が指定されていない場合は現在のページから検出
    const requestLocale = lang || detectLanguage(document);

    const params = new URLSearchParams({
      ope: '2',
      cid: cardId,
      request_locale: requestLocale
    });

    const response = await fetch(`${getSearchUrl()}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 詳細ページからCardInfoをパース
    const card = parseCardInfoFromDetailPage(doc, cardId);
    if (!card) {
      console.error('[getCardDetail] Failed to parse card info from detail page');
      return null;
    }

    // 複数画像情報を取得（2枚目以降がある場合）
    const additionalImgs = parseAdditionalImages(doc);

    // カード情報に複数画像をマージ
    const mergedCard = { ...card };
    if (additionalImgs.length > 0) {
      mergedCard.imgs = additionalImgs;
    }

    // 収録シリーズと関連カードをパース
    const packs = parsePackInfo(doc);
    const relatedCards = parseRelatedCards(doc);

    // Q&A情報を取得（既存のAPI関数を使用）
    const faqList = await getCardFAQList(cardId);
    const qaList = faqList?.faqs || [];

    return {
      card: mergedCard,
      packs,
      relatedCards,
      qaList
    };
  } catch (error) {
    console.error('Failed to get card detail:', error);
    return null;
  }
}

/**
 * キャッシュ付きカード詳細取得の結果
 */
export interface CardDetailCacheResult {
  /** カード詳細（null=取得失敗） */
  detail: CardDetail | null;
  /** キャッシュから取得したか */
  fromCache: boolean;
  /** キャッシュが有効期間内か */
  isFresh: boolean;
  /** キャッシュの取得日時 */
  fetchedAt: number;
  /** バックグラウンド更新のPromise（autoRefresh=trueかつisFresh=falseの場合のみ存在） */
  refreshPromise?: Promise<CardDetail | null>;
}

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
  autoRefresh: boolean = true
): Promise<CardDetailCacheResult> {
  const unifiedDB = getUnifiedCacheDB();

  // キャッシュを確認
  if (unifiedDB.isInitialized()) {
    const cachedTableC = await unifiedDB.getCardTableC(cardId);

    // packsとqaListは空配列の可能性があるので、存在チェックのみ（undefinedでないこと）
    if (cachedTableC && cachedTableC.packs !== undefined && cachedTableC.qaList !== undefined) {
      const now = Date.now();
      // fetchedAtがundefinedの場合は現在時刻として扱う（初回取得扱い）
      const fetchedAt = cachedTableC.fetchedAt || now;
      
      // 日付ベースの判定: fetch-atが今日の日付と同じかどうか
      const isSameDayToday = isSameDay(fetchedAt, now);
      
      // related-productsの存在チェック
      const hasRelatedProducts = !!(cachedTableC.relatedProducts && cachedTableC.relatedProducts.length > 0);
      
      // isFresh条件: 今日の日付 AND related-productsが存在する
      const isFresh = isSameDayToday && hasRelatedProducts;

      // キャッシュからCardDetailを再構築
      const cachedDetail = await reconstructCardDetailFromCache(unifiedDB, cardId, cachedTableC);

      if (cachedDetail) {
        const daysDiff = Math.floor((now - fetchedAt) / (24 * 60 * 60 * 1000));
        console.log(`[getCardDetailWithCache] Cache hit for ${cardId}, fresh=${isFresh}, age=${daysDiff}days, hasRelatedProducts=${hasRelatedProducts}`);

        // fetchedAtを更新（今日の日付でない場合のみ）
        if (!isSameDayToday) {
          await unifiedDB.updateCardTableCFetchedAt(cardId);
        }

        const result: CardDetailCacheResult = {
          detail: cachedDetail,
          fromCache: true,
          isFresh,
          fetchedAt: !isSameDayToday ? Date.now() : fetchedAt // 更新した場合は新しい時刻
        };

        // キャッシュが古い、または関連製品がない場合、自動更新が有効ならバックグラウンドで更新
        if (!isFresh && autoRefresh) {
          console.log(`[getCardDetailWithCache] Starting background refresh for ${cardId}`);
          result.refreshPromise = (async () => {
            try {
              const freshDetail = await getCardDetail(cardId, lang);
              if (freshDetail && unifiedDB.isInitialized()) {
                await saveCardDetailToCache(unifiedDB, freshDetail, true);
                // ストレージに永続化
                await unifiedDB.saveAll();
                console.log(`[getCardDetailWithCache] Background refresh completed for ${cardId}`);
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

  // キャッシュがない、または不完全な場合はAPIを呼び出し
  console.log(`[getCardDetailWithCache] Cache miss for ${cardId}, fetching from API`);
  const detail = await getCardDetail(cardId, lang);

  if (detail && unifiedDB.isInitialized()) {
    // キャッシュに保存（forceUpdate=trueで強制更新）
    await saveCardDetailToCache(unifiedDB, detail, true);
    // ストレージに永続化
    await unifiedDB.saveAll();
  }

  return {
    detail,
    fromCache: false,
    isFresh: true,
    fetchedAt: Date.now()
  };
}

/**
 * キャッシュからCardDetailを再構築
 */
async function reconstructCardDetailFromCache(
  unifiedDB: ReturnType<typeof getUnifiedCacheDB>,
  cid: string,
  tableC: CardTableC
): Promise<CardDetail | null> {
  // CardInfoを再構築
  const cardInfo = unifiedDB.reconstructCardInfo(cid);
  if (!cardInfo) {
    return null;
  }

  // cardInfoには既にTableB2からtext/pendTextがマージされている
  // （reconstructCardInfo()内で処理済み）

  // relatedCardsを再構築
  const relatedCards: CardInfo[] = [];
  if (tableC.relatedCards) {
    for (const relatedCid of tableC.relatedCards) {
      const relatedInfo = unifiedDB.reconstructCardInfo(relatedCid);
      if (relatedInfo) {
        relatedCards.push(relatedInfo);
      }
    }
  }

  return {
    card: cardInfo,
    packs: tableC.packs || [],
    relatedCards,
    qaList: tableC.qaList || []
  };
}

/**
 * CardDetailをキャッシュに保存
 */
export async function saveCardDetailToCache(
  unifiedDB: ReturnType<typeof getUnifiedCacheDB>,
  detail: CardDetail,
  forceUpdate: boolean = false
): Promise<void> {
  const cid = detail.card.cardId;

  // CardInfoをTableA, Bに保存
  unifiedDB.setCardInfo(detail.card, forceUpdate);

  // 関連カードもTableA, Bに保存
  for (const relatedCard of detail.relatedCards) {
    unifiedDB.setCardInfo(relatedCard, forceUpdate);
  }

  // CardTableCを作成して保存
  // TableCを作成して保存（text/pendTextはTableB2に保存されるので含めない）
  const packs = detail.packs || [];
  const qaList = detail.qaList || [];
  const tableC: CardTableC = {
    cardId: cid,
    relatedCards: detail.relatedCards.map(c => c.cardId),
    relatedProducts: packs.map(p => p.packId).filter((id): id is string => id !== undefined),
    packs: packs,
    qaList: qaList,
    fetchedAt: Date.now()
  };

  await unifiedDB.setCardTableC(tableC);
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

/**
 * カード詳細ページからCardInfo全体をパースする
 * FAQカードリンクなど、cidのみが分かっている場合に使用
 *
 * @param doc カード詳細ページのDocument
 * @param cid カードID
 * @returns CardInfo、パースできない場合はnull
 */
function parseCardInfoFromDetailPage(doc: Document, cid: string): CardInfo | null {
  try {
    // カード名を取得
    const cardNameElem = doc.querySelector('#cardname h1, .cardname h1');
    if (!cardNameElem) {
      console.error('[parseCardInfoFromDetailPage] Card name element not found');
      return null;
    }

    // ふりがな（ruby）を除外してカード名を取得
    const rubyElem = cardNameElem.querySelector('.ruby');
    const ruby = rubyElem?.textContent?.trim();

    // カード名はh1のテキストからrubyと英語名を除外
    const clonedH1 = cardNameElem.cloneNode(true) as HTMLElement;
    // rubyと最後のspanを削除
    clonedH1.querySelectorAll('.ruby').forEach(el => el.remove());
    clonedH1.querySelectorAll('span').forEach(el => el.remove());
    const name = clonedH1.textContent?.trim() || '';

    if (!name) {
      console.error('[parseCardInfoFromDetailPage] Card name not found');
      return null;
    }

    // 画像情報を取得
    const imageInfoMap = extractImageInfo(doc);
    const imageInfo = imageInfoMap.get(cid);
    const ciid = imageInfo?.ciid || '1';
    const imgHash = imageInfo?.imgHash || `${cid}_1`;
    const imgs = [{ ciid, imgHash }];

    // カードテキストを取得
    const cardTextElem = doc.querySelector('.item_box_text');
    let text: string | undefined;
    if (cardTextElem) {
      const cloned = cardTextElem.cloneNode(true) as HTMLElement;
      // タイトル部分を除去
      cloned.querySelector('.text_title')?.remove();
      // <br>を改行に変換
      cloned.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });
      text = cloned.textContent?.trim() || undefined;
    }

    // CardBaseを構築
    const base: CardBase = {
      name,
      ruby,
      cardId: cid,
      ciid,
      imgs,
      text
    };

    // カードタイプを判定
    const itemBoxValue = doc.querySelector('.item_box_value');
    if (!itemBoxValue) {
      console.error('[parseCardInfoFromDetailPage] item_box_value not found');
      return null;
    }

    const typeText = itemBoxValue.textContent?.trim() || '';

    // 魔法カードの判定
    if (typeText.includes('魔法') || typeText.includes('Spell')) {
      return parseSpellCardFromDetailPage(doc, base, typeText);
    }

    // 罠カードの判定
    if (typeText.includes('罠') || typeText.includes('Trap')) {
      return parseTrapCardFromDetailPage(doc, base, typeText);
    }

    // それ以外はモンスターカード
    return parseMonsterCardFromDetailPage(doc, base);

  } catch (error) {
    console.error('[parseCardInfoFromDetailPage] Error:', error);
    return null;
  }
}

/**
 * カード詳細ページから魔法カード情報をパースする
 */
/**
 * カード詳細ページから魔法カード情報をパースする
 */
function parseSpellCardFromDetailPage(_doc: Document, base: CardBase, typeText: string): SpellCard {
  // 効果タイプを判定（通常/速攻/永続/フィールド/装備/儀式）
  let effectType: SpellEffectType = 'normal';

  if (typeText.includes('速攻') || typeText.includes('Quick-Play')) {
    effectType = 'quick';
  } else if (typeText.includes('永続') || typeText.includes('Continuous')) {
    effectType = 'continuous';
  } else if (typeText.includes('フィールド') || typeText.includes('Field')) {
    effectType = 'field';
  } else if (typeText.includes('装備') || typeText.includes('Equip')) {
    effectType = 'equip';
  } else if (typeText.includes('儀式') || typeText.includes('Ritual')) {
    effectType = 'ritual';
  }

  return {
    ...base,
    cardType: 'spell',
    effectType
  };
}

/**
 * カード詳細ページから罠カード情報をパースする
 */
function parseTrapCardFromDetailPage(_doc: Document, base: CardBase, typeText: string): TrapCard {
  // 効果タイプを判定（通常/永続/カウンター）
  let effectType: TrapEffectType = 'normal';

  if (typeText.includes('永続') || typeText.includes('Continuous')) {
    effectType = 'continuous';
  } else if (typeText.includes('カウンター') || typeText.includes('Counter')) {
    effectType = 'counter';
  }

  return {
    ...base,
    cardType: 'trap',
    effectType
  };
}

/**
 * カード詳細ページからモンスターカード情報をパースする
 */
/**
 * カード詳細ページからモンスターカード情報をパースする
 */
function parseMonsterCardFromDetailPage(doc: Document, base: CardBase): MonsterCard | null {
  try {
    // 属性を取得（詳細ページではitem_box_title内のimgから）
    const attrImg = doc.querySelector('.item_box_title img[src*="attribute_icon"]') as HTMLImageElement;
    if (!attrImg?.src) {
      console.error('[parseMonsterCardFromDetailPage] Attribute image not found');
      return null;
    }

    // src属性から属性名を抽出: "attribute_icon_light.png" → "light"
    const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
    if (!attrMatch || !attrMatch[1]) {
      console.error('[parseMonsterCardFromDetailPage] Failed to parse attribute');
      return null;
    }
    const attrPath = attrMatch[1];

    // パス → 識別子に変換
    const attribute = ATTRIBUTE_PATH_TO_ID[attrPath];
    if (!attribute) {
      console.error('[parseMonsterCardFromDetailPage] Unknown attribute:', attrPath);
      return null;
    }

    // レベル/ランク/リンク取得
    const levelImg = doc.querySelector('.item_box_title img[src*="icon_level"], .item_box_title img[src*="icon_rank"]') as HTMLImageElement;
    const linkMarkerElem = doc.querySelector('.box_card_linkmarker');
    let levelType: LevelType;
    let levelValue: number;
    let extractedLinkValue: string | null = null;

    if (levelImg) {
      // アイコンから種別を判定
      if (levelImg.src.includes('icon_rank.png')) {
        levelType = 'rank';
      } else {
        levelType = 'level';
      }

      // 値を取得: item_box_valueから"レベル 8"や"ランク 4"を抽出
      const levelBox = levelImg.closest('.item_box');
      const levelValueElem = levelBox?.querySelector('.item_box_value');
      if (levelValueElem?.textContent) {
        const match = levelValueElem.textContent.match(/\d+/);
        if (match) {
          levelValue = parseInt(match[0], 10);
        } else {
          console.error('[parseMonsterCardFromDetailPage] Failed to parse level/rank value');
          return null;
        }
      } else {
        console.error('[parseMonsterCardFromDetailPage] Level/rank value not found');
        return null;
      }
    } else if (linkMarkerElem) {
      // リンクモンスター
      levelType = 'link';

      // リンク数取得
      const linkSpan = linkMarkerElem.querySelector('span');
      if (linkSpan?.textContent) {
        const match = linkSpan.textContent.match(/\d+/);
        if (match) {
          levelValue = parseInt(match[0], 10);
        } else {
          console.error('[parseMonsterCardFromDetailPage] Failed to parse link value');
          return null;
        }
      } else {
        console.error('[parseMonsterCardFromDetailPage] Link span not found');
        return null;
      }

      // リンクマーカー方向情報を画像パスから取得
      const linkImg = linkMarkerElem.querySelector('img') as HTMLImageElement;
      if (linkImg?.src) {
        const linkMatch = linkImg.src.match(/link(\d+)\.png/);
        if (linkMatch && linkMatch[1]) {
          extractedLinkValue = linkMatch[1];
        }
      }
    } else {
      console.error('[parseMonsterCardFromDetailPage] Level/rank/link element not found');
      return null;
    }

    // 種族・タイプ取得（詳細ページでは<p class="species">内）
    const speciesElem = doc.querySelector('p.species');
    if (!speciesElem?.textContent) {
      console.error('[parseMonsterCardFromDetailPage] Species element not found');
      return null;
    }

    const parsed = parseSpeciesAndTypes(doc, speciesElem.textContent);
    if (!parsed) {
      console.error('[parseMonsterCardFromDetailPage] Failed to parse species and types');
      return null;
    }
    const { race, types } = parsed;

    // ATK/DEF取得（詳細ページではitem_boxから）
    let atk: number | string | undefined;
    let def: number | string | undefined;

    const itemBoxes = doc.querySelectorAll('.item_box');
    itemBoxes.forEach(box => {
      const titleElem = box.querySelector('.item_box_title');
      const valueElem = box.querySelector('.item_box_value');

      if (!titleElem || !valueElem) return;

      const title = titleElem.textContent?.trim();
      const value = valueElem.textContent?.trim();

      if (title === 'ATK' && value) {
        atk = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      } else if (title === 'DEF' && value) {
        def = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      }
    });

    // ペンデュラム情報取得（オプション）
    let pendulumScale: number | undefined;
    let pendulumEffect: string | undefined;

    const pendulumScaleElem = doc.querySelector('.box_card_pen_scale');
    if (pendulumScaleElem?.textContent) {
      const match = pendulumScaleElem.textContent.match(/\d+/);
      if (match) {
        pendulumScale = parseInt(match[0], 10);
      }
    }

    const pendulumEffectElem = doc.querySelector('.box_card_pen_effect');
    if (pendulumEffectElem) {
      const cloned = pendulumEffectElem.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });
      pendulumEffect = cloned.textContent?.trim();
    }

    // リンクマーカー取得
    let linkMarkers: number | undefined;
    if (levelType === 'link' && extractedLinkValue) {
      linkMarkers = parseLinkValue(extractedLinkValue);
    }

    // エクストラデッキ判定
    const isExtraDeck = types.some(t =>
      t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
    );

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
      pendulumEffect,
      isExtraDeck
    };
  } catch (error) {
    console.error('[parseMonsterCardFromDetailPage] Error:', error);
    return null;
  }
}
