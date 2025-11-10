/**
 * シャッフル・ソート機能の動画撮影
 *
 * 以下の動画を撮影：
 * 1. shuffle-sort-animation.mp4 / shuffle-sort-animation.gif - シャッフル・ソート機能の一連の操作
 */

const { connectCDP, convertToGif } = require('./video-helper');
const path = require('path');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function recordVideos() {
  console.log('【シャッフル・ソート機能 動画撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== シャッフル・ソート・固定機能の一連の操作 ===\n');

    // メインデッキの領域を取得
    const mainDeckClip = await cdp.getElementClip('#deck_image #main.card_set', 10);

    // シャッフル・ソート・固定動画（20秒）：シャッフル、ソート、固定の一連の操作
    const videoPromise = cdp.recordVideo(
      path.join(OUTPUT_DIR, 'shuffle-sort-animation.mp4'),
      20000, // 20秒録画
      mainDeckClip,
      30 // 30fps
    );

    await cdp.wait(1000); // 最初の1秒ホールド

    // 2枚のカードを固定（右上をクリック）
    // 1枚目のカードの右上をクリック
    const card1Pos = await cdp.evaluate(`
      (() => {
        const cards = document.querySelectorAll('#deck_image #main.card_set div.image_set > a');
        if (cards[0]) {
          const img = cards[0].querySelector('img');
          const rect = img.getBoundingClientRect();
          return {
            x: rect.left + rect.width * 0.75,
            y: rect.top + rect.height * 0.25
          };
        }
        return null;
      })()
    `);
    if (card1Pos) {
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: card1Pos.x,
        y: card1Pos.y,
        button: 'left',
        clickCount: 1
      });
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: card1Pos.x,
        y: card1Pos.y,
        button: 'left',
        clickCount: 1
      });
    }
    await cdp.wait(1000);

    // 3枚目のカードの右上をクリック
    const card3Pos = await cdp.evaluate(`
      (() => {
        const cards = document.querySelectorAll('#deck_image #main.card_set div.image_set > a');
        if (cards[2]) {
          const img = cards[2].querySelector('img');
          const rect = img.getBoundingClientRect();
          return {
            x: rect.left + rect.width * 0.75,
            y: rect.top + rect.height * 0.25
          };
        }
        return null;
      })()
    `);
    if (card3Pos) {
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: card3Pos.x,
        y: card3Pos.y,
        button: 'left',
        clickCount: 1
      });
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: card3Pos.x,
        y: card3Pos.y,
        button: 'left',
        clickCount: 1
      });
    }
    await cdp.wait(1500);

    // シャッフル（固定されたカードは先頭に残る）
    await cdp.evaluate(`document.getElementById("ygo-shuffle-btn").click()`);
    await cdp.wait(2000);

    // ソート
    await cdp.evaluate(`document.getElementById("ygo-sort-btn").click()`);
    await cdp.wait(2500);

    // シャッフル
    await cdp.evaluate(`document.getElementById("ygo-shuffle-btn").click()`);
    await cdp.wait(2000);

    // 固定を解除（1枚目のカードの右上を再度クリック）
    const card1PosUnfix = await cdp.evaluate(`
      (() => {
        const cards = document.querySelectorAll('#deck_image #main.card_set div.image_set > a');
        if (cards[0]) {
          const img = cards[0].querySelector('img');
          const rect = img.getBoundingClientRect();
          return {
            x: rect.left + rect.width * 0.75,
            y: rect.top + rect.height * 0.25
          };
        }
        return null;
      })()
    `);
    if (card1PosUnfix) {
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: card1PosUnfix.x,
        y: card1PosUnfix.y,
        button: 'left',
        clickCount: 1
      });
      await cdp.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: card1PosUnfix.x,
        y: card1PosUnfix.y,
        button: 'left',
        clickCount: 1
      });
    }
    await cdp.wait(1000);

    // シャッフル（固定解除後）
    await cdp.evaluate(`document.getElementById("ygo-shuffle-btn").click()`);
    await cdp.wait(2000);

    // ソート
    await cdp.evaluate(`document.getElementById("ygo-sort-btn").click()`);
    await cdp.wait(2500);

    // 最後の1秒ホールド（自動的に待機）

    await videoPromise;

    console.log('\n【動画撮影完了】\n');
    console.log('✅ シャッフル・ソート機能の動画を保存しました\n');

    // GIF変換
    console.log('\n=== GIF変換 ===\n');

    const mp4Path = path.join(OUTPUT_DIR, 'shuffle-sort-animation.mp4');
    await convertToGif(
      mp4Path,
      path.join(OUTPUT_DIR, 'shuffle-sort-animation.gif'),
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
