import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CardList from '../../../src/components/CardList.vue';
import DeckCard from '../../../src/components/DeckCard.vue';

describe('CardList.vue', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mockCards = [
    {
      cardId: '4011',
      ciid: '1',
      name: 'ブラック・マジシャン',
      cardType: 'monster',
      text: '魔法使い族の最上級モンスター。攻撃力・守備力ともに最高クラス。',
      imgs: [{ ciid: '1', imgHash: 'hash1' }],
    },
    {
      cardId: '4012',
      ciid: '1',
      name: 'ブラック・マジシャン・ガール',
      cardType: 'monster',
      text: 'ブラック・マジシャンの弟子である魔法使い。',
      imgs: [{ ciid: '1', imgHash: 'hash2' }],
    },
  ];

  describe('リスト表示モード', () => {
    it('リストモードでカードを表示できる', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'list',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.findAll('.card-result-item')).toHaveLength(2);
      expect(wrapper.find('.card-list-results').classes()).not.toContain('grid-view');
    });

    it('リストモードではカード名とテキストが表示される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'list',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardInfo = wrapper.findAll('.card-info');
      expect(cardInfo).toHaveLength(2);
      expect(cardInfo[0].find('.card-name').text()).toBe('ブラック・マジシャン');
      expect(cardInfo[0].find('.card-text').exists()).toBe(true);
    });

    it('DeckCardコンポーネントが正しくレンダリングされる', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'list',
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAllComponents(DeckCard);
      expect(deckCards).toHaveLength(2);
      expect(deckCards[0].props('card')).toEqual(mockCards[0]);
      expect(deckCards[0].props('sectionType')).toBe('search');
    });
  });

  describe('グリッド表示モード', () => {
    it('グリッドモードでカードを表示できる', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'grid',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-list-results').classes()).toContain('grid-view');
    });

    it('グリッドモードではカード情報（名前・テキスト）は表示されない', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'grid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardInfo = wrapper.findAll('.card-info');
      expect(cardInfo).toHaveLength(0);
    });
  });

  describe('表示切り替え機能', () => {
    it('ラジオボタンでリストモードとグリッドモードを切り替えられる', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'list',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-list-results').classes()).not.toContain('grid-view');

      const gridRadio = wrapper.findAll('input[type="radio"]')[1];
      await gridRadio.setValue(true);

      expect(wrapper.vm.localViewMode).toBe('grid');
      expect(wrapper.find('.card-list-results').classes()).toContain('grid-view');
    });

    it('viewModeプロパティが変更されると表示が更新される', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          viewMode: 'list',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-list-results').classes()).not.toContain('grid-view');

      await wrapper.setProps({ viewMode: 'grid' });

      expect(wrapper.vm.localViewMode).toBe('grid');
      expect(wrapper.find('.card-list-results').classes()).toContain('grid-view');
    });
  });

  describe('ソート機能', () => {
    it('ソート選択肢が正しく表示される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          sortOrder: 'release_desc',
        },
        global: {
          plugins: [pinia],
        },
      });

      const options = wrapper.findAll('.sort-select option');
      expect(options).toHaveLength(4);
      expect(options[0].text()).toBe('Newer');
      expect(options[1].text()).toBe('Older');
      expect(options[2].text()).toBe('Name (A-Z)');
      expect(options[3].text()).toBe('Name (Z-A)');
    });

    it.skip('ソート順を変更するとイベントが発火する', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          sortOrder: 'release_desc',
        },
        global: {
          plugins: [pinia],
        },
      });

      const select = wrapper.find('.sort-select');
      await select.setValue('name_asc');

      // watchが発火するのを待つ
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:sortOrder')).toBeTruthy();
      expect(wrapper.emitted('update:sortOrder')?.[0]).toEqual(['name_asc']);
      expect(wrapper.emitted('sort-change')?.[0]).toEqual(['name_asc']);
    });

    it('sortOrderプロパティが変更されると選択値が更新される', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
          sortOrder: 'release_desc',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.localSortOrder).toBe('release_desc');

      await wrapper.setProps({ sortOrder: 'name_asc' });

      expect(wrapper.vm.localSortOrder).toBe('name_asc');
    });
  });

  describe.skip('スクロールとナビゲーション', () => {
    it('スクロールイベントが発火する', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
        attachTo: document.body,
      });

      const scrollArea = wrapper.find('.card-list-results');
      await scrollArea.trigger('scroll');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('scroll')).toBeTruthy();
      wrapper.unmount();
    });

    it('トップへスクロールボタンクリックでイベントが発火する', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
        attachTo: document.body,
      });

      const scrollToTopBtn = wrapper.find('.scroll-to-top-btn');
      await scrollToTopBtn.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('scroll-to-top')).toBeTruthy();
      wrapper.unmount();
    });
  });

  describe('カード一覧の表示', () => {
    it('空の配列でもエラーにならない', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: [],
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.findAll('.card-result-item')).toHaveLength(0);
    });

    it('複数のカードを正しく表示できる', () => {
      const manyCards = Array.from({ length: 10 }, (_, i) => ({
        cardId: `${4000 + i}`,
        ciid: '1',
        name: `カード${i}`,
        cardType: 'monster',
        imgs: [{ ciid: '1', imgHash: `hash${i}` }],
      }));

      const wrapper = mount(CardList, {
        props: {
          cards: manyCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.findAll('.card-result-item')).toHaveLength(10);
    });

    it('sectionTypeが正しくDeckCardに渡される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'info',
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAllComponents(DeckCard);
      expect(deckCards[0].props('sectionType')).toBe('info');
    });
  });

  describe('ツールバー', () => {
    it('ツールバーが表示される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-list-toolbar').exists()).toBe(true);
      expect(wrapper.find('.toolbar-left').exists()).toBe(true);
      expect(wrapper.find('.view-switch').exists()).toBe(true);
    });

    it('ソートアイコンが表示される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.sort-icon').exists()).toBe(true);
    });
  });
});
