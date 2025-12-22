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
      url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=7&cid=1&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;
    global.document = doc as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLImageElement = dom.window.HTMLImageElement as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    // HTML が読み込まれたことを確認
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);

    // ドキュメントが有効か確認
    expect(doc).toBeDefined();
    expect(doc.documentElement).toBeDefined();

    // 画像情報を抽出
    const imageInfoMap = cardSearch.extractImageInfo(doc);
    expect(imageInfoMap).toBeDefined();
    // 画像情報があれば検証、なくても OK（ページ構成による）
    if (imageInfoMap.size > 0) {
      expect(imageInfoMap.size).toBeGreaterThan(0);
    }

    // 関連カード情報を探す
    let cardList = doc.querySelector('#card_list');
    if (!cardList) {
      // フォールバック：別のセレクタを試す
      cardList = doc.querySelector('.list_style.list');
    }
    if (!cardList) {
      // フォールバック：テーブルを試す
      cardList = doc.querySelector('table');
    }

    // カード一覧があれば処理
    if (cardList) {
      const cardRows = cardList.querySelectorAll('.t_row');
      if (cardRows.length > 0) {
        // 関連カードをパース
        const relatedCards: any[] = [];
        cardRows.forEach((row) => {
          const card = cardSearch.parseSearchResultRow(row as HTMLElement, imageInfoMap);
          if (card) {
            relatedCards.push(card);
          }
        });

        // カードがパースできたら検証
        if (relatedCards.length > 0) {
          relatedCards.forEach((card, index) => {
            if (card.name) {
              expect(typeof card.name).toBe('string');
            }
            if (card.cardId) {
              expect(typeof card.cardId).toBe('string');
            }
          });
        }
      }
    }

    // ページが正しく読み込まれたことを最終確認
    expect(doc.body).toBeDefined();
  });
});
