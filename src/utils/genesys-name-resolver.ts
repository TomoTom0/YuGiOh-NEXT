/**
 * GENESYSポイント: カード名(+種類) -> カードID(cid) 解決
 *
 * howtoページはカード名ベースでcidを持たないため、
 * ygo-next のカードデータベース（UnifiedCacheDB）を使って
 * 日本語カード名 -> cid の逆引きマップを構築する。
 * 同名カード（例: カオス・ソルジャーの通常/儀式）は、
 * howtoのtr要素のclass（カード種類）で絞り込む。
 *
 * 遊戯王では同名カードは実質1つ。同名でも種類（通常/儀式等）が
 * 違えば区別でき、howtoのclassで判定可能。
 */

import { getUnifiedCacheDB } from './unified-cache-db';
import type { RawGenesysEntry } from '../api/genesys';

/** カード種類の判定に使う情報 */
interface CardKind {
  cardType: 'monster' | 'spell' | 'trap';
  /** MonsterType相當（fusion/synchro/xyz/ritual/normal/effect/link/pendulum等） */
  types: string[];
}

/** extra deck系のモンスタータイプ（effectの絞り込みで使用） */
const EXTRA_DECK_TYPES = ['fusion', 'synchro', 'xyz', 'ritual', 'link', 'pendulum'];

/**
 * howtoのclass値が、カード種類情報と一致するか判定する
 *
 * howtoのclass -> ygo-next の cardType/types:
 *   magic  -> spell
 *   trap   -> trap
 *   effect -> monster のうち extra deck種でないもの
 *   fusion/synchro/xyz/ritual -> monster かつ typesにその種類を含む
 *
 * @param kind カード種類情報
 * @param cardKindClass howtoのtr要素のclass属性値
 * @returns 一致する場合はtrue
 */
function matchesKindClass(kind: CardKind, cardKindClass: string): boolean {
  const normalized = cardKindClass.trim();

  if (normalized === 'magic') {
    return kind.cardType === 'spell';
  }
  if (normalized === 'trap') {
    return kind.cardType === 'trap';
  }
  if (kind.cardType !== 'monster') {
    return false;
  }
  if (normalized === 'effect') {
    return !kind.types.some(t => EXTRA_DECK_TYPES.includes(t));
  }
  // fusion / synchro / xyz / ritual
  return kind.types.includes(normalized);
}

/**
 * カード名(+種類) -> cid の逆引きリゾルバ
 */
export class GenesysNameResolver {
  private nameToCids: Map<string, string[]> | null = null;
  private cidToKind: Map<string, CardKind> | null = null;
  private built = false;

  /**
   * 名前->cid[] および cid->種類 のマップを構築する（遅延・キャッシュ）
   *
   * UnifiedCacheDB の全カードを走査し、日本語名（langsName['ja']）をキーにする。
   */
  build(): void {
    if (this.built) return;

    const db = getUnifiedCacheDB();
    const nameToCids = new Map<string, string[]>();
    const cidToKind = new Map<string, CardKind>();

    for (const cid of db.getAllCardIds()) {
      const { tableA, tableB } = db.getCardBasicInfo(cid);
      const name = tableA?.langsName?.['ja'];
      if (!name || !tableB) {
        continue;
      }

      const existing = nameToCids.get(name);
      if (existing) {
        existing.push(cid);
      } else {
        nameToCids.set(name, [cid]);
      }

      cidToKind.set(cid, {
        cardType: tableB.cardType,
        types: tableB.types ?? [],
      });
    }

    this.nameToCids = nameToCids;
    this.cidToKind = cidToKind;
    this.built = true;
  }

  /**
   * カード名(+種類)からcidを解決する
   *
   * @param name カード名（日本語）
   * @param cardKindClass howtoのtr class（effect/magic/trap/fusion/synchro/xyz/ritual）
   * @returns 解決したcid。解決できなければnull
   */
  resolveCid(name: string, cardKindClass: string): string | null {
    this.build();
    const cids = this.nameToCids?.get(name);
    if (!cids || cids.length === 0) {
      return null;
    }
    if (cids.length === 1) {
      return cids[0];
    }

    // 同名カードが複数候補: cardKindClassで絞り込む
    for (const cid of cids) {
      const kind = this.cidToKind?.get(cid);
      if (kind && matchesKindClass(kind, cardKindClass)) {
        return cid;
      }
    }
    // 種類で絞れなければ先頭（同名カードは稀）
    return cids[0];
  }

  /**
   * 生エントリ配列を cid->ポイント のマップに解決する
   *
   * @param entries パース済みの生エントリ（カード名+ポイント+種類）
   * @returns points: 解決したcid->ポイント、unresolved: 解決できなかったカード名
   */
  resolveEntries(entries: RawGenesysEntry[]): {
    points: Record<string, number>;
    unresolved: string[];
  } {
    const points: Record<string, number> = {};
    const unresolved: string[] = [];

    for (const entry of entries) {
      const cid = this.resolveCid(entry.name, entry.cardKindClass);
      if (cid) {
        points[cid] = entry.point;
      } else {
        unresolved.push(entry.name);
      }
    }

    return { points, unresolved };
  }

  /**
   * 構築済みマップをクリア（テスト・再構築用）
   */
  reset(): void {
    this.nameToCids = null;
    this.cidToKind = null;
    this.built = false;
  }
}

/** グローバルインスタンス */
export const genesysNameResolver = new GenesysNameResolver();

/**
 * 生エントリ配列を cid->ポイント に解決する（グローバルインスタンス使用）
 *
 * @param entries パース済みの生エントリ
 * @returns points: 解決したcid->ポイント、unresolved: 解決できなかったカード名
 */
export function resolveGenesysEntries(entries: RawGenesysEntry[]): {
  points: Record<string, number>;
  unresolved: string[];
} {
  return genesysNameResolver.resolveEntries(entries);
}
