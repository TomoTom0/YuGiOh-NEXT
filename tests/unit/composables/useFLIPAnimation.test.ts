import { JSDOM } from 'jsdom';
import { recordAllCardPositionsByUUID, animateCardMoveByUUID } from '../../../src/composables/deck/useFLIPAnimation';

/**
 * useFLIPAnimation のユニットテスト
 *
 * FLIP（First, Last, Invert, Play）アニメーションのロジックをテスト
 */

// JSDOMでwindow/documentをモック
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document as any;
global.HTMLElement = dom.window.HTMLElement as any;
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  setTimeout(() => callback(Date.now()), 0);
  return 0;
};

console.log('=== Testing useFLIPAnimation ===\n');

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

function assertExists(value: any, message?: string) {
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to exist');
  }
}

// テスト実行
(async () => {
  // 1. recordAllCardPositionsByUUID: セクションが存在しない場合
  await test('recordAllCardPositionsByUUID: セクションが存在しない場合は空のMapを返す', () => {
    document.body.innerHTML = '';
    const result = recordAllCardPositionsByUUID();
    assertEquals(result.size, 0);
  });

  // 2. recordAllCardPositionsByUUID: カードが存在する場合
  await test('recordAllCardPositionsByUUID: カードのUUIDと位置を記録する', () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
          <div class="deck-card" data-uuid="uuid-2"></div>
        </div>
      </div>
    `;

    // getBoundingClientRect をモック
    const cards = document.querySelectorAll('.deck-card');
    cards.forEach((card, index) => {
      (card as any).getBoundingClientRect = () => ({
        top: index * 100,
        left: index * 50,
        width: 100,
        height: 150
      });
    });

    const result = recordAllCardPositionsByUUID();
    assertEquals(result.size, 2);
    assertTrue(result.has('uuid-1'));
    assertTrue(result.has('uuid-2'));

    const pos1 = result.get('uuid-1');
    assertExists(pos1);
    assertEquals(pos1!.top, 0);
    assertEquals(pos1!.left, 0);

    const pos2 = result.get('uuid-2');
    assertExists(pos2);
    assertEquals(pos2!.top, 100);
    assertEquals(pos2!.left, 50);
  });

  // 3. recordAllCardPositionsByUUID: 複数セクション
  await test('recordAllCardPositionsByUUID: 複数セクションのカードを記録する', () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="main-1"></div>
        </div>
      </div>
      <div class="extra-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="extra-1"></div>
        </div>
      </div>
      <div class="side-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="side-1"></div>
        </div>
      </div>
      <div class="trash-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="trash-1"></div>
        </div>
      </div>
    `;

    const cards = document.querySelectorAll('.deck-card');
    cards.forEach((card) => {
      (card as any).getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        width: 100,
        height: 150
      });
    });

    const result = recordAllCardPositionsByUUID();
    assertEquals(result.size, 4);
    assertTrue(result.has('main-1'));
    assertTrue(result.has('extra-1'));
    assertTrue(result.has('side-1'));
    assertTrue(result.has('trash-1'));
  });

  // 4. recordAllCardPositionsByUUID: data-uuidがないカードは無視
  await test('recordAllCardPositionsByUUID: data-uuidがないカードは無視される', () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
          <div class="deck-card"></div>
        </div>
      </div>
    `;

    const cards = document.querySelectorAll('.deck-card');
    cards.forEach((card) => {
      (card as any).getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        width: 100,
        height: 150
      });
    });

    const result = recordAllCardPositionsByUUID();
    assertEquals(result.size, 1);
    assertTrue(result.has('uuid-1'));
  });

  // 5. animateCardMoveByUUID: セクションが存在しない場合
  await test('animateCardMoveByUUID: セクションが存在しない場合は何もしない', () => {
    document.body.innerHTML = '';
    const firstPositions = new Map<string, DOMRect>();
    animateCardMoveByUUID(firstPositions, new Set(['main']));
    // エラーが発生しないことを確認
  });

  // 6. animateCardMoveByUUID: 移動距離が1ピクセル未満の場合は無視
  await test('animateCardMoveByUUID: 移動距離が1ピクセル未満の場合は無視される', () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
        </div>
      </div>
    `;

    const card = document.querySelector('.deck-card') as HTMLElement;
    (card as any).getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 100,
      height: 150
    });

    const firstPositions = new Map<string, DOMRect>();
    firstPositions.set('uuid-1', {
      top: 0.5,
      left: 0.5,
      width: 100,
      height: 150
    } as DOMRect);

    animateCardMoveByUUID(firstPositions, new Set(['main']));

    // transformが設定されないことを確認
    assertEquals(card.style.transform, '');
  });

  // 7. animateCardMoveByUUID: カードが移動する場合
  await test('animateCardMoveByUUID: カードが移動する場合にtransformを設定する', async () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
        </div>
      </div>
    `;

    const card = document.querySelector('.deck-card') as HTMLElement;
    (card as any).getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      width: 100,
      height: 150
    });

    const firstPositions = new Map<string, DOMRect>();
    firstPositions.set('uuid-1', {
      top: 0,
      left: 0,
      width: 100,
      height: 150
    } as DOMRect);

    animateCardMoveByUUID(firstPositions, new Set(['main']));

    // 即座にtransformが設定される（First -> Invert）
    await new Promise(resolve => setTimeout(resolve, 10));

    // requestAnimationFrame後にtransitionが設定される（Play）
    await new Promise(resolve => setTimeout(resolve, 50));

    // transitionが設定されることを確認
    assertTrue(card.style.transition.includes('transform'));
  });

  // 8. animateCardMoveByUUID: 複数カードの移動
  await test('animateCardMoveByUUID: 複数カードを同時にアニメーション', async () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
          <div class="deck-card" data-uuid="uuid-2"></div>
        </div>
      </div>
    `;

    const cards = document.querySelectorAll('.deck-card');
    (cards[0] as any).getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      width: 100,
      height: 150
    });
    (cards[1] as any).getBoundingClientRect = () => ({
      top: 200,
      left: 100,
      width: 100,
      height: 150
    });

    const firstPositions = new Map<string, DOMRect>();
    firstPositions.set('uuid-1', {
      top: 0,
      left: 0,
      width: 100,
      height: 150
    } as DOMRect);
    firstPositions.set('uuid-2', {
      top: 100,
      left: 50,
      width: 100,
      height: 150
    } as DOMRect);

    animateCardMoveByUUID(firstPositions, new Set(['main']));

    await new Promise(resolve => setTimeout(resolve, 50));

    // 両方のカードにtransitionが設定されることを確認
    assertTrue((cards[0] as HTMLElement).style.transition.includes('transform'));
    assertTrue((cards[1] as HTMLElement).style.transition.includes('transform'));
  });

  // 9. animateCardMoveByUUID: 複数セクションの移動
  await test('animateCardMoveByUUID: 複数セクションのカードを同時にアニメーション', async () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="main-1"></div>
        </div>
      </div>
      <div class="extra-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="extra-1"></div>
        </div>
      </div>
    `;

    const cards = document.querySelectorAll('.deck-card');
    (cards[0] as any).getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      width: 100,
      height: 150
    });
    (cards[1] as any).getBoundingClientRect = () => ({
      top: 200,
      left: 100,
      width: 100,
      height: 150
    });

    const firstPositions = new Map<string, DOMRect>();
    firstPositions.set('main-1', {
      top: 0,
      left: 0,
      width: 100,
      height: 150
    } as DOMRect);
    firstPositions.set('extra-1', {
      top: 100,
      left: 50,
      width: 100,
      height: 150
    } as DOMRect);

    animateCardMoveByUUID(firstPositions, new Set(['main', 'extra']));

    await new Promise(resolve => setTimeout(resolve, 50));

    // 両方のセクションのカードにtransitionが設定されることを確認
    assertTrue((cards[0] as HTMLElement).style.transition.includes('transform'));
    assertTrue((cards[1] as HTMLElement).style.transition.includes('transform'));
  });

  // 10. animateCardMoveByUUID: firstPositionsにないUUIDは無視
  await test('animateCardMoveByUUID: firstPositionsにないUUIDは無視される', async () => {
    document.body.innerHTML = `
      <div class="main-deck">
        <div class="card-grid">
          <div class="deck-card" data-uuid="uuid-1"></div>
          <div class="deck-card" data-uuid="uuid-2"></div>
        </div>
      </div>
    `;

    const cards = document.querySelectorAll('.deck-card');
    (cards[0] as any).getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      width: 100,
      height: 150
    });
    (cards[1] as any).getBoundingClientRect = () => ({
      top: 200,
      left: 100,
      width: 100,
      height: 150
    });

    const firstPositions = new Map<string, DOMRect>();
    // uuid-1のみ記録（uuid-2は記録しない）
    firstPositions.set('uuid-1', {
      top: 0,
      left: 0,
      width: 100,
      height: 150
    } as DOMRect);

    animateCardMoveByUUID(firstPositions, new Set(['main']));

    await new Promise(resolve => setTimeout(resolve, 50));

    // uuid-1のみtransitionが設定される
    assertTrue((cards[0] as HTMLElement).style.transition.includes('transform'));
    assertEquals((cards[1] as HTMLElement).style.transition, '');
  });

  console.log(`\n✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);

  process.exit(testsFailed > 0 ? 1 : 0);
})();
