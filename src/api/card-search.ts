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
  PackInfo
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
  // ciidに対応するimgHashをimgs配列から取得
  if (!card.ciid || !card.imgs) {
    return undefined;
  }

  const imageInfo = card.imgs.find(img => img.ciid === card.ciid);
  if (!imageInfo) {
    return undefined;
  }

  return `/yugiohdb/get_image.action?type=1&lang=${card.imageId}&cid=${card.cardId}&ciid=${card.ciid}&enc=${imageInfo.imgHash}&osplang=1`;
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

  // 画像ID（デフォルト'1'）
  const langInput = row.querySelector('input.lang') as HTMLInputElement;
  const imageId = langInput?.value || '1';

  // 画像識別子（JavaScriptコードから抽出）
  const imageInfo = imageInfoMap.get(cardId);
  const ciid = imageInfo?.ciid;

  // imgs配列を構築（検索結果ページでは1つの画像情報のみ）
  const imgs = (ciid && imageInfo?.imgHash) ? [{ciid, imgHash: imageInfo.imgHash}] : undefined;

  // 効果テキスト（オプション）
  const textElem = row.querySelector('.box_card_text');
  const text = textElem?.textContent?.trim() || undefined;

  return {
    name,
    ruby,
    cardId,
    imageId,
    ciid,
    imgs,
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
    return null;
  }

  const types: MonsterType[] = [];
  for (const typeText of typeTexts) {
    const type = MONSTER_TYPE_TEXT_TO_ID[typeText];
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

  const parsed = parseSpeciesAndTypes(speciesElem.textContent);
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

  // 効果種類取得
  const effectElem = row.querySelector('.box_card_effect');
  let effectType = undefined;

  if (effectElem) {
    const effectSpan = effectElem.querySelector('span');
    const effectText = effectSpan?.textContent?.trim();

    if (effectText) {
      effectType = SPELL_EFFECT_TYPE_TEXT_TO_ID[effectText];
      if (!effectType) {
      }
    }
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

  // 効果種類取得
  const effectElem = row.querySelector('.box_card_effect');
  let effectType = undefined;

  if (effectElem) {
    const effectSpan = effectElem.querySelector('span');
    const effectText = effectSpan?.textContent?.trim();

    if (effectText) {
      effectType = TRAP_EFFECT_TYPE_TEXT_TO_ID[effectText];
      if (!effectType) {
      }
    }
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
    
    // 少なくともパック名がある場合のみ追加
    if (name) {
      packs.push({
        name,
        code,
        releaseDate
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
function parseCardDetailPage(doc: Document, cardId: string): CardInfo | null {
  // カード名とルビを取得
  const cardNameElem = doc.querySelector('#cardname h1');
  if (!cardNameElem) {
    return null;
  }
  
  const rubyElem = cardNameElem.querySelector('.ruby');
  const ruby = rubyElem?.textContent?.trim() || '';
  
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
    return null;
  }

  // 画像情報を取得（複数画像対応）
  const thumbnailImages = doc.querySelectorAll('#thumbnail img');
  const imageId = thumbnailImages.length > 0 ? (thumbnailImages[0]?.getAttribute('alt') ?? '1') : '1';

  // 複数画像がある場合の情報
  const imgs: Array<{ciid: string, imgHash: string}> = [];
  thumbnailImages.forEach(img => {
    const src = img.getAttribute('src') || '';
    const ciidMatch = src.match(/ciid=(\d+)/);
    const encMatch = src.match(/enc=([^&]+)/);
    if (ciidMatch?.[1] && encMatch?.[1]) {
      imgs.push({
        ciid: ciidMatch[1],
        imgHash: encMatch[1]
      });
    }
  });

  // カードテキストを取得
  const textElem = doc.querySelector('.item_box_text');
  let cardText = '';
  if (textElem) {
    textElem.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          cardText += text;
        }
      }
    });
  }

  // カードタイプを判定
  let cardTypeText = '';

  // 「効果」というタイトルの隣の値を探す
  const itemBoxes = doc.querySelectorAll('.item_box');
  itemBoxes.forEach(box => {
    const title = box.querySelector('.item_box_title')?.textContent?.trim();
    if (title === '効果') {
      const value = box.querySelector('.item_box_value')?.textContent?.trim();
      if (value) {
        cardTypeText = value;
      }
    }
  });

  // カードタイプを判定（imgのsrc属性から）
  let cardType: CardType;
  let spellEffectType: SpellEffectType | undefined;
  let trapEffectType: TrapEffectType | undefined;

  const typeImg = doc.querySelector('.icon_img[src*="attribute_icon"]') as HTMLImageElement;
  if (typeImg?.src) {
    if (typeImg.src.includes('attribute_icon_spell')) {
      cardType = 'spell';
      // 魔法効果タイプを抽出: cardTypeTextから末尾の「魔法」を除去してマッピング
      if (cardTypeText.endsWith('spell')) {
        const effectText = cardTypeText.slice(0, -2); // 「魔法」(2文字)を除去
        spellEffectType = SPELL_EFFECT_TYPE_TEXT_TO_ID[effectText];
      }
    } else if (typeImg.src.includes('attribute_icon_trap')) {
      cardType = 'trap';
      // 罠効果タイプを抽出: cardTypeTextから末尾の「罠」を除去してマッピング
      if (cardTypeText.endsWith('trap')) {
        const effectText = cardTypeText.slice(0, -1); // 「罠」(1文字)を除去
        trapEffectType = TRAP_EFFECT_TYPE_TEXT_TO_ID[effectText];
      }
    } else {
      cardType = 'monster';
    }
  } else {
    // imgが見つからない場合はnullを返す（エラー状態）
    return null;
  }

  // 画像情報を設定（最初のimgsを代表として使用）
  const ciid = imgs.length > 0 ? imgs[0]?.ciid : undefined;

  // モンスターカードの場合
  if (cardType === 'monster') {
    const monsterCard: MonsterCard = {
      name: cardName,
      ruby,
      cardId,
      imageId,
      ciid,
      cardType: 'monster',
      attribute: 'dark',
      levelType: 'level',
      levelValue: 0,
      race: 'warrior',
      types: [],
      isExtraDeck: false
    };

    if (cardText) {
      monsterCard.text = cardText;
    }

    // 複数画像がある場合
    if (imgs.length > 0) {
      monsterCard.imgs = imgs;
    }

    // 属性を取得（imgのsrc属性から）
    const attrImg = doc.querySelector('.icon_img[src*="attribute_icon"]') as HTMLImageElement;
    if (attrImg?.src) {
      const attrMatch = attrImg.src.match(/attribute_icon_([^.]+)\.png/);
      if (attrMatch && attrMatch[1]) {
        const attrPath = attrMatch[1];
        const attribute = ATTRIBUTE_PATH_TO_ID[attrPath];
        if (attribute) {
          monsterCard.attribute = attribute;
        }
      }
    }

    // レベル/ランク/リンクを取得（imgのsrcから判定）
    itemBoxes.forEach(box => {
      const iconImg = box.querySelector('.item_box_title img.icon_img') as HTMLImageElement;
      if (!iconImg?.src) return;

      const value = box.querySelector('.item_box_value')?.textContent?.trim();
      if (!value) return;

      // 数値部分を抽出
      const numberMatch = value.match(/(\d+)/);
      if (!numberMatch || !numberMatch[1]) return;
      const levelValue = parseInt(numberMatch[1], 10);

      if (iconImg.src.includes('icon_level.png')) {
        monsterCard.levelType = 'level';
        monsterCard.levelValue = levelValue;
      } else if (iconImg.src.includes('icon_rank.png')) {
        monsterCard.levelType = 'rank';
        monsterCard.levelValue = levelValue;
      } else if (iconImg.src.includes('icon_link.png')) {
        monsterCard.levelType = 'link';
        monsterCard.levelValue = levelValue;
      }
    });

    // ATK/DEFを取得
    itemBoxes.forEach(box => {
      const title = box.querySelector('.item_box_title')?.textContent?.trim();
      const value = box.querySelector('.item_box_value')?.textContent?.trim();
      
      if (title === 'ATK' && value) {
        monsterCard.atk = value === '?' ? '?' : parseInt(value, 10);
      } else if (title === 'DEF' && value) {
        monsterCard.def = value === '?' ? '?' : parseInt(value, 10);
      }
    });

    // 種族とタイプを取得
    const speciesElem = doc.querySelector('.species');
    if (speciesElem) {
      const spans = speciesElem.querySelectorAll('span');
      const texts: string[] = [];
      spans.forEach(span => {
        const text = span.textContent?.trim();
        if (text && text !== '／') {
          texts.push(text);
        }
      });

      // 最初の要素が種族
      if (texts.length > 0 && texts[0]) {
        const raceText: string = texts[0];
        const mappedRace = RACE_TEXT_TO_ID[raceText];
        if (mappedRace) {
          monsterCard.race = mappedRace;
        }
      }

      // 2番目以降の要素がタイプ
      // カード詳細ページでは「シンクロ／効果」のように1つのspanに複数のタイプが入る場合がある
      const typeTexts = texts.slice(1);
      const types: MonsterType[] = [];
      typeTexts.forEach(typeText => {
        // 「／」で分割して個別のタイプを取得
        const individualTypes = typeText.split('／').map(t => t.trim()).filter(t => t);

        individualTypes.forEach(individualType => {
          const type = MONSTER_TYPE_TEXT_TO_ID[individualType];
          if (type) {
            types.push(type);
          }
        });
      });
      monsterCard.types = types;

      // エクストラデッキ判定
      monsterCard.isExtraDeck = types.includes('fusion') || types.includes('synchro') ||
                                 types.includes('xyz') || types.includes('link');
    }

    return monsterCard;
  }

  // 魔法カードの場合
  if (cardType === 'spell') {
    const spellCard: SpellCard = {
      name: cardName,
      ruby,
      cardId,
      imageId,
      ciid,
      cardType: 'spell',
      effectType: spellEffectType
    };

    if (cardText) {
      spellCard.text = cardText;
    }

    // 複数画像がある場合
    if (imgs.length > 0) {
      spellCard.imgs = imgs;
    }

    return spellCard;
  }

  // 罠カードの場合
  if (cardType === 'trap') {
    const trapCard: TrapCard = {
      name: cardName,
      ruby,
      cardId,
      imageId,
      ciid,
      cardType: 'trap',
      effectType: trapEffectType
    };

    if (cardText) {
      trapCard.text = cardText;
    }

    // 複数画像がある場合
    if (imgs.length > 0) {
      trapCard.imgs = imgs;
    }

    return trapCard;
  }

  return null;
}

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
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

    // カード詳細ページ専用のパーサーを使用
    const card = parseCardDetailPage(doc, cardId);
    if (!card) {
      return null;
    }

    // 収録シリーズと関連カードをパース
    const packs = parsePackInfo(doc);
    const relatedCards = parseRelatedCards(doc);

    return {
      card,
      packs,
      relatedCards
    };
  } catch (error) {
    console.error('Failed to get card detail:', error);
    return null;
  }
}
