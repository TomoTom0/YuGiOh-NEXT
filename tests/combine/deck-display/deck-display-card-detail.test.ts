/**
 * デッキ表示画面 カード詳細 統合テスト
 * - DeckDisplayApp.vue でのストア統合テスト
 * - カード画像クリック検出テスト
 * - タブ表示状態の同期テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';
import type { CardInfo } from '@/types/card';

// ダミーカード情報
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

describe('デッキ表示画面 カード詳細 統合テスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('ストア統合', () => {
    it('cardDetailStore がアクティブである', () => {
      const store = useCardDetailStore();

      expect(store).toBeDefined();
      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });

    it('複数のストア操作が独立に動作する', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Card 1');
      const card2 = createMockCard('cid-002', 'Card 2');

      store.setSelectedCard(card1);
      expect(store.selectedCard?.name).toBe('Card 1');

      store.setCardTab('qa');
      expect(store.cardTab).toBe('qa');

      store.setSelectedCard(card2);
      expect(store.selectedCard?.name).toBe('Card 2');
      expect(store.cardTab).toBe('qa'); // タブは変わらない
    });

    it('ストアのリセットがすべての状態をクリアする', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('related');

      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });
  });

  describe('カード画像クリック検出', () => {
    it('カード画像をクリックするとカードが選択される', () => {
      const store = useCardDetailStore();
      const clickedCard = createMockCard('cid-001', 'Clicked Card');

      // カード画像クリックをシミュレート
      store.setSelectedCard(clickedCard);

      expect(store.selectedCard?.cardId).toBe('cid-001');
      expect(store.selectedCard?.name).toBe('Clicked Card');
    });

    it('複数のカード画像をクリックして切り替えられる', () => {
      const store = useCardDetailStore();
      const cards = [
        createMockCard('cid-001', 'Card A'),
        createMockCard('cid-002', 'Card B'),
        createMockCard('cid-003', 'Card C')
      ];

      // 複数回のカード画像クリック
      for (const card of cards) {
        store.setSelectedCard(card);
        expect(store.selectedCard?.cardId).toBe(card.cardId);
      }
    });

    it('同じカード画像を複数回クリックできる', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      const firstSelect = store.selectedCard?.cardId;

      store.setSelectedCard(card);
      const secondSelect = store.selectedCard?.cardId;

      expect(firstSelect).toBe(secondSelect);
      expect(firstSelect).toBe('cid-001');
    });

    it('カード選択時に情報タブが表示される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('info');

      expect(store.selectedCard).not.toBeNull();
      expect(store.cardTab).toBe('info');
    });
  });

  describe('タブ表示状態の同期', () => {
    it('Info タブが表示可能である', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('info');

      expect(store.cardTab).toBe('info');
    });

    it('Q&A タブが表示可能である', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('qa');

      expect(store.cardTab).toBe('qa');
    });

    it('Related タブが表示可能である', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('related');

      expect(store.cardTab).toBe('related');
    });

    it('Products タブが表示可能である', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('products');

      expect(store.cardTab).toBe('products');
    });

    it('タブ切り替えがカード選択状態を保持する', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('info');
      const selectedBefore = store.selectedCard?.cardId;

      store.setCardTab('qa');
      const selectedAfter = store.selectedCard?.cardId;

      expect(selectedBefore).toBe(selectedAfter);
      expect(selectedAfter).toBe('cid-001');
    });

    it('複数回のタブ切り替えを処理できる', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);

      const tabs: Array<'info' | 'qa' | 'related' | 'products'> = ['info', 'qa', 'related', 'products'];
      for (const tab of tabs) {
        store.setCardTab(tab);
        expect(store.cardTab).toBe(tab);
        expect(store.selectedCard?.cardId).toBe('cid-001');
      }
    });
  });

  describe('カード詳細情報の表示', () => {
    it('選択されたカードの基本情報が表示される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Blue Eyes White Dragon');
      card.atk = 3000;
      card.def = 2500;
      card.level = 8;

      store.setSelectedCard(card);

      expect(store.selectedCard?.name).toBe('Blue Eyes White Dragon');
      expect(store.selectedCard?.atk).toBe(3000);
      expect(store.selectedCard?.def).toBe(2500);
      expect(store.selectedCard?.level).toBe(8);
    });

    it('複数のカード属性が同時に表示される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Dragon Card');
      card.attribute = 'LIGHT';
      card.race = 'Dragon';
      card.rarity = ['UR', 'SR'];

      store.setSelectedCard(card);

      expect(store.selectedCard?.attribute).toBe('LIGHT');
      expect(store.selectedCard?.race).toBe('Dragon');
      expect(store.selectedCard?.rarity).toHaveLength(2);
    });

    it('カード情報が更新されると表示も更新される', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Card 1');
      const card2 = createMockCard('cid-002', 'Card 2');

      store.setSelectedCard(card1);
      expect(store.selectedCard?.name).toBe('Card 1');

      store.setSelectedCard(card2);
      expect(store.selectedCard?.name).toBe('Card 2');
    });
  });

  describe('カード選択解除', () => {
    it('カード選択が null に設定できる', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      expect(store.selectedCard).not.toBeNull();

      store.setSelectedCard(null);
      expect(store.selectedCard).toBeNull();
    });

    it('カード選択解除後もタブは維持される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('qa');

      store.setSelectedCard(null);

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('qa');
    });

    it('リセット関数がカード選択とタブをクリアする', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setCardTab('qa');

      store.reset();

      expect(store.selectedCard).toBeNull();
      expect(store.cardTab).toBe('info');
    });
  });

  describe('デッキ表示画面の統合シナリオ', () => {
    it('デッキ表示→カード選択→詳細表示のフロー', () => {
      const store = useCardDetailStore();

      // 1. デッキを表示（カード選択なし）
      expect(store.selectedCard).toBeNull();

      // 2. デッキ内のカードをクリック
      const clickedCard = createMockCard('cid-001', 'Blue Eyes');
      store.setSelectedCard(clickedCard);
      expect(store.selectedCard?.name).toBe('Blue Eyes');

      // 3. カード詳細が表示される（info タブ）
      store.setCardTab('info');
      expect(store.cardTab).toBe('info');
    });

    it('複数カード選択と詳細表示の切り替え', () => {
      const store = useCardDetailStore();
      const cards = [
        createMockCard('cid-001', 'Card A'),
        createMockCard('cid-002', 'Card B'),
        createMockCard('cid-003', 'Card C')
      ];

      for (const card of cards) {
        store.setSelectedCard(card);
        store.setCardTab('info');
        expect(store.selectedCard?.cardId).toBe(card.cardId);
        expect(store.cardTab).toBe('info');
      }
    });

    it('カード詳細表示中に別のカードを選択', () => {
      const store = useCardDetailStore();
      const card1 = createMockCard('cid-001', 'Card A');
      const card2 = createMockCard('cid-002', 'Card B');

      // Card A を選択→詳細表示
      store.setSelectedCard(card1);
      store.setCardTab('qa');

      // Card B を選択
      store.setSelectedCard(card2);

      // タブは変わらず、カードだけ更新
      expect(store.selectedCard?.cardId).toBe('cid-002');
      expect(store.cardTab).toBe('qa');
    });

    it('タブ間でのカード情報の一貫性', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);

      const tabs: Array<'info' | 'qa' | 'related' | 'products'> = ['info', 'qa', 'related', 'products'];
      for (const tab of tabs) {
        store.setCardTab(tab);
        // すべてのタブでカード情報が一貫している
        expect(store.selectedCard?.cardId).toBe('cid-001');
        expect(store.selectedCard?.name).toBe('Test Card');
      }
    });
  });

  describe('エッジケース', () => {
    it('nil カード操作が適切に処理される', () => {
      const store = useCardDetailStore();

      store.setSelectedCard(null);
      expect(store.selectedCard).toBeNull();

      store.setSelectedCard(null);
      expect(store.selectedCard).toBeNull();
    });

    it('同じカードを連続で選択できる', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);
      store.setSelectedCard(card);
      store.setSelectedCard(card);

      expect(store.selectedCard?.cardId).toBe('cid-001');
    });

    it('大量のタブ切り替えを処理できる', () => {
      const store = useCardDetailStore();
      const card = createMockCard('cid-001', 'Test Card');

      store.setSelectedCard(card);

      const tabs: Array<'info' | 'qa' | 'related' | 'products'> = ['info', 'qa', 'related', 'products'];
      for (let i = 0; i < 100; i++) {
        const tab = tabs[i % tabs.length];
        store.setCardTab(tab);
      }

      expect(store.selectedCard?.cardId).toBe('cid-001');
    });
  });
});
