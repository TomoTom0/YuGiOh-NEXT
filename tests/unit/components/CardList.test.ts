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
        { cardId: '1001', ciid: '1', name: 'アルファ', cardType: 'monster', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '1002', ciid: '1', name: 'ベータ', cardType: 'monster', atk: 2500, def: 1800, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '1003', ciid: '1', name: 'ガンマ', cardType: 'monster', atk: 2000, def: 1500, levelValue: 4, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '1004', ciid: '1', name: 'デルタ', cardType: 'monster', atk: 2000, def: 1500, levelValue: 5, imgs: [{ ciid: '1', imgHash: 'h4' }] },
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

  describe('ソート機能 - 包括的テスト', () => {
    describe('種族（Race）ソート', () => {
      const raceTestCards = [
        { cardId: '2001', ciid: '1', name: 'ドラゴン族A', cardType: 'monster', race: 'ドラゴン族', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '2002', ciid: '1', name: 'ドラゴン族B', cardType: 'monster', race: 'ドラゴン族', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '2003', ciid: '1', name: '魔法使い族', cardType: 'monster', race: '魔法使い族', atk: 2000, def: 1500, levelValue: 4, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '2004', ciid: '1', name: '戦士族', cardType: 'monster', race: '戦士族', atk: 1800, def: 1200, levelValue: 3, imgs: [{ ciid: '1', imgHash: 'h4' }] },
      ];

      it('種族昇順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: raceTestCards,
            sectionType: 'search',
            sortOrder: 'race_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: ドラゴン族 < 戦士族 < 魔法使い族
        expect(cardNames).toEqual(['ドラゴン族A', 'ドラゴン族B', '戦士族', '魔法使い族']);
      });

      it('種族降順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: raceTestCards,
            sectionType: 'search',
            sortOrder: 'race_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: 魔法使い族 > 戦士族 > ドラゴン族
        expect(cardNames).toEqual(['魔法使い族', '戦士族', 'ドラゴン族A', 'ドラゴン族B']);
      });
    });

    describe('属性（Attribute）ソート', () => {
      const attributeTestCards = [
        { cardId: '3001', ciid: '1', name: '光属性A', cardType: 'monster', attribute: '光', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '3002', ciid: '1', name: '光属性B', cardType: 'monster', attribute: '光', atk: 2500, def: 2000, levelValue: 7, imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '3003', ciid: '1', name: '暗属性', cardType: 'monster', attribute: '暗', atk: 2000, def: 1500, levelValue: 4, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '3004', ciid: '1', name: '水属性', cardType: 'monster', attribute: '水', atk: 1800, def: 1200, levelValue: 3, imgs: [{ ciid: '1', imgHash: 'h4' }] },
      ];

      it('属性昇順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: attributeTestCards,
            sectionType: 'search',
            sortOrder: 'attribute_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: 光 < 暗 < 水
        expect(cardNames).toEqual(['光属性A', '光属性B', '暗属性', '水属性']);
      });

      it('属性降順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: attributeTestCards,
            sectionType: 'search',
            sortOrder: 'attribute_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: 水 > 暗 > 光
        expect(cardNames).toEqual(['水属性', '暗属性', '光属性A', '光属性B']);
      });
    });

    describe('モンスター・魔法・罠の混在ソート', () => {
      const mixedTypeCards = [
        { cardId: '4001', ciid: '1', name: 'モンスターA', cardType: 'monster', atk: 2500, def: 2000, levelValue: 7, race: 'ドラゴン族', attribute: '光', imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '4002', ciid: '1', name: '魔法カードX', cardType: 'spell', imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '4003', ciid: '1', name: 'モンスターB', cardType: 'monster', atk: 1800, def: 1200, levelValue: 3, race: '戦士族', attribute: '暗', imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '4004', ciid: '1', name: 'トラップカードY', cardType: 'trap', imgs: [{ ciid: '1', imgHash: 'h4' }] },
      ];

      it('ATK降順ソート時、モンスターが最前面、魔法・罠が末尾', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: mixedTypeCards,
            sectionType: 'search',
            sortOrder: 'atk_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // モンスターが最前面: モンスターA（ATK 2500）, モンスターB（ATK 1800）
        // その後、魔法・罠がCID順: 魔法カードX（CID 4002）, トラップカードY（CID 4004）
        expect(cardNames).toEqual(['モンスターA', 'モンスターB', '魔法カードX', 'トラップカードY']);
      });

      it('種族昇順ソート時、モンスターのみがソートされ魔法・罠は末尾', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: mixedTypeCards,
            sectionType: 'search',
            sortOrder: 'race_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // モンスターのみ種族でソート: ドラゴン族（モンスターA）, 戦士族（モンスターB）
        // その後、魔法・罠がCID順: 魔法カードX（CID 4002）, トラップカードY（CID 4004）
        expect(cardNames).toEqual(['モンスターA', 'モンスターB', '魔法カードX', 'トラップカードY']);
      });

      it('属性昇順ソート時、モンスターのみがソートされ魔法・罠は末尾', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: mixedTypeCards,
            sectionType: 'search',
            sortOrder: 'attribute_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // モンスターのみ属性でソート: 光（モンスターA）, 暗（モンスターB）
        // その後、魔法・罠がCID順: 魔法カードX（CID 4002）, トラップカードY（CID 4004）
        expect(cardNames).toEqual(['モンスターA', 'モンスターB', '魔法カードX', 'トラップカードY']);
      });
    });

    describe('エッジケース - null/undefined プロパティ', () => {
      const edgeCaseCards = [
        { cardId: '5001', ciid: '1', name: 'ATK定義済み', cardType: 'monster', atk: 2500, def: 2000, levelValue: 7, race: 'ドラゴン族', attribute: '光', imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '5002', ciid: '1', name: 'ATK未定義', cardType: 'monster', atk: undefined, def: 1800, levelValue: 7, race: 'ドラゴン族', attribute: '光', imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '5003', ciid: '1', name: 'DEF未定義', cardType: 'monster', atk: 2000, def: undefined, levelValue: 4, race: 'ドラゴン族', attribute: '光', imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '5004', ciid: '1', name: 'Level未定義', cardType: 'monster', atk: 1800, def: 1200, levelValue: undefined, race: 'ドラゴン族', attribute: '光', imgs: [{ ciid: '1', imgHash: 'h4' }] },
        { cardId: '5005', ciid: '1', name: '種族未定義', cardType: 'monster', atk: 1500, def: 1000, levelValue: 3, race: undefined, attribute: '光', imgs: [{ ciid: '1', imgHash: 'h5' }] },
        { cardId: '5006', ciid: '1', name: '属性未定義', cardType: 'monster', atk: 1200, def: 900, levelValue: 2, race: 'ドラゴン族', attribute: undefined, imgs: [{ ciid: '1', imgHash: 'h6' }] },
      ];

      it('ATK降順ソート時、undefined ATKは-1として扱われる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: edgeCaseCards,
            sectionType: 'search',
            sortOrder: 'atk_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ATK 2500: ATK定義済み
        // ATK 2000: DEF未定義
        // ATK 1800: Level未定義
        // ATK 1500: 種族未定義
        // ATK 1200: 属性未定義
        // ATK -1: ATK未定義
        expect(cardNames).toEqual(['ATK定義済み', 'DEF未定義', 'Level未定義', '種族未定義', '属性未定義', 'ATK未定義']);
      });

      it('DEF降順ソート時、undefined DEFは-1として扱われる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: edgeCaseCards,
            sectionType: 'search',
            sortOrder: 'def_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // DEF 2000: ATK定義済み
        // DEF 1800: ATK未定義
        // DEF 1200: Level未定義
        // DEF 1000: 種族未定義
        // DEF 900: 属性未定義
        // DEF -1: DEF未定義
        expect(cardNames).toEqual(['ATK定義済み', 'ATK未定義', 'Level未定義', '種族未定義', '属性未定義', 'DEF未定義']);
      });

      it('Level降順ソート時、undefined Levelは0として扱われる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: edgeCaseCards,
            sectionType: 'search',
            sortOrder: 'level_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // Level 7: ATK定義済み, ATK未定義
        // Level 4: DEF未定義
        // Level 3: 種族未定義
        // Level 2: 属性未定義
        // Level 0: Level未定義
        const topThree = cardNames.slice(0, 3);
        expect(topThree[0]).toBe('ATK定義済み');
        expect(topThree[1]).toBe('ATK未定義');
        expect(topThree[2]).toBe('DEF未定義');
        expect(cardNames[cardNames.length - 1]).toBe('Level未定義');
      });

      it('種族昇順ソート時、undefined Raceは空文字列として扱われる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: edgeCaseCards,
            sectionType: 'search',
            sortOrder: 'race_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // 種族未定義のカードは空文字列で扱われるため最前面（昇順時）
        expect(cardNames[0]).toBe('種族未定義');
      });

      it('属性昇順ソート時、undefined Attributeは空文字列として扱われる', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: edgeCaseCards,
            sectionType: 'search',
            sortOrder: 'attribute_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // 属性未定義のカードは空文字列で扱われるため最前面（昇順時）
        expect(cardNames[0]).toBe('属性未定義');
      });
    });

    describe('コード順ソート', () => {
      const codeOrderCards = [
        { cardId: '6001', ciid: '1', name: 'カード1', cardType: 'monster', atk: 1000, def: 1000, levelValue: 1, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '6003', ciid: '1', name: 'カード3', cardType: 'monster', atk: 3000, def: 3000, levelValue: 3, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '6002', ciid: '1', name: 'カード2', cardType: 'monster', atk: 2000, def: 2000, levelValue: 2, imgs: [{ ciid: '1', imgHash: 'h2' }] },
      ];

      it('コード昇順ソート（元の配列順序を保持）', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: codeOrderCards,
            sectionType: 'search',
            sortOrder: 'code_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // 元の配列順序: カード1, カード3, カード2
        expect(cardNames).toEqual(['カード1', 'カード3', 'カード2']);
      });

      it('コード降順ソート（元の配列順序を反転）', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: codeOrderCards,
            sectionType: 'search',
            sortOrder: 'code_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // 元の配列順序を反転: カード2, カード3, カード1
        expect(cardNames).toEqual(['カード2', 'カード3', 'カード1']);
      });
    });

    describe('リリース順ソート', () => {
      const releaseOrderCards = [
        { cardId: '7001', ciid: '1', name: 'カード1', cardType: 'monster', atk: 1000, def: 1000, levelValue: 1, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '7003', ciid: '1', name: 'カード3', cardType: 'monster', atk: 3000, def: 3000, levelValue: 3, imgs: [{ ciid: '1', imgHash: 'h3' }] },
        { cardId: '7002', ciid: '1', name: 'カード2', cardType: 'monster', atk: 2000, def: 2000, levelValue: 2, imgs: [{ ciid: '1', imgHash: 'h2' }] },
      ];

      it('リリース順降順ソート（CID降順）', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: releaseOrderCards,
            sectionType: 'search',
            sortOrder: 'release_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // CID 7003, 7002, 7001
        expect(cardNames).toEqual(['カード3', 'カード2', 'カード1']);
      });

      it('リリース順昇順ソート（CID昇順）', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: releaseOrderCards,
            sectionType: 'search',
            sortOrder: 'release_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // CID 7001, 7002, 7003
        expect(cardNames).toEqual(['カード1', 'カード2', 'カード3']);
      });
    });

    describe('カード名ソート', () => {
      const nameOrderCards = [
        { cardId: '8001', ciid: '1', name: 'ゾアーク', cardType: 'monster', atk: 2800, def: 2000, levelValue: 8, imgs: [{ ciid: '1', imgHash: 'h1' }] },
        { cardId: '8002', ciid: '1', name: 'アルファベット', cardType: 'monster', atk: 1000, def: 1000, levelValue: 1, imgs: [{ ciid: '1', imgHash: 'h2' }] },
        { cardId: '8003', ciid: '1', name: 'マドルチェ', cardType: 'monster', atk: 2500, def: 2500, levelValue: 5, imgs: [{ ciid: '1', imgHash: 'h3' }] },
      ];

      it('カード名昇順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: nameOrderCards,
            sectionType: 'search',
            sortOrder: 'name_asc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: アルファベット < ゾアーク < マドルチェ
        expect(cardNames).toEqual(['アルファベット', 'ゾアーク', 'マドルチェ']);
      });

      it('カード名降順ソート', () => {
        const wrapper = mount(CardList, {
          props: {
            cards: nameOrderCards,
            sectionType: 'search',
            sortOrder: 'name_desc',
          },
          global: {
            plugins: [pinia],
          },
        });

        const cardNames = wrapper.vm.cardsWithUuid.map((c: any) => c.card.name);
        // ソート順: マドルチェ > ゾアーク > アルファベット
        expect(cardNames).toEqual(['マドルチェ', 'ゾアーク', 'アルファベット']);
      });
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
