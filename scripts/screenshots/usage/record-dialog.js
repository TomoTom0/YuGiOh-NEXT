/**
 * デッキ画像作成ダイアログの動画撮影
 *
 * 以下の動画を撮影：
 * 1. deck-image-dialog.mp4 / deck-image-dialog.gif - デッキ画像作成ダイアログの一連の操作
 */

const { connectCDP, convertToGif } = require('./video-helper');
const path = require('path');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function recordVideos() {
  console.log('【デッキ画像作成ダイアログ 動画撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== デッキ画像作成ダイアログの一連の操作 ===\n');

    // ビューポート全体を録画領域とする（ダイアログが中央に表示されるため）
    const viewportClip = await cdp.evaluate(`
      (() => {
        return {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight
        };
      })()
    `);

    // デッキ画像作成ダイアログ動画（20秒）：開閉、色切り替え、QRトグルの一連の操作
    const videoPromise = cdp.recordVideo(
      path.join(OUTPUT_DIR, 'deck-image-dialog.mp4'),
      20000, // 20秒録画
      viewportClip,
      30 // 30fps
    );

    await cdp.wait(1000); // 最初の1秒ホールド

    // ダイアログを開く
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(2000);

    // 背景色を切り替える（赤→青）
    await cdp.evaluate(`document.getElementById("ygo-image-popup").click()`);
    await cdp.wait(2000);

    // QRをOFFにする
    await cdp.evaluate(`document.getElementById("ygo-qr-toggle").click()`);
    await cdp.wait(1500);

    // 背景色を切り替える（青→赤）
    await cdp.evaluate(`document.getElementById("ygo-image-popup").click()`);
    await cdp.wait(2000);

    // QRをONにする
    await cdp.evaluate(`document.getElementById("ygo-qr-toggle").click()`);
    await cdp.wait(1500);

    // ダイアログを閉じる
    await cdp.evaluate(`document.getElementById("ygo-image-popup-overlay").click()`);
    await cdp.wait(1500);

    // もう一度開く
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(2000);

    // 背景色を切り替える（赤→青）
    await cdp.evaluate(`document.getElementById("ygo-image-popup").click()`);
    await cdp.wait(2000);

    // ダイアログを閉じる
    await cdp.evaluate(`document.getElementById("ygo-image-popup-overlay").click()`);
    await cdp.wait(1500); // 最後の1秒ホールド含む

    await videoPromise;

    console.log('\n【動画撮影完了】\n');
    console.log('✅ デッキ画像作成ダイアログの動画を保存しました\n');

    // GIF変換
    console.log('\n=== GIF変換 ===\n');

    const mp4Path = path.join(OUTPUT_DIR, 'deck-image-dialog.mp4');
    await convertToGif(
      mp4Path,
      path.join(OUTPUT_DIR, 'deck-image-dialog.gif'),
      { fps: 15, scale: 800, colors: 128 } // 15fps, 横幅800px, 128色
    );

    // mp4ファイルを削除（中間ファイル）
    const fs = require('fs');
    fs.unlinkSync(mp4Path);
    console.log('MP4ファイルを削除しました');

    console.log('\n✅ GIF変換完了\n');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
recordVideos();
