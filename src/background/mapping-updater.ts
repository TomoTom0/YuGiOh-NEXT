/**
 * マッピングテーブルの自動更新
 *
 * 検索フォームから種族・タイプのマッピングを取得してストレージに保存
 */

import { Race, MonsterType } from '@/types/card';
import {
  RACE_MAP,
  MONSTER_TYPE_MAP,
} from '@/types/card-maps';
import type { CardGameType } from '@/types/settings';

const LANGUAGES = ['ja', 'ko', 'ae', 'cn', 'en', 'de', 'fr', 'it', 'es', 'pt'];

interface Mapping {
  [key: string]: string;
}

interface AllMappings {
  [lang: string]: Mapping;
}

interface StoredMappings {
  race: AllMappings;
  monsterType: AllMappings;
  updatedAt: number;
}

interface LanguageMappings {
  race: Record<string, Race>;
  monsterType: Record<string, MonsterType>;
  updatedAt: number;
  quarter: string; // 四半期（例: "2024-Q1"）
}

/**
 * 現在の四半期を取得（"YYYY-QN"形式）
 */
function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed to 1-indexed
  
  let quarter: number;
  if (month >= 1 && month < 4) {
    quarter = 1;
  } else if (month >= 4 && month < 7) {
    quarter = 2;
  } else if (month >= 7 && month < 10) {
    quarter = 3;
  } else {
    quarter = 4;
  }
  
  return `${year}-Q${quarter}`;
}

/**
 * HTMLから種族マッピングを抽出
 */
function extractRaceMapping(doc: Document): Mapping {
  const mapping: Mapping = {};
  const raceCheckboxes = doc.querySelectorAll('input[name="species"]');

  raceCheckboxes.forEach(checkbox => {
    const value = (checkbox as HTMLInputElement).value;
    const span = checkbox.parentElement;
    if (span && value) {
      const text = Array.from(span.childNodes)
        .filter(node => node.nodeType === 3) // テキストノードのみ
        .map(node => node.textContent?.trim())
        .join('')
        .trim();
      if (text) {
        mapping[text] = value;
      }
    }
  });

  return mapping;
}

/**
 * HTMLからモンスタータイプマッピングを抽出
 */
function extractMonsterTypeMapping(doc: Document): Mapping {
  const mapping: Mapping = {};
  const typeCheckboxes = doc.querySelectorAll('input[name="other"], input[name="jogai"]');
  const seen = new Set<string>();

  typeCheckboxes.forEach(checkbox => {
    const value = (checkbox as HTMLInputElement).value;
    const span = checkbox.parentElement;
    if (span && value) {
      const text = Array.from(span.childNodes)
        .filter(node => node.nodeType === 3)
        .map(node => node.textContent?.trim())
        .join('')
        .trim();
      if (text && !seen.has(value)) {
        mapping[text] = value;
        seen.add(value);
      }
    }
  });

  return mapping;
}

/**
 * 1言語の検索フォームを取得してマッピングを抽出
 * @param lang 言語コード
 * @param gameType ゲームタイプ（省略時はOCG）
 */
async function fetchMappingForLanguage(lang: string, gameType: CardGameType = 'ocg'): Promise<{ race: Mapping; monsterType: Mapping } | null> {
  try {
    // getCardSearchFormUrl経由で request_locale が自動付与されるため、
    // 特定の言語が必要な場合は buildApiUrl を直接使用
    const { buildApiUrl } = await import('@/utils/url-builder');
    const path = `card_search.action?ope=1&request_locale=${lang}`;
    const url = buildApiUrl(path, gameType);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch search form for ${lang}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const raceMapping = extractRaceMapping(doc);
    const monsterTypeMapping = extractMonsterTypeMapping(doc);

    return {
      race: raceMapping,
      monsterType: monsterTypeMapping,
    };
  } catch (error) {
    console.error(`Error fetching mapping for ${lang}:`, error);
    return null;
  }
}

// 数値ID → 内部ID のマッピング
const raceNumericToInternal = new Map<string, string>();
const monsterTypeNumericToInternal = new Map<string, string>();

// 日本語マッピングから逆引き
async function initializeConversionMaps() {
  // 日本語の検索フォームから数値IDマッピングを取得
  const jaResult = await fetchMappingForLanguage('ja');
  if (!jaResult) {
    console.error('[Mapping Updater] Failed to fetch Japanese mapping for conversion');
    return false;
  }

  // 種族: 日本語テキスト → 数値ID
  const jaRaceNumeric = jaResult.race;

  // RACE_MAPから: 内部ID → 日本語テキスト
  for (const [internalId, jaText] of Object.entries(RACE_MAP)) {
    const numericId = jaRaceNumeric[jaText];
    if (numericId) {
      raceNumericToInternal.set(numericId, internalId);
    }
  }

  // モンスタータイプも同様
  const jaMonsterTypeNumeric = jaResult.monsterType;
  for (const [internalId, jaText] of Object.entries(MONSTER_TYPE_MAP)) {
    const numericId = jaMonsterTypeNumeric[jaText];
    if (numericId) {
      monsterTypeNumericToInternal.set(numericId, internalId);
    }
  }

  return true;
}

