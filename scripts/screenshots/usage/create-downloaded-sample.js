/**
 * 実際にダウンロードされる高解像度のデッキ画像サンプルを作成
 * ダイアログからダウンロードボタンをクリックして画像を取得
 */

const { connectCDP } = require('./video-helper');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function createDownloadedSample() {
  console.log('【ダウンロード画像サンプル作成】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    // ダイアログを開く
    console.log('ダイアログを開く...');
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(2000); // ダイアログ表示と画像生成待機

    // ダウンロードボタンをクリック
    console.log('ダウンロードボタンをクリック...');
    await cdp.evaluate(`document.getElementById("ygo-download-btn").click()`);
    await cdp.wait(3000); // ダウンロード待機

    console.log('\n画像をダウンロードフォルダから取得...');

    // ダウンロードフォルダから最新のpngファイルを探す
    const homeDir = process.env.HOME;
    const downloadDir = path.join(homeDir, 'Downloads');

    // 最新のデッキ画像ファイルを探す
    const files = fs.readdirSync(downloadDir)
      .filter(f => f.includes('デッキ') && f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(downloadDir, f),
        time: fs.statSync(path.join(downloadDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      const latestFile = files[0];
      const outputPath = path.join(OUTPUT_DIR, 'deck-recipe-sample.png');

      // コピー
      fs.copyFileSync(latestFile.path, outputPath);

      console.log(`✅ 画像を保存: ${outputPath}`);
      console.log(`元ファイル: ${latestFile.name}`);

      const stats = fs.statSync(outputPath);
      console.log(`サイズ: ${(stats.size / 1024).toFixed(2)} KB`);

      // 元のファイルを削除
      fs.unlinkSync(latestFile.path);
      console.log(`ダウンロードフォルダから元ファイルを削除しました`);
    } else {
      console.error('❌ ダウンロードされたファイルが見つかりません');
    }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
createDownloadedSample();
