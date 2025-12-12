/**
 * useDeckDisplayOrder.ts テスト
 *
 * デッキカード表示順序管理の Composable テスト
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import {
  addToDisplayOrder,
  removeFromDisplayOrder,
  fisherYatesShuffle,
  type DisplayOrderState,
  type DeckState,
  type UUIDGenerator
} from '@/composables/deck/useDeckDisplayOrder';
import type { CardInfo } from '@/types/card';

describe('useDeckDisplayOrder', () => {
  describe('addToDisplayOrder', () => {
    it('新しいカードをメインデッキに追加できる', () => {
      const displayOrder: DisplayOrderState = {
        main: [],
        extra: [],
        side: [],
        trash: []
      };
      const deckState: DeckState = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        trashDeck: []
      };
      const card: CardInfo = {
        cardId: '12345',
        ciid: '1',
        name: 'テストカード',
        lang: 'ja'
      } as CardInfo;
      const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

      const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

      expect(result.insertedIndex).toBe(0);
      expect(result.uuid).toBe('12345-1-uuid');
      expect(displayOrder.main).toHaveLength(1);
      expect(displayOrder.main[0]?.cid).toBe('12345');
    });

    it('既存のカードの枚数を増やせる', () => {
      const displayOrder: DisplayOrderState = {
        main: [{ cid: '12345', ciid: 1, uuid: '12345-1-uuid-1' }],
        extra: [],
        side: [],
        trash: []
      };
      const deckState: DeckState = {
        mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 1 }],
        extraDeck: [],
        sideDeck: [],
        trashDeck: []
      };
      const card: CardInfo = {
        cardId: '12345',
        ciid: '1',
        name: 'テストカード',
        lang: 'ja'
      } as CardInfo;
      const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-2`;

      const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

      expect(result.insertedIndex).toBe(1);
      expect(displayOrder.main).toHaveLength(2);
      expect(deckState.mainDeck[0]?.quantity).toBe(2);
    });

    it('エクストラデッキにカードを追加できる', () => {
      const displayOrder: DisplayOrderState = {
        main: [],
        extra: [],
        side: [],
        trash: []
      };
      const deckState: DeckState = {
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        trashDeck: []
      };
      const card: CardInfo = {
        cardId: '67890',
        ciid: '1',
        name: 'エクストラカード',
        lang: 'ja'
      } as CardInfo;
      const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

      const result = addToDisplayOrder(displayOrder, deckState, card, 'extra', generateUUID);

      expect(result.insertedIndex).toBe(0);
      expect(displayOrder.extra).toHaveLength(1);
      expect(displayOrder.extra[0]?.cid).toBe('67890');
    });
  });

  describe('removeFromDisplayOrder', () => {
    it('メインデッキからカードを削除できる', () => {
      const displayOrder: DisplayOrderState = {
        main: [{ cid: '12345', ciid: 1, uuid: '12345-1-uuid' }],
        extra: [],
        side: [],
        trash: []
      };
      const deckState: DeckState = {
        mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 1 }],
        extraDeck: [],
        sideDeck: [],
        trashDeck: []
      };

      const result = removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

      expect(result.removedIndex).toBeGreaterThanOrEqual(0);
      expect(displayOrder.main).toHaveLength(0);
    });

    it('複数枚のカードから1枚だけ削除できる', () => {
      const displayOrder: DisplayOrderState = {
        main: [
          { cid: '12345', ciid: 1, uuid: '12345-1-uuid-1' },
          { cid: '12345', ciid: 1, uuid: '12345-1-uuid-2' }
        ],
        extra: [],
        side: [],
        trash: []
      };
      const deckState: DeckState = {
        mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 2 }],
        extraDeck: [],
        sideDeck: [],
        trashDeck: []
      };

      const result = removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

      expect(displayOrder.main).toHaveLength(1);
      expect(deckState.mainDeck[0]?.quantity).toBe(1);
    });
  });

  describe('fisherYatesShuffle', () => {
    it('配列をシャッフルできる', () => {
      const originalArray = [1, 2, 3, 4, 5];
      const shuffled = fisherYatesShuffle([...originalArray]);

      expect(shuffled).toHaveLength(originalArray.length);
      expect(shuffled.sort()).toEqual(originalArray.sort());
    });

    it('空の配列を処理できる', () => {
      const emptyArray: number[] = [];
      const shuffled = fisherYatesShuffle([...emptyArray]);

      expect(shuffled).toEqual([]);
    });

    it('1要素の配列を処理できる', () => {
      const singleArray = [1];
      const shuffled = fisherYatesShuffle([...singleArray]);

      expect(shuffled).toEqual([1]);
    });
  });

  // ========================================
  // 低優先度テスト（45個）
  // ========================================
  describe('低優先度: エッジケースとエラーハンドリング', () => {
    describe('addToDisplayOrder - 拡張ケース', () => {
      it('サイドデッキにカードを追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '11111',
          ciid: '1',
          name: 'サイドカード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'side', generateUUID);

        expect(result.insertedIndex).toBe(0);
        expect(displayOrder.side).toHaveLength(1);
        expect(displayOrder.side[0]?.cid).toBe('11111');
      });

      it('ゴミ箱にカードを追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '22222',
          ciid: '1',
          name: 'ゴミ箱カード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'trash', generateUUID);

        expect(result.insertedIndex).toBe(0);
        expect(displayOrder.trash).toHaveLength(1);
      });

      it('異なるciidを持つ同一CIDのカードを追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [{ cid: '12345', ciid: 1, uuid: '12345-1-uuid' }],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 1 }],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '2',
          name: 'テストカード別イラスト',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(displayOrder.main).toHaveLength(2);
        expect(deckState.mainDeck).toHaveLength(2);
      });

      it('大量のカードを追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${Math.random()}`;

        for (let i = 0; i < 500; i++) {
          const card: CardInfo = {
            cardId: `${100000 + i}`,
            ciid: '1',
            name: `カード${i}`,
            lang: 'ja'
          } as CardInfo;
          addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        }

        expect(displayOrder.main).toHaveLength(500);
        expect(deckState.mainDeck).toHaveLength(500);
      });

      it('特殊文字を含むカードIDを処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: 'card@#$-123',
          ciid: '1',
          name: '特殊カード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(result.uuid).toBe('card@#$-123-1-uuid');
      });

      it('ciidが数値の場合に正しく処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '99',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(result.uuid).toBe('12345-99-uuid');
      });

      it('同じカードを連続で追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        let uuidCounter = 0;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${++uuidCounter}`;

        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(displayOrder.main).toHaveLength(3);
        expect(deckState.mainDeck[0]?.quantity).toBe(3);
      });

      it('空のカード名でも追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: '',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(displayOrder.main).toHaveLength(1);
      });

      it('複数のセクションに同じカードを追加できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${Math.random()}`;

        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'side', generateUUID);

        expect(displayOrder.main).toHaveLength(1);
        expect(displayOrder.side).toHaveLength(1);
      });

      it('非常に長いカード名でも処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const longName = 'カード'.repeat(500);
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: longName,
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid`;

        const result = addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);

        expect(displayOrder.main).toHaveLength(1);
      });
    });

    describe('removeFromDisplayOrder - 拡張ケース', () => {
      it('エクストラデッキからカードを削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [{ cid: '67890', ciid: 1, uuid: '67890-1-uuid' }],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [{ cid: '67890', ciid: '1', lang: 'ja', quantity: 1 }],
          sideDeck: [],
          trashDeck: []
        };

        const result = removeFromDisplayOrder(displayOrder, deckState, '67890', 'extra');

        expect(displayOrder.extra).toHaveLength(0);
        expect(deckState.extraDeck).toHaveLength(0);
      });

      it('サイドデッキからカードを削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [{ cid: '11111', ciid: 1, uuid: '11111-1-uuid' }],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [{ cid: '11111', ciid: '1', lang: 'ja', quantity: 1 }],
          trashDeck: []
        };

        const result = removeFromDisplayOrder(displayOrder, deckState, '11111', 'side');

        expect(displayOrder.side).toHaveLength(0);
      });

      it('存在しないカードを削除しようとしても安全に処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [{ cid: '12345', ciid: 1, uuid: '12345-1-uuid' }],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 1 }],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        const result = removeFromDisplayOrder(displayOrder, deckState, '99999', 'main');

        expect(result.removedIndex).toBe(-1);
        expect(displayOrder.main).toHaveLength(1);
      });

      it('3枚のカードから1枚削除すると2枚残る', () => {
        const displayOrder: DisplayOrderState = {
          main: [
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-1' },
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-2' },
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-3' }
          ],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 3 }],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

        expect(displayOrder.main).toHaveLength(2);
        expect(deckState.mainDeck[0]?.quantity).toBe(2);
      });

      it('大量のカードから削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: Array.from({ length: 500 }, (_, i) => ({
            cid: `${100000 + i}`,
            ciid: 1,
            uuid: `${100000 + i}-1-uuid`
          })),
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: Array.from({ length: 500 }, (_, i) => ({
            cid: `${100000 + i}`,
            ciid: '1',
            lang: 'ja',
            quantity: 1
          })),
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        removeFromDisplayOrder(displayOrder, deckState, '100000', 'main');

        expect(displayOrder.main).toHaveLength(499);
        expect(deckState.mainDeck).toHaveLength(499);
      });

      it('異なるciidを持つカードが混在している場合でも正しく削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-1' },
            { cid: '12345', ciid: 2, uuid: '12345-2-uuid-1' },
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-2' }
          ],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [
            { cid: '12345', ciid: '1', lang: 'ja', quantity: 2 },
            { cid: '12345', ciid: '2', lang: 'ja', quantity: 1 }
          ],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

        expect(displayOrder.main).toHaveLength(2);
      });

      it('空のセクションからカードを削除しようとしても安全に処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        const result = removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

        expect(result.removedIndex).toBe(-1);
        expect(displayOrder.main).toHaveLength(0);
      });

      it('特殊文字を含むカードIDでも削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [{ cid: 'card@#$-123', ciid: 1, uuid: 'card@#$-123-1-uuid' }],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [{ cid: 'card@#$-123', ciid: '1', lang: 'ja', quantity: 1 }],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        removeFromDisplayOrder(displayOrder, deckState, 'card@#$-123', 'main');

        expect(displayOrder.main).toHaveLength(0);
      });

      it('ゴミ箱からカードを削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: [{ cid: '22222', ciid: 1, uuid: '22222-1-uuid' }]
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: [{ cid: '22222', ciid: '1', lang: 'ja', quantity: 1 }]
        };

        removeFromDisplayOrder(displayOrder, deckState, '22222', 'trash');

        expect(displayOrder.trash).toHaveLength(0);
      });

      it('連続で削除できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-1' },
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-2' },
            { cid: '12345', ciid: 1, uuid: '12345-1-uuid-3' }
          ],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [{ cid: '12345', ciid: '1', lang: 'ja', quantity: 3 }],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');
        removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

        expect(displayOrder.main).toHaveLength(1);
        expect(deckState.mainDeck[0]?.quantity).toBe(1);
      });
    });

    describe('fisherYatesShuffle - 拡張ケース', () => {
      it('2要素の配列をシャッフルできる', () => {
        const array = [1, 2];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(2);
        expect(shuffled.sort()).toEqual([1, 2]);
      });

      it('大量の要素をシャッフルできる', () => {
        const array = Array.from({ length: 1000 }, (_, i) => i);
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(1000);
        expect(shuffled.sort((a, b) => a - b)).toEqual(array);
      });

      it('シャッフル後も元の配列が変更されない', () => {
        const original = [1, 2, 3, 4, 5];
        const copy = [...original];
        fisherYatesShuffle(copy);

        // copy は変更される（シャッフルされる）
        expect(copy.sort()).toEqual(original.sort());
      });

      it('オブジェクトの配列をシャッフルできる', () => {
        const array = [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
          { id: 3, name: 'C' }
        ];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(3);
        expect(shuffled.map(item => item.id).sort()).toEqual([1, 2, 3]);
      });

      it('文字列の配列をシャッフルできる', () => {
        const array = ['a', 'b', 'c', 'd', 'e'];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(5);
        expect(shuffled.sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
      });

      it('重複要素を含む配列をシャッフルできる', () => {
        const array = [1, 1, 2, 2, 3, 3];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(6);
        expect(shuffled.sort()).toEqual([1, 1, 2, 2, 3, 3]);
      });

      it('nullを含む配列をシャッフルできる', () => {
        const array = [1, null, 2, null, 3];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(5);
        expect(shuffled.filter(x => x === null)).toHaveLength(2);
      });

      it('undefinedを含む配列をシャッフルできる', () => {
        const array = [1, undefined, 2, undefined, 3];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(5);
        expect(shuffled.filter(x => x === undefined)).toHaveLength(2);
      });

      it('混在型の配列をシャッフルできる', () => {
        const array = [1, 'a', { id: 1 }, null, undefined];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(5);
      });

      it('同じ配列を複数回シャッフルすると異なる結果になる可能性がある', () => {
        const array = Array.from({ length: 100 }, (_, i) => i);
        const shuffled1 = fisherYatesShuffle([...array]);
        const shuffled2 = fisherYatesShuffle([...array]);

        // 確率的にほぼ確実に異なる結果になる
        const isDifferent = shuffled1.some((val, idx) => val !== shuffled2[idx]);
        expect(isDifferent).toBe(true);
      });

      it('ネストされた配列をシャッフルできる', () => {
        const array = [[1, 2], [3, 4], [5, 6]];
        const shuffled = fisherYatesShuffle([...array]);

        expect(shuffled).toHaveLength(3);
        expect(shuffled.flat().sort()).toEqual([1, 2, 3, 4, 5, 6]);
      });
    });

    describe('エッジケース - データ整合性', () => {
      it('displayOrderとdeckStateの整合性を保つ', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${Math.random()}`;

        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        removeFromDisplayOrder(displayOrder, deckState, '12345', 'main');

        expect(displayOrder.main).toHaveLength(1);
        expect(deckState.mainDeck[0]?.quantity).toBe(1);
      });

      it('複数セクション間での整合性を保つ', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${Math.random()}`;

        addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'extra', generateUUID);
        addToDisplayOrder(displayOrder, deckState, card, 'side', generateUUID);

        expect(displayOrder.main).toHaveLength(1);
        expect(displayOrder.extra).toHaveLength(1);
        expect(displayOrder.side).toHaveLength(1);
      });

      it('UUIDの一意性を保つ', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const card: CardInfo = {
          cardId: '12345',
          ciid: '1',
          name: 'テストカード',
          lang: 'ja'
        } as CardInfo;
        const uuids = new Set<string>();
        const generateUUID: UUIDGenerator = (cid, ciid) => {
          const uuid = `${cid}-${ciid}-uuid-${Math.random()}`;
          uuids.add(uuid);
          return uuid;
        };

        for (let i = 0; i < 100; i++) {
          addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        }

        expect(uuids.size).toBe(100);
      });
    });

    describe('エッジケース - パフォーマンス', () => {
      it('大規模デッキの追加が高速に処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: [],
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: [],
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };
        const generateUUID: UUIDGenerator = (cid, ciid) => `${cid}-${ciid}-uuid-${Math.random()}`;

        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          const card: CardInfo = {
            cardId: `${100000 + i}`,
            ciid: '1',
            name: `カード${i}`,
            lang: 'ja'
          } as CardInfo;
          addToDisplayOrder(displayOrder, deckState, card, 'main', generateUUID);
        }
        const endTime = Date.now();

        expect(displayOrder.main).toHaveLength(1000);
        // パフォーマンステスト: 1000枚追加が1秒以内に完了すること
        expect(endTime - startTime).toBeLessThan(1000);
      });

      it('大規模デッキの削除が高速に処理できる', () => {
        const displayOrder: DisplayOrderState = {
          main: Array.from({ length: 1000 }, (_, i) => ({
            cid: `${100000 + i}`,
            ciid: 1,
            uuid: `${100000 + i}-1-uuid`
          })),
          extra: [],
          side: [],
          trash: []
        };
        const deckState: DeckState = {
          mainDeck: Array.from({ length: 1000 }, (_, i) => ({
            cid: `${100000 + i}`,
            ciid: '1',
            lang: 'ja',
            quantity: 1
          })),
          extraDeck: [],
          sideDeck: [],
          trashDeck: []
        };

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          removeFromDisplayOrder(displayOrder, deckState, `${100000 + i}`, 'main');
        }
        const endTime = Date.now();

        expect(displayOrder.main).toHaveLength(900);
        // パフォーマンステスト: 100枚削除が1秒以内に完了すること
        expect(endTime - startTime).toBeLessThan(1000);
      });

      it('大規模配列のシャッフルが高速に処理できる', () => {
        const array = Array.from({ length: 10000 }, (_, i) => i);

        const startTime = Date.now();
        fisherYatesShuffle([...array]);
        const endTime = Date.now();

        // パフォーマンステスト: 10000要素のシャッフルが100ms以内に完了すること
        expect(endTime - startTime).toBeLessThan(100);
      });
    });
  });
});
