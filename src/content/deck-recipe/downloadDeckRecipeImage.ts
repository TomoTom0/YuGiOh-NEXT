import { DownloadDeckRecipeImageOptions } from '../../types/deck-recipe-image';
import { createDeckRecipeImage } from './createDeckRecipeImage';
import { parseDeckDetail } from '../parser/deck-detail-parser';
import { sessionManager } from '../session/session';
import { embedDeckInfoToPNG } from '../../utils/png-metadata';
import { detectCardGameType } from '../../utils/page-detector';
import { getDeckDisplayUrl } from '../../utils/url-builder';
import { getTempCardDB } from '../../utils/temp-card-db';

/**
 * デッキレシピ画像を作成してダウンロードする
 *
 * @param options - ダウンロードオプション
 *
 * @example
 * ```typescript
 * await downloadDeckRecipeImage({
 *   dno: '1',
 *   color: 'red',
 *   includeQR: true
 * });
 * ```
 */
export async function downloadDeckRecipeImage(
  options: DownloadDeckRecipeImageOptions
): Promise<void> {
  // 1. deckDataがない場合は、dnoから自分のデッキ情報を取得
  let deckData = options.deckData;
  if (!deckData && options.dno) {
    const cgid = await sessionManager.getCgid();
    const gameType = detectCardGameType();
    const url = getDeckDisplayUrl(cgid, parseInt(options.dno), gameType);

    // axiosを動的インポート
    const { default: axios } = await import('axios');
    const response = await axios.get(url, {
      withCredentials: true
    });
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, 'text/html');
    deckData = await parseDeckDetail(doc);

    // デバッグログ
    const tempCardDB = getTempCardDB();
    console.log('[downloadDeckRecipeImage] mainDeckCount:', deckData.mainDeck.length);
    deckData.mainDeck.forEach((d, i) => {
      const card = tempCardDB.get(d.cid);
      if (!card) return;
      const imgHash = card.imgs?.find(img => img.ciid === d.ciid)?.imgHash;
      console.log(`  [${i}] ${card.name} (${card.cardType}) x${d.quantity} - ciid:${d.ciid}, hash:${imgHash}`);
    });
  }

  // 2. 画像を作成
  const result = await createDeckRecipeImage({
    ...options,
    deckData
  });

  // 3. ブラウザ環境では常にBlobが返される
  let blob = result as Blob;

  // 4. デッキ情報をPNG画像に埋め込み
  if (deckData) {
    try {
      blob = await embedDeckInfoToPNG(blob, deckData);
      console.log('[downloadDeckRecipeImage] Deck info embedded into PNG');
    } catch (error) {
      console.error('[downloadDeckRecipeImage] Failed to embed deck info:', error);
      // 埋め込み失敗時は元の画像をダウンロード
    }
  }

  // 5. ファイル名を生成
  const fileName = options.fileName || generateFileName(deckData?.name);

  // 6. ダウンロードを実行
  downloadBlob(blob, fileName);
}

/**
 * ファイル名を生成する
 *
 * @param deckName - デッキ名（オプション）
 * @returns ファイル名
 */
function generateFileName(deckName?: string): string {
  const date = new Date();
  const timestamp = date
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\..+/, '');

  const prefix = deckName || 'deck-recipe';
  return `${prefix}_${timestamp}.png`;
}

/**
 * Blobをダウンロードする
 *
 * @param blob - ダウンロードするBlob
 * @param fileName - ファイル名
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.download = fileName;
  a.href = url;
  a.click();

  // クリーンアップ
  a.remove();
  URL.revokeObjectURL(url);
}
