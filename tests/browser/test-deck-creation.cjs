/**
 * デッキ新規作成機能の動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit)でログイン済み。
 *
 * サーバー書き込みを伴うため、デフォルトは書き込みなし（New Deck メニュー表示確認まで）。
 * 環境変数 YGO_WRITE_TESTS=1 の時のみ実際に作成→削除を実行する。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue ([data-testid="menu-btn"], [data-testid="new-deck-btn"], [data-testid="delete-deck-btn"], .dno-chip)
 *   src/stores/deck-edit.ts (createNewDeck, deleteCurrentDeck)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';
const WRITE_TESTS = process.env.YGO_WRITE_TESTS === '1';

async function testDeckCreation() {
  console.log(`【デッキ新規作成テスト】 (YGO_WRITE_TESTS=${WRITE_TESTS ? '1（作成→削除実行）' : '未設定（書き込みなし）'})\n`);
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.deck-edit-container') !== null`, 10000);
    if (!loaded) console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) { t.summary(); return; }

    const beforeDno = await cdp.evaluate(`document.querySelector('.deck-edit-container .dno-chip')?.textContent || ''`);
    console.log(`  作成前 dno: ${beforeDno}\n`);

    console.log('--- メニューを開く ---');
    await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);
    const menuOpen = await cdp.waitFor(`document.querySelector('.menu-dropdown') !== null`, 5000);
    t.assert('メニューが開く', menuOpen === true);

    const newDeckBtnExists = await cdp.evaluate(`document.querySelector('[data-testid="new-deck-btn"]') !== null`);
    t.assert('New Deck メニュー項目([data-testid="new-deck-btn"])が存在', newDeckBtnExists === true);

    if (!WRITE_TESTS) {
      console.log('\n（YGO_WRITE_TESTS 未設定のため、作成実行はスキップ・書き込みなし）');
      t.summary();
      return;
    }

    console.log('\n--- 新規デッキ作成を実行 ---');
    await cdp.evaluate(`document.querySelector('[data-testid="new-deck-btn"]')?.click()`);
    // 未保存ダイアログのフォールバック
    await cdp.wait(500);
    const unsavedDialog = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay') !== null`);
    if (unsavedDialog) {
      await cdp.evaluate(`document.body.querySelector('.btn-danger')?.click()`);
    }

    // 作成完了待機（menu-btn の .loading 解除 + ローディングオーバーレイ消失）
    const created = await cdp.waitFor(`(() => { const m = document.querySelector('[data-testid="menu-btn"]'); const o = document.querySelector('.deck-loading-overlay'); const mLoading = m && m.classList.contains('loading'); const oVisible = o && getComputedStyle(o).display !== 'none'; return !mLoading && !oVisible; })()`, 15000);
    t.assert('新規デッキ作成が完了する', created === true);

    const afterDno = await cdp.evaluate(`document.querySelector('.deck-edit-container .dno-chip')?.textContent || ''`);
    t.assert('作成後に dno が新しい値に変わる', afterDno !== '' && afterDno !== '-' && afterDno !== beforeDno);
    console.log(`  作成後 dno: ${afterDno}`);

    // クリーンアップ: 作成したデッキを削除
    console.log('\n--- クリーンアップ: 作成したデッキを削除 ---');
    await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);
    await cdp.waitFor(`document.querySelector('.menu-dropdown') !== null`, 5000);
    await cdp.evaluate(`document.querySelector('[data-testid="delete-deck-btn"]')?.click()`);
    await cdp.wait(500);
    const deleteDialog = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay') !== null`);
    if (deleteDialog) {
      await cdp.evaluate(`document.body.querySelector('.btn-delete, .btn-danger')?.click()`);
    }
    const deleted = await cdp.waitFor(`(() => { const o = document.querySelector('.deck-loading-overlay'); return !o || getComputedStyle(o).display === 'none'; })()`, 15000);
    t.assert('作成デッキを削除（クリーンアップ）', deleted === true);

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

testDeckCreation();
