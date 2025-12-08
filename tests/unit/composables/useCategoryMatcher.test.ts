import { computeCategoryMatchedCardIds } from '../../../src/composables/deck/useCategoryMatcher';
import type { DeckCardRef, CardData } from '../../../src/types/deck';

/**
 * useCategoryMatcher のユニットテスト
 *
 * カテゴリマッチング検索のロジックをテスト
 * - 一段階目: カテゴリラベルを名前/ルビ/テキスト/p-textに含むcid
 * - 二段階目: 一段階目で見つかったカード名をテキスト/p-textに含むcid（一段階目は除外）
 */

console.log('=== Testing useCategoryMatcher ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   ${error}`);
      testsFailed++;
    }
  })();
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

function assertFalse(value: boolean, message?: string) {
  if (value) {
    throw new Error(message || 'Expected false');
  }
}

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

// テスト実行
(async () => {
  // 1. カテゴリが選択されていない場合
  await test('カテゴリが選択されていない場合は空のSetを返す', () => {
    const result = computeCategoryMatchedCardIds(
      [],
      {},
      emptyDecks,
      cardDBGetter
    );
    assertEquals(result.size, 0);
  });

  // 2. カテゴリラベルが存在しない場合
  await test('カテゴリラベルが存在しない場合は空のSetを返す', () => {
    const result = computeCategoryMatchedCardIds(
      ['cat1'],
      {},
      emptyDecks,
      cardDBGetter
    );
    assertEquals(result.size, 0);
  });

  // 3. 一段階目：カード名にカテゴリラベルを含むカードを検出
  await test('一段階目：カード名にカテゴリラベルを含むカードを検出', () => {
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
    assertEquals(result.size, 1);
    assertTrue(result.has('1'));
  });

  // 4. 一段階目：ルビにカテゴリラベルを含むカードを検出
  await test('一段階目：ルビにカテゴリラベルを含むカードを検出', () => {
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
    assertEquals(result.size, 1);
    assertTrue(result.has('4'));
  });

  // 5. 一段階目：テキストにカテゴリラベルを含むカードを検出
  await test('一段階目：テキストにカテゴリラベルを含むカードを検出', () => {
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
    assertEquals(result.size, 1);
    assertTrue(result.has('1'));
  });

  // 6. 二段階目：一段階目で見つかったカード名をテキストに含むカードを検出
  await test('二段階目：一段階目で見つかったカード名をテキストに含むカードを検出', () => {
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
    assertEquals(result.size, 3);
    assertTrue(result.has('1'));
    assertTrue(result.has('2'));
    assertTrue(result.has('3'));
  });

  // 7. 二段階目は一段階目で見つかったカードを除外する
  await test('二段階目は一段階目で見つかったカードを除外する', () => {
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
    assertEquals(result.size, 2);
    assertTrue(result.has('1'));
    assertTrue(result.has('2'));
  });

  // 8. 複数カテゴリ
  await test('複数カテゴリで検索できる', () => {
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
    assertEquals(result.size, 2);
    assertTrue(result.has('1'));
    assertTrue(result.has('4'));
  });

  // 9. 複数セクションからカードを収集
  await test('複数セクション（main, extra, side, trash）からカードを収集', () => {
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
    assertEquals(result.size, 3);
    assertTrue(result.has('1'));
    assertTrue(result.has('4'));
    assertTrue(result.has('5'));
  });

  // 10. カードDBにないカードは無視される
  await test('カードDBにないカードは無視される', () => {
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
    assertEquals(result.size, 1);
    assertTrue(result.has('1'));
    assertFalse(result.has('999'));
  });

  console.log(`\n✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);

  process.exit(testsFailed > 0 ? 1 : 0);
})();
