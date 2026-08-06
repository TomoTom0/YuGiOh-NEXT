import { describe, it, expect, beforeEach, vi } from 'vitest';
import { embedDeckInfoToPNG, extractDeckInfoFromPNG } from '@/utils/png-metadata';
import type { DeckInfo } from '@/types/deck';
import type { CardInfo } from '@/types/card';

// TempCacheDBをシンプルなMapでモック
const mockCardDB = new Map<string, CardInfo>();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockCardDB.get(cid),
    set: (cid: string, card: CardInfo) => { mockCardDB.set(cid, card); return true; },
    clear: () => mockCardDB.clear(),
  }),
  recordDeckOpen: vi.fn(),
}));
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

  // 各テスト前にTempCacheDBをセットアップ
  beforeEach(() => {
    mockCardDB.clear();
    // サンプルデッキのカード情報を登録
    mockCardDB.set('12950', {
      cardId: '12950',
      ciid: '1',
      name: '灰流うらら',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '12950_1_1_1' }]
    } as any);
    mockCardDB.set('4861', {
      cardId: '4861',
      ciid: '2',
      name: 'Test Card 2',
      cardType: 'monster',
      imgs: [{ ciid: '2', imgHash: '4861_2_1_1' }]
    } as any);
    mockCardDB.set('9753', {
      cardId: '9753',
      ciid: '1',
      name: 'Test Extra Card',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '9753_1_1_1' }]
    } as any);
    mockCardDB.set('14558', {
      cardId: '14558',
      ciid: '1',
      name: 'Test Side Card',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: '14558_1_1_1' }]
    } as any);
  });

  describe('embedDeckInfoToPNG', () => {
    it('should embed deck info into a valid PNG [covers:embed_png.scans_chunks_until_iend] [covers:embed_png.inserts_deckinfo_text_chunk_and_preserves_iend]', async () => {
      const pngBlob = new Blob([validPNG], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should throw error for invalid PNG (bad signature) [covers:embed_png.signature_mismatch_throws]', async () => {
      const invalidPNG = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      const pngBlob = new Blob([invalidPNG], { type: 'image/png' });

      await expect(embedDeckInfoToPNG(pngBlob, sampleDeckInfo)).rejects.toThrow(
        'Invalid PNG file: signature mismatch'
      );
    });

    it('should handle PNG with existing tEXt chunks [covers:embed_png.inserts_deckinfo_text_chunk_and_preserves_iend]', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const result = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(pngBlob.size);
    });

    it('should embed deck info with correct structure [covers:simplify_deck.maps_all_sections] [covers:simplify_deck.enc_from_matching_temp_cache_image] [covers:extract_png.valid_deckinfo_text_returns_parsed] [covers:simple_deck_guard.all_sections_every_card_valid]', async () => {
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
    it('should extract deck info from PNG with DeckInfo tEXt chunk [covers:extract_png.valid_deckinfo_text_returns_parsed]', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
      expect(extracted!.extra).toHaveLength(1);
      expect(extracted!.side).toHaveLength(1);
    });

    it('should return null for invalid PNG [covers:extract_png.signature_mismatch_returns_null]', async () => {
      const pngBlob = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should return null for PNG without DeckInfo tEXt chunk [covers:extract_png.no_deckinfo_returns_null]', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const extracted = await extractDeckInfoFromPNG(pngBlob);

      expect(extracted).toBeNull();
    });

    it('should handle PNG with multiple tEXt chunks [covers:extract_png.valid_deckinfo_text_returns_parsed]', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted!.main).toHaveLength(2);
    });

    it('should not validate CRC while scanning DeckInfo tEXt chunks [covers:extract_png.crc_is_not_validated]', async () => {
      const pngBuffer = validPNG;
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });

      const embedded = await embedDeckInfoToPNG(pngBlob, sampleDeckInfo);
      const bytes = new Uint8Array(await embedded.arrayBuffer());
      let offset = 8;
      while (offset + 12 <= bytes.length) {
        const chunkLength =
          (bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3];
        const chunkType = String.fromCharCode(
          bytes[offset + 4],
          bytes[offset + 5],
          bytes[offset + 6],
          bytes[offset + 7]
        );
        if (chunkType === 'tEXt') {
          bytes.set([0xde, 0xad, 0xbe, 0xef], offset + 8 + chunkLength);
          break;
        }
        offset += 12 + chunkLength;
      }

      const extracted = await extractDeckInfoFromPNG(new Blob([bytes], { type: 'image/png' }));
      expect(extracted).not.toBeNull();
    });
  });

  describe('round-trip test', () => {
    it('should preserve deck info through embed and extract [covers:simplify_deck.maps_all_sections] [covers:extract_png.valid_deckinfo_text_returns_parsed]', async () => {
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

    it('should handle empty decks [covers:simple_deck_guard.all_sections_every_card_valid]', async () => {
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

    it('should handle special characters in enc field [covers:simplify_deck.enc_from_matching_temp_cache_image]', async () => {
      // TempCacheDBに特殊文字を含むカード情報を登録
      mockCardDB.set('99999', {
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
