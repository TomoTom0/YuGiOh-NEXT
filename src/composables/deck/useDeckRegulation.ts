import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import type { DeckInfo } from '@/types/deck';
import type { LimitRegulation } from '@/types/card';
import type { ResolvedRegulation } from '@/types/regulation';
import { resolveDeckRegulation } from '@/utils/regulation-resolver';
import { parseRegulationTag, replaceTagYymm } from '@/utils/regulation-tag-parser';
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache';
import { genesysPointCache } from '@/utils/genesys-cache';
import { safeStorageGet, safeStorageSet } from '@/utils/extension-context-checker';
import { isRecordOfStringKeys } from '@/utils/type-guards';
import { CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED } from '@/constants/storage-keys';

/**
 * デッキ名タグによるリミットレギュレーション判定を管理する Composable（Facade Pattern）
 *
 * デッキ名の [OCG-YYMM] / [GENESYS-YYMM] タグから適用すべきリミットレギュレーションを
 * 解決し、カード表示（OCG過去版の禁止制限 / GENESYS pt）と fallback UI（注意バナー・
 * 修正提案ダイアログ・ignore永続化）に必要な状態・ゲッター・アクションを集約する。
 *
 * ネットワークアクセス（ensureList）は resolveAndEnsure 内でのみ行う。ゲッター群は全て
 * キャッシュへの O(1) 参照のみで純粋。
 *
 * @param options 依存するStateと関数（deckStore が所有する ref/getter/setter を注入）
 */
