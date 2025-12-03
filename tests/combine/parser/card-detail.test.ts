import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DOMParserをモックするため、JSDOMのwindow.DOMParserを使用
global.DOMParser = (new JSDOM()).window.DOMParser as any;
global.fetch = async () => ({ ok: false }) as any;

// パーサー関数をインポート（内部関数なので直接テスト）
import * as cardSearch from '../../../src/api/card-search';

describe('Parser: Card Detail', () => {
  it('should parse card detail page correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/card-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12976&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;

    // 収録シリーズのテスト
    const updateList = doc.querySelector('#update_list');
    expect(updateList).toBeDefined();

    const packRows = updateList!.querySelectorAll('.t_row');
    expect(packRows.length).toBeGreaterThan(0);

    // 関連カードのテスト
    let cardList = doc.querySelector('#card_list');
    if (!cardList) {
      // カード詳細ページの場合
      cardList = doc.querySelector('.list_style.list');
    }
    expect(cardList).toBeDefined();

    const cardRows = cardList!.querySelectorAll('.t_row');
    expect(cardRows.length).toBeGreaterThan(0);

    // 画像情報を抽出
    const imageInfoMap = cardSearch.extractImageInfo(doc);
    expect(imageInfoMap.size).toBeGreaterThan(0);

    // 関連カードをパース
    const relatedCards: any[] = [];
    cardRows.forEach((row) => {
      const card = cardSearch.parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (card) {
        relatedCards.push(card);
      }
    });

    expect(relatedCards.length).toBeGreaterThan(0);

    // 関連カード検証
    relatedCards.forEach((card, index) => {
      expect(card.name, `Related card ${index}: should have name`).toBeDefined();
      expect(card.cardId, `Related card ${index}: should have cardId`).toBeDefined();
    });
  });
});
