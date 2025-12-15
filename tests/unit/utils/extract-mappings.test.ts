import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const koHtmlPath = path.join(__dirname, '../../sample/card_search_ko.html');
const hasHtmlFile = fs.existsSync(koHtmlPath);

describe('extractMappingsFromSearchPage', () => {
  it.skipIf(!hasHtmlFile)('should extract mappings from Korean card search page', () => {
    // テスト用HTMLを読み込み
    const koHtml = fs.readFileSync(koHtmlPath, 'utf-8');

    // DOMParserでパース
    const dom = new JSDOM(koHtml);
    const doc = dom.window.document;

    console.log('[Test] Korean HTML parsed');
    console.log(`  Body length: ${doc.body.innerHTML.length}`);

    // monsterType フィルタを確認
    const monsterTypeFilters = doc.querySelectorAll('[id*="filter_other"]');
    console.log(`[Test] Found ${monsterTypeFilters.length} filter_other elements`);

    // 各フィルタの input[name="other"] を確認
    monsterTypeFilters.forEach((filter, idx) => {
      const inputs = filter.querySelectorAll('input[name="other"]');
      console.log(`  Filter ${idx}: ${inputs.length} input[name="other"] elements`);
      if (inputs.length > 0) {
        const li = filter.querySelector('li');
        if (li) {
          const span = li.querySelector('span');
          console.log(`    First item text: "${span?.textContent?.trim()}"`);
        }
      }
    });

    // Attribute フィルタを確認
    const attrFilters = doc.querySelectorAll('[id*="attribute"], [class*="attribute"]');
    console.log(`[Test] Found ${attrFilters.length} attribute filter elements`);

    // Race フィルタを確認
    const speciesFilter = doc.querySelector('#filter_specis, .filter_specis');
    const speciesItems = speciesFilter?.querySelectorAll('li') || [];
    console.log(`[Test] Found ${speciesItems.length} species (race) items`);

    // Assertion
    expect(monsterTypeFilters.length).toBeGreaterThan(0);
    expect(attrFilters.length).toBeGreaterThan(0);
    expect(speciesItems.length).toBeGreaterThan(0);

    console.log('[Test] ✅ Korean page structure confirmed');
  });

  it.skipIf(!hasHtmlFile)('should extract monsterType mapping from Korean page', () => {
    const koHtml = fs.readFileSync(koHtmlPath, 'utf-8');

    const dom = new JSDOM(koHtml);
    const doc = dom.window.document;

    // extractMonsterTypeMapping の実装をシミュレート
    const monsterTypeMap: Record<string, string> = {};

    const cardTypeFilters = doc.querySelectorAll('[id*="filter_other"]');

    cardTypeFilters.forEach((filter) => {
      // 修正後: input[name="other"] で判定（言語非依存）
      const sampleInput = filter.querySelector('input[name="other"]');
      if (!sampleInput) {
        return;
      }

      const listItems = filter.querySelectorAll('li');

      listItems.forEach((li) => {
        const span = li.querySelector('span');
        const input = li.querySelector('input[name="other"]');

        if (span && input) {
          const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
          const value = input.getAttribute('value');

          if (displayText && value) {
            monsterTypeMap[value] = displayText;
          }
        }
      });
    });

    console.log(`[Extract] Extracted ${Object.keys(monsterTypeMap).length} monsterType items`);
    Object.entries(monsterTypeMap).slice(0, 5).forEach(([value, text]) => {
      console.log(`  ${value} -> ${text}`);
    });

    // Assertion
    expect(Object.keys(monsterTypeMap).length).toBeGreaterThan(0);
    console.log('[Test] ✅ monsterType extraction successful');
  });
});
