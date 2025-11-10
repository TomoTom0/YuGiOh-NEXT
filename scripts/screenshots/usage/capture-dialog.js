/**
 * デッキ画像作成ダイアログのスクリーンショット撮影
 *
 * 以下の画像を撮影：
 * 6. image-dialog-overview.png - ダイアログ全体
 * 7. image-dialog-deck-name.png - デッキ名入力欄
 * 8. image-dialog-color-red.png - 赤背景のプレビュー
 * 9. image-dialog-color-blue.png - 青背景のプレビュー
 * 10. image-dialog-qr-on.png - QRトグルボタン（ON）
 * 11. image-dialog-qr-off.png - QRトグルボタン（OFF）
 * 12. image-dialog-download-button.png - ダウンロードボタン
 */

const { connectCDP } = require('./screenshot-helper');
const path = require('path');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function captureScreenshots() {
  console.log('【デッキ画像作成ダイアログ スクリーンショット撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\nカメラボタンをクリック...');
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(1500); // ダイアログ表示と画像生成待機

    console.log('\n=== 6. ダイアログ全体 ===\n');
    await cdp.captureElement(
      '#ygo-image-popup',
      path.join(OUTPUT_DIR, 'image-dialog-overview.png'),
      { padding: 20 }
    );

    console.log('\n=== 7. デッキ名入力欄 ===\n');
    await cdp.captureElement(
      '#ygo-deck-name-input',
      path.join(OUTPUT_DIR, 'image-dialog-deck-name.png'),
      { padding: 5 }
    );

    console.log('\n=== 8. 赤背景のプレビュー ===\n');
    // 初期状態（赤背景）のプレビューをキャプチャ
    await cdp.captureElement(
      '#ygo-background-image',
      path.join(OUTPUT_DIR, 'image-dialog-color-red.png'),
      { padding: 5 }
    );

    console.log('\n=== 9. 青背景のプレビュー ===\n');
    // ポップアップをクリックして青背景に切り替え
    await cdp.evaluate(`document.getElementById("ygo-image-popup").click()`);
    await cdp.wait(1500); // 画像生成待機

    await cdp.captureElement(
      '#ygo-background-image',
      path.join(OUTPUT_DIR, 'image-dialog-color-blue.png'),
      { padding: 5 }
    );

    console.log('\n=== 10. QRトグルボタン（ON状態） ===\n');
    // 初期状態はON
    await cdp.captureElement(
      '#ygo-qr-toggle',
      path.join(OUTPUT_DIR, 'image-dialog-qr-on.png'),
      { padding: 5 }
    );

    console.log('\n=== 11. QRトグルボタン（OFF状態） ===\n');
    // QRトグルボタンをクリックしてOFFに
    await cdp.evaluate(`document.getElementById("ygo-qr-toggle").click()`);
    await cdp.wait(300);

    await cdp.captureElement(
      '#ygo-qr-toggle',
      path.join(OUTPUT_DIR, 'image-dialog-qr-off.png'),
      { padding: 5 }
    );

    console.log('\n=== 12. ダウンロードボタン ===\n');
    await cdp.captureElement(
      '#ygo-download-btn',
      path.join(OUTPUT_DIR, 'image-dialog-download-button.png'),
      { padding: 5 }
    );

    console.log('\n【撮影完了】\n');
    console.log('✅ ダイアログのスクリーンショット7枚を保存しました');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
captureScreenshots();
