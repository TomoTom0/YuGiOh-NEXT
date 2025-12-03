/**
 * カード検索ページからマッピング情報を抽出
 */

import {
  Race,
  MonsterType,
  Attribute,
  SpellEffectType,
  TrapEffectType,
  RACE_ID_TO_INT,
  MONSTER_TYPE_VALUE_TO_ID,
  ATTRIBUTE_ID_TO_INT,
  SPELL_EFFECT_TYPE_ID_TO_INT,
  TRAP_EFFECT_TYPE_ID_TO_INT,
} from '@/types/card-maps';
import { buildApiUrl } from './url-builder';
import { detectCardGameType } from './page-detector';

interface MappingsData {
  race: Partial<Record<Race, string>>;
  monsterType: Partial<Record<MonsterType, string>>;
  attribute: Partial<Record<Attribute, string>>;
  spellEffect: Partial<Record<SpellEffectType, string>>;
  trapEffect: Partial<Record<TrapEffectType, string>>;
}

/**
 * カード検索ページのHTMLからマッピング情報を抽出
 * @param lang 言語コード
 * @returns マッピング情報オブジェクト
 */
export async function extractMappingsFromSearchPage(lang: string): Promise<MappingsData | null> {
  try {
    // カード検索ページを取得（指定言語のマッピングを抽出するため、request_locale を明示的に付与）
    const gameType = detectCardGameType();
    const path = `card_search.action?ope=1&request_locale=${lang}`;
    const url = buildApiUrl(path, gameType);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[extractMappingsFromSearchPage] Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Race（種族）マッピングを抽出
    const raceMapping = extractRaceMapping(doc);

    // MonsterType（モンスタータイプ）マッピングを抽出
    const monsterTypeMapping = extractMonsterTypeMapping(doc);

    // Attribute（属性）マッピングを抽出
    const attributeMapping = extractAttributeMapping(doc);

    // SpellEffectType（魔法効果種類）と TrapEffectType（罠効果種類）を抽出
    const spellEffectMapping = extractSpellEffectMapping(doc);
    const trapEffectMapping = extractTrapEffectMapping(doc);

    if (Object.keys(raceMapping).length === 0) {
      console.warn(`[extractMappingsFromSearchPage] Race mappings seem empty for ${lang}`);
      return null;
    }

    return {
      race: raceMapping,
      monsterType: monsterTypeMapping,
      attribute: attributeMapping,
      spellEffect: spellEffectMapping,
      trapEffect: trapEffectMapping
    };
  } catch (error) {
    console.error('[extractMappingsFromSearchPage] Error:', error);
    return null;
  }
}

/**
 * MonsterType（モンスタータイプ）マッピングを抽出
 * HTML から内部ID → 表示テキスト のマッピングを作成
 */
function extractMonsterTypeMapping(doc: Document): Partial<Record<MonsterType, string>> {
  const monsterTypeMap: Partial<Record<MonsterType, string>> = {};

  // Card Type フィルタで MonsterType 項目を抽出
  const cardTypeFilters = doc.querySelectorAll('[id*="filter_other"]');

  cardTypeFilters.forEach((filter) => {
    // Card Type フィルタ（最初のfilter_other）を特定
    const title = filter.querySelector('h3');
    if (!title || !title.textContent?.includes('Card Type')) {
      return;
    }

    const listItems = filter.querySelectorAll('li');

    listItems.forEach((li) => {
      const span = li.querySelector('span');
      const input = li.querySelector('input[name="other"]');

      if (span && input) {
        // ホワイトスペース正規化
        const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
        const value = input.getAttribute('value');

        if (displayText && value) {
          const typeId = valueToMonsterTypeId(value);
          if (typeId) {
            // 内部値 → その言語での表示テキスト
            monsterTypeMap[typeId] = displayText;
          }
        }
      }
    });
  });

  return monsterTypeMap;
}

/**
 * Race（種族）マッピングを抽出
 * HTML から内部ID → 表示テキスト のマッピングを作成
 */
function extractRaceMapping(doc: Document): Partial<Record<Race, string>> {
  const raceMap: Partial<Record<Race, string>> = {};

  const speciesFilter = doc.querySelector('#filter_specis, .filter_specis');
  if (!speciesFilter) {
    console.warn('[extractRaceMapping] Species filter element not found');
    return raceMap;
  }

  const listItems = speciesFilter.querySelectorAll('li');

  listItems.forEach((li) => {
    const span = li.querySelector('span');
    const input = li.querySelector('input[name="species"]');

    if (span && input) {
      // ホワイトスペース正規化
      const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
      const value = input.getAttribute('value');

      if (displayText && value) {
        // value 属性から内部値を取得
        const raceId = valueToRaceId(value);
        if (raceId) {
          // 内部値 → その言語での表示テキスト のマッピング
          raceMap[raceId] = displayText;
        }
      }
    }
  });

  return raceMap;
}

/**
 * Attribute（属性）マッピングを抽出
 */
