import { describe, it, expect } from 'vitest';
import { embedDeckInfoToPNG, extractDeckInfoFromPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// テスト用フィクスチャのパス
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../fixtures/png');

// テスト用デッキ情報
const sampleDeckInfo: DeckInfo = {
  mainDeck: [
    {
      card: {
        cardId: '12950',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }]
      } as any,
      quantity: 2
    },
    {
      card: {
        cardId: '4861',
        ciid: '2',
        imgs: [{ ciid: '2', imgHash: '4861_2_1_1' }]
      } as any,
      quantity: 1
    }
  ],
  extraDeck: [
    {
      card: {
        cardId: '9753',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '9753_1_1_1' }]
      } as any,
      quantity: 1
    }
  ],
  sideDeck: [
    {
      card: {
        cardId: '14558',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '14558_1_1_1' }]
      } as any,
      quantity: 3
    }
  ]
};

describe('png-metadata', () => {
  describe('embedDeckInfoToPNG', () => {
    it('should embed deck info into a valid PNG', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should throw error for invalid PNG (bad signature)', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'invalid-signature.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      await expect(embedDeckInfoToPNG(pngBlob, sampleDeckInfo)).rejects.toThrow(
        'Invalid PNG file: signature mismatch'
      );
    });

    it('should handle PNG with existing tEXt chunks', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'multi-text.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should embed deck info with correct structure', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(result);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
      expect(extracted!.extra).toHaveLength(1);
      expect(extracted!.side).toHaveLength(1);

      expect(extracted!.main[0]).toEqual({
        cid: '12950',
        ciid: '1',
        enc: '12950_1_1_1',
        quantity: 2
      });
    });
  });

  describe('extractDeckInfoFromPNG', () => {
    it('should extract deck info from PNG with DeckInfo tEXt chunk', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
      expect(extracted!.extra).toHaveLength(1);
      expect(extracted!.side).toHaveLength(1);
    });

    it('should return null for PNG without DeckInfo tEXt chunk', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid PNG', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'invalid-signature.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should handle PNG with multiple tEXt chunks', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'multi-text.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
    });

    it('should validate CRC correctly', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      
      // CRCが正しく計算されているか確認（抽出が成功すればCRCも正しい）
      const extracted = await extractDeckInfoFromPNG(embedded);
      expect(extracted).not.toBeNull();
    });
  });

  describe('round-trip test', () => {
    it('should preserve deck info through embed and extract', async () => {
      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main[0].cid).toBe('12950');
      expect(extracted!.main[0].quantity).toBe(2);
      expect(extracted!.main[1].cid).toBe('4861');
      expect(extracted!.extra[0].cid).toBe('9753');
      expect(extracted!.side[0].cid).toBe('14558');
      expect(extracted!.side[0].quantity).toBe(3);
    });

    it('should handle empty decks', async () => {
      const emptyDeck: DeckInfo = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, emptyDeck);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(0);
      expect(extracted!.extra).toHaveLength(0);
      expect(extracted!.side).toHaveLength(0);
    });

    it('should handle special characters in enc field', async () => {
      const specialDeck: DeckInfo = {
        mainDeck: [
          {
            card: {
              cardId: '12950',
              ciid: '1',
              imgs: [{ ciid: '1', imgHash: 'test_あいう_123' }]
            } as any,
            quantity: 1
          }
        ],
        extraDeck: [],
        sideDeck: []
      };

      const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'valid-1x1.png'));
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, specialDeck);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main[0].enc).toBe('test_あいう_123');
    });
  });
});
