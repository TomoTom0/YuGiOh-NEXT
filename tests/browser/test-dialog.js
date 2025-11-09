/**
 * デッキ画像作成ダイアログの動作確認テスト
 *
 * 以下の挙動を確認：
 * 1. カメラボタンをクリックしてダイアログが表示されること
 * 2. デッキ名入力フィールドが存在すること
 * 3. ダイアログをクリックして背景色が切り替わること（赤↔青）
 * 4. QRトグルボタンでQRコードのON/OFF切り替えができること
 * 5. ダウンロードボタンが存在すること
 * 6. オーバーレイをクリックしてダイアログが閉じること
 */

const { connectCDP } = require('./cdp-helper');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testDialog() {
  console.log('【デッキ画像作成ダイアログテスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== カメラボタンをクリック ===\n');

    // カメラボタンをクリック
    await cdp.evaluate(`document.getElementById("ygo-deck-image-btn").click()`);
    await cdp.wait(500); // ダイアログ表示待機

    // ポップアップが表示されたか確認
    const dialogVisible = await cdp.evaluate(`
      (() => {
        const popup = document.getElementById('ygo-image-popup');
        return popup !== null;
      })()
    `);

    if (dialogVisible) {
      console.log('✅ ダイアログが表示されました');
    } else {
      console.log('❌ ダイアログが表示されていません');
    }

    console.log('\n=== デッキ名入力フィールドの確認 ===\n');

    // デッキ名入力フィールドの存在確認
    const deckNameInput = await cdp.evaluate(`
      (() => {
        const input = document.getElementById('ygo-deck-name-input');
        return {
          exists: input !== null,
          value: input ? input.value : null,
          placeholder: input ? input.placeholder : null
        };
      })()
    `);

    console.log(`入力フィールド: ${deckNameInput.exists ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`初期値: "${deckNameInput.value}"`);
    console.log(`プレースホルダー: "${deckNameInput.placeholder}"`);

    console.log('\n=== 背景画像切り替え機能の確認 ===\n');

    // 初期の背景画像URLを取得
    const initialBgImage = await cdp.evaluate(`
      (() => {
        const bgDiv = document.getElementById('ygo-background-image');
        return window.getComputedStyle(bgDiv).backgroundImage;
      })()
    `);

    console.log(`初期背景画像: ${initialBgImage.substring(0, 50)}...`);

    // ポップアップをクリック（背景色切り替え）
    await cdp.evaluate(`
      (() => {
        const popup = document.getElementById('ygo-image-popup');
        popup.click();
      })()
    `);

    await cdp.wait(1000); // 画像生成待機

    // 切り替え後の背景画像URLを取得
    const changedBgImage = await cdp.evaluate(`
      (() => {
        const bgDiv = document.getElementById('ygo-background-image');
        return window.getComputedStyle(bgDiv).backgroundImage;
      })()
    `);

    console.log(`切り替え後の背景画像: ${changedBgImage.substring(0, 50)}...`);

    if (initialBgImage !== changedBgImage) {
      console.log('✅ 背景画像が切り替わりました（色変更）');
    } else {
      console.log('❌ 背景画像が切り替わっていません');
    }

    console.log('\n=== QRトグルボタンの確認 ===\n');

    // QRトグルボタンの初期状態を確認
    const initialQrState = await cdp.evaluate(`
      (() => {
        const btn = document.getElementById('ygo-qr-toggle');
        return {
          exists: btn !== null,
          classes: btn ? btn.className : null,
          isActive: btn ? btn.classList.contains('ygo-qr-active') : null
        };
      })()
    `);

    console.log(`QRトグルボタン: ${initialQrState.exists ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`初期状態: ${initialQrState.isActive ? 'ON (active)' : 'OFF (inactive)'}`);

    // QRトグルボタンをクリック
    await cdp.evaluate(`document.getElementById("ygo-qr-toggle").click()`);
    await cdp.wait(300);

    // 切り替え後の状態を確認
    const toggledQrState = await cdp.evaluate(`
      (() => {
        const btn = document.getElementById('ygo-qr-toggle');
        return {
          classes: btn.className,
          isActive: btn.classList.contains('ygo-qr-active')
        };
      })()
    `);

    console.log(`切り替え後の状態: ${toggledQrState.isActive ? 'ON (active)' : 'OFF (inactive)'}`);

    if (initialQrState.isActive !== toggledQrState.isActive) {
      console.log('✅ QRトグルボタンが機能しています');
    } else {
      console.log('❌ QRトグルボタンが機能していません');
    }

    console.log('\n=== ダウンロードボタンの確認 ===\n');

    // ダウンロードボタンの存在確認
    const downloadBtn = await cdp.evaluate(`
      (() => {
        const btn = document.getElementById('ygo-download-btn');
        return {
          exists: btn !== null,
          text: btn ? btn.textContent : null
        };
      })()
    `);

    console.log(`ダウンロードボタン: ${downloadBtn.exists ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`ボタンテキスト: "${downloadBtn.text}"`);

    console.log('\n=== ポップアップを閉じる ===\n');

    // オーバーレイをクリック
    await cdp.evaluate(`
      (() => {
        const overlay = document.getElementById('ygo-image-popup-overlay');
        overlay.click();
      })()
    `);

    await cdp.wait(300);

    // ポップアップが閉じたか確認
    const dialogClosed = await cdp.evaluate(`
      (() => {
        const popup = document.getElementById('ygo-image-popup');
        return popup === null;
      })()
    `);

    if (dialogClosed) {
      console.log('✅ オーバーレイクリックでダイアログが閉じました');
    } else {
      console.log('❌ ダイアログが閉じていません');
    }

    console.log('\n【テスト完了】\n');

    // 結果サマリー
    const allPassed = dialogVisible && deckNameInput.exists &&
                      (initialBgImage !== changedBgImage) &&
                      (initialQrState.isActive !== toggledQrState.isActive) &&
                      downloadBtn.exists && dialogClosed;

    if (allPassed) {
      console.log('✅ デッキ画像作成ダイアログは正常に動作しています');
    } else {
      console.log('❌ ダイアログ機能に問題があります');
    }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// テスト実行
testDialog();
