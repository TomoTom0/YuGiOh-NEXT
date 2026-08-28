/**
 * GENESYSポイントリストのキャッシュ管理
 *
 * chrome.storage を使ってGENESYSポイント情報をキャッシュする。
 * GENESYSリストは月次でなく不規則に公開される（例: 6月→8月）ため、
 * howtoインデックスページから実在する全リストを発見して取得する。
 * Content Script起動時にキャッシュのTTLを確認し、必要な場合だけ新リストを取り込む。
 *
 * getPoint() は「現在有効なリスト（適用日 <= 今日 で最新）」を参照し、
 * まだどのリストも有効でなければ「最新版」を参照する。
 *
 * 禁止制限キャッシュ（forbidden-limited-cache.ts）と同じパターン。
 */

import type { GenesysPointCacheData, GenesysListEntry } from '../types/card';
import { fetchGenesysIndex, fetchGenesysPointList, listParamToEffectiveDate } from '../api/genesys';
import { resolveGenesysEntries } from './genesys-name-resolver';
import { safeStorageGet, safeStorageSet } from './extension-context-checker';
import { getUnifiedCacheDB } from './unified-cache-db';

// ストレージキー（禁止制限キャッシュと同様の命名規約: プレフィックスなし）
const STORAGE_KEY = 'genesysPointList';

// インデックス再解析間隔（新リスト発見のため）。起動時の毎回解析を避ける TTL。
// backgroundは毎週チェックするため、6日にしておく。
const DISCOVERY_TTL = 6 * 24 * 60 * 60 * 1000;

/**
 * タイムスタンプを YYYY-MM-DD 形式（ローカル時刻）に変換
 * 適用日との比較に使用。YYYY-MM-DD は辞書順 == 日付順。
 */
