import { describe, it, expect } from 'vitest';
import { calculateDeckHash, isDeckModified } from '../../../src/utils/deck-hash';
import type { DeckInfo } from '../../../src/types/deck';

describe('deck-hash', () => {
  // テスト用のヘルパー関数
  const createDeckInfo = (
    mainDeck: Array<{ cid: string; ciid: string; lang: string; quantity: number }> = [],
    extraDeck: Array<{ cid: string; ciid: string; lang: string; quantity: number }> = [],
    sideDeck: Array<{ cid: string; ciid: string; lang: string; quantity: number }> = []
  ): DeckInfo => ({
    dno: 1,
    name: 'Test Deck',
    mainDeck,
    extraDeck,
    sideDeck,
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
  });

  describe('calculateDeckHash', () => {
    it('同じデッキで同じハッシュが生成される', () => {
      const deck1 = createDeckInfo(
        [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }]
      );
      const deck2 = createDeckInfo(
        [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }]
      );

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('異なるデッキで異なるハッシュが生成される', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);
      const deck2 = createDeckInfo([{ cid: '4008', ciid: '4008', lang: 'ja', quantity: 3 }]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('空のデッキでもエラーが出ずにハッシュが生成される', () => {
      const emptyDeck = createDeckInfo();

      const hash = calculateDeckHash(emptyDeck);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(16);
    });

    it('カードの順序が異なると異なるハッシュになる', () => {
      const deck1 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
      ]);
      const deck2 = createDeckInfo([
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
      ]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('カードの数量が異なると異なるハッシュになる', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 2 }]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    it('mainDeck, extraDeck, sideDeck の順序が考慮される', () => {
      // mainDeckに2枚、extraDeckに1枚
      const deck1 = createDeckInfo(
        [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
        ],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }]
      );
      // mainDeckに1枚、extraDeckに1枚、sideDeckに1枚
      const deck2 = createDeckInfo(
        [{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 }],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }],
        [{ cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 }]
      );

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      // 同じカードでも配置が異なれば異なるハッシュになる
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isDeckModified', () => {
    it('同じデッキでfalseを返す', () => {
      const deck1 = createDeckInfo(
        [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }]
      );
      const deck2 = createDeckInfo(
        [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }]
      );

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(false);
    });

    it('カードが追加されたらtrueを返す', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 }]);
      const deck2 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
      ]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });

    it('カードの順序が変わったらtrueを返す', () => {
      const deck1 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
      ]);
      const deck2 = createDeckInfo([
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
      ]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });

    it('カードの数量が変わったらtrueを返す', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 2 }]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });

    it('カードが削除されたらtrueを返す', () => {
      const deck1 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
      ]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 }]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });
  });
});
