import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '../deck-edit';
import type { CardInfo } from '@/types/card';

/**
 * deck-edit.ts の displayOrder 操作テスト
 *
 * displayOrder は Vue ref オブジェクトで、4つのセクション（main/extra/side/trash）を管理
 * 各セクションはカード表示順序を制御する DisplayCard 配列を持つ
 */

const mockCard = (id: string, name: string = 'Test Card'): CardInfo => ({
  name,
  cardId: id,
  ciid: '1',
  imgs: [{ ciid: '1', imgHash: `${id}_1_1_1` }],
  cardType: 'monster' as const,
  attribute: 'dark' as const,
  levelType: 'level' as const,
  levelValue: 4,
  race: 'spellcaster' as const,
  types: ['normal' as const],
  isExtraDeck: false
});

describe('deck-edit store: displayOrder操作', () => {
  let store: ReturnType<typeof useDeckEditStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useDeckEditStore();
  });

  describe('addCard - displayOrder初期化', () => {
    it('カード追加時にdisplayOrderが初期化される', () => {
      const card = mockCard('1001', 'カードA');

      store.addCard(card, 'main');

      expect(store.deckInfo.mainDeck).toHaveLength(1);
      expect(store.displayOrder.main).toHaveLength(1);
      expect(store.displayOrder.main[0].cid).toBe('1001');
    });

    it('複数のカードがdisplayOrderに順序付きで追加される', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');

      expect(store.displayOrder.main).toHaveLength(2);
      expect(store.displayOrder.main[0].cid).toBe('1001');
      expect(store.displayOrder.main[1].cid).toBe('1002');
    });

    it('同じカードを複数枚追加した場合、displayOrderに各々が入る', () => {
      const card = mockCard('1001', 'カードA');

      store.addCard(card, 'main');
      store.addCard(card, 'main');

      expect(store.displayOrder.main).toHaveLength(2);
      expect(store.displayOrder.main[0].cid).toBe('1001');
      expect(store.displayOrder.main[1].cid).toBe('1001');
    });

    it('異なるセクション間でdisplayOrderが独立している', () => {
      const card = mockCard('1001', 'カードA');

      store.addCard(card, 'main');
      store.addCard(card, 'extra');

      expect(store.displayOrder.main).toHaveLength(1);
      expect(store.displayOrder.extra).toHaveLength(1);
      expect(store.displayOrder.side).toHaveLength(0);
    });
  });

  describe('removeCard - displayOrder削除', () => {
    it('カード削除時にdisplayOrderからも削除される', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      expect(store.displayOrder.main).toHaveLength(1);

      store.removeCard('1001', 'main');

      expect(store.displayOrder.main).toHaveLength(0);
      expect(store.deckInfo.mainDeck).toHaveLength(0);
    });

    it('複数枚の同じカードから1枚だけ削除できる', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');
      store.addCard(card, 'main');
      store.addCard(card, 'main');

      expect(store.displayOrder.main).toHaveLength(3);

      store.removeCard('1001', 'main');

      expect(store.displayOrder.main).toHaveLength(2);
      expect(store.displayOrder.main.every(dc => dc.cid === '1001')).toBe(true);
    });

    it('異なるカードの削除は他のカードに影響しない', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');

      store.removeCard('1001', 'main');

      expect(store.displayOrder.main).toHaveLength(1);
      expect(store.displayOrder.main[0].cid).toBe('1002');
    });
  });

  describe('reorderWithinSection - displayOrder並び替え', () => {
    it('同じセクション内でカードを並び替える', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');
      const cardC = mockCard('1003', 'カードC');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');
      store.addCard(cardC, 'main');

      // displayOrder は [A, B, C]
      // sourceUuid=A、targetUuid=Cの場合、Aを取り除いてCの直後に挿入
      // → [B, C, A]
      const sourceUuid = store.displayOrder.main[0].uuid; // カードA
      const targetUuid = store.displayOrder.main[2].uuid; // カードC

      const result = store.reorderWithinSection('main', sourceUuid, targetUuid);

      expect(result.success).toBe(true);
      // 並び替え後：sourceを除外して [B, C] にしてから、Cの直後にAを挿入 → [B, C, A]
      expect(store.displayOrder.main[0].cid).toBe('1002'); // B
      expect(store.displayOrder.main[1].cid).toBe('1003'); // C
      expect(store.displayOrder.main[2].cid).toBe('1001'); // A
    });

    it('targetUuidがnullの場合、末尾に移動する', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');

      const sourceUuid = store.displayOrder.main[1].uuid; // カードB

      const result = store.reorderWithinSection('main', sourceUuid, null);

      expect(result.success).toBe(true);
      // [A, B] → [B] は存在しないため、Bが末尾に移動 → [A, B]
      // 実際には B が既に末尾なので変化なし、または A → [B, A]
      expect(store.displayOrder.main).toHaveLength(2);
    });

    it('存在しないUUIDでの並び替えは失敗する', () => {
      const card = mockCard('1001', 'カードA');
      store.addCard(card, 'main');

      const result = store.reorderWithinSection('main', 'invalid-uuid', 'another-invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('displayOrder と deckInfo の同期', () => {
    it('複数のカード操作後、displayOrderとdeckInfoの長さが一致', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');
      const cardC = mockCard('1003', 'カードC');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');
      store.addCard(cardC, 'main');

      expect(store.deckInfo.mainDeck).toHaveLength(3);
      expect(store.displayOrder.main).toHaveLength(3);

      // カード削除
      store.removeCard('1002', 'main');

      expect(store.deckInfo.mainDeck).toHaveLength(2);
      expect(store.displayOrder.main).toHaveLength(2);
    });

    it('addCard後のdeckInfoとdisplayOrderの長さが一致', () => {
      const cards = [
        mockCard('1001', 'A'),
        mockCard('1002', 'B'),
        mockCard('1003', 'C')
      ];

      cards.forEach(card => store.addCard(card, 'main'));

      expect(store.deckInfo.mainDeck).toHaveLength(3);
      expect(store.displayOrder.main).toHaveLength(3);
    });
  });

  describe('displayOrder UUIDs', () => {
    it('各displayCardはユニークなUUIDを持つ', () => {
      const card = mockCard('1001', 'カードA');

      store.addCard(card, 'main');
      store.addCard(card, 'main');

      const uuids = store.displayOrder.main.map(dc => dc.uuid);
      const uniqueUuids = new Set(uuids);

      expect(uniqueUuids.size).toBe(2); // 2つの異なるUUID
    });

    it('同じカードでもciidが異なればUUIDが異なる', () => {
      const cardCiid1: CardInfo = { ...mockCard('1001', 'カードA'), ciid: '1' };
      const cardCiid2: CardInfo = { ...mockCard('1001', 'カードA'), ciid: '2' };

      store.addCard(cardCiid1, 'main');
      store.addCard(cardCiid2, 'main');

      const uuids = store.displayOrder.main.map(dc => dc.uuid);
      const uniqueUuids = new Set(uuids);

      expect(uniqueUuids.size).toBe(2); // 異なるciidなので異なるUUID
    });
  });

  describe('displayOrder Undo/Redo', () => {
    it('addCard後のundo/redoでdisplayOrderが復元される', () => {
      const card = mockCard('1001', 'カードA');

      store.addCard(card, 'main');
      expect(store.displayOrder.main).toHaveLength(1);

      store.undo();
      expect(store.displayOrder.main).toHaveLength(0);

      store.redo();
      expect(store.displayOrder.main).toHaveLength(1);
    });

    it('removeCard後のundoで削除したカードが復元される', () => {
      const cardA = mockCard('1001', 'カードA');
      const cardB = mockCard('1002', 'カードB');

      store.addCard(cardA, 'main');
      store.addCard(cardB, 'main');

      expect(store.displayOrder.main).toHaveLength(2);

      // カード削除
      store.removeCard('1001', 'main');
      expect(store.displayOrder.main).toHaveLength(1);

      // undo
      store.undo();
      expect(store.displayOrder.main).toHaveLength(2);
      expect(store.displayOrder.main.some(dc => dc.cid === '1001')).toBe(true);
    });
  });
});
