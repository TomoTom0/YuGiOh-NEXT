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
 * デッキのサムネイル画像（WebP Data URL）を生成する
 *
 * @param deckInfo - デッキ情報
 * @param headPlacementCardIds - 手動先頭配置カードIDリスト
 * @returns WebP形式のData URL、または null
 *
 * @remarks
 * - generateDeckThumbnailCards() でカードID配列を取得
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

    const loadPromises = cardIds.map(async (cid, index) => {
      const cardInfo = getCardInfo(cid);
      if (!cardInfo) return;

      const gameType = detectCardGameType();
      const relativeUrl = getCardImageUrlHelper(cardInfo, gameType);
      if (!relativeUrl) return;

      const imgUrl = buildFullUrl(relativeUrl);

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const x = padding + index * (cardWidth + gap);
          const y = padding;
          ctx.drawImage(img, x, y, cardWidth, cardHeight);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = imgUrl;
      });
    });

    await Promise.all(loadPromises);

    return await new Promise<string | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === 'string') {
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/webp', 0.6);
    });
  } catch (error) {
    console.warn('Failed to generate thumbnail image:', error);
    return null;
  }
}
