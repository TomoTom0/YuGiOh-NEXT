/**
 * 実際にダウンロードされる高解像度のデッキ画像を作成
 * ブラウザ内でcreateDeckRecipeImage関数を直接呼び出してscale=2の画像を生成
 */

const { connectCDP } = require('./video-helper');
const path = require('path');
const fs = require('fs');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function createActualImage() {
  console.log('【実際のデッキ画像作成】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    // ブラウザ内で直接画像を生成（scale=2, 赤背景, QR ON）
    console.log('高解像度画像を生成中（scale=2）...');

    // まず、ページのデッキデータとURLパラメータを取得
    const pageInfo = await cdp.evaluate(`
      (() => {
        const url = window.location.href;
        const cgidMatch = url.match(/cgid=([a-f0-9]+)/);
        const dnoMatch = url.match(/dno=(\\d+)/);
        return {
          cgid: cgidMatch ? cgidMatch[1] : null,
          dno: dnoMatch ? dnoMatch[1] : null
        };
      })()
    `);

    if (!pageInfo.cgid || !pageInfo.dno) {
      console.error('❌ cgidまたはdnoが取得できませんでした');
      cdp.close();
      process.exit(1);
    }

    console.log(`cgid: ${pageInfo.cgid}, dno: ${pageInfo.dno}`);

    // グローバルに公開されているdownloadDeckRecipeImage関数を利用
    // Blobを生成してDataURLに変換
    const dataUrl = await cdp.evaluate(`
      (async () => {
        // downloadDeckRecipeImageをインポート（既にロード済みのモジュールから取得）
        const { parseDeckDetail } = window;
        const { createDeckRecipeImage } = window;

        // 現在のページからデッキデータを取得
        const deckData = parseDeckDetail(document);

        // 画像を生成
        const blob = await createDeckRecipeImage({
          cgid: '${pageInfo.cgid}',
          dno: '${pageInfo.dno}',
          deckData: deckData,
          color: 'red',
          includeQR: true,
          scale: 2
        });

        // BlobをDataURLに変換
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })()
    `);

    if (!dataUrl) {
      console.error('❌ 画像の生成に失敗しました');
      cdp.close();
      process.exit(1);
    }

    // DataURLからBase64データを抽出
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // ファイルに保存
    const outputPath = path.join(OUTPUT_DIR, 'deck-recipe-sample.png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ 画像を保存: ${outputPath}`);
    const stats = fs.statSync(outputPath);
    console.log(`サイズ: ${(stats.size / 1024).toFixed(2)} KB`);

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
createActualImage();