function extractAttributeMapping(doc: Document): Partial<Record<Attribute, string>> {
  const attrMap: Partial<Record<Attribute, string>> = {};

  // filter_attribute という id/class を持つ要素を探す
  const attrFilter = doc.querySelector('[id*="attribute"], [class*="attribute"]');
  if (!attrFilter) {
    console.warn('[extractAttributeMapping] Attribute filter element not found');
    return attrMap;
  }

  // 属性フィルタ内の li 要素を全て取得
  const listItems = attrFilter.querySelectorAll('li');

  listItems.forEach((li) => {
    const span = li.querySelector('span');
    const input = li.querySelector('input[name="attr"]');

    if (span && input) {
      // ホワイトスペース正規化
      const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
      const value = input.getAttribute('value');

      if (displayText && value) {
        const attributeId = valueToAttributeId(value);
        if (attributeId) {
          // 内部値 → その言語での表示テキスト
          attrMap[attributeId] = displayText;
        }
      }
    }
  });

  return attrMap;
}

/**
 * SpellEffectType（魔法効果種類）マッピングを抽出
 */
function extractSpellEffectMapping(doc: Document): Partial<Record<SpellEffectType, string>> {
  const spellEffectMap: Partial<Record<SpellEffectType, string>> = {};

  // Effect フィルタで魔法効果タイプのみを抽出
  const effectFilters = doc.querySelectorAll('[id*="effect"], [class*="effect"]');

  effectFilters.forEach((filter) => {
    const listItems = filter.querySelectorAll('li.f_e_magic');

    listItems.forEach((li) => {
      const span = li.querySelector('span');
      const input = li.querySelector('input[name="effe"]');

      if (span && input) {
        // ホワイトスペース正規化
        const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
        const value = input.getAttribute('value');

        if (displayText && value) {
          const effectId = valueToSpellEffectId(value);
          if (effectId) {
            // 内部値 → その言語での表示テキスト
            spellEffectMap[effectId] = displayText;
          }
        }
      }
    });
  });

  return spellEffectMap;
}

/**
 * TrapEffectType（罠効果種類）マッピングを抽出
 */
function extractTrapEffectMapping(doc: Document): Partial<Record<TrapEffectType, string>> {
  const trapEffectMap: Partial<Record<TrapEffectType, string>> = {};

  // Effect フィルタで罠効果タイプのみを抽出
  const effectFilters = doc.querySelectorAll('[id*="effect"], [class*="effect"]');

  effectFilters.forEach((filter) => {
    const listItems = filter.querySelectorAll('li.f_e_trap, li:not(.f_e_magic):not(.f_e_trap)');

    listItems.forEach((li) => {
      const span = li.querySelector('span');
      const input = li.querySelector('input[name="effe"]');

      if (span && input) {
        // ホワイトスペース正規化
        const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
        const value = input.getAttribute('value');

        if (displayText && value) {
          const effectId = valueToTrapEffectId(value);
          if (effectId) {
            // 内部値 → その言語での表示テキスト
            trapEffectMap[effectId] = displayText;
          }
        }
      }
    });
  });

  return trapEffectMap;
}

/**
 * value 属性をrace IDに変換
 * @param value HTML input の value 属性（整数値の文字列）
 * @returns 内部ID、見つからない場合は null
 */
function valueToRaceId(value: string): Race | null {
  const numValue = parseInt(value, 10);
  // RACE_ID_TO_INT の逆引き：整数ID → 内部ID
  for (const [internalId, id] of Object.entries(RACE_ID_TO_INT)) {
    if (id === numValue) {
      return internalId as Race;
    }
  }
  return null;
}

/**
 * value 属性をAttribute IDに変換
 */
function valueToAttributeId(value: string): Attribute | null {
  const numValue = parseInt(value, 10);
  for (const [internalId, id] of Object.entries(ATTRIBUTE_ID_TO_INT)) {
    if (id === numValue) {
      return internalId as Attribute;
    }
  }
  return null;
}

/**
 * value 属性をSpellEffectType IDに変換
 */
function valueToSpellEffectId(value: string): SpellEffectType | null {
  const numValue = parseInt(value, 10);
  for (const [internalId, id] of Object.entries(SPELL_EFFECT_TYPE_ID_TO_INT)) {
    if (id === numValue) {
      return internalId as SpellEffectType;
    }
  }
  return null;
}

/**
 * value 属性をTrapEffectType IDに変換
 */
function valueToTrapEffectId(value: string): TrapEffectType | null {
  const numValue = parseInt(value, 10);
  for (const [internalId, id] of Object.entries(TRAP_EFFECT_TYPE_ID_TO_INT)) {
    if (id === numValue) {
      return internalId as TrapEffectType;
    }
  }
  return null;
}

/**
 * value 属性をMonsterType IDに変換
 * HTMLの"other"フィルタの値から内部IDへマッピング
 */
function valueToMonsterTypeId(value: string): MonsterType | null {
  const numValue = parseInt(value, 10);
  return (MONSTER_TYPE_VALUE_TO_ID as Record<number, MonsterType>)[numValue] || null;
}
