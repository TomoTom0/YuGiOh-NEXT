import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeckSection from '../../../src/components/DeckSection.vue';
import { useDeckEditStore } from '../../../src/stores/deck-edit';
import { getTempCardDB } from '../../../src/utils/temp-card-db';

describe('DeckSection.vue', () => {
  let pinia: any;
  let store: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useDeckEditStore();

    // TempCardDBにカード情報を登録
    const tempCardDB = getTempCardDB();
    tempCardDB.clear();
    tempCardDB.set('4011', {
      cardId: '4011',
      ciid: '1',
      name: 'ブラック・マジシャン',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: 'hash1' }],
    } as any);
    tempCardDB.set('4012', {
      cardId: '4012',
      ciid: '1',
      name: 'ブラック・マジシャン・ガール',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: 'hash2' }],
    } as any);
  });

  const mockCards = [
    {
      cardId: '4011',
      ciid: '1',
      name: 'ブラック・マジシャン',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: 'hash1' }],
    },
    {
      cardId: '4012',
      ciid: '1',
      name: 'ブラック・マジシャン・ガール',
      cardType: 'monster',
      imgs: [{ ciid: '1', imgHash: 'hash2' }],
    },
  ];

  describe('基本表示', () => {
    it('タイトルが正しく表示される', () => {
      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('h3').text()).toContain('メインデッキ');
    });

    it('カード枚数が表示される', () => {
      // storeのdisplayOrderとdeckInfoを設定
      store.displayOrder.main = [
        { cid: '4011', ciid: 1, uuid: 'uuid-1' },
        { cid: '4012', ciid: 1, uuid: 'uuid-2' },
      ];
      store.deckInfo.mainDeck = [
        { cid: '4011', ciid: '1', quantity: 1 },
        { cid: '4012', ciid: '1', quantity: 1 },
      ];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
          showCount: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.count').text()).toBe('2');
    });

    it('showCount=falseの場合、カード枚数が表示されない', () => {
      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
          showCount: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.count').exists()).toBe(false);
    });

    it('セクションタイプに応じたクラスが適用される', () => {
      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-section').classes()).toContain('main-deck');
    });
  });

  describe('カード表示', () => {
    it('displayOrderのカードが表示される', () => {
      store.displayOrder.main = [
        { cid: '4011', ciid: '1', uuid: 'uuid-1' },
        { cid: '4012', ciid: '1', uuid: 'uuid-2' },
      ];
      store.deckInfo.mainDeck = [
        { card: mockCards[0], quantity: 1 },
        { card: mockCards[1], quantity: 1 },
      ];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAllComponents({ name: 'DeckCard' });
      expect(deckCards).toHaveLength(2);
    });

    it('displayOrderが空の場合、カードが表示されない', () => {
      store.displayOrder.main = [];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: [],
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAllComponents({ name: 'DeckCard' });
      expect(deckCards).toHaveLength(0);
    });
  });

  describe('デッキタイプ別', () => {
    it('mainデッキが正しく表示される', () => {
      store.displayOrder.main = [{ cid: '4011', ciid: '1', uuid: 'uuid-1' }];
      store.deckInfo.mainDeck = [{ card: mockCards[0], quantity: 1 }];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: [mockCards[0]],
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-section').classes()).toContain('main-deck');
      expect(wrapper.find('h3').text()).toContain('メインデッキ');
    });

    it('extraデッキが正しく表示される', () => {
      store.displayOrder.extra = [{ cid: '4011', ciid: '1', uuid: 'uuid-1' }];
      store.deckInfo.extraDeck = [{ card: mockCards[0], quantity: 1 }];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'EXデッキ',
          sectionType: 'extra',
          cards: [mockCards[0]],
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-section').classes()).toContain('extra-deck');
      expect(wrapper.find('h3').text()).toContain('EXデッキ');
    });

    it('sideデッキが正しく表示される', () => {
      store.displayOrder.side = [{ cid: '4011', ciid: '1', uuid: 'uuid-1' }];
      store.deckInfo.sideDeck = [{ card: mockCards[0], quantity: 1 }];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'サイドデッキ',
          sectionType: 'side',
          cards: [mockCards[0]],
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-section').classes()).toContain('side-deck');
      expect(wrapper.find('h3').text()).toContain('サイドデッキ');
    });
  });

  describe('ドロップゾーン', () => {
    it('ドロップゾーンが存在する', () => {
      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.drop-zone-end').exists()).toBe(true);
    });

    it('card-gridが存在する', () => {
      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: mockCards,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-grid').exists()).toBe(true);
    });
  });

  describe('TransitionGroup', () => {
    it('TransitionGroupが正しく設定されている', () => {
      store.displayOrder.main = [
        { cid: '4011', ciid: '1', uuid: 'uuid-1' },
      ];
      store.deckInfo.mainDeck = [{ card: mockCards[0], quantity: 1 }];

      const wrapper = mount(DeckSection, {
        props: {
          title: 'メインデッキ',
          sectionType: 'main',
          cards: [mockCards[0]],
        },
        global: {
          plugins: [pinia],
        },
      });

      // TransitionGroupが存在することを確認
      const transitionGroup = wrapper.findComponent({ name: 'TransitionGroup' });
      expect(transitionGroup.exists()).toBe(true);
    });
  });
});
