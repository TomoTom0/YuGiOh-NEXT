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

export interface CategoryEntry {
  value: string;
  label: string;
  originalIndex: number;
  group: string[];
}

export interface TagEntry {
  value: string;
  label: string;
  originalIndex: number;
  group: string[];
}

export interface DeckMetadata {
  deckTypes: DeckMetadataEntry[];
  deckStyles: DeckMetadataEntry[];
  categories: CategoryEntry[];
  tags: TagEntry[];
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
 * ひらがなをカタカナに変換
 * @param char - 変換する文字
 * @returns カタカナ、変換不要ならそのまま返す
 */
function hiraganaToKatakana(char: string): string {
  const code = char.charCodeAt(0);
  // ひらがな (U+3040-U+309F) の範囲
  if (code >= 0x3040 && code <= 0x309F) {
    // カタカナに変換 (U+30A0-U+30FF)
    return String.fromCharCode(code + 0x60);
  }
  return char;
}

/**
 * ひらがな・カタカナの最初の一文字を取得（カタカナに統一）
 * @param text - チェックする文字列
 * @returns カタカナの最初の一文字（ruby_プレフィックス付き）、または null
 */
function getFirstKanaChar(text: string): string | null {
  const firstChar = text.charAt(0);
  // ひらがな (U+3040-U+309F) またはカタカナ (U+30A0-U+30FF)
  if ((firstChar >= '\u3040' && firstChar <= '\u309F') || 
      (firstChar >= '\u30A0' && firstChar <= '\u30FF')) {
    const katakana = hiraganaToKatakana(firstChar);
    return `ruby_${katakana}`;
  }
  return null;
}

/**
 * カテゴリの読みグループを決定
 * @param entries - カテゴリエントリ配列（originalIndex順にソート済みであること）
 * @returns グループ情報が追加されたエントリ配列
 */
function assignCategoryGroups(
  entries: Array<{ value: string; label: string; originalIndex: number }>
): CategoryEntry[] {
  const result: CategoryEntry[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    
    const group: string[] = [];
    
    // 特殊ケース: 「王家の神殿」
    if (entry.label === '王家の神殿') {
      group.push('ruby_オ');
      result.push({ 
        value: entry.value, 
        label: entry.label, 
        originalIndex: entry.originalIndex, 
        group 
      });
      continue;
    }
    
    // 最初の文字がかな文字の場合は自明
    const firstKana = getFirstKanaChar(entry.label);
    if (firstKana) {
      group.push(firstKana);
      result.push({ 
        value: entry.value, 
        label: entry.label, 
        originalIndex: entry.originalIndex, 
        group 
      });
      continue;
    }
    
    // 自明でない場合、前後の自明な読みを探す
    let prevKana: string | null = null;
    let nextKana: string | null = null;
    
    // 前方を探索
    for (let j = i - 1; j >= 0; j--) {
      const prev = result[j];
      if (prev && prev.group.length > 0) {
        prevKana = prev.group[0] || null;
        break;
      }
    }
    
    // 後方を探索
    for (let j = i + 1; j < entries.length; j++) {
      const next = entries[j];
      if (next) {
        const kana = getFirstKanaChar(next.label);
        if (kana) {
          nextKana = kana;
          break;
        }
      }
    }
    
    // 前後の読みに基づいてグループを決定
    if (prevKana && nextKana) {
      if (prevKana === nextKana) {
        group.push(prevKana);
      } else {
        group.push(prevKana, nextKana);
      }
    } else if (prevKana) {
      group.push(prevKana);
    } else if (nextKana) {
      group.push(nextKana);
    }
    // prevKana も nextKana もない場合は空配列のまま
    
    result.push({ 
      value: entry.value, 
      label: entry.label, 
      originalIndex: entry.originalIndex, 
      group 
    });
  }
  
  return result;
}

/**
 * タグの読みグループを決定
 * @param entries - タグエントリ配列
 * @returns グループ情報が追加されたエントリ配列
 */
function assignTagGroups(
  entries: Array<{ value: string; label: string; originalIndex: number }>
): TagEntry[] {
  const result: TagEntry[] = [];
  
  for (const entry of entries) {
    if (!entry) continue;
    
    const group: string[] = [];
    const label = entry.label;
    
    // 1. 「○○族」パターン
    if (label.endsWith('族')) {
      const race = label.slice(0, -1);
      group.push(race);
    }
    // 2. 「○○属性」パターン
    else if (label.endsWith('属性')) {
      const attribute = label.slice(0, -2);
      group.push(attribute);
    }
    // 3. モンスタータイプ（族でも属性でもない場合、既知のモンスタータイプかチェック）
    // 現時点では、族・属性以外はすべて others として扱う
    // 将来的に既知のモンスタータイプリストを作成する場合はここで判定
    else {
      group.push('others');
    }
    
    result.push({
      value: entry.value,
      label: entry.label,
      originalIndex: entry.originalIndex,
      group
    });
  }
  
  return result;
}

/**
 * select要素からオプションを抽出する共通ヘルパー関数
 * 
 * @param doc - DOMドキュメント
 * @param selector - select要素のCSSセレクタ
 * @param excludeTexts - 除外するテキストのリスト（デフォルト: ['------------']）
 * @returns オプションの配列（元の順序を保持）
 */
function extractOptionsFromSelect(
  doc: Document,
  selector: string,
  excludeTexts: string[] = ['------------']
): Array<{ value: string; label: string; originalIndex: number; group: string[] }> {
  const optionsArray: Array<{ value: string; label: string; originalIndex: number; group: string[] }> = [];
  const selectElement = doc.querySelector(selector);
  
  if (selectElement) {
    const options = selectElement.querySelectorAll('option');
    let index = 0;
    options.forEach((option: Element) => {
      const htmlOption = option as HTMLOptionElement;
      const value = htmlOption.value;
      const text = htmlOption.textContent?.trim() || '';

      if (text && !excludeTexts.includes(text) && value) {
        optionsArray.push({
          value,
          label: text,
          originalIndex: index++,
          group: []
        });
      }
    });
  }
  
  return optionsArray;
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

    // カテゴリを抽出してグループを割り当て
    const categoriesRaw = extractOptionsFromSelect(doc, 'select[name="dckCategoryMst"]');
    const categories = assignCategoryGroups(categoriesRaw);

    // タグを抽出してグループを割り当て
    const tagsRaw = extractOptionsFromSelect(doc, 'select[name="dckTagMst"]');
    const tags = assignTagGroups(tagsRaw);

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
      categories: metadata.categories.length,
      tags: metadata.tags.length
    });

    return metadata;
  } catch (error) {
    console.error('Failed to update deck metadata:', error);
    throw error;
  }
}
