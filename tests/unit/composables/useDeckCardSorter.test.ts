import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildRecipeSortOptions,
  createDeckCardComparator,
  type DisplayCard
} from '@/composables/deck/useDeckCardSorter';
import type { CardInfo } from '@/types/card';

vi.mock('@/utils/card-utils', () => ({
  getCardInfo: vi.fn()
}));

import { getCardInfo } from '@/utils/card-utils';

describe('useDeckCardSorter', () => {
  const cardDB = new Map<string, CardInfo>();

  beforeEach(() => {
    cardDB.clear();
    vi.mocked(getCardInfo).mockImplementation((cid: string) => cardDB.get(cid) ?? null);
  });

  describe('createDeckCardComparator', () => {
    const setupCard = (cid: string, cardInfo: Partial<CardInfo>) => {
      const defaultCard: CardInfo = {
        cid,
        cardId: cid,
        nameRuby: `Card${cid}`,
        cardType: 'monster',
        cardKindTitle: 'モンスター',
        name: `Card${cid}`,
        tableA: {},
        tableB: {}
      };
      cardDB.set(cid, { ...defaultCard, ...cardInfo });
    };

    const createDisplayCard = (cid: string): DisplayCard => ({
      cid,
      ciid: 1,
      uuid: `uuid-${cid}`
    });

    describe('基本的なソート（カードタイプ）', () => {
      it('[covers:comparator.default_card_type_order_precedes_all_same_type_priorities] モンスター→魔法→罠の順でソートされる', () => {
        setupCard('monster1', { cardType: 'monster', name: 'Monster', types: [] });
        setupCard('spell1', { cardType: 'spell', name: 'Spell' });
        setupCard('trap1', { cardType: 'trap', name: 'Trap' });

        const section = [
          createDisplayCard('monster1'),
          createDisplayCard('spell1'),
          createDisplayCard('trap1')
        ];

        const comparator = createDeckCardComparator(section, {});

        // Monster < Spell
        expect(comparator(section[0], section[1])).toBeLessThan(0);
        // Spell < Trap
        expect(comparator(section[1], section[2])).toBeLessThan(0);
      });

      it('[covers:type_compare_name_locale_ja_fallback] 同じカードタイプの場合、カード名でソートされる', () => {
        setupCard('monster1', { cardType: 'monster', name: 'Aaa', types: [] });
        setupCard('monster2', { cardType: 'monster', name: 'Bbb', types: [] });

        const section = [
          createDisplayCard('monster1'),
          createDisplayCard('monster2')
        ];

        const comparator = createDeckCardComparator(section, {});

        // Aaa < Bbb
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });
    });

    describe('カテゴリ優先ソート', () => {
      it('[covers:comparator.category_one_match_precedes_non_match] カテゴリに含まれるカードが優先される', () => {
        setupCard('100', { cardType: 'monster', name: 'ZZZ', types: [] });
        setupCard('200', { cardType: 'monster', name: 'AAA', types: [] });

        const section = [
          createDisplayCard('100'),
          createDisplayCard('200')
        ];

        const comparator = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['100'])
        });

        // カテゴリ優先カード（100）< 非優先カード（200）
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });

      it('[covers:comparator.category_quantity_desc_orders_by_section_count] quantity-desc: 同じカテゴリ内では枚数の多い順でソートされる', () => {
        setupCard('card1', { cardType: 'monster', name: 'Card1', types: [] });
        setupCard('card2', { cardType: 'monster', name: 'Card2', types: [] });

        const section = [
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card2')
        ];

        const comparator = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['card1', 'card2']),
          categoryPrioritySortMode: 'quantity-desc'
        });

        // card1を3枚、card2を1枚：降順なので card1 < card2
        expect(comparator(section[0], section[3])).toBeLessThan(0);
      });

      it('[covers:comparator.category_quantity_desc_orders_by_section_count] quantity-desc: ascでも降順固定', () => {
        setupCard('card1', { cardType: 'monster', name: 'Card1', types: [] });
        setupCard('card2', { cardType: 'monster', name: 'Card2', types: [] });

        const section = [
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card2')
        ];

        const comparator = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['card1', 'card2']),
          categoryPrioritySortMode: 'quantity-desc',
          levelSortOrder: 'asc'
        });

        // asc設定でも枚数は降順固定: card1(3枚) < card2(1枚)
        expect(comparator(section[0], section[3])).toBeLessThan(0);
      });

      it('[covers:comparator.category_level_mode_falls_through] [covers:type_compare_monster_level_order] level（デフォルト）: 枚数ではなくlevelSortOrderに従う', () => {
        setupCard('card1', { cardType: 'monster', name: 'Card1', types: [], levelValue: 4 });
        setupCard('card2', { cardType: 'monster', name: 'Card2', types: [], levelValue: 8 });

        const section = [
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card1'),
          createDisplayCard('card2')
        ];

        const comparatorDesc = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['card1', 'card2']),
          categoryPrioritySortMode: 'level',
          levelSortOrder: 'desc'
        });
        const comparatorAsc = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['card1', 'card2']),
          categoryPrioritySortMode: 'level',
          levelSortOrder: 'asc'
        });

        // desc: level高い方が先 → card2(8) < card1(4)
        expect(comparatorDesc(section[3], section[0])).toBeLessThan(0);
        // asc: level低い方が先 → card1(4) < card2(8)
        expect(comparatorAsc(section[0], section[3])).toBeLessThan(0);
      });
    });

    describe('末尾配置ソート', () => {
      it('[covers:comparator.tail_one_listed_goes_after_unlisted] 末尾配置カードは後ろに移動される', () => {
        setupCard('normal_card', { cardType: 'monster', name: 'AAA', types: [] });
        setupCard('tail_card', { cardType: 'monster', name: 'ZZZ', types: [] });

        const section = [
          createDisplayCard('normal_card'),
          createDisplayCard('tail_card')
        ];

        const comparator = createDeckCardComparator(section, {
          enableTailPlacement: true,
          tailPlacementCardIds: ['tail_card']
        });

        // 末尾配置なし（0）< 末尾配置あり（1）
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });
    });

    describe('ソートモード: by-race', () => {
      it('[covers:comparator.by_race_mode_delegates_before_default_priorities] [covers:race_compare_monster_race_locale] by-raceモードでは種族でソートされる', () => {
        setupCard('monster1', {
          cardType: 'monster',
          name: 'Zombie',
          race: 'Zombie'
        });
        setupCard('monster2', {
          cardType: 'monster',
          name: 'Warrior',
          race: 'Warrior'
        });

        const section = [
          createDisplayCard('monster1'),
          createDisplayCard('monster2')
        ];

        const comparator = createDeckCardComparator(section, {
          sortMode: 'by-race'
        });

        // 種族でロケール順ソート（Warrior < Zombie）
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });

      it('[covers:race_compare_card_type_order] by-raceモードではモンスター < 魔法 < 罠の順が保たれる', () => {
        setupCard('monster1', { cardType: 'monster', name: 'Monster' });
        setupCard('spell1', { cardType: 'spell', name: 'Spell' });
        setupCard('trap1', { cardType: 'trap', name: 'Trap' });

        const section = [
          createDisplayCard('spell1'),
          createDisplayCard('monster1'),
          createDisplayCard('trap1')
        ];

        const comparator = createDeckCardComparator(section, {
          sortMode: 'by-race'
        });

        expect(comparator(section[1], section[0])).toBeLessThan(0); // monster < spell
        expect(comparator(section[0], section[2])).toBeLessThan(0); // spell < trap
      });
    });

    describe('ソートモード: by-attribute', () => {
      it('[covers:comparator.by_attribute_mode_delegates_before_default_priorities] [covers:attribute_compare_monster_attribute_locale] by-attributeモードでは属性でソートされる', () => {
        setupCard('monster1', {
          cardType: 'monster',
          name: 'Fire',
          attribute: 'FIRE'
        });
        setupCard('monster2', {
          cardType: 'monster',
          name: 'Water',
          attribute: 'WATER'
        });

        const section = [
          createDisplayCard('monster1'),
          createDisplayCard('monster2')
        ];

        const comparator = createDeckCardComparator(section, {
          sortMode: 'by-attribute'
        });

        // 属性でロケール順ソート（FIRE < WATER）
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });
    });

    describe('モンスタータイプでのソート（Fusion > Synchro > Xyz > Link > その他）', () => {
      it('[covers:type_compare_monster_main_type_first_known_type] モンスタータイプ順序が正しく機能する', () => {
        setupCard('link', { cardType: 'monster', name: 'Link', types: ['link'] });
        setupCard('xyz', { cardType: 'monster', name: 'Xyz', types: ['xyz'] });
        setupCard('synchro', { cardType: 'monster', name: 'Synchro', types: ['synchro'] });
        setupCard('fusion', { cardType: 'monster', name: 'Fusion', types: ['fusion'] });

        const comparator = createDeckCardComparator([], { sortMode: 'default' });

        const cards = {
          fusion: createDisplayCard('fusion'),
          synchro: createDisplayCard('synchro'),
          xyz: createDisplayCard('xyz'),
          link: createDisplayCard('link')
        };

        // Fusion < Synchro < Xyz < Link
        expect(comparator(cards.fusion, cards.synchro)).toBeLessThan(0);
        expect(comparator(cards.synchro, cards.xyz)).toBeLessThan(0);
        expect(comparator(cards.xyz, cards.link)).toBeLessThan(0);
      });
    });

    describe('レベル/ランク/リンクでのソート（降順）', () => {
      it('[covers:type_compare_monster_level_order] レベルの高いモンスターが優先される', () => {
        setupCard('level12', {
          cardType: 'monster',
          name: 'Level12',
          types: ['fusion'],
          levelValue: 12
        });
        setupCard('level6', {
          cardType: 'monster',
          name: 'Level6',
          types: ['fusion'],
          levelValue: 6
        });

        const section = [
          createDisplayCard('level6'),
          createDisplayCard('level12')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // Level12 > Level6（降順）
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });
    });

    describe('魔法・罠のタイプでのソート', () => {
      it('[covers:type_compare_spell_effect_order] 同じカードタイプの魔法は効果タイプの定義順でソートされる', () => {
        setupCard('spell_quick', {
          cardType: 'spell',
          name: 'Quick',
          effectType: 'quick'
        });
        setupCard('spell_normal', {
          cardType: 'spell',
          name: 'Normal',
          effectType: 'normal'
        });

        const section = [
          createDisplayCard('spell_quick'),
          createDisplayCard('spell_normal')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // SPELL_TYPE_SORT_ORDER: normal(0) < quick(1)
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });

      it('[covers:type_compare_trap_effect_order] 同じカードタイプの罠は効果タイプの定義順でソートされる', () => {
        setupCard('trap_continuous', {
          cardType: 'trap',
          name: 'Continuous',
          effectType: 'continuous'
        });
        setupCard('trap_counter', {
          cardType: 'trap',
          name: 'Counter',
          effectType: 'counter'
        });

        const section = [
          createDisplayCard('trap_continuous'),
          createDisplayCard('trap_counter')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // TRAP_TYPE_SORT_ORDER: counter(1) < continuous(2)
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });
    });

    describe('複合ソート条件', () => {
      it('[covers:comparator.tail_one_listed_goes_after_unlisted] カテゴリ優先と末尾配置が併用される', () => {
        setupCard('p_t', { cardType: 'monster', name: 'ZZZ', types: [] });
        setupCard('p_n', { cardType: 'monster', name: 'YYY', types: [] });
        setupCard('n_t', { cardType: 'monster', name: 'BBB', types: [] });
        setupCard('n_n', { cardType: 'monster', name: 'AAA', types: [] });

        const section = [
          createDisplayCard('p_t'),
          createDisplayCard('p_n'),
          createDisplayCard('n_t'),
          createDisplayCard('n_n')
        ];

        const comparator = createDeckCardComparator(section, {
          enableCategoryPriority: true,
          priorityCategoryCardIds: new Set(['p_t', 'p_n']),
          enableTailPlacement: true,
          tailPlacementCardIds: ['p_t', 'n_t']
        });

        // 優先カード（p_n）< 非優先カード（n_t）
        expect(comparator(section[1], section[2])).toBeLessThan(0);
        // 優先カード内では末尾なし(p_n) < 末尾あり(p_t)
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });
    });

    describe('フォールバックソート', () => {
      it('[covers:attribute_compare_card_type_order] 属性がない場合もカードタイプ順が保たれる', () => {
        setupCard('100', { cardType: 'spell', name: 'SpellA', attribute: undefined });
        setupCard('50', { cardType: 'spell', name: 'SpellB', attribute: undefined });
        setupCard('200', { cardType: 'monster', name: 'MonsterC', types: [] });

        const section = [
          createDisplayCard('100'),
          createDisplayCard('50'),
          createDisplayCard('200')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'by-attribute' });

        // モンスター(200) < 魔法(100, 50) の順
        expect(comparator(section[2], section[0])).toBeLessThan(0); // monster < spell
        expect(comparator(section[2], section[1])).toBeLessThan(0); // monster < spell
      });

      it('[covers:type_compare_name_locale_ja_fallback] 同じカードタイプ内でカード名でソートされる', () => {
        setupCard('150', { cardType: 'monster', name: 'Aaa', types: [] });
        setupCard('100', { cardType: 'monster', name: 'Bbb', types: [] });
        setupCard('200', { cardType: 'monster', name: 'Ccc', types: [] });

        const section = [
          createDisplayCard('150'),
          createDisplayCard('100'),
          createDisplayCard('200')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // カード名でソート: Aaa < Bbb < Ccc
        expect(comparator(section[0], section[1])).toBeLessThan(0); // Aaa < Bbb
        expect(comparator(section[1], section[2])).toBeLessThan(0); // Bbb < Ccc
      });
    });

    describe('エッジケース', () => {
      it('[covers:comparator.missing_card_returns_zero] 両方のカードが存在しない場合は0を返す', () => {
        const section = [];
        const comparator = createDeckCardComparator(section, {});

        const cardA = createDisplayCard('nonexistent1');
        const cardB = createDisplayCard('nonexistent2');

        expect(comparator(cardA, cardB)).toBe(0);
      });

      it('[covers:comparator.missing_card_returns_zero] 一方のカードが存在しない場合は0を返す', () => {
        setupCard('exists', { cardType: 'monster', name: 'Exists' });

        const section = [createDisplayCard('exists')];
        const comparator = createDeckCardComparator(section, {});

        const cardA = createDisplayCard('exists');
        const cardB = createDisplayCard('nonexistent');

        expect(comparator(cardA, cardB)).toBe(0);
      });

      it('[covers:comparator.options_default_values] 空のoptionsで初期化された場合もデフォルト動作をする', () => {
        setupCard('card1', { cardType: 'monster', name: 'Card1', types: [] });
        setupCard('card2', { cardType: 'monster', name: 'Card2', types: [] });

        const section = [
          createDisplayCard('card1'),
          createDisplayCard('card2')
        ];

        const comparator = createDeckCardComparator(section, {});

        // デフォルト：カード名でソート
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });
    });
  });

  describe('createDeckCardComparator 条件カバレッジ補完', () => {
    const setupCard = (cid: string, cardInfo: Partial<CardInfo>) => {
      const defaultCard: CardInfo = {
        cid,
        cardId: cid,
        nameRuby: `Card${cid}`,
        cardType: 'monster',
        cardKindTitle: 'モンスター',
        name: `Card${cid}`,
        tableA: {},
        tableB: {}
      };
      cardDB.set(cid, { ...defaultCard, ...cardInfo });
    };

    const createDisplayCard = (cid: string): DisplayCard => ({
      cid,
      ciid: 1,
      uuid: `uuid-${cid}`
    });

    it('[covers:comparator.head_both_listed_order_by_list_index] headPlacementCardIdsの配列順で両方の先頭配置カードを比較する', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [] });
      setupCard('b', { cardType: 'monster', name: 'B', types: [] });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparator = createDeckCardComparator(section, {
        headPlacementCardIds: ['b', 'a']
      });

      expect(comparator(section[0], section[1])).toBeGreaterThan(0);
    });

    it('[covers:comparator.head_only_a_listed_first] [covers:comparator.head_only_b_listed_first] 片方だけが先頭配置対象なら対象カードを先にする', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [] });
      setupCard('b', { cardType: 'monster', name: 'B', types: [] });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparatorA = createDeckCardComparator(section, {
        headPlacementCardIds: ['a']
      });
      const comparatorB = createDeckCardComparator(section, {
        headPlacementCardIds: ['b']
      });

      expect(comparatorA(section[0], section[1])).toBe(-1);
      expect(comparatorB(section[0], section[1])).toBe(1);
    });

    it('[covers:comparator.head_disabled_or_empty_skips_head_priority] 先頭配置が無効ならheadPlacementCardIdsを無視する', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [] });
      setupCard('b', { cardType: 'monster', name: 'B', types: [] });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparator = createDeckCardComparator(section, {
        enableHeadPlacement: false,
        headPlacementCardIds: ['b']
      });

      expect(comparator(section[0], section[1])).toBeLessThan(0);
    });

    it('[covers:comparator.category_disabled_skips_priority] カテゴリ優先が無効ならpriorityCategoryCardIdsを無視する', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [] });
      setupCard('b', { cardType: 'monster', name: 'B', types: [] });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparator = createDeckCardComparator(section, {
        enableCategoryPriority: false,
        priorityCategoryCardIds: new Set(['b'])
      });

      expect(comparator(section[0], section[1])).toBeLessThan(0);
    });

    it('[covers:comparator.category_quantity_equal_falls_through] quantity-descで枚数が同じなら後続比較へ進む', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [], levelValue: 4 });
      setupCard('b', { cardType: 'monster', name: 'B', types: [], levelValue: 8 });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparator = createDeckCardComparator(section, {
        priorityCategoryCardIds: new Set(['a', 'b']),
        categoryPrioritySortMode: 'quantity-desc'
      });

      expect(comparator(section[1], section[0])).toBeLessThan(0);
    });

    it('[covers:comparator.tail_disabled_or_same_flag_falls_through] 末尾配置が無効ならtailPlacementCardIdsを無視する', () => {
      setupCard('a', { cardType: 'monster', name: 'A', types: [] });
      setupCard('b', { cardType: 'monster', name: 'B', types: [] });
      const section = [createDisplayCard('a'), createDisplayCard('b')];

      const comparator = createDeckCardComparator(section, {
        enableTailPlacement: false,
        tailPlacementCardIds: ['a']
      });

      expect(comparator(section[0], section[1])).toBeLessThan(0);
    });

    it('[covers:comparator.default_card_type_order_precedes_all_same_type_priorities] defaultモードではカードタイプ順を先に使う', () => {
      setupCard('spell', { cardType: 'spell', name: 'Spell' });
      setupCard('trap', { cardType: 'trap', name: 'Trap' });
      const section = [createDisplayCard('spell'), createDisplayCard('trap')];

      const comparator = createDeckCardComparator(section, {
        enableTailPlacement: false
      });

      expect(comparator(section[0], section[1])).toBeLessThan(0);
    });

    it('[covers:race_compare_same_type_numeric_cid] by-raceで種族差がなければCIDを数値昇順で比較する', () => {
      setupCard('10', { cardType: 'monster', name: 'Ten', race: 'same' });
      setupCard('2', { cardType: 'monster', name: 'Two', race: 'same' });
      const section = [createDisplayCard('10'), createDisplayCard('2')];

      const comparator = createDeckCardComparator(section, { sortMode: 'by-race' });

      expect(comparator(section[1], section[0])).toBeLessThan(0);
    });

    it('[covers:attribute_compare_same_type_numeric_cid] by-attributeで属性差がなければCIDを数値昇順で比較する', () => {
      setupCard('10', { cardType: 'monster', name: 'Ten', attribute: 'same' });
      setupCard('2', { cardType: 'monster', name: 'Two', attribute: 'same' });
      const section = [createDisplayCard('10'), createDisplayCard('2')];

      const comparator = createDeckCardComparator(section, { sortMode: 'by-attribute' });

      expect(comparator(section[1], section[0])).toBeLessThan(0);
    });
  });

  describe('buildRecipeSortOptions', () => {
    it('[covers:build_options_maps_deps_with_defaults] depsからDeckSortOptionsを構築しnullish値だけデフォルトにする', () => {
      const categoryMatchedCardIds = new Set(['100']);
      const headPlacementCardIds = ['200'];
      const tailPlacementCardIds = ['300'];

      expect(buildRecipeSortOptions({
        enableCategoryPriority: undefined,
        categoryMatchedCardIds,
        enableHeadPlacement: false,
        headPlacementCardIds,
        enableTailPlacement: undefined,
        tailPlacementCardIds,
        levelSortOrder: undefined,
        categoryPrioritySortMode: 'quantity-desc'
      })).toEqual({
        enableCategoryPriority: true,
        priorityCategoryCardIds: categoryMatchedCardIds,
        enableHeadPlacement: false,
        headPlacementCardIds,
        enableTailPlacement: true,
        tailPlacementCardIds,
        levelSortOrder: 'desc',
        categoryPrioritySortMode: 'quantity-desc'
      });
    });
  });
});
