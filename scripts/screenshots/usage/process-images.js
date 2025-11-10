/**
 * 画像加工スクリプト（ImageMagick使用）
 *
 * 撮影したスクリーンショットに枠線、矢印、注釈などを追加
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

const IMAGE_DIR = path.join(__dirname, '../../../docs/usage/images');

/**
 * 画像に枠線を追加
 * @param {string} inputPath - 入力画像パス
 * @param {string} outputPath - 出力画像パス（省略時は上書き）
 * @param {object} options - オプション
 */
async function addBorder(inputPath, outputPath = null, options = {}) {
  const output = outputPath || inputPath;
  const borderWidth = options.width || 2;
  const borderColor = options.color || '#e74c3c';

  const cmd = `convert "${inputPath}" -bordercolor "${borderColor}" -border ${borderWidth} "${output}"`;

  console.log(`枠線を追加: ${path.basename(inputPath)}`);
  await execAsync(cmd);
  console.log(`✅ 保存: ${output}`);
}

/**
 * 画像に矢印を描画
 * @param {string} inputPath - 入力画像パス
 * @param {string} outputPath - 出力画像パス
 * @param {object} arrow - 矢印の座標 {x1, y1, x2, y2}
 * @param {object} options - オプション
 */
async function addArrow(inputPath, outputPath, arrow, options = {}) {
  const strokeWidth = options.strokeWidth || 3;
  const strokeColor = options.strokeColor || '#e74c3c';
  const fillColor = options.fillColor || 'none';

  const { x1, y1, x2, y2 } = arrow;

  const cmd = `convert "${inputPath}" -stroke "${strokeColor}" -strokewidth ${strokeWidth} -fill ${fillColor} -draw "line ${x1},${y1} ${x2},${y2}" "${outputPath}"`;

  console.log(`矢印を追加: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  await execAsync(cmd);
  console.log(`✅ 保存: ${outputPath}`);
}

/**
 * 画像にテキストを追加
 * @param {string} inputPath - 入力画像パス
 * @param {string} outputPath - 出力画像パス
 * @param {string} text - テキスト
 * @param {object} position - 位置 {x, y}
 * @param {object} options - オプション
 */
async function addText(inputPath, outputPath, text, position, options = {}) {
  const fontSize = options.fontSize || 20;
  const fontColor = options.fontColor || '#e74c3c';
  const fontWeight = options.fontWeight || 'bold';

  const { x, y } = position;

  const cmd = `convert "${inputPath}" -font "DejaVu-Sans-${fontWeight}" -pointsize ${fontSize} -fill "${fontColor}" -annotate +${x}+${y} "${text}" "${outputPath}"`;

  console.log(`テキストを追加: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  await execAsync(cmd);
  console.log(`✅ 保存: ${outputPath}`);
}

/**
 * 画像に矩形を描画
 * @param {string} inputPath - 入力画像パス
 * @param {string} outputPath - 出力画像パス
 * @param {object} rect - 矩形の座標 {x, y, width, height}
 * @param {object} options - オプション
 */
async function addRectangle(inputPath, outputPath, rect, options = {}) {
  const strokeWidth = options.strokeWidth || 3;
  const strokeColor = options.strokeColor || '#e74c3c';
  const fillColor = options.fillColor || 'none';

  const { x, y, width, height } = rect;
  const x2 = x + width;
  const y2 = y + height;

  const cmd = `convert "${inputPath}" -stroke "${strokeColor}" -strokewidth ${strokeWidth} -fill ${fillColor} -draw "rectangle ${x},${y} ${x2},${y2}" "${output}"`;

  console.log(`矩形を追加: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  await execAsync(cmd);
  console.log(`✅ 保存: ${outputPath}`);
}

/**
 * 画像をリサイズ
 * @param {string} inputPath - 入力画像パス
 * @param {string} outputPath - 出力画像パス
 * @param {string} size - サイズ指定（例: "800x600", "50%"）
 */
async function resize(inputPath, outputPath, size) {
  const cmd = `convert "${inputPath}" -resize ${size} "${outputPath}"`;

  console.log(`リサイズ: ${path.basename(inputPath)} -> ${path.basename(outputPath)} (${size})`);
  await execAsync(cmd);
  console.log(`✅ 保存: ${outputPath}`);
}

/**
 * サンプル加工処理
 */
async function processImages() {
  console.log('【画像加工】\n');

  try {
    // 例: card-lock-feature.png に赤い枠線を追加して強調
    const lockFeaturePath = path.join(IMAGE_DIR, 'card-lock-feature.png');
    if (fs.existsSync(lockFeaturePath)) {
      await addBorder(lockFeaturePath, null, { width: 3, color: '#e74c3c' });
    }

    // 例: card-locked-state.png に赤い枠線を追加
    const lockedStatePath = path.join(IMAGE_DIR, 'card-locked-state.png');
    if (fs.existsSync(lockedStatePath)) {
      await addBorder(lockedStatePath, null, { width: 3, color: '#27ae60' });
    }

    console.log('\n✅ 画像加工が完了しました');
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

// コマンドライン引数で直接実行された場合
if (require.main === module) {
  processImages();
}

// 関数をエクスポート
module.exports = {
  addBorder,
  addArrow,
  addText,
  addRectangle,
  resize
};
