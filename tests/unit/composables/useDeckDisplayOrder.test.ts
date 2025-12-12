import { describe, it, expect, beforeEach } from 'vitest';
import {
  addToDisplayOrder,
  removeFromDisplayOrder,
  moveInDisplayOrder,
  reorderWithinSection,
  fisherYatesShuffle,
  type DisplayOrderState,
  type DeckState,
  type UUIDGenerator
} from '../../../src/composables/deck/useDeckDisplayOrder';
import type { CardInfo } from '../../../src/types/card';

describe('useDeckDisplayOrder', () => {
  let displayOrder: DisplayOrderState;
  let deckState: DeckState;
  let uuidCounter: number;
  const generateUUID: UUIDGenerator = (cid: string, ciid: number) => {
    return `${cid}_${ciid}_${uuidCounter++}`;
  };

  // テスト用カードデータ
  const sampleMonster: CardInfo = {
    cardId: '4831',
    ciid: 0,
    imgs: '4831_0',
    name: 'ブラック・マジシャン',
    cardType: 'monster',
    attribute: 'dark',
    level: 7,
    race: 'spellcaster',
    atkDef: '2500/2100',
    monsterTypes: ['normal']
  };

  const sampleSpell: CardInfo = {
    cardId: '5851',
    ciid: 0,
    imgs: '5851_0',
    name: '死者蘇生',
    cardType: 'spell',
    spellType: 'normal'
  };

  beforeEach(() => {
    uuidCounter = 0;
    displayOrder = {
      main: [],
      extra: [],
      side: [],
      trash: []
    };
    deckState = {
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      trashDeck: []
    };
  });

  describe('addToDisplayOrder', () => {
    it('新しいカードを末尾に追加する', () => {
      const result = addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);

      expect(displayOrder.main).toHaveLength(1);
      expect(displayOrder.main[0]?.cid).toBe('4831');
      expect(displayOrder.main[0]?.ciid).toBe(0);
      expect(result.insertedIndex).toBe(0);
      expect(result.uuid).toBe('4831_0_0');

      // deckStateも更新されていること
      expect(deckState.mainDeck).toHaveLength(1);
      expect(deckState.mainDeck[0]?.cid).toBe('4831');
      expect(deckState.mainDeck[0]?.quantity).toBe(1);
    });

    it('同じカードを複数枚追加した場合、同じcidの最後に追加する', () => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);

      expect(displayOrder.main).toHaveLength(3);
      expect(displayOrder.main[0]?.cid).toBe('4831');
      expect(displayOrder.main[1]?.cid).toBe('4831');
      expect(displayOrder.main[2]?.cid).toBe('4831');

      // deckStateではquantityが増える
      expect(deckState.mainDeck).toHaveLength(1);
      expect(deckState.mainDeck[0]?.quantity).toBe(3);
    });

    it('異なるカードを追加した場合、末尾に追加される', () => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleSpell, 'main', generateUUID);

      expect(displayOrder.main).toHaveLength(2);
      expect(displayOrder.main[0]?.cid).toBe('4831');
      expect(displayOrder.main[1]?.cid).toBe('5851');

      expect(deckState.mainDeck).toHaveLength(2);
    });

    it('異なるセクションに追加できる', () => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleSpell, 'extra', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'side', generateUUID);

      expect(displayOrder.main).toHaveLength(1);
      expect(displayOrder.extra).toHaveLength(1);
      expect(displayOrder.side).toHaveLength(1);

      expect(deckState.mainDeck).toHaveLength(1);
      expect(deckState.extraDeck).toHaveLength(1);
      expect(deckState.sideDeck).toHaveLength(1);
    });
  });

  describe('removeFromDisplayOrder', () => {
    beforeEach(() => {
      // 事前にカードを3枚追加
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
    });

    it('UUIDなしで削除すると最後の1枚を削除する', () => {
      const result = removeFromDisplayOrder(displayOrder, deckState, '4831', 'main');

      expect(displayOrder.main).toHaveLength(2);
      expect(result.removedIndex).toBe(2);
      expect(deckState.mainDeck[0]?.quantity).toBe(2);
    });

    it('UUIDを指定して削除できる', () => {
      const uuid = displayOrder.main[1]?.uuid;
      const result = removeFromDisplayOrder(displayOrder, deckState, '4831', 'main', uuid);

      expect(displayOrder.main).toHaveLength(2);
      expect(result.removedIndex).toBe(1);
      expect(displayOrder.main[0]?.uuid).toBe('4831_0_0');
      expect(displayOrder.main[1]?.uuid).toBe('4831_0_2');
    });

    it('最後の1枚を削除するとdeckStateからも削除される', () => {
      removeFromDisplayOrder(displayOrder, deckState, '4831', 'main');
      removeFromDisplayOrder(displayOrder, deckState, '4831', 'main');
      removeFromDisplayOrder(displayOrder, deckState, '4831', 'main');

      expect(displayOrder.main).toHaveLength(0);
      expect(deckState.mainDeck).toHaveLength(0);
    });
  });

  describe('moveInDisplayOrder', () => {
    beforeEach(() => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleSpell, 'main', generateUUID);
    });

    it('同じセクション内で移動できる', () => {
      const uuid = displayOrder.main[0]?.uuid;
      const result = moveInDisplayOrder(displayOrder, deckState, '4831', 'main', 'main', uuid, 1);

      expect(result).toBeDefined();
      expect(result?.fromIndex).toBe(0);
      expect(result?.toIndex).toBe(1);
      expect(displayOrder.main).toHaveLength(2);
      expect(displayOrder.main[1]?.cid).toBe('4831');
    });

    it('異なるセクション間で移動できる', () => {
      const uuid = displayOrder.main[0]?.uuid;
      const result = moveInDisplayOrder(displayOrder, deckState, '4831', 'main', 'side', uuid);

      expect(result).toBeDefined();
      expect(displayOrder.main).toHaveLength(1);
      expect(displayOrder.side).toHaveLength(1);
      expect(displayOrder.side[0]?.cid).toBe('4831');

      // deckStateも更新されている
      expect(deckState.mainDeck).toHaveLength(1);
      expect(deckState.sideDeck).toHaveLength(1);
    });

    it('UUIDなしで移動すると最後の1枚を移動する', () => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      const result = moveInDisplayOrder(displayOrder, deckState, '4831', 'main', 'extra');

      expect(result).toBeDefined();
      expect(displayOrder.main).toHaveLength(2);
      expect(displayOrder.extra).toHaveLength(1);
    });

    it('存在しないUUIDで移動を試みると失敗する', () => {
      const result = moveInDisplayOrder(displayOrder, deckState, '4831', 'main', 'side', 'invalid-uuid');

      expect(result).toBeUndefined();
      expect(displayOrder.main).toHaveLength(2);
      expect(displayOrder.side).toHaveLength(0);
    });
  });

  describe('reorderWithinSection', () => {
    beforeEach(() => {
      addToDisplayOrder(displayOrder, deckState, sampleMonster, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, sampleSpell, 'main', generateUUID);
      addToDisplayOrder(displayOrder, deckState, { ...sampleMonster, cardId: '1001' }, 'main', generateUUID);
    });

    it('前方から後方へ移動できる', () => {
      const result = reorderWithinSection(displayOrder, 'main', 0, 2);

      expect(result).toBeDefined();
      expect(displayOrder.main[0]?.cid).toBe('5851');
      expect(displayOrder.main[1]?.cid).toBe('4831');
      expect(displayOrder.main[2]?.cid).toBe('1001');
    });

    it('後方から前方へ移動できる', () => {
      const result = reorderWithinSection(displayOrder, 'main', 2, 0);

      expect(result).toBeDefined();
      expect(displayOrder.main[0]?.cid).toBe('1001');
      expect(displayOrder.main[1]?.cid).toBe('4831');
      expect(displayOrder.main[2]?.cid).toBe('5851');
    });

    it('無効なインデックスでは失敗する', () => {
      const result = reorderWithinSection(displayOrder, 'main', -1, 0);
      expect(result).toBeUndefined();

      const result2 = reorderWithinSection(displayOrder, 'main', 0, 10);
      expect(result2).toBeUndefined();
    });
  });

  describe('fisherYatesShuffle', () => {
    it('配列をシャッフルする', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = fisherYatesShuffle(original);

      // 長さは変わらない
      expect(shuffled).toHaveLength(original.length);

      // 要素は同じ（ソート後に比較）
      expect([...shuffled].sort()).toEqual([...original].sort());

      // 元の配列は変更されない
      expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('空配列をシャッフルしても問題ない', () => {
      const shuffled = fisherYatesShuffle([]);
      expect(shuffled).toEqual([]);
    });

    it('1要素の配列をシャッフルしても変わらない', () => {
      const shuffled = fisherYatesShuffle([1]);
      expect(shuffled).toEqual([1]);
    });
  });
});
