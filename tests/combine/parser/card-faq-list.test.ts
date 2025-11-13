import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * カードQA一覧パーサーのテスト
 * tests/combine/data/card-faq-list.htmlを使用
 */
async function testCardFAQListParser() {
  console.log('=== Testing Card FAQ List Parser ===\n');

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/card-faq-list.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5533&request_locale=ja'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // カード名を取得
    console.log('--- Card Name Extraction ---');
    const titleElem = doc.querySelector('title');
    const title = titleElem?.textContent || '';
    const cardName = title.split('|')[0]?.trim() || '';
    console.log('Title:', title);
    console.log('Card Name:', cardName);
    console.log('');

    // FAQ一覧を取得
    console.log('--- FAQ List Parsing ---');
    const rows = doc.querySelectorAll('.t_row');
    console.log(`Found ${rows.length} FAQ entries\n`);

    const faqs: any[] = [];
    rows.forEach((row, index) => {
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

        if (index < 3) {
          console.log(`FAQ ${index + 1}:`);
          console.log('  faqId:', faqId);
          console.log('  question:', question.substring(0, 80) + '...');
          console.log('  updatedAt:', updatedAt);
          console.log('');
        }
      }
    });

    console.log(`✓ Successfully parsed ${faqs.length} FAQs\n`);

    // 検証
    console.log('--- Validation ---');
    const errors: string[] = [];

    if (!cardName) {
      errors.push('Card name not found');
    }

    if (faqs.length === 0) {
      errors.push('No FAQs found');
    }

    faqs.forEach((faq, index) => {
      if (!faq.faqId) errors.push(`FAQ ${index}: missing faqId`);
      if (!faq.question) errors.push(`FAQ ${index}: missing question`);
    });

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✓ All validations passed');
    }

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('✗ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testCardFAQListParser();