function timestampToYmd(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 現在有効なリストエントリを選択する（純粋関数）
 *
 * 適用日（effectiveDate）<= 今日 の中で最も新しいリスト。
 * まだどのリストも有効でなければ（すべて未来適用）「最新版」を返す。
 *
 * @param cache キャッシュデータ（null可）
 * @param now 基準日時（timestamp）
 */
export function selectApplicableGenesysList(
  cache: GenesysPointCacheData | null,
  now: number
): GenesysListEntry | null {
  if (!cache) {
    return null;
  }
  const entries = Object.values(cache.lists);
  if (entries.length === 0) {
    return null;
  }

  const todayStr = timestampToYmd(now);
  const effective = entries
    .filter(e => e.effectiveDate <= todayStr)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  if (effective.length > 0) {
    return effective[0] ?? null;
  }

  // すべて未来: 最新版を優先、なければ適用日が最も新しいもの
  const latest = cache.latestListParam ? cache.lists[cache.latestListParam] ?? null : null;
  if (latest) {
    return latest;
  }
  return entries.reduce((a, b) => (a.effectiveDate >= b.effectiveDate ? a : b));
}

/**
 * GENESYSポイントリストのキャッシュ管理クラス
 */
export class GenesysPointCache {
  private cache: GenesysPointCacheData | null = null;
  private initialized = false;
  // checkAndUpdate() の多重実行防止・in-flight共有用（未完了なら同じPromiseを返す）
  private updatePromise: Promise<void> | null = null;

  /**
   * 初期化（キャッシュをロード）
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const stored = await safeStorageGet<GenesysPointCacheData>(STORAGE_KEY);
    if (stored && stored[STORAGE_KEY]) {
      this.cache = stored[STORAGE_KEY];
    }

    this.initialized = true;

    // 初期化を完了させた後、必要な場合だけ更新チェック（新リスト取り込み）
    this.checkAndUpdate().catch(err => {
      console.warn('[GenesysPointCache] Failed to check update:', err);
    });
  }

  /**
   * カードIDからGENESYSポイントを取得（現在有効なリストから）
   *
   * @param cardId カードID
   * @returns GENESYSポイント（未登録の場合はundefined）
   */
  /**
   * カードIDからGENESYSポイントを取得
   *
   * @param cardId カードID
   * @param listParam リストパラメータ（YYYYMM）。省略時は現在有効なリスト（従来動作）
   * @returns GENESYSポイント（未登録の場合はundefined）
   */
  getPoint(cardId: string, listParam?: string): number | undefined {
    if (listParam) {
      return this.cache?.lists[listParam]?.points[cardId];
    }
    const list = selectApplicableGenesysList(this.cache, Date.now());
    return list?.points[cardId];
  }

  /**
   * 現在参照しているリストパラメータ（YYYYMM）
   */
  getCurrentListParam(): string | undefined {
    return selectApplicableGenesysList(this.cache, Date.now())?.listParam;
  }

  /**
   * 現在参照しているリストの適用日
   */
  getCurrentEffectiveDate(): string | undefined {
    return selectApplicableGenesysList(this.cache, Date.now())?.effectiveDate;
  }

  /**
   * 実在する全listParam一覧（インデックスから発見）。フォールバック判定に使用。
   * 未取得時は取得済みリストのキーで代用。
   */
  getAvailableListParams(): string[] {
    if (!this.cache) {
      return [];
    }
    if (this.cache.availableListParams.length > 0) {
      return [...this.cache.availableListParams];
    }
    return Object.keys(this.cache.lists);
  }

  /**
   * 「現在有効なリスト」（GENESYSタグのYYMM省略=最新版指定）を確保する
   *
   * getPoint() 等が参照する selectApplicableGenesysList はキャッシュ済みの
   * lists のみを見るため、起動直後でまだどのリストも取得されていない場合は
   * 常に undefined を返してしまう。ensureList(listParam) と異なり対象の
   * listParam が事前に分からないため、未取得ならインデックス解析経由で
   * 全リストを取得してから改めて解決する。
   *
   * @returns 現在有効なリストエントリ。取得失敗時は null
   */
  async ensureCurrentList(): Promise<GenesysListEntry | null> {
    const current = selectApplicableGenesysList(this.cache, Date.now());
    if (current) {
      return current;
    }

    try {
      await this.forceUpdate();
    } catch (err) {
      console.warn('[GenesysPointCache] Failed to ensure current list:', err);
      return null;
    }

    return selectApplicableGenesysList(this.cache, Date.now());
  }

  /**
   * 指定listParamのリストを確保（キャッシュに無ければ取得）
   *
   * @param listParam リストパラメータ（YYYYMM）
   * @returns リストエントリ。実在一覧に存在しない・取得失敗時は null
   */
  async ensureList(listParam: string): Promise<GenesysListEntry | null> {
    const existing = this.cache?.lists[listParam];
    if (existing) {
      return existing;
    }

    // 実在確認（インデックス）。未取得なら forceUpdate で発見
    let available = this.getAvailableListParams();
    if (available.length === 0) {
      try {
        await this.forceUpdate();
      } catch (err) {
        console.warn('[GenesysPointCache] Failed to refresh index:', err);
        return null;
      }
      available = this.getAvailableListParams();
    }
    if (!available.includes(listParam)) {
      // インデックスに存在しない listParam
      return null;
    }

    // forceUpdate で既に取得されていれば（未解決カードが残っていない限り）それを返す
    const afterForce = this.cache?.lists[listParam];
    if (afterForce && !afterForce.incomplete) {
      return afterForce;
    }

    try {
      // カード名->cid解決にはカードDBが必要。未初期化だと全て未解決になるため先に初期化する
      await getUnifiedCacheDB().initialize();
      const parsed = await fetchGenesysPointList(listParam);
      const { points, unresolved } = resolveGenesysEntries(parsed.entries);
      if (unresolved.length > 0) {
        console.warn(
          `[GenesysPointCache] list ${listParam}: ${unresolved.length} cards unresolved (first 10):`,
          unresolved.slice(0, 10)
        );
      }
      const entry: GenesysListEntry = {
        listParam,
        effectiveDate: listParamToEffectiveDate(listParam),
        points,
        fetchedAt: Date.now(),
        incomplete: unresolved.length > 0,
      };
      this.cache = this.cache ?? {
        lists: {},
        latestListParam: null,
        availableListParams: [],
        discoveredAt: 0
      };
      this.cache.lists[listParam] = entry;
      await safeStorageSet({ [STORAGE_KEY]: this.cache });
      return entry;
    } catch (err) {
      console.warn(`[GenesysPointCache] Failed to fetch list ${listParam}:`, err);
      return null;
    }
  }

  /**
   * 更新チェックが必要か判定
   *
   * キャッシュがない、または前回のインデックス解析からDISCOVERY_TTL経過で更新。
   * （公開済みリストは不変のため、個別リストのTTL再取得は不要。新リスト発見が主目的）
   */
  private needsUpdate(): boolean {
    if (!this.cache) {
      return true;
    }
    return Date.now() - this.cache.discoveredAt > DISCOVERY_TTL;
  }

  /**
   * 更新チェックと更新（新リストがあれば取り込む）
   *
   * 既に更新が進行中（init()からのバックグラウンド呼び出し等）の場合は、
   * 同じPromiseを返して完了を待てるようにする（多重fetch防止）。
   * これにより「discovery完了前にavailableListParamsを参照してしまう」問題を、
   * 呼び出し側が明示的にawaitするだけで回避できる。
   */
  async checkAndUpdate(): Promise<void> {
    if (this.updatePromise) {
      return this.updatePromise;
    }
    if (!this.needsUpdate()) {
      return;
    }

    this.updatePromise = this.forceUpdate()
      .catch(err => {
        console.error('[GenesysPointCache] Failed to update:', err);
        // エラーが発生しても既存のキャッシュは保持
      })
      .finally(() => {
        this.updatePromise = null;
      });

    return this.updatePromise;
  }

  /**
   * インデックスを再解析し、未取得のリストを取り込む
   *
   * howtoインデックスから実在する全リストを発見し、キャッシュに無いリストを
   * 取得してカード名->cid解決して保存する。公開済みリストは不変のため、
   * 既存リストの再取得は行わない。
   */
  async forceUpdate(): Promise<void> {
    const now = Date.now();
    const refs = await fetchGenesysIndex();
    const lists: Record<string, GenesysListEntry> = this.cache?.lists ?? {};
    let latestListParam: string | null = null;

    // カード名->cid解決にはカードDBが必要。未初期化だと全て未解決になるため先に初期化する
    await getUnifiedCacheDB().initialize();

    for (const ref of refs) {
      if (ref.isLatest) {
        latestListParam = ref.listParam;
      }
      // 公開済みリストは不変: 未取得のリストのみ取得。ただし前回未解決カードが
      // 残っていた場合はカードDBが揃った可能性があるため再取得する
      const existingEntry = lists[ref.listParam];
      if (existingEntry && !existingEntry.incomplete) {
        continue;
      }

      let parsed;
      try {
        parsed = await fetchGenesysPointList(ref.listParam);
      } catch (err) {
        console.warn(`[GenesysPointCache] Failed to fetch list ${ref.listParam}:`, err);
        continue;
      }
      const { points, unresolved } = resolveGenesysEntries(parsed.entries);
      if (unresolved.length > 0) {
        console.warn(
          `[GenesysPointCache] list ${ref.listParam}: ${unresolved.length} cards unresolved (first 10):`,
          unresolved.slice(0, 10)
        );
      }
      lists[ref.listParam] = {
        listParam: ref.listParam,
        effectiveDate: ref.effectiveDate,
        points,
        fetchedAt: now,
        incomplete: unresolved.length > 0,
      };
    }

    const availableListParams = refs.map(r => r.listParam);

    this.cache = {
      lists,
      latestListParam: latestListParam ?? this.cache?.latestListParam ?? null,
      availableListParams,
      discoveredAt: now,
    };

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
export const genesysPointCache = new GenesysPointCache();
