import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sortDisplayOrderForOfficial, type DisplayCardRef } from '@/composables/deck/useDeckSorting';
import { getTempCardDB } from '@/utils/temp-card-db';
import type { DeckCardRef } from '@/types/deck';
import type { CardInfo } from '@/types/card';

describe('useDeckSorting', () => {
  beforeEach(() => {
    // TempCardDB をクリア
    const db = getTempCardDB();
    db.clear();
  });

  afterEach(() => {
    // TempCardDB をクリア
    const db = getTempCardDB();
    db.clear();
  });

  describe('sortDisplayOrderForOfficial', () => {
    it('空の配列を渡すと空の結果を返す', () => {
      const result = sortDisplayOrderForOfficial([], []);

      expect(result.sortedDisplayOrder).toEqual([]);
      expect(result.sortedDeck).toEqual([]);
    });

    it('モンスター→魔法→罠の順にソートされる', () => {
      // テストデータ準備
      const db = getTempCardDB();

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

      db.set(monsterCard.cid, monsterCard);
      db.set(spellCard.cid, spellCard);
      db.set(trapCard.cid, trapCard);

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

    it('同じカードタイプ内では最初の登場順を保持する', () => {
      const db = getTempCardDB();

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

      db.set(monster1.cid, monster1);
      db.set(monster2.cid, monster2);
      db.set(monster3.cid, monster3);

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

    it('同じカードが複数枚ある場合、最初の登場順を保持する', () => {
      const db = getTempCardDB();

      const monster1: CardInfo = {
        cid: 'monster1',
        nameRuby: 'モンスター1',
        cardType: 'monster',
        cardKindTitle: 'モンスター'
      };

      db.set(monster1.cid, monster1);

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

    it('ciid（Card Image ID）は変更されない', () => {
      const db = getTempCardDB();

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

      db.set(monster1.cid, monster1);
      db.set(spell1.cid, spell1);

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

    it('TempCardDB にカード情報がない場合、モンスターとして扱われる', () => {
      const db = getTempCardDB();

      // カード情報を登録しない
      const displayOrder: DisplayCardRef[] = [
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ];

      const deck: DeckCardRef[] = [
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ];

      const result = sortDisplayOrderForOfficial(displayOrder, deck);

      // デフォルト優先度（モンスター）として扱われ、最初の登場順を保持
      expect(result.sortedDisplayOrder).toEqual([
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ]);

      expect(result.sortedDeck).toEqual([
        { cid: 'unknown1', ciid: '1' },
        { cid: 'unknown2', ciid: '2' }
      ]);
    });

    it('複雑な混合ケース: モンスター・魔法・罠が混在し、同じカードが複数枚ある', () => {
      const db = getTempCardDB();

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

      db.set(monster1.cid, monster1);
      db.set(spell1.cid, spell1);
      db.set(trap1.cid, trap1);

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
  });
});
