#!/usr/bin/env node
/**
 * デッキメタデータ（デッキタイプ、デッキスタイル、カテゴリ）を
 * デッキ検索ページから取得してJSONファイルに出力するスクリプト
 */

import fs from 'fs';
import https from 'https';
import { JSDOM } from 'jsdom';

const SEARCH_PAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja';
const OUTPUT_PATH = 'src/data/deck-metadata.json';

/**
 * URLからHTMLを取得
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * デッキタイプの選択肢を抽出
 */
function extractDeckTypes(doc) {
  const deckTypes = [];
  const inputs = doc.querySelectorAll('input[name="deck_type"]');

  inputs.forEach(input => {
    const value = input.value;
    const label = doc.querySelector(`label[for="${input.id}"]`);
    const text = label ? label.textContent.trim() : '';

    if (text && text !== '-----' && value) {
      deckTypes.push({ value, label: text });
    }
  });

  return deckTypes;
}

/**
 * デッキスタイルの選択肢を抽出
 */
function extractDeckStyles(doc) {
  const deckStyles = [];
  const inputs = doc.querySelectorAll('input[name="deckStyle"]');

  inputs.forEach(input => {
    const value = input.value;
    const label = doc.querySelector(`label[for="${input.id}"]`);
    const text = label ? label.textContent.trim() : '';

    if (text && text !== '----' && value && value !== '-1') {
      deckStyles.push({ value, label: text });
    }
  });

  return deckStyles;
}

/**
 * カテゴリの選択肢を抽出
 */
function extractCategories(doc) {
  const categories = {};
  const select = doc.querySelector('select[name="dckCategoryMst"]');

  if (select) {
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      const value = option.value;
      const text = option.textContent.trim();

      if (text && text !== '------------' && value) {
        categories[value] = text;
      }
    });
  }

  return categories;
}

/**
 * メイン処理
 */
async function main() {
  console.log('Fetching deck search page...');
  const html = await fetchHTML(SEARCH_PAGE_URL);

  console.log('Parsing HTML...');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  console.log('Extracting metadata...');
  const metadata = {
    deckTypes: extractDeckTypes(doc),
    deckStyles: extractDeckStyles(doc),
    categories: extractCategories(doc),
    lastUpdated: new Date().toISOString()
  };

  console.log(`Found ${metadata.deckTypes.length} deck types`);
  console.log(`Found ${metadata.deckStyles.length} deck styles`);
  console.log(`Found ${Object.keys(metadata.categories).length} categories`);

  // ディレクトリが存在しない場合は作成
  const dir = OUTPUT_PATH.substring(0, OUTPUT_PATH.lastIndexOf('/'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Writing to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metadata, null, 2), 'utf8');

  console.log('✓ Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
