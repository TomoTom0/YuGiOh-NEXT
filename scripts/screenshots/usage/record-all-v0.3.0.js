/**
 * v0.3.0の全動画・スクリーンショットを一括撮影
 *
 * 以下を順番に実行：
 * 1. record-deck-edit.js - デッキ編集画面の動画
 *
 * 注意:
 * - オプションページのスクリーンショットは手動で撮影してください
 *   （chrome-extension:// URLの制約のため）
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

async function runScript(scriptPath, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📹 ${description}`);
  console.log('='.repeat(60));
  console.log(`実行中: ${scriptPath}\n`);

  try {
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ ${description} 完了\n`);
  } catch (error) {
    console.error(`❌ ${description} エラー:`, error.message);
    throw error;
  }
}

async function recordAll() {
  console.log('\n🎬 v0.3.0 全動画・スクリーンショット撮影開始\n');

  const scriptsDir = __dirname;

  try {
    // 1. デッキ編集画面の動画撮影
    await runScript(
      path.join(scriptsDir, 'record-deck-edit.js'),
      'デッキ編集画面の動画撮影'
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ 全ての動画撮影が完了しました！');
    console.log('='.repeat(60));

    console.log('\n📋 生成されたファイル:');
    console.log('  - docs/usage/images/deck-edit-basic.gif');
    console.log('  - docs/usage/images/deck-edit-detail.gif');

    console.log('\n⚠️  オプションページのスクリーンショットは手動で撮影してください:');
    console.log('  1. chrome://extensions を開く');
    console.log('  2. "Yugioh Neuron Helper" のオプションを開く');
    console.log('  3. スクリーンショットを撮影');
    console.log('  4. docs/usage/images/options-page.png として保存\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
recordAll();
