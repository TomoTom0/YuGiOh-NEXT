/**
 * デッキキャッシュ管理ユーティリティ
 *
 * サムネイル画像とデッキ情報の localStorage キャッシュを管理する
 */

import { generateDeckThumbnailImage } from '@/utils/deck-thumbnail';
import { DeckInfo, DeckListItem } from '@/types/deck';
import { DeckCardRef } from '@/types/card';
import { DeckCategory } from '@/types/deck-metadata';
import {
  STORAGE_KEY_DECK_INFO_CACHE,
  STORAGE_KEY_DECK_THUMBNAILS,
  STORAGE_KEY_DECK_LIST_ORDER
} from '@/constants/storage-keys';

export interface CachedDeckInfo {
  dno: number
  name: string
  category?: DeckCategory
  mainDeck: DeckCardRef[]
  extraDeck: DeckCardRef[]
  sideDeck: DeckCardRef[]
  lastUpdated: number
  hash: string
  cardCount?: {
    main: number
    extra: number
    side: number
  }
  lastThumbnailUpdate?: number // サムネイル最終更新時刻（バックグラウンド更新の制限用）
}

const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

/**
 * localStorage から deckList の順序（dno配列）を読み込む
 */
export function loadDeckListOrder(): number[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_DECK_LIST_ORDER);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Failed to load deck list order:', error);
  }
  return [];
}

/**
 * localStorage に deckList の順序（dno配列）を保存
 */
export function saveDeckListOrder(deckList: DeckListItem[]): void {
  try {
    const order = deckList.map(deck => deck.dno);
    localStorage.setItem(STORAGE_KEY_DECK_LIST_ORDER, JSON.stringify(order));
  } catch (error) {
    console.warn('Failed to save deck list order:', error);
  }
}

/**
 * deckList の順序が変わったかチェック
 */
export function isDeckListOrderChanged(currentDeckList: DeckListItem[]): boolean {
  const previousOrder = loadDeckListOrder();
  const currentOrder = currentDeckList.map(deck => deck.dno);

  // 長さが違えば変更あり
  if (previousOrder.length !== currentOrder.length) {
    return true;
  }

  // 順序を比較
  for (let i = 0; i < previousOrder.length; i++) {
    if (previousOrder[i] !== currentOrder[i]) {
      return true;
    }
  }

  return false;
}

/**
 * localStorage からサムネイルキャッシュを読み込む
 */
export function loadThumbnailCache(): Map<number, string> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_DECK_THUMBNAILS);
    if (cached) {
      const parsed = JSON.parse(cached);
      return new Map(
        Object.entries(parsed).map(([key, value]) => [parseInt(key, 10), value as string])
      );
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
    localStorage.setItem(STORAGE_KEY_DECK_THUMBNAILS, JSON.stringify(obj));
  } catch (error) {
    console.warn('Failed to save thumbnail cache:', error);
  }
}

/**
 * localStorage からデッキ情報キャッシュを読み込む
 */
export function loadDeckInfoCache(): Map<number, CachedDeckInfo> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_DECK_INFO_CACHE);
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
    localStorage.setItem(STORAGE_KEY_DECK_INFO_CACHE, JSON.stringify(obj));
  } catch (error) {
    console.warn('Failed to save deck info cache:', error);
  }
}

/**
 * デッキ情報のハッシュを計算（高速化版）
 *
 * より効率的なハッシュアルゴリズムを使用して、パフォーマンスを向上させた。
 * - JSON.stringify()をスキップして直接ハッシュ計算
 * - FNV-1a ハッシュアルゴリズムを採用
 */
