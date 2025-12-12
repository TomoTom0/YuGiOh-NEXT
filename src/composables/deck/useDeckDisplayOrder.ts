/**
 * デッキ表示順序操作のロジック
 *
 * deck-edit.ts の displayOrder 関連ロジックを抽出した composable
 *
 * 注意: この composable は純粋なロジックのみを提供します。
 * Undo/Redo、アニメーション、状態管理は呼び出し側で行う必要があります。
 */

import type { CardInfo } from '@/types/card';
import type { DeckCardRef } from '@/types/deck';
import { getTempCardDB } from '@/utils/temp-card-db';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';

/**
 * 表示用カード参照
 * deck-edit.ts の DisplayCard 型に対応
 */
export interface DisplayCardRef {
  cid: string;
  ciid: number;
  uuid: string;  // ユニークな識別子（アニメーション追跡用）
}

/**
 * セクション種別
 */
export type SectionType = 'main' | 'extra' | 'side' | 'trash';

/**
 * デッキ表示順序の状態
 */
export interface DisplayOrderState {
  main: DisplayCardRef[];
  extra: DisplayCardRef[];
  side: DisplayCardRef[];
  trash: DisplayCardRef[];
}

/**
 * デッキカード配列の状態
 */
export interface DeckState {
  mainDeck: DeckCardRef[];
  extraDeck: DeckCardRef[];
  sideDeck: DeckCardRef[];
  trashDeck: DeckCardRef[];
}

/**
 * UUID生成関数の型
 */
export type UUIDGenerator = (cid: string, ciid: number) => string;

/**
 * カード追加の結果
 */
export interface AddCardResult {
  /** 追加されたカードのインデックス */
  insertedIndex: number;
  /** 追加されたカードのUUID */
  uuid: string;
}

/**
 * カード削除の結果
 */
export interface RemoveCardResult {
  /** 削除されたカード情報 */
  removedCard?: CardInfo;
  /** 削除されたカードのciid */
  removedCiid?: number;
  /** 削除されたカードのインデックス */
  removedIndex: number;
}

/**
 * カード移動の結果
 */
export interface MoveCardResult {
  /** 移動されたカードのUUID */
  uuid: string;
  /** 移動元のインデックス */
  fromIndex: number;
  /** 移動先のインデックス */
  toIndex: number;
}

/**
 * displayOrderにカードを追加する
 *
 * @param displayOrder - 表示順序の状態
 * @param deckState - デッキカード配列の状態
 * @param card - 追加するカード情報
 * @param section - 追加先のセクション
 * @param generateUUID - UUID生成関数
 * @returns 追加結果
 */
export function addToDisplayOrder(
  displayOrder: DisplayOrderState,
  deckState: DeckState,
  card: CardInfo,
  section: SectionType,
  generateUUID: UUIDGenerator
): AddCardResult {
  const targetDeck = getDeckBySection(deckState, section);
  const sectionOrder = displayOrder[section];

  // deckState更新: (cid, ciid)ペアで既存カードを検索
  const ciidStr = String(card.ciid ?? 0);
  const existingCard = targetDeck.find(dc =>
    dc.cid === card.cardId && dc.ciid === ciidStr
  );
  if (existingCard) {
    existingCard.quantity++;
  } else {
    // TempCardDBにカード情報を登録
    const tempCardDB = getTempCardDB();
    tempCardDB.set(card.cardId, card);
    // record move history
    try {
      const unifiedDB = getUnifiedCacheDB();
      unifiedDB.recordMove({ action: 'add_to_display', cardId: card.cardId, to: section });
    } catch (e) {
      // ignore
    }
    targetDeck.push({ cid: card.cardId, ciid: ciidStr, lang: card.lang, quantity: 1 });
  }

  // displayOrder更新
  const targetCiid = parseInt(String(card.ciid ?? 0), 10);

  // 同じ(cid, ciid)ペアが既に存在するか確認
  const existingCardIndex = sectionOrder.findIndex(dc =>
    dc.cid === card.cardId && dc.ciid === targetCiid
  );

  let insertedIndex: number;
  const uuid = generateUUID(card.cardId, targetCiid);

  if (existingCardIndex !== -1) {
    // 既存の同じ(cid, ciid)ペアの最後の位置を探す
    let lastSameCardIndex = existingCardIndex;
    for (let i = existingCardIndex + 1; i < sectionOrder.length; i++) {
      const orderCard = sectionOrder[i];
      if (orderCard && orderCard.cid === card.cardId && orderCard.ciid === targetCiid) {
        lastSameCardIndex = i;
      }
    }

    // 最後の同じ(cid, ciid)ペアの直後に挿入
    insertedIndex = lastSameCardIndex + 1;
    sectionOrder.splice(insertedIndex, 0, {
      cid: card.cardId,
      ciid: targetCiid,
      uuid
    });
  } else {
    // 新しい(cid, ciid)ペアなので、同じcidの最後に追加
    const sameCidCards = sectionOrder.filter(dc => dc.cid === card.cardId);

    if (sameCidCards.length > 0) {
      // 同じcidのカードがある場合、その最後の位置の後に挿入
      const lastSameCidIndex = sectionOrder.map((dc, idx) => ({ dc, idx }))
        .filter(item => item.dc.cid === card.cardId)
        .pop()!.idx;

      insertedIndex = lastSameCidIndex + 1;
      sectionOrder.splice(insertedIndex, 0, {
        cid: card.cardId,
        ciid: targetCiid,
        uuid
      });
    } else {
      // 完全に新しいカードなので末尾に追加
      insertedIndex = sectionOrder.length;
      sectionOrder.push({
        cid: card.cardId,
        ciid: targetCiid,
        uuid
      });
    }
  }

  return { insertedIndex, uuid };
}

