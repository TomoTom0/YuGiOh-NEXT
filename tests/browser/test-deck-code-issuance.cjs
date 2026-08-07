/**
 * デッキコード発行機能の動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit)でログイン済み。
 *       デッキコード発行UI(DeckMetadataHeader)はeditページ専用。
 *
 * サーバー書き込み（コード発行 ope=13）を伴うため、デフォルトは書き込みなし。
 * 環境変数 YGO_WRITE_TESTS=1 の時のみ発行を実行する。
 *
 * 実装参照:
 *   src/components/DeckMetadataHeader.vue (.metadata-menu-button, .deck-code-row, .deck-code-btn, .deck-code-display)
 *   src/api/deck-operations.ts (issueDeckCodeInternal, ope=13)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';
const WRITE_TESTS = process.env.YGO_WRITE_TESTS === '1';

async function testDeckCodeIssuance() {
  console.log(`【デッキコード発行テスト】 (YGO_WRITE_TESTS=${WRITE_TESTS ? '1（発行実行）' : '未設定（書き込みなし）'})\n`);
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.metadata-menu-button') !== null`, 10000);
    if (!loaded) console.log('  ※ メタデータUIが表示されません（ログイン未済の可能性）');
    t.assert('メタデータメニュー(.metadata-menu-button)が表示される', loaded === true);
    if (!loaded) { t.summary(); return; }

    console.log('\n--- メタデータメニューを開く ---');
    await cdp.evaluate(`document.querySelector('.metadata-menu-button')?.click()`);
    const rowVisible = await cdp.waitFor(`document.querySelector('.deck-code-row') !== null`, 5000);
    t.assert('デッキコード行(.deck-code-row)が表示される', rowVisible === true);

    // 発行済みか未発行かで分岐
    const alreadyIssued = await cdp.evaluate(`document.querySelector('.deck-code-display') !== null`);
    const issueBtnExists = await cdp.evaluate(`document.querySelector('.deck-code-btn') !== null`);

    if (alreadyIssued) {
      // 発行済み: コード値を検証（書き込みなし）
      const code = await cdp.evaluate(`document.querySelector('.deck-code-display')?.value || ''`);
      t.assert('発行済みデッキコード(.deck-code-display)が表示される', typeof code === 'string' && code.length >= 5 && /^[A-Za-z0-9]+$/.test(code));
      console.log(`  発行済みコード: ${code}`);
    } else if (issueBtnExists) {
      if (!WRITE_TESTS) {
        t.assert('未発行: 発行ボタン(.deck-code-btn)が存在（クリックせず書き込み回避）', issueBtnExists === true);
        console.log('\n（YGO_WRITE_TESTS 未設定のため、発行実行はスキップ・書き込みなし）');
      } else {
        console.log('\n--- デッキコード発行を実行 ---');
        await cdp.sendCommand('Network.enable');
        const reqPromise = cdp.waitForRequest('ope=13', 15000);
        await cdp.evaluate(`document.querySelector('.deck-code-btn')?.click()`);
        const issued = await cdp.waitFor(`document.querySelector('.deck-code-display') !== null`, 15000);
        t.assert('発行完了で .deck-code-display が表示される', issued === true);
        const req = await reqPromise;
        t.assert('ope=13 リクエストが発火する', req !== null);
        if (issued) {
          const code = await cdp.evaluate(`document.querySelector('.deck-code-display')?.value || ''`);
          t.assert('発行コードが表示される（5文字以上の英数字）', typeof code === 'string' && code.length >= 5 && /^[A-Za-z0-9]+$/.test(code));
          console.log(`  発行コード: ${code.substring(0, 20)}...`);
        }
      }
    } else {
      t.assert('デッキコードUI(.deck-code-display or .deck-code-btn)が存在', false);
    }

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

testDeckCodeIssuance();
