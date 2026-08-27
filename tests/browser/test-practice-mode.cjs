/**
 * 一人回し（Practice）機能の動作確認テスト
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit)で
 *       ログイン済みであること（CDP/Playwright ではログイン不可のため、事前に手動ログインが必要）。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue (.practice-toggle / .practice-reset / [data-testid])
 *   src/components/DeckEditLayout.vue (togglePracticeMode)
 *   src/components/practice/PracticeField.vue (.practice-field, v-if="isInitialized")
 *   src/components/practice/PracticeSlot.vue (.practice-slot)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// デッキ編集ページ（ログイン済み前提）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testPracticeMode() {
  console.log('【一人回し（Practice）機能テスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    await cdp.wait(3000);

    // 編集アプリ + Practiceトグルボタンが表示されるまで待機
    const loaded = await cdp.waitFor(`document.querySelector('.practice-toggle') !== null`, 10000);
    if (!loaded) {
      console.log('  ※ 編集ページが表示されません（ログイン未済または拡張機能未ロードの可能性）');
    }
    t.assert('編集ページで拡張機能がロードされる（.practice-toggle 存在）', loaded === true);
    if (!loaded) { t.summary(); return; }

    console.log('\n--- PracticeモードON ---');
    await cdp.evaluate(`document.querySelector('.practice-toggle')?.click()`);
    // PracticeField は isInitialized 後に表示（デッキロード待ち）
    const fieldOn = await cdp.waitFor(`document.querySelector('.practice-field') !== null`, 10000);
    t.assert('PracticeField が表示される', fieldOn === true);

    const slotCount = await cdp.evaluate(`document.querySelectorAll('.practice-slot').length`);
    t.assert('PracticeSlot が表示される（1個以上）', typeof slotCount === 'number' && slotCount >= 1);
    console.log(`  スロット数: ${slotCount}`);

    console.log('\n--- 操作ボタン ---');
    const undoExists = await cdp.evaluate(`document.querySelector('[data-testid="undo-btn"]') !== null`);
    const redoExists = await cdp.evaluate(`document.querySelector('[data-testid="redo-btn"]') !== null`);
    const resetExists = await cdp.evaluate(`document.querySelector('.practice-reset') !== null`);
    t.assert('Undoボタン存在 [data-testid="undo-btn"]', undoExists === true);
    t.assert('Redoボタン存在 [data-testid="redo-btn"]', redoExists === true);
    t.assert('Resetボタン存在 .practice-reset（practiceMode時）', resetExists === true);

    const undoRedoState = await cdp.evaluate(`
      (() => {
        const u = document.querySelector('[data-testid="undo-btn"]');
        const r = document.querySelector('[data-testid="redo-btn"]');
        return JSON.stringify({ ud: u ? u.disabled : null, rd: r ? r.disabled : null });
      })()
    `);
    const states = JSON.parse(undoRedoState);
    t.assert('Undo 初期 disabled（操作履歴なし）', states.ud === true);
    t.assert('Redo 初期 disabled', states.rd === true);

    console.log('\n--- PracticeモードOFF（.practice-toggle を再度クリック）---');
    await cdp.evaluate(`document.querySelector('.practice-toggle')?.click()`);
    const fieldOff = await cdp.waitFor(`document.querySelector('.practice-field') === null`, 5000);
    t.assert('PracticeField が非表示になる', fieldOff === true);

    console.log('\n--- 再度ON（状態維持確認）---');
    await cdp.evaluate(`document.querySelector('.practice-toggle')?.click()`);
    const fieldAgain = await cdp.waitFor(`document.querySelector('.practice-field') !== null`, 10000);
    t.assert('PracticeField が再表示される', fieldAgain === true);

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
testPracticeMode();
