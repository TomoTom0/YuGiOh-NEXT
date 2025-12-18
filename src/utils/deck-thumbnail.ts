/**
 * デッキサムネイル画像生成ユーティリティ
 *
 * デッキロードダイアログに表示するサムネイル用のカードID配列を生成する。
 * またはサムネイル画像（WebP Data URL）を生成する。
 */

import type { DeckInfo, DeckCardRef } from '@/types/deck';
import { getCardInfo } from '@/utils/card-utils';
import { detectCardGameType } from '@/utils/page-detector';
import { getCardImageUrl as getCardImageUrlHelper } from '@/types/card';
import { buildFullUrl } from '@/utils/url-builder';

/**
 * DeckCardRef[] から重複なしでカードIDを選択する（シンプル版）
 *
 * @param refs - DeckCardRef 配列
 * @param maxCount - 最大選択枚数
 * @param headPlacementCardIds - 手動先頭配置カードIDリスト
 * @param existingCids - 既に選択済みのカードIDのSet
 * @returns 選択されたカードID配列
 *
 * @remarks
 * - 手動先頭枠があればそこから優先して選ぶ
 * - 足りない場合は現在の並び順で最初から順に選ぶ
 * - ソートは一切しない（パフォーマンス重視）
 */
function selectCidsFromRefs(
  refs: DeckCardRef[],
  maxCount: number,
  headPlacementCardIds: string[],
  existingCids: Set<string>
): string[] {
  const result: string[] = [];

  // 1. 手動先頭枠のカードを優先的に選ぶ
  for (const ref of refs) {
    if (result.length >= maxCount) break;
    if (existingCids.has(ref.cid)) continue;
    if (headPlacementCardIds.includes(ref.cid)) {
      result.push(ref.cid);
      existingCids.add(ref.cid);
    }
  }

  // 2. 足りなければ現在の並び順で選ぶ
  if (result.length < maxCount) {
    for (const ref of refs) {
      if (result.length >= maxCount) break;
      if (existingCids.has(ref.cid)) continue;
      result.push(ref.cid);
      existingCids.add(ref.cid);
    }
  }

  return result;
}

/**
 * デッキのサムネイル用カードID配列を生成する（シンプル版）
 *
 * @param deckInfo - デッキ情報
 * @param headPlacementCardIds - 手動先頭配置カードIDリスト
 * @returns サムネイル用カードID配列（最大5枚）
 *
 * @remarks
 * - サイドに固定があれば：サイド1枚、メイン2枚、エクストラ2枚
 * - ない場合：メイン3枚、エクストラ2枚
 * - 手動先頭枠があれば優先、足りなければ現在の並び順で先頭から選ぶ
 * - 並び替えは一切しない（パフォーマンス重視）
 */
export function generateDeckThumbnailCards(
  deckInfo: DeckInfo,
  headPlacementCardIds: string[] = []
): string[] {
  const selectedCids = new Set<string>();
  const result: string[] = [];

  // 1. サイドに手動先頭枠があるか確認
  const hasSideHeadPlacement = deckInfo.sideDeck.some(ref =>
    headPlacementCardIds.includes(ref.cid)
  );

  // 2. 選択枚数を決定
  const mainCount = hasSideHeadPlacement ? 2 : 3;
  const extraCount = 2;
  const sideCount = hasSideHeadPlacement ? 1 : 0;

  // 3. サイドから選択（必要な場合）
  if (sideCount > 0) {
    result.push(...selectCidsFromRefs(
      deckInfo.sideDeck,
      sideCount,
      headPlacementCardIds,
      selectedCids
    ));
  }

  // 4. メインから選択
  result.push(...selectCidsFromRefs(
    deckInfo.mainDeck,
    mainCount,
    headPlacementCardIds,
    selectedCids
  ));

  // 5. エクストラから選択
  result.push(...selectCidsFromRefs(
    deckInfo.extraDeck,
    extraCount,
    headPlacementCardIds,
    selectedCids
  ));

  return result;
}

/**
 * Canvas を Blob に変換する（Promise化）
 *
 * @param canvas - Canvas 要素
 * @param type - MIME タイプ（例: 'image/webp'）
 * @param quality - 画質（0.0-1.0）
 * @returns Blob または null
 */
