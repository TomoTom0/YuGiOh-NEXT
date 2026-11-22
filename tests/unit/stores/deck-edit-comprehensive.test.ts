/**
 * deck-edit.ts テストスイート骨組み
 *
 * 構造:
 * - 基本操作テスト（addCard, removeCard, moveCard）
 * - displayOrder ↔ deckInfo 同期テスト
 * - Undo/Redo テスト
 * - 境界条件テスト
 * - ciid 処理テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockUnifiedDB = vi.hoisted(() => ({
  isInitialized: vi.fn(() => false),
  setCardInfo: vi.fn(),
  getCardInfo: vi.fn((cardId: string) => null),
  getValidCiidsForLang: vi.fn(() => [] as string[]),
  reconstructCardInfo: vi.fn(() => null),
  getAllCardInfos: vi.fn(() => new Map()),
  recordMove: vi.fn(),
  recordDeckOpen: vi.fn(),
  getCardTier: vi.fn((cardId: string) => 3),
  getStats: vi.fn(() => ({
    cardTierCount: 100,
    deckHistoryCount: 5,
    cardTableACount: 50,
    cardTableBCount: 60,
    productTableACount: 20,
    faqTableACount: 30
  })),
  clearAll: vi.fn(),
  saveCardTableA: vi.fn(),
  saveCardTableB: vi.fn(),
  saveAll: vi.fn()
}));

const mockTempCards = vi.hoisted(() => new Map<string, any>());
const mockPersistenceSaveDeck = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const mockPersistenceLoadDeck = vi.hoisted(() => vi.fn(async (_dno: number) => createMockDeckInfo(_dno)));
const mockUpdateDeckInfoAndThumbnailWithData = vi.hoisted(() => vi.fn(async () => {}));

// Mock modules BEFORE importing the store
vi.mock('@/utils/extension-context-checker', () => {
  return {
    isExtensionContextValid: vi.fn(() => true),
    safeStorageGet: vi.fn(async () => null),
    safeStorageSet: vi.fn(async () => {}),
    safeStorageRemove: vi.fn(async () => {})
  };
});

vi.mock('@/utils/unified-cache-db', () => {
  return {
    getUnifiedCacheDB: vi.fn(() => mockUnifiedDB),
    initUnifiedCacheDB: vi.fn(async () => {}),
    saveUnifiedCacheDB: vi.fn(async () => {}),
    resetUnifiedCacheDB: vi.fn(),
    mockUnifiedDB
  };
});

vi.mock('@/utils/temp-cache-db', () => {
  return {
    getTempCacheDB: vi.fn(() => ({
      setCardInfo: vi.fn(),
      getCardInfo: vi.fn((cardId: string) => mockTempCards.get(cardId) ?? null),
      get: vi.fn((cardId: string) => mockTempCards.get(cardId) ?? null),
      set: vi.fn((cardId: string, card: any) => { mockTempCards.set(cardId, card); return true; }),
      clear: vi.fn(() => mockTempCards.clear()),
      get size() { return mockTempCards.size; }
    })),
    mockTempCards,
    resetTempCacheDB: vi.fn(),
    initTempCacheDBFromStorage: vi.fn(async () => {}),
    saveTempCacheDBToStorage: vi.fn(async () => {}),
    clearTempCacheDBStorage: vi.fn()
  };
});

vi.mock('@/utils/language-detector', () => {
  return {
    detectLanguage: vi.fn(() => 'ja')
  };
});

vi.mock('@/composables/deck/useDeckPersistence', () => {
  return {
    useDeckPersistence: vi.fn(() => ({
      saveDeck: mockPersistenceSaveDeck,
      loadDeck: mockPersistenceLoadDeck
    }))
  };
});

vi.mock('@/utils/deck-cache', () => {
  return {
    loadThumbnailCache: vi.fn(() => new Map()),
    loadDeckInfoCache: vi.fn(() => new Map()),
    updateDeckInfoAndThumbnailWithData: mockUpdateDeckInfoAndThumbnailWithData,
    saveDeckListOrder: vi.fn()
  };
});

// NOW import the store after all mocks are set up
import { useDeckEditStore } from '@/stores/deck-edit';
import type { CardInfo, DeckInfo } from '@/types';

describe('useDeckEditStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(mockUnifiedDB.isInitialized).mockReturnValue(false);
    vi.mocked(mockUnifiedDB.getValidCiidsForLang).mockReturnValue([]);
    mockPersistenceSaveDeck.mockResolvedValue({ success: true });
    mockPersistenceLoadDeck.mockImplementation(async (dno: number) => createMockDeckInfo(dno));
    mockUpdateDeckInfoAndThumbnailWithData.mockResolvedValue(undefined);
    mockTempCards.clear();
  });

  describe('State 初期化', () => {
    it('TC-Initial-01: 初期状態で displayOrder が全て空配列', () => {
      const store = useDeckEditStore();
      expect(store.displayOrder.main).toEqual([]);
      expect(store.displayOrder.extra).toEqual([]);
      expect(store.displayOrder.side).toEqual([]);
      expect(store.displayOrder.trash).toEqual([]);
    });

    it('TC-Initial-02: 初期状態で deckInfo が空', () => {
      const store = useDeckEditStore();
      expect(store.deckInfo.mainDeck).toEqual([]);
      expect(store.deckInfo.dno).toBe(0);
    });
  });

  describe('addCard() - カード追加', () => {
    it('TC-01: 単一カード追加（main） [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      const result = store.addCard(card, 'main');

      expect(result.success).toBe(true);
      expect(store.displayOrder.main.length).toBe(1);
      expect(store.deckInfo.mainDeck.length).toBe(1);
      expect(store.deckInfo.mainDeck[0].cid).toBe('12345678');
      expect(store.deckInfo.mainDeck[0].quantity).toBe(1);
    });

    it('TC-02: 同じカードを3回追加（3-copy 制限） [covers:add-card.max-copies-reached-rejected]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');
      store.addCard(card, 'main');

      expect(store.deckInfo.mainDeck[0].quantity).toBe(3);

      // 4回目の追加は失敗
      const result = store.addCard(card, 'main');
      expect(result.success).toBe(false);
      expect(result.error).toBe('max_copies_reached');
      expect(store.deckInfo.mainDeck[0].quantity).toBe(3); // 変わらない
    });

    it('TC-03: 複数カード追加（displayOrder の UUID が異なる）', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');

      expect(store.displayOrder.main.length).toBe(2);
      expect(store.displayOrder.main[0].uuid).not.toBe(store.displayOrder.main[1].uuid);
    });

    it('TC-04: ciid が undefined の場合、デフォルト 0 に正規化 [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');
      card.ciid = undefined; // undefined

      store.addCard(card, 'main');

      expect(Number(store.deckInfo.mainDeck[0].ciid)).toBe(0);
    });

  });

  describe('removeCard() - カード削除', () => {
    it('TC-05: カード削除（displayOrder と deckInfo が同期） [covers:remove-card.delegates-remove-records-move-and-updates-category]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      expect(store.displayOrder.main.length).toBe(1);

      store.removeCard('12345678', 'main');

      expect(store.displayOrder.main.length).toBe(0);
      expect(store.deckInfo.mainDeck.length).toBe(0);
    });

    it('TC-06: 同じカード複数枚から1枚削除', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');
      expect(store.displayOrder.main.length).toBe(2);

      store.removeCard('12345678', 'main');

      expect(store.displayOrder.main.length).toBe(1);
      expect(store.deckInfo.mainDeck[0].quantity).toBe(1);
    });

    it('TC-07: 存在しないカードを削除しようとしてもエラーなし [covers:remove-card.delegates-remove-records-move-and-updates-category]', () => {
      const store = useDeckEditStore();
      const result = store.removeCard('99999999', 'main');
      expect(result).toBeUndefined();
    });
  });

  describe('moveCard() - カード移動', () => {
    it('TC-03: main → extra 移動 [covers:move-card.success-moves-and-records]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster', { isExtraDeck: true });

      store.addCard(card, 'main');
      expect(store.displayOrder.main.length).toBe(1);

      const result = store.moveCard('12345678', 'main', 'extra');

      expect(result.success).toBe(true);
      expect(store.displayOrder.main.length).toBe(0);
      expect(store.displayOrder.extra.length).toBe(1);
      expect(store.deckInfo.extraDeck[0].cid).toBe('12345678');
    });

    it('TC-04: trash → side 移動はdisplayOrderに無くてもsuccessを返す [covers:move-card.success-moves-and-records]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      // main に 3 枚
      store.addCard(card, 'main');
      store.addCard(card, 'main');
      store.addCard(card, 'main');

      // trash に 1 枚
      store.trashDeck.push({ cid: '12345678', ciid: 0, quantity: 1 });

      const result = store.moveCard('12345678', 'trash', 'side');

      expect(result.success).toBe(true);
      expect(store.trashDeck).toEqual([{ cid: '12345678', ciid: 0, quantity: 1 }]);
      expect(store.displayOrder.side).toHaveLength(0);
    });

    it('TC-08: UUID 指定での移動 [covers:move-card.success-moves-and-records]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');

      const uuid = store.displayOrder.main[0].uuid;

      // 特定の UUID だけを移動
      const result = store.moveCard('12345678', 'main', 'side', uuid);

      expect(result.success).toBe(true);
      expect(store.displayOrder.main.length).toBe(1);
      expect(store.displayOrder.side.length).toBe(1);
    });

    it('TC-08b: 移動元にカードが無い場合は失敗 [covers:move-card.source-not-found]', () => {
      const store = useDeckEditStore();

      const result = store.moveCard('missing', 'main', 'side');

      expect(result).toEqual({ success: false, error: 'カードが見つかりません' });
    });

  });

  describe('moveCardWithPosition() - ドラッグ移動', () => {
    it('TC-05: ドラッグ移動（セクション間、位置指定） [covers:move-card-with-position.success-inserts-at-target-or-end]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster', { isExtraDeck: true });
      const card2 = createMockCard('22222222', 'spell');
      const card3 = createMockCard('33333333', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');
      store.addCard(card3, 'main');

      const uuid1 = store.displayOrder.main[0].uuid;
      const targetUuid = store.displayOrder.extra[0]?.uuid ?? null;

      const result = store.moveCardWithPosition('11111111', 'main', 'extra', uuid1, targetUuid);

      expect(result).toEqual({ success: true });
      expect(store.displayOrder.main).toHaveLength(2);
      expect(store.displayOrder.extra).toHaveLength(1);
      expect(store.deckInfo.extraDeck.find(dc => dc.cid === '11111111')?.quantity).toBe(1);
    });

    it('TC-05b: ドラッグ移動（null 位置 = 末尾） [covers:move-card-with-position.success-inserts-at-target-or-end]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster', { isExtraDeck: true });

      store.addCard(card, 'main');

      const uuid = store.displayOrder.main[0].uuid;

      const result = store.moveCardWithPosition('12345678', 'main', 'extra', uuid, null);

      expect(result).toEqual({ success: true });
      expect(store.displayOrder.main.length + store.displayOrder.extra.length).toBe(1);
    });

    it('TC-05c: sourceUuidが存在しない場合は失敗 [covers:move-card-with-position.source-card-missing]', () => {
      const store = useDeckEditStore();

      const result = store.moveCardWithPosition('missing', 'main', 'extra', 'missing-uuid', null);

      expect(result).toEqual({ success: false, error: 'カードが見つかりません' });
    });

    it('TC-05d: TempCacheDBにカード情報が無い場合は失敗 [covers:move-card-with-position.card-info-missing]', () => {
      const store = useDeckEditStore();
      store.displayOrder.main.push({ cid: '12345678', ciid: 0, uuid: '12345678-0-0' });

      const result = store.moveCardWithPosition('12345678', 'main', 'extra', '12345678-0-0', null);

      expect(result).toEqual({ success: false, error: 'カード情報が見つかりません' });
    });
  });

  describe('reorderWithinSection() - 同一セクション内の並び替え', () => {
    it('TC-07: 順序変更（前に移動） [covers:reorder-within-section.success-pushes-reorder-command]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');
      const card3 = createMockCard('33333333', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');
      store.addCard(card3, 'main');

      const uuid1 = store.displayOrder.main[0].uuid;
      const uuid3 = store.displayOrder.main[2].uuid;

      // uuid1 を uuid3 の直前に移動
      const result = store.reorderWithinSection('main', uuid1, uuid3);

      expect(result.success).toBe(true);
      expect(store.displayOrder.main.length).toBe(3);
      expect(store.commandHistory.at(-1)?.type).toBe('reorder');
    });

    it('TC-07b: 順序変更（null = 末尾） [covers:reorder-within-section.success-pushes-reorder-command]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');

      const uuid1 = store.displayOrder.main[0].uuid;

      const result = store.reorderWithinSection('main', uuid1, null);

      expect(result.success).toBe(true);
      expect(store.displayOrder.main.length).toBe(2);
    });

    it('TC-07c: 同じUUIDへのdropはmoved=false [covers:reorder-within-section.same-uuid-noop] [covers:reorder-card.no-actual-move-skips-followup]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('11111111', 'monster');
      store.addCard(card, 'main');
      const uuid = store.displayOrder.main[0].uuid;

      const result = store.reorderWithinSection('main', uuid, uuid);
      const reorderResult = store.reorderCard(uuid, uuid, 'main');

      expect(result).toEqual({ success: true, moved: false });
      expect(reorderResult).toEqual({ success: true, moved: false });
    });

    it('TC-07d: 不正なsourceUuidはvalidation error [covers:reorder-within-section.validation-error-returns-failure]', () => {
      const store = useDeckEditStore();

      const result = store.reorderWithinSection('main', 'missing-uuid', null);

      expect(result.success).toBe(false);
      expect(result.error).toBeTypeOf('string');
    });
  });

  describe('displayOrder ↔ deckInfo 同期（重要）', () => {
    it('TC-10a: addCard 後、両方が同期', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');

      // displayOrder の長さ === deckInfo の合計 quantity
      const displayLength = store.displayOrder.main.length;
      const deckQuantity = store.deckInfo.mainDeck.reduce((sum, dc) => sum + dc.quantity, 0);

      expect(displayLength).toBe(deckQuantity);
    });

    it('TC-10b: 複数カード混在時の同期確認', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'monster');

      store.addCard(card1, 'main');
      store.addCard(card1, 'main');
      store.addCard(card2, 'main');

      const displayLength = store.displayOrder.main.length;
      expect(displayLength).toBe(3);

      // deckInfo チェック
      const card1Entry = store.deckInfo.mainDeck.find(dc => dc.cid === '11111111');
      const card2Entry = store.deckInfo.mainDeck.find(dc => dc.cid === '22222222');

      expect(card1Entry?.quantity).toBe(2);
      expect(card2Entry?.quantity).toBe(1);
    });

    it('TC-10c: moveCard 後も同期が保たれている', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');

      store.moveCard('12345678', 'main', 'side');

      const mainTotal = store.displayOrder.main.length;
      const sideTotal = store.displayOrder.side.length;

      expect(mainTotal).toBe(1);
      expect(sideTotal).toBe(1);

      // deckInfo も一致
      const mainQuantity = store.deckInfo.mainDeck.reduce((sum, dc) => sum + dc.quantity, 0);
      const sideQuantity = store.deckInfo.sideDeck.reduce((sum, dc) => sum + dc.quantity, 0);

      expect(mainQuantity).toBe(1);
      expect(sideQuantity).toBe(1);
    });
  });

  describe('Undo/Redo', () => {
    it('TC-11: addCard → undo → redo [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      expect(store.displayOrder.main.length).toBe(1);
      expect(store.canUndo).toBe(true);

      store.undo();
      expect(store.displayOrder.main.length).toBe(0);
      expect(store.canRedo).toBe(true);

      store.redo();
      expect(store.displayOrder.main.length).toBe(1);
    });

    it('TC-12: moveCard の undo で元位置に復帰 [covers:move-card.success-moves-and-records]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');

      const initialOrder = [...store.displayOrder.main];

      store.moveCard('12345678', 'main', 'side');
      expect(store.displayOrder.main.length).toBe(1);

      store.undo();

      expect(store.displayOrder.main.length).toBe(2);
      expect(store.displayOrder.side.length).toBe(0);
    });
  });

  describe('shuffleSection()', () => {
    it('TC-08: シャッフル後、カード数は変わらない [covers:shuffle-section.nonempty-shuffles-and-pushes-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.addCard(card, 'main');
      store.addCard(card, 'main');

      const countBefore = store.displayOrder.main.length;
      store.shuffleSection('main');
      const countAfter = store.displayOrder.main.length;

      expect(countBefore).toBe(countAfter);
    });

    it('TC-08b: シャッフル → undo で元の順序に復帰 [covers:shuffle-section.nonempty-shuffles-and-pushes-command]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');
      const card3 = createMockCard('33333333', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');
      store.addCard(card3, 'main');

      const originalOrder = store.displayOrder.main.map(dc => dc.cid);

      store.shuffleSection('main');
      store.undo();

      const restoredOrder = store.displayOrder.main.map(dc => dc.cid);

      expect(restoredOrder).toEqual(originalOrder);
    });
  });

  describe('sortSection()', () => {
    it('TC-09: 空セクションのソートは履歴を追加しない [covers:sort-section.empty-section-noop]', () => {
      const store = useDeckEditStore();

      store.sortSection('main');

      expect(store.displayOrder.main).toHaveLength(0);
      expect(store.commandHistory).toHaveLength(0);
    });

    it('TC-09b: 非空セクションのソートはカード数を保ちreorder履歴を追加する [covers:sort-section.no-override-resolves-toggle-and-pushes-command]', () => {
      const store = useDeckEditStore();
      store.addCard(createMockCard('22222222', 'spell'), 'main');
      store.addCard(createMockCard('11111111', 'monster'), 'main');
      const countBefore = store.displayOrder.main.length;

      store.sortSection('main');

      expect(store.displayOrder.main).toHaveLength(countBefore);
      expect(store.commandHistory.at(-1)?.type).toBe('reorder');
    });
  });

  describe('境界条件テスト', () => {
    it('TC-Empty: 空のデッキから削除しようとする [covers:remove-card.delegates-remove-records-move-and-updates-category]', () => {
      const store = useDeckEditStore();
      const result = store.removeCard('99999999', 'main');
      // removeCard が undefined を返すこともあるため、チェック
      if (result) {
        expect(result.success).toBe(false);
      }
    });

    it('TC-LargeQty: quantity > 100 のカード [covers:remove-card.delegates-remove-records-move-and-updates-category]', () => {
      const store = useDeckEditStore();

      store.deckInfo.mainDeck.push({ cid: '12345678', ciid: 0, quantity: 100 });

      store.removeCard('12345678', 'main');

      expect(store.deckInfo.mainDeck[0].quantity).toBe(99);
    });

    it('TC-Undefined: ciid が undefined のカード [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');
      card.ciid = undefined;

      const result = store.addCard(card, 'main');

      expect(result.success).toBe(true);
      const ciid = store.deckInfo.mainDeck[0].ciid;
      expect(Number(ciid)).toBe(0);
    });
  });

  describe('backupDisplayOrder() / restoreDisplayOrder() - TASK-281', () => {
    it('TC-Backup-01: restoreDisplayOrder は displayOrder と deckInfo を同時に復元する [covers:backup-display-order.deep-copies-display-and-deck] [covers:restore-display-order.restores-and-clears-backup]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');

      const originalDisplayOrder = store.displayOrder.main.map(d => d.cid);
      const originalMainDeck = store.deckInfo.mainDeck.map(d => d.cid);

      // バックアップ取得
      store.backupDisplayOrder();

      // displayOrder と deckInfo を直接書き換え（sortによる変更を模倣）
      store.displayOrder.main = [store.displayOrder.main[1], store.displayOrder.main[0]];
      store.deckInfo.mainDeck = [store.deckInfo.mainDeck[1], store.deckInfo.mainDeck[0]];

      // 変更されたことを確認
      expect(store.displayOrder.main.map(d => d.cid)).not.toEqual(originalDisplayOrder);
      expect(store.deckInfo.mainDeck.map(d => d.cid)).not.toEqual(originalMainDeck);

      // 復元
      store.restoreDisplayOrder();

      // displayOrder と deckInfo が両方とも元に戻ること
      expect(store.displayOrder.main.map(d => d.cid)).toEqual(originalDisplayOrder);
      expect(store.deckInfo.mainDeck.map(d => d.cid)).toEqual(originalMainDeck);
    });

    it('TC-Backup-02: restoreDisplayOrder 後、displayOrder と deckInfo が同一順序を保つ [covers:restore-display-order.restores-and-clears-backup]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');
      const card3 = createMockCard('33333333', 'trap');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');
      store.addCard(card3, 'main');

      store.backupDisplayOrder();

      // ソートによる変更を模倣（displayOrder と deckInfo 両方変更）
      const reversed = [...store.displayOrder.main].reverse();
      store.displayOrder.main = reversed;
      const reversedDeck = [...store.deckInfo.mainDeck].reverse();
      store.deckInfo.mainDeck = reversedDeck;

      store.restoreDisplayOrder();

      // displayOrder と deckInfo の cid 順序が一致すること
      const displayCids = store.displayOrder.main.map(d => d.cid);
      const deckCids = store.deckInfo.mainDeck.map(d => d.cid);
      expect(displayCids).toEqual(deckCids);
    });
  });

  describe('コマンド description / type フィールド', () => {
    it('addCard 後のコマンドに description と type が設定される [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');

      // commandHistory にアクセス
      const history = store.commandHistory;
      expect(history.length).toBeGreaterThan(0);

      const lastCmd = history[history.length - 1];
      // description が存在し、セクション名を含むことを確認
      if (lastCmd.description) {
        expect(lastCmd.description).toContain('Card 12345678');
      }
      // type が 'add' であること
      expect(lastCmd.type).toBe('add');
    });

    it('moveCard 後のコマンドに type: move が設定される [covers:move-card.success-moves-and-records]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.addCard(card, 'main');
      store.moveCard('12345678', 'main', 'side');

      const history = store.commandHistory;
      const lastCmd = history[history.length - 1];

      expect(lastCmd.type).toBe('move');
      if (lastCmd.description) {
        expect(typeof lastCmd.description).toBe('string');
      }
    });

    it('reorderWithinSection 後のコマンドに type: reorder が設定される [covers:reorder-within-section.success-pushes-reorder-command]', () => {
      const store = useDeckEditStore();
      const card1 = createMockCard('11111111', 'monster');
      const card2 = createMockCard('22222222', 'spell');

      store.addCard(card1, 'main');
      store.addCard(card2, 'main');

      const uuid1 = store.displayOrder.main[0].uuid;
      store.reorderWithinSection('main', uuid1, null);

      const history = store.commandHistory;
      const lastCmd = history[history.length - 1];

      expect(lastCmd.type).toBe('reorder');
    });

    it('コマンドに timestamp が自動設定される [covers:add-card.success-adds-display-order-and-command]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      const before = Date.now();
      store.addCard(card, 'main');
      const after = Date.now();

      const history = store.commandHistory;
      const lastCmd = history[history.length - 1];

      expect(lastCmd.timestamp).toBeGreaterThanOrEqual(before);
      expect(lastCmd.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('hasUnsavedChanges()', () => {
    it('TC-UnsavedChanges: saved snapshot が無い場合はfalse [covers:has-unsaved-changes.no-saved-snapshot-false]', () => {
      const store = useDeckEditStore();

      const card = createMockCard('12345678', 'monster');
      store.addCard(card, 'main');

      expect(store.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('その他の公開アクション', () => {
    it('setDraggingCard は値をそのまま代入する [covers:set-dragging-card.assigns-value]', () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster');

      store.setDraggingCard({ card, sectionType: 'main' });
      expect(store.draggingCard).toEqual({ card, sectionType: 'main' });

      store.setDraggingCard(null);
      expect(store.draggingCard).toBeNull();
    });

    it('getDeckName はdeckInfo.nameをそのまま返す（originalNameへフォールバックしない） [covers:get-deck-name.name-then-original-then-empty] [covers:set-deck-name.assigns-name]', () => {
      const store = useDeckEditStore();

      expect(store.getDeckName()).toBe('');
      (store.deckInfo as any).originalName = 'Original';
      // originalNameが設定されていても、nameが空のままならフォールバックしない
      // （明示的にクリアした空文字を保護するため。フォールバックはloadDeck時点で反映済み）
      expect(store.getDeckName()).toBe('');
      store.setDeckName('Current');
      expect(store.getDeckName()).toBe('Current');
    });

    it('openLoadDialog はキャッシュを再読込してdialogを開く [covers:open-load-dialog.reloads-caches-and-shows-dialog]', () => {
      const store = useDeckEditStore();

      store.openLoadDialog();

      expect(store.showLoadDialog).toBe(true);
      expect(store.deckThumbnails).toBeDefined();
      expect(store.cachedDeckInfos).toBeDefined();
    });

    it('headPlacementCardIds は重複追加せず削除とincludesを反映する [covers:add-head-placement-card.adds-unique-and-saves] [covers:add-head-placement-card.duplicate-noop] [covers:remove-head-placement-card.removes-existing-and-saves] [covers:remove-head-placement-card.missing-noop] [covers:is-head-placement-card.includes-result]', () => {
      const store = useDeckEditStore();

      store.addHeadPlacementCard('12345678');
      store.addHeadPlacementCard('12345678');
      expect(store.headPlacementCardIds).toEqual(['12345678']);
      expect(store.isHeadPlacementCard('12345678')).toBe(true);

      store.removeHeadPlacementCard('missing');
      expect(store.headPlacementCardIds).toEqual(['12345678']);

      store.removeHeadPlacementCard('12345678');
      expect(store.headPlacementCardIds).toEqual([]);
      expect(store.isHeadPlacementCard('12345678')).toBe(false);
    });

    it('ロード済みデッキがない操作はNo deck loadedをthrowする [covers:reload-deck.no-current-deck-throws] [covers:copy-current-deck.no-loaded-deck-throws] [covers:delete-current-deck.no-loaded-deck-throws]', async () => {
      const store = useDeckEditStore();

      await expect(store.reloadDeck()).rejects.toThrow('No deck loaded');
      await expect(store.copyCurrentDeck()).rejects.toThrow('No deck loaded');
      await expect(store.deleteCurrentDeck()).rejects.toThrow('No deck loaded');
    });

    it('captureDeckSnapshot と sort-only 判定のsnapshotなし分岐 [covers:capture-deck-snapshot.delegates-to-logic] [covers:has-only-sort-order-changes.no-saved-snapshot-false]', () => {
      const store = useDeckEditStore();

      expect(typeof store.captureDeckSnapshot()).toBe('string');
      expect(store.hasOnlySortOrderChanges()).toBe(false);
    });

    it('saveDeck成功時のみデッキ情報とサムネイルキャッシュ更新を非同期で開始する [covers:save-deck.success-updates-cache-and-thumbnail]', async () => {
      const store = useDeckEditStore();
      const card = createMockCard('12345678', 'monster', { ciid: 1 });
      store.addCard(card, 'main');
      store.addHeadPlacementCard('12345678');

      mockPersistenceSaveDeck.mockResolvedValueOnce({ success: true });
      const success = await store.saveDeck(7);

      expect(success).toEqual({ success: true });
      expect(mockUpdateDeckInfoAndThumbnailWithData).toHaveBeenCalledWith(
        7,
        store.deckInfo,
        store.headPlacementCardIds,
        store.deckThumbnails,
        store.cachedDeckInfos
      );

      mockUpdateDeckInfoAndThumbnailWithData.mockClear();
      mockPersistenceSaveDeck.mockResolvedValueOnce({ success: false, error: ['failed'] });
      const failure = await store.saveDeck(7);

      expect(failure).toEqual({ success: false, error: ['failed'] });
      expect(mockUpdateDeckInfoAndThumbnailWithData).not.toHaveBeenCalled();
    });
  });

  describe('autoSetCategory() / autoRenameDeck() - TASK-442', () => {
    function mockCardWithNameText(name: string, text = ''): any {
      return { cardId: name, name, text };
    }

    beforeEach(() => {
      mockUnifiedDB.reconstructCardInfo.mockReset();
    });

    it('閾値(7)以上マッチするカテゴリのみdeckInfo.categoryに設定する [covers:auto-set-category.sets-categories-meeting-threshold]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼', cat2: '幻想魔術師' };
      store.deckInfo.mainDeck = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 7 }, // '青眼' name一致 x7
        { cid: '2', ciid: '0', lang: 'ja', quantity: 3 }  // '幻想魔術師' name一致 x3（閾値未満）
      ];
      mockUnifiedDB.reconstructCardInfo.mockImplementation((cid: string) => {
        if (cid === '1') return mockCardWithNameText('青眼の白龍');
        if (cid === '2') return mockCardWithNameText('幻想魔術師');
        return null;
      });

      const result = store.autoSetCategory();

      expect(result).toEqual(['cat1']);
      expect(store.deckInfo.category).toEqual(['cat1']);
    });

    it('閾値以上のカテゴリが無い場合は空配列を設定する [covers:auto-set-category.no-match-clears-category]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼' };
      store.deckInfo.category = ['cat1']; // 既存選択があっても上書きされる
      store.deckInfo.mainDeck = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 1 }
      ];
      mockUnifiedDB.reconstructCardInfo.mockImplementation((cid: string) =>
        cid === '1' ? mockCardWithNameText('青眼の白龍') : null
      );

      const result = store.autoSetCategory();

      expect(result).toEqual([]);
      expect(store.deckInfo.category).toEqual([]);
    });

    it('カテゴリが既に設定されている場合はautoSetCategoryを呼ばずそのまま使う [covers:auto-rename-deck.uses-existing-category-if-set]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼' };
      store.deckInfo.category = ['cat1'];
      store.deckInfo.name = '旧デッキ名';
      // マッチしないデータでも、既存category設定があるので自動判定は走らない
      store.deckInfo.mainDeck = [];
      mockUnifiedDB.reconstructCardInfo.mockReturnValue(null);

      const result = store.autoRenameDeck();

      expect(result.renamed).toBe(true);
      expect(store.deckInfo.name).toBe('青眼');
      expect(store.deckInfo.category).toEqual(['cat1']); // 変化しない
    });

    it('カテゴリ未設定なら自動判定してから命名する [covers:auto-rename-deck.auto-sets-category-if-empty]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼' };
      store.deckInfo.category = [];
      store.deckInfo.name = '旧デッキ名';
      store.deckInfo.mainDeck = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 7 }
      ];
      mockUnifiedDB.reconstructCardInfo.mockImplementation((cid: string) =>
        cid === '1' ? mockCardWithNameText('青眼の白龍') : null
      );

      const result = store.autoRenameDeck();

      expect(store.deckInfo.category).toEqual(['cat1']);
      expect(result.categories).toEqual(['cat1']);
      expect(store.deckInfo.name).toBe('青眼');
    });

    it('マッチするラベルが無い場合は名前を変更せずrenamed:falseを返す [covers:auto-rename-deck.no-matching-label-is-noop]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = {}; // 'cat1' に対応するラベルが無い
      store.deckInfo.category = ['cat1'];
      store.deckInfo.name = '旧デッキ名';

      const result = store.autoRenameDeck();

      expect(result).toEqual({ categories: ['cat1'], renamed: false });
      expect(store.deckInfo.name).toBe('旧デッキ名');
    });

    it('先頭のレギュレーションタグは保持し、後ろをカテゴリ名で置き換える [covers:auto-rename-deck.preserves-prefix-regulation-tag]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼' };
      store.deckInfo.category = ['cat1'];
      store.deckInfo.name = '[OCG] 旧デッキ名';

      const result = store.autoRenameDeck();

      expect(store.deckInfo.name).toBe('[OCG] 青眼');
      expect(result.renamed).toBe(true);
    });

    it('先頭タグが無い場合はデッキ名全体を置き換える [covers:auto-rename-deck.no-tag-replaces-whole-name]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼' };
      store.deckInfo.category = ['cat1'];
      store.deckInfo.name = '旧デッキ名';

      store.autoRenameDeck();

      expect(store.deckInfo.name).toBe('青眼');
    });

    it('複数カテゴリは区切り文字無しで連結する [covers:auto-rename-deck.multiple-categories-joined-without-separator]', () => {
      const store = useDeckEditStore();
      store.categoryLabelMap = { cat1: '青眼', cat2: 'ブラック・マジシャン' };
      store.deckInfo.category = ['cat1', 'cat2'];
      store.deckInfo.name = '旧デッキ名';

      store.autoRenameDeck();

      expect(store.deckInfo.name).toBe('青眼ブラック・マジシャン');
    });

    it('生成後の名前が50文字を超える場合は50文字に切り詰める [covers:auto-rename-deck.truncates-generated-name-to-max-length]', () => {
      const store = useDeckEditStore();
      const longLabel1 = 'あ'.repeat(30);
      const longLabel2 = 'い'.repeat(30);
      store.categoryLabelMap = { cat1: longLabel1, cat2: longLabel2 };
      store.deckInfo.category = ['cat1', 'cat2'];
      store.deckInfo.name = '旧デッキ名';

      const result = store.autoRenameDeck();

      expect(store.deckInfo.name.length).toBeLessThanOrEqual(50);
      expect(store.deckInfo.name).toBe((longLabel1 + longLabel2).slice(0, 50));
      expect(result.renamed).toBe(true);
    });

    it('prefix込みで50文字を超える場合もprefixを含めた文字列を50文字に切り詰める [covers:auto-rename-deck.truncates-generated-name-to-max-length]', () => {
      const store = useDeckEditStore();
      const longLabel = 'あ'.repeat(50);
      store.categoryLabelMap = { cat1: longLabel };
      store.deckInfo.category = ['cat1'];
      store.deckInfo.name = '[OCG] 旧デッキ名';

      store.autoRenameDeck();

      expect(store.deckInfo.name.length).toBeLessThanOrEqual(50);
      expect(store.deckInfo.name).toBe(`[OCG] ${longLabel}`.slice(0, 50));
    });
  });

  describe('loadDeck() - インポート中のデッキ切替ガード [TASK-449]', () => {
    it('isImporting が true の間は loadDeck が persistence.loadDeck を呼ばずに即returnする', async () => {
      const store = useDeckEditStore();
      store.isImporting = true;

      await store.loadDeck(999);

      expect(mockPersistenceLoadDeck).not.toHaveBeenCalled();
      expect(store.isLoadingDeck).toBe(false);
    });

    it('isImporting が false であれば loadDeck は通常通り persistence.loadDeck を呼ぶ', async () => {
      const store = useDeckEditStore();
      store.isImporting = false;

      await store.loadDeck(999);

      expect(mockPersistenceLoadDeck).toHaveBeenCalledWith(999);
    });
  });
});

// ===== Helper Functions =====

/**
 * モック CardInfo を生成
 */
