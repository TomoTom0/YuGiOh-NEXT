/**
 * リミットレギュレーション（OCG過去版 / GENESYS）に基づく、カード1枚あたりの
 * 判定ロジック（純粋関数）。
 *
 * デッキ編集画面（Vue、useDeckRegulation.ts + DeckCard.vue）とデッキ閲覧画面
 * （content script、regulation-ui.ts、ネイティブDOMへHTML注入）は描画方法が
 * 異なるため統合できないが、「resolvedRegulation + カード情報から何のバッジを
 * 出すか決める」判定ロジック自体は同一であるべきで、ここに一元化する
 * （TASK-450: 同じ判定漏れを編集画面/閲覧画面で別々に直す事態が発生したため切り出し）。
 */

import { forbiddenLimitedCache } from './forbidden-limited-cache';
import { genesysPointCache } from './genesys-cache';
import type { ResolvedRegulation } from '@/types/regulation';
import type { LimitRegulation } from '@/types/card';

/** GENESYS禁止判定に必要な最小限のカード情報形状 */
export interface GenesysForbiddenCheckable {
  cardType?: string;
  types?: readonly string[];
}

/**
 * GENESYSモードでのカード禁止判定: link/pendulumモンスターはGENESYSでは
 * 常に使用不可（ポイント制の対象外）。
 */
export function isGenesysForbiddenCard(card: GenesysForbiddenCheckable | null | undefined): boolean {
  if (!card) return false;
  if (card.cardType === 'monster' && card.types) {
    return card.types.includes('link') || card.types.includes('pendulum');
  }
  return false;
}

/** GENESYS pt値に応じた色ティア（1-4pt: low, 5-9pt: mid, 10pt以上: high） */
export function genesysPtTier(pt: number): 'low' | 'mid' | 'high' {
  if (pt <= 4) return 'low';
  if (pt <= 9) return 'mid';
  return 'high';
}

/**
 * カードのOCG禁止制限状態（OCG過去版上書き用）。
 * @returns null=上書き無し（呼び出し側が持つ既存の最新版基準の値をそのまま使う） /
 *          undefined=その版で無制限（バッジ非表示） / 値=制限あり
 *
 * mode='genesys'は常にundefined（バッジ非表示）を返す: GENESYS表示中はOCG基準の
 * 禁止/制限/準制限バッジを一切出さない（TASK-450: 編集画面でnullを返しGENESYS
 * モード中もOCG最新版バッジが漏れて表示され続けていた不具合の修正）。
 * mode='none'、またはmode='ocg'でeffectiveDateがfalsyの場合はnull（上書き無し）。
 */
export function getOcgLimitOverride(cid: string, resolved: ResolvedRegulation): LimitRegulation | undefined | null {
  if (resolved.mode === 'genesys') return undefined;
  if (resolved.mode !== 'ocg' || !resolved.effectiveDate) return null;
  // APIが過去日付に対応していない等でリストが取得できていない場合、undefinedを返すと
  // 全カードの制限バッジが消えるため、null（上書きなし）を返して既存のバッジを維持する。
  if (!forbiddenLimitedCache.hasList(resolved.effectiveDate)) return null;
  return forbiddenLimitedCache.getRegulation(cid, resolved.effectiveDate);
}

/** カードのGENESYS pt（GENESYSモード時のみ）。それ以外は undefined */
export function getGenesysPoint(cid: string, resolved: ResolvedRegulation): number | undefined {
  if (resolved.mode !== 'genesys') return undefined;
  return genesysPointCache.getPoint(cid, resolved.listParam ?? undefined);
}
