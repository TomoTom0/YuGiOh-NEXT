import type { ResolvedRegulation, RegulationFallback } from '@/types/regulation';
import { parseRegulationTag } from './regulation-tag-parser';

/**
 * デッキ名タグから適用すべきリミットレギュレーションを解決する（純粋関数）。
 *
 * ネットワークアクセスは行わない。実在する版の一覧は呼び出し側が
 * forbiddenLimitedCache / genesysPointCache から取得して引数で渡す。
 *
 * フォールバック（YYMM該当版なし→直近版）の判定もここで行い、結果に
 * fallback 情報を含める。注意表示・修正提案のUIは後続層が fallback を消費する。
 */

/** 実在する版の一覧（キャッシュ/インデックスから呼び出し側が用意） */
export interface AvailableRegulations {
  /** OCGの実在適用日一覧（YYYY-MM-DD）。空配列=未取得 */
  ocgDates: string[];
  /** GENESYSの実在listParam一覧（YYYYMM）。空配列=未取得 */
  genesysListParams: string[];
}

/** YYMM（例: "2501"）→ OCG effectiveDate（YYYY-MM-01） */
function yymmToOcgDate(yymm: string): string {
  return `20${yymm.slice(0, 2)}-${yymm.slice(2, 4)}-01`;
}

/** YYMM（例: "2608"）→ GENESYS listParam（YYYYMM） */
function yymmToGenesysListParam(yymm: string): string {
  return `20${yymm}`;
}

/** OCG effectiveDate（YYYY-MM-DD）→ YYMM */
function ocgDateToYymm(date: string): string {
  return date.slice(2, 4) + date.slice(5, 7);
}

/** GENESYS listParam（YYYYMM）→ YYMM */
function genesysListParamToYymm(listParam: string): string {
  return listParam.slice(2);
}

interface ClosestResult {
  identifier: string;
  exact: boolean;
}

/**
 * target（日付文字列、辞書順 == 日付順）以下の直近を実在一覧から探す。
 * - 実在する → exact
 * - 指定月以前の直近 → それ（fallback）
 * - 指定月が最古より前 → 最古版（fallback）
 * - 一覧が空 → null（呼び出し側は最新版扱い）
 */
function resolveClosest(available: string[], target: string): ClosestResult | null {
  if (available.length === 0) return null;
  const sorted = [...available].sort();
  if (sorted.includes(target)) return { identifier: target, exact: true };
  const before = sorted.filter(d => d < target);
  if (before.length > 0) {
    const closest = before[before.length - 1];
    if (closest !== undefined) {
      return { identifier: closest, exact: false };
    }
  }
  // target が最古より前 → 最古版
  const oldest = sorted[0];
  return { identifier: oldest ?? target, exact: false };
}

/**
 * デッキ名から適用すべきリミットレギュレーションを解決する。
 *
 * @param deckName デッキ名
 * @param available 実在する版の一覧
 */
export function resolveDeckRegulation(
  deckName: string,
  available: AvailableRegulations
): ResolvedRegulation {
  const tag = parseRegulationTag(deckName);
  if (!tag) {
    return { mode: 'none', tag: null, effectiveDate: null, listParam: null, fallback: undefined };
  }

  if (tag.type === 'ocg') {
    // YYMM省略 = 最新版（effectiveDate = null）
    if (tag.yymm === null) {
      return { mode: 'ocg', tag, effectiveDate: null, listParam: null, fallback: undefined };
    }
    const target = yymmToOcgDate(tag.yymm);
    const result = resolveClosest(available.ocgDates, target);
    if (!result) {
      // 実在一覧が空（未取得等）。YYMMから計算した effectiveDate を返し、
      // resolveAndEnsure の ensureList に取得を試行させる。
      // effectiveDate: null だと ensureList が呼ばれず日付指定が無視される。
      return { mode: 'ocg', tag, effectiveDate: target, listParam: null, fallback: undefined };
    }
    if (result.exact) {
      return { mode: 'ocg', tag, effectiveDate: result.identifier, listParam: null, fallback: undefined };
    }
    const fallback: RegulationFallback = {
      requestedYymm: tag.yymm,
      reason: 'not-exist',
      appliedIdentifier: result.identifier,
      appliedYymm: ocgDateToYymm(result.identifier)
    };
    return { mode: 'ocg', tag, effectiveDate: result.identifier, listParam: null, fallback };
  }

  // tag.type === 'genesys'
  if (tag.yymm === null) {
    return { mode: 'genesys', tag, effectiveDate: null, listParam: null, fallback: undefined };
  }
  const target = yymmToGenesysListParam(tag.yymm);
  const result = resolveClosest(available.genesysListParams, target);
  if (!result) {
    // 実在一覧が空（未取得等）。YYMMから計算した listParam を返し、
    // resolveAndEnsure の ensureList に取得を試行させる。
    return { mode: 'genesys', tag, effectiveDate: null, listParam: target, fallback: undefined };
  }
  if (result.exact) {
    return { mode: 'genesys', tag, effectiveDate: null, listParam: result.identifier, fallback: undefined };
  }
  const fallback: RegulationFallback = {
    requestedYymm: tag.yymm,
    reason: 'not-exist',
    appliedIdentifier: result.identifier,
    appliedYymm: genesysListParamToYymm(result.identifier)
  };
  return { mode: 'genesys', tag, effectiveDate: null, listParam: result.identifier, fallback };
}
