import { JSDOM } from 'jsdom';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '../../../src/stores/deck-edit';
import type { CardInfo } from '../../../src/types/card';

/**
 * deck-edit.ts のユニットテスト
 */

// JSDOMでwindow/documentをモック
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document as any;
global.HTMLElement = dom.window.HTMLElement as any;

// window.matchMediaのモック
(global.window as any).matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

// chrome APIのモック
(global as any).chrome = {
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
};

console.log('=== Testing deck-edit.ts (store) ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      // 各テストで新しいPiniaインスタンスを作成
      setActivePinia(createPinia());
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

function assertExists(value: any, message?: string) {
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to exist');
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

// テスト用のカードデータ
const sampleMonster: CardInfo = {
  cardId: '4831',
  ciid: 0,
  imgs: '4831_0',
  name: 'ブラック・マジシャン',
  cardType: 'monster',
  attribute: 'dark',
  level: 7,
  race: 'spellcaster',
  atkDef: '2500/2100',
  monsterTypes: ['normal']
};

const sampleSpell: CardInfo = {
  cardId: '5851',
  ciid: 0,
  imgs: '5851_0',
  name: '死者蘇生',
  cardType: 'spell',
  spellType: 'normal'
};

const sampleTrap: CardInfo = {
  cardId: '5728',
  ciid: 0,
  imgs: '5728_0',
  name: '聖なるバリア -ミラーフォース-',
  cardType: 'trap',
  trapType: 'normal'
};

const sampleFusion: CardInfo = {
  cardId: '6983',
  ciid: 0,
  imgs: '6983_0',
  name: '青眼の究極竜',
  cardType: 'monster',
  attribute: 'light',
  level: 12,
  race: 'dragon',
  atkDef: '4500/3800',
  monsterTypes: ['fusion'],
  types: ['fusion']
};

// テスト実行
(async () => {
  // ===== カード追加テスト =====
  
  await test('addCard: メインデッキにモンスター追加', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    
    assertEquals(store.deckInfo.mainDeck.length, 1, 'mainDeckに1枚追加されること');
    assertEquals(store.deckInfo.mainDeck[0]?.card.cardId, '4831', 'カードIDが正しいこと');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 1, '枚数が1であること');
  });

  await test('addCard: 同じカードを複数枚追加', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleMonster, 'main');
    
    assertEquals(store.deckInfo.mainDeck.length, 1, 'mainDeckには1種類のみ');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 3, '枚数が3であること');
  });

  await test('addCard: エクストラデッキに融合モンスター追加', () => {
    const store = useDeckEditStore();
    store.addCard(sampleFusion, 'extra');
    
    assertEquals(store.deckInfo.extraDeck.length, 1, 'extraDeckに1枚追加されること');
    assertEquals(store.deckInfo.extraDeck[0]?.card.cardId, '6983', 'カードIDが正しいこと');
  });

  await test('addCard: サイドデッキに魔法追加', () => {
    const store = useDeckEditStore();
    store.addCard(sampleSpell, 'side');
    
    assertEquals(store.deckInfo.sideDeck.length, 1, 'sideDeckに1枚追加されること');
    assertEquals(store.deckInfo.sideDeck[0]?.card.cardId, '5851', 'カードIDが正しいこと');
  });

  // ===== カード削除テスト =====

  await test('removeCard: メインデッキからカード削除（1枚）', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    store.removeCard(sampleMonster.cardId, 'main');
    
    assertEquals(store.deckInfo.mainDeck.length, 0, 'mainDeckが空になること');
  });

  await test('removeCard: メインデッキからカード削除（複数枚→1枚減る）', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleMonster, 'main');
    store.removeCard(sampleMonster.cardId, 'main');
    
    assertEquals(store.deckInfo.mainDeck.length, 1, 'mainDeckに1種類残る');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 1, '枚数が1に減ること');
  });

  await test('removeCard: エクストラデッキからカード削除', () => {
    const store = useDeckEditStore();
    store.addCard(sampleFusion, 'extra');
    store.removeCard(sampleFusion.cardId, 'extra');
    
    assertEquals(store.deckInfo.extraDeck.length, 0, 'extraDeckが空になること');
  });

  await test('removeCard: サイドデッキからカード削除', () => {
    const store = useDeckEditStore();
    store.addCard(sampleSpell, 'side');
    store.removeCard(sampleSpell.cardId, 'side');
    
    assertEquals(store.deckInfo.sideDeck.length, 0, 'sideDeckが空になること');
  });

  // ===== カード移動テスト =====

  await test('moveCardToSide: メインデッキからサイドへ移動', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    store.moveCardToSide(sampleMonster, 'main');
    
    assertEquals(store.deckInfo.mainDeck.length, 0, 'mainDeckが空になること');
    assertEquals(store.deckInfo.sideDeck.length, 1, 'sideDeckに1枚追加されること');
    assertEquals(store.deckInfo.sideDeck[0]?.card.cardId, '4831', 'カードIDが正しいこと');
  });

  await test('moveCardFromSide: サイドデッキからメイン/エクストラへ移動', () => {
    const store = useDeckEditStore();
    store.addCard(sampleSpell, 'side');
    store.moveCardFromSide(sampleSpell);
    
    assertEquals(store.deckInfo.sideDeck.length, 0, 'sideDeckが空になること');
    assertEquals(store.deckInfo.mainDeck.length, 1, 'mainDeckに1枚追加されること');
    assertEquals(store.deckInfo.mainDeck[0]?.card.cardId, '5851', 'カードIDが正しいこと');
  });

  await test('moveCardToMainOrExtra: サイドデッキからメイン/エクストラへ移動（融合モンスター）', () => {
    const store = useDeckEditStore();
    store.addCard(sampleFusion, 'side');
    // 融合モンスターなのでExtraへ移動するはず
    store.moveCardToMainOrExtra(sampleFusion, 'side');
    
    assertEquals(store.deckInfo.sideDeck.length, 0, 'sideDeckが空になること');
    // 融合モンスターはextraに移動
    // ただしstoreの実装を確認する必要がある
    const totalCards = store.deckInfo.mainDeck.length + store.deckInfo.extraDeck.length;
    assertEquals(totalCards, 1, 'main/extraのいずれかに1枚追加されること');
  });

  // ===== 枚数制限チェックテスト =====

  await test('addCard: 3枚制限（main/extra/side合計）', () => {
    const store = useDeckEditStore();
    
    // メインに2枚追加
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleMonster, 'main');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 2, 'メインに2枚');
    
    // サイドに1枚追加
    store.addCard(sampleMonster, 'side');
    assertEquals(store.deckInfo.sideDeck[0]?.quantity, 1, 'サイドに1枚');
    
    // 合計3枚なので、4枚目は追加されない
    store.addCard(sampleMonster, 'main');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 2, 'メインは2枚のまま');
    
    // 別のセクションへの追加も無効
    store.addCard(sampleMonster, 'extra');
    assertEquals(store.deckInfo.extraDeck.length, 0, 'エクストラには追加されない');
  });

  await test('addCard: 3枚制限（異なるセクションでの分散）', () => {
    const store = useDeckEditStore();
    
    // main, extra, sideに1枚ずつ
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleMonster, 'extra');
    store.addCard(sampleMonster, 'side');
    
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 1, 'メインに1枚');
    assertEquals(store.deckInfo.extraDeck[0]?.quantity, 1, 'エクストラに1枚');
    assertEquals(store.deckInfo.sideDeck[0]?.quantity, 1, 'サイドに1枚');
    
    // 4枚目は追加されない
    store.addCard(sampleMonster, 'main');
    assertEquals(store.deckInfo.mainDeck[0]?.quantity, 1, 'メインは1枚のまま');
  });

  // ===== ソート機能テスト =====

  await test('sortDisplayOrderForOfficial: モンスター→魔法→罠の順序', () => {
    const store = useDeckEditStore();
    
    // 罠→魔法→モンスターの順で追加（逆順）
    store.addCard(sampleTrap, 'main');
    store.addCard(sampleSpell, 'main');
    store.addCard(sampleMonster, 'main');
    
    // ソート実行
    store.sortDisplayOrderForOfficial();
    
    // mainDeckの順序確認
    assertEquals(store.deckInfo.mainDeck.length, 3, '3種類のカードがある');
    
    // モンスター→魔法→罠の順になっているか確認
    const cardTypes = store.deckInfo.mainDeck.map(dc => dc.card.cardType);
    assertEquals(cardTypes[0], 'monster', '1番目はモンスター');
    assertEquals(cardTypes[1], 'spell', '2番目は魔法');
    assertEquals(cardTypes[2], 'trap', '3番目は罠');
  });

  await test('sortDisplayOrderForOfficial: 同じタイプ内では元の順序を維持', () => {
    const store = useDeckEditStore();
    
    const monster1: CardInfo = { ...sampleMonster, cardId: '1001', imgs: '1001_0' };
    const monster2: CardInfo = { ...sampleMonster, cardId: '1002', imgs: '1002_0' };
    const monster3: CardInfo = { ...sampleMonster, cardId: '1003', imgs: '1003_0' };
    
    store.addCard(monster1, 'main');
    store.addCard(monster2, 'main');
    store.addCard(monster3, 'main');
    
    store.sortDisplayOrderForOfficial();
    
    // モンスターの順序が保持されているか確認
    assertEquals(store.deckInfo.mainDeck[0]?.card.cardId, '1001', '1番目のモンスター');
    assertEquals(store.deckInfo.mainDeck[1]?.card.cardId, '1002', '2番目のモンスター');
    assertEquals(store.deckInfo.mainDeck[2]?.card.cardId, '1003', '3番目のモンスター');
  });

  // ===== デッキ情報更新テスト =====

  await test('setDeckName: デッキ名を設定', () => {
    const store = useDeckEditStore();
    store.setDeckName('テストデッキ');
    
    assertEquals(store.deckInfo.name, 'テストデッキ', 'デッキ名が設定されること');
  });

  await test('addCard + removeCard: 複数操作の確認', () => {
    const store = useDeckEditStore();
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleFusion, 'extra');
    store.addCard(sampleSpell, 'side');

    assertEquals(store.deckInfo.mainDeck.length, 1, 'mainDeckに1種類');
    assertEquals(store.deckInfo.extraDeck.length, 1, 'extraDeckに1種類');
    assertEquals(store.deckInfo.sideDeck.length, 1, 'sideDeckに1種類');

    store.removeCard(sampleMonster.cardId, 'main');
    store.removeCard(sampleFusion.cardId, 'extra');
    store.removeCard(sampleSpell.cardId, 'side');

    assertEquals(store.deckInfo.mainDeck.length, 0, 'mainDeckが空');
    assertEquals(store.deckInfo.extraDeck.length, 0, 'extraDeckが空');
    assertEquals(store.deckInfo.sideDeck.length, 0, 'sideDeckが空');
  });

  // ===== Undo/Redo テスト =====

  await test('undo/redo: 基本的な動作確認', () => {
    const store = useDeckEditStore();

    // 初期状態: canUndo=false, canRedo=false
    assertEquals(store.canUndo, false, '初期状態ではcanUndoがfalse');
    assertEquals(store.canRedo, false, '初期状態ではcanRedoがfalse');

    // カード追加（command記録される）
    store.addCard(sampleMonster, 'main');
    assertEquals(store.deckInfo.mainDeck.length, 1, 'カード追加後は1枚');
    assertEquals(store.canUndo, true, 'addCard後はcanUndoがtrue');
    assertEquals(store.canRedo, false, 'addCard後はcanRedoがfalse');

    // Undo
    store.undo();
    assertEquals(store.deckInfo.mainDeck.length, 0, 'undo後は0枚');
    assertEquals(store.canUndo, false, 'undo後はcanUndoがfalse');
    assertEquals(store.canRedo, true, 'undo後はcanRedoがtrue');

    // Redo
    store.redo();
    assertEquals(store.deckInfo.mainDeck.length, 1, 'redo後は1枚');
    assertEquals(store.canUndo, true, 'redo後はcanUndoがtrue');
    assertEquals(store.canRedo, false, 'redo後はcanRedoがfalse');
  });

  await test('undo/redo: 複数操作の状態遷移', () => {
    const store = useDeckEditStore();

    // addCard -> removeCard -> addCard
    store.addCard(sampleMonster, 'main');
    store.addCard(sampleSpell, 'main');
    store.removeCard(sampleMonster.cardId, 'main');

    assertEquals(store.deckInfo.mainDeck.length, 1, '操作後は1枚');
    assertEquals(store.canUndo, true, 'canUndoがtrue');
    assertEquals(store.canRedo, false, 'canRedoがfalse');

    // 3回Undo
    store.undo();
    assertEquals(store.deckInfo.mainDeck.length, 2, '1回目Undo後は2枚');

    store.undo();
    assertEquals(store.deckInfo.mainDeck.length, 1, '2回目Undo後は1枚');

    store.undo();
    assertEquals(store.deckInfo.mainDeck.length, 0, '3回目Undo後は0枚');
    assertEquals(store.canUndo, false, '完全にUndoするとcanUndoがfalse');
    assertEquals(store.canRedo, true, 'canRedoがtrue');
  });

  await test('undo/redo: 100超過時のshift処理', () => {
    const store = useDeckEditStore();

    // 100個のコマンドを追加
    for (let i = 0; i < 100; i++) {
      store.addCard(sampleMonster, 'main');
    }

    assertEquals(store.canUndo, true, '100個後もcanUndoがtrue');

    // 101個目を追加（shift が発生）
    store.addCard(sampleSpell, 'main');
    assertEquals(store.deckInfo.mainDeck.length, 100, '101個目追加後は100枚（オーバーフロー防止）');

    // undoが正常に動作するか確認
    store.undo();
    assertEquals(store.deckInfo.mainDeck.length, 99, 'undo後は99枚');
    assertEquals(store.canUndo, true, 'まだcanUndoがtrue');
  });

  await test('undo/redo: 新規操作時にredo履歴がクリアされる', () => {
    const store = useDeckEditStore();

    store.addCard(sampleMonster, 'main');
    store.addCard(sampleSpell, 'main');

    // Undo
    store.undo();
    assertEquals(store.canRedo, true, 'Undo後はcanRedoがtrue');

    // 新規操作（removeCard）
    store.removeCard(sampleMonster.cardId, 'main');
    assertEquals(store.canRedo, false, '新規操作後はredoが不可（履歴クリア）');
    assertEquals(store.deckInfo.mainDeck.length, 0, '新規操作が反映されている');
  });

  // ===== canMoveCard テスト =====

  await test('canMoveCard: searchからtrashへは移動不可', () => {
    const store = useDeckEditStore();
    const result = store.canMoveCard('search', 'trash', sampleMonster);
    assertEquals(result, false, 'searchからtrashへの移動は不可');
  });

  await test('canMoveCard: searchからmainへ - 通常モンスターは可', () => {
    const store = useDeckEditStore();
    const result = store.canMoveCard('search', 'main', sampleMonster);
    assertEquals(result, true, '通常モンスターはmainへ移動可能');
  });

  await test('canMoveCard: searchからmainへ - extraデッキカードは不可', () => {
    const store = useDeckEditStore();
    const result = store.canMoveCard('search', 'main', sampleFusion);
    assertEquals(result, false, 'Fusionモンスターはmainへ移動不可');
  });

  await test('canMoveCard: searchからextraへ - extraデッキカードのみ可', () => {
    const store = useDeckEditStore();
    const fusionResult = store.canMoveCard('search', 'extra', sampleFusion);
    assertEquals(fusionResult, true, 'Fusionモンスターはextraへ移動可能');

    const monsterResult = store.canMoveCard('search', 'extra', sampleMonster);
    assertEquals(monsterResult, false, '通常モンスターはextraへ移動不可');
  });

  await test('canMoveCard: searchからsideへは常に許可', () => {
    const store = useDeckEditStore();
    const monsterResult = store.canMoveCard('search', 'side', sampleMonster);
    assertEquals(monsterResult, true, '通常モンスターはsideへ移動可能');

    const fusionResult = store.canMoveCard('search', 'side', sampleFusion);
    assertEquals(fusionResult, true, 'Fusionモンスターもsideへ移動可能');

    const spellResult = store.canMoveCard('search', 'side', sampleSpell);
    assertEquals(spellResult, true, '魔法カードもsideへ移動可能');
  });

  await test('canMoveCard: trashへの移動は全て不可', () => {
    const store = useDeckEditStore();
    const fromMain = store.canMoveCard('main', 'trash', sampleMonster);
    assertEquals(fromMain, false, 'mainからtrashへは移動不可');

    const fromExtra = store.canMoveCard('extra', 'trash', sampleFusion);
    assertEquals(fromExtra, false, 'extraからtrashへは移動不可');

    const fromSide = store.canMoveCard('side', 'trash', sampleSpell);
    assertEquals(fromSide, false, 'sideからtrashへは移動不可');
  });

  await test('canMoveCard: trashからの移動は全て許可', () => {
    const store = useDeckEditStore();
    const toMain = store.canMoveCard('trash', 'main', sampleMonster);
    assertEquals(toMain, true, 'trashからmainへは移動可能');

    const toExtra = store.canMoveCard('trash', 'extra', sampleFusion);
    assertEquals(toExtra, true, 'trashからextraへは移動可能');

    const toSide = store.canMoveCard('trash', 'side', sampleSpell);
    assertEquals(toSide, true, 'trashからsideへは移動可能');
  });

  await test('canMoveCard: main/extra/side間 - mainへはextraデッキカード不可', () => {
    const store = useDeckEditStore();
    const fromExtra = store.canMoveCard('extra', 'main', sampleFusion);
    assertEquals(fromExtra, false, 'extraからmainへFusionは移動不可');

    const fromSide = store.canMoveCard('side', 'main', sampleMonster);
    assertEquals(fromSide, true, 'sideからmainへ通常モンスターは移動可能');
  });

  await test('canMoveCard: main/extra/side間 - extraへはextraデッキカードのみ可', () => {
    const store = useDeckEditStore();
    const fromMain = store.canMoveCard('main', 'extra', sampleMonster);
    assertEquals(fromMain, false, 'mainからextraへ通常モンスターは移動不可');

    const fromSide = store.canMoveCard('side', 'extra', sampleFusion);
    assertEquals(fromSide, true, 'sideからextraへFusionは移動可能');
  });

  await test('canMoveCard: main/extra/side間 - sideへは常に許可', () => {
    const store = useDeckEditStore();
    const fromMain = store.canMoveCard('main', 'side', sampleMonster);
    assertEquals(fromMain, true, 'mainからsideへは移動可能');

    const fromExtra = store.canMoveCard('extra', 'side', sampleFusion);
    assertEquals(fromExtra, true, 'extraからsideへは移動可能');
  });

  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${testsPassed + testsFailed} tests`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('='.repeat(50));

  if (testsFailed > 0) {
    process.exit(1);
  }
})();
