/**
 * 禁止制限リストのキャッシュ管理
 *
 * chrome.storageを使って禁止制限情報をキャッシュし、
 * 定期的に最新情報を取得する
 */

import type { ForbiddenLimitedList, LimitRegulation } from '../types/card';
import { fetchForbiddenLimitedList, getNextEffectiveDate } from '../api/forbidden-limited';
import { safeStorageGet, safeStorageSet } from './extension-context-checker';

// ストレージキー
const STORAGE_KEY = 'forbiddenLimitedList';

// キャッシュ有効期限（30日）
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * 禁止制限リストのキャッシュ管理クラス
 */
export class ForbiddenLimitedCache {
  private cache: ForbiddenLimitedList | null = null;
  private initialized = false;

  /**
   * 初期化（キャッシュをロード）
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const stored = await safeStorageGet<ForbiddenLimitedList>(STORAGE_KEY);
    if (stored && stored[STORAGE_KEY]) {
      this.cache = stored[STORAGE_KEY];
    }

    this.initialized = true;

    // バックグラウンドで更新チェック
    this.checkAndUpdate().catch(err => {
      console.warn('[ForbiddenLimitedCache] Failed to check update:', err);
    });
  }

  /**
   * カードIDから禁止制限状態を取得
   *
   * @param cardId カードID
   * @returns 禁止制限状態（未制限の場合はundefined）
   */
  getRegulation(cardId: string): LimitRegulation | undefined {
    if (!this.cache) {
      return undefined;
    }

    return this.cache.regulations[cardId];
  }

  /**
   * 複数カードの禁止制限状態を一括取得
   *
   * @param cardIds カードID配列
   * @returns カードIDと禁止制限状態のマップ
   */
  getRegulations(cardIds: string[]): Record<string, LimitRegulation | undefined> {
    const result: Record<string, LimitRegulation | undefined> = {};

    for (const cardId of cardIds) {
      result[cardId] = this.getRegulation(cardId);
    }

    return result;
  }

  /**
   * 現在の適用日を取得
   *
   * @returns 適用日（YYYY-MM-DD形式）、キャッシュがない場合はundefined
   */
  getCurrentEffectiveDate(): string | undefined {
    return this.cache?.effectiveDate;
  }

  /**
   * キャッシュの更新が必要かチェック
   *
   * @returns 更新が必要な場合はtrue
   */
  private needsUpdate(): boolean {
    if (!this.cache) {
      return true;
    }

    const now = Date.now();

    // キャッシュが古い場合（30日以上経過）
    if (now - this.cache.fetchedAt > CACHE_TTL) {
      return true;
    }

    // 次回の適用日が過ぎている場合
    const nextDate = getNextEffectiveDate(new Date(this.cache.effectiveDate));
    const nextTimestamp = new Date(nextDate).getTime();
    if (now >= nextTimestamp) {
      return true;
    }

    return false;
  }

  /**
   * キャッシュの更新チェックと更新
   */
  async checkAndUpdate(): Promise<void> {
    if (!this.needsUpdate()) {
      return;
    }

    try {
      await this.forceUpdate();
    } catch (err) {
      console.error('[ForbiddenLimitedCache] Failed to update:', err);
      // エラーが発生しても既存のキャッシュは保持
    }
  }

  /**
   * 強制的にキャッシュを更新
   */
  async forceUpdate(): Promise<void> {
    const newData = await fetchForbiddenLimitedList();
    this.cache = newData;

    await safeStorageSet({ [STORAGE_KEY]: newData });
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    this.cache = null;
    await safeStorageSet({ [STORAGE_KEY]: null });
  }
}

/**
 * グローバルインスタンス
 */
export const forbiddenLimitedCache = new ForbiddenLimitedCache();
