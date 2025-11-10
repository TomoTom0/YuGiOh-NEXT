/**
 * ポストビルドスクリプト
 *
 * TypeScriptがコンパイル時に追加する `export {};` を削除します。
 * Chrome拡張では、この行がエラーの原因となる場合があります。
 */

const fs = require('fs');
const path = require('path');

// 処理対象のディレクトリ
const distDir = path.join(__dirname, '../extension/dist');

/**
 * ディレクトリを再帰的に走査してJSファイルを処理
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      processJavaScriptFile(fullPath);
    }
  }
}

/**
 * JavaScriptファイルから `export {};` を削除
 */
function processJavaScriptFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // `export {};` の行を削除（行末の改行も含む）
  const updatedContent = content.replace(/^export\s*\{\s*\}\s*;?\s*$/gm, '');

  // 内容が変更された場合のみファイルを書き込む
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✓ Removed 'export {}' from: ${path.relative(distDir, filePath)}`);
  }
}

// メイン処理
console.log('=== ポストビルド処理 ===');
console.log('対象ディレクトリ:', distDir);
console.log();

try {
  processDirectory(distDir);
  console.log();
  console.log('✓ ポストビルド処理が完了しました');
} catch (error) {
  console.error('✗ ポストビルド処理中にエラーが発生しました:', error.message);
  process.exit(1);
}
