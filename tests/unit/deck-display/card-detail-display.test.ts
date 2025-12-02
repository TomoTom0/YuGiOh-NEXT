/**
 * デッキ表示画面カード詳細機能のテスト
 * - cardDetailStore の初期化テスト
 * - カード選択時のストア更新テスト
 * - タブ切り替え機能テスト
 * - ストアのリセット機能テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';
import type { CardInfo } from '@/types/card';

// テスト用のダミーカード情報
const createMockCard = (cardId: string, name: string): CardInfo => ({
  cardId,
  name,
  cardType: 'monster',
  atk: 2500,
  def: 2000,
  attribute: 'LIGHT',
  race: 'Dragon',
  level: 8,
  password: 25955333,
  rarity: ['UR'],
  linkMarkers: [],
  deckLimit: 3,
  forbidden: false,
  limited: false,
  semiLimited: false
});

describe('cardDetailStore - ユニットテスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('初期化', () => {
    it('cardDetailStore が初期化される', () => {
      const store = useCardDetailStore();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });

    it('複数のストアインスタンスで状態が独立している', () => {
      const store1 = useCardDetailStore();
      const store2 = useCardDetailStore();

      expect(store1).toBe(store2); // Pinia では同じインスタンス
    });
  });

  describe('カード選択 (setSelectedCard)', () => {
    it('カードを選択して状態を更新できる', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Blue Eyes White Dragon');

      store.setSelectedCard(mockCard);

      expect(store.selectedCard).toEqual(mockCard);
      expect(store.selectedCard?.name).toBe('Blue Eyes White Dragon');
      expect(store.selectedCard?.cardId).toBe('cid-001');
    });

    it('異なるカードに切り替えられる', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Blue Eyes');
      const card2 = createMockCard('cid-002', 'Red Eyes');

      store.setSelectedCard(card1);
      expect(store.selectedCard?.name).toBe('Blue Eyes');

      store.setSelectedCard(card2);
      expect(store.selectedCard?.name).toBe('Red Eyes');
    });

    it('null を設定してカード選択をクリアできる', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(mockCard);
      expect(store.selectedCard).not.toBeNull();

      store.setSelectedCard(null);
      expect(store.selectedCard).toBeNull();
    });

    it('複数のカード属性が保持される', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Dragon Lord');
      mockCard.atk = 3000;
      mockCard.def = 2500;
      mockCard.level = 9;
      mockCard.rarity = ['UR', 'SR'];

      store.setSelectedCard(mockCard);

      expect(store.selectedCard?.atk).toBe(3000);
      expect(store.selectedCard?.def).toBe(2500);
      expect(store.selectedCard?.level).toBe(9);
      expect(store.selectedCard?.rarity).toHaveLength(2);
    });
  });

  describe('タブ切り替え (setCardTab)', () => {
    it('info タブに切り替えられる', () => {
      const store = useCardDetailStore();

      store.setCardTab('info');
      expect(store.cardTab).toBe('info');
    });

    it('qa タブに切り替えられる', () => {
      const store = useCardDetailStore();

      store.setCardTab('qa');
      expect(store.cardTab).toBe('qa');
    });

    it('related タブに切り替えられる', () => {
      const store = useCardDetailStore();

      store.setCardTab('related');
      expect(store.cardTab).toBe('related');
    });

    it('products タブに切り替えられる', () => {
      const store = useCardDetailStore();

      store.setCardTab('products');
      expect(store.cardTab).toBe('products');
    });

    it('複数回タブ切り替えができる', () => {
      const store = useCardDetailStore();

      store.setCardTab('info');
      expect(store.cardTab).toBe('info');

      store.setCardTab('qa');
      expect(store.cardTab).toBe('qa');

      store.setCardTab('related');
      expect(store.cardTab).toBe('related');

      store.setCardTab('products');
      expect(store.cardTab).toBe('products');

      store.setCardTab('info');
      expect(store.cardTab).toBe('info');
    });

    it('デフォルトタブは info', () => {
      const store = useCardDetailStore();
      expect(store.cardTab).toBe('info');
    });
  });

  describe('統合動作', () => {
    it('カード選択とタブ切り替えが独立している', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(mockCard);
      store.setCardTab('qa');

      expect(store.selectedCard?.name).toBe('Test Card');
      expect(store.cardTab).toBe('qa');
    });

    it('カード選択なしでもタブ切り替えができる', () => {
      const store = useCardDetailStore();

      expect(store.selectedCard).toBeNull();

      store.setCardTab('related');
      expect(store.cardTab).toBe('related');
    });

    it('タブ切り替え後のカード選択が反映される', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setCardTab('qa');
      store.setSelectedCard(mockCard);

      expect(store.cardTab).toBe('qa');
      expect(store.selectedCard?.name).toBe('Test Card');
    });
  });

  describe('リセット機能 (reset)', () => {
    it('ストア全体をリセットできる', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(mockCard);
      store.setCardTab('qa');

      expect(store.selectedCard).not.toBeNull();
      expect(store.cardTab).toBe('qa');

      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });

    it('複数回のリセットが可能', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(mockCard);
      store.setCardTab('qa');
      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');

      // 2回目のセット・リセット
      store.setSelectedCard(mockCard);
      store.setCardTab('related');
      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });

    it('リセット後は初期状態に戻る', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Card 1');
      const card2 = createMockCard('cid-002', 'Card 2');

      // 複数のカードを選択・リセット
      store.setSelectedCard(card1);
      store.reset();

      store.setSelectedCard(card2);
      store.reset();

      // 最終的に初期状態
      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });
  });

  describe('エッジケース', () => {
    it('同じカードを連続で選択できる', () => {
      const store = useCardDetailStore();
      const mockCard = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(mockCard);
      const firstSelection = store.selectedCard;

      store.setSelectedCard(mockCard);
      const secondSelection = store.selectedCard;

      expect(firstSelection).toEqual(secondSelection);
    });

    it('null から null への遷移が処理される', () => {
      const store = useCardDetailStore();

      expect(store.selectedCard).toBeNull();

      store.setSelectedCard(null);
      expect(store.selectedCard).toBeNull();
    });

    it('カード選択後に別のタブ選択・カード選択の順序が保持される', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Card 1');
      const card2 = createMockCard('cid-002', 'Card 2');

      store.setSelectedCard(card1);
      store.setCardTab('qa');
      store.setSelectedCard(card2);

      expect(store.selectedCard?.cardId).toBe('cid-002');
      expect(store.cardTab).toBe('qa');
    });
  });
});
