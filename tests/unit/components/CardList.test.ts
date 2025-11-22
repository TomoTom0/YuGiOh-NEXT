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
      // カードの順序はソートにより変わる可能性があるため、名前の存在のみ確認
      const cardNames = cardInfo.map(info => info.find('.card-name').text());
      expect(cardNames).toContain('ブラック・マジシャン');
      expect(cardNames).toContain('ブラック・マジシャン・ガール');
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
      // カードはソート順で表示されるため、順序の検証は行わない
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
    it('ボタンでリストモードとグリッドモードを切り替えられる', async () => {
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

      // グリッド表示ボタンをクリック（2番目のview-btn）
      const viewBtns = wrapper.findAll('.view-btn');
      await viewBtns[1].trigger('click');

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
      expect(options).toHaveLength(7);
      expect(options[0].text()).toBe('発売日');
      expect(options[1].text()).toBe('名前');
      expect(options[2].text()).toBe('ATK');
      expect(options[3].text()).toBe('DEF');
      expect(options[4].text()).toBe('Lv/Rank');
      expect(options[5].text()).toBe('属性');
      expect(options[6].text()).toBe('種族');
    });

    it('ソート順を変更するとイベントが発火する', async () => {
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

      // sortBaseを'name'に変更（handleSortChangeが呼ばれてsortDirectionが'asc'になる）
      const select = wrapper.find('.sort-select');
      await select.setValue('name');

      // watchが発火するのを待つ
      await wrapper.vm.$nextTick();

      // localSortOrderは'name_asc'になるはず
      expect(wrapper.vm.localSortOrder).toBe('name_asc');
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

  describe('スクロールとナビゲーション', () => {
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

      // 最初の.floating-btnがスクロールトップボタン
      const floatingBtns = wrapper.findAll('.floating-btn');
      await floatingBtns[0].trigger('click');
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

    it('ソート方向ボタンが表示される', () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.sort-direction-btn').exists()).toBe(true);
    });
  });
});
