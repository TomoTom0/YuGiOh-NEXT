/**
 * デッキ画像のサンプルを作成
 */

const { connectCDP } = require('./video-helper');
const path = require('path');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function createSamples() {
  console.log('【デッキ画像サンプル作成】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    // カメラボタンをクリック（ダイアログ開く）
    console.log('ダイアログを開く...');
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(2000); // ダイアログ表示と画像生成待機

    // ダイアログ内のプレビュー画像を取得（赤背景、QR ON）
    console.log('サンプル1: 赤背景 + QR ON');
    const redQrOnClip = await cdp.evaluate(`
      (() => {
        const dialog = document.getElementById('ygo-image-popup');
        const backgroundDiv = document.getElementById('ygo-background-image');
        if (backgroundDiv) {
          const rect = backgroundDiv.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          };
        }
        return null;
      })()
    `);

    const fs = require('fs');

    if (redQrOnClip) {
      redQrOnClip.width = Math.floor(redQrOnClip.width / 2) * 2;
      redQrOnClip.height = Math.floor(redQrOnClip.height / 2) * 2;

      const result1 = await cdp.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip: { ...redQrOnClip, scale: 1 }
      });

      if (result1.result && result1.result.data) {
        const buffer = Buffer.from(result1.result.data, 'base64');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'deck-image-sample-red-qr.png'), buffer);
        console.log('✅ deck-image-sample-red-qr.png を保存');
      } else {
        console.error('❌ result1.result.data が取得できませんでした');
      }
    } else {
      console.error('❌ redQrOnClip が取得できませんでした');
    }

    // 青背景に切り替え
    console.log('サンプル2: 青背景 + QR ON');
    await cdp.evaluate(`document.getElementById('ygo-image-popup').click()`);
    await cdp.wait(2000); // 画像生成待機

    if (redQrOnClip) {
      const result2 = await cdp.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip: { ...redQrOnClip, scale: 1 }
      });

      if (result2.result && result2.result.data) {
        const buffer = Buffer.from(result2.result.data, 'base64');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'deck-image-sample-blue-qr.png'), buffer);
        console.log('✅ deck-image-sample-blue-qr.png を保存');
      } else {
        console.error('❌ result2.result.data が取得できませんでした');
      }
    }

    // QRをOFFにする
    console.log('サンプル3: 青背景 + QR OFF');
    await cdp.evaluate(`document.getElementById('ygo-qr-toggle').click()`);
    await cdp.wait(2000); // 画像生成待機

    if (redQrOnClip) {
      const result3 = await cdp.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip: { ...redQrOnClip, scale: 1 }
      });

      if (result3.result && result3.result.data) {
        const buffer = Buffer.from(result3.result.data, 'base64');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'deck-image-sample-blue-noqr.png'), buffer);
        console.log('✅ deck-image-sample-blue-noqr.png を保存');
      } else {
        console.error('❌ result3.result.data が取得できませんでした');
      }
    }

    console.log('\n✅ デッキ画像サンプル作成完了\n');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
createSamples();
