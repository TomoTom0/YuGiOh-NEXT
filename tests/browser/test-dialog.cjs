/**
 * デッキ画像作成ダイアログの動作確認テスト
 *
 * 実装参照:
 *   src/components/ImageDialog.vue (全要素 class ベース、id なし。isVisible は canvas生成後に true)
 *   src/content/deck-recipe/addImageButton.ts (#ygo-next-deck-image-btn のみ id)
 *
 * 確認:
 * 1. カメラボタン(#ygo-next-deck-image-btn)クリックでダイアログ(.ygo-next-image-popup)が表示
 * 2. デッキ名入力(.title-field .field-input)が存在
 * 3. カラースウォッチ(.color-swatch)クリックで .background-image の background が切り替わる（selectColor は async）
 * 4. QRトグル(.toggle-btn.qr-toggle)の active/inactive 切替
 * 5. ダウンロードボタン(.download-btn)が存在
 * 6. オーバーレイ(.ygo-next-image-popup-overlay)クリックでダイアログが閉じる
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testDialog() {
  console.log('【デッキ画像作成ダイアログテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== カメラボタンをクリック ===');
    const btnExists = await cdp.evaluate(`
      (() => {
        const btn = document.getElementById("ygo-next-deck-image-btn");
        if (btn) btn.click();
        return !!btn;
      })()
    `);
    t.assert('カメラボタン(#ygo-next-deck-image-btn)が存在してクリック', btnExists === true);

    // ダイアログ表示をポーリング待機（isVisible は canvas生成完了後に true になる非同期）
    const popupVisible = await cdp.waitFor(`document.querySelector('.ygo-next-image-popup') !== null`, 8000);
    t.assert('ダイアログ(.ygo-next-image-popup)が表示される', popupVisible === true);

    console.log('\n=== デッキ名入力フィールドの確認 ===');
    const inputInfo = await cdp.evaluate(`
      (() => {
        const input = document.querySelector('.title-field .field-input');
        return { exists: !!input, placeholder: input ? input.placeholder : null };
      })()
    `);
    t.assert('デッキ名入力(.title-field .field-input)が存在', inputInfo?.exists === true);

    console.log('\n=== カラースウォッチの確認 ===');
    const swatchCount = await cdp.evaluate(`document.querySelectorAll('.color-swatch').length`);
    t.assert('カラースウォッチ(.color-swatch)が4色分存在', swatchCount === 4);

    const bgBefore = await cdp.evaluate(`
      (() => {
        const el = document.querySelector('.background-image');
        return el ? window.getComputedStyle(el).backgroundImage : null;
      })()
    `);
    // 未選択のスウォッチをクリック（selectColor は async、canvas再生成で色が切り替わる）
    await cdp.evaluate(`document.querySelector('.color-swatch:not(.selected)')?.click()`);
    await cdp.wait(1500); // canvas再生成待ち
    const bgAfter = await cdp.evaluate(`
      (() => {
        const el = document.querySelector('.background-image');
        return el ? window.getComputedStyle(el).backgroundImage : null;
      })()
    `);
    t.assert('カラースウォッチクリックで .background-image の background が切り替わる', bgBefore !== bgAfter);

    console.log('\n=== QRトグルボタンの確認 ===');
    const qrToggleExists = await cdp.evaluate(`document.querySelector('.toggle-btn.qr-toggle') !== null`);
    t.assert('QRトグル(.toggle-btn.qr-toggle)が存在', qrToggleExists === true);
    const qrBefore = await cdp.evaluate(`document.querySelector('.toggle-btn.qr-toggle')?.classList.contains('active') === true`);
    await cdp.evaluate(`document.querySelector('.toggle-btn.qr-toggle')?.click()`);
    await cdp.wait(300);
    const qrAfter = await cdp.evaluate(`document.querySelector('.toggle-btn.qr-toggle')?.classList.contains('active') === true`);
    t.assert('QRトグルで active/inactive が切り替わる', qrBefore !== qrAfter);

    console.log('\n=== ダウンロードボタンの確認 ===');
    const hasDownload = await cdp.evaluate(`document.querySelector('.download-btn') !== null`);
    t.assert('ダウンロードボタン(.download-btn)が存在', hasDownload === true);

    console.log('\n=== ポップアップを閉じる ===');
    await cdp.evaluate(`document.querySelector('.ygo-next-image-popup-overlay')?.click()`);
    // closePopup -> 200msアニメ -> unmount() で DOM完全削除。消失をポーリング待機
    const popupGone = await cdp.waitFor(`document.querySelector('.ygo-next-image-popup') === null`, 3000);
    t.assert('オーバーレイクリックでダイアログが閉じる', popupGone === true);

    t.summary();
  } catch (e) {
    console.error('Error:', e.message);
    t.assert('例外なく完了', false);
    t.summary();
  } finally {
    cdp.close();
    process.exit(t.exitCode());
  }
}

// テスト実行
testDialog();
