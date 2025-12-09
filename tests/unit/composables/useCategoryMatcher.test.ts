import { describe, it, expect } from 'vitest';
import { computeCategoryMatchedCardIds } from '../../../src/composables/deck/useCategoryMatcher';
import type { DeckCardRef, CardData } from '../../../src/types/deck';

// テストデータ
const mockCardDB: Record<string, CardData> = {
  '1': {
    cardId: '1',
    name: 'ブラック・マジシャン',
    ruby: 'ブラック・マジシャン',
    cardType: 'monster',
    text: '魔法使い族の代表的なモンスター',
    pendulumText: ''
  },
  '2': {
    cardId: '2',
    name: 'ブラック・マジシャン・ガール',
    ruby: 'ブラック・マジシャン・ガール',
    cardType: 'monster',
    text: 'ブラック・マジシャンを師匠とする見習い魔法使い',
    pendulumText: ''
  },
  '3': {
    cardId: '3',
    name: '黒魔導強化',
    ruby: 'ブラック・マジック・ストレングス',
    cardType: 'spell',
    text: 'ブラック・マジシャンの攻撃力を上昇させる',
    pendulumText: ''
  },
  '4': {
    cardId: '4',
    name: '青眼の白龍',
    ruby: 'ブルーアイズ・ホワイト・ドラゴン',
    cardType: 'monster',
    text: '高い攻撃力を誇る伝説のドラゴン',
    pendulumText: ''
  },
  '5': {
    cardId: '5',
    name: '青眼の究極竜',
    ruby: 'ブルーアイズ・アルティメットドラゴン',
    cardType: 'monster',
    text: '青眼の白龍3体を融合召喚した究極のドラゴン',
    pendulumText: ''
  }
};

const cardDBGetter = (cid: string) => mockCardDB[cid];

const emptyDecks = {
  main: [] as DeckCardRef[],
  extra: [] as DeckCardRef[],
  side: [] as DeckCardRef[],
  trash: [] as DeckCardRef[]
};

describe('useCategoryMatcher', () => {
  it('カテゴリが選択されていない場合は空のSetを返す', () => {
    const result = computeCategoryMatchedCardIds(
      [],
      {},
      emptyDecks,
      cardDBGetter
    );
    expect(result.size).toBe(0);
  });

  it('カテゴリラベルが存在しない場合は空のSetを返す', () => {
    const result = computeCategoryMatchedCardIds(
      ['cat1'],
      {},
      emptyDecks,
      cardDBGetter
    );
    expect(result.size).toBe(0);
  });

  describe('一段階目：カテゴリラベルの直接マッチング', () => {
    it('カード名にカテゴリラベルを含むカードを検出', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });

    it('ルビにカテゴリラベルを含むカードを検出', () => {
      const decks = {
        main: [{ cid: '4', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('4')).toBe(true);
    });

    it('テキストにカテゴリラベルを含むカードを検出', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: '魔法使い族' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });
  });

  describe('二段階目：一段階目で見つかったカード名のマッチング', () => {
    it('一段階目で見つかったカード名をテキストに含むカードを検出', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '2', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '3', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      // 1: カテゴリラベルがカード名に含まれる（一段階目）
      // 2: テキストに「ブラック・マジシャン」を含む（二段階目）
      // 3: テキストに「ブラック・マジシャン」を含む（二段階目）
      expect(result.size).toBe(3);
      expect(result.has('1')).toBe(true);
      expect(result.has('2')).toBe(true);
      expect(result.has('3')).toBe(true);
    });

    it('二段階目は一段階目で見つかったカードを除外する', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '2', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      // 1: 一段階目で検出（カード名に「ブラック・マジシャン」）
      // 2: 二段階目で検出（テキストに「ブラック・マジシャン」、ただし1は除外）
      expect(result.size).toBe(2);
      expect(result.has('1')).toBe(true);
      expect(result.has('2')).toBe(true);
    });
  });

  describe('複数カテゴリ・複数セクション', () => {
    it('複数カテゴリで検索できる', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '4', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1', 'cat2'],
        { cat1: 'ブラック・マジシャン', cat2: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(2);
      expect(result.has('1')).toBe(true);
      expect(result.has('4')).toBe(true);
    });

    it('複数セクション（main, extra, side, trash）からカードを収集', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [{ cid: '4', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        side: [{ cid: '5', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1', 'cat2'],
        { cat1: 'ブラック・マジシャン', cat2: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      // 1: main（一段階目）
      // 4: extra（一段階目）
      // 5: side（二段階目、テキストに「青眼の白龍」を含む）
      expect(result.size).toBe(3);
      expect(result.has('1')).toBe(true);
      expect(result.has('4')).toBe(true);
      expect(result.has('5')).toBe(true);
    });
  });

  describe('エッジケース', () => {
    it('カードDBにないカードは無視される', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '999', ciid: '0', lang: 'ja', quantity: 1 } // 存在しないカード
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
      expect(result.has('999')).toBe(false);
    });
  });
});
