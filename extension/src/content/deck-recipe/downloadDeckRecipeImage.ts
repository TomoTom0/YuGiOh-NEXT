import axios from 'axios';
import { DownloadDeckRecipeImageOptions } from '../../types/deck-recipe-image';
import { createDeckRecipeImage } from './createDeckRecipeImage';
import { parseDeckDetail } from '../parser/deck-detail-parser';

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
  // 1. deckDataがない場合は、dnoから公開デッキ情報を取得
  let deckData = options.deckData;
  if (!deckData && options.dno) {
    const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=4&pid=100&request_locale=ja&dno=${options.dno}`;
    const response = await axios.get(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, 'text/html');
    deckData = parseDeckDetail(doc);
  }

  // 2. 画像を作成
  const result = await createDeckRecipeImage({
    ...options,
    deckData
  });

  // 3. ブラウザ環境では常にBlobが返される
  const blob = result as Blob;

  // 4. ファイル名を生成
  const fileName = options.fileName || generateFileName(deckData?.name);

  // 5. ダウンロードを実行
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
  return `${prefix}_${timestamp}.jpg`;
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
