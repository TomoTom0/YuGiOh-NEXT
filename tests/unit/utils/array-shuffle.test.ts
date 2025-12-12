import { fisherYatesShuffle } from '../../../src/utils/array-shuffle';

/**
 * array-shuffle.ts のユニットテスト
 *
 * Fisher-Yates シャッフルアルゴリズムの動作を検証
 */

console.log('=== Testing array-shuffle ===\n');

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

function assertArrayEquals(actual: any[], expected: any[], message?: string) {
  if (actual.length !== expected.length) {
    throw new Error(
      message || `Array length mismatch: expected ${expected.length}, got ${actual.length}`
    );
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        message || `Array element mismatch at index ${i}: expected ${expected[i]}, got ${actual[i]}`
      );
    }
  }
}

// テスト実行
(async () => {
  // 1. 空配列のシャッフル
  await test('空配列のシャッフルは空配列を返す', () => {
    const input: number[] = [];
    const result = fisherYatesShuffle(input);
    assertArrayEquals(result, []);
  });

  // 2. 単一要素のシャッフル
  await test('単一要素のシャッフルは同じ配列を返す', () => {
    const input = [1];
    const result = fisherYatesShuffle(input);
    assertArrayEquals(result, [1]);
  });

  // 3. 元の配列を変更しない（イミュータブル）
  await test('元の配列を変更しない', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    fisherYatesShuffle(input);
    assertArrayEquals(input, original);
  });

  // 4. 全ての要素が含まれる
  await test('シャッフル結果に全ての要素が含まれる', () => {
    const input = [1, 2, 3, 4, 5];
    const result = fisherYatesShuffle(input);
    assertEquals(result.length, input.length);

    // すべての要素が含まれているかチェック
    for (const val of input) {
      assertTrue(result.includes(val), `Missing element: ${val}`);
    }
  });

  // 5. 重複がない
  await test('シャッフル結果に重複がない', () => {
    const input = [1, 2, 3, 4, 5];
    const result = fisherYatesShuffle(input);
    const uniqueSet = new Set(result);
    assertEquals(uniqueSet.size, result.length, '重複が検出されました');
  });

  // 6. 順序が変わる可能性がある（統計的検証）
  await test('シャッフル結果が元の順序と異なる場合がある（統計的検証）', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let changedCount = 0;
    const trials = 100;

    // 100回シャッフルして、少なくとも90回以上は順序が変わることを確認
    for (let i = 0; i < trials; i++) {
      const result = fisherYatesShuffle(input);
      // 元の配列と順序が異なるかチェック
      let isDifferent = false;
      for (let j = 0; j < input.length; j++) {
        if (input[j] !== result[j]) {
          isDifferent = true;
          break;
        }
      }
      if (isDifferent) {
        changedCount++;
      }
    }

    // 100回中90回以上は順序が変わることを確認（統計的に妥当）
    assertTrue(changedCount >= 90, `シャッフルで順序が変わった回数: ${changedCount}/100（期待: >=90）`);
  });

  // 7. 文字列配列のシャッフル
  await test('文字列配列もシャッフルできる', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const result = fisherYatesShuffle(input);
    assertEquals(result.length, input.length);

    for (const val of input) {
      assertTrue(result.includes(val), `Missing element: ${val}`);
    }
  });

  // 8. オブジェクト配列のシャッフル
  await test('オブジェクト配列もシャッフルできる', () => {
    const input = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 3, name: 'c' }
    ];
    const result = fisherYatesShuffle(input);
    assertEquals(result.length, input.length);

    // すべてのオブジェクトが含まれているかチェック
    for (const obj of input) {
      const found = result.find(r => r.id === obj.id && r.name === obj.name);
      assertTrue(Boolean(found), `Missing object: ${JSON.stringify(obj)}`);
    }
  });

  // 9. 大きな配列でも動作する
  await test('大きな配列（1000要素）でも動作する', () => {
    const input = Array.from({ length: 1000 }, (_, i) => i);
    const result = fisherYatesShuffle(input);
    assertEquals(result.length, 1000);

    // 重複チェック
    const uniqueSet = new Set(result);
    assertEquals(uniqueSet.size, 1000);
  });

  // 10. シャッフル分布の均一性検証（簡易版）
  await test('シャッフル分布が偏っていない（簡易検証）', () => {
    const input = [1, 2, 3];
    const positionCounts: Record<string, number> = {
      '1-0': 0, '1-1': 0, '1-2': 0,
      '2-0': 0, '2-1': 0, '2-2': 0,
      '3-0': 0, '3-1': 0, '3-2': 0
    };

    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = fisherYatesShuffle(input);
      result.forEach((val, idx) => {
        positionCounts[`${val}-${idx}`]++;
      });
    }

    // 各要素が各位置に現れる回数は、理論的には trials / 3 = 333 に近いはず
    // 許容範囲を ±100 とする（統計的に妥当）
    const expectedCount = trials / 3;
    const tolerance = 100;

    for (const [key, count] of Object.entries(positionCounts)) {
      const diff = Math.abs(count - expectedCount);
      assertTrue(
        diff <= tolerance,
        `位置分布が偏っています: ${key} = ${count} (期待値: ${expectedCount} ± ${tolerance})`
      );
    }
  });

  console.log(`\n✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);

  process.exit(testsFailed > 0 ? 1 : 0);
})();
