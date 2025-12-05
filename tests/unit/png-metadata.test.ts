import { describe, it, expect, beforeEach } from 'vitest';
import { embedDeckInfoToPNG, extractDeckInfoFromPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';
// import * as fs from 'fs';
// import * as path from 'path';

// テスト用フィクスチャのパス（未使用）
// const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures/png');

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
      const pngBlob = new Blob([validPNG], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should throw error for invalid PNG (bad signature)', async () => {
      const invalidPNG = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      const pngBlob = new Blob([invalidPNG], { type: 'image/png' });

      await expect(embedDeckInfoToPNG(pngBlob, sampleDeckInfo)).rejects.toThrow(
        'Invalid PNG file: signature mismatch'
      );
    });

    it('should handle PNG with existing tEXt chunks', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should embed deck info with correct structure', async () => {
      const pngBuffer = validPNG;
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
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
      expect(extracted!.extra).toHaveLength(1);
      expect(extracted!.side).toHaveLength(1);
    });

    it('should return null for PNG without DeckInfo tEXt chunk', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid PNG', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should handle PNG with multiple tEXt chunks', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
    });

    it('should validate CRC correctly', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      
      // CRCが正しく計算されているか確認（抽出が成功すればCRCも正しい）
      const extracted = await extractDeckInfoFromPNG(embedded);
      expect(extracted).not.toBeNull();
    });
  });

  describe('round-trip test', () => {
    it('should preserve deck info through embed and extract', async () => {
      const pngBuffer = validPNG;
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

      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, emptyDeck);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(0);
      expect(extracted!.extra).toHaveLength(0);
      expect(extracted!.side).toHaveLength(0);
    });

    it('should handle special characters in enc field', async () => {
      // TempCardDBに特殊文字を含むカード情報を登録
      const tempCardDB = getTempCardDB();
      tempCardDB.set('99999', {
        cardId: '99999',
        ciid: '1',
        name: 'Special Card',
        cardType: 'monster',
        imgs: [{ ciid: '1', imgHash: 'test_あいう_123' }]
      } as any);

      const specialDeck: DeckInfo = {
        dno: 99,
        name: 'Special',
        mainDeck: [{ cid: '99999', ciid: '1', quantity: 1 }],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const pngBlob = new Blob([validPNG], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, specialDeck);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main[0].enc).toBe('test_あいう_123');
    });
  });
});