/**
 * displayOrderからカードを削除する
 *
 * @param displayOrder - 表示順序の状態
 * @param deckState - デッキカード配列の状態
 * @param cardId - 削除するカードID
 * @param section - 削除元のセクション
 * @param uuid - 削除するカードのUUID（省略時は最後の1枚）
 * @param ciid - 削除するカードのciid（省略時は最初に見つかったもの）
 * @returns 削除結果
 */
export function removeFromDisplayOrder(
  displayOrder: DisplayOrderState,
  deckState: DeckState,
  cardId: string,
  section: SectionType,
  uuid?: string,
  ciid?: string
): RemoveCardResult {
  const targetDeck = getDeckBySection(deckState, section);
  const sectionOrder = displayOrder[section];

  // deckState更新（ciidが指定されている場合はciidも条件に含める）
  const index = targetDeck.findIndex(dc => {
    if (ciid !== undefined) {
      return dc.cid === cardId && dc.ciid === ciid;
    }
    return dc.cid === cardId;
  });
  if (index !== -1) {
    const deckCard = targetDeck[index];
    if (deckCard && deckCard.quantity > 1) {
      deckCard.quantity--;
    } else {
      targetDeck.splice(index, 1);
    }
  }

  // displayOrder更新（UUIDで特定、なければ最後の1枚を削除）
  let removeIndex = -1;

  if (uuid) {
    removeIndex = sectionOrder.findIndex(dc => dc.uuid === uuid);
  } else {
    removeIndex = sectionOrder.map(dc => dc.cid).lastIndexOf(cardId);
  }

  let removedCiid: number | undefined;
  if (removeIndex !== -1) {
    const removedCard = sectionOrder[removeIndex];
    if (removedCard) {
      removedCiid = removedCard.ciid;
    }
    sectionOrder.splice(removeIndex, 1);
  }

  // 削除されたカード情報を返す
  const tempCardDB = getTempCardDB();
  const removedCard = tempCardDB.get(cardId);
  return { removedCard, removedCiid, removedIndex: removeIndex };
}

/**
 * displayOrder内でカードを移動する
 *
 * @param displayOrder - 表示順序の状態
 * @param deckState - デッキカード配列の状態
 * @param cardId - 移動するカードID
 * @param from - 移動元のセクション
 * @param to - 移動先のセクション
 * @param uuid - 移動するカードのUUID（省略時は最後の1枚）
 * @param targetIndex - 移動先のインデックス（省略時は末尾）
 * @returns 移動結果（失敗時はundefined）
 */
export function moveInDisplayOrder(
  displayOrder: DisplayOrderState,
  deckState: DeckState,
  cardId: string,
  from: SectionType,
  to: SectionType,
  uuid?: string,
  targetIndex?: number
): MoveCardResult | undefined {
  const fromDeck = getDeckBySection(deckState, from);
  const toDeck = getDeckBySection(deckState, to);

  // displayOrderから移動するカードを取得
  const fromOrder = displayOrder[from];
  let moveCardIndex: number;

  if (uuid) {
    // UUIDが指定されている場合は、そのUUIDのカードを移動
    moveCardIndex = fromOrder.findIndex(dc => dc.uuid === uuid);
  } else {
    // UUIDが未指定の場合は最後の1枚を移動
    moveCardIndex = fromOrder.map(dc => dc.cid).lastIndexOf(cardId);
  }

  if (moveCardIndex === -1) {
    return;
  }

  const movingDisplayCard = fromOrder[moveCardIndex];
  if (!movingDisplayCard) {
    return;
  }

  // (cid, ciid)ペアでdeckCardを取得
  const fromIndex = fromDeck.findIndex(dc =>
    dc.cid === cardId && dc.ciid === String(movingDisplayCard.ciid)
  );
  if (fromIndex === -1) return;

  const deckCard = fromDeck[fromIndex];
  if (!deckCard) return;

  // fromのdisplayOrderから削除
  fromOrder.splice(moveCardIndex, 1);

  // toのdisplayOrderに追加
  const toOrder = displayOrder[to];
  let toIndex: number;
  if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= toOrder.length) {
    // 指定された位置に挿入
    toIndex = targetIndex;
    toOrder.splice(targetIndex, 0, movingDisplayCard);
  } else {
    // 末尾に追加
    toIndex = toOrder.length;
    toOrder.push(movingDisplayCard);
  }

  // deckState更新
  // fromから削除
  const fromDeckCard = fromDeck[fromIndex];
  if (fromDeckCard && fromDeckCard.quantity > 1) {
    fromDeckCard.quantity--;
  } else {
    fromDeck.splice(fromIndex, 1);
  }

  // toに追加（ciidも考慮）
  const existingCard = toDeck.find(dc =>
    dc.cid === cardId && dc.ciid === String(movingDisplayCard.ciid)
  );
  if (existingCard) {
    existingCard.quantity++;
  } else {
    toDeck.push({ cid: cardId, ciid: String(movingDisplayCard.ciid), lang: deckCard.lang, quantity: 1 });
  }

  // 移動結果を返す
  return {
    uuid: movingDisplayCard.uuid,
    fromIndex: moveCardIndex,
    toIndex
  };
}

