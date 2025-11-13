import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 個別QA詳細パーサーのテスト
 * tests/combine/data/faq-detail.htmlを使用
 */
async function testFAQDetailParser() {
  console.log('=== Testing FAQ Detail Parser ===\n');

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/faq-detail.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115&request_locale=ja'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // 質問文を取得
    console.log('--- Question Extraction ---');
    const questionElem = doc.querySelector('#question_text');
    const question = questionElem?.textContent?.trim();
    console.log('Question:', question?.substring(0, 100) + '...');
    console.log('');

    // 回答を取得
    console.log('--- Answer Extraction ---');
    const answerElem = doc.querySelector('#answer_text');
    const answer = answerElem?.textContent?.trim() || '';
    console.log('Answer:', answer.substring(0, 100) + '...');
    console.log('');

    // 更新日を取得
    console.log('--- Update Date Extraction ---');
    const dateElem = doc.querySelector('#tag_update .date');
    const updatedAt = dateElem?.textContent?.trim();
    console.log('Updated At:', updatedAt);
    console.log('');

    // 検証
    console.log('--- Validation ---');
    const errors: string[] = [];

    if (!question) {
      errors.push('Question not found');
    }

    if (!answer) {
      errors.push('Answer not found');
    }

    if (typeof question !== 'string') {
      errors.push('Question should be string');
    }

    if (typeof answer !== 'string') {
      errors.push('Answer should be string');
    }

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✓ All validations passed');
    }

    console.log('\n--- Summary ---');
    console.log('Question length:', question?.length);
    console.log('Answer length:', answer.length);
    console.log('Has update date:', !!updatedAt);

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('✗ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testFAQDetailParser();
