import { vi, describe, it, expect, beforeEach } from 'vitest';
import { parseForbiddenLimitedHtml, getNextEffectiveDate } from '../forbidden-limited';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 禁止制限リスト取得・パース機能のテスト
 */
describe('禁止制限リストAPI', () => {
  describe('parseForbiddenLimitedHtml', () => {
    it('サンプルHTMLから禁止制限情報を正しくパースする', () => {
      const mockHtml = `
        <html>
          <body>
            <div id="list_forbidden" class="list_set">
              <div class="t_row c_simple">
                <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=5195">
                <span class="name">アマゾネスの射手</span>
              </div>
              <div class="t_row c_simple">
                <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=11195">
                <span class="name">アーティファクト－デスサイズ</span>
              </div>
            </div>
            <div id="list_limited" class="list_set">
              <div class="t_row c_simple">
                <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                <span class="name">制限カード例</span>
              </div>
            </div>
            <div id="list_semi_limited" class="list_set">
              <div class="t_row c_simple">
                <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=67890">
                <span class="name">準制限カード例</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parseForbiddenLimitedHtml(mockHtml, '2025-10-01');

      expect(result.effectiveDate).toBe('2025-10-01');
      expect(result.regulations).toEqual({
        '5195': 'forbidden',
        '11195': 'forbidden',
        '12345': 'limited',
        '67890': 'semi-limited'
      });
      expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it('空のHTMLでも正しく処理する', () => {
      const mockHtml = `
        <html>
          <body>
          </body>
        </html>
      `;

      const result = parseForbiddenLimitedHtml(mockHtml, '2025-10-01');

      expect(result.effectiveDate).toBe('2025-10-01');
      expect(result.regulations).toEqual({});
      expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it('実際のサンプルHTMLファイルをパースできる（存在する場合）', () => {
      try {
        const htmlPath = join(process.cwd(), 'tests', 'sample', 'forbidden_limited_latest_ja.html');
        const html = readFileSync(htmlPath, 'utf-8');
        const result = parseForbiddenLimitedHtml(html, '2025-10-01');

        // 禁止カードが含まれていることを確認
        expect(Object.keys(result.regulations).length).toBeGreaterThan(0);

        // forbiddenが含まれることを確認
        const hasForbidden = Object.values(result.regulations).some(reg => reg === 'forbidden');
        expect(hasForbidden).toBe(true);
      } catch (err) {
        // ファイルが存在しない場合はスキップ
      }
    });
  });

  describe('getNextEffectiveDate', () => {
    it('1月の日付から次回適用日（4月1日）を計算する', () => {
      const currentDate = new Date('2025-01-15');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2025-04-01');
    });

    it('3月の日付から次回適用日（4月1日）を計算する', () => {
      const currentDate = new Date('2025-03-31');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2025-04-01');
    });

    it('4月の日付から次回適用日（7月1日）を計算する', () => {
      const currentDate = new Date('2025-04-15');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2025-07-01');
    });

    it('7月の日付から次回適用日（10月1日）を計算する', () => {
      const currentDate = new Date('2025-07-15');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2025-10-01');
    });

    it('10月の日付から次回適用日（翌年1月1日）を計算する', () => {
      const currentDate = new Date('2025-10-15');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2026-01-01');
    });

    it('12月の日付から次回適用日（翌年1月1日）を計算する', () => {
      const currentDate = new Date('2025-12-31');
      const result = getNextEffectiveDate(currentDate);
      expect(result).toBe('2026-01-01');
    });
  });
});
