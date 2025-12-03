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

    // パーサーを実行
    const result = parseDeckDetail(doc);

    // 基本情報の確認
    expect(typeof result.dno).toBe('number');
    expect(typeof result.name).toBe('string');
    expect(typeof result.isPublic).toBe('boolean');
    expect(typeof result.cgid).toBe('string');

    // デッキ構成の確認
    expect(Array.isArray(result.mainDeck)).toBe(true);
    expect(Array.isArray(result.extraDeck)).toBe(true);
    expect(Array.isArray(result.sideDeck)).toBe(true);
    expect(result.mainDeck.length).toBeGreaterThan(0);

    // メタデータの確認
    expect(Array.isArray(result.category)).toBe(true);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(typeof result.comment).toBe('string');
    expect(typeof result.deckCode).toBe('string');

    // カード情報の検証（ciid/imgs必須）
    result.mainDeck.forEach((deckCard, index) => {
      expect(deckCard.card.cardId, `mainDeck[${index}]: should have cardId`).toBeDefined();
      expect(deckCard.card.name, `mainDeck[${index}]: should have name`).toBeDefined();
      expect(deckCard.card.ciid, `mainDeck[${index}]: should have ciid`).toBeDefined();
      expect(deckCard.card.imgs, `mainDeck[${index}]: should have imgs`).toBeDefined();
    });
  });
});
