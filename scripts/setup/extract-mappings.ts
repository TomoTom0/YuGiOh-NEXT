/**
 * 検索フォームHTMLからマッピングテーブルを抽出
 *
 * 使い方:
 *   npm run setup:extract-mappings
 */

import * as fs from 'fs';
import { JSDOM } from 'jsdom';

const languages = ['ja', 'ko', 'ae', 'cn', 'en', 'de', 'fr', 'it', 'es', 'pt'];

interface Mapping {
  [key: string]: string;
}

interface AllMappings {
  [lang: string]: Mapping;
}

// 種族マッピング抽出
function extractRaceMapping(doc: Document): Mapping {
  const mapping: Mapping = {};
  const raceCheckboxes = doc.querySelectorAll('input[name="species"]');
  raceCheckboxes.forEach(checkbox => {
    const value = checkbox.getAttribute('value');
    const span = checkbox.parentElement;
    if (span && value) {
      // spanのテキストから種族名を取得（inputタグのテキストを除く）
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

// モンスタータイプマッピング抽出
function extractMonsterTypeMapping(doc: Document): Mapping {
  const mapping: Mapping = {};
  // name="other" と name="jogai" の両方から抽出
  const typeCheckboxes = doc.querySelectorAll('input[name="other"], input[name="jogai"]');
  const seen = new Set<string>();

  typeCheckboxes.forEach(checkbox => {
    const value = checkbox.getAttribute('value');
    const span = checkbox.parentElement;
    if (span && value) {
      // spanのテキストからタイプ名を取得（inputタグのテキストを除く）
      const text = Array.from(span.childNodes)
        .filter(node => node.nodeType === 3) // テキストノードのみ
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

const allRaceMappings: AllMappings = {};
const allMonsterTypeMappings: AllMappings = {};

console.log('=== マッピングテーブル抽出 ===\n');

for (const lang of languages) {
  const filename = `./tmp/search-form-${lang}.html`;

  if (!fs.existsSync(filename)) {
    console.error(`✗ ${filename} が見つかりません`);
    continue;
  }

  const html = fs.readFileSync(filename, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const raceMapping = extractRaceMapping(doc);
  const monsterTypeMapping = extractMonsterTypeMapping(doc);

  allRaceMappings[lang] = raceMapping;
  allMonsterTypeMappings[lang] = monsterTypeMapping;

  console.log(`${lang.toUpperCase()}: Race=${Object.keys(raceMapping).length}, MonsterType=${Object.keys(monsterTypeMapping).length}`);
}

// JSONとして出力
fs.writeFileSync('./tmp/race-mappings-all.json', JSON.stringify(allRaceMappings, null, 2));
fs.writeFileSync('./tmp/monster-type-mappings-all.json', JSON.stringify(allMonsterTypeMappings, null, 2));

console.log('\n✓ 出力完了:');
console.log('  - ./tmp/race-mappings-all.json');
console.log('  - ./tmp/monster-type-mappings-all.json');
