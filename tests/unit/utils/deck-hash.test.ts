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
    // [covers:calculate_deck_hash.deterministic_same_content]
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

    // [covers:calculate_deck_hash.differs_by_cid]
    it('異なるデッキで異なるハッシュが生成される', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);
      const deck2 = createDeckInfo([{ cid: '4008', ciid: '4008', lang: 'ja', quantity: 3 }]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    // [covers:calculate_deck_hash.empty_deck_fixed_zero_hash]
    it('空のデッキでもエラーが出ずにハッシュが生成される', () => {
      const emptyDeck = createDeckInfo();

      const hash = calculateDeckHash(emptyDeck);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(16);
      // cardSequenceが空文字列の場合、simpleHash('')はhash=0のまま返るため固定値になる
      expect(hash).toBe('0000000000000000');
    });

    // [covers:calculate_deck_hash.return_length_always_16_hex]
    it('ハッシュは常に16文字の小文字16進文字列になる', () => {
      const decks = [
        createDeckInfo(),
        createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]),
        createDeckInfo(
          Array.from({ length: 40 }, (_, i) => ({
            cid: String(1000 + i),
            ciid: String(1000 + i),
            lang: 'ja',
            quantity: 3,
          }))
        ),
      ];

      for (const deck of decks) {
        const hash = calculateDeckHash(deck);
        expect(hash).toHaveLength(16);
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      }
    });

    // [covers:calculate_deck_hash.order_and_section_sensitive]
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

    // [covers:calculate_deck_hash.differs_by_quantity]
    it('カードの数量が異なると異なるハッシュになる', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 2 }]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      expect(hash1).not.toBe(hash2);
    });

    // [covers:calculate_deck_hash.order_and_section_sensitive]
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

    // [covers:calculate_deck_hash.ignores_ciid_and_lang]
    it('ciidやlangが異なってもcid/quantityが同じなら同じハッシュになる', () => {
      const deck1 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
      ]);
      const deck2 = createDeckInfo([
        { cid: '4007', ciid: '9999', lang: 'en', quantity: 1 },
      ]);

      const hash1 = calculateDeckHash(deck1);
      const hash2 = calculateDeckHash(deck2);

      // ハッシュ計算には cid:quantity のみが使われ、ciid/langは含まれない
      expect(hash1).toBe(hash2);
    });
  });

  describe('isDeckModified', () => {
    // [covers:is_deck_modified.false_when_hash_equal]
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

    // [covers:is_deck_modified.true_when_hash_differs]
    it('カードが追加されたらtrueを返す', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 }]);
      const deck2 = createDeckInfo([
        { cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 },
        { cid: '4008', ciid: '4008', lang: 'ja', quantity: 1 },
      ]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });

    // [covers:is_deck_modified.true_when_hash_differs]
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

    // [covers:is_deck_modified.true_when_hash_differs]
    it('カードの数量が変わったらtrueを返す', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 2 }]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }]);

      const result = isDeckModified(deck1, deck2);

      expect(result).toBe(true);
    });

    // [covers:is_deck_modified.false_when_only_ciid_or_lang_differs]
    it('ciidのみ異なる場合はfalseを返す（cid/quantityが同一のため）', () => {
      const deck1 = createDeckInfo([{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 1 }]);
      const deck2 = createDeckInfo([{ cid: '4007', ciid: '9999', lang: 'ja', quantity: 1 }]);

      const result = isDeckModified(deck1, deck2);

      // 実装上の既知の挙動: calculateDeckHashはciidを見ないため、ciid違いは検知されない
      expect(result).toBe(false);
    });

    // [covers:is_deck_modified.true_when_hash_differs]
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
