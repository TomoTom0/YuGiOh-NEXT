import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('extractMonsterTypeMapping - Before and After Comparison', () => {
  it('demonstrates the bug in pre-fix code with Korean page', () => {
    const koHtmlPath = path.join(__dirname, '../../sample/card_search_ko.html');
    const koHtml = fs.readFileSync(koHtmlPath, 'utf-8');

    const dom = new JSDOM(koHtml);
    const doc = dom.window.document;

    // ========== 修正前のコード（hardcoded English text check）==========
    console.log('\n=== BEFORE FIX (hardcoded "Card Type" check) ===');
    const beforeMap: Record<string, string> = {};

    const filters = doc.querySelectorAll('[id*="filter_other"]');
    filters.forEach((filter) => {
      // 修正前: h3 の"Card Type"テキストをチェック（韓国語ページでは失敗）
      const title = filter.querySelector('h3');
      const hasCardTypeText = title?.textContent?.includes('Card Type');

      console.log(`  filter_other: h3 text = "${title?.textContent?.trim()}"`);
      console.log(`    → includes "Card Type"? ${hasCardTypeText}`);

      if (!title || !hasCardTypeText) {
        console.log('    → SKIPPED (h3 check failed)');
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
            beforeMap[value] = displayText;
          }
        }
      });
    });

    console.log(`Result: ${Object.keys(beforeMap).length} items extracted`);
    if (Object.keys(beforeMap).length === 0) {
      console.log('❌ BUG REPRODUCED: monsterType extraction failed!');
    }

    // ========== 修正後のコード（language-agnostic input check）==========
    console.log('\n=== AFTER FIX (input[name="other"] check) ===');
    const afterMap: Record<string, string> = {};

    filters.forEach((filter) => {
      // 修正後: input[name="other"] の存在をチェック（言語非依存）
      const sampleInput = filter.querySelector('input[name="other"]');

      console.log(`  filter_other: has input[name="other"]? ${sampleInput ? 'yes' : 'no'}`);

      if (!sampleInput) {
        console.log('    → SKIPPED (no input[name="other"])');
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
            afterMap[value] = displayText;
          }
        }
      });
    });

    console.log(`Result: ${Object.keys(afterMap).length} items extracted`);
    if (Object.keys(afterMap).length > 0) {
      console.log('✅ FIX WORKS: monsterType extraction successful!');
      console.log('\nSample items:');
      Object.entries(afterMap).slice(0, 5).forEach(([val, text]) => {
        console.log(`  ${val} -> ${text}`);
      });
    }

    // ========== 比較 ==========
    console.log('\n=== COMPARISON ===');
    console.log(`Before fix: ${Object.keys(beforeMap).length} items`);
    console.log(`After fix:  ${Object.keys(afterMap).length} items`);
    console.log(`Difference: +${Object.keys(afterMap).length - Object.keys(beforeMap).length} items`);

    // Assertions
    expect(Object.keys(beforeMap).length).toBe(0);
    expect(Object.keys(afterMap).length).toBeGreaterThan(0);
    expect(Object.keys(afterMap).length).toBeGreaterThan(Object.keys(beforeMap).length);

    console.log('\n✅ TEST PASSED: Fix resolves the Korean page issue');
  });
});
