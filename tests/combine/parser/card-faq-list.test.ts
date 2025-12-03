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

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5533&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;

    // カード名を取得
    const titleElem = doc.querySelector('title');
    const title = titleElem?.textContent || '';
    const cardName = title.split('|')[0]?.trim() || '';
    expect(cardName).toBeDefined();
    expect(cardName.length).toBeGreaterThan(0);

    // FAQ一覧を取得
    const rows = doc.querySelectorAll('.t_row');
    expect(rows.length).toBeGreaterThan(0);

    const faqs: any[] = [];
    rows.forEach((row) => {
      const rowElement = row as HTMLElement;

      // 質問文を取得
      const questionElem = rowElement.querySelector('.dack_name span.name');
      const question = questionElem?.textContent?.trim();

      // FAQ IDを取得
      const linkValueInput = rowElement.querySelector('input.link_value') as HTMLInputElement;
      if (!linkValueInput?.value) {
        return;
      }

      const match = linkValueInput.value.match(/[?&]fid=(\d+)/);
      if (!match || !match[1]) {
        return;
      }
      const faqId = match[1];

      // 更新日を取得
      const dateElem = rowElement.querySelector('.div.date');
      const updatedAt = dateElem?.textContent?.trim().replace('更新日:', '').trim() || undefined;

      if (question) {
        faqs.push({ faqId, question, updatedAt });
      }
    });

    expect(faqs.length).toBeGreaterThan(0);

    // FAQ検証
    faqs.forEach((faq, index) => {
      expect(faq.faqId, `FAQ ${index}: should have faqId`).toBeDefined();
      expect(faq.question, `FAQ ${index}: should have question`).toBeDefined();
    });
  });
});
