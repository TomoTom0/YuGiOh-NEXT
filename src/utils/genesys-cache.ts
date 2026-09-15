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
import { resolveGenesysEntries, genesysNameResolver } from './genesys-name-resolver';
import { safeStorageGet, safeStorageSet } from './extension-context-checker';
import { getUnifiedCacheDB } from './unified-cache-db';

// ストレージキー（禁止制限キャッシュと同様の命名規約: プレフィックスなし）
const STORAGE_KEY = 'genesysPointList';

// インデックス再解析間隔（新リスト発見のため）。起動時の毎回解析を避ける TTL。
// backgroundは毎週チェックするため、6日にしておく。
const DISCOVERY_TTL = 6 * 24 * 60 * 60 * 1000;

// incomplete（名前解決の一部/全部が失敗）なリストの再試行間隔。
// カードDBが未初期化なタイミングで初回fetchすると全滅しうるため再試行が必要だが、
// デッキ編集を開くたびに毎回howtoページへfetchすると外部サーバーに負荷をかけるため間引く。
// ローカル再解決（reresolveLocal）がカードDB変化検知で外部fetch不要な再試行自体を
// 別途間引いているため、この値自体はDISCOVERY_TTLと同値まで長く取ってよい
// （値の二重管理を避けるためDISCOVERY_TTLを参照する）。
const INCOMPLETE_RETRY_TTL = DISCOVERY_TTL;

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
  // 前回reresolveLocal()を試みた時点のカードDB件数（cardTableACount）を
  // listParamごとに記録する。前回から変化していなければ再解決しても結果は
  // 変わらない（前回解決できなかったカードは今回も解決できない）という前提は
  // 「同一listParamの再試行」にのみ成立するため、listParam単位で記録する
  // （インスタンス単位の単一値にすると、forceUpdate()のループ内で複数の異なる
  // listParamが同時にincompleteな場合、1件目の解決試行でカード数が記録され、
  // まだ一度もこのDB状態で解決を試みていない2件目以降を誤ってスキップして
  // しまう。genesysNameResolverは1件目のresetでbuild済みのため、2件目以降の
  // resolveGenesysEntries()自体は安価でありスキップの必要は無い）。
  private lastReresolveAttemptCardCount: Record<string, number> = {};

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

    // incompleteなエントリは、外部fetch判断（forceUpdate呼び出し）より先に
    // 外部fetch不要なローカル再解決を試す（カードDBが後で充実していれば
    // 外部サーバーに負荷をかけずに解決できるため）。TTL判定の対象外。
    // 部分的にでも解決が進んだ結果（再解決後もincomplete:true）は破棄せず
    // 永続化して返す（カードDBは閲覧単位で逐次充実するため部分解決が常態で、
    // 完全解決時のみ反映だと解決済みポイントがTTL経過まで表示されない）。
    if (current?.incomplete) {
      const relocal = await this.reresolveLocal(current);
      if (relocal) {
        await this.persistResolvedEntry(relocal);
        return relocal;
      }
    }

    // incompleteなキャッシュ（初回fetch時にカードDB未初期化で名前解決が
    // 全滅した状態）はそのまま返さず再取得する。forceUpdate()は既存の
    // incompleteエントリを正しく再解決するため、ここを通すだけでよい。
    // ただし外部サーバーへの負荷軽減のため INCOMPLETE_RETRY_TTL で間引く。
    if (current && (!current.incomplete || Date.now() - current.fetchedAt < INCOMPLETE_RETRY_TTL)) {
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

    // incompleteなエントリは、TTL判定や外部fetchより先に外部fetch不要な
    // ローカル再解決を試す（カードDBが後で充実していれば外部サーバーに
    // 負荷をかけずに解決できるため）。TTL判定の対象外。
    // 部分的にでも解決が進んだ結果（再解決後もincomplete:true）は破棄せず
    // 永続化して返す（解決済みポイントをTTL経過を待たずに反映するため）。
    if (existing?.incomplete) {
      const relocal = await this.reresolveLocal(existing);
      if (relocal) {
        await this.persistResolvedEntry(relocal);
        return relocal;
      }
    }

    // incompleteなキャッシュ（初回fetch時にカードDB未初期化で名前解決が
    // 全滅した状態）はそのまま返さず再取得する（forceUpdate()と同じ扱い）。
    // ただし外部サーバーへの負荷軽減のため INCOMPLETE_RETRY_TTL で間引く。
    if (existing && (!existing.incomplete || Date.now() - existing.fetchedAt < INCOMPLETE_RETRY_TTL)) {
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
        // 未解決分が残ってもcid解決に使った生データを保持し、外部fetch無しの
        // ローカル再解決（reresolveLocal）を後で可能にする（TASK-470）
        rawEntries: parsed.entries,
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
      // 残っていた場合はカードDBが揃った可能性があるため、ローカル再解決（DB件数
      // 変化検知で間引き）を先に試み、それでも解決が進めない場合のみ再取得する
      const existingEntry = lists[ref.listParam];
      if (existingEntry && !existingEntry.incomplete) {
        continue;
      }

      // incompleteな既存エントリは、外部fetchより先に外部fetch不要な
      // ローカル再解決を試す。部分的な解決進捗（再解決後もincomplete:true）でも
      // 結果を反映できればそのlistParamの外部fetchをスキップする
      if (existingEntry?.incomplete) {
        const relocal = await this.reresolveLocal(existingEntry);
        if (relocal) {
          lists[ref.listParam] = relocal;
          continue;
        }
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
        // 未解決分が残ってもcid解決に使った生データを保持し、外部fetch無しの
        // ローカル再解決（reresolveLocal）を後で可能にする（TASK-470）
        rawEntries: parsed.entries,
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
   * incompleteなエントリを、外部fetch無しでローカルのカードDB（UnifiedCacheDB）を
   * 使って再解決する（TASK-470）。
   *
   * 新規インストール直後はカードDBが空で、GENESYS外部リストの名前解決が全滅し
   * incomplete:trueとしてキャッシュされる。カードDBは閲覧のたびに逐次充実するが、
   * それを検知して再解決する仕組みが無かった。外部fetch直後の生データ
   * （entry.rawEntries）を保持しておくことで、外部サーバーへ問い合わせずに
   * カード名->cid解決だけをやり直せる。
   *
   * カードDB件数（cardTableACount）が、同一listParamの前回のローカル再解決試行時点
   * から変化していない場合は、再解決しても結果が変わらない（前回解決できなかった
   * カードは今回も解決できない）ため、genesysNameResolver.reset()を含む再解決処理
   * そのものをスキップする（TASK-471）。この間引きはlistParamごとに記録するため、
   * forceUpdate()のループ内で複数の異なるlistParamを処理する場合でも、あるlistParam
   * の解決試行が他のlistParamの初回試行を誤ってスキップさせることはない。
   *
   * トレードオフ（Moderate、許容）: カード件数ベースの変化検知は、既存カードの
   * 内容更新（langsNameが後から追加される等、件数が変化しないケース）を見逃す。
   * これはINCOMPLETE_RETRY_TTLゲート付きの既存外部fetchロジックが最終的な
   * セーフティネットとして機能するため致命的ではない。
   *
   * @param entry 再解決対象のエントリ（incompleteなもの）
   * @returns 再解決結果の新しいエントリ。entry.rawEntriesが無い/空、同一listParamの
   *   前回試行時からカードDB件数が変化していない、または再解決処理自体が失敗した
   *   場合はnull（呼び出し側は既存の外部fetchフォールバックへ進む）。再解決しても
   *   なお未解決カードが残る場合は、解決済み分が反映されたincomplete:trueのエントリ
   *   を返す（呼び出し側は部分解決も破棄せず永続化・採用する）
   */
  private async reresolveLocal(entry: GenesysListEntry): Promise<GenesysListEntry | null> {
    if (!entry.rawEntries || entry.rawEntries.length === 0) {
      return null;
    }

    try {
      // カード名->cid解決にはカードDBが必要。未初期化だと全て未解決になるため先に初期化する
      const db = getUnifiedCacheDB();
      await db.initialize();

      // カードDB件数が、同一listParamの前回のローカル再解決試行時点から変化して
      // いなければ、再解決しても結果は変わらないため、reset()を含む再解決処理
      // 自体をスキップする。listParamごとに記録することで、他のlistParamの
      // 解決試行がこのlistParamの初回試行を誤ってスキップさせない
      const cardCount = db.getStats().cardTableACount;
      if (this.lastReresolveAttemptCardCount[entry.listParam] === cardCount) {
        return null;
      }
      this.lastReresolveAttemptCardCount[entry.listParam] = cardCount;

      // GenesysNameResolver.build() はthis.builtフラグで一度きりしか構築されないため、
      // reset()を呼ばない限りカードDBが後で充実しても名前解決マップが更新されない。
      // 解決前に必ずresetしてから resolveGenesysEntries を呼ぶこと
      genesysNameResolver.reset();
      const { points, unresolved } = resolveGenesysEntries(entry.rawEntries);
      if (unresolved.length > 0) {
        console.warn(
          `[GenesysPointCache] list ${entry.listParam}: local re-resolve left ${unresolved.length} cards unresolved (first 10):`,
          unresolved.slice(0, 10)
        );
      }
      return {
        ...entry,
        points,
        incomplete: unresolved.length > 0,
        // fetchedAt は外部取得日時のまま変更しない（再解決日時と混同しないため）
      };
    } catch (err) {
      console.warn(`[GenesysPointCache] Failed to locally re-resolve list ${entry.listParam}:`, err);
      return null;
    }
  }

  /**
   * ローカル再解決で改善したエントリ（部分解決のincomplete:trueを含む）を
   * メモリキャッシュへ反映し、chrome.storage.localへ永続化する
   */
  private async persistResolvedEntry(entry: GenesysListEntry): Promise<void> {
    this.cache = this.cache ?? {
      lists: {},
      latestListParam: null,
      availableListParams: [],
      discoveredAt: 0
    };
    this.cache.lists[entry.listParam] = entry;
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
