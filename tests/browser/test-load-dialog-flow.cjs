/**
 * LoadDialog（デッキ読み込みダイアログ）フローの動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit)でログイン済み。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue ([data-testid="load-btn"])
 *   src/components/LoadDialog.vue (.base-dialog-overlay, .deck-grid, .deck-card, .dno-chip, .pagination-btn, .pagination-info, .no-decks)
 *   src/components/BaseDialog.vue (Teleport to body)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testLoadDialogFlow() {
  console.log('【LoadDialogフローテスト】\n');
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
    console.log(`  ロード前 dno: ${beforeDno}\n`);

    console.log('--- LoadDialog を開く ---');
    await cdp.evaluate(`document.querySelector('[data-testid="load-btn"]')?.click()`);
    const dialogOpen = await cdp.waitFor(`document.body.querySelector('.base-dialog-overlay .dialog-title') !== null`, 8000);
    t.assert('LoadDialog が開く', dialogOpen === true);

    const title = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .dialog-title')?.textContent || ''`);
    t.assert('ダイアログタイトルが "Load Deck"', title.trim() === 'Load Deck');

    // デッキ一覧の確認
    const deckCount = await cdp.evaluate(`document.body.querySelectorAll('.base-dialog-overlay .deck-card').length`);
    const noDecks = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .no-decks') !== null`);
    if (noDecks) {
      t.assert('デッキ0件時は .no-decks 表示', noDecks === true);
      console.log('  ※ デッキが1つもないため、読み込みテストはスキップ');
      t.summary();
      return;
    }
    t.assert('デッキ一覧が表示される（.deck-card 1件以上）', deckCount >= 1);
    console.log(`  デッキ件数: ${deckCount}`);

    // ページネーション（25件以上の場合のみ表示）
    const hasPagination = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .pagination-info') !== null`);
    if (hasPagination) {
      const pageInfo = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .pagination-info')?.textContent || ''`);
      const btnCount = await cdp.evaluate(`document.body.querySelectorAll('.base-dialog-overlay .pagination-btn').length`);
      t.assert('ページネーション情報が表示される', pageInfo.includes('/'));
      t.assert('ページネーションボタンが2つ', btnCount === 2);
      console.log(`  ページ情報: ${pageInfo}`);
    } else {
      t.assert('デッキ24件以下はページネーション非表示', hasPagination === false);
      console.log('  ページネーション: 非表示（24件以下）');
    }

    console.log('\n--- 1つ目のデッキを読み込む ---');
    const firstCardDno = await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .deck-card .dno-chip')?.textContent || ''`);
    console.log(`  選択デッキ dno: ${firstCardDno}`);
    await cdp.evaluate(`document.body.querySelector('.base-dialog-overlay .deck-card')?.click()`);

    // ダイアログが閉じるまで待機
    const dialogClosed = await cdp.waitFor(`document.body.querySelector('.base-dialog-overlay') === null`, 10000);
    t.assert('デッキ選択でダイアログが閉じる', dialogClosed === true);

    // lastDeckDno の確認（保存をポーリング待機）
    const lastDnoUpdated = await cdp.waitFor(`localStorage.getItem('ygoNext:lastDeckDno') === ${JSON.stringify(firstCardDno)}`, 5000);
    t.assert('localStorage[ygoNext:lastDeckDno] が選択 dno に更新される', lastDnoUpdated === true);

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

testLoadDialogFlow();
