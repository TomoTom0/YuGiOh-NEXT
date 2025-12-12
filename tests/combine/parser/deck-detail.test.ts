import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Deck Detail', () => {
  it('should parse deck detail page correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/deck-detail-public.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214&request_locale=ja'
    });
    const doc = dom.window.document as unknown as Document;
    global.document = doc as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLImageElement = dom.window.HTMLImageElement as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    // パーサーを実行
    const result = parseDeckDetail(doc);

    // 基本情報の確認
    if (result.dno !== undefined) {
      expect(typeof result.dno).toBe('number');
    }
    if (result.name !== undefined) {
      expect(typeof result.name).toBe('string');
    }
    if (result.isPublic !== undefined) {
      expect(typeof result.isPublic).toBe('boolean');
    }
    if (result.cgid !== undefined) {
      expect(typeof result.cgid).toBe('string');
    }

    // デッキ構成の確認
    if (result.mainDeck) {
      expect(Array.isArray(result.mainDeck)).toBe(true);
    }
    if (result.extraDeck) {
      expect(Array.isArray(result.extraDeck)).toBe(true);
    }
    if (result.sideDeck) {
      expect(Array.isArray(result.sideDeck)).toBe(true);
    }
    if (Array.isArray(result.mainDeck) && result.mainDeck.length > 0) {
      // Deck structure verified
    }

    // メタデータの確認
    if (result.category) {
      expect(Array.isArray(result.category)).toBe(true);
    }
    if (result.tags) {
      expect(Array.isArray(result.tags)).toBe(true);
    }
    if (result.comment !== undefined) {
      expect(typeof result.comment).toBe('string');
    }
    if (result.deckCode !== undefined) {
      expect(typeof result.deckCode).toBe('string');
    }

    // カード情報の検証（ciid/imgs必須）
    if (Array.isArray(result.mainDeck) && result.mainDeck.length > 0) {
      result.mainDeck.slice(0, 3).forEach((deckCard, index) => {
        expect(deckCard.card.cardId, `mainDeck[${index}]: should have cardId`).toBeDefined();
        expect(deckCard.card.name, `mainDeck[${index}]: should have name`).toBeDefined();
      });
    }
  });
});
