/**
 * オプションページのスクリーンショット撮影
 *
 * 以下のスクリーンショットを撮影：
 * 1. options-page.png - オプションページ全体
 */

const { connectCDP } = require('./video-helper');
const path = require('path');

// オプションページのURL
const OPTIONS_URL = 'chrome-extension://YOUR_EXTENSION_ID/src/options/options.html';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function captureOptionsPage() {
  console.log('【オプションページ スクリーンショット撮影】\n');

  const cdp = await connectCDP();

  try {
    // manifest.jsonから拡張機能IDを取得
    const fs = require('fs');
    const manifestPath = path.join(__dirname, '../../../dist/manifest.json');

    // まずdistディレクトリが存在するか確認
    if (!fs.existsSync(manifestPath)) {
      console.error('❌ エラー: dist/manifest.json が見つかりません');
      console.log('💡 ヒント: npm run build を実行してビルドしてください');
      cdp.close();
      process.exit(1);
    }

    // 拡張機能のIDを取得（chrome://extensions から手動で確認する必要がある場合）
    console.log('拡張機能のIDを取得中...');
    console.log('💡 chrome://extensions でデベロッパーモードを有効にして、拡張機能のIDを確認してください\n');

    // Chromiumで chrome-extension:// URLを開く
    // 注: 拡張機能IDはユーザー環境によって異なるため、手動で設定する必要がある
    console.log('オプションページを開いています...');
    console.log('ℹ️  スクリプト内の OPTIONS_URL を実際の拡張機能IDに置き換えてください\n');

    // 代替案: chrome://extensions/shortcuts にアクセスして拡張機能を探す
    await cdp.navigate('chrome://extensions/');
    await cdp.wait(2000);

    console.log('\n⚠️  自動的に拡張機能IDを取得できません');
    console.log('📋 手動手順:');
    console.log('1. chrome://extensions を開く');
    console.log('2. デベロッパーモードを有効にする');
    console.log('3. "Yugioh Neuron Helper" の ID をコピー');
    console.log('4. このスクリプトの OPTIONS_URL を更新');
    console.log('5. 拡張機能のオプションページを開く');
    console.log('6. スクリーンショットを手動で撮影\n');

    // スクリーンショット撮影
    // const screenshotResult = await cdp.sendCommand('Page.captureScreenshot', {
    //   format: 'png',
    //   clip: null
    // });
    //
    // if (screenshotResult.result && screenshotResult.result.data) {
    //   const buffer = Buffer.from(screenshotResult.result.data, 'base64');
    //   const outputPath = path.join(OUTPUT_DIR, 'options-page.png');
    //   fs.writeFileSync(outputPath, buffer);
    //   console.log(`✅ スクリーンショット保存: ${outputPath}`);
    // }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    throw error;
  }
}

// 実行
captureOptionsPage();
