import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Deck Detail (English)', () => {
  it('should parse English deck detail page correctly', async () => {
    // HTMLファイルを読み込み
    const htmlPath = path.join(__dirname, '../data/en/deck-detail-public-en.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMでパース
    const dom = new JSDOM(html, {
      url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=xxx&dno=123&request_locale=en'
    });
    const doc = dom.window.document as unknown as Document;

    // 言語検出テスト
    const metaLang = doc.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content');
    expect(metaLang).toBe('en');

    // パーサーを実行
    const result = parseDeckDetail(doc);
    expect(result).toBeDefined();

    // 基本情報の確認
    expect(typeof result.dno).toBe('number');
    expect(typeof result.name).toBe('string');
    expect(typeof result.isPublic).toBe('boolean');

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

    // サンプルカード（最初の3枚）の確認
    const sampleCards = result.mainDeck.slice(0, 3);
    sampleCards.forEach((deckCard, index) => {
      expect(deckCard.card.cardId, `Card ${index}: should have cardId`).toBeDefined();
      expect(deckCard.card.name, `Card ${index}: should have name`).toBeDefined();
      expect(deckCard.card.cardType, `Card ${index}: should have cardType`).toBeDefined();
      expect(typeof deckCard.quantity).toBe('number');

      // モンスターカードの場合
      if (deckCard.card.cardType === 'monster') {
        expect(deckCard.card.attribute).toBeDefined();
        expect(deckCard.card.race).toBeDefined();

        const validAttributes = ['light', 'dark', 'water', 'fire', 'earth', 'wind', 'divine'];
        const validRaces = ['dragon', 'spellcaster', 'warrior', 'fairy', 'fiend', 'zombie',
                           'machine', 'aqua', 'pyro', 'rock', 'windbeast', 'plant', 'insect',
                           'thunder', 'beast', 'beastwarrior', 'dinosaur', 'fish', 'seaserpent',
                           'reptile', 'psychic', 'divine', 'creatorgod', 'wyrm', 'cyberse', 'illusion'];

        expect(validAttributes).toContain(deckCard.card.attribute);
        expect(validRaces).toContain(deckCard.card.race);
      }

      // 魔法・罠カードの場合
      if (deckCard.card.cardType === 'spell' || deckCard.card.cardType === 'trap') {
        const effectType = deckCard.card.cardType === 'spell'
          ? deckCard.card.spellType
          : deckCard.card.trapType;

        if (effectType) {
          const validEffectTypes = ['normal', 'continuous', 'equip', 'field', 'quickplay', 'ritual', 'counter'];
          expect(validEffectTypes).toContain(effectType);
        }
      }
    });
  });
});
