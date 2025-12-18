/**
 * デッキキャッシュ管理ユーティリティ
 *
 * サムネイル画像とデッキ情報の localStorage キャッシュを管理する
 */

import { generateDeckThumbnailImage } from '@/utils/deck-thumbnail';

export interface CachedDeckInfo {
  dno: number
  name: string
  category?: string[]
  mainDeck: any[]
  extraDeck: any[]
  sideDeck: any[]
  lastUpdated: number
  hash: string
  cardCount?: {
    main: number
    extra: number
    side: number
  }
}

const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

/**
 * localStorage からサムネイルキャッシュを読み込む
 */
export function loadThumbnailCache(): Map<number, string> {
  try {
    const cached = localStorage.getItem('ygo_deck_thumbnails');
    if (cached) {
      const parsed = JSON.parse(cached);
      const map = new Map(
        Object.entries(parsed).map(([key, value]) => [parseInt(key, 10), value as string])
      );
      console.debug('[deck-cache] Loaded thumbnail cache:', map.size, 'thumbnails');
      return map;
    }
  } catch (error) {
    console.warn('Failed to load thumbnail cache:', error);
  }
  return new Map();
}

/**
 * localStorage にサムネイルキャッシュを保存
 */
export function saveThumbnailCache(deckThumbnails: Map<number, string>): void {
  try {
    const obj = Object.fromEntries(deckThumbnails);
    localStorage.setItem('ygo_deck_thumbnails', JSON.stringify(obj));
    console.debug('[deck-cache] Saved thumbnail cache:', deckThumbnails.size, 'thumbnails');
  } catch (error) {
    console.warn('Failed to save thumbnail cache:', error);
  }
}

/**
 * localStorage からデッキ情報キャッシュを読み込む
 */
export function loadDeckInfoCache(): Map<number, CachedDeckInfo> {
  try {
    const cached = localStorage.getItem('ygo_deck_info_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const map = new Map(
        Object.entries(parsed).map(([key, value]: [string, any]) => {
          const info = value as CachedDeckInfo;
          if (!info.cardCount) {
            info.cardCount = {
              main: info.mainDeck.reduce((sum: number, card: any) => sum + card.quantity, 0),
              extra: info.extraDeck.reduce((sum: number, card: any) => sum + card.quantity, 0),
              side: info.sideDeck.reduce((sum: number, card: any) => sum + card.quantity, 0)
            };
          }
          return [parseInt(key, 10), info];
        })
      );
      console.debug('[deck-cache] Loaded deck info cache:', map.size, 'decks');
      return map;
    }
  } catch (error) {
    console.warn('Failed to load deck info cache:', error);
  }
  return new Map();
}

/**
 * localStorage にデッキ情報キャッシュを保存
 */
export function saveDeckInfoCache(cachedDeckInfos: Map<number, CachedDeckInfo>): void {
  try {
    const obj = Object.fromEntries(cachedDeckInfos);
    localStorage.setItem('ygo_deck_info_cache', JSON.stringify(obj));
    console.debug('[deck-cache] Saved deck info cache:', cachedDeckInfos.size, 'decks');
  } catch (error) {
    console.warn('Failed to save deck info cache:', error);
  }
}

/**
 * デッキ情報のハッシュを計算
 */
