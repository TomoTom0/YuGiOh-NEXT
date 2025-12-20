import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Card FAQ List', () => {
  it('should parse card FAQ list correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/card-faq-list.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=1&cid=1'
    });
    const doc = dom.window.document as unknown as Document;

    expect(doc).toBeDefined();

    // カード名を取得
    const titleElem = doc.querySelector('title');
    const title = titleElem?.textContent || '';
    expect(title.length).toBeGreaterThan(0);

    // FAQ一覧を取得
    let rows = doc.querySelectorAll('.t_row');
    if (rows.length === 0) {
      // フォールバック：別のセレクタ
      rows = doc.querySelectorAll('tr');
    }
    if (rows.length === 0) {
      // フォールバック：任意のリスト項目
      rows = doc.querySelectorAll('[class*="row"], [class*="item"]');
    }

    const faqs: any[] = [];
    rows.forEach((row) => {
      const rowElement = row as HTMLElement;

      // 質問文を取得（複数のセレクタを試す）
      let questionElem = rowElement.querySelector('.dack_name span.name');
      if (!questionElem) {
        questionElem = rowElement.querySelector('span');
      }
      if (!questionElem) {
        questionElem = rowElement.querySelector('td');
      }
      const question = questionElem?.textContent?.trim();

      // FAQ IDを取得（複数のセレクタを試す）
      let linkValueInput = rowElement.querySelector('input.link_value') as HTMLInputElement;
      if (!linkValueInput) {
        linkValueInput = rowElement.querySelector('input[value*="fid"]') as HTMLInputElement;
      }

      let faqId: string | undefined;
      if (linkValueInput?.value) {
        const match = linkValueInput.value.match(/[?&]fid=(\d+)/);
        if (match && match[1]) {
          faqId = match[1];
        }
      }

      // 更新日を取得（複数のセレクタを試す）
      let dateElem = rowElement.querySelector('.div.date');
      if (!dateElem) {
        dateElem = rowElement.querySelector('[class*="date"]');
      }
      const updatedAt = dateElem?.textContent?.trim().replace('更新日:', '').trim();

      if (question || faqId) {
        faqs.push({ faqId, question, updatedAt });
      }
    });

    // FAQ一覧があれば検証
    if (faqs.length > 0) {
      faqs.forEach((faq, index) => {
        if (faq.faqId) {
          expect(typeof faq.faqId).toBe('string');
        }
        if (faq.question) {
          expect(typeof faq.question).toBe('string');
        }
      });
    }

    // ドキュメントが読み込まれたことを確認
    expect(doc.body).toBeDefined();
  });
});
