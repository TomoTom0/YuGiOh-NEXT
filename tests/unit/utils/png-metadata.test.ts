import { describe, it, expect, beforeEach, vi } from 'vitest';
import { embedDeckInfoToPNG, extractDeckInfoFromPNG } from '../../../src/utils/png-metadata';
import type { DeckInfo } from '../../../src/types/deck';

// getTempCardDBをモック
vi.mock('../../../src/utils/temp-card-db', () => ({
  getTempCardDB: vi.fn(() => new Map([
    ['12345', {
      cid: '12345',
      imgs: [
        { ciid: 'img1', imgHash: 'hash1' },
        { ciid: 'img2', imgHash: 'hash2' }
      ]
    }],
    ['67890', {
      cid: '67890',
      imgs: [
        { ciid: 'img3', imgHash: 'hash3' }
      ]
    }]
  ]))
}));

/**
 * 最小限の有効なPNGデータを生成
 * PNG Signature + IHDR + IEND
 */
function createMinimalPNG(): Uint8Array {
  // PNG Signature (8 bytes)
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk (1x1ピクセルのグレースケール画像)
  // Length: 13 (0x0000000D)
  // Type: IHDR (0x49484452)
  // Data: width=1, height=1, bit_depth=8, color_type=0, compression=0, filter=0, interlace=0
  // CRC: 0x90773831 (計算済み)
  const ihdr = new Uint8Array([
    0x00, 0x00, 0x00, 0x0d, // Length
    0x49, 0x48, 0x44, 0x52, // Type (IHDR)
    0x00, 0x00, 0x00, 0x01, // Width (1)
    0x00, 0x00, 0x00, 0x01, // Height (1)
    0x08, // Bit depth (8)
    0x00, // Color type (grayscale)
    0x00, // Compression method
    0x00, // Filter method
    0x00, // Interlace method
    0x90, 0x77, 0x38, 0x31  // CRC
  ]);

  // IEND chunk
  // Length: 0 (0x00000000)
  // Type: IEND (0x49454E44)
  // CRC: 0xAE426082
  const iend = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, // Length
    0x49, 0x45, 0x4e, 0x44, // Type (IEND)
    0xae, 0x42, 0x60, 0x82  // CRC
  ]);

  // 全体を結合
  const png = new Uint8Array(signature.length + ihdr.length + iend.length);
  png.set(signature, 0);
  png.set(ihdr, signature.length);
  png.set(iend, signature.length + ihdr.length);

  return png;
}

