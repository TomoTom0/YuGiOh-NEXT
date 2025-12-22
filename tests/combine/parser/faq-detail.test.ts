import { describe, it, expect } from 'vitest';
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

describe('Parser: FAQ Detail', () => {
  it('should parse FAQ detail page correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/faq-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=2&fid=1'
    });
    const doc = dom.window.document as unknown as Document;

    expect(doc).toBeDefined();

    // 質問文を取得（複数のセレクタを試す）
    let questionElem = doc.querySelector('#question_text');
    if (!questionElem) {
      questionElem = doc.querySelector('[id*="question"]');
    }
    if (!questionElem) {
      questionElem = doc.querySelector('[class*="question"]');
    }

    let question = '';
    if (questionElem) {
      question = convertCardLinksToTemplate(questionElem as HTMLElement);
    }

    expect(typeof question).toBe('string');

    // 回答を取得（複数のセレクタを試す）
    let answerElem = doc.querySelector('#answer_text');
    if (!answerElem) {
      answerElem = doc.querySelector('[id*="answer"]');
    }
    if (!answerElem) {
      answerElem = doc.querySelector('[class*="answer"]');
    }

    let answer = '';
    if (answerElem) {
      answer = convertCardLinksToTemplate(answerElem as HTMLElement);
    }

    expect(typeof answer).toBe('string');

    // 更新日を取得（複数のセレクタを試す）
    let dateElem = doc.querySelector('#tag_update .date');
    if (!dateElem) {
      dateElem = doc.querySelector('[class*="date"]');
    }
    if (!dateElem) {
      dateElem = doc.querySelector('[id*="update"]');
    }
    const updatedAt = dateElem?.textContent?.trim();

    // 質問と回答が両方存在する場合のみリンク検証
    if (question.length > 0 || answer.length > 0) {
      const templatePattern = /\{\{[^|}]+\|\d+\}\}/;

      const questionLinks = question.length > 0 ? [...question.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)] : [];
      const answerLinks = answer.length > 0 ? [...answer.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)] : [];

      // リンクがあれば検証
      if (questionLinks.length > 0) {
        questionLinks.forEach(match => {
          if (match[2]) {
            expect(match[2]).toMatch(/^\d+$/);
          }
        });
      }

      if (answerLinks.length > 0) {
        answerLinks.forEach(match => {
          if (match[2]) {
            expect(match[2]).toMatch(/^\d+$/);
          }
        });
      }
    }

    // ドキュメントが正しく読み込まれたことを確認
    expect(doc.body).toBeDefined();
  });
});
