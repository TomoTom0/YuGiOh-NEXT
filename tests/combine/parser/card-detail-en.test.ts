import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DOMParserをモックするため、JSDOMのwindow.DOMParserを使用
global.DOMParser = (new JSDOM()).window.DOMParser as any;
global.fetch = async () => ({ ok: false }) as any;

// パーサー関数をインポート
import * as cardSearch from '../../../src/api/card-search';

describe('Parser: Card Detail (English)', () => {
  it('should parse English card detail page correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/en/card-detail-en.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4831&request_locale=en'
    });
    const doc = dom.window.document as unknown as Document;

    // 収録シリーズのテスト
    const updateList = doc.querySelector('#update_list');
    expect(updateList).toBeDefined();

    if (updateList) {
      const packRows = updateList.querySelectorAll('.t_row');
      expect(packRows.length).toBeGreaterThan(0);
    }

    // 関連カードのテスト
    let cardList = doc.querySelector('#card_list');
    if (!cardList) {
      cardList = doc.querySelector('.list_style.list');
    }
    expect(cardList).toBeDefined();

    if (cardList) {
      const cardRows = cardList.querySelectorAll('.t_row');
      expect(cardRows.length).toBeGreaterThan(0);

      // 画像情報を抽出
      const imageInfoMap = cardSearch.extractImageInfo(doc);
      expect(imageInfoMap.size).toBeGreaterThan(0);

      // 最初の3枚の関連カードをパース
      const relatedCards: any[] = [];
      cardRows.forEach((row, index) => {
        if (index < 3) {
          const card = cardSearch.parseSearchResultRow(row as HTMLElement, imageInfoMap);
          if (card) {
            relatedCards.push(card);
          }
        }
      });

      expect(relatedCards.length).toBeGreaterThan(0);

      // 最初のカードの詳細確認
      if (relatedCards.length > 0) {
        const firstCard = relatedCards[0];
        expect(firstCard.cardId).toBeDefined();
        expect(firstCard.name).toBeDefined();
        expect(firstCard.cardType).toBeDefined();

        if (firstCard.cardType === 'monster') {
          expect(firstCard.attribute).toBeDefined();
          expect(firstCard.race).toBeDefined();
        }
      }
    }
  });
});