describe('png-metadata', () => {
  let sampleDeckInfo: DeckInfo;
  let minimalPNG: Blob;

  beforeEach(() => {
    // サンプルデッキ情報
    sampleDeckInfo = {
      dno: 1,
      dname: 'Test Deck',
      dtype: '0',
      dstyle: '0',
      mainDeck: [
        { cid: '12345', ciid: 'img1', quantity: 3 },
        { cid: '67890', ciid: 'img3', quantity: 2 }
      ],
      extraDeck: [
        { cid: '12345', ciid: 'img2', quantity: 1 }
      ],
      sideDeck: []
    };

    // 最小限のPNG
    const pngData = createMinimalPNG();
    minimalPNG = new Blob([pngData], { type: 'image/png' });
  });

  describe('embedDeckInfoToPNG', () => {
    it('PNGにデッキ情報を埋め込める', async () => {
      const result = await embedDeckInfoToPNG(minimalPNG, sampleDeckInfo);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');

      // 元のPNGより大きくなっているはず
      expect(result.size).toBeGreaterThan(minimalPNG.size);
    });

    it('埋め込んだデッキ情報を抽出できる', async () => {
      const embedded = await embedDeckInfoToPNG(minimalPNG, sampleDeckInfo);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted?.main).toHaveLength(2);
      expect(extracted?.extra).toHaveLength(1);
      expect(extracted?.side).toHaveLength(0);

      // mainDeckの内容確認
      expect(extracted?.main[0]).toEqual({
        cid: '12345',
        ciid: 'img1',
        enc: 'hash1',
        quantity: 3
      });
      expect(extracted?.main[1]).toEqual({
        cid: '67890',
        ciid: 'img3',
        enc: 'hash3',
        quantity: 2
      });

      // extraDeckの内容確認
      expect(extracted?.extra[0]).toEqual({
        cid: '12345',
        ciid: 'img2',
        enc: 'hash2',
        quantity: 1
      });
    });

    it('無効なPNG（シグネチャ不正）の場合エラーをthrowする', async () => {
      const invalidPNG = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });

      await expect(embedDeckInfoToPNG(invalidPNG, sampleDeckInfo))
        .rejects
        .toThrow('Invalid PNG file: signature mismatch');
    });

    it('IENDチャンクがない場合エラーをthrowする', async () => {
      // PNGシグネチャのみ
      const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const noPNG = new Blob([signature], { type: 'image/png' });

      await expect(embedDeckInfoToPNG(noPNG, sampleDeckInfo))
        .rejects
        .toThrow('Invalid PNG file: IEND chunk not found');
    });

    it('空のデッキでも埋め込める', async () => {
      const emptyDeck: DeckInfo = {
        dno: 1,
        dname: 'Empty Deck',
        dtype: '0',
        dstyle: '0',
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      const result = await embedDeckInfoToPNG(minimalPNG, emptyDeck);
      const extracted = await extractDeckInfoFromPNG(result);

      expect(extracted).not.toBeNull();
      expect(extracted?.main).toHaveLength(0);
      expect(extracted?.extra).toHaveLength(0);
      expect(extracted?.side).toHaveLength(0);
    });
  });

  describe('extractDeckInfoFromPNG', () => {
    it('デッキ情報が埋め込まれていないPNGの場合nullを返す', async () => {
      const extracted = await extractDeckInfoFromPNG(minimalPNG);
      expect(extracted).toBeNull();
    });

    it('無効なPNG（シグネチャ不正）の場合nullを返す', async () => {
      const invalidPNG = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
      const extracted = await extractDeckInfoFromPNG(invalidPNG);
      expect(extracted).toBeNull();
    });

    it('不正なJSON構造の場合nullを返す', async () => {
      // 手動でtEXtチャンクを作成（不正なJSON）
      const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      // IHDR chunk
      const ihdr = new Uint8Array([
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x00, 0x00, 0x00, 0x00,
        0x90, 0x77, 0x38, 0x31
      ]);

      // tEXtチャンク（不正なJSON: "invalid json"）
      const encoder = new TextEncoder();
      const textData = encoder.encode('DeckInfo\0{invalid json}');
      const textChunk = new Uint8Array(12 + textData.length);
      // Length
      textChunk[0] = 0;
      textChunk[1] = 0;
      textChunk[2] = 0;
      textChunk[3] = textData.length;
      // Type "tEXt"
      textChunk[4] = 0x74; // t
      textChunk[5] = 0x45; // E
      textChunk[6] = 0x58; // X
      textChunk[7] = 0x74; // t
      // Data
      textChunk.set(textData, 8);
      // CRC（簡略化のため0で埋める）
      textChunk.set([0, 0, 0, 0], 8 + textData.length);

      // IEND chunk
      const iend = new Uint8Array([
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ]);

      const png = new Uint8Array(signature.length + ihdr.length + textChunk.length + iend.length);
      png.set(signature, 0);
      png.set(ihdr, signature.length);
      png.set(textChunk, signature.length + ihdr.length);
      png.set(iend, signature.length + ihdr.length + textChunk.length);

      const invalidJsonPNG = new Blob([png], { type: 'image/png' });

      // JSON.parseエラーでnullを返す
      const extracted = await extractDeckInfoFromPNG(invalidJsonPNG);
      expect(extracted).toBeNull();
    });

    it('型ガードに失敗する場合nullを返す', async () => {
      // 不正な構造のデータを埋め込む
      const invalidDeck = {
        dno: 1,
        dname: 'Invalid',
        dtype: '0',
        dstyle: '0',
        mainDeck: [
          { cid: 'invalid', ciid: 'invalid', quantity: 'not-a-number' } // quantityが文字列
        ],
        extraDeck: [],
        sideDeck: []
      };

      // 一旦正しい形式で埋め込んで、その後手動で書き換える必要があるため、
      // ここでは簡略化してconsole.warnが呼ばれることを確認
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 手動でtEXtチャンクを作成（不正な構造）
      const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const ihdr = new Uint8Array([
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x00, 0x00, 0x00, 0x00,
        0x90, 0x77, 0x38, 0x31
      ]);

      const encoder = new TextEncoder();
      const invalidJson = JSON.stringify({
        main: [{ cid: '123', ciid: '456', enc: 'hash', quantity: 'invalid' }],
        extra: [],
        side: []
      });
      const textData = encoder.encode(`DeckInfo\0${invalidJson}`);
      const textChunk = new Uint8Array(12 + textData.length);
      textChunk[0] = 0;
      textChunk[1] = 0;
      textChunk[2] = 0;
      textChunk[3] = textData.length;
      textChunk[4] = 0x74;
      textChunk[5] = 0x45;
      textChunk[6] = 0x58;
      textChunk[7] = 0x74;
      textChunk.set(textData, 8);
      textChunk.set([0, 0, 0, 0], 8 + textData.length);

      const iend = new Uint8Array([
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ]);

      const png = new Uint8Array(signature.length + ihdr.length + textChunk.length + iend.length);
      png.set(signature, 0);
      png.set(ihdr, signature.length);
      png.set(textChunk, signature.length + ihdr.length);
      png.set(iend, signature.length + ihdr.length + textChunk.length);

      const invalidStructurePNG = new Blob([png], { type: 'image/png' });
      const extracted = await extractDeckInfoFromPNG(invalidStructurePNG);

      expect(extracted).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('Invalid DeckInfo structure in PNG metadata');

      warnSpy.mockRestore();
    });

    it('空のBlobの場合nullを返す', async () => {
      const emptyBlob = new Blob([], { type: 'image/png' });
      const extracted = await extractDeckInfoFromPNG(emptyBlob);
      expect(extracted).toBeNull();
    });
  });

  describe('SimpleDeckInfo型ガード（間接的テスト）', () => {
    it('有効な構造のデータは抽出される', async () => {
      const validDeck: DeckInfo = {
        dno: 1,
        dname: 'Valid',
        dtype: '0',
        dstyle: '0',
        mainDeck: [
          { cid: '12345', ciid: 'img1', quantity: 1 },
          { cid: '12345', ciid: 'img1', quantity: 99 } // 最大値
        ],
        extraDeck: [],
        sideDeck: []
      };

      const embedded = await embedDeckInfoToPNG(minimalPNG, validDeck);
      const extracted = await extractDeckInfoFromPNG(embedded);

      expect(extracted).not.toBeNull();
      expect(extracted?.main[0]?.quantity).toBe(1);
      expect(extracted?.main[1]?.quantity).toBe(99);
    });

    it('quantityが100以上の場合は型ガードで弾かれる', async () => {
      // 手動で不正なデータを作成
      const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const ihdr = new Uint8Array([
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x00, 0x00, 0x00, 0x00,
        0x90, 0x77, 0x38, 0x31
      ]);

      const encoder = new TextEncoder();
      const invalidJson = JSON.stringify({
        main: [{ cid: '123', ciid: '456', enc: 'hash', quantity: 100 }], // 100は不正
        extra: [],
        side: []
      });
      const textData = encoder.encode(`DeckInfo\0${invalidJson}`);
      const textChunk = new Uint8Array(12 + textData.length);
      textChunk[0] = 0;
      textChunk[1] = 0;
      textChunk[2] = 0;
      textChunk[3] = textData.length;
      textChunk[4] = 0x74;
      textChunk[5] = 0x45;
      textChunk[6] = 0x58;
      textChunk[7] = 0x74;
      textChunk.set(textData, 8);
      textChunk.set([0, 0, 0, 0], 8 + textData.length);

      const iend = new Uint8Array([
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ]);

      const png = new Uint8Array(signature.length + ihdr.length + textChunk.length + iend.length);
      png.set(signature, 0);
      png.set(ihdr, signature.length);
      png.set(textChunk, signature.length + ihdr.length);
      png.set(iend, signature.length + ihdr.length + textChunk.length);

      const invalidQuantityPNG = new Blob([png], { type: 'image/png' });
      const extracted = await extractDeckInfoFromPNG(invalidQuantityPNG);

      expect(extracted).toBeNull();
    });
  });
});
