/**
 * デッキ表示ページのスクリーンショット撮影
 *
 * 以下の画像を撮影：
 * 1. deck-display-page-overview.png - ページ全体
 * 2. shuffle-sort-buttons.png - シャッフル・ソートボタン
 * 3. deck-image-button.png - デッキ画像作成ボタン
 * 4. card-lock-feature.png - カードのロック機能
 * 5. card-locked-state.png - ロックされたカード
 */

const { connectCDP } = require('./screenshot-helper');
const path = require('path');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function captureScreenshots() {
  console.log('【デッキ表示ページ スクリーンショット撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== 1. ページ全体のスクリーンショット ===\n');
    await cdp.captureFullPage(path.join(OUTPUT_DIR, 'deck-display-page-overview.png'));

    console.log('\n=== 2. シャッフル・ソートボタン ===\n');
    // シャッフルボタンとソートボタンを含むエリアをキャプチャ
    await cdp.captureElement(
      '#deck_image #main.card_set .top',
      path.join(OUTPUT_DIR, 'shuffle-sort-buttons.png'),
      { padding: 10 }
    );

    console.log('\n=== 3. デッキ画像作成ボタン ===\n');
    // #bottom_btn_set エリアをキャプチャ
    await cdp.captureElement(
      '#bottom_btn_set',
      path.join(OUTPUT_DIR, 'deck-image-button.png'),
      { padding: 10 }
    );

    console.log('\n=== 4. カードのロック機能（クリック前） ===\n');
    // 最初のカードをキャプチャ
    await cdp.captureElement(
      '#deck_image #main.card_set .image_set a:first-child',
      path.join(OUTPUT_DIR, 'card-lock-feature.png'),
      { padding: 5 }
    );

    console.log('\n=== 5. ロックされたカード ===\n');
    // 最初のカードをロック
    await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        const rect = firstCard.getBoundingClientRect();

        // 右上1/4の位置を計算
        const x = rect.left + rect.width * 0.75;
        const y = rect.top + rect.height * 0.25;

        // クリックイベントを作成
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });

        firstCard.dispatchEvent(event);
      })()
    `);

    await cdp.wait(500); // ロック処理待機

    // ロックされたカードをキャプチャ
    await cdp.captureElement(
      '#deck_image #main.card_set .image_set a:first-child',
      path.join(OUTPUT_DIR, 'card-locked-state.png'),
      { padding: 5 }
    );

    console.log('\n【撮影完了】\n');
    console.log('✅ デッキ表示ページのスクリーンショット5枚を保存しました');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// 実行
captureScreenshots();