export function calculateDeckHash(deckInfo: DeckInfo): string {
  // FNV-1a ハッシュアルゴリズム (32-bit)
  let hash = 0x811c9dc5; // FNV offset basis
  const FNV_PRIME = 0x01000193; // FNV prime

  const hashString = (str: string): void => {
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * FNV_PRIME) >>> 0; // 32-bit に制限
    }
  };

  // 元のデッキ名をハッシュ化（originalName、変更されない元の名前）
  hashString(deckInfo.originalName || '');
  hashString('|');

  // メインデッキをハッシュ化
  for (const card of deckInfo.mainDeck) {
    hashString(`${card.cid}:${card.ciid}:${card.quantity},`);
  }
  hashString('|');

  // エクストラデッキをハッシュ化
  for (const card of deckInfo.extraDeck) {
    hashString(`${card.cid}:${card.ciid}:${card.quantity},`);
  }
  hashString('|');

  // サイドデッキをハッシュ化
  for (const card of deckInfo.sideDeck) {
    hashString(`${card.cid}:${card.ciid}:${card.quantity},`);
  }

  return (hash >>> 0).toString(36);
}

/**
 * デッキ情報が変更されたかチェック
 */
export function isDeckInfoChanged(
  dno: number,
  deckInfo: DeckInfo,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): boolean {
  const cached = cachedDeckInfos.get(dno);
  if (!cached) {
    console.temp(`[isDeckInfoChanged] Deck ${dno}: No cache found`);
    return true; // キャッシュなし = 変更あり
  }

  const currentHash = calculateDeckHash(deckInfo);
  const changed = currentHash !== cached.hash;
  if (changed) {
    console.temp(`[isDeckInfoChanged] Deck ${dno}: Hash mismatch - current: ${currentHash}, cached: ${cached.hash}`);
  }
  return changed;
}

/**
 * キャッシュが期限切れかチェック
 */
export function isCacheExpired(
  cachedInfo: CachedDeckInfo,
  expirationMs: number = CACHE_EXPIRATION_MS
): boolean {
  const expired = Date.now() - cachedInfo.lastUpdated > expirationMs;
  if (expired) {
    const age = Math.floor((Date.now() - cachedInfo.lastUpdated) / (24 * 60 * 60 * 1000));
    console.temp(`[isCacheExpired] Cache expired: ${age} days old`);
  }
  return expired;
}

/**
 * デッキのサムネイル画像を生成してキャッシュに保存
 */
