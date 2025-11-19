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

    // カテゴリを抽出（共通ヘルパー使用）
    const categories = extractOptionsFromSelect(doc, 'select[name="dckCategoryMst"]');

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
