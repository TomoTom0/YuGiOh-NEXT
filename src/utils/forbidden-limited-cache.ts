/**
 * 禁止制限リストのキャッシュ管理
 *
 * chrome.storageを使って禁止制限情報をキャッシュし、定期的に最新情報を取得する。
 *
 * デッキ名タグ [OCG-YYMM] で過去版を指定できるよう、複数の適用日をマップ構造で
 * 保持する。getRegulation(cardId) は引数なしだと最新版を返す（既存利用元の後方互換）。
 * 実在する全適用日一覧（select option）も保持し、regulation-resolver のフォールバック
 * 判定に供する。
 */

import type { ForbiddenLimitedCacheData, ForbiddenLimitedList, LimitRegulation } from '../types/card';
import { fetchForbiddenLimitedList, fetchAvailableEffectiveDates, getNextEffectiveDate } from '../api/forbidden-limited';
import { safeStorageGet, safeStorageSet } from './extension-context-checker';

// ストレージキー
const STORAGE_KEY = 'forbiddenLimitedList';

// キャッシュ有効期限（30日）
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
// 実在一覧（select option）の再発見間隔
const DISCOVERY_TTL = 7 * 24 * 60 * 60 * 1000;

/** 新形式キャッシュデータの型ガード */
function isForbiddenLimitedCacheData(value: unknown): value is ForbiddenLimitedCacheData {
  if (typeof value !== 'object' || value === null) return false;
  return 'lists' in value && 'latestEffectiveDate' in value && 'availableDates' in value && 'discoveredAt' in value;
}

/** 旧形式（単体 ForbiddenLimitedList）の型ガード */
function isOldForbiddenLimitedList(value: unknown): value is ForbiddenLimitedList {
  if (typeof value !== 'object' || value === null) return false;
  if ('lists' in value) return false; // 新形式は除外
  return 'effectiveDate' in value && 'regulations' in value && 'fetchedAt' in value;
}

/** 旧形式（単体）→ 新形式へ移行 */
function migrateOldData(old: ForbiddenLimitedList): ForbiddenLimitedCacheData {
  return {
    lists: { [old.effectiveDate]: old },
    latestEffectiveDate: old.effectiveDate,
    availableDates: [old.effectiveDate],
    discoveredAt: old.fetchedAt
  };
}

/**
 * 禁止制限リストのキャッシュ管理クラス
 */
export class ForbiddenLimitedCache {
  private cache: ForbiddenLimitedCacheData | null = null;
  private initialized = false;

  /**
   * 初期化（キャッシュをロード）
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const stored = await safeStorageGet<unknown>(STORAGE_KEY);
    const raw = stored?.[STORAGE_KEY];
    if (isForbiddenLimitedCacheData(raw)) {
      this.cache = raw;
    } else if (isOldForbiddenLimitedList(raw)) {
      // 旧形式（単体）からの移行
      this.cache = migrateOldData(raw);
      await this.persist();
    }

    this.initialized = true;

    // バックグラウンドで更新チェック
    this.checkAndUpdate().catch(err => {
      console.warn('[ForbiddenLimitedCache] Failed to check update:', err);
    });
  }

  /**
   * 指定適用日のリストを取得（内部用）。null は最新版。
   */
  private getList(effectiveDate: string | null): ForbiddenLimitedList | null {
    if (!this.cache) {
      return null;
    }
    if (effectiveDate === null) {
      const latest = this.cache.latestEffectiveDate;
      return latest ? (this.cache.lists[latest] ?? null) : null;
    }
    return this.cache.lists[effectiveDate] ?? null;
  }

  /**
   * カードIDから禁止制限状態を取得
   *
   * @param cardId カードID
   * @param effectiveDate 適用日（YYYY-MM-DD）。省略時は最新版（後方互換）
   * @returns 禁止制限状態（未制限・未取得の場合はundefined）
   */
  getRegulation(cardId: string, effectiveDate?: string): LimitRegulation | undefined {
    if (!this.cache) {
      return undefined;
    }
    const list = this.getList(effectiveDate ?? null);
    return list?.regulations[cardId];
  }