export function useDeckRegulation(options: {
  deckInfo: Ref<DeckInfo>;
  getDeckName: () => string;
  setDeckName: (name: string) => void;
}) {
  const { deckInfo, getDeckName, setDeckName } = options;

  /** タグ無し時の初期状態（OCG最新 = 現状通り） */
  const NONE_RESOLVED: ResolvedRegulation = {
    mode: 'none',
    tag: null,
    effectiveDate: null,
    listParam: null,
    fallback: undefined
  };

  /** 解決結果。デッキ読込 or デッキ名変更で更新される */
  const resolvedRegulation = ref<ResolvedRegulation>({ ...NONE_RESOLVED });

  /** fallback 時の修正提案ダイアログ表示フラグ */
  const showRegulationFixDialog = ref(false);

  /** 修正提案を ignore したデッキ番号の集合（chrome.storage.local で永続化） */
  const ignoredDeckDnos = ref<Set<number>>(new Set());

  /** 表示モード。OCG最新(mode='ocg'+null) と タグ無し(mode='none') は共に 'none'（UI差分なし） */
  const displayMode: ComputedRef<'ocg-past' | 'genesys' | 'none'> = computed(() => {
    const r = resolvedRegulation.value;
    if (r.mode === 'ocg' && r.effectiveDate) return 'ocg-past';
    if (r.mode === 'genesys') return 'genesys';
    return 'none';
  });

  /** 「適用中」バナー用の説明文。fallback 時は適用した直近版の YYMM を使用 */
  const effectiveDescription: ComputedRef<string | null> = computed(() => {
    const r = resolvedRegulation.value;
    if (r.mode === 'none') return null;
    const yymm = r.fallback?.appliedYymm ?? r.tag?.yymm ?? null;
    const label = r.mode === 'ocg' ? 'OCG' : 'GENESYS';
    if (yymm) return `${label} 20${yymm.slice(0, 2)}年${yymm.slice(2, 4)}月版`;
    return `${label} 最新版`;
  });

  /**
   * カードの禁止制限状態（OCG過去版上書き用）
   * @returns null=上書き無し（最新版キャッシュをそのまま使用）/ undefined=その版で無制限 / 値=制限あり
   */
  function getCardLimitOverride(cid: string): LimitRegulation | undefined | null {
    const r = resolvedRegulation.value;
    if (r.mode !== 'ocg' || !r.effectiveDate) return null;
    return forbiddenLimitedCache.getRegulation(cid, r.effectiveDate);
  }

  /** カードのGENESYS pt（GENESYSモード時のみ）。それ以外は undefined */
  function getCardGenesysPoint(cid: string): number | undefined {
    const r = resolvedRegulation.value;
    if (r.mode !== 'genesys') return undefined;
    return genesysPointCache.getPoint(cid, r.listParam ?? undefined);
  }

  /** レギュレーション状態を初期化（前デッキの状態を引き継がない） */
  function resetRegulation(): void {
    resolvedRegulation.value = { ...NONE_RESOLVED };
    showRegulationFixDialog.value = false;
  }

  /**
   * 現在のデッキ名からレギュレーションを解決し、必要なリストを取得する
   *
   * @param opts.dno デッキ番号（ignore判定用）
   * @param opts.silent true=バナー更新のみ / false=loadDeck時（fallback時ダイアログ候補）
   */
  async function resolveAndEnsure(opts: { dno: number; silent: boolean }): Promise<void> {
    resetRegulation();

    // キャッシュ初期化（冪等）。未初期化だと available が空になり fallback 判定が付かない
    await forbiddenLimitedCache.init();
    await genesysPointCache.init();

    const available = {
      ocgDates: forbiddenLimitedCache.getAvailableDates(),
      genesysListParams: genesysPointCache.getAvailableListParams()
    };
    const resolved = resolveDeckRegulation(getDeckName(), available);
    resolvedRegulation.value = resolved;

    // 適用版のリストを遅延取得（カード表示に必要）
    if (resolved.mode === 'ocg' && resolved.effectiveDate) {
      await forbiddenLimitedCache.ensureList(resolved.effectiveDate);
    } else if (resolved.mode === 'genesys' && resolved.listParam) {
      await genesysPointCache.ensureList(resolved.listParam);
    }

    // fallback 時の修正提案ダイアログ（ignore 済みでなければ）
    if (!opts.silent && resolved.fallback && !ignoredDeckDnos.value.has(opts.dno)) {
      showRegulationFixDialog.value = true;
    }
  }

  /** 修正提案の承認: タグの YYMM を適用した直近版の YYMM に書き換え */
  function confirmRegulationFix(): void {
    const r = resolvedRegulation.value;
    showRegulationFixDialog.value = false;
    if (!r.tag || !r.fallback) return;
    const newName = replaceTagYymm(getDeckName(), r.tag, r.fallback.appliedYymm);
    setDeckName(newName);
    // setDeckName → deckInfo.name 変更 → 下記 watch(currentTagRaw) が silent 再解決を発火
  }

  /** 修正提案の無視: 当該デッキを ignore 登録して永続化 */
  async function ignoreRegulationFix(): Promise<void> {
    showRegulationFixDialog.value = false;
    const dno = deckInfo.value.dno;
    if (!dno) return;
    ignoredDeckDnos.value.add(dno);
    await saveIgnoredToStorage();
  }

  /** デッキ削除時に ignore 登録を取り除く（永続ゴミ回避） */
  async function removeIgnored(dno: number): Promise<void> {
    if (!ignoredDeckDnos.value.has(dno)) return;
    ignoredDeckDnos.value.delete(dno);
    await saveIgnoredToStorage();
  }

  /** ignore 集合を chrome.storage.local へ保存 */
  async function saveIgnoredToStorage(): Promise<void> {
    const obj: Record<string, true> = {};
    ignoredDeckDnos.value.forEach(d => {
      obj[String(d)] = true;
    });
    await safeStorageSet({ [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: obj });
  }

  /** ignore 集合を chrome.storage.local から読込（起動時） */
  async function loadIgnored(): Promise<void> {
    const stored = await safeStorageGet<unknown>(CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED);
    const raw = stored[CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED];
    if (isRecordOfStringKeys(raw)) {
      ignoredDeckDnos.value = new Set(
        Object.keys(raw)
          .map(Number)
          .filter(Number.isFinite)
      );
    }
  }

  /**
   * デッキ名変更時の再解決。タグの生文字列(parseRegulationTag().raw)が変わった時のみ
   * 発火し、入力のたびに HTTP が走らない。名前編集は silent（ダイアログを出さない）。
   */
  const currentTagRaw = computed(() => parseRegulationTag(getDeckName())?.raw ?? null);
  watch(currentTagRaw, async (newRaw, oldRaw) => {
    if (newRaw === oldRaw) return;
    const dno = deckInfo.value.dno;
    if (!dno) return;
    await resolveAndEnsure({ dno, silent: true });
  });

  return {
    resolvedRegulation,
    showRegulationFixDialog,
    displayMode,
    effectiveDescription,
    resolveAndEnsure,
    resetRegulation,
    confirmRegulationFix,
    ignoreRegulationFix,
    removeIgnored,
    loadIgnored,
    getCardLimitOverride,
    getCardGenesysPoint
  };
}
