import { DownloadDeckRecipeImageOptions } from '../../types/deck-recipe-image';
import { createDeckRecipeImage } from './createDeckRecipeImage';

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
  // 1. 画像を作成
  const result = await createDeckRecipeImage(options);

  // 2. ブラウザ環境では常にBlobが返される
  const blob = result as Blob;

  // 3. ファイル名を生成
  const fileName = options.fileName || generateFileName(options.deckData?.deckName);

  // 4. ダウンロードを実行
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