export async function generateAndCacheThumbnail(
  dno: number,
  deckInfo: DeckInfo,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<void> {
  try {
    // デッキ情報をキャッシュに保存（サムネイル生成の前）
    // DeckCardRef はそのまま使用可能（既に型安全）
    const mainDeckData: DeckCardRef[] = deckInfo.mainDeck;
    const extraDeckData: DeckCardRef[] = deckInfo.extraDeck;
    const sideDeckData: DeckCardRef[] = deckInfo.sideDeck;

    const hash = calculateDeckHash(deckInfo);
    console.temp(`[generateAndCacheThumbnail] Deck ${dno}: Saving with hash ${hash}, originalName="${deckInfo.originalName}", name="${deckInfo.name}", cards=${mainDeckData.length}/${extraDeckData.length}/${sideDeckData.length}`);

    const now = Date.now();
    const cachedInfo: CachedDeckInfo = {
      dno,
      name: deckInfo.originalName || '', // 元のデッキ名を保存
      category: deckInfo.category,
      mainDeck: mainDeckData,
      extraDeck: extraDeckData,
      sideDeck: sideDeckData,
      lastUpdated: now,
      hash,
      cardCount: {
        main: mainDeckData.reduce((sum: number, card: DeckCardRef) => sum + card.quantity, 0),
        extra: extraDeckData.reduce((sum: number, card: DeckCardRef) => sum + card.quantity, 0),
        side: sideDeckData.reduce((sum: number, card: DeckCardRef) => sum + card.quantity, 0)
      },
      lastThumbnailUpdate: now // サムネイル更新時刻を記録
    };
    cachedDeckInfos.set(dno, cachedInfo);
    saveDeckInfoCache(cachedDeckInfos);

    // サムネイル画像を生成
    const imageUrl = await generateDeckThumbnailImage(deckInfo, headPlacementCardIds);
    if (imageUrl) {
      deckThumbnails.set(dno, imageUrl);
    } else {
      // 空のデッキの場合は特別なマーカーを保存（次回のチェックで「更新不要」と判定されるように）
      deckThumbnails.set(dno, '');
    }
    saveThumbnailCache(deckThumbnails);
  } catch (error) {
    console.warn(`Failed to generate and cache thumbnail for deck ${dno}:`, error);
  }
}

/**
 * デッキに変更があるかチェック（画像生成は行わない）
 */
async function checkDeckNeedsUpdate(
  dno: number,
  getDeckDetail: (dno: number) => Promise<DeckInfo | null>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<{ needsUpdate: boolean; deckInfo: DeckInfo | null }> {
  try {
    // デッキ情報を取得（変更検出に必要）
    const deckInfo = await getDeckDetail(dno);
    if (!deckInfo) return { needsUpdate: false, deckInfo: null };

    // 変更があるか、またはキャッシュが期限切れかチェック
    const needsUpdate =
      isDeckInfoChanged(dno, deckInfo, cachedDeckInfos) ||
      (cachedDeckInfos.has(dno) && isCacheExpired(cachedDeckInfos.get(dno)!));

    return { needsUpdate, deckInfo };
  } catch (error) {
    console.warn(`[deck-cache] Failed to check deck ${dno}:`, error);
    return { needsUpdate: false, deckInfo: null };
  }
}

/**
 * デッキ情報を更新してサムネイルを生成（必要な場合のみ）
 */
export async function updateDeckInfoAndThumbnail(
  dno: number,
  getDeckDetail: (dno: number) => Promise<DeckInfo | null>,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<boolean> {
  const { needsUpdate, deckInfo } = await checkDeckNeedsUpdate(dno, getDeckDetail, cachedDeckInfos);

  if (needsUpdate && deckInfo) {
    await generateAndCacheThumbnail(
      dno,
      deckInfo,
      headPlacementCardIds,
      deckThumbnails,
      cachedDeckInfos
    );
  }

  return needsUpdate;
}

/**
 * デッキ情報を直接渡してサムネイルを更新（APIコール不要）
 *
 * デッキ保存・load時など、既にデッキ情報が手元にある場合に使用
 */
export async function updateDeckInfoAndThumbnailWithData(
  dno: number,
  deckInfo: DeckInfo,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>
): Promise<void> {
  // 設定でAPIフェッチなしでのサムネイル更新が無効な場合はスキップ
  // Storeをインポートしないため、window グローバルオブジェクトから設定を取得
  try {
    const appSettings = (window as any).ygoNextCurrentSettings;
    if (appSettings && appSettings.updateThumbnailWithoutFetch === false) {
      return;
    }
  } catch (error) {
    // 設定取得失敗時は通常通り処理を続ける
  }

  try {
    // 変更があるか、またはキャッシュが期限切れかチェック
    const needsUpdate =
      isDeckInfoChanged(dno, deckInfo, cachedDeckInfos) ||
      (cachedDeckInfos.has(dno) && isCacheExpired(cachedDeckInfos.get(dno)!));

    // サムネイルが存在しない場合も生成が必要
    const thumbnailMissing = !deckThumbnails.has(dno);

    if (needsUpdate || thumbnailMissing) {
      await generateAndCacheThumbnail(
        dno,
        deckInfo,
        headPlacementCardIds,
        deckThumbnails,
        cachedDeckInfos
      );
    }
  } catch (error) {
    console.warn(`[deck-cache] Failed to update deck ${dno} with data:`, error);
  }
}

/**
 * requestIdleCallback を Promise 化する
 *
 * @returns requestIdleCallback が完了したときに resolve される Promise
 *
 * @remarks
 * - requestIdleCallback が利用可能な場合はそれを使用
 * - 非対応環境では setTimeout でフォールバック（200ms）
 */
function waitForIdleCallback(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve());
    } else {
      setTimeout(() => resolve(), 200);
    }
  });
}

