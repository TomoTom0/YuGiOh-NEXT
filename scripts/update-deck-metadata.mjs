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
 * タグの選択肢を抽出
 */
function extractTags(doc) {
  const tags = {};
  const select = doc.querySelector('select[name="dckTagMst"]');

  if (select) {
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      const value = option.value;
      const text = option.textContent.trim();

      if (text && text !== '----------' && value) {
        tags[value] = text;
      }
    });
  }

  return tags;
}

/**
 * カテゴリの選択肢を抽出（配列形式+グループ情報付き）
 */
function extractCategories(doc) {
  const categoriesArray = [];
  const select = doc.querySelector('select[name="dckCategoryMst"]');

  if (select) {
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      const value = option.value;
      const text = option.textContent.trim();

      if (text && text !== '------------' && value) {
        categoriesArray.push({ value, label: text });
      }
    });
  }

  return assignCategoryGroups(categoriesArray);
}

/**
 * カテゴリにグループ情報を付与
 */
function assignCategoryGroups(categories) {
  return categories.map((cat, index) => {
    let group;
    
    // ルール1: 最初のカテゴリ（王家の神殿）
    if (index === 0) {
      group = ['ruby_オ'];
    }
    // ルール2: 2番目
    else if (index === 1) {
      group = ['ruby_ア'];
    }
    // ルール3: 一文字目がひらがな/カタカナ
    else {
      const firstChar = cat.label[0];
      if (firstChar && isKanaReadable(firstChar)) {
        group = [getKanaGroup(firstChar)];
      }
      // ルール4: カナ文字以外（漢字、英数字、記号等）
      else {
        group = determineGroupForNonKana(index, categories);
      }
    }
    
    return {
      value: cat.value,
      label: cat.label,
      originalIndex: index,
      group
    };
  });
}

function isHiragana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x3041 && code <= 0x3096;
}

function isKatakana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

function hiraganaToKatakana(char) {
  const code = char.charCodeAt(0);
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCharCode(code + 0x60);
  }
  return char;
}

function isKanaReadable(char) {
  return isHiragana(char) || isKatakana(char);
}

function getKanaGroup(char) {
  let katakana = char;
  if (isHiragana(char)) {
    katakana = hiraganaToKatakana(char);
  }

  const dakutenMap = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
    'ヴ': 'ヴ'
  };

  const seion = dakutenMap[katakana] || katakana;

  // 個々の文字をそのまま返す
  return `ruby_${seion}`;
}

function determineGroupForNonKana(index, categories) {
  let prevGroup = null;
  for (let i = index - 1; i >= 0; i--) {
    const prevLabel = categories[i]?.label;
    if (!prevLabel) continue;
    
    const firstChar = prevLabel[0];
    if (firstChar && isKanaReadable(firstChar)) {
      prevGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  let nextGroup = null;
  for (let i = index + 1; i < categories.length; i++) {
    const nextLabel = categories[i]?.label;
    if (!nextLabel) continue;
    
    const firstChar = nextLabel[0];
    if (firstChar && isKanaReadable(firstChar)) {
      nextGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  if (prevGroup && nextGroup && prevGroup === nextGroup) {
    return [prevGroup];
  }
  else if (prevGroup && nextGroup && prevGroup !== nextGroup) {
    return getGroupsBetween(prevGroup, nextGroup);
  }
  else if (prevGroup) {
    return [prevGroup];
  }
  else if (nextGroup) {
    return [nextGroup];
  }
  else {
    return ['ruby_その他'];
  }
}

function getGroupsBetween(start, end) {
  const KANA_LIST = [
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'カ', 'キ', 'ク', 'ケ', 'コ',
    'サ', 'シ', 'ス', 'セ', 'ソ',
    'タ', 'チ', 'ツ', 'テ', 'ト',
    'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
    'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
    'マ', 'ミ', 'ム', 'メ', 'モ',
    'ヤ', 'ユ', 'ヨ',
    'ラ', 'リ', 'ル', 'レ', 'ロ',
    'ワ', 'ヲ', 'ン',
    'ヴ'
  ];

  const startKana = start.replace('ruby_', '');
  const endKana = end.replace('ruby_', '');

  const startIndex = KANA_LIST.indexOf(startKana);
  const endIndex = KANA_LIST.indexOf(endKana);

  if (startIndex === -1 || endIndex === -1) {
    return [start, end];
  }

  const result = [];
  for (let i = startIndex; i <= endIndex; i++) {
    result.push(`ruby_${KANA_LIST[i]}`);
  }

  return result;
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
    tags: extractTags(doc),
    lastUpdated: new Date().toISOString()
  };

  console.log(`Found ${metadata.deckTypes.length} deck types`);
  console.log(`Found ${metadata.deckStyles.length} deck styles`);
  console.log(`Found ${metadata.categories.length} categories`);
  console.log(`Found ${Object.keys(metadata.tags).length} tags`);

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
