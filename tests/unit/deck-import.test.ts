import { describe, it, expect, vi } from 'vitest';
// import { readFileSync } from 'fs';
// import * as path from 'path';
import { importFromCSV, importFromTXT, importFromPNG } from '@/utils/deck-import';
import type { ImportResult } from '@/utils/deck-import';
import { embedDeckInfoToPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';

// テストフィクスチャディレクトリ（未使用）
// const fixturesDir = path.join(__dirname, '../fixtures');

// Test fixtures (inline data because happy-dom doesn't support fs module)
const validCSV = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,2
main,増殖するG,4861,2,1
extra,PSYフレームロード・Λ,9753,1,1
side,屋敷わらし,14558,1,3`;

const csvNoName = `section,cid,ciid,quantity
main,12950,1,2
extra,9753,1,1`;

const emptyCSV = `section,name,cid,ciid,quantity`;

const validTXT = `=== Main Deck ===
2x 灰流うらら (12950:1)
1x 増殖するG (4861:2)

=== Extra Deck ===
1x PSYフレームロード・Λ (9753:1)

=== Side Deck ===
3x 屋敷わらし (14558:1)`;

// English card names test
const validTXTEnglish = `=== Main Deck ===
2x Dark Grepher (12950:1)
1x Dimensional Eatos (4861:2)

=== Extra Deck ===
1x PSY-Framegear Λ (9753:1)

=== Side Deck ===
3x Ghost Belle & Haunted Mansion (14558:1)`;

describe('deck-import', () => {
  describe('importFromCSV', () => {
    it('should import valid CSV with all fields', () => {
      const csv = validCSV;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);

      const firstMain = result.deckInfo!.mainDeck[0];
      expect(firstMain.cid).toBe('12950');
      expect(firstMain.ciid).toBe('1');
      expect(firstMain.quantity).toBe(2);
    });

    it('should import CSV without name column', () => {
      const csv = csvNoName;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should return error for empty CSV', () => {
      const csv = emptyCSV;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle CSV without header', () => {
      const csv = 'main,灰流うらら,12950,1,2\nextra,PSYフレームロード・Λ,9753,1,1';
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
    });

    it('should skip invalid lines and add warnings', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,2
invalid,line,here
extra,PSYフレームロード・Λ,9753,1,1`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle quoted fields with commas', () => {
      const csv = `section,name,cid,ciid,quantity
main,"Card, Name",12950,1,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
    });

    it('should validate section values', () => {
      const csv = `section,name,cid,ciid,quantity
invalid,灰流うらら,12950,1,2`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('インポート可能なデータがありません');
    });
  });

  describe('importFromTXT', () => {
    it('should import valid TXT format', () => {
      const txt = validTXT;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.sideDeck).toHaveLength(1);
    });

    it('should handle TXT with enc field', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1:abc123)

=== Extra Deck ===
1x PSYフレームロード・Λ (9753:1:xyz789)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
    });

    it('should return error for empty TXT', () => {
      const txt = '';
      const result = importFromTXT(txt);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip invalid lines and add warnings', () => {
      const txt = `=== Main Deck ===
2x 灰流うらら (12950:1)
invalid line format
1x 増殖するG (4861:2)`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle empty lines', () => {
      const txt = `=== Main Deck ===

2x 灰流うらら (12950:1)


1x 増殖するG (4861:2)

=== Extra Deck ===`;
      const result = importFromTXT(txt);

      expect(result.success).toBe(true);
      expect(result.deckInfo!.mainDeck).toHaveLength(2);
    });
  });

  describe('importFromPNG', () => {
    // 最小限の有効な1x1 PNG画像
    const validPNG = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00,
      0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    it('should import deck info from PNG with embedded data', async () => {
      // サンプルデッキ情報
      const sampleDeck: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [{ cid: '12950', ciid: '1', quantity: 2 }],
        extraDeck: [{ cid: '9753', ciid: '1', quantity: 1 }],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // PNG画像にデッキ情報を埋め込む
      const pngBlob = new Blob([validPNG], { type: 'image/png' });
      const embeddedBlob = await embedDeckInfoToPNG(pngBlob, sampleDeck);

      // Fileオブジェクトを作成
      const file = new File([embeddedBlob], 'deck.png', { type: 'image/png' });

      // インポート
      const result = await importFromPNG(file);

      expect(result.success).toBe(true);
      expect(result.deckInfo).toBeDefined();
      expect(result.deckInfo!.mainDeck).toHaveLength(1);
      expect(result.deckInfo!.extraDeck).toHaveLength(1);
      expect(result.deckInfo!.mainDeck[0].cid).toBe('12950');
    });

    it('should return error for PNG without embedded data', async () => {
      const file = new File([validPNG], 'deck.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ情報を抽出できませんでした');
    });

    it('should handle invalid PNG file', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = new File([invalidBuffer], 'invalid.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty deck in PNG', async () => {
      const emptyDeck: DeckInfo = {
        dno: 1,
        name: 'Empty',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const pngBlob = new Blob([validPNG], { type: 'image/png' });
      const embeddedBlob = await embedDeckInfoToPNG(pngBlob, emptyDeck);

      const file = new File([embeddedBlob], 'empty-deck.png', { type: 'image/png' });

      const result = await importFromPNG(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });
  });

  describe('format detection and validation', () => {
    it('should handle Rush Duel format markers', () => {
      // Rush Duel detection logic would go here
      // Currently not implemented in deck-import.ts
      const csv = `section,name,cid,ciid,quantity
main,セブンスロード・マジシャン,15259,1,3`;
      const result = importFromCSV(csv);

      expect(result.success).toBe(true);
    });

    it('should validate card ID format', () => {
      const csv = `section,name,cid,ciid,quantity
main,Test Card,invalid_id,1,2`;
      const result = importFromCSV(csv);

      // Should handle gracefully or produce warnings
      expect(result.success).toBe(false);
    });

    it('should validate quantity range - allow up to 3 for normal cards', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,3`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck).toHaveLength(1);
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(3);
    });

    it('should allow quantity over 3 with warning (intentional for special formats)', () => {
      // Note: 通常カードは3枚制限だが、インポート時は99枚まで許容（デッキチェックは別処理）
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,10`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(true);
      expect(result.deckInfo?.mainDeck[0]?.quantity).toBe(10);
      // Note: 枚数制限チェックは card-limit.ts で別途実施される
    });

    it('should reject invalid quantity - zero', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,0`;
      const result = importFromCSV(csv);
      
      // Invalid quantity causes row to be skipped, resulting in "no importable data"
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });

    it('should reject invalid quantity - negative', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,-1`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });

    it('should reject invalid quantity - over 99', () => {
      const csv = `section,name,cid,ciid,quantity
main,灰流うらら,12950,1,100`;
      const result = importFromCSV(csv);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('インポート可能なデータがありません');
    });
  });
});