function toBlobPromise(
  canvas: HTMLCanvasElement,
  type?: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/**
 * Blob を Data URL に変換する（Promise化）
 *
 * @param blob - Blob オブジェクト
 * @returns Data URL 文字列、または null
 */
function blobToDataURL(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl === 'string') {
        resolve(dataUrl);
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * 画像を読み込み、Canvasに描画する（Image.decode()使用、高速化版）
 *
 * @param ctx - Canvas 2D コンテキスト
 * @param imgUrl - 画像URL
 * @param index - 画像インデックス（描画位置計算用）
 * @param cardWidth - カード幅
 * @param cardHeight - カード高さ
 * @param gap - カード間隔
 * @param padding - キャンバス内余白
 * @returns 成功時は true、失敗時は false
 *
 * @remarks
 * - Image.decode() で画像デコード完了を待つ（onload より高速）
 * - エラー時は失敗を示す false を返す（スキップ可能）
 */
async function loadAndDrawCardImage(
  ctx: CanvasRenderingContext2D,
  imgUrl: string,
  index: number,
  cardWidth: number,
  cardHeight: number,
  gap: number,
  padding: number
): Promise<boolean> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    // Image.decode() で画像デコード完了を待つ（onload より高速で安全）
    await img.decode();

    const x = padding + index * (cardWidth + gap);
    const y = padding;
    ctx.drawImage(img, x, y, cardWidth, cardHeight);
    return true;
  } catch (error) {
    // 画像読み込み失敗は無視（デッキサムネイルは部分的でも問題ない）
    return false;
  }
}

/**
 * Promise 制御版の Promise.all（並列数制限付き）
 *
 * @param tasks - 非同期タスク配列
 * @param concurrency - 並列実行数制限（デフォルト: 2）
 * @returns 全てのタスクが完了した時に resolve
 *
 * @remarks
 * - 一度に指定数のタスクのみを実行
 * - タスク完了時に次のタスクを開始
 * - 高負荷なリソース（画像読み込み）の並列数制限に有効
 */
async function promiseAllConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 2
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  const executing: Set<Promise<void>> = new Set();
  let index = 0;

  async function executeNext(): Promise<void> {
    if (index >= tasks.length) {
      return;
    }

    const currentIndex = index++;
    const task = tasks[currentIndex];

    if (!task) {
      return;
    }

    try {
      results[currentIndex] = await task();
    } catch (error) {
      // エラーも記録
      (results as any)[currentIndex] = undefined;
    }

    executing.delete(executeNext as any);

    // 次のタスクを開始
    if (index < tasks.length) {
      const nextExec = executeNext();
      executing.add(nextExec);
    }
  }

  // 初期の並列タスクを開始
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    const exec = executeNext();
    executing.add(exec);
  }

  // 全てのタスクが完了するまで待機
  while (executing.size > 0) {
    await Promise.race(executing);
  }

  return results;
}

/**
 * デッキのサムネイル画像（WebP Data URL）を生成する（最適化版）
 *
 * @param deckInfo - デッキ情報
 * @param headPlacementCardIds - 手動先頭配置カードIDリスト
 * @returns WebP形式のData URL、または null
 *
 * @remarks
 * - generateDeckThumbnailCards() でカードID配列を取得
 * - 画像読み込みを最大2並列に制限（リソース効率化）
 * - Image.decode() で高速な画像デコード
 * - Canvas に カード画像を描画
 * - WebP形式に変換して Data URL を返す
 */
export async function generateDeckThumbnailImage(
  deckInfo: DeckInfo,
  headPlacementCardIds: string[] = []
): Promise<string | null> {
  try {
    const cardIds = generateDeckThumbnailCards(deckInfo, headPlacementCardIds);

    if (!cardIds || cardIds.length === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cardWidth = 60;
    const cardHeight = 87;
    const gap = 2;
    const padding = 4;

    canvas.width = cardIds.length * cardWidth + (cardIds.length - 1) * gap + padding * 2;
    canvas.height = cardHeight + padding * 2;

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画像読み込みタスク配列（遅延実行で並列数制限を実現）
    const loadTasks = cardIds.map((cid, index) => async () => {
      const cardInfo = getCardInfo(cid);
      if (!cardInfo) return false;

      const gameType = detectCardGameType();
      const relativeUrl = getCardImageUrlHelper(cardInfo, gameType);
      if (!relativeUrl) return false;

      const imgUrl = buildFullUrl(relativeUrl);

      // 最大2並列での画像読み込み
      return await loadAndDrawCardImage(
        ctx,
        imgUrl,
        index,
        cardWidth,
        cardHeight,
        gap,
        padding
      );
    });

    // 並列数2に制限して全ての画像を読み込み
    await promiseAllConcurrent(loadTasks, 2);

    // Canvas を Blob に変換
    const blob = await toBlobPromise(canvas, 'image/webp', 0.6);
    if (!blob) {
      return null;
    }

    // Blob を Data URL に変換
    return await blobToDataURL(blob);
  } catch (error) {
    console.warn('Failed to generate thumbnail image:', error);
    return null;
  }
}
