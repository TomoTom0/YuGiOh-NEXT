import { describe, it, expect, beforeEach } from 'vitest';
import { exportToCSV, exportToTXT } from '@/utils/deck-export';
import { importFromCSV, importFromTXT } from '@/utils/deck-import';
import type { DeckInfo } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';

// テスト用デッキ情報
const sampleDeck: DeckInfo = {
  dno: 1,
  name: 'Test Deck',
  mainDeck: [
    { cid: '12950', ciid: '1', quantity: 2 },
    { cid: '4861', ciid: '2', quantity: 1 }
  ],
  extraDeck: [
    { cid: '9753', ciid: '1', quantity: 1 }
  ],
  sideDeck: [
    { cid: '14558', ciid: '1', quantity: 3 }
  ],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
};

// テスト用カードデータをTempCardDBに登録
beforeEach(() => {
  const tempCardDB = getTempCardDB();
  
  // テスト用カードを登録
  tempCardDB.set('12950', {
    name: '灰流うらら',
    cardId: '12950',
    ciid: '1',
    imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }],
    cardType: 'monster'
  } as any);
  
  tempCardDB.set('4861', {
    name: '増殖するG',
    cardId: '4861',
    ciid: '2',
    imgs: [{ ciid: '2', imgHash: '4861_2_1_1' }],
    cardType: 'monster'
  } as any);
  
  tempCardDB.set('9753', {
    name: 'PSYフレームロード・Λ',
    cardId: '9753',
    ciid: '1',
    imgs: [{ ciid: '1', imgHash: '9753_1_1_1' }],
    cardType: 'monster'
  } as any);
  
  tempCardDB.set('14558', {
    name: '屋敷わらし',
    cardId: '14558',
    ciid: '1',
    imgs: [{ ciid: '1', imgHash: '14558_1_1_1' }],
    cardType: 'monster'
  } as any);
});