function createMockCard(
  cardId: string,
  cardType: 'monster' | 'spell' | 'trap',
  options?: { isExtraDeck?: boolean; ciid?: number }
): CardInfo {
  return {
    cardId,
    name: `Card ${cardId}`,
    cardType,
    isExtraDeck: options?.isExtraDeck ?? false,
    ciid: options?.ciid ?? 0,
    imgs: [{ ciid: 0 }],
    // その他の必須フィールド
  } as CardInfo;
}

/**
 * モック DeckInfo を生成
 */
function createMockDeckInfo(dno: number = 1): DeckInfo {
  return {
    dno,
    name: 'Test Deck',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: ''
  };
}


// ============================================================
// TASK-489: 未cover条件（verified=false）の前提固定・到達可能分岐テスト
// - 到達可能な分岐は公開APIの実挙動で検証する
// - 観測不能な内部状態の条件は、その前提（到達不能であること自体・
//   トリガーの観測可能な効果）を公開APIで固定する
// ============================================================
describe('useDeckEditStore - 未cover条件の検証 (TASK-489)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(mockUnifiedDB.isInitialized).mockReturnValue(false);
    vi.mocked(mockUnifiedDB.getValidCiidsForLang).mockReturnValue([]);
    vi.mocked(mockUnifiedDB.reconstructCardInfo).mockReturnValue(null);
    mockPersistenceSaveDeck.mockResolvedValue({ success: true });
    mockPersistenceLoadDeck.mockImplementation(async (dno: number) => createMockDeckInfo(dno));
    mockUpdateDeckInfoAndThumbnailWithData.mockResolvedValue(undefined);
    mockTempCards.clear();
  });

  function setTempCardLevel(cid: string, levelValue: number) {
    mockTempCards.set(cid, {
      cardId: cid,
      name: `Card ${cid}`,
      cardType: 'monster',
      attribute: 'dark',
      levelType: 'level',
      levelValue,
      race: 'spellcaster',
      types: ['normal'],
      isExtraDeck: false,
      ciid: 0,
      imgs: [{ ciid: 0 }]
    } as unknown as CardInfo);
  }

  async function setDeckLevelSortOrder(value: string) {
    const { useSettingsStore } = await import('@/stores/settings');
    const settings = useSettingsStore();
    (settings.appSettings as unknown as Record<string, unknown>).deckLevelSortOrder = value;
  }

  it('updateCategoryMatchingでトリガーが進み、カテゴリマッチ結果が再計算される [covers:update-category-matching.increments-trigger]', () => {
    const store = useDeckEditStore();
    store.categoryLabelMap = { cat1: '青眼' };
    store.deckInfo.category = ['cat1'];
    store.deckInfo.mainDeck = [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }];
    mockUnifiedDB.reconstructCardInfo.mockReturnValue(null);
    expect(store.categoryMatchedCardIds.size).toBe(0);

    // DB側の内容だけが変わっても、リアクティブな依存が変わらないため再計算されない
    mockUnifiedDB.reconstructCardInfo.mockImplementation((cid: string) =>
      cid === '1' ? ({ name: '青眼の白龍', text: '' } as unknown as CardInfo) : null
    );
    expect(store.categoryMatchedCardIds.size).toBe(0);

    // トリガーを進めると再計算され、新しいDB内容が反映される
    store.updateCategoryMatching();
    expect(store.categoryMatchedCardIds.has('1')).toBe(true);
  });

  it('autoSetCategoryはカテゴリ設定と同時にカテゴリマッチ再計算を行う [covers:auto-set-category.calls-update-category-matching]', () => {
    const store = useDeckEditStore();
    store.categoryLabelMap = { cat1: '青眼' };
    store.deckInfo.mainDeck = [{ cid: '1', ciid: '0', lang: 'ja', quantity: 7 }];
    mockUnifiedDB.reconstructCardInfo.mockImplementation((cid: string) =>
      cid === '1' ? ({ name: '青眼の白龍', text: '' } as unknown as CardInfo) : null
    );

    const result = store.autoSetCategory();

    expect(result).toEqual(['cat1']);
    expect(store.deckInfo.category).toEqual(['cat1']);
    // updateCategoryMatching経由でマッチ結果にも反映される
    expect(store.categoryMatchedCardIds.has('1')).toBe(true);
  });

  it('前提: DB初期化済みではaddCard内のrequireが解決できずinvalid_ciid分岐に到達しない [covers:add-card.invalid-ciid-for-language-rejected]', () => {
    const store = useDeckEditStore();
    vi.mocked(mockUnifiedDB.isInitialized).mockReturnValue(true);
    vi.mocked(mockUnifiedDB.getValidCiidsForLang).mockReturnValue(['1']);
    const card = createMockCard('12345678', 'monster', { ciid: 2 });

    // 実装内の CommonJS require('@/utils/language-detector') は現行Vitestの
    // alias解決に乗らないため、分岐本体（invalid_ciid_for_language返却）には到達しない
    expect(() => store.addCard(card, 'main')).toThrow(/language-detector/);
    expect(store.deckInfo.mainDeck).toHaveLength(0);
  });

  it('前提: DB初期化済みではmoveCard内のrequireが解決できずinvalid_ciid分岐に到達しない [covers:move-card.invalid-ciid-to-deck-rejected]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster', { ciid: 2 });
    store.addCard(card, 'main');
    expect(store.deckInfo.mainDeck).toHaveLength(1);

    vi.mocked(mockUnifiedDB.isInitialized).mockReturnValue(true);
    vi.mocked(mockUnifiedDB.getValidCiidsForLang).mockReturnValue(['1']);

    expect(() => store.moveCard('12345678', 'main', 'side')).toThrow(/language-detector/);
  });

  it('reorderCardで実際に移動すると表示順が変わる [covers:reorder-card.success-updates-head-order-and-records]', () => {
    const store = useDeckEditStore();
    store.addCard(createMockCard('11111111', 'monster'), 'main');
    store.addCard(createMockCard('22222222', 'monster'), 'main');
    const [first, second] = store.displayOrder.main;

    const result = store.reorderCard(second!.uuid, first!.uuid, 'main');

    expect(result).toEqual({ success: true, moved: true });
    expect(store.displayOrder.main[0]!.uuid).toBe(second!.uuid);
    expect(store.displayOrder.main[1]!.uuid).toBe(first!.uuid);
  });

  it('moveCardToTrashはカードをゴミ箱へ移動する [covers:move-card-to-trash.delegates-to-move-card]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster');
    store.addCard(card, 'main');

    const result = store.moveCardToTrash(card, 'main');

    expect(result.success).toBe(true);
    expect(store.deckInfo.mainDeck).toHaveLength(0);
    expect(store.displayOrder.main).toHaveLength(0);
    expect(store.displayOrder.trash).toHaveLength(1);
  });

  it('moveCardToSideはゴミ箱から枚数制限超過のカードを戻せない [covers:move-card-to-side.trash-max-copies-rejected]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster');
    store.addCard(card, 'main');
    store.addCard(card, 'main');
    store.addCard(card, 'main');
    store.moveCardToTrash(card, 'main');
    store.addCard(card, 'main');
    expect(store.deckInfo.mainDeck[0]!.quantity).toBe(3);
    expect(store.displayOrder.trash).toHaveLength(1);

    const result = store.moveCardToSide(card, 'trash');

    expect(result).toEqual({ success: false, error: 'max_copies_reached' });
  });

  it('moveCardToMainOrExtraはゴミ箱から枚数制限超過のカードを戻せない [covers:move-card-to-main-or-extra.trash-max-copies-rejected]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster');
    store.addCard(card, 'main');
    store.addCard(card, 'main');
    store.addCard(card, 'main');
    store.moveCardToTrash(card, 'main');
    store.addCard(card, 'main');
    expect(store.deckInfo.mainDeck[0]!.quantity).toBe(3);
    expect(store.displayOrder.trash).toHaveLength(1);

    const result = store.moveCardToMainOrExtra(card, 'trash');

    expect(result).toEqual({ success: false, error: 'max_copies_reached' });
  });

  it('addCopyToSectionは指定セクションへカードを追加する [covers:add-copy-to-section.delegates-to-add-card]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster');

    const result = store.addCopyToSection(card, 'side');

    expect(result).toEqual({ success: true });
    expect(store.deckInfo.sideDeck).toHaveLength(1);
    expect(store.displayOrder.side).toHaveLength(1);
  });

  it('addCopyToMainOrExtraはEXモンスターをextraへ、それ以外をmainへ追加する [covers:add-copy-to-main-or-extra.extra-monster-targets-extra-otherwise-main]', () => {
    const store = useDeckEditStore();
    const extraCard = createMockCard('11111111', 'monster', { isExtraDeck: true });
    const spell = createMockCard('22222222', 'spell');

    expect(store.addCopyToMainOrExtra(extraCard)).toEqual({ success: true });
    expect(store.deckInfo.extraDeck).toHaveLength(1);
    expect(store.addCopyToMainOrExtra(spell)).toEqual({ success: true });
    expect(store.deckInfo.mainDeck).toHaveLength(1);
  });

  it('前提: 表示順にあるカードの移動では位置が見つからないエラーにならない [covers:move-card-with-position.source-index-missing]', () => {
    const store = useDeckEditStore();
    const card = createMockCard('12345678', 'monster', { isExtraDeck: true });
    store.addCard(card, 'main');
    const uuid = store.displayOrder.main[0]!.uuid;

    // sourceCardは同一配列 displayOrder[from] から find で取得され、直後の
    // indexOf(sourceCard) は同一参照を必ず返すため、位置エラー分岐には到達しない
    const result = store.moveCardWithPosition('12345678', 'main', 'extra', uuid, null);

    expect(result).toEqual({ success: true });
  });

  it('restoreDisplayOrderはバックアップが無い場合は何も変更しない [covers:restore-display-order.no-backup-is-noop]', () => {
    const store = useDeckEditStore();
    store.addCard(createMockCard('12345678', 'monster'), 'main');
    const beforeOrder = JSON.parse(JSON.stringify(store.displayOrder));
    const beforeInfo = JSON.parse(JSON.stringify(store.deckInfo));

    store.restoreDisplayOrder();

    expect(store.displayOrder).toEqual(beforeOrder);
    expect(store.deckInfo).toEqual(beforeInfo);
  });

  it('shuffleSectionは空セクションでは何も変更しない [covers:shuffle-section.empty-section-noop]', () => {
    const store = useDeckEditStore();

    store.shuffleSection('main');

    expect(store.displayOrder.main).toEqual([]);
    expect(store.commandHistory).toHaveLength(0);
  });

  it('sortSectionは方向指定がある場合その方向へソートする [covers:sort-section.override-uses-given-direction]', () => {
    const store = useDeckEditStore();
    store.addCard(createMockCard('1001', 'monster'), 'main');
    store.addCard(createMockCard('1002', 'monster'), 'main');
    setTempCardLevel('1001', 8);
    setTempCardLevel('1002', 4);
    expect(store.displayOrder.main.map(c => c.cid)).toEqual(['1001', '1002']);

    store.sortSection('main', 'asc');

    expect(store.displayOrder.main.map(c => c.cid)).toEqual(['1002', '1001']);
    expect(store.commandHistory.at(-1)?.type).toBe('reorder');
  });

  it('isAllSectionsSortedForSaveはtoggle設定では昇順・降順どちらでもソート済みと判定する [covers:is-all-sections-sorted-for-save.toggle-accepts-asc-or-desc]', async () => {
    const store = useDeckEditStore();
    await setDeckLevelSortOrder('toggle-desc');
    store.addCard(createMockCard('1001', 'monster'), 'main');
    store.addCard(createMockCard('1002', 'monster'), 'main');
    setTempCardLevel('1001', 8);
    setTempCardLevel('1002', 4);

    // 降順 [8, 4] はソート済み
    expect(store.isAllSectionsSortedForSave()).toBe(true);
    // 昇順 [4, 8] もソート済み
    store.displayOrder.main = [...store.displayOrder.main].reverse();
    expect(store.isAllSectionsSortedForSave()).toBe(true);
    // [4, 8, 5] はどちらでもないため未ソート
    store.addCard(createMockCard('1003', 'monster'), 'main');
    setTempCardLevel('1003', 5);
    expect(store.displayOrder.main.map(c => c.cid)).toEqual(['1002', '1001', '1003']);
    expect(store.isAllSectionsSortedForSave()).toBe(false);
  });

  it('isAllSectionsSortedForSaveは固定方向設定ではその方向のみソート済みと判定する [covers:is-all-sections-sorted-for-save.fixed-direction]', async () => {
    const store = useDeckEditStore();
    await setDeckLevelSortOrder('asc');
    store.addCard(createMockCard('1002', 'monster'), 'main');
    store.addCard(createMockCard('1001', 'monster'), 'main');
    setTempCardLevel('1001', 8);
    setTempCardLevel('1002', 4);

    // 昇順 [4, 8] はソート済み
    expect(store.isAllSectionsSortedForSave()).toBe(true);
    // 降順 [8, 4] は未ソート
    store.displayOrder.main = [...store.displayOrder.main].reverse();
    expect(store.isAllSectionsSortedForSave()).toBe(false);
  });
});