/**
 * 数値IDマッピングを内部IDマッピングに変換
 */
function convertToInternalIds<T extends string>(numericMapping: Mapping, conversionMap: Map<string, string>): Record<string, T> {
  const result: Record<string, T> = {};

  for (const [text, numericId] of Object.entries(numericMapping)) {
    const internalId = conversionMap.get(numericId);
    if (internalId) {
      result[text] = internalId as T;
    }
  }

  return result;
}

/**
 * 全言語のマッピングを取得
 */

/**
 * 単一言語のマッピングを更新してストレージに保存
 */
export async function updateMappingForLanguage(lang: string): Promise<boolean> {
  try {
    // 日本語マッピングから変換マップを初期化（まだの場合）
    if (raceNumericToInternal.size === 0 || monsterTypeNumericToInternal.size === 0) {
      const initialized = await initializeConversionMaps();
      if (!initialized) {
        console.error('[Mapping Updater] Failed to initialize conversion maps');
        return false;
      }
    }

    // 指定言語のマッピングを取得
    const result = await fetchMappingForLanguage(lang);
    if (!result) {
      console.warn(`[Mapping Updater] Failed to fetch ${lang}`);
      return false;
    }

    // 数値ID → 内部ID に変換
    const raceMappings = convertToInternalIds<Race>(result.race, raceNumericToInternal);
    const monsterTypeMappings = convertToInternalIds<MonsterType>(result.monsterType, monsterTypeNumericToInternal);

    // ストレージに保存（言語ごとに個別のキー）
    const mappings: LanguageMappings = {
      race: raceMappings,
      monsterType: monsterTypeMappings,
      updatedAt: Date.now(),
      quarter: getCurrentQuarter(),
    };

    const storageKey = `card_mappings_${lang}`;
    await chrome.storage.local.set({ [storageKey]: mappings });

    return true;
  } catch (error) {
    console.error(`[Mapping Updater] Failed to update ${lang}:`, error);
    return false;
  }
}

/**
 * 指定言語のマッピングをストレージから取得
 */
export async function getMappingForLanguage(lang: string): Promise<LanguageMappings | null> {
  try {
    const storageKey = `card_mappings_${lang}`;
    const result = await chrome.storage.local.get(storageKey);
    return (result[storageKey] as LanguageMappings | undefined) || null;
  } catch (error) {
    console.error(`[Mapping Updater] Failed to get ${lang} mapping:`, error);
    return null;
  }
}

/**
 * 指定言語のマッピングが更新必要かチェック
 * （保存されていないか、四半期が変わっている場合）
 */
export async function needsUpdate(lang: string): Promise<boolean> {
  const mappings = await getMappingForLanguage(lang);
  if (!mappings) return true; // 保存されていない
  
  const currentQuarter = getCurrentQuarter();
  return mappings.quarter !== currentQuarter; // 四半期が異なる
}

export async function updateAllMappings(): Promise<boolean> {
  // 変換マップを初期化
  const initialized = await initializeConversionMaps();
  if (!initialized) {
    console.error('[Mapping Updater] Failed to initialize conversion maps');
    return false;
  }

  const allRaceMappings: AllMappings = {};
  const allMonsterTypeMappings: AllMappings = {};

  for (const lang of LANGUAGES) {
    const result = await fetchMappingForLanguage(lang);

    if (result) {
      // 数値ID → 内部ID に変換
      allRaceMappings[lang] = convertToInternalIds<Race>(result.race, raceNumericToInternal);
      allMonsterTypeMappings[lang] = convertToInternalIds<MonsterType>(result.monsterType, monsterTypeNumericToInternal);
    } else {
      console.warn(`[Mapping Updater] Failed to fetch ${lang}, skipping`);
    }

    // レート制限対策: 各リクエストの間に500ms待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ストレージに保存（内部ID形式で保存）
  const mappings: StoredMappings = {
    race: allRaceMappings,
    monsterType: allMonsterTypeMappings,
    updatedAt: Date.now(),
  };

  try {
    await chrome.storage.local.set({ 'card_mappings': mappings });
    return true;
  } catch (error) {
    console.error('[Mapping Updater] Failed to save mappings:', error);
    return false;
  }
}

/**
 * ストレージからマッピングを取得
 */
export async function getMappings(): Promise<StoredMappings | null> {
  try {
    const result = await chrome.storage.local.get('card_mappings');
    return (result.card_mappings as StoredMappings | undefined) || null;
  } catch (error) {
    console.error('[Mapping Updater] Failed to get mappings:', error);
    return null;
  }
}

/**
 * マッピングが古いかチェック（7日以上）
 */
export function isMappingStale(mappings: StoredMappings | null): boolean {
  if (!mappings) return true;

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - mappings.updatedAt) > SEVEN_DAYS;
}
