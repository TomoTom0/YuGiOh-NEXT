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

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;

    // 質問文を取得（カードリンクを変換）
    const questionElem = doc.querySelector('#question_text');
    expect(questionElem).toBeDefined();

    const question = questionElem ? convertCardLinksToTemplate(questionElem as HTMLElement) : '';
    expect(question).toBeDefined();
    expect(typeof question).toBe('string');
    expect(question.length).toBeGreaterThan(0);

    // 回答を取得（カードリンクを変換）
    const answerElem = doc.querySelector('#answer_text');
    expect(answerElem).toBeDefined();

    const answer = answerElem ? convertCardLinksToTemplate(answerElem as HTMLElement) : '';
    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);

    // 更新日を取得
    const dateElem = doc.querySelector('#tag_update .date');
    const updatedAt = dateElem?.textContent?.trim();
    expect(updatedAt).toBeDefined();

    // カードリンクテンプレートの検証
    const templatePattern = /\{\{[^|}]+\|\d+\}\}/;
    expect(templatePattern.test(question)).toBe(true);
    expect(templatePattern.test(answer)).toBe(true);

    // カードリンク抽出
    const questionLinks = [...question.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)];
    const answerLinks = [...answer.matchAll(/\{\{([^|}]+)\|(\d+)\}\}/g)];

    expect(questionLinks.length).toBeGreaterThan(0);
    expect(answerLinks.length).toBeGreaterThan(0);

    // 各リンクが有効な形式であることを確認
    questionLinks.forEach(match => {
      expect(match[1]).toBeDefined();
      expect(match[2]).toBeDefined();
      expect(match[2]).toMatch(/^\d+$/);
    });

    answerLinks.forEach(match => {
      expect(match[1]).toBeDefined();
      expect(match[2]).toBeDefined();
      expect(match[2]).toMatch(/^\d+$/);
    });
  });
});
