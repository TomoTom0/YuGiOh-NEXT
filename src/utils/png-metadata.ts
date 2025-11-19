import type { DeckInfo } from '@/types/deck';

/**
 * PNG tEXtチャンクの構造
 * - Length: 4 bytes (チャンクデータ長)
 * - Type: 4 bytes ("tEXt")
 * - Data: variable (キー\0値)
 * - CRC: 4 bytes (Type + Data のCRC32)
 */

/**
 * エクスポート用の簡略デッキ情報
 */
interface SimpleDeckInfo {
  main: { cid: string; ciid: string; enc: string; quantity: number }[];
  extra: { cid: string; ciid: string; enc: string; quantity: number }[];
  side: { cid: string; ciid: string; enc: string; quantity: number }[];
}

/**
 * SimpleDeckInfo型ガード関数
 * JSON Injection対策として、パースしたオブジェクトが正しい構造を持つか検証
 */
function isValidSimpleDeckInfo(obj: unknown): obj is SimpleDeckInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // main, extra, side プロパティが配列であることを確認
  if (!Array.isArray(candidate.main) || !Array.isArray(candidate.extra) || !Array.isArray(candidate.side)) {
    return false;
  }

  // 各配列の要素が正しい構造を持つか検証
  const isValidCard = (card: unknown): boolean => {
    if (typeof card !== 'object' || card === null) {
      return false;
    }
    const c = card as Record<string, unknown>;
    return (
      typeof c.cid === 'string' &&
      typeof c.ciid === 'string' &&
      typeof c.enc === 'string' &&
      typeof c.quantity === 'number' &&
      Number.isInteger(c.quantity) &&
      c.quantity >= 0 &&
      c.quantity <= 99
    );
  };

  return (
    candidate.main.every(isValidCard) &&
    candidate.extra.every(isValidCard) &&
    candidate.side.every(isValidCard)
  );
}

/**
 * DeckInfoを簡略形式に変換
 */
function simplifyDeckInfo(deckInfo: DeckInfo): SimpleDeckInfo {
  return {
    main: deckInfo.mainDeck.map(({ card, quantity }) => ({
      cid: card.cardId,
      ciid: card.ciid,
      enc: card.imgs?.find(img => img.ciid === card.ciid)?.imgHash || '',
      quantity
    })),
    extra: deckInfo.extraDeck.map(({ card, quantity }) => ({
      cid: card.cardId,
      ciid: card.ciid,
      enc: card.imgs?.find(img => img.ciid === card.ciid)?.imgHash || '',
      quantity
    })),
    side: deckInfo.sideDeck.map(({ card, quantity }) => ({
      cid: card.cardId,
      ciid: card.ciid,
      enc: card.imgs?.find(img => img.ciid === card.ciid)?.imgHash || '',
      quantity
    }))
  };
}

/**
 * CRC32計算（PNG仕様準拠）
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 32bit整数をビッグエンディアンのバイト配列に変換
 */
function intToBytes(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ]);
}

/**
 * ビッグエンディアンのバイト配列を32bit整数に変換
 */
function bytesToInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
}

/**
 * tEXtチャンクを作成
 */
function createTextChunk(key: string, value: string): Uint8Array {
  // キーと値をUTF-8エンコード
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const valueBytes = encoder.encode(value);

  // データ部分: key + NULL + value
  const dataLength = keyBytes.length + 1 + valueBytes.length;
  const data = new Uint8Array(dataLength);
  data.set(keyBytes, 0);
  data[keyBytes.length] = 0; // NULL separator
  data.set(valueBytes, keyBytes.length + 1);

  // チャンクタイプ "tEXt"
  const type = encoder.encode('tEXt');

  // CRC計算用データ（Type + Data）
  const crcData = new Uint8Array(4 + dataLength);
  crcData.set(type, 0);
  crcData.set(data, 4);
  const crc = crc32(crcData);

  // チャンク全体: Length + Type + Data + CRC
  const chunk = new Uint8Array(4 + 4 + dataLength + 4);
  chunk.set(intToBytes(dataLength), 0); // Length
  chunk.set(type, 4); // Type
  chunk.set(data, 8); // Data
  chunk.set(intToBytes(crc), 8 + dataLength); // CRC

  return chunk;
}

/**
 * PNG画像にデッキ情報を埋め込む
 *
 * @param pngBlob - 元のPNG画像Blob
 * @param deckInfo - 埋め込むデッキ情報
 * @returns デッキ情報が埋め込まれたPNG画像Blob
 */
