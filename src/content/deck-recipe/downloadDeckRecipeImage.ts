import { DownloadDeckRecipeImageOptions } from '../../types/deck-recipe-image';
import { createDeckRecipeImage } from './createDeckRecipeImage';
import { embedDeckInfoToPNG } from '../../utils/png-metadata';

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
    throw new Error('Parser functions have been removed. Please provide deckData directly.');
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
