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
import { parseHTML } from 'linkedom';

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

/** ロケール別メタデータの更新間隔（バックグラウンドの定期更新間隔と同じ24時間） */
const METADATA_STALE_MS = 24 * 60 * 60 * 1000;

/**
 * ロケール別のchrome.storageキーを返す
 *
 * 'ja'は既存ユーザーのキャッシュ（無印の'deck_metadata'）をそのまま流用するため
 * サフィックスを付けない。それ以外のロケールは専用キーに保存する。
 */
function storageKeyForLocale(locale: string): string {
  return locale === 'ja' ? STORAGE_KEY : `${STORAGE_KEY}_${locale}`;
}

// メモリキャッシュ（ロケール別）
const cachedMetadata: Record<string, DeckMetadata> = {};

/**
 * chrome.storage.localからメタデータを取得
 */
async function getStoredMetadata(locale: string): Promise<DeckMetadata | null> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null;
  }

  const key = storageKeyForLocale(locale);
  try {
    const result = await chrome.storage.local.get(key);
    return (result[key] as DeckMetadata | undefined) || null;
  } catch (error) {
    console.error('Failed to load metadata from chrome.storage:', error);
    return null;
  }
}

/**
 * 指定ロケールのメタデータが未取得、または取得から24時間以上経過しているかを判定する
 *
 * ロケール別メタデータ（'ja'以外）はページ読み込み時にオンデマンドで取得するため、
 * 呼び出し側はこの関数で「更新が必要か」を確認してから `updateDeckMetadata` を呼び、
 * 毎回のページ読み込みで不要なfetchが発生しないようにする
 */
export async function isDeckMetadataStale(locale: string, maxAgeMs: number = METADATA_STALE_MS): Promise<boolean> {
  const stored = await getStoredMetadata(locale);
  if (!stored) return true;
  const age = Date.now() - new Date(stored.lastUpdated).getTime();
  return age >= maxAgeMs;
}

/**
 * デッキメタデータを取得
 *
 * chrome.storage.localに保存された指定ロケールのデータを優先し、
 * なければ初期JSONファイル（日本語）から読み込む
 *
 * 一度読み込んだデータはロケール別にメモリキャッシュされ、2回目以降は即座に返される
 *
 * @param locale カテゴリ/タグラベルのロケール（省略時は'ja'）。
 *   指定ロケールが未取得の場合は日本語版に暫定フォールバックする
 *   （呼び出し側で `updateDeckMetadata(gameType, locale)` を呼んで実データを取得すること）
 */
export async function getDeckMetadata(locale: string = 'ja'): Promise<DeckMetadata> {
  // キャッシュがあれば即座に返す
  if (cachedMetadata[locale]) {
    return cachedMetadata[locale];
  }

  const stored = await getStoredMetadata(locale);

  if (stored) {
    cachedMetadata[locale] = stored;
    return stored;
  }

  if (locale !== 'ja') {
    // 指定ロケールが未取得の場合は日本語版に暫定フォールバック
    // （キャッシュはしない。ロケール別データが取得され次第そちらを優先させるため）
    return getDeckMetadata('ja');
  }

  const initial = initialMetadata as any;

  // 初期JSONのcategoriesがRecord形式の場合は配列に変換
  if (initial.categories && !Array.isArray(initial.categories)) {
    const categoriesArray = Object.entries(initial.categories).map(([value, label]) => ({
      value,
      label: label as string
    }));
    initial.categories = assignCategoryGroups(categoriesArray);
  }

  cachedMetadata.ja = initial as DeckMetadata;
  return cachedMetadata.ja;
}

/**
 * chrome.storage.localにメタデータを保存
 */
export async function saveDeckMetadata(metadata: DeckMetadata, locale: string = 'ja'): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('chrome.storage is not available');
    return;
  }

  const key = storageKeyForLocale(locale);
  try {
    await chrome.storage.local.set({ [key]: metadata });
    cachedMetadata[locale] = metadata; // キャッシュを更新
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
 * @param locale 取得するカテゴリ/タグラベルのロケール（省略時は'ja'）
 */
export async function updateDeckMetadata(gameType: CardGameType = 'ocg', locale: string = 'ja'): Promise<DeckMetadata> {
  const searchPageUrl = getDeckSearchPageUrl(gameType, locale);

  try {
    const response = await fetch(searchPageUrl);
    const html = await response.text();

    // linkedom を使用（background script でも動作）
    const { document: doc } = parseHTML(html);

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
    // HTMLの順序を保持するため、直接配列で抽出
    const categoriesArray: DeckMetadataEntry[] = [];
    const categorySelect = doc.querySelector('select[name="dckCategoryMst"]');
    if (categorySelect) {
      const options = categorySelect.querySelectorAll('option');
      options.forEach((option: Element) => {
        const htmlOption = option as HTMLOptionElement;
        const value = htmlOption.value;
        const text = htmlOption.textContent?.trim() || '';

        if (text && text !== '------------' && value) {
          categoriesArray.push({ value, label: text });
        }
      });
    }
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
    await saveDeckMetadata(metadata, locale);

    return metadata;
  } catch (error) {
    console.error('Failed to update deck metadata:', error);
    throw error;
  }
}
