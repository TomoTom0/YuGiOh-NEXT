/**
 * デッキメタデータローダー
 *
 * chrome.storage.localに保存された最新のメタデータを優先的に読み込み、
 * なければビルド時にバンドルされたJSONファイルから読み込む
 */

import initialMetadata from '@/data/deck-metadata.json';

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
  categories: Record<string, string>;
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
    return result[STORAGE_KEY] || null;
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
  return initialMetadata as DeckMetadata;
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
 * デッキ検索ページからメタデータを取得して更新
 */
export async function updateDeckMetadata(): Promise<DeckMetadata> {
  const SEARCH_PAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja';

  try {
    const response = await fetch(SEARCH_PAGE_URL);
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

    // カテゴリを抽出
    const categories: Record<string, string> = {};
    const categorySelect = doc.querySelector('select[name="dckCategoryMst"]');
    if (categorySelect) {
      const options = categorySelect.querySelectorAll('option');
      options.forEach((option: Element) => {
        const htmlOption = option as HTMLOptionElement;
        const value = htmlOption.value;
        const text = htmlOption.textContent?.trim() || '';

        if (text && text !== '------------' && value) {
          categories[value] = text;
        }
      });
    }

    // タグを抽出
    const tags: Record<string, string> = {};
    const tagSelect = doc.querySelector('select[name="dckTagMst"]');
    if (tagSelect) {
      const options = tagSelect.querySelectorAll('option');
      options.forEach((option: Element) => {
        const htmlOption = option as HTMLOptionElement;
        const value = htmlOption.value;
        const text = htmlOption.textContent?.trim() || '';

        if (text && text !== '------------' && value) {
          tags[value] = text;
        }
      });
    }

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
