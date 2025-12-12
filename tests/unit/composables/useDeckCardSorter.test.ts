import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDeckCardComparator, type DisplayCard, type DeckSortOptions } from '@/composables/deck/useDeckCardSorter';
import { getTempCardDB } from '@/utils/temp-card-db';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import type { CardInfo } from '@/types/card';

describe('useDeckCardSorter', () => {
  beforeEach(() => {
    const db = getTempCardDB();
    db.clear();
  });

  afterEach(() => {
    const db = getTempCardDB();
    db.clear();
  });

  describe('createDeckCardComparator', () => {
    // テスト用のカード情報をセットアップする関数
    const setupCard = (cid: string, cardInfo: Partial<CardInfo>) => {
      const tempDb = getTempCardDB();
      const unifiedDB = getUnifiedCacheDB();
      const defaultCard: CardInfo = {
        cid,
        cardId: cid,  // cardIdをcidと同じにセット
        nameRuby: `Card${cid}`,
        cardType: 'monster',
        cardKindTitle: 'モンスター',
        name: `Card${cid}`,
        tableA: {},
        tableB: {}
      };
      const finalCard = { ...defaultCard, ...cardInfo };
      tempDb.set(cid, finalCard);
      // UnifiedDB にも登録（reconstructCardInfo で使用されるため）
      unifiedDB.setCardInfo(finalCard, true);
    };

    const createDisplayCard = (cid: string): DisplayCard => ({
      cid,
      ciid: 1,
      uuid: `uuid-${cid}`
    });

    describe('基本的なソート（カードタイプ）', () => {
      it('モンスター→魔法→罠の順でソートされる', () => {
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

      it('同じカードタイプの場合、カード名でソートされる', () => {
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
      it('カテゴリに含まれるカードが優先される', () => {
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

      it('同じカテゴリ内では枚数の多い順でソートされる', () => {
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
          priorityCategoryCardIds: new Set(['card1', 'card2'])
        });

        // card1を3枚、card2を1枚：3 > 1 なので card1 < card2
        expect(comparator(section[0], section[3])).toBeLessThan(0);
      });
    });

    describe('末尾配置ソート', () => {
      it('末尾配置カードは後ろに移動される', () => {
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
      it('by-raceモードでは種族でソートされる', () => {
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

      it('by-raceモードではモンスター < 魔法 < 罠の順が保たれる', () => {
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
      it('by-attributeモードでは属性でソートされる', () => {
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
      it('モンスタータイプ順序が正しく機能する', () => {
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
      it('レベルの高いモンスターが優先される', () => {
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
      it('同じカードタイプの魔法は効果タイプでソートされる', () => {
        setupCard('spell_quick', {
          cardType: 'spell',
          name: 'Quick',
          effectType: 'Quick-Play'
        });
        setupCard('spell_normal', {
          cardType: 'spell',
          name: 'Normal',
          effectType: 'Normal'
        });

        const section = [
          createDisplayCard('spell_quick'),
          createDisplayCard('spell_normal')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // Normal < Quick-Play（ロケール順）
        expect(comparator(section[1], section[0])).toBeLessThan(0);
      });

      it('同じカードタイプの罠は効果タイプでソートされる', () => {
        setupCard('trap_continuous', {
          cardType: 'trap',
          name: 'Continuous',
          effectType: 'Continuous'
        });
        setupCard('trap_counter', {
          cardType: 'trap',
          name: 'Counter',
          effectType: 'Counter'
        });

        const section = [
          createDisplayCard('trap_continuous'),
          createDisplayCard('trap_counter')
        ];

        const comparator = createDeckCardComparator(section, { sortMode: 'default' });

        // 'Continuous'.localeCompare('Counter') = -1（Continuous < Counter）
        // つまり trap_continuous(Continuous) < trap_counter(Counter)
        expect(comparator(section[0], section[1])).toBeLessThan(0);
      });
    });

    describe('複合ソート条件', () => {
      it('カテゴリ優先と末尾配置が併用される', () => {
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
      it('属性がない場合、カードタイプでソートされて、その後CIDでフォールバック', () => {
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

      it('同じカードタイプ内でカード名とCIDでソートされる', () => {
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
      it('両方のカードが存在しない場合は0を返す', () => {
        const section = [];
        const comparator = createDeckCardComparator(section, {});

        const cardA = createDisplayCard('nonexistent1');
        const cardB = createDisplayCard('nonexistent2');

        expect(comparator(cardA, cardB)).toBe(0);
      });

      it('一方のカードが存在しない場合は0を返す', () => {
        setupCard('exists', { cardType: 'monster', name: 'Exists' });

        const section = [createDisplayCard('exists')];
        const comparator = createDeckCardComparator(section, {});

        const cardA = createDisplayCard('exists');
        const cardB = createDisplayCard('nonexistent');

        expect(comparator(cardA, cardB)).toBe(0);
      });

      it('空のoptionsで初期化された場合もデフォルト動作をする', () => {
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
});
