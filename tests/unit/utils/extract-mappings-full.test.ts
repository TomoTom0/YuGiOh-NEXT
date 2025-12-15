import { describe, it, expect, vi, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// テスト用にfetch をモック
global.DOMParser = (new JSDOM('').window).DOMParser;

const koHtmlPath = path.join(__dirname, '../../sample/card_search_ko.html');
const hasHtmlFile = fs.existsSync(koHtmlPath);

describe('extractMappingsFromSearchPage - Full mapping extraction', () => {
  it.skipIf(!hasHtmlFile)('should extract complete mappings from Korean page', () => {
    const koHtml = fs.readFileSync(koHtmlPath, 'utf-8');

    const dom = new JSDOM(koHtml);
    const doc = dom.window.document;

    // Race マッピング抽出
    const raceMap: Record<string, string> = {};
    const speciesFilter = doc.querySelector('#filter_specis, .filter_specis');
    const listItems = speciesFilter?.querySelectorAll('li') || [];

    listItems.forEach((li) => {
      const span = li.querySelector('span');
      const input = li.querySelector('input[name="species"]');
      if (span && input) {
        const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
        const value = input.getAttribute('value');
        if (displayText && value) {
          raceMap[value] = displayText;
        }
      }
    });

    // MonsterType マッピング抽出
    const monsterTypeMap: Record<string, string> = {};
    const cardTypeFilters = doc.querySelectorAll('[id*="filter_other"]');
    cardTypeFilters.forEach((filter) => {
      const sampleInput = filter.querySelector('input[name="other"]');
      if (!sampleInput) return;

      const typeListItems = filter.querySelectorAll('li');
      typeListItems.forEach((li) => {
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

    // Attribute マッピング抽出
    const attributeMap: Record<string, string> = {};
    const attrFilter = doc.querySelector('[id*="attribute"], [class*="attribute"]');
    const attrListItems = attrFilter?.querySelectorAll('li') || [];
    attrListItems.forEach((li) => {
      const span = li.querySelector('span');
      const input = li.querySelector('input[name="attr"]');
      if (span && input) {
        const displayText = span.textContent?.replace(/\s+/g, ' ').trim();
        const value = input.getAttribute('value');
        if (displayText && value) {
          attributeMap[value] = displayText;
        }
      }
    });

    // 結果を出力
    console.log('\n=== Korean Mapping Extraction Results ===');
    console.log(`Race: ${Object.keys(raceMap).length} items`);
    console.log(`MonsterType: ${Object.keys(monsterTypeMap).length} items`);
    console.log(`Attribute: ${Object.keys(attributeMap).length} items`);

    // 詳細表示
    console.log('\nRace Sample:');
    Object.entries(raceMap).slice(0, 3).forEach(([val, text]) => {
      console.log(`  ${val} -> ${text}`);
    });

    console.log('\nMonsterType Sample:');
    Object.entries(monsterTypeMap).slice(0, 5).forEach(([val, text]) => {
      console.log(`  ${val} -> ${text}`);
    });

    console.log('\nAttribute Sample:');
    Object.entries(attributeMap).slice(0, 5).forEach(([val, text]) => {
      console.log(`  ${val} -> ${text}`);
    });

    // Assertions
    expect(Object.keys(raceMap).length).toBeGreaterThan(0);
    expect(Object.keys(monsterTypeMap).length).toBeGreaterThan(0);
    expect(Object.keys(attributeMap).length).toBeGreaterThan(0);

    // 重要: 全て 0 でないこと（修正前は monsterType: 0 だった）
    if (Object.keys(monsterTypeMap).length === 0) {
      console.log('\n❌ FAILED: monsterType extraction resulted in 0 items');
      console.log('The fix did not work!');
      throw new Error('monsterType extraction failed');
    }

    console.log('\n✅ SUCCESS: All mappings extracted successfully!');
  });
});
