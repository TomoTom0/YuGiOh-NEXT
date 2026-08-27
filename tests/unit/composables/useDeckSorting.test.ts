import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sortDisplayOrderForOfficial, type DisplayCardRef } from '@/composables/deck/useDeckSorting';
import type { DeckCardRef } from '@/types/deck';
import type { CardInfo } from '@/types/card';

// TempCacheDBをシンプルなMapでモック
const mockCardDB = new Map<string, CardInfo>();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockCardDB.get(cid),
    set: (cid: string, card: CardInfo) => { mockCardDB.set(cid, card); return true; },
    clear: () => mockCardDB.clear(),
  }),
  recordDeckOpen: vi.fn(),
}));

describe('useDeckSorting', () => {
  beforeEach(() => {
    mockCardDB.clear();
  });

  afterEach(() => {
    mockCardDB.clear();
  });

  describe('sortDisplayOrderForOfficial', () => {
    it('空の配列を渡すと空の結果を返す [covers:sort.empty_display_order_early_return]', () => {
      const result = sortDisplayOrderForOfficial([], []);

      expect(result.sortedDisplayOrder).toEqual([]);
      expect(result.sortedDeck).toEqual([]);
    });

    it('モンスター→魔法→罠の順にソートされる [covers:sort.primary_sort_by_card_type_priority]', () => {
      // テストデータ準備

      const monsterCard: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      const spellCard: CardInfo = {
        cid: 'spell1',
        nameRuby: '魔法',
        cardType: 'spell',
        cardKindTitle: '魔法'
      };

      const trapCard: CardInfo = {
        cid: 'trap1',
        nameRuby: '罠',
        cardType: 'trap',
        cardKindTitle: '罠'
      };

      mockCardDB.set(monsterCard.cid, monsterCard);
      mockCardDB.set(spellCard.cid, spellCard);
      mockCardDB.set(trapCard.cid, trapCard);

      // 罠→魔法→モンスターの順に並んでいる
      const displayOrder: DisplayCardRef[] = [
        { cid: 'trap1', ciid: '1' },
        { cid: 'spell1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'trap1', ciid: '1' },
        { cid: 'spell1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // モンスター→魔法→罠の順にソートされる
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster1', ciid: '3' },
        { cid: 'spell1', ciid: '2' },
        { cid: 'trap1', ciid: '1' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '3' },
        { cid: 'spell1', ciid: '2' },
        { cid: 'trap1', ciid: '1' }
      ]);
    });

    it('同じカードタイプ内では最初の登場順を保持する [covers:sort.secondary_sort_by_first_appearance_within_same_type]', () => {

      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      const monster2: CardInfo = {
        cid: 'monster2',
        nameRuby: 'モンスター2',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      const monster3: CardInfo = {
        cid: 'monster3',
        nameRuby: 'モンスター3',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      mockCardDB.set(monster1.cid, monster1);
      mockCardDB.set(monster2.cid, monster2);
      mockCardDB.set(monster3.cid, monster3);

      // monster3 → monster1 → monster2 の順
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster3', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster2', ciid: '3' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'monster3', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster2', ciid: '3' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // 最初の登場順を保持
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster3', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster2', ciid: '3' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster3', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster2', ciid: '3' }
      ]);
    });

    it('同じカードが複数枚ある場合、最初の登場順を保持する [covers:sort.secondary_sort_by_first_appearance_within_same_type]', () => {

      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      mockCardDB.set(monster1.cid, monster1);

      // 同じカードが3枚
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // 順序を保持
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '3' }
      ]);
    });

    it('ciid（Card Image ID）は変更されない [covers:sort.preserves_ciid_via_string_coercion]', () => {

      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      const spell1: CardInfo = {
        cid: 'spell1',
        nameRuby: '魔法1',
        cardType: 'spell',
        cardKindTitle: '魔法'
      };

      mockCardDB.set(monster1.cid, monster1);
      mockCardDB.set(spell1.cid, spell1);

      // ciidが異なる同じカード
      const displayOrder: DisplayCardRef[] = [
        { cid: 'spell1', ciid: '1' },
        { cid: 'monster1', ciid: '2' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'spell1', ciid: '1' },
        { cid: 'monster1', ciid: '2' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // ciidが保持される
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster1', ciid: '2' },
        { cid: 'spell1', ciid: '1' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '2' },
        { cid: 'spell1', ciid: '1' }
      ]);
    });

    it('TempCardDB にカード情報がない場合、モンスターとして扱われる [covers:sort.card_info_missing_defaults_to_monster_priority]', () => {
      // カード情報を登録しない
      const displayOrder: DisplayCardRef[] = [
        { cid: 'unknown1', ciid: 1, uuid: 'U1' },
        { cid: 'unknown2', ciid: 2, uuid: 'U2' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // デフォルト優先度（モンスター）として扱われ、最初の登場順を保持
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'unknown1', ciid: 1, uuid: 'U1' },
        { cid: 'unknown2', ciid: 2, uuid: 'U2' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ]);
    });

    it('【TASK-281修正確認】TempCardDB未設定時(parseDeckDetail修正前の状態)は魔法・罠がモンスター扱いでソートされない [covers:sort.card_info_missing_defaults_to_monster_priority]', () => {
      // TempCardDB は空のまま（parseDeckDetail がTempCardDB未設定だった旧バグを再現）
      // 魔法→モンスター→罠の混在順
      const displayOrder: DisplayCardRef[] = [
        { cid: 'spell1', ciid: 1, uuid: 'S1' },
        { cid: 'monster1', ciid: 2, uuid: 'M1' },
        { cid: 'trap1', ciid: 3, uuid: 'T1' },
      ];
      const deck: DeckCardRef[] = [
        { cid: 'spell1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'trap1', ciid: '3' },
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // 全てモンスター扱いのため firstAppearance 順（入力順）を保持してしまい、
      // モンスター→魔法→罠 に並ばない（バグ再現）
      expect(result.sortedDisplayOrder.map(d => d.cid)).toEqual(['spell1', 'monster1', 'trap1']);
    });

    it('【TASK-281修正確認】TempCardDB設定済み(parseDeckDetail修正後の状態)は魔法・罠を正しくソートする [covers:sort.primary_sort_by_card_type_priority]', () => {
      // parseDeckDetail の修正後: TempCardDB にカードタイプが登録される
      const spellInfo: CardInfo = { cid: 'spell1', nameRuby: '魔法1', cardType: 'spell', cardKindTitle: '魔法' };
      const monsterInfo: CardInfo = { cid: 'monster1', nameRuby: 'モンスター1', cardType: 'monster', cardKindTitle: 'モンスター' };
      const trapInfo: CardInfo = { cid: 'trap1', nameRuby: '罠1', cardType: 'trap', cardKindTitle: '罠' };
      mockCardDB.set('spell1', spellInfo);
      mockCardDB.set('monster1', monsterInfo);
      mockCardDB.set('trap1', trapInfo);

      // 魔法→モンスター→罠の混在順
      const displayOrder: DisplayCardRef[] = [
        { cid: 'spell1', ciid: 1, uuid: 'S1' },
        { cid: 'monster1', ciid: 2, uuid: 'M1' },
        { cid: 'trap1', ciid: 3, uuid: 'T1' },
      ];
      const deck: DeckCardRef[] = [
        { cid: 'spell1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'trap1', ciid: '3' },
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // モンスター→魔法→罠 に正しくソートされる（修正後の期待動作）
      expect(result.sortedDisplayOrder.map(d => d.cid)).toEqual(['monster1', 'spell1', 'trap1']);
    });

    it('複雑な混合ケース: モンスター・魔法・罠が混在し、同じカードが複数枚ある [covers:sort.primary_sort_by_card_type_priority] [covers:sort.secondary_sort_by_first_appearance_within_same_type]', () => {

      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      const spell1: CardInfo = {
        cid: 'spell1',
        nameRuby: '魔法1',
        cardType: 'spell',
        cardKindTitle: '魔法'
      };

      const trap1: CardInfo = {
        cid: 'trap1',
        nameRuby: '罠1',
        cardType: 'trap',
        cardKindTitle: '罠'
      };

      mockCardDB.set(monster1.cid, monster1);
      mockCardDB.set(spell1.cid, spell1);
      mockCardDB.set(trap1.cid, trap1);

      // 混在した順序
      const displayOrder: DisplayCardRef[] = [
        { cid: 'trap1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'spell1', ciid: '3' },
        { cid: 'monster1', ciid: '4' },
        { cid: 'trap1', ciid: '5' },
        { cid: 'spell1', ciid: '6' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'trap1', ciid: '1' },
        { cid: 'monster1', ciid: '2' },
        { cid: 'spell1', ciid: '3' },
        { cid: 'monster1', ciid: '4' },
        { cid: 'trap1', ciid: '5' },
        { cid: 'spell1', ciid: '6' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // モンスター（最初の登場順: 2, 4）→ 魔法（3, 6）→ 罠（1, 5）
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '4' },
        { cid: 'spell1', ciid: '3' },
        { cid: 'spell1', ciid: '6' },
        { cid: 'trap1', ciid: '1' },
        { cid: 'trap1', ciid: '5' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '2' },
        { cid: 'monster1', ciid: '4' },
        { cid: 'spell1', ciid: '3' },
        { cid: 'spell1', ciid: '6' },
        { cid: 'trap1', ciid: '1' },
        { cid: 'trap1', ciid: '5' }
      ]);
    });

    it('sortedDeck は cid+ciid 重複を除去する [covers:sort.dedup_sorted_deck_by_cid_ciid_composite]', () => {
      // displayOrder に同一 cid+ciid の重複エントリが含まれるケース
      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };
      mockCardDB.set(monster1.cid, monster1);

      // m1_1 が2回 + m2_2 が1回
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '1' }, // 重複
        { cid: 'monster2', ciid: '2' }
      ];
      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster2', ciid: '2' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // sortedDisplayOrder は重複含め全件保持
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster2', ciid: '2' }
      ]);

      // sortedDeck は cid+ciid 合成キーで重複除去（m1_1 は2回目スキップ）
      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster2', ciid: '2' }
      ]);

      // 非対称性: display は3件、deck は2件
      expect(result.sortedDisplayOrder.length).toBe(3);
      expect(result.sortedDeck.length).toBe(2);
    });

    it('deck に存在しない displayOrder 要素は sortedDeck から除外される [covers:sort.skips_display_cards_without_matching_deck_card]', () => {
      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };
      mockCardDB.set(monster1.cid, monster1);

      // displayOrder にのみ onlyDisplay が存在（deck には無い）
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'onlyDisplay', ciid: '9' }
      ];
      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' }
        // onlyDisplay エントリは無い
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // sortedDisplayOrder には onlyDisplay も残る
      // (cardTypeMap.get('onlyDisplay') || 0 -> モンスター扱い、firstAppearance 順)
      expect(result.sortedDisplayOrder.map(d => d.cid)).toEqual(['monster1', 'onlyDisplay']);

      // sortedDeck には onlyDisplay は含まれない（find が undefined を返すため）
      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '1' }
      ]);
    });

    it('【TASK-354】イラスト違い（同cid・ciid違い）がdeckに混在する場合、cid+ciid完全一致で正しく対応付けられる', () => {
      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'イラスト違いを持つモンスター',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };
      mockCardDB.set(monster1.cid, monster1);

      // 同cidで ciid=1（通常）と ciid=2（イラスト違い）が混在
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' }
      ];
      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'monster1', ciid: '2' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // 両方のciidエントリが消失せず保持される
      expect(result.sortedDeck).toHaveLength(2);
      expect(result.sortedDeck).toContainEqual({ cid: 'monster1', ciid: '1' });
      expect(result.sortedDeck).toContainEqual({ cid: 'monster1', ciid: '2' });
    });

    it('【TASK-354】displayOrderとdeckのciid型違い（number vs string）でも消失しない', () => {
      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };
      mockCardDB.set(monster1.cid, monster1);

      // displayOrder は ciid が number、deck は string（実データで発生し得る型不一致）
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: 1 },
      ];
      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' },
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '1' }
      ]);
    });

    it('【TASK-354】displayOrderに現れないdeckエントリも消失せず末尾に保持される', () => {
      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };
      const spell1: CardInfo = {
        cid: 'spell1',
        nameRuby: '魔法1',
        cardType: 'spell',
        cardKindTitle: '魔法'
      };
      mockCardDB.set(monster1.cid, monster1);
      mockCardDB.set(spell1.cid, spell1);

      // deck には spell1 があるが displayOrder には無い（一時的に外れた状態）
      const displayOrder: DisplayCardRef[] = [
        { cid: 'monster1', ciid: '1' },
      ];
      const deck: DeckCardRef[] = [
        { cid: 'monster1', ciid: '1' },
        { cid: 'spell1', ciid: '1' },
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // spell1 は displayOrder に無くても sortedDeck の末尾に残る（消失しない）
      expect(result.sortedDeck).toEqual([
        { cid: 'monster1', ciid: '1' },
        { cid: 'spell1', ciid: '1' }
      ]);
    });
  });
});