export async function embedDeckInfoToPNG(
  pngBlob: Blob,
  deckInfo: DeckInfo
): Promise<Blob> {
  // BlobをArrayBufferに変換
  const arrayBuffer = await pngBlob.arrayBuffer();
  const pngData = new Uint8Array(arrayBuffer);

  // PNGシグネチャ確認（8バイト: 89 50 4E 47 0D 0A 1A 0A）
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (pngData[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG file: signature mismatch');
    }
  }

  // IENDチャンクの位置を探す
  let iendPosition = -1;
  let offset = 8; // シグネチャの後から開始

  while (offset + 12 <= pngData.length) {
    // チャンクヘッダー（Length[4] + Type[4]）とCRC[4]が読める範囲
    const chunkLength = bytesToInt(pngData, offset);
    const chunkType = String.fromCharCode(
      pngData[offset + 4] ?? 0,
      pngData[offset + 5] ?? 0,
      pngData[offset + 6] ?? 0,
      pngData[offset + 7] ?? 0
    );

    if (chunkType === 'IEND') {
      iendPosition = offset;
      break;
    }

    // 次のチャンクへ（Length[4] + Type[4] + Data[chunkLength] + CRC[4]）
    offset += 4 + 4 + chunkLength + 4;
  }

  if (iendPosition === -1) {
    throw new Error('Invalid PNG file: IEND chunk not found');
  }

  // デッキ情報を簡略化してJSON文字列に変換
  const simpleDeck = simplifyDeckInfo(deckInfo);
  const deckInfoJson = JSON.stringify(simpleDeck);

  // tEXtチャンクを作成
  const textChunk = createTextChunk('DeckInfo', deckInfoJson);

  // 新しいPNGデータを作成（IEND前にtEXtチャンクを挿入）
  const newPngData = new Uint8Array(pngData.length + textChunk.length);
  newPngData.set(pngData.subarray(0, iendPosition), 0); // IEND前まで
  newPngData.set(textChunk, iendPosition); // tEXtチャンク
  newPngData.set(pngData.subarray(iendPosition), iendPosition + textChunk.length); // IENDチャンク

  // Blobに変換して返す
  return new Blob([newPngData], { type: 'image/png' });
}

/**
 * PNG画像からデッキ情報を抽出
 *
 * @param pngBlob - デッキ情報が埋め込まれたPNG画像Blob
 * @returns 抽出されたデッキ情報、見つからない場合はnull
 */
export async function extractDeckInfoFromPNG(
  pngBlob: Blob
): Promise<SimpleDeckInfo | null> {
  try {
    // BlobをArrayBufferに変換
    const arrayBuffer = await pngBlob.arrayBuffer();
    const pngData = new Uint8Array(arrayBuffer);

    // PNGシグネチャ確認
    const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
      if (pngData[i] !== PNG_SIGNATURE[i]) {
        return null; // PNG形式でない
      }
    }

    // 全チャンクを走査してtEXtチャンクを探す
    let offset = 8; // シグネチャの後から開始
    const decoder = new TextDecoder();

    while (offset + 12 <= pngData.length) {
      const chunkLength = bytesToInt(pngData, offset);
      const chunkType = String.fromCharCode(
        pngData[offset + 4] ?? 0,
        pngData[offset + 5] ?? 0,
        pngData[offset + 6] ?? 0,
        pngData[offset + 7] ?? 0
      );

      if (chunkType === 'tEXt') {
        // tEXtチャンクのデータ部分を抽出
        const dataStart = offset + 8;
        const dataEnd = dataStart + chunkLength;
        const data = pngData.subarray(dataStart, dataEnd);

        // NULL文字で分割してキーと値を取得
        let nullPos = -1;
        for (let i = 0; i < data.length; i++) {
          if (data[i] === 0) {
            nullPos = i;
            break;
          }
        }

        if (nullPos !== -1) {
          const key = decoder.decode(data.subarray(0, nullPos));
          if (key === 'DeckInfo') {
            const value = decoder.decode(data.subarray(nullPos + 1));
            // JSON.parseして型ガード関数で検証
            const parsed: unknown = JSON.parse(value);
            if (isValidSimpleDeckInfo(parsed)) {
              return parsed;
            } else {
              console.warn('Invalid DeckInfo structure in PNG metadata');
              return null;
            }
          }
        }
      }

      if (chunkType === 'IEND') {
        break; // IENDに到達したら終了
      }

      // 次のチャンクへ
      offset += 4 + 4 + chunkLength + 4;
    }

    return null; // DeckInfo tEXtチャンクが見つからなかった
  } catch (error) {
    console.error('Failed to extract deck info from PNG:', error);
    return null;
  }
}
