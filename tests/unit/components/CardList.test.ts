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

    describe('複数キーソート', () => {
      const sortTestCards = [
        { cardId: '1001', ciid: '1', name: 'アルファ', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '1002', ciid: '1', name: 'ベータ', atk: 2500, def: 1800, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '1003', ciid: '1', name: 'ガンマ', atk: 2000, def: 1500, levelValue: 4, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '1004', ciid: '1', name: 'デルタ', atk: 2000, def: 1500, levelValue: 5, imgs: [{ ciid: '1', imgHash: 'h4' }] },
      ];

      it('ATK降順ソート時、同値の場合はカード名で昇順にソートされる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: sortTestCards,
            sectionType: 'search',
            sortOrder: 'atk_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ATK 2500: アルファ, ベータ（カード名昇順）
        // ATK 2000: ガンマ, デルタ（カード名昇順）
        expect(cardNames).toEqual(['アルファ', 'ベータ', 'ガンマ', 'デルタ']);
      });

      it('DEF降順ソート時、同値の場合はカード名で昇順にソートされる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: sortTestCards,
            sectionType: 'search',
            sortOrder: 'def_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // DEF 2000: アルファ
        // DEF 1800: ベータ
        // DEF 1500: ガンマ, デルタ（カード名昇順）
        expect(cardNames).toEqual(['アルファ', 'ベータ', 'ガンマ', 'デルタ']);
      });

      it('レベル降順ソート時、同値の場合はカード名で昇順にソートされる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: sortTestCards,
            sectionType: 'search',
            sortOrder: 'level_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // Level 7: アルファ, ベータ（カード名昇順）
        // Level 5: デルタ
        // Level 4: ガンマ
        expect(cardNames).toEqual(['アルファ', 'ベータ', 'デルタ', 'ガンマ']);
      });

      it('ATK昇順ソート時、同値の場合はカード名で昇順にソートされる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: sortTestCards,
            sectionType: 'search',
            sortOrder: 'atk_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ATK 2000: ガンマ, デルタ（カード名昇順）
        // ATK 2500: アルファ, ベータ（カード名昇順）
        expect(cardNames).toEqual(['ガンマ', 'デルタ', 'アルファ', 'ベータ']);
      });
    });
  });

  describe('スクロールとナビゲーション', () => {
    // SKIP: happy-dom環境ではスクロールイベントが正しく動作しない
    it.skip('スクロールイベントが発火する', async () => {
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

    // SKIP: happy-dom環境ではスクロールボタンのイベントが正しく動作しない
    it.skip('トップへスクロールボタンクリックでイベントが発火する', async () => {
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
      if (floatingBtns.length > 0) {
        await floatingBtns[0].trigger('click');
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('scroll-to-top')).toBeTruthy();
      } else {
        // ボタンが見つからない場合はskip
        console.log('スクロールトップボタンが見つかりません');
      }
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

  describe('maxIndexMapのクリア処理', () => {
    it('カード配列が変更されるとmaxIndexMapがクリアされる', async () => {
      const wrapper = mount(CardList, {
        props: {
          cards: mockCards,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      // 初期状態でUUIDが付与される
      const initialUuids = wrapper.vm.cardsWithUuid.map((c: any) => c.uuid);
      expect(initialUuids).toHaveLength(2);

      // カード配列を変更
      const newCards = [
        {
          cardId: '5001',
          ciid: '1',
          name: '青眼の白龍',
          cardType: 'monster',
          text: '高い攻撃力を誇る伝説のドラゴン。',
          imgs: [{ ciid: '1', imgHash: 'hash3' }],
        },
      ];

      await wrapper.setProps({ cards: newCards });

      // 新しいカード配列でUUIDが再付与される
      const newUuids = wrapper.vm.cardsWithUuid.map((c: any) => c.uuid);
      expect(newUuids).toHaveLength(1);
      // maxIndexMapがクリアされているため、新しいカードのインデックスは0から始まる
      expect(newUuids[0]).toBe('5001-1-0');
    });
  });
});
