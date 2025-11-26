import { describe, it, expect, beforeEach } from 'vitest';
import { exportToCSV, exportToTXT } from '@/utils/deck-export';
import { importFromCSV, importFromTXT, importFromPNG } from '@/utils/deck-import';
import { embedDeckInfoToPNG } from '@/utils/png-metadata';
import type { DeckInfo, DeckEntry } from '@/types/deck';
import type { CardInfo } from '@/types/card';

/**
 * E2E Test: Deck Edit → Export → Import Flow
 * 
 * このテストは、デッキ編集→エクスポート→インポートの
 * 実際のユーザーフローを検証します。
 */
describe('E2E: Deck Edit → Export → Import Flow', () => {
  let sampleDeck: DeckInfo;

  beforeEach(() => {
    // テスト用のデッキ情報を準備
    sampleDeck = {
      mainDeck: [
        {
          card: {
            cardId: '12950',
            ciid: '1',
            name: '灰流うらら',
            imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }]
          } as CardInfo,
          quantity: 3
        },
        {
          card: {
            cardId: '4861',
            ciid: '2',
            name: '増殖するG',
            imgs: [{ ciid: '2', imgHash: '4861_2_1_1' }]
          } as CardInfo,
          quantity: 2
        }
      ],
      extraDeck: [
        {
          card: {
            cardId: '9753',
            ciid: '1',
            name: 'PSYフレームロード・Λ',
            imgs: [{ ciid: '1', imgHash: '9753_1_1_1' }]
          } as CardInfo,
          quantity: 1
        },
        {
          card: {
            cardId: '6172',
            ciid: '1',
            name: '閃刀姫－カガリ',
            imgs: [{ ciid: '1', imgHash: '6172_1_1_1' }]
          } as CardInfo,
          quantity: 2
        }
      ],
      sideDeck: [
        {
          card: {
            cardId: '14558',
            ciid: '1',
            name: '屋敷わらし',
            imgs: [{ ciid: '1', imgHash: '14558_1_1_1' }]
          } as CardInfo,
          quantity: 3
        }
      ]
    };
  });

  describe('CSV Format', () => {
    it('should successfully export and import deck via CSV', () => {
      // Step 1: デッキをCSV形式でエクスポート
      const csv = exportToCSV(sampleDeck, { includeSide: true });
      
      expect(csv).toBeTruthy();
      expect(csv).toContain('section,name,cid,ciid,enc,quantity');
      expect(csv).toContain('main,灰流うらら,12950,1');
      expect(csv).toContain('extra,PSYフレームロード・Λ,9753,1');
      expect(csv).toContain('side,屋敷わらし,14558,1');

      // Step 2: CSVをインポート
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.deckInfo).toBeDefined();

      // Step 3: インポートしたデッキが元のデッキと一致することを確認
      const imported = result.deckInfo!;
      
      expect(imported.mainDeck).toHaveLength(2);
      expect(imported.extraDeck).toHaveLength(2);
      expect(imported.sideDeck).toHaveLength(1);

      // メインデッキの検証
      const mainCard1 = imported.mainDeck.find(e => e.card.cardId === '12950');
      expect(mainCard1).toBeDefined();
      expect(mainCard1!.quantity).toBe(3);
      expect(mainCard1!.card.ciid).toBe('1');

      // エクストラデッキの検証
      const extraCard1 = imported.extraDeck.find(e => e.card.cardId === '9753');
      expect(extraCard1).toBeDefined();
      expect(extraCard1!.quantity).toBe(1);

      // サイドデッキの検証
      const sideCard1 = imported.sideDeck.find(e => e.card.cardId === '14558');
      expect(sideCard1).toBeDefined();
      expect(sideCard1!.quantity).toBe(3);
    });

    it('should export and import without side deck', () => {
      // Step 1: サイドデッキなしでエクスポート
      const csv = exportToCSV(sampleDeck, { includeSide: false });
      
      expect(csv).not.toContain('side');
      
      // Step 2: インポート
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo!.sideDeck).toHaveLength(0);
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(2);
    });
  });

  describe('TXT Format', () => {
    it('should successfully export and import deck via TXT', () => {
      // Step 1: デッキをTXT形式でエクスポート
      const txt = exportToTXT(sampleDeck, { includeSide: true });
      
      expect(txt).toBeTruthy();
      expect(txt).toContain('=== Main Deck (5 cards) ===');
      expect(txt).toContain('3x 灰流うらら');
      expect(txt).toContain('=== Extra Deck (3 cards) ===');
      expect(txt).toContain('=== Side Deck (3 cards) ===');

      // Step 2: TXTをインポート
      const result = importFromTXT(txt);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();

      // Step 3: インポートしたデッキが元のデッキと一致することを確認
      const imported = result.deckInfo!;
      
      expect(imported.mainDeck).toHaveLength(2);
      expect(imported.extraDeck).toHaveLength(2);
      expect(imported.sideDeck).toHaveLength(1);

      // 各セクションのカード枚数を検証
      const mainTotal = imported.mainDeck.reduce((sum, e) => sum + e.quantity, 0);
      const extraTotal = imported.extraDeck.reduce((sum, e) => sum + e.quantity, 0);
      const sideTotal = imported.sideDeck.reduce((sum, e) => sum + e.quantity, 0);
      
      expect(mainTotal).toBe(5);
      expect(extraTotal).toBe(3);
      expect(sideTotal).toBe(3);
    });
  });

  describe('PNG Format', () => {
    it('should successfully embed and extract deck info from PNG', async () => {
      // Step 1: 最小限のPNG画像を作成（1x1ピクセルの透明PNG）
      const minimalPNG = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, // IHDR length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
        0x1f, 0x15, 0xc4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0a, // IDAT length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
        0x0d, 0x0a, 0x2d, 0xb4, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND length
        0x49, 0x45, 0x4e, 0x44, // IEND
        0xae, 0x42, 0x60, 0x82  // CRC
      ]);
      const pngBlob = new Blob([minimalPNG], { type: 'image/png' });

      // Step 2: デッキ情報をPNGに埋め込む
      const pngWithDeck = await embedDeckInfoToPNG(pngBlob, sampleDeck);
      
      expect(pngWithDeck).toBeDefined();
      expect(pngWithDeck.size).toBeGreaterThan(pngBlob.size);

      // Step 3: PNGからデッキ情報を抽出
      const result = await importFromPNG(pngWithDeck);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.deckInfo).toBeDefined();

      // Step 4: 抽出したデッキが元のデッキと一致することを確認
      const imported = result.deckInfo!;
      
      expect(imported.mainDeck).toHaveLength(2);
      expect(imported.extraDeck).toHaveLength(2);
      expect(imported.sideDeck).toHaveLength(1);

      // 詳細な内容検証（nameはインポート時に'Card {cid}'形式になる場合がある）
      const mainCard1 = imported.mainDeck.find(e => e.card.cardId === '12950');
      expect(mainCard1).toBeDefined();
      expect(mainCard1!.quantity).toBe(3);
      expect(mainCard1!.card.cardId).toBe('12950');
    });

    it('should handle PNG without deck metadata', async () => {
      // メタデータなしのPNG
      const minimalPNG = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00,
        0x1f, 0x15, 0xc4, 0x89,
        0x00, 0x00, 0x00, 0x0a,
        0x49, 0x44, 0x41, 0x54,
        0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x0d, 0x0a, 0x2d, 0xb4,
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ]);
      const pngBlob = new Blob([minimalPNG], { type: 'image/png' });

      const result = await importFromPNG(pngBlob);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('PNG');
    });
  });

  describe('Round-trip Tests', () => {
    it('should maintain data integrity through CSV round-trip', () => {
      // エクスポート
      const csv = exportToCSV(sampleDeck, { includeSide: true });
      
      // インポート
      const imported = importFromCSV(csv);
      
      // 再エクスポート
      const csv2 = exportToCSV(imported.deckInfo!, { includeSide: true });
      
      // 2つのCSVが同じであることを確認
      expect(csv).toBe(csv2);
    });

    it('should maintain card IDs and quantities through TXT round-trip', () => {
      // エクスポート
      const txt = exportToTXT(sampleDeck, { includeSide: true });
      
      // インポート
      const imported = importFromTXT(txt);
      
      // カードIDと枚数が保持されていることを確認
      expect(imported.success).toBe(true);
      
      const mainCard = imported.deckInfo!.mainDeck.find(e => e.card.cardId === '12950');
      expect(mainCard!.quantity).toBe(3);
      
      const extraCard = imported.deckInfo!.extraDeck.find(e => e.card.cardId === '9753');
      expect(extraCard!.quantity).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty deck sections', () => {
      const emptyExtraDeck: DeckInfo = {
        mainDeck: sampleDeck.mainDeck,
        extraDeck: [],
        sideDeck: []
      };

      // CSV
      const csv = exportToCSV(emptyExtraDeck, { includeSide: true });
      const csvResult = importFromCSV(csv);
      expect(csvResult.success).toBe(true);
      expect(csvResult.deckInfo!.extraDeck).toHaveLength(0);
      expect(csvResult.deckInfo!.sideDeck).toHaveLength(0);

      // TXT
      const txt = exportToTXT(emptyExtraDeck, { includeSide: true });
      const txtResult = importFromTXT(txt);
      expect(txtResult.success).toBe(true);
      expect(txtResult.deckInfo!.extraDeck).toHaveLength(0);
    });

    it('should handle cards with special characters in names', () => {
      const specialDeck: DeckInfo = {
        mainDeck: [
          {
            card: {
              cardId: '123',
              ciid: '1',
              name: 'カード名に"引用符"と,カンマ',
              imgs: [{ ciid: '1', imgHash: '123_1_1_1' }]
            } as CardInfo,
            quantity: 1
          }
        ],
        extraDeck: [],
        sideDeck: []
      };

      // CSV
      const csv = exportToCSV(specialDeck, { includeSide: false });
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0].card.name).toContain('引用符');
    });

    it('should handle maximum quantity per card', () => {
      const maxQuantityDeck: DeckInfo = {
        mainDeck: [
          {
            card: {
              cardId: '12950',
              ciid: '1',
              name: '灰流うらら',
              imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }]
            } as CardInfo,
            quantity: 3
          }
        ],
        extraDeck: [],
        sideDeck: []
      };

      const csv = exportToCSV(maxQuantityDeck, { includeSide: false });
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0].quantity).toBe(3);
    });
  });
});