/**
 * セクション内でカードを並び替える（インデックスベース）
 * deck-edit.ts の reorderWithinSectionInternal から呼ばれる内部用関数
 *
 * @param displayOrder - 表示順序の状態
 * @param section - 並び替えるセクション
 * @param fromIndex - 移動元のインデックス
 * @param toIndex - 移動先のインデックス
 * @returns 並び替え後のdisplayCard（失敗時はundefined）
 */
export function reorderWithinSection(
  displayOrder: DisplayOrderState,
  section: SectionType,
  fromIndex: number,
  toIndex: number
): DisplayCardRef | undefined {
  const sectionOrder = displayOrder[section];

  if (!sectionOrder || !Array.isArray(sectionOrder)) {
    console.warn(`[reorderWithinSection] Invalid section order for ${section}`);
    return;
  }

  if (fromIndex < 0 || fromIndex >= sectionOrder.length ||
      toIndex < 0 || toIndex > sectionOrder.length) {
    console.warn(`[reorderWithinSection] Invalid indices: fromIndex=${fromIndex}, toIndex=${toIndex}, length=${sectionOrder.length}`);
    return;
  }

  const movingCard = sectionOrder[fromIndex];
  if (!movingCard) {
    console.warn(`[reorderWithinSection] No card at fromIndex=${fromIndex}`);
    return;
  }

  // fromIndexから削除
  sectionOrder.splice(fromIndex, 1);

  // toIndexに挿入（fromIndexの削除により調整が必要）
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  sectionOrder.splice(adjustedToIndex, 0, movingCard);

  return movingCard;
}

/**
 * セクション内でカードを並び替える（UUIDベース）
 * deck-edit.ts の reorderCard から呼ばれる外部用関数
 *
 * @param displayOrder - 表示順序の状態
 * @param section - 並び替えるセクション
 * @param sourceUuid - 移動するカードのUUID
 * @param targetUuid - 移動先となるカードのUUID（末尾に追加する場合はnull）
 * @returns 並び替え後のdisplayCard（失敗時はundefined）
 */
export function reorderWithinSectionByUUID(
  displayOrder: DisplayOrderState,
  section: SectionType,
  sourceUuid: string,
  targetUuid: string | null
): DisplayCardRef | undefined {
  const sectionOrder = displayOrder[section];

  if (!sectionOrder || !Array.isArray(sectionOrder)) {
    console.warn(`[reorderWithinSectionByUUID] Invalid section order for ${section}`);
    return;
  }

  // UUIDからインデックスを取得
  const fromIndex = sectionOrder.findIndex(card => card?.uuid === sourceUuid);
  if (fromIndex < 0) {
    console.warn(`[reorderWithinSectionByUUID] Source card not found: ${sourceUuid}`);
    return;
  }

  // 移動先のインデックスを取得（nullの場合は末尾）
  let toIndex: number;
  if (targetUuid === null) {
    toIndex = sectionOrder.length - 1;
  } else {
    toIndex = sectionOrder.findIndex(card => card?.uuid === targetUuid);
    if (toIndex < 0) {
      console.warn(`[reorderWithinSectionByUUID] Target card not found: ${targetUuid}`);
      return;
    }
  }

  // インデックスベースの処理に委譲
  return reorderWithinSection(displayOrder, section, fromIndex, toIndex);
}

/**
 * Fisher-Yatesシャッフルアルゴリズム
 *
 * @param array - シャッフルする配列
 * @returns シャッフル後の新しい配列
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * セクション種別から対応するデッキ配列を取得
 *
 * @param deckState - デッキカード配列の状態
 * @param section - セクション種別
 * @returns 対応するデッキ配列
 */
function getDeckBySection(deckState: DeckState, section: SectionType): DeckCardRef[] {
  switch (section) {
    case 'main':
      return deckState.mainDeck;
    case 'extra':
      return deckState.extraDeck;
    case 'side':
      return deckState.sideDeck;
    case 'trash':
      return deckState.trashDeck;
  }
}
