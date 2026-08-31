/**
 * デッキ保存フローの動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3)でログイン済み。
 * 固定テスト用デッキ dno=3「テスト自動生成デッキ」を対象にする（TASK-317）。
 * 保存ボタンは押すたびに現在の並び順で保存し直すだけ（カード構成は変更しない）ため、
 * 繰り返し実行しても安全・可逆。
 *
 * サーバー書き込みを伴うため、デフォルトは書き込みなし（保存ボタンの存在確認まで）。
 * 環境変数 YGO_WRITE_TESTS=1 の時のみ実際に保存を実行する。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue ([data-testid="save-btn"], performSave, handleSaveClick)
 *   src/components/ToastContainer.vue (.toast.success)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';
const WRITE_TESTS = process.env.YGO_WRITE_TESTS === '1';

async function testSaveFlow() {
  console.log(`【デッキ保存フローテスト】 (YGO_WRITE_TESTS=${WRITE_TESTS ? '1（保存実行）' : '未設定（書き込みなし）'})\n`);
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

    const saveBtnExists = await cdp.evaluate(`document.querySelector('[data-testid="save-btn"]') !== null`);
    t.assert('保存ボタン([data-testid="save-btn"])が存在', saveBtnExists === true);

    if (!WRITE_TESTS) {
      console.log('\n（YGO_WRITE_TESTS 未設定のため、保存実行はスキップ・書き込みなし）');
      t.summary();
      return;
    }

    console.log('\n--- 保存を実行 ---');
    await cdp.evaluate(`document.querySelector('[data-testid="save-btn"]')?.click()`);

    const savedToast = await cdp.waitFor(
      `Array.from(document.querySelectorAll('.toast')).some(el => el.textContent.includes('保存しました'))`,
      15000
    );
    t.assert('保存成功トーストが表示される', savedToast === true);

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

testSaveFlow();
