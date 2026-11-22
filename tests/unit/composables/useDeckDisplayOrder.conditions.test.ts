import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addToDisplayOrder,
  removeFromDisplayOrder,
  moveInDisplayOrder,
  reorderWithinSection,
  reorderWithinSectionByUUID,
  fisherYatesShuffle,
  validateReorderParameters,
  type DeckState,
  type DisplayOrderState,
  type UUIDGenerator
} from '@/composables/deck/useDeckDisplayOrder';
import type { CardInfo } from '@/types/card';

const { mockCards, recordMove } = vi.hoisted(() => ({
  mockCards: new Map<string, CardInfo>(),
  recordMove: vi.fn()
}));

vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockCards.get(cid),
    set: (cid: string, card: CardInfo) => {
      mockCards.set(cid, card);
      return true;
    }
  })
}));

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({
    recordMove
  })
}));

describe('useDeckDisplayOrder conditions', () => {
  let displayOrder: DisplayOrderState;
  let deckState: DeckState;
  let uuidCounter: number;

  const uuid: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-${++uuidCounter}`;
  const card = (cardId = '100', ciid: string | number | undefined = '1', lang = 'ja') => ({
    cardId,
    ciid,
    name: `card-${cardId}`,
    lang
  }) as CardInfo;

  beforeEach(() => {
    mockCards.clear();
    recordMove.mockReset();
    uuidCounter = 0;
    displayOrder = { main: [], extra: [], side: [], trash: [] };
    deckState = { mainDeck: [], extraDeck: [], sideDeck: [], trashDeck: [] };
  });

  it('[covers:add.deck-new-pair-pushes-quantity-one] [covers:add.unified-cache-record-error-ignored] [covers:add.display-new-cid-appends-to-end] 新規カードはキャッシュ例外を無視して末尾へ追加する', () => {
    recordMove.mockImplementationOnce(() => {
      throw new Error('record failed');
    });

    const result = addToDisplayOrder(displayOrder, deckState, card('100', '1'), 'main', uuid);

    expect(result).toEqual({ insertedIndex: 0, uuid: '100-1-1' });
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
    expect(displayOrder.main).toEqual([{ cid: '100', ciid: 1, uuid: '100-1-1' }]);
    expect(mockCards.get('100')?.name).toBe('card-100');
  });

  it('[covers:add.deck-existing-pair-increments-quantity] [covers:add.display-existing-pair-insert-after-last-same-pair] 既存ペアはquantityを増やし同一ペアの最後へ挿入する', () => {
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '200', ciid: 1, uuid: 'b' },
      { cid: '100', ciid: 1, uuid: 'c' }
    ];

    const result = addToDisplayOrder(displayOrder, deckState, card('100', '1'), 'main', uuid);

    expect(result.insertedIndex).toBe(3);
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 2 }]);
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a', 'b', 'c', '100-1-1']);
  });

  it('[covers:add.display-same-cid-different-ciid-insert-after-last-same-cid] 同一cidの別ciidは同じcidの最後へ挿入する', () => {
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '200', ciid: 1, uuid: 'b' }
    ];

    const result = addToDisplayOrder(displayOrder, deckState, card('100', '2'), 'main', uuid);

    expect(result.insertedIndex).toBe(1);
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a', '100-2-1', 'b']);
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '2', lang: 'ja', quantity: 1 }]);
  });

  it('[covers:add.missing-ciid-defaults-to-zero] ciid未指定は0として扱う', () => {
    const cardWithoutCiid = {
      cardId: '100',
      name: 'card-100',
      lang: 'ja'
    } as CardInfo;

    const result = addToDisplayOrder(displayOrder, deckState, cardWithoutCiid, 'main', uuid);

    expect(result.uuid).toBe('100-0-1');
    expect(deckState.mainDeck[0]?.ciid).toBe('0');
    expect(displayOrder.main[0]?.ciid).toBe(0);
  });

  it('[covers:remove.deck-match-with-ciid] [covers:remove.deck-quantity-one-splices] ciid指定時は一致ペアだけを削除する', () => {
    deckState.mainDeck = [
      { cid: '100', ciid: '1', lang: 'ja', quantity: 1 },
      { cid: '100', ciid: '2', lang: 'ja', quantity: 1 }
    ];
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 2, uuid: 'b' }
    ];

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main', 'b', '2');

    expect(result).toMatchObject({ removedIndex: 1, removedCiid: 2 });
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
  });

  it('[covers:remove.deck-match-by-cid-only] [covers:remove.deck-quantity-decrements] [covers:remove.display-without-uuid-removes-last-cid] uuid/ciid省略時はcid一致の最後の表示だけを削除しdeckState先頭一致行を減算する', () => {
    deckState.mainDeck = [
      { cid: '100', ciid: '1', lang: 'ja', quantity: 2 },
      { cid: '100', ciid: '2', lang: 'ja', quantity: 1 }
    ];
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 2, uuid: 'b' }
    ];

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main');

    expect(result).toMatchObject({ removedIndex: 1, removedCiid: 2 });
    expect(deckState.mainDeck[0]?.quantity).toBe(1);
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
  });

  it('[covers:remove.display-uuid-removes-matching-uuid] uuid指定時は一致uuidの表示カードを削除する', () => {
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 2 }];
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 1, uuid: 'b' }
    ];

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main', 'a');

    expect(result).toMatchObject({ removedIndex: 0, removedCiid: 1 });
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['b']);
  });

  it('[covers:remove.deck-no-match-no-deck-change] [covers:remove.display-no-match-returns-minus-one] deckState/displayOrderの対象なしは変更せず-1を返す', () => {
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];

    const result = removeFromDisplayOrder(displayOrder, deckState, '999', 'main');

    expect(result).toEqual({ removedCard: undefined, removedCiid: undefined, removedIndex: -1 });
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
    expect(displayOrder.main).toEqual([{ cid: '100', ciid: 1, uuid: 'a' }]);
  });

  it('[covers:remove.removed-card-from-temp-cache] removedCardはTempCacheDBからcardIdで取得する', () => {
    addToDisplayOrder(displayOrder, deckState, card('100', '1'), 'main', uuid);

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main');

    expect(result.removedCard).toEqual(card('100', '1'));
  });

  it('[covers:move.invalid-from-order-returns-undefined] fromのdisplayOrderがない場合はundefinedを返す', () => {
    const result = moveInDisplayOrder(displayOrder as any, deckState, '100', 'missing', 'main');

    expect(result).toBeUndefined();
    expect(displayOrder.main).toEqual([]);
  });

  it('[covers:move.uuid-selects-matching-uuid] [covers:move.valid-target-index-inserts-at-target] [covers:move.from-deck-quantity-decrements] [covers:move.to-deck-existing-pair-increments] uuid指定時は一致カードを指定indexへ移動し両deckState数量を更新する', () => {
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 1, uuid: 'b' }
    ];
    displayOrder.side = [{ cid: '200', ciid: 1, uuid: 'side' }];
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 2 }];
    deckState.sideDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'a', 0);

    expect(result).toEqual({ uuid: 'a', fromIndex: 0, toIndex: 0 });
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['b']);
    expect(displayOrder.side.map(c => c.uuid)).toEqual(['a', 'side']);
    expect(deckState.mainDeck[0]?.quantity).toBe(1);
    expect(deckState.sideDeck[0]?.quantity).toBe(2);
  });

  it('[covers:move.without-uuid-selects-last-cid] [covers:move.invalid-or-missing-target-index-appends] [covers:move.from-deck-quantity-one-splices] [covers:move.to-deck-new-pair-pushes] uuid未指定時は最後のcid一致カードを末尾へ移動する', () => {
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 1, uuid: 'b' }
    ];
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side');

    expect(result).toEqual({ uuid: 'b', fromIndex: 1, toIndex: 0 });
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
    expect(displayOrder.side.map(c => c.uuid)).toEqual(['b']);
    expect(deckState.mainDeck).toEqual([]);
    expect(deckState.sideDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
  });

  it('[covers:move.no-display-match-returns-undefined] 表示側に移動対象がない場合は状態変更しない', () => {
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'missing');

    expect(result).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
    expect(displayOrder.side).toEqual([]);
  });

  it('[covers:move.deck-pair-missing-returns-undefined] deckStateに対応ペアがない場合は状態変更しない', () => {
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'a');

    expect(result).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
    expect(displayOrder.side).toEqual([]);
  });

  it('[covers:reorder.invalid-section-order-returns-undefined] [covers:reorder.invalid-indices-return-undefined] 不正section/orderまたは不正indexはundefinedを返す', () => {
    expect(reorderWithinSection({ ...displayOrder, main: undefined as any }, 'main', 0, 0)).toBeUndefined();
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];
    expect(reorderWithinSection(displayOrder, 'main', -1, 0)).toBeUndefined();
    expect(reorderWithinSection(displayOrder, 'main', 0, 2)).toBeUndefined();
  });

  it('[covers:reorder.missing-source-card-returns-undefined] fromIndexのカードがfalsyならundefinedを返す', () => {
    displayOrder.main = [undefined as any];

    expect(reorderWithinSection(displayOrder, 'main', 0, 0)).toBeUndefined();
  });

  it('[covers:reorder.forward-adjusts-to-index] [covers:reorder.backward-uses-to-index] indexベースで前後に並び替える', () => {
    displayOrder.main = [
      { cid: 'a', ciid: 1, uuid: 'a' },
      { cid: 'b', ciid: 1, uuid: 'b' },
      { cid: 'c', ciid: 1, uuid: 'c' }
    ];

    expect(reorderWithinSection(displayOrder, 'main', 0, 2)?.uuid).toBe('a');
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['b', 'a', 'c']);
    expect(reorderWithinSection(displayOrder, 'main', 2, 0)?.uuid).toBe('c');
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['c', 'b', 'a']);
  });

  it('[covers:reorder-uuid.validation-error-returns-undefined] validationエラー時はUUIDベース並び替えを行わない', () => {
    displayOrder.main = [{ cid: 'a', ciid: 1, uuid: 'a' }];

    expect(reorderWithinSectionByUUID(displayOrder, 'main', 'missing', null)).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
  });

  it('[covers:reorder-uuid.target-null-delegates-length-minus-one] [covers:reorder-uuid.target-uuid-moves-before-target] UUIDベースでtargetUuidから算出した位置へ並び替える', () => {
    displayOrder.main = [
      { cid: 'a', ciid: 1, uuid: 'a' },
      { cid: 'b', ciid: 1, uuid: 'b' },
      { cid: 'c', ciid: 1, uuid: 'c' }
    ];

    expect(reorderWithinSectionByUUID(displayOrder, 'main', 'a', null)?.uuid).toBe('a');
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['b', 'a', 'c']);
    expect(reorderWithinSectionByUUID(displayOrder, 'main', 'a', 'b')?.uuid).toBe('a');
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a', 'b', 'c']);
  });

  it('[covers:shuffle.returns-new-array-same-members] [covers:shuffle.empty-or-single-returns-copy] シャッフルは元配列を変更せず別配列を返す', () => {
    const original = [1, 2, 3];
    const shuffled = fisherYatesShuffle(original);
    const empty = fisherYatesShuffle<number>([]);
    const single = fisherYatesShuffle([1]);

    expect(shuffled).not.toBe(original);
    expect([...shuffled].sort()).toEqual([1, 2, 3]);
    expect(original).toEqual([1, 2, 3]);
    expect(empty).toEqual([]);
    expect(empty).not.toBe([]);
    expect(single).toEqual([1]);
  });

  it('[covers:validate.invalid-section] [covers:validate.invalid-source-uuid] [covers:validate.source-not-found] [covers:validate.target-null-is-valid] [covers:validate.invalid-target-uuid] [covers:validate.target-not-found] [covers:validate.valid-target-uuid] validateReorderParametersは実装順のエラーまたはnullを返す', () => {
    displayOrder.main = [
      { cid: 'a', ciid: 1, uuid: 'a' },
      { cid: 'b', ciid: 1, uuid: 'b' }
    ];

    expect(validateReorderParameters({ ...displayOrder, main: undefined as any }, 'main', 'a', null)).toBe('無効なセクション: main');
    expect(validateReorderParameters(displayOrder, 'main', '', null)).toBe('ソースUUIDが無効です');
    expect(validateReorderParameters(displayOrder, 'main', 'missing', null)).toBe('カードが見つかりません');
    expect(validateReorderParameters(displayOrder, 'main', 'a', null)).toBeNull();
    expect(validateReorderParameters(displayOrder, 'main', 'a', '')).toBe('ターゲットUUIDが無効です');
    expect(validateReorderParameters(displayOrder, 'main', 'a', 'missing')).toBe('ターゲットカードが見つかりません');
    expect(validateReorderParameters(displayOrder, 'main', 'a', 'b')).toBeNull();
  });
  it('[covers:move.display-slot-missing-returns-undefined] 前提固定: index検索が成功した位置の表示カードは一致したカードそのものである', () => {
    // この条件はverified=false: findIndex/lastIndexOfが成功した直後の同一indexの要素は
    // 一致したカード自身でありfalsyにならない（防御分岐は通常入力では到達不能）。
    // ここでは到達不能である前提そのものを公開挙動で固定する。
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 1, uuid: 'b' }
    ];
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 2 }];

    // uuid経路: findIndexが返したindexの要素がそのまま移動対象になる
    const byUuid = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'b');
    expect(byUuid).toEqual({ uuid: 'b', fromIndex: 1, toIndex: 0 });
    expect(displayOrder.side.map(c => c.uuid)).toEqual(['b']);

    // cid経路: lastIndexOfが返したindexの要素がそのまま移動対象になる
    const byCid = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side');
    expect(byCid).toEqual({ uuid: 'a', fromIndex: 0, toIndex: 1 });
    expect(displayOrder.main).toEqual([]);
  });

  it('[covers:move.deck-slot-missing-returns-undefined] 前提固定: deck側findIndexが成功した位置の行は一致したペアそのものである', () => {
    // この条件はverified=false: findIndexがcid/ciid一致で成功した同一indexの要素は
    // 一致した行自身でありfalsyにならない（防御分岐は通常入力では到達不能）。
    // ここでは到達不能である前提そのものを公開挙動で固定する。
    displayOrder.main = [{ cid: '100', ciid: 2, uuid: 'a' }];
    deckState.mainDeck = [
      { cid: '100', ciid: '1', lang: 'ja', quantity: 5 },
      { cid: '100', ciid: '2', lang: 'ja', quantity: 3 }
    ];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'a');

    expect(result).toEqual({ uuid: 'a', fromIndex: 0, toIndex: 0 });
    // findIndexが指したciid='2'の行だけが消費される
    expect(deckState.mainDeck).toEqual([
      { cid: '100', ciid: '1', lang: 'ja', quantity: 5 },
      { cid: '100', ciid: '2', lang: 'ja', quantity: 2 }
    ]);
    expect(deckState.sideDeck).toEqual([{ cid: '100', ciid: '2', lang: 'ja', quantity: 1 }]);
  });

  it('[covers:reorder-uuid.redundant-section-guard] 前提固定: 不正なsectionOrderは先行バリデーションが常に先に検出する', () => {
    // この条件はverified=false: validateReorderParametersが同一条件
    // （!sectionOrder || !Array.isArray(sectionOrder)）を先に検出してエラーを返すため、
    // reorderWithinSectionByUUID内の同一ガードには公開APIから到達できない。
    // ここでは先行バリデーションが常に先に検出するという前提を公開挙動で固定する。
    expect(validateReorderParameters({ ...displayOrder, main: undefined as any }, 'main', 'a', null)).toBe('無効なセクション: main');
    expect(validateReorderParameters({ ...displayOrder, main: 'not-an-array' as any }, 'main', 'a', null)).toBe('無効なセクション: main');
    expect(reorderWithinSectionByUUID({ ...displayOrder, main: undefined as any }, 'main', 'a', null)).toBeUndefined();
    expect(reorderWithinSectionByUUID({ ...displayOrder, main: 'not-an-array' as any }, 'main', 'a', null)).toBeUndefined();
  });
});
