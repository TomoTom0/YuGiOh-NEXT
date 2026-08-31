/**
 * 全ソート＋代替ソート保存の動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3)でログイン済み。
 * 固定テスト用デッキ dno=3「テスト自動生成デッキ」を対象にする（TASK-317）。
 * 全ソート・代替ソート保存はいずれも並び順のみを変更する操作でカード構成は変わらないため、
 * 繰り返し実行しても安全・可逆。
 *
 * サーバー書き込みを伴うため、デフォルトは書き込みなし（メニュー項目の存在確認まで）。
 * 環境変数 YGO_WRITE_TESTS=1 の時のみ実際に全ソート→代替ソート保存を実行する。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     ([data-testid="menu-btn"], [data-testid="sort-all-btn"], [data-testid="save-with-alt-sort-btn"],
 *      handleSortAll, handleSaveWithAltSortClick)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';
const WRITE_TESTS = process.env.YGO_WRITE_TESTS === '1';

async function openMenu(cdp) {
  await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);
  return cdp.waitFor(`document.querySelector('.menu-dropdown') !== null`, 5000);
}

async function testSortAllAltSave() {
  console.log(`【全ソート＋代替ソート保存テスト】 (YGO_WRITE_TESTS=${WRITE_TESTS ? '1（実行）' : '未設定（書き込みなし）'})\n`);
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('固定テスト用デッキ(dno=3)にアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.deck-edit-container') !== null`, 10000);
    if (!loaded) console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) { t.summary(); return; }

    const dno = await cdp.evaluate(`document.querySelector('.deck-edit-container .dno-chip')?.textContent || ''`);
    t.assert('固定テスト用デッキ(dno=3)が開かれている', dno.includes('3'));

    console.log('--- メニューを開いて項目を確認 ---');
    const menuOpen = await openMenu(cdp);
    t.assert('メニューが開く', menuOpen === true);

    const sortAllBtnExists = await cdp.evaluate(`document.querySelector('[data-testid="sort-all-btn"]') !== null`);
    t.assert('全ソートメニュー項目([data-testid="sort-all-btn"])が存在', sortAllBtnExists === true);

    const altSaveBtnExists = await cdp.evaluate(`document.querySelector('[data-testid="save-with-alt-sort-btn"]') !== null`);
    t.assert('代替ソート保存メニュー項目([data-testid="save-with-alt-sort-btn"])が存在', altSaveBtnExists === true);

    // メニューを閉じる（開いたままだと後続のメニュー操作が不安定なため）
    await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);

    if (!WRITE_TESTS) {
      console.log('\n（YGO_WRITE_TESTS 未設定のため、実行はスキップ・書き込みなし）');
      t.summary();
      return;
    }

    console.log('\n--- 全ソートを実行 ---');
    await openMenu(cdp);
    await cdp.evaluate(`document.querySelector('[data-testid="sort-all-btn"]')?.click()`);
    await cdp.wait(500);

    console.log('\n--- 代替ソートで保存を実行 ---');
    const menuOpen2 = await openMenu(cdp);
    t.assert('代替ソート保存前にメニューが再度開く', menuOpen2 === true);
    await cdp.evaluate(`document.querySelector('[data-testid="save-with-alt-sort-btn"]')?.click()`);

    const savedToast = await cdp.waitFor(
      `Array.from(document.querySelectorAll('.toast')).some(el => el.textContent.includes('保存しました'))`,
      15000
    );
    t.assert('代替ソート保存で成功トーストが表示される', savedToast === true);

    const errorToast = await cdp.evaluate(
      `Array.from(document.querySelectorAll('.toast')).some(el => el.textContent.includes('保存に失敗'))`
    );
    t.assert('保存失敗トーストが出ていない', errorToast === false);

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

testSortAllAltSave();
