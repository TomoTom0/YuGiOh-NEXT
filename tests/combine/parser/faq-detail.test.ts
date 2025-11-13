import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * HTMLElement内のカードリンクを {{カード名|cid}} 形式のテンプレートに変換
 */
function convertCardLinksToTemplate(element: HTMLElement): string {
  const cloned = element.cloneNode(true) as HTMLElement;

  // <br>を改行に変換
  cloned.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });

  // カードリンク <a href="...?cid=5533">カード名</a> を {{カード名|5533}} に変換
  cloned.querySelectorAll('a[href*="cid="]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = href.match(/[?&]cid=(\d+)/);
    if (match && match[1]) {
      const cardId = match[1];
      const cardName = link.textContent?.trim() || '';
      // {{カード名|cid}} 形式に変換
      link.replaceWith(`{{${cardName}|${cardId}}}`);
    }
  });

  return cloned.textContent?.trim() || '';
}

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
    // 質問文を取得（カードリンクを変換）
    console.log('--- Question Extraction ---');
    const questionElem = doc.querySelector('#question_text');
    if (!questionElem) {
      console.error('✗ #question_text not found');
      process.exit(1);
    }
    const question = convertCardLinksToTemplate(questionElem as HTMLElement);
    console.log('Question:', question.substring(0, 120) + '...');
    console.log('');

    // 回答を取得（カードリンクを変換）
    console.log('--- Answer Extraction ---');
    const answerElem = doc.querySelector('#answer_text');
    if (!answerElem) {
      console.error('✗ #answer_text not found');
      process.exit(1);
    }
    const answer = convertCardLinksToTemplate(answerElem as HTMLElement);
    console.log('Answer:', answer.substring(0, 120) + '...');
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

    // カードリンクテンプレートの検証
    const templatePattern = /\{\{[^|}]+\|\d+\}\}/;
    if (!templatePattern.test(question)) {
      errors.push('Question should contain card link templates');
    }

    if (!templatePattern.test(answer)) {
      errors.push('Answer should contain card link templates');
    }

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✓ All validations passed');
    }

    // カードリンク抽出
    console.log('\n--- Card Links Extraction ---');
    const questionLinks = [...question.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)];
    console.log(`Question contains ${questionLinks.length} card links:`);
    questionLinks.forEach(match => {
      console.log(`  - ${match[1]} (cid: ${match[2]})`);
    });

    const answerLinks = [...answer.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)];
    console.log(`Answer contains ${answerLinks.length} card links:`);
    answerLinks.forEach(match => {
      console.log(`  - ${match[1]} (cid: ${match[2]})`);
    });

    console.log('\n--- Summary ---');
    console.log('Question length:', question.length);
    console.log('Answer length:', answer.length);
    console.log('Has update date:', !!updatedAt);
    console.log('Total card links:', questionLinks.length + answerLinks.length);

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