export function calculateDeckHash(deckInfo: any): string {
  const content = JSON.stringify({
    name: deckInfo.name,
    main: deckInfo.mainDeck.map((c: any) => `${c.cid}:${c.ciid}:${c.quantity}`).join(','),
    extra: deckInfo.extraDeck.map((c: any) => `${c.cid}:${c.ciid}:${c.quantity}`).join(','),
    side: deckInfo.sideDeck.map((c: any) => `${c.cid}:${c.ciid}:${c.quantity}`).join(',')
  });
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * デッキ情報が変更されたかチェック
 */
export function isDeckInfoChanged(
  dno: number,
  deckInfo: any,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): boolean {
  const cached = cachedDeckInfos.get(dno);
  if (!cached) return true; // キャッシュなし = 変更あり

  const currentHash = calculateDeckHash(deckInfo);
  return currentHash !== cached.hash;
}

/**
 * キャッシュが期限切れかチェック
 */
export function isCacheExpired(
  cachedInfo: CachedDeckInfo,
  expirationMs: number = CACHE_EXPIRATION_MS
): boolean {
  return Date.now() - cachedInfo.lastUpdated > expirationMs;
}

/**
 * デッキのサムネイル画像を生成してキャッシュに保存
 */
export async function generateAndCacheThumbnail(
  dno: number,
  deckInfo: any,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<void> {
  try {
    // デッキ情報をキャッシュに保存（サムネイル生成の前）
    const mainDeckData = deckInfo.mainDeck.map((card: any) => ({
      cid: card.cid,
      ciid: card.ciid,
      quantity: card.quantity
    }));
    const extraDeckData = deckInfo.extraDeck.map((card: any) => ({
      cid: card.cid,
      ciid: card.ciid,
      quantity: card.quantity
    }));
    const sideDeckData = deckInfo.sideDeck.map((card: any) => ({
      cid: card.cid,
      ciid: card.ciid,
      quantity: card.quantity
    }));

    const cachedInfo: CachedDeckInfo = {
      dno,
      name: deckInfo.name,
      category: deckInfo.category,
      mainDeck: mainDeckData,
      extraDeck: extraDeckData,
      sideDeck: sideDeckData,
      lastUpdated: Date.now(),
      hash: calculateDeckHash(deckInfo),
      cardCount: {
        main: mainDeckData.reduce((sum: number, card: any) => sum + card.quantity, 0),
        extra: extraDeckData.reduce((sum: number, card: any) => sum + card.quantity, 0),
        side: sideDeckData.reduce((sum: number, card: any) => sum + card.quantity, 0)
      }
    };
    cachedDeckInfos.set(dno, cachedInfo);
    saveDeckInfoCache(cachedDeckInfos);

    // サムネイル画像を生成
    const imageUrl = await generateDeckThumbnailImage(deckInfo, headPlacementCardIds);
    if (imageUrl) {
      deckThumbnails.set(dno, imageUrl);
      saveThumbnailCache(deckThumbnails);
      console.debug(`[deck-cache] Generated thumbnail for deck ${dno}`);
    }
  } catch (error) {
    console.warn(`Failed to generate and cache thumbnail for deck ${dno}:`, error);
  }
}

/**
 * デッキ情報を更新してサムネイルを生成（必要な場合のみ）
 */
export async function updateDeckInfoAndThumbnail(
  dno: number,
  getDeckDetail: (dno: number) => Promise<any>,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<boolean> {
  try {
    const deckInfo = await getDeckDetail(dno);
    if (!deckInfo) return false;

    // 変更があるか、またはキャッシュが期限切れかチェック
    const needsUpdate =
      isDeckInfoChanged(dno, deckInfo, cachedDeckInfos) ||
      (cachedDeckInfos.has(dno) && isCacheExpired(cachedDeckInfos.get(dno)!));

    if (needsUpdate) {
      await generateAndCacheThumbnail(
        dno,
        deckInfo,
        headPlacementCardIds,
        deckThumbnails,
        cachedDeckInfos
      );
    }

    return needsUpdate;
  } catch (error) {
    console.warn(`[deck-cache] Failed to update deck ${dno}:`, error);
    return false;
  }
}

/**
 * バッチでサムネイルを生成（IdleCallback使用）
 *
 * @param startIndex - deckListの開始インデックス
 * @param batchSize - 一度に処理するデッキ数
 * @param deckList - デッキリスト配列
 * @param getDeckDetail - デッキ詳細取得関数
 * @param headPlacementCardIds - 先頭配置カードID
 * @param deckThumbnails - サムネイルキャッシュ
 * @param cachedDeckInfos - デッキ情報キャッシュ
 */
export async function generateThumbnailsInBackground(
  startIndex: number = 0,
  batchSize: number = 50,
  deckList: any[],
  getDeckDetail: (dno: number) => Promise<any>,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<void> {
  if (!deckList || deckList.length === 0) return;

  const endIndex = Math.min(startIndex + batchSize, deckList.length);
  const targetDecks = deckList.slice(startIndex, endIndex);

  console.debug(
    `[deck-cache] Starting background thumbnail generation: index ${startIndex}-${endIndex - 1} (${targetDecks.length} decks)`
  );

  // RequestIdleCallback で非同期バッチ処理
  return new Promise((resolve) => {
    let processed = 0;

    const processNextBatch = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          try {
            // 1デッキずつ処理
            if (processed < targetDecks.length) {
              const deck = targetDecks[processed];
              await updateDeckInfoAndThumbnail(
                deck.dno,
                getDeckDetail,
                headPlacementCardIds,
                deckThumbnails,
                cachedDeckInfos
              );
              processed++;
              processNextBatch();
            } else {
              console.debug(
                `[deck-cache] Completed background generation: ${processed} decks processed`
              );
              resolve();
            }
          } catch (error) {
            console.warn('[deck-cache] Error in background generation:', error);
            processed++;
            processNextBatch();
          }
        });
      } else {
        // RequestIdleCallback非対応環境ではsetTimeout使用
        setTimeout(async () => {
          try {
            if (processed < targetDecks.length) {
              const deck = targetDecks[processed];
              await updateDeckInfoAndThumbnail(
                deck.dno,
                getDeckDetail,
                headPlacementCardIds,
                deckThumbnails,
                cachedDeckInfos
              );
              processed++;
              processNextBatch();
            } else {
              resolve();
            }
          } catch (error) {
            console.warn('[deck-cache] Error in background generation:', error);
            processed++;
            processNextBatch();
          }
        }, 200);
      }
    };

    processNextBatch();
  });
}
