import { describe, it, expect, beforeEach } from 'vitest';
import { embedDeckInfoToPNG, extractDeckInfoFromPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';
import * as fs from 'fs';
import * as path from 'path';

// テスト用フィクスチャのパス
const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures/png');

// テスト用デッキ情報
const sampleDeckInfo: DeckInfo = {
  mainDeck: [
    {
      cid: '12950',
      ciid: '1',
      quantity: 2
    },
    {
      cid: '4861',
      ciid: '2',
      quantity: 1
    }
  ],
  extraDeck: [
    {
      cid: '9753',
      ciid: '1',
      quantity: 1
    }
  ],
  sideDeck: [
    {
      cid: '14558',
      ciid: '1',
      quantity: 3
    }
  ]
};

describe('png-metadata', () => {
  // 各テスト前にTempCardDBをセットアップ
  beforeEach(() => {
    const tempCardDB = getTempCardDB();
    tempCardDB.clear();
    // サンプルデッキのカード情報を登録
    tempCardDB.set('12950', {
      cardId: '12950',
      ciid: '1',
      name: '灰流うらら',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }]
    } as any);
    tempCardDB.set('4861', {
      cardId: '4861',
      ciid: '2',
      name: 'Test Card 2',
      cardType: 'monster',
      imgs: [{ ciid: '2', imgHash: '4861_2_1_1' }]
    } as any);
    tempCardDB.set('9753', {
      cardId: '9753',
      ciid: '1',
      name: 'Test Extra Card',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '9753_1_1_1' }]
    } as any);
    tempCardDB.set('14558', {
      cardId: '14558',
      ciid: '1',
      name: 'Test Side Card',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '14558_1_1_1' }]
    } as any);
  });

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
      // TempCardDBにカード情報を登録
      const { getTempCardDB } = await import('@/utils/temp-card-db');
      const tempCardDB = getTempCardDB();
      tempCardDB.set('12950', {
        cardId: '12950',
        ciid: '1',
        name: 'Test Card',
        cardType: 'monster',
        imgs: [{ ciid: '1', imgHash: 'test_あいう_123' }]
      } as any);

      const specialDeck: DeckInfo = {
        mainDeck: [
          {
            cid: '12950',
            ciid: '1',
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
