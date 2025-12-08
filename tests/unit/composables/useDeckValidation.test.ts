import { canMoveCard } from '../../../src/composables/deck/useDeckValidation';
import type { CardInfo } from '../../../src/types/card';

/**
 * useDeckValidation のユニットテスト
 *
 * カードの移動可否判定ロジックをテスト
 */

console.log('=== Testing useDeckValidation ===\n');

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

// テスト用のカードデータ
const normalMonster: CardInfo = {
  cardId: '1',
  ciid: 0,
  imgs: '1_0',
  name: '通常モンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 4,
  race: 'warrior',
  atkDef: '1800/1000',
  monsterTypes: ['normal']
};

const fusionMonster: CardInfo = {
  cardId: '2',
  ciid: 0,
  imgs: '2_0',
  name: '融合モンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 8,
  race: 'warrior',
  atkDef: '2500/2000',
  monsterTypes: ['fusion'],
  types: ['fusion']
};

const synchroMonster: CardInfo = {
  cardId: '3',
  ciid: 0,
  imgs: '3_0',
  name: 'シンクロモンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 8,
  race: 'warrior',
  atkDef: '2800/2000',
  monsterTypes: ['synchro'],
  types: ['synchro']
};

const xyzMonster: CardInfo = {
  cardId: '4',
  ciid: 0,
  imgs: '4_0',
  name: 'エクシーズモンスター',
  cardType: 'monster',
  attribute: 'dark',
  rank: 4,
  race: 'warrior',
  atkDef: '2000/1500',
  monsterTypes: ['xyz'],
  types: ['xyz']
};

const linkMonster: CardInfo = {
  cardId: '5',
  ciid: 0,
  imgs: '5_0',
  name: 'リンクモンスター',
  cardType: 'monster',
  attribute: 'dark',
  race: 'warrior',
  atkDef: '1800/-',
  monsterTypes: ['link'],
  types: ['link']
};

const spellCard: CardInfo = {
  cardId: '6',
  ciid: 0,
  imgs: '6_0',
  name: '魔法カード',
  cardType: 'spell',
  spellType: 'normal'
};

const trapCard: CardInfo = {
  cardId: '7',
  ciid: 0,
  imgs: '7_0',
  name: '罠カード',
  cardType: 'trap',
  trapType: 'normal'
};

// テスト実行
(async () => {
  // 1. searchからtrashへは移動不可
  await test('searchからtrashへは移動不可', () => {
    assertFalse(canMoveCard('search', 'trash', normalMonster));
  });

  // 2. searchからmainへ - 通常モンスターは可
  await test('searchからmainへ - 通常モンスターは可', () => {
    assertTrue(canMoveCard('search', 'main', normalMonster));
  });

  // 3. searchからmainへ - 融合モンスターは不可
  await test('searchからmainへ - 融合モンスターは不可', () => {
    assertFalse(canMoveCard('search', 'main', fusionMonster));
  });

  // 4. searchからmainへ - シンクロモンスターは不可
  await test('searchからmainへ - シンクロモンスターは不可', () => {
    assertFalse(canMoveCard('search', 'main', synchroMonster));
  });

  // 5. searchからmainへ - エクシーズモンスターは不可
  await test('searchからmainへ - エクシーズモンスターは不可', () => {
    assertFalse(canMoveCard('search', 'main', xyzMonster));
  });

  // 6. searchからmainへ - リンクモンスターは不可
  await test('searchからmainへ - リンクモンスターは不可', () => {
    assertFalse(canMoveCard('search', 'main', linkMonster));
  });

  // 7. searchからmainへ - 魔法カードは可
  await test('searchからmainへ - 魔法カードは可', () => {
    assertTrue(canMoveCard('search', 'main', spellCard));
  });

  // 8. searchからmainへ - 罠カードは可
  await test('searchからmainへ - 罠カードは可', () => {
    assertTrue(canMoveCard('search', 'main', trapCard));
  });

  // 9. searchからextraへ - 通常モンスターは不可
  await test('searchからextraへ - 通常モンスターは不可', () => {
    assertFalse(canMoveCard('search', 'extra', normalMonster));
  });

  // 10. searchからextraへ - 融合モンスターは可
  await test('searchからextraへ - 融合モンスターは可', () => {
    assertTrue(canMoveCard('search', 'extra', fusionMonster));
  });

  // 11. searchからextraへ - シンクロモンスターは可
  await test('searchからextraへ - シンクロモンスターは可', () => {
    assertTrue(canMoveCard('search', 'extra', synchroMonster));
  });

  // 12. searchからextraへ - エクシーズモンスターは可
  await test('searchからextraへ - エクシーズモンスターは可', () => {
    assertTrue(canMoveCard('search', 'extra', xyzMonster));
  });

  // 13. searchからextraへ - リンクモンスターは可
  await test('searchからextraへ - リンクモンスターは可', () => {
    assertTrue(canMoveCard('search', 'extra', linkMonster));
  });

  // 14. searchからsideへは常に許可
  await test('searchからsideへは常に許可（通常モンスター）', () => {
    assertTrue(canMoveCard('search', 'side', normalMonster));
  });

  await test('searchからsideへは常に許可（融合モンスター）', () => {
    assertTrue(canMoveCard('search', 'side', fusionMonster));
  });

  await test('searchからsideへは常に許可（魔法カード）', () => {
    assertTrue(canMoveCard('search', 'side', spellCard));
  });

  // 15. trashへの移動は全て不可
  await test('mainからtrashへは移動不可', () => {
    assertFalse(canMoveCard('main', 'trash', normalMonster));
  });

  await test('extraからtrashへは移動不可', () => {
    assertFalse(canMoveCard('extra', 'trash', fusionMonster));
  });

  await test('sideからtrashへは移動不可', () => {
    assertFalse(canMoveCard('side', 'trash', spellCard));
  });

  // 16. trashからの移動は全て許可
  await test('trashからmainへは許可', () => {
    assertTrue(canMoveCard('trash', 'main', normalMonster));
  });

  await test('trashからextraへは許可', () => {
    assertTrue(canMoveCard('trash', 'extra', fusionMonster));
  });

  await test('trashからsideへは許可', () => {
    assertTrue(canMoveCard('trash', 'side', spellCard));
  });

  // 17. main/extra/side間の移動 - mainへ
  await test('extraからmainへ - 通常モンスターは可', () => {
    assertTrue(canMoveCard('extra', 'main', normalMonster));
  });

  await test('extraからmainへ - 融合モンスターは不可', () => {
    assertFalse(canMoveCard('extra', 'main', fusionMonster));
  });

  await test('sideからmainへ - 魔法カードは可', () => {
    assertTrue(canMoveCard('side', 'main', spellCard));
  });

  // 18. main/extra/side間の移動 - extraへ
  await test('mainからextraへ - 通常モンスターは不可', () => {
    assertFalse(canMoveCard('main', 'extra', normalMonster));
  });

  await test('mainからextraへ - 融合モンスターは可', () => {
    assertTrue(canMoveCard('main', 'extra', fusionMonster));
  });

  await test('sideからextraへ - リンクモンスターは可', () => {
    assertTrue(canMoveCard('side', 'extra', linkMonster));
  });

  // 19. main/extra/side間の移動 - sideへは常に許可
  await test('mainからsideへは常に許可', () => {
    assertTrue(canMoveCard('main', 'side', normalMonster));
  });

  await test('extraからsideへは常に許可', () => {
    assertTrue(canMoveCard('extra', 'side', fusionMonster));
  });

  console.log(`\n✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);

  process.exit(testsFailed > 0 ? 1 : 0);
})();
