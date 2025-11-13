import { mappingManager } from '../../../src/utils/mapping-manager';

/**
 * mapping-manager.ts のユニットテスト
 */

console.log('=== Testing mapping-manager.ts ===\n');

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

function assertExists(value: any, message?: string) {
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to exist');
  }
}

// テスト実行
(async () => {
  // テスト1: 日本語種族マッピング
  await test('日本語種族マッピング: ドラゴン族', () => {
    const mapping = mappingManager.getRaceTextToId('ja');
    assertExists(mapping, '日本語種族マッピングが存在すること');
    assertEquals(mapping['ドラゴン族'], 'dragon', 'ドラゴン族 -> dragon');
  });

  await test('日本語種族マッピング: 機械族', () => {
    const mapping = mappingManager.getRaceTextToId('ja');
    assertEquals(mapping['機械族'], 'machine', '機械族 -> machine');
  });

  // テスト2: 英語種族マッピング
  await test('英語種族マッピング: Dragon', () => {
    const mapping = mappingManager.getRaceTextToId('en');
    assertExists(mapping, '英語種族マッピングが存在すること');
    assertEquals(mapping['Dragon'], 'dragon', 'Dragon -> dragon');
  });

  await test('英語種族マッピング: Machine', () => {
    const mapping = mappingManager.getRaceTextToId('en');
    assertEquals(mapping['Machine'], 'machine', 'Machine -> machine');
  });

  // テスト3: 日本語モンスタータイプマッピング
  await test('日本語モンスタータイプマッピング: 通常', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('ja');
    assertExists(mapping, '日本語モンスタータイプマッピングが存在すること');
    assertEquals(mapping['通常'], 'normal', '通常 -> normal');
  });

  await test('日本語モンスタータイプマッピング: 効果', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('ja');
    assertEquals(mapping['効果'], 'effect', '効果 -> effect');
  });

  await test('日本語モンスタータイプマッピング: 融合', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('ja');
    assertEquals(mapping['融合'], 'fusion', '融合 -> fusion');
  });

  // テスト4: 英語モンスタータイプマッピング
  await test('英語モンスタータイプマッピング: Normal', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('en');
    assertExists(mapping, '英語モンスタータイプマッピングが存在すること');
    assertEquals(mapping['Normal'], 'normal', 'Normal -> normal');
  });

  await test('英語モンスタータイプマッピング: Effect', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('en');
    assertEquals(mapping['Effect'], 'effect', 'Effect -> effect');
  });

  await test('英語モンスタータイプマッピング: Fusion', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('en');
    assertEquals(mapping['Fusion'], 'fusion', 'Fusion -> fusion');
  });

  // テスト5: 未定義言語のフォールバック（日本語にフォールバック）
  await test('未定義言語のフォールバック: 種族', () => {
    const mapping = mappingManager.getRaceTextToId('xx'); // 存在しない言語
    assertExists(mapping, 'フォールバックマッピングが存在すること');
    assertEquals(mapping['ドラゴン族'], 'dragon', 'ドラゴン族 -> dragon（日本語にフォールバック）');
  });

  await test('未定義言語のフォールバック: モンスタータイプ', () => {
    const mapping = mappingManager.getMonsterTypeTextToId('xx');
    assertExists(mapping, 'フォールバックマッピングが存在すること');
    assertEquals(mapping['通常'], 'normal', '通常 -> normal（日本語にフォールバック）');
  });

  // テスト6: 動的マッピング存在確認（初期状態ではfalse）
  await test('動的マッピング存在確認: 日本語', () => {
    const hasDynamic = mappingManager.hasDynamicMapping('ja');
    assertEquals(hasDynamic, false, '初期状態では動的マッピングは存在しない');
  });

  await test('動的マッピング存在確認: 英語', () => {
    const hasDynamic = mappingManager.hasDynamicMapping('en');
    assertEquals(hasDynamic, false, '初期状態では動的マッピングは存在しない');
  });

  // テスト7: 複数言語の種族マッピング存在確認
  await test('複数言語対応: 韓国語種族マッピング', () => {
    const mapping = mappingManager.getRaceTextToId('ko');
    assertExists(mapping, '韓国語種族マッピングが存在すること');
    // 韓国語マッピングまたは日本語フォールバックのどちらか
  });

  await test('複数言語対応: ドイツ語種族マッピング', () => {
    const mapping = mappingManager.getRaceTextToId('de');
    assertExists(mapping, 'ドイツ語種族マッピングが存在すること');
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
