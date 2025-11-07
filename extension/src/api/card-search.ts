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
  TrapEffectType
} from '@/types/card';
import {
  ATTRIBUTE_PATH_TO_ID,
  RACE_TEXT_TO_ID,
  MONSTER_TYPE_TEXT_TO_ID,
  SPELL_EFFECT_TYPE_TEXT_TO_ID,
  TRAP_EFFECT_TYPE_TEXT_TO_ID
} from '@/types/card-maps';
import { detectCardType, isExtraDeckMonster } from '@/content/card/detector';

const SEARCH_URL = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action';

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
 *   cardType: 'モンスター',
 *   monsterTypes: ['effect'],
 *   atk: { from: 2000 }
 * });
 * 
 * // 光属性のドラゴン族を検索
 * const cards = await searchCards({
 *   keyword: '',
 *   cardType: 'モンスター',
 *   attributes: ['light'],
 *   races: ['dragon']
 * });
 * ```
 */
export async function searchCards(options: SearchOptions): Promise<CardInfo[]> {
  try {
    const params = buildSearchParams(options);
    
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
    console.error('Failed to search cards:', error);
    return [];
  }
}

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
 * HTMLから画像URL情報（ciid, imgHash）を抽出する
 * JavaScriptコード内の画像URL設定からcidごとのマッピングを作成
 */
export function extractImageInfo(doc: Document): Map<string, { ciid?: string; imgHash?: string }> {
  const imageInfoMap = new Map<string, { ciid?: string; imgHash?: string }>();

  // scriptタグとインラインJavaScriptから画像URL設定を検索
  const htmlText = doc.documentElement.innerHTML;

  // パターン: get_image.action?...cid=123&ciid=1&enc=xxxxx
  const regex = /get_image\.action\?[^'"]*cid=(\d+)(?:&ciid=(\d+))?(?:&enc=([^&'"\s]+))?/g;
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
 * カード情報から画像URLを構築する
 *
 * @param card カード基本情報
 * @returns 画像URL、構築できない場合はundefined
 */
export function buildCardImageUrl(card: CardBase): string | undefined {
  if (!card.ciid || !card.imgHash) {
    return undefined;
  }

  return `/yugiohdb/get_image.action?type=1&lang=${card.imageId}&cid=${card.cardId}&ciid=${card.ciid}&enc=${card.imgHash}&osplang=1`;
}

/**
 * 検索結果ページからカード情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns カード情報の配列
 */
function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];
  
  // #main980 > #article_body > #card_list の階層を使用
  const main980 = doc.querySelector('#main980');
  if (!main980) {
    console.warn('[Card Search] #main980が見つかりません');
    return cards;
  }

  const articleBody = main980.querySelector('#article_body');
  if (!articleBody) {
    console.warn('[Card Search] #main980 > #article_bodyが見つかりません');
    return cards;
  }

  const cardList = articleBody.querySelector('#card_list');
  if (!cardList) {
    console.warn('[Card Search] #main980 > #article_body > #card_listが見つかりません');
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
  if (!nameElem?.textContent) return null;
  const name = nameElem.textContent.trim();

  // カードID（必須）
  // input.link_value の値から cid= を抽出
  const linkValueInput = row.querySelector('input.link_value') as HTMLInputElement;
  if (!linkValueInput?.value) return null;
  
  // "/yugiohdb/card_search.action?ope=2&cid=13903&request_locale=en" から cid を抽出
  const match = linkValueInput.value.match(/[?&]cid=(\d+)/);
  if (!match || !match[1]) return null;
  
  const cardId = match[1];

  // ふりがな（オプション）
  const rubyElem = row.querySelector('.card_ruby');
  const ruby = rubyElem?.textContent?.trim() || undefined;

  // 画像ID（デフォルト'1'）
  const langInput = row.querySelector('input.lang') as HTMLInputElement;
  const imageId = langInput?.value || '1';

  // 画像識別子とハッシュ（JavaScriptコードから抽出）
  const imageInfo = imageInfoMap.get(cardId);
  const ciid = imageInfo?.ciid;
  const imgHash = imageInfo?.imgHash;

  // 効果テキスト（オプション）
  const textElem = row.querySelector('.box_card_text');
  const text = textElem?.textContent?.trim() || undefined;

  return {
    name,
    ruby,
    cardId,
    imageId,
    ciid,
    imgHash,
    text
  };
}

/**
 * 種族・タイプ情報をパースして識別子に変換する
 * 例: "【ドラゴン族／融合／効果】" → { race: "dragon", types: ["fusion", "effect"] }
 *
 * @param speciesText 種族・タイプのテキスト
 * @returns パース結果、パースできない場合はnull
 */
function parseSpeciesAndTypes(speciesText: string): { race: Race; types: MonsterType[] } | null {
  // 【】を除去してスラッシュで分割
  const cleaned = speciesText.replace(/【|】/g, '').trim();
  const parts = cleaned.split('／').map(p => p.trim()).filter(p => p);

  if (parts.length === 0) return null;

  // 最初の要素が種族、残りがタイプ
  const raceText = parts[0];
  if (!raceText) return null;
  const typeTexts = parts.slice(1);

  // テキスト → 識別子に変換
  const race = RACE_TEXT_TO_ID[raceText];
  if (!race) {
    console.warn(`[Card Parser] Unknown race: ${raceText}`);
    return null;
  }

  const types: MonsterType[] = [];
  for (const typeText of typeTexts) {
    const type = MONSTER_TYPE_TEXT_TO_ID[typeText];
    if (type) {
      types.push(type);
    } else {
      console.warn(`[Card Parser] Unknown monster type: ${typeText}`);
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
  if (!attrImg?.src) return null;

  // src属性から属性名を抽出: "attribute_icon_light.png" → "light"
  const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
  if (!attrMatch || !attrMatch[1]) return null;
  const attrPath = attrMatch[1];

  // パス → 識別子に変換
  const attribute = ATTRIBUTE_PATH_TO_ID[attrPath];
  if (!attribute) {
    console.warn(`[Card Parser] Unknown attribute path: ${attrPath}`);
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
  if (!speciesElem?.textContent) return null;

  const parsed = parseSpeciesAndTypes(speciesElem.textContent);
  if (!parsed) return null;
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
  if (pendulumEffectElem?.textContent) {
    pendulumEffect = pendulumEffectElem.textContent.trim();
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
    cardType: 'モンスター',
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

  // 効果種類取得
  const effectElem = row.querySelector('.box_card_effect');
  let effectType = undefined;

  if (effectElem) {
    const effectSpan = effectElem.querySelector('span');
    const effectText = effectSpan?.textContent?.trim();

    if (effectText) {
      effectType = SPELL_EFFECT_TYPE_TEXT_TO_ID[effectText];
      if (!effectType) {
        console.warn(`[Card Parser] Unknown spell effect type: ${effectText}`);
      }
    }
  }

  return {
    ...base,
    cardType: '魔法',
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

  // 効果種類取得
  const effectElem = row.querySelector('.box_card_effect');
  let effectType = undefined;

  if (effectElem) {
    const effectSpan = effectElem.querySelector('span');
    const effectText = effectSpan?.textContent?.trim();

    if (effectText) {
      effectType = TRAP_EFFECT_TYPE_TEXT_TO_ID[effectText];
      if (!effectType) {
        console.warn(`[Card Parser] Unknown trap effect type: ${effectText}`);
      }
    }
  }

  return {
    ...base,
    cardType: '罠',
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
  if (!base) return null;

  // 2. カードタイプを判定
  const cardType = detectCardType(row);
  if (!cardType) return null;

  // 3. カードタイプ別にパース
  switch (cardType) {
    case 'モンスター':
      return parseMonsterCard(row, base);
    case '魔法':
      return parseSpellCard(row, base);
    case '罠':
      return parseTrapCard(row, base);
    default:
      return null;
  }
}
