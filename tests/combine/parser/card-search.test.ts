import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseSearchResultRow, extractImageInfo } from '../../../src/api/card-search';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Card Search', () => {
  it('should parse card search results correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/card-search-result.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=2&rp=100&page=1&mode=1&stype=1&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;
    global.document = doc as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLImageElement = dom.window.HTMLImageElement as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    // 検索結果を抽出
    const main980 = doc.querySelector('#main980');
    expect(main980).toBeDefined();

    const articleBody = main980!.querySelector('#article_body');
    expect(articleBody).toBeDefined();

    const cardList = articleBody!.querySelector('#card_list');
    expect(cardList).toBeDefined();

    const rows = cardList!.querySelectorAll('.t_row');
    expect(rows.length).toBeGreaterThan(0);

    // 画像情報を事前に抽出
    const imageInfoMap = extractImageInfo(doc);
    expect(imageInfoMap.size).toBeGreaterThan(0);

    // 各行をパース
    const cards: any[] = [];
    rows.forEach((row) => {
      const card = parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (card) {
        cards.push(card);
      }
    });

    expect(cards.length).toBeGreaterThan(0);

    // カード検証
    cards.forEach((card, index) => {
      expect(card.name, `Card ${index}: should have name`).toBeDefined();
      expect(card.cardId, `Card ${index}: should have cardId`).toBeDefined();
      expect(card.cardType, `Card ${index}: should have cardType`).toBeDefined();
      expect(card.ciid, `Card ${index}: should have ciid`).toBeDefined();
      expect(card.imgs, `Card ${index}: should have imgs`).toBeDefined();

      if (card.cardType === 'モンスター') {
        expect(card.attribute, `Card ${index}: monster should have attribute`).toBeDefined();
        expect(card.levelType, `Card ${index}: monster should have levelType`).toBeDefined();
        expect(card.levelValue, `Card ${index}: monster should have levelValue`).toBeDefined();
        expect(card.race, `Card ${index}: monster should have race`).toBeDefined();
        expect(Array.isArray(card.types), `Card ${index}: types should be array`).toBe(true);
      }
    });
  });
});