describe('deck-export', () => {
  describe('exportToCSV', () => {
    it('should export deck to CSV with all fields', () => {
      const csv = exportToCSV(sampleDeck);

      expect(csv).toBeDefined();
      expect(csv).toContain('section,name,cid,ciid,enc,quantity');
      expect(csv).toContain('main,灰流うらら,12950,1,12950_1_1_1,2');
      expect(csv).toContain('main,増殖するG,4861,2,4861_2_1_1,1');
      expect(csv).toContain('extra,PSYフレームロード・Λ,9753,1,9753_1_1_1,1');
      expect(csv).toContain('side,屋敷わらし,14558,1,14558_1_1_1,3');
    });

    it('should export CSV without side deck when includeSide is false', () => {
      const csv = exportToCSV(sampleDeck, { includeSide: false });

      expect(csv).toContain('main,灰流うらら');
      expect(csv).toContain('extra,PSYフレームロード・Λ');
      expect(csv).not.toContain('side,屋敷わらし');
    });

    it('should handle empty deck', () => {
      const emptyDeck: DeckInfo = {
        dno: 2,
        name: 'Empty Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(emptyDeck);

      expect(csv).toBe('section,name,cid,ciid,enc,quantity');
    });

    it('should escape card names with commas', () => {
      const tempCardDB = getTempCardDB();
      tempCardDB.set('99999', {
        name: 'Card, Name',
        cardId: '99999',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '99999_1_1_1' }],
        cardType: 'monster'
      } as any);
      
      const deckWithComma: DeckInfo = {
        dno: 3,
        name: 'Comma Deck',
        mainDeck: [
          { cid: '99999', ciid: '1', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(deckWithComma);

      expect(csv).toContain('"Card, Name"');
    });

    it('should escape card names with double quotes', () => {
      const tempCardDB = getTempCardDB();
      tempCardDB.set('88888', {
        name: 'Card "Name"',
        cardId: '88888',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '88888_1_1_1' }],
        cardType: 'monster'
      } as any);
      
      const deckWithQuote: DeckInfo = {
        dno: 4,
        name: 'Quote Deck',
        mainDeck: [
          { cid: '88888', ciid: '1', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(deckWithQuote);

      expect(csv).toContain('"Card ""Name"""');
    });

    it('should preserve imgHash correctly', () => {
      const csv = exportToCSV(sampleDeck);

      expect(csv).toContain('12950_1_1_1');
      expect(csv).toContain('4861_2_1_1');
    });
  });

  describe('exportToTXT', () => {
    it('should export deck to TXT with all sections', () => {
      const txt = exportToTXT(sampleDeck);

      expect(txt).toBeDefined();
      expect(txt).toContain('=== Main Deck (3 cards) ===');
      expect(txt).toContain('2x 灰流うらら (12950:1:12950_1_1_1)');
      expect(txt).toContain('1x 増殖するG (4861:2:4861_2_1_1)');
      expect(txt).toContain('=== Extra Deck (1 cards) ===');
      expect(txt).toContain('1x PSYフレームロード・Λ (9753:1:9753_1_1_1)');
      expect(txt).toContain('=== Side Deck (3 cards) ===');
      expect(txt).toContain('3x 屋敷わらし (14558:1:14558_1_1_1)');
    });

    it('should export TXT without side deck when includeSide is false', () => {
      const txt = exportToTXT(sampleDeck, { includeSide: false });

      expect(txt).toContain('=== Main Deck');
      expect(txt).toContain('=== Extra Deck');
      expect(txt).not.toContain('=== Side Deck');
      expect(txt).not.toContain('屋敷わらし');
    });

    it('should handle empty deck', () => {
      const emptyDeck: DeckInfo = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      const txt = exportToTXT(emptyDeck);

      expect(txt).toBe('');
    });

    it('should calculate card counts correctly', () => {
      const txt = exportToTXT(sampleDeck);

      expect(txt).toContain('Main Deck (3 cards)');
      expect(txt).toContain('Extra Deck (1 cards)');
      expect(txt).toContain('Side Deck (3 cards)');
    });

    it('should format with enc field', () => {
      const txt = exportToTXT(sampleDeck);

      const lines = txt.split('\n');
      const cardLine = lines.find(l => l.includes('灰流うらら'));

      expect(cardLine).toMatch(/\(\d+:\d+:\w+\)/);
    });
  });

  describe('round-trip tests', () => {
    it('should preserve data through CSV export and import', () => {
      const csv = exportToCSV(sampleDeck);
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);

      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
      expect(result.deckInfo!.mainDeck[0].quantity).toBe(2);
    });

    it('should preserve data through TXT export and import', () => {
      const txt = exportToTXT(sampleDeck);
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);

      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
      expect(result.deckInfo!.mainDeck[0].quantity).toBe(2);
    });

    it('should handle special characters through CSV round-trip', () => {
      const tempCardDB = getTempCardDB();
      tempCardDB.set('77777', {
        name: 'Card, "Name"',
        cardId: '77777',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: 'test_あいう_123' }],
        cardType: 'monster'
      } as any);
      
      const specialDeck: DeckInfo = {
        dno: 5,
        name: 'Special Deck',
        mainDeck: [
          { cid: '77777', ciid: '1', quantity: 2 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(specialDeck);
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0].cid).toBe('77777');
    });

    it('should maintain quantity and card order', () => {
      const csv = exportToCSV(sampleDeck);
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);

      const mainCards = result.deckInfo!.mainDeck;
      expect(mainCards[0].quantity).toBe(2);
      expect(mainCards[1].quantity).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle deck with only main deck', () => {
      const mainOnlyDeck: DeckInfo = {
        dno: 6,
        name: 'Main Only',
        mainDeck: sampleDeck.mainDeck,
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(mainOnlyDeck);
      const txt = exportToTXT(mainOnlyDeck);

      expect(csv).toContain('main,灰流うらら');
      expect(csv).not.toContain('extra,');
      expect(csv).not.toContain('side,');

      expect(txt).toContain('=== Main Deck');
      expect(txt).not.toContain('=== Extra Deck');
      expect(txt).not.toContain('=== Side Deck');
    });

    it('should handle cards without imgHash', () => {
      const tempCardDB = getTempCardDB();
      tempCardDB.set('66666', {
        name: '灰流うらら',
        cardId: '66666',
        ciid: '1',
        imgs: [],
        cardType: 'monster'
      } as any);
      
      const noHashDeck: DeckInfo = {
        dno: 7,
        name: 'No Hash',
        mainDeck: [
          { cid: '66666', ciid: '1', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(noHashDeck);

      expect(csv).toContain('main,灰流うらら,66666,1,,1');
    });

    it('should handle large quantities', () => {
      const largeDeck: DeckInfo = {
        dno: 8,
        name: 'Large Quantity',
        mainDeck: [
          { cid: '12950', ciid: '1', quantity: 3 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const csv = exportToCSV(largeDeck);
      const txt = exportToTXT(largeDeck);

      expect(csv).toContain(',3');
      expect(txt).toContain('3x 灰流うらら');
    });
  });
});
