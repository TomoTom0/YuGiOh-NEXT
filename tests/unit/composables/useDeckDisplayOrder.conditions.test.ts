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

  it('[covers:add.deck_new_pair_pushes_quantity_one] [covers:add.unified_cache_record_error_ignored] [covers:add.display_new_cid_appends_to_end] 新規カードはキャッシュ例外を無視して末尾へ追加する', () => {
    recordMove.mockImplementationOnce(() => {
      throw new Error('record failed');
    });

    const result = addToDisplayOrder(displayOrder, deckState, card('100', '1'), 'main', uuid);

    expect(result).toEqual({ insertedIndex: 0, uuid: '100-1-1' });
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
    expect(displayOrder.main).toEqual([{ cid: '100', ciid: 1, uuid: '100-1-1' }]);
    expect(mockCards.get('100')?.name).toBe('card-100');
  });

  it('[covers:add.deck_existing_pair_increments_quantity] [covers:add.display_existing_pair_insert_after_last_same_pair] 既存ペアはquantityを増やし同一ペアの最後へ挿入する', () => {
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

  it('[covers:add.display_same_cid_different_ciid_insert_after_last_same_cid] 同一cidの別ciidは同じcidの最後へ挿入する', () => {
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '200', ciid: 1, uuid: 'b' }
    ];

    const result = addToDisplayOrder(displayOrder, deckState, card('100', '2'), 'main', uuid);

    expect(result.insertedIndex).toBe(1);
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a', '100-2-1', 'b']);
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '2', lang: 'ja', quantity: 1 }]);
  });

  it('[covers:add.missing_ciid_defaults_to_zero] ciid未指定は0として扱う', () => {
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

  it('[covers:remove.deck_match_with_ciid] [covers:remove.deck_quantity_one_splices] ciid指定時は一致ペアだけを削除する', () => {
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

  it('[covers:remove.deck_match_by_cid_only] [covers:remove.deck_quantity_decrements] [covers:remove.display_without_uuid_removes_last_cid] uuid/ciid省略時はcid一致の最後の表示だけを削除しdeckState先頭一致行を減算する', () => {
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

  it('[covers:remove.display_uuid_removes_matching_uuid] uuid指定時は一致uuidの表示カードを削除する', () => {
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 2 }];
    displayOrder.main = [
      { cid: '100', ciid: 1, uuid: 'a' },
      { cid: '100', ciid: 1, uuid: 'b' }
    ];

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main', 'a');

    expect(result).toMatchObject({ removedIndex: 0, removedCiid: 1 });
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['b']);
  });

  it('[covers:remove.deck_no_match_no_deck_change] [covers:remove.display_no_match_returns_minus_one] deckState/displayOrderの対象なしは変更せず-1を返す', () => {
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];

    const result = removeFromDisplayOrder(displayOrder, deckState, '999', 'main');

    expect(result).toEqual({ removedCard: undefined, removedCiid: undefined, removedIndex: -1 });
    expect(deckState.mainDeck).toEqual([{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }]);
    expect(displayOrder.main).toEqual([{ cid: '100', ciid: 1, uuid: 'a' }]);
  });

  it('[covers:remove.removed_card_from_temp_cache] removedCardはTempCacheDBからcardIdで取得する', () => {
    addToDisplayOrder(displayOrder, deckState, card('100', '1'), 'main', uuid);

    const result = removeFromDisplayOrder(displayOrder, deckState, '100', 'main');

    expect(result.removedCard).toEqual(card('100', '1'));
  });

  it('[covers:move.invalid_from_order_returns_undefined] fromのdisplayOrderがない場合はundefinedを返す', () => {
    const result = moveInDisplayOrder(displayOrder as any, deckState, '100', 'missing', 'main');

    expect(result).toBeUndefined();
    expect(displayOrder.main).toEqual([]);
  });

  it('[covers:move.uuid_selects_matching_uuid] [covers:move.valid_target_index_inserts_at_target] [covers:move.from_deck_quantity_decrements] [covers:move.to_deck_existing_pair_increments] uuid指定時は一致カードを指定indexへ移動し両deckState数量を更新する', () => {
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

  it('[covers:move.without_uuid_selects_last_cid] [covers:move.invalid_or_missing_target_index_appends] [covers:move.from_deck_quantity_one_splices] [covers:move.to_deck_new_pair_pushes] uuid未指定時は最後のcid一致カードを末尾へ移動する', () => {
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

  it('[covers:move.no_display_match_returns_undefined] 表示側に移動対象がない場合は状態変更しない', () => {
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];
    deckState.mainDeck = [{ cid: '100', ciid: '1', lang: 'ja', quantity: 1 }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'missing');

    expect(result).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
    expect(displayOrder.side).toEqual([]);
  });

  it('[covers:move.deck_pair_missing_returns_undefined] deckStateに対応ペアがない場合は状態変更しない', () => {
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];

    const result = moveInDisplayOrder(displayOrder, deckState, '100', 'main', 'side', 'a');

    expect(result).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
    expect(displayOrder.side).toEqual([]);
  });

  it('[covers:reorder.invalid_section_order_returns_undefined] [covers:reorder.invalid_indices_return_undefined] 不正section/orderまたは不正indexはundefinedを返す', () => {
    expect(reorderWithinSection({ ...displayOrder, main: undefined as any }, 'main', 0, 0)).toBeUndefined();
    displayOrder.main = [{ cid: '100', ciid: 1, uuid: 'a' }];
    expect(reorderWithinSection(displayOrder, 'main', -1, 0)).toBeUndefined();
    expect(reorderWithinSection(displayOrder, 'main', 0, 2)).toBeUndefined();
  });

  it('[covers:reorder.missing_source_card_returns_undefined] fromIndexのカードがfalsyならundefinedを返す', () => {
    displayOrder.main = [undefined as any];

    expect(reorderWithinSection(displayOrder, 'main', 0, 0)).toBeUndefined();
  });

  it('[covers:reorder.forward_adjusts_to_index] [covers:reorder.backward_uses_to_index] indexベースで前後に並び替える', () => {
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

  it('[covers:reorder_uuid.validation_error_returns_undefined] validationエラー時はUUIDベース並び替えを行わない', () => {
    displayOrder.main = [{ cid: 'a', ciid: 1, uuid: 'a' }];

    expect(reorderWithinSectionByUUID(displayOrder, 'main', 'missing', null)).toBeUndefined();
    expect(displayOrder.main.map(c => c.uuid)).toEqual(['a']);
  });

  it('[covers:reorder_uuid.target_null_delegates_length_minus_one] [covers:reorder_uuid.target_uuid_moves_before_target] UUIDベースでtargetUuidから算出した位置へ並び替える', () => {
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

  it('[covers:shuffle.returns_new_array_same_members] [covers:shuffle.empty_or_single_returns_copy] シャッフルは元配列を変更せず別配列を返す', () => {
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

  it('[covers:validate.invalid_section] [covers:validate.invalid_source_uuid] [covers:validate.source_not_found] [covers:validate.target_null_is_valid] [covers:validate.invalid_target_uuid] [covers:validate.target_not_found] [covers:validate.valid_target_uuid] validateReorderParametersは実装順のエラーまたはnullを返す', () => {
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
});