/**
 * subsequence が sequence の部分シーケンスであるかを線形時間で判定する
 *
 * @param subsequence - 部分シーケンス候補
 * @param sequence - 全体シーケンス
 * @returns subsequence の全要素が sequence 内に順序を保って存在すれば true
 *
 * @remarks
 * - 2つのポインタを使った O(N) アルゴリズム
 * - subsequence の各要素を sequence 内で順番に探索
 * - 全要素が見つかれば true、そうでなければ false
 */
function isSubsequence<T>(subsequence: T[], sequence: T[]): boolean {
  let subIdx = 0;
  for (let seqIdx = 0; seqIdx < sequence.length && subIdx < subsequence.length; seqIdx++) {
    if (sequence[seqIdx] === subsequence[subIdx]) {
      subIdx++;
    }
  }
  return subIdx === subsequence.length;
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
  deckList: DeckListItem[],
  getDeckDetail: (dno: number) => Promise<DeckInfo | null>,
  headPlacementCardIds: string[],
  deckThumbnails: Map<number, string>,
  cachedDeckInfos: Map<number, CachedDeckInfo>,
  force: boolean = false
): Promise<void> {
  if (!deckList || deckList.length === 0) return;

  // バックグラウンドでのデッキ情報取得が有効かチェック（force=falseの場合のみ）
  // window グローバルオブジェクトから設定を取得
  if (!force) {
    try {
      const appSettings = (window as any).ygoNextCurrentSettings;
      if (!appSettings || appSettings.backgroundDeckInfoFetch === false) {
        return;
      }
    } catch (error) {
      // 設定取得失敗時はスキップ
      return;
    }
  }

  // 設定でデッキサムネイル作成が無効な場合はスキップ（force=falseの場合のみ）
  // window グローバルオブジェクトから設定を取得
  if (!force) {
    try {
      const appSettings = (window as any).ygoNextCurrentSettings;
      if (appSettings && appSettings.enableDeckThumbnailGeneration === false) {
        return;
      }
    } catch (error) {
      // 設定取得失敗時は通常通り処理を続ける
    }
  }

  // 前回の deckList 順序を読み込む
  const previousOrder = loadDeckListOrder();

  const endIndex = Math.min(startIndex + batchSize, deckList.length);
  const targetDecks = deckList.slice(startIndex, endIndex);

  // フェーズ1: 変更判定のみ（画像生成は行わない）
  const decksToUpdate: Array<{ dno: number; deckInfo: DeckInfo }> = [];
  let consecutiveSkipped = 0;

  let apiCallCount = 0; // API通信回数をカウント

  for (let i = 0; i < targetDecks.length; i++) {
    const deck = targetDecks[i];
    if (!deck) continue;
    const currentDno = deck.dno;

    // バックグラウンド更新の場合（force=false）、前回更新から1日以内はスキップ
    let skipDueToRecentUpdate = false;
    if (!force) {
      const cached = cachedDeckInfos.get(currentDno);
      console.temp(`[generateThumbnailsInBackground] Deck ${currentDno}: cached=${!!cached}, lastThumbnailUpdate=${cached?.lastThumbnailUpdate}`);
      if (cached?.lastThumbnailUpdate) {
        const daysSinceUpdate = (Date.now() - cached.lastThumbnailUpdate) / (24 * 60 * 60 * 1000);
        if (daysSinceUpdate < 1) {
          console.temp(`[generateThumbnailsInBackground] Deck ${currentDno}: Skipping (updated ${daysSinceUpdate.toFixed(2)} days ago)`);
          skipDueToRecentUpdate = true;
        }
      }
    }

    // 前回のこのdnoの位置
    const previousIndex = previousOrder.indexOf(currentDno);
    const existedBefore = previousIndex !== -1;

    // 順序関係が保たれているかチェック
    let orderPreserved = false;
    if (existedBefore) {
      // 前回このdnoより前にあった全てのdno
      const previousBeforeDnos = previousOrder.slice(0, previousIndex);

      // そのうち今回も存在するdnoに絞る（削除されたdnoは無視）
      const currentDeckDnos = deckList.map(d => d.dno);
      const relevantDnos = previousBeforeDnos.filter(dno =>
        currentDeckDnos.includes(dno)
      );

      // 今回のこのdnoより前にある全てのdno
      const currentIndex = startIndex + i;
      const currentBeforeDnos = deckList.slice(0, currentIndex).map(d => d.dno);

      // relevantDnos が currentBeforeDnos の部分シーケンスであるかを O(N) で判定
      orderPreserved = isSubsequence(relevantDnos, currentBeforeDnos);
    }

    // 内容が変わっていないか（API通信が必要な場合のみチェック）
    let needsUpdate = false;
    let deckInfo: DeckInfo | null = null;

    if (!skipDueToRecentUpdate) {
      // API通信前にランダム待機（2回目以降のAPI通信のみ）
      if (apiCallCount > 0) {
        const delay = 500 + Math.random() * 1500; // 500-2000msのランダム待機
        console.temp(`[generateThumbnailsInBackground] Waiting ${delay.toFixed(0)}ms before processing deck ${currentDno}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await checkDeckNeedsUpdate(currentDno, getDeckDetail, cachedDeckInfos);
      needsUpdate = result.needsUpdate;
      deckInfo = result.deckInfo;
      apiCallCount++; // API通信をカウント
    }

    console.temp(`[generateThumbnailsInBackground] Deck ${currentDno}: orderPreserved=${orderPreserved}, needsUpdate=${needsUpdate}, skipDueToRecentUpdate=${skipDueToRecentUpdate}`);

    // スキップ条件：「順序関係が保たれている + 内容変化なし」または「1日以内に更新済み」
    const shouldSkip = (orderPreserved && !needsUpdate) || skipDueToRecentUpdate;

    if (shouldSkip) {
      consecutiveSkipped++;

      // スキップした場合でも、バックグラウンド更新（force=false）なら最終チェック時刻を記録
      if (!force && !skipDueToRecentUpdate) {
        // orderPreserved && !needsUpdate でスキップされた場合、チェック時刻を記録
        const cached = cachedDeckInfos.get(currentDno);
        if (cached) {
          cached.lastThumbnailUpdate = Date.now();
          cachedDeckInfos.set(currentDno, cached);
        }
      }

      // 5個連続でスキップ → 残りをスキップ（force=true でも共通）
      if (consecutiveSkipped >= 5) {
        console.temp(`[generateThumbnailsInBackground] 5 consecutive skips detected, stopping early`);
        break;
      }
      continue;
    } else {
      consecutiveSkipped = 0; // リセット
      if (needsUpdate && deckInfo) {
        console.temp(`[generateThumbnailsInBackground] Deck ${currentDno} will be updated`);
        decksToUpdate.push({ dno: currentDno, deckInfo });
      }
    }
  }

  // スキップ時に更新したキャッシュを保存
  saveDeckInfoCache(cachedDeckInfos);

  // フェーズ2: 画像生成を非同期で実行（RequestIdleCallbackで1つずつ）
  if (decksToUpdate.length === 0) {
    console.temp(`[generateThumbnailsInBackground] No decks to update`);
    return;
  }

  console.temp(`[generateThumbnailsInBackground] Generating thumbnails for ${decksToUpdate.length} decks`);

  for (const { dno, deckInfo } of decksToUpdate) {
    await waitForIdleCallback();
    console.temp(`[generateThumbnailsInBackground] Generating thumbnail for deck ${dno}`);
    await generateAndCacheThumbnail(
      dno,
      deckInfo,
      headPlacementCardIds,
      deckThumbnails,
      cachedDeckInfos
    );
    console.temp(`[generateThumbnailsInBackground] Thumbnail for deck ${dno} generated`);
  }
}
