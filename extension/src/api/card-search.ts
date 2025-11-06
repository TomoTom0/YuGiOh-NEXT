import {
  CardInfo,
  CardType,
  CardBase,
  MonsterCard,
  SpellCard,
  TrapCard,
  LevelType,
  Race,
  MonsterType
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
function extractImageInfo(doc: Document): Map<string, { ciid?: string; imgHash?: string }> {
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
 * 検索結果ページからカード情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns カード情報の配列
 */
function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];
  const rows = doc.querySelectorAll('.t_row');

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
  const cidInput = row.querySelector('input.cid') as HTMLInputElement;
  if (!cidInput?.value) return null;
  const cardId = cidInput.value;

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
function parseSearchResultRow(
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