  /**
   * 複数カードの禁止制限状態を一括取得
   *
   * @param cardIds カードID配列
   * @param effectiveDate 適用日（省略時は最新版）
   */
  getRegulations(cardIds: string[], effectiveDate?: string): Record<string, LimitRegulation | undefined> {
    const result: Record<string, LimitRegulation | undefined> = {};
    for (const cardId of cardIds) {
      result[cardId] = this.getRegulation(cardId, effectiveDate);
    }
    return result;
  }

  /**
   * 現在の（最新の）適用日を取得
   */
  getCurrentEffectiveDate(): string | undefined {
    return this.cache?.latestEffectiveDate ?? undefined;
  }

  /**
   * 実在する全適用日一覧（select option）。フォールバック判定に使用。
   * 実在一覧未取得時は取得済みリストのキーで代用。
   */
  getAvailableDates(): string[] {
    if (!this.cache) {
      return [];
    }
    if (this.cache.availableDates.length > 0) {
      return [...this.cache.availableDates].sort();
    }
    return Object.keys(this.cache.lists).sort();
  }

  /**
   * 指定適用日のリストを確保（キャッシュに無ければ取得）
   *
   * @param effectiveDate 適用日（YYYY-MM-DD）
   * @returns リスト。取得失敗時は null
   */
  async ensureList(effectiveDate: string): Promise<ForbiddenLimitedList | null> {
    const existing = this.cache?.lists[effectiveDate];
    if (existing) {
      return existing;
    }
    try {
      const data = await fetchForbiddenLimitedList(effectiveDate);
      this.cache = this.cache ?? { lists: {}, latestEffectiveDate: null, availableDates: [], discoveredAt: 0 };
      this.cache.lists[effectiveDate] = data;
      // 実在一覧に含めておく（未取得の場合の代用強化）
      if (!this.cache.availableDates.includes(effectiveDate)) {
        this.cache.availableDates.push(effectiveDate);
      }
      await this.persist();
      return data;
    } catch (err) {
      console.warn(`[ForbiddenLimitedCache] Failed to fetch list ${effectiveDate}:`, err);
      return null;
    }
  }

  /**
   * キャッシュの更新が必要かチェック
   */
  private needsUpdate(): boolean {
    if (!this.cache) {
      return true;
    }

    const now = Date.now();

    // 実在一覧の再発見
    if (now - this.cache.discoveredAt > DISCOVERY_TTL) {
      return true;
    }

    // 最新版リストの期限切れ
    const latest = this.cache.latestEffectiveDate ? this.cache.lists[this.cache.latestEffectiveDate] : null;
    if (!latest) {
      return true;
    }
    if (now - latest.fetchedAt > CACHE_TTL) {
      return true;
    }

    // 次回の適用日が過ぎている場合
    const nextDate = getNextEffectiveDate(new Date(latest.effectiveDate));
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
   * 強制的にキャッシュを更新（最新版 + 実在一覧の再発見）
   */
  async forceUpdate(): Promise<void> {
    const now = Date.now();
    const lists = this.cache?.lists ?? {};

    // 最新版を取得
    const latest = await fetchForbiddenLimitedList();
    lists[latest.effectiveDate] = latest;

    // 実在一覧（select option）の再発見
    let availableDates = this.cache?.availableDates ?? [];
    let discoveredAt = this.cache?.discoveredAt ?? 0;
    if (now - discoveredAt > DISCOVERY_TTL) {
      try {
        availableDates = await fetchAvailableEffectiveDates();
        discoveredAt = now;
      } catch (err) {
        console.warn('[ForbiddenLimitedCache] Failed to fetch available dates:', err);
      }
    }

    this.cache = {
      lists,
      latestEffectiveDate: latest.effectiveDate,
      availableDates,
      discoveredAt
    };

    await this.persist();
  }

  private async persist(): Promise<void> {
    await safeStorageSet({ [STORAGE_KEY]: this.cache });
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
