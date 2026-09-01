/**
 * 未保存の変更ダイアログの動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3)でログイン済み。
 * 固定テスト用デッキ dno=3「テスト自動生成デッキ」を対象にする（TASK-317）。
 *
 * 未保存変更の作成にはデッキ名末尾への半角スペース付与を使う。
 * hasUnsavedChanges() は deckInfo（name/mainDeck/extraDeck/...）のスナップショット比較で、
 * 表示順序（displayOrder）はここに含まれないため、並び替えボタンでは差分が発生しない
 * （src/composables/deck/useDeckSnapshot.ts captureDeckSnapshot）。デッキ名の変更は
 * 最も低リスクに確実な差分を作れる（末尾スペース1文字のみ、見た目にも影響しない）。
 *
 * 「保存して続ける」経路を検証する場合（YGO_WRITE_TESTS=1）は、保存直後に元のデッキ名へ
 * 戻して再保存し、dno=3を変更前の状態に復元する。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue ([data-testid="menu-btn"], [data-testid="save-btn"],
 *     [data-testid="reload-deck-btn"], handleReloadDeck, performSave)
 *   src/content/edit-ui/DeckEditLayout.vue (checkUnsavedChanges, unsavedChangesTitle/Buttons)
 *   src/components/ConfirmDialog.vue (getButtonClass: primary→.btn-primary, secondary→.btn-secondary, danger→.btn-danger)
 *   src/components/BaseDialog.vue (.base-dialog-overlay)
 *   src/composables/deck/useDeckSnapshot.ts (captureDeckSnapshot: name/mainDeck/extraDeck/...を比較、順序は含むが表示順序とは別概念)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';
const WRITE_TESTS = process.env.YGO_WRITE_TESTS === '1';

async function openMenu(cdp) {
  await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);
  return cdp.waitFor(`document.querySelector('.menu-dropdown') !== null`, 5000);
}

async function setDeckName(cdp, value) {
  await cdp.evaluate(`
    (function(){
      const el = document.querySelector('.deck-name-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `);
  await cdp.wait(300);
}

/** デッキ名末尾に半角スペースを付与して未保存の変更を作る（カード構成は変えない） */
async function makeUnsavedChange(cdp, originalName) {
  await setDeckName(cdp, originalName + ' ');
}

async function waitForToast(cdp, text, timeout = 15000) {
  return cdp.waitFor(
    `Array.from(document.querySelectorAll('.toast')).some(el => el.textContent.includes(${JSON.stringify(text)}))`,
    timeout
  );
}

async function testUnsavedChanges() {
  console.log(`【未保存の変更ダイアログテスト】 (YGO_WRITE_TESTS=${WRITE_TESTS ? '1（保存して続ける経路も検証）' : '未設定（キャンセル経路のみ）'})\n`);
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

    const originalName = await cdp.evaluate(`document.querySelector('.deck-name-input')?.value || ''`);
    console.log(`  デッキ名: "${originalName}"`);

    console.log('--- デッキ名末尾にスペースを付与して未保存の変更を作る ---');
    await makeUnsavedChange(cdp, originalName);

    console.log('--- 再読み込みメニューをクリックしてダイアログ表示を確認 ---');
    const menuOpen = await openMenu(cdp);
    t.assert('メニューが開く', menuOpen === true);
    await cdp.evaluate(`document.querySelector('[data-testid="reload-deck-btn"]')?.click()`);

    const dialogShown = await cdp.waitFor(`document.querySelector('.base-dialog-overlay') !== null`, 5000);
    t.assert('未保存の変更ダイアログ(.base-dialog-overlay)が表示される', dialogShown === true);

    const dialogTitle = await cdp.evaluate(`document.querySelector('.base-dialog-overlay .dialog-title')?.textContent || ''`);
    t.assert('ダイアログタイトルが「未保存の変更があります」', dialogTitle.includes('未保存の変更'));

    const hasThreeButtons = await cdp.evaluate(`document.querySelectorAll('.base-dialog-overlay .dialog-footer .btn').length === 3`);
    t.assert('ダイアログに3つのボタン（中断/保存して続ける/保存せず続ける）が表示される', hasThreeButtons === true);

    console.log('\n--- 「処理を中断」でダイアログを閉じる ---');
    await cdp.evaluate(`document.querySelector('.base-dialog-overlay .btn-secondary')?.click()`);
    const dialogClosed = await cdp.waitFor(`document.querySelector('.base-dialog-overlay') === null`, 5000);
    t.assert('「処理を中断」でダイアログが閉じる', dialogClosed === true);

    // キャンセルはサーバーに書き込まないため、末尾スペース付きの名前がローカルに
    // 残っていても無害（次回ナビゲーションで破棄される）。念のため元に戻しておく。
    await setDeckName(cdp, originalName);

    if (!WRITE_TESTS) {
      console.log('\n（YGO_WRITE_TESTS 未設定のため、「保存して続ける」経路の検証はスキップ）');
      t.summary();
      return;
    }

    console.log('\n--- 「保存して続ける」経路を検証 ---');
    await makeUnsavedChange(cdp, originalName);
    await openMenu(cdp);
    await cdp.evaluate(`document.querySelector('[data-testid="reload-deck-btn"]')?.click()`);
    const dialogShown2 = await cdp.waitFor(`document.querySelector('.base-dialog-overlay') !== null`, 5000);
    t.assert('2回目の未保存の変更ダイアログが表示される', dialogShown2 === true);

    await cdp.evaluate(`document.querySelector('.base-dialog-overlay .btn-primary')?.click()`);

    const savedToast = await waitForToast(cdp, '保存しました');
    t.assert('「保存して続ける」で保存成功トーストが表示される', savedToast === true);

    const reloadedToast = await waitForToast(cdp, '再読み込みしました');
    t.assert('保存後に再読み込みが実行される', reloadedToast === true);

    const nameAfterReload = await cdp.evaluate(`document.querySelector('.deck-name-input')?.value || ''`);
    t.assert('再読み込み後、末尾スペース付きの名前で保存されている', nameAfterReload === originalName + ' ');

    console.log('\n--- クリーンアップ: デッキ名を元に戻して保存 ---');
    await setDeckName(cdp, originalName);
    await cdp.evaluate(`document.querySelector('[data-testid="save-btn"]')?.click()`);
    const restoredToast = await waitForToast(cdp, '保存しました');
    t.assert('元のデッキ名で保存し直せる（クリーンアップ）', restoredToast === true);

    const nameRestored = await cdp.evaluate(`document.querySelector('.deck-name-input')?.value || ''`);
    t.assert('デッキ名が元の値に復元されている', nameRestored === originalName);

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

testUnsavedChanges();
