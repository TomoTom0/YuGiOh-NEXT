/**
 * デッキスナップショット管理
 *
 * deck-edit.ts のスナップショット関連ロジックを抽出した composable
 */

import type { DeckInfo } from '@/types/deck';

/**
 * スナップショット用のデッキデータ
 */
export interface DeckSnapshotData {
  dno: number;
  name: string;
  mainDeck: any[];
  extraDeck: any[];
  sideDeck: any[];
  category?: string[];
  tags?: string[];
  comment?: string;
  skippedCards?: any[];
}

/**
 * デッキ情報からスナップショットを作成
 *
 * @param deckInfo - デッキ情報
 * @returns スナップショット文字列
 */
export function captureDeckSnapshot(
  deckInfo: DeckInfo
): string {
  const data: DeckSnapshotData = {
    dno: deckInfo.dno,
    name: deckInfo.name,
    mainDeck: deckInfo.mainDeck,
    extraDeck: deckInfo.extraDeck,
    sideDeck: deckInfo.sideDeck,
    category: deckInfo.category,
    tags: deckInfo.tags,
    comment: deckInfo.comment,
    skippedCards: deckInfo.skippedCards
  };

  return JSON.stringify(data);
}

/**
 * 表示順序を除いたスナップショットを作成
 *
 * カードの並び順を無視して、デッキ構成のみを比較する際に使用
 *
 * @param deckInfo - デッキ情報
 * @returns 正規化されたスナップショット文字列
 */
export function captureDeckSnapshotWithoutOrder(deckInfo: DeckInfo): string {
  // 各セクションのカードを (cid, ciid, quantity) のタプルで表現
  const normalize = (deck: any[]) => {
    return deck
      .map(dc => ({
        cid: dc.cid,
        ciid: dc.ciid,
        quantity: dc.quantity
      }))
      .sort((a, b) => {
        // cid で昇順ソート
        if (a.cid !== b.cid) return a.cid.localeCompare(b.cid);
        // ciid で昇順ソート
        if (a.ciid !== b.ciid) return String(a.ciid).localeCompare(String(b.ciid));
        return 0;
      });
  };

  const data = {
    dno: deckInfo.dno,
    name: deckInfo.name,
    mainDeck: normalize(deckInfo.mainDeck),
    extraDeck: normalize(deckInfo.extraDeck),
    sideDeck: normalize(deckInfo.sideDeck),
    category: deckInfo.category,
    tags: deckInfo.tags,
    comment: deckInfo.comment,
    skippedCards: deckInfo.skippedCards
  };

  return JSON.stringify(data);
}

/**
 * 2つのスナップショットが並び順のみ異なるかチェック
 *
 * @param snapshot1 - スナップショット1
 * @param snapshot2 - スナップショット2
 * @returns 並び順のみ異なる場合はtrue
 */
export function hasOnlySortOrderChanges(
  snapshot1: string,
  snapshot2: string
): boolean {
  try {
    const data1 = JSON.parse(snapshot1) as DeckSnapshotData;
    const data2 = JSON.parse(snapshot2) as DeckSnapshotData;

    // deckInfoから DeckInfo型のオブジェクトを再構築
    const deckInfo1: DeckInfo = {
      dno: data1.dno,
      name: data1.name,
      deckCode: '',
      mainDeck: data1.mainDeck,
      extraDeck: data1.extraDeck,
      sideDeck: data1.sideDeck,
      category: data1.category ?? [],
      tags: data1.tags ?? [],
      comment: data1.comment ?? '',
      skippedCards: data1.skippedCards
    };

    const deckInfo2: DeckInfo = {
      dno: data2.dno,
      name: data2.name,
      deckCode: '',
      mainDeck: data2.mainDeck,
      extraDeck: data2.extraDeck,
      sideDeck: data2.sideDeck,
      category: data2.category ?? [],
      tags: data2.tags ?? [],
      comment: data2.comment ?? '',
      skippedCards: data2.skippedCards
    };

    // 正規化されたスナップショットを比較
    const normalized1 = captureDeckSnapshotWithoutOrder(deckInfo1);
    const normalized2 = captureDeckSnapshotWithoutOrder(deckInfo2);

    return normalized1 === normalized2;
  } catch (error) {
    console.error('Failed to compare snapshots:', error);
    return false;
  }
}

/**
 * スナップショット同士を比較
 *
 * @param snapshot1 - スナップショット1
 * @param snapshot2 - スナップショット2
 * @returns 同じ場合はtrue
 */
export function compareSnapshots(
  snapshot1: string,
  snapshot2: string
): boolean {
  return snapshot1 === snapshot2;
}
