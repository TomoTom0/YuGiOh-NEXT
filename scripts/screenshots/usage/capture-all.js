/**
 * 全スクリーンショットを一度に撮影
 */

const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`実行: ${path.basename(scriptPath)}`);
    console.log('='.repeat(60) + '\n');

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed: ${scriptPath}`));
      } else {
        resolve();
      }
    });
  });
}

async function captureAll() {
  console.log('【全スクリーンショット撮影】\n');

  try {
    // デッキ表示ページのスクリーンショット撮影
    await runScript(path.join(__dirname, 'capture-deck-page.js'));

    // ダイアログのスクリーンショット撮影
    await runScript(path.join(__dirname, 'capture-dialog.js'));

    console.log('\n' + '='.repeat(60));
    console.log('【全撮影完了】');
    console.log('='.repeat(60));
    console.log('\n✅ 合計12枚のスクリーンショットを保存しました');
    console.log(`\n保存先: docs/usage/images/\n`);
  } catch (error) {
    console.error('\nエラー:', error.message);
    process.exit(1);
  }
}

// 実行
captureAll();
