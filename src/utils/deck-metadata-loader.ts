/**
 * デッキメタデータローダー
 *
 * chrome.storage.localに保存された最新のメタデータを優先的に読み込み、
 * なければビルド時にバンドルされたJSONファイルから読み込む
 */

import initialMetadata from '@/data/deck-metadata.json';
import type { CategoryEntry } from '@/types/dialog';
import { assignCategoryGroups } from './category-grouping';
import { getDeckSearchPageUrl } from './url-builder';
import type { CardGameType } from '@/types/settings';

/**
 * デッキメタデータの型定義
 */
export interface DeckMetadataEntry {
  value: string;
  label: string;
}

export interface DeckMetadata {
  deckTypes: DeckMetadataEntry[];
  deckStyles: DeckMetadataEntry[];
  categories: CategoryEntry[];
  tags: Record<string, string>;
  lastUpdated: string;
}

const STORAGE_KEY = 'deck_metadata';

/**
 * chrome.storage.localからメタデータを取得
 */
async function getStoredMetadata(): Promise<DeckMetadata | null> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null;
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as DeckMetadata | undefined) || null;
  } catch (error) {
    console.error('Failed to load metadata from chrome.storage:', error);
    return null;
  }
}

/**
 * デッキメタデータを取得
 *
 * chrome.storage.localに保存されたデータを優先し、
 * なければ初期JSONファイルから読み込む
 */
export async function getDeckMetadata(): Promise<DeckMetadata> {
  const stored = await getStoredMetadata();

  if (stored) {
    console.log('Using deck metadata from chrome.storage (last updated:', stored.lastUpdated, ')');
    return stored;
  }

  console.log('Using initial deck metadata from JSON file');
  const initial = initialMetadata as any;
  
  // 初期JSONのcategoriesがRecord形式の場合は配列に変換
  if (initial.categories && !Array.isArray(initial.categories)) {
    const categoriesArray = Object.entries(initial.categories).map(([value, label]) => ({
      value,
      label: label as string
    }));
    initial.categories = assignCategoryGroups(categoriesArray);
  }
  
  return initial as DeckMetadata;
}

/**
 * chrome.storage.localにメタデータを保存
 */
export async function saveDeckMetadata(metadata: DeckMetadata): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('chrome.storage is not available');
    return;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: metadata });
    console.log('Saved deck metadata to chrome.storage');
  } catch (error) {
    console.error('Failed to save metadata to chrome.storage:', error);
    throw error;
  }
}

/**
 * select要素からオプションを抽出する共通ヘルパー関数
 * 
 * @param doc - DOMドキュメント
 * @param selector - select要素のCSSセレクタ
 * @param excludeTexts - 除外するテキストのリスト（デフォルト: ['------------']）
 * @returns オプションのマップ（value -> label）
 */
function extractOptionsFromSelect(
  doc: Document,
  selector: string,
  excludeTexts: string[] = ['------------']
): Record<string, string> {
  const optionsMap: Record<string, string> = {};
  const selectElement = doc.querySelector(selector);
  
  if (selectElement) {
    const options = selectElement.querySelectorAll('option');
    options.forEach((option: Element) => {
      const htmlOption = option as HTMLOptionElement;
      const value = htmlOption.value;
      const text = htmlOption.textContent?.trim() || '';

      if (text && !excludeTexts.includes(text) && value) {
        optionsMap[value] = text;
      }
    });
  }
  
  return optionsMap;
}

/**
 * デッキ検索ページからメタデータを取得して更新
 * @param gameType ゲームタイプ（省略時はOCG）
 */
export async function updateDeckMetadata(gameType: CardGameType = 'ocg'): Promise<DeckMetadata> {
  const searchPageUrl = getDeckSearchPageUrl(gameType, 'ja');

  try {
    const response = await fetch(searchPageUrl);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // デッキタイプを抽出
    const deckTypes: DeckMetadataEntry[] = [];
    const deckTypeInputs = doc.querySelectorAll('input[name="deck_type"]');
    deckTypeInputs.forEach((input: Element) => {
      const htmlInput = input as HTMLInputElement;
      const value = htmlInput.value;
      const label = doc.querySelector(`label[for="${htmlInput.id}"]`);
      const text = label?.textContent?.trim() || '';

      if (text && text !== '-----' && value) {
        deckTypes.push({ value, label: text });
      }
    });

    // デッキスタイルを抽出
    const deckStyles: DeckMetadataEntry[] = [];
    const deckStyleInputs = doc.querySelectorAll('input[name="deckStyle"]');
    deckStyleInputs.forEach((input: Element) => {
      const htmlInput = input as HTMLInputElement;
      const value = htmlInput.value;
      const label = doc.querySelector(`label[for="${htmlInput.id}"]`);
      const text = label?.textContent?.trim() || '';

      if (text && text !== '----' && value && value !== '-1') {
        deckStyles.push({ value, label: text });
      }
    });

    // カテゴリを抽出して配列形式+グループ情報を付与
    const categoriesRecord = extractOptionsFromSelect(doc, 'select[name="dckCategoryMst"]');
    const categoriesArray = Object.entries(categoriesRecord).map(([value, label]) => ({
      value,
      label
    }));
    const categories = assignCategoryGroups(categoriesArray);

    // タグを抽出（共通ヘルパー使用）
    const tags = extractOptionsFromSelect(doc, 'select[name="dckTagMst"]');

    const metadata: DeckMetadata = {
      deckTypes,
      deckStyles,
      categories,
      tags,
      lastUpdated: new Date().toISOString()
    };

    // chrome.storage.localに保存
    await saveDeckMetadata(metadata);

    console.log('Updated deck metadata:', {
      deckTypes: metadata.deckTypes.length,
      deckStyles: metadata.deckStyles.length,
      categories: Object.keys(metadata.categories).length,
      tags: Object.keys(metadata.tags).length
    });

    return metadata;
  } catch (error) {
    console.error('Failed to update deck metadata:', error);
    throw error;
  }
}
