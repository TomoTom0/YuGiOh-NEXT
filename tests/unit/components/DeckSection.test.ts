import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeckSection from '../../../src/components/DeckSection.vue';
import { useDeckEditStore } from '../../../src/stores/deck-edit';
import { getTempCacheDB } from '../../../src/utils/temp-cache-db';
import { getUnifiedCacheDB } from '../../../src/utils/unified-cache-db';

describe('DeckSection.vue', () => {
  let pinia: any;
  let store: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useDeckEditStore();

    // UnifiedCacheDB のモック化
    const unifiedDB = getUnifiedCacheDB();

    // reconstructCardInfo をモック（簡単にするため直接カード情報を返す）
    vi.spyOn(unifiedDB, 'reconstructCardInfo').mockImplementation((cardId: string) => {
      const cards: any = {
        '4011': {
          cardId: '4011',
          ciid: '1',
          lang: 'ja',
          name: 'ブラック・マジシャン',
          ruby: 'ブラック・マジシャン',
          cardType: 'monster',
          attribute: 'dark',
          race: 'spellcaster',
          levelType: 'level',
          levelValue: 7,
          atk: 2500,
          def: 2100,
          imgs: [
            { ciid: '1', imgHash: 'hash1' },
            { ciid: '2', imgHash: 'hash1b' }
          ],
          isExtraDeck: false,
        },
        '4012': {
          cardId: '4012',
          ciid: '1',
          lang: 'ja',
          name: 'ブラック・マジシャン・ガール',
          ruby: 'ブラック・マジシャン・ガール',
          cardType: 'monster',
          attribute: 'dark',
          race: 'spellcaster',
          levelType: 'level',
          levelValue: 6,
          atk: 2000,
          def: 1700,
          imgs: [{ ciid: '1', imgHash: 'hash2' }],
          isExtraDeck: false,
        }
      };
      return cards[cardId];
    });

    // TempCacheDBはクリア（使用されないことを確認）
    const tempCacheDB = getTempCacheDB();
    tempCacheDB.clear();
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

  describe('ドロップ処理 (handleEndDrop)', () => {
    const createDropPayload = (sectionType: string, uuid = 'uuid-src') => ({
      dataTransfer: {
        getData: (type: string) =>
          type === 'text/plain'
            ? JSON.stringify({
                sectionType,
                index: 0,
                card: mockCards[0],
                uuid,
              })
            : '',
      },
    });

    it('infoセクションからのドロップは無視され、trashに同一cidがあってもデッキ状態を変更しない', async () => {
      store.trashDeck = [{ cid: '4011', ciid: '1', lang: 'ja', quantity: 1 }];
      store.displayOrder.trash = [{ cid: '4011', ciid: 1, uuid: 'uuid-trash-1' }];

      const moveCardSpy = vi.spyOn(store, 'moveCard');
      const addMainOrExtraSpy = vi.spyOn(store, 'addCopyToMainOrExtra');
      const addSectionSpy = vi.spyOn(store, 'addCopyToSection');

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

      await wrapper.find('.drop-zone-end').trigger('drop', createDropPayload('info'));

      expect(moveCardSpy).not.toHaveBeenCalled();
      expect(addMainOrExtraSpy).not.toHaveBeenCalled();
      expect(addSectionSpy).not.toHaveBeenCalled();
      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.trashDeck).toHaveLength(1);
    });

    it('searchセクションからのmainドロップはaddCopyToMainOrExtraを呼ぶ', async () => {
      const addMainOrExtraSpy = vi.spyOn(store, 'addCopyToMainOrExtra');

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

      await wrapper.find('.drop-zone-end').trigger('drop', createDropPayload('search'));

      expect(addMainOrExtraSpy).toHaveBeenCalledTimes(1);
    });

    it('別デッキセクション(side)からのmainドロップはmoveCardを呼ぶ', async () => {
      store.deckInfo.sideDeck = [{ cid: '4011', ciid: '1', lang: 'ja', quantity: 1 }];
      store.displayOrder.side = [{ cid: '4011', ciid: 1, uuid: 'uuid-side-1' }];
      const moveCardSpy = vi.spyOn(store, 'moveCard');

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

      await wrapper.find('.drop-zone-end').trigger('drop', createDropPayload('side', 'uuid-side-1'));

      expect(moveCardSpy).toHaveBeenCalledWith('4011', 'side', 'main', 'uuid-side-1');
    });
  });
});
