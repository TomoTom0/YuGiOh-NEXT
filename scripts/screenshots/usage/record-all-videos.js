/**
 * 全動画を一度に撮影
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

async function recordAll() {
  console.log('【全動画撮影】\n');

  try {
    // シャッフル・ソートの動画撮影
    await runScript(path.join(__dirname, 'record-shuffle-sort.js'));

    // ダイアログの動画撮影
    await runScript(path.join(__dirname, 'record-dialog.js'));

    console.log('\n' + '='.repeat(60));
    console.log('【全撮影完了】');
    console.log('='.repeat(60));
    console.log('\n✅ 合計4本の動画と4個のGIFを作成しました');
    console.log(`\n保存先: docs/usage/images/\n`);
    console.log('動画:');
    console.log('  - shuffle-animation.mp4 / shuffle-animation.gif');
    console.log('  - sort-animation.mp4 / sort-animation.gif');
    console.log('  - dialog-open-close.mp4 / dialog-open-close.gif');
    console.log('  - dialog-color-change.mp4 / dialog-color-change.gif\n');
  } catch (error) {
    console.error('\nエラー:', error.message);
    process.exit(1);
  }
}

// 実行
recordAll();
