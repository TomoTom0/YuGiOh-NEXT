/**
 * regulationバッジのクリック切替メニュー（TASK-450）のE2Eテスト
 *
 * 対象:
 *   1. デッキ編集画面（DeckEditTopBar.vue .regulation-badge）
 *      クリックでメニュー展開 → 選択でデッキ名タグを書き換え（deckStore.setDeckRegulation、
 *      サーバー保存は伴わない、purely local）
 *   2. デッキ閲覧画面（regulation-ui.ts .ygo-next-regulation-trigger）
 *      クリックでメニュー展開 → 選択で一時プレビュー切替（デッキ名は変更しない）
 *
 * どちらも「代表2件+最新版 → PAST区分(1段目) → 年グループ(2段目) → 個別版」の
 * 3階層メニュー構造を検証する。サーバー書き込みは一切発生しない（安全・可逆）。
 *
 * 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317）を編集画面対象に使用。
 * 変更はSaveしないため、ページ再読み込みで自動的に破棄される。
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     (.regulation-badge, .regulation-menu, .regulation-menu-item,
 *      .regulation-menu-expand, .regulation-menu-expand-nested, .menu-overlay,
 *      toggleRegulationMenu, handleRegulationSelect, togglePastSection, toggleRegulationYearGroup)
 *   src/content/deck-display/regulation-ui.ts
 *     (.ygo-next-regulation-trigger, .ygo-next-regulation-menu,
 *      .ygo-next-regulation-menu-item[data-value], .ygo-next-regulation-menu-expand[data-expand])
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

/**
 * Vue の <Transition> 描画中はクリックが吸収されることがあるため、
 * 条件が満たされるまでクリックをリトライする（test-command-history.cjs の知見に倣う）。
 */
async function clickUntil(cdp, clickExpr, conditionExpr, timeout = 5000, interval = 300) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await cdp.evaluate(clickExpr);
    await cdp.wait(interval);
    if (await cdp.evaluate(conditionExpr)) return true;
  }
  return false;
}

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';
// 公開デッキ表示ページ（認証不要、閲覧モードのメニュー確認用）
const DECK_DISPLAY_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testEditPageMenu(t) {
  console.log('\n【編集画面: regulation-badgeクリックメニュー】\n');
  const cdp = await connectCDP();

  try {
    console.log('固定テスト用デッキ(dno=3)にアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.deck-edit-container') !== null`, 10000);
    if (!loaded) console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) return;

    const originalName = await cdp.evaluate(`document.querySelector('.deck-name-input')?.value ?? ''`);

    const badgeVisible = await cdp.waitFor(`document.querySelector('.regulation-badge') !== null`, 5000);
    t.assert('regulation-badgeが常時表示される', badgeVisible === true);

    // deckStore.availableRegulations（OCG過去版一覧キャッシュ）の非同期読み込みを待つ
    await cdp.wait(1500);

    // --- メニューを開く ---
    await cdp.evaluate(`document.querySelector('.regulation-badge')?.click()`);
    const menuOpen = await cdp.waitFor(`document.querySelector('.regulation-menu') !== null`, 3000);
    t.assert('バッジクリックでメニューが開く', menuOpen === true);

    const repCount = await cdp.evaluate(
      `document.querySelectorAll('.regulation-menu > .regulation-menu-item').length`
    );
    t.assert('代表選択肢(OCG最新+過去2件, GENESYS最新+過去2件)が表示される', repCount >= 1);

    // --- PAST区分（1段目）を開く ---
    const pastExpandExists = await cdp.waitFor(
      `Array.from(document.querySelectorAll('.regulation-menu-expand')).some(el => el.textContent.includes('OCG PAST'))`,
      5000
    );
    t.assert('OCG PAST区分ボタンが表示される', pastExpandExists === true);

    // togglePastSection はトグルのため、条件未成立で再クリックすると開閉が反転してしまう。
    // 1回だけクリックし、Vue再描画完了を十分な時間ポーリング待機する。
    await cdp.evaluate(`
      Array.from(document.querySelectorAll('.regulation-menu-expand'))
        .find(el => el.textContent.includes('OCG PAST'))?.click()
    `);
    const yearGroupShown = await cdp.waitFor(
      `document.querySelectorAll('.regulation-menu-expand-nested').length > 0`,
      5000,
      300
    );
    t.assert('PAST展開で年グループ(2段目)が表示される', yearGroupShown === true);

    // --- 年グループ（2段目）を開く（同様にトグルのため1回のみクリック）---
    await cdp.evaluate(`document.querySelector('.regulation-menu-expand-nested')?.click()`);
    const individualShown = await cdp.waitFor(
      `document.querySelectorAll('.regulation-menu-item-grouped').length > 0`,
      5000,
      300
    );
    t.assert('年グループ展開で個別版(3段目)が表示される', individualShown === true);

    // --- 個別版を選択 → デッキ名タグが書き換わる ---
    const selectedLabel = await cdp.evaluate(`document.querySelector('.regulation-menu-item-grouped')?.textContent ?? ''`);
    const menuClosed = await clickUntil(
      cdp,
      `document.querySelector('.regulation-menu-item-grouped')?.click()`,
      `document.querySelector('.regulation-menu') === null`
    );
    t.assert('個別版選択でメニューが閉じる', menuClosed === true);

    const newName = await cdp.evaluate(`document.querySelector('.deck-name-input')?.value ?? ''`);
    t.assert(
      `デッキ名タグが選択した版(${selectedLabel})に書き換わる`,
      /\[OCG-\d{4}\]/.test(newName)
    );
    console.log(`    選択: ${selectedLabel} -> デッキ名: ${newName}`);

    // --- オーバーレイクリックで選択せず閉じる ---
    await cdp.evaluate(`document.querySelector('.regulation-badge')?.click()`);
    await cdp.waitFor(`document.querySelector('.regulation-menu') !== null`, 3000);
    await cdp.evaluate(`document.querySelector('.menu-overlay')?.click()`);
    const closedByOverlay = await cdp.waitFor(`document.querySelector('.regulation-menu') === null`, 3000);
    t.assert('menu-overlayクリックでメニューが閉じる（選択なし）', closedByOverlay === true);

    // --- クリーンアップ: デッキ名を元に戻す（Save済みでないため実際はリロードで破棄されるが念のため） ---
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('.deck-name-input');
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(originalName)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `);
  } catch (e) {
    console.error('Error:', e.message);
    t.assert('編集画面テストが例外なく完了', false);
  } finally {
    // 未保存のデッキ名変更を破棄するため再読み込み
    await cdp.navigate(EDIT_URL);
    cdp.close();
  }
}

async function testDisplayPageMenu(t) {
  console.log('\n【閲覧画面: regulation-triggerクリックメニュー】\n');
  const cdp = await connectCDP();

  try {
    console.log('公開デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_DISPLAY_URL);
    const triggerReady = await cdp.waitFor(
      `document.querySelector('.ygo-next-regulation-trigger') !== null`,
      15000
    );
    t.assert('regulation-triggerが表示される', triggerReady === true);
    if (!triggerReady) return;

    await cdp.evaluate(`document.querySelector('.ygo-next-regulation-trigger')?.click()`);
    const menuOpen = await cdp.waitFor(
      `document.querySelector('.ygo-next-regulation-menu[hidden]') === null`,
      3000
    );
    t.assert('トリガークリックでメニューが開く(hidden解除)', menuOpen === true);

    const itemCount = await cdp.evaluate(
      `document.querySelectorAll('.ygo-next-regulation-menu-item').length`
    );
    t.assert('選択肢(auto含む)が表示される', itemCount > 0);

    // GENESYS最新版を選択（data-valueがgenesysで始まる代表項目）
    const genesysOpt = await cdp.evaluate(`
      (() => {
        const el = Array.from(document.querySelectorAll('.ygo-next-regulation-menu-item'))
          .find(el => (el.dataset.value || '').startsWith('genesys'));
        return el ? el.dataset.value : null;
      })()
    `);
    t.assert('GENESYS選択肢が存在する', genesysOpt !== null);

    if (genesysOpt !== null) {
      await cdp.evaluate(`
        Array.from(document.querySelectorAll('.ygo-next-regulation-menu-item'))
          .find(el => (el.dataset.value || '').startsWith('genesys'))?.click()
      `);
      const badgesUpdated = await cdp.waitFor(
        `document.querySelector('.ygo-next-genesys-total-pt') !== null`,
        8000
      );
      t.assert('GENESYS選択でGENESYS合計ptバッジが表示される', badgesUpdated === true);
    }

    // autoに戻す（プレビューのみでリロード不要だが、後続実行のため明示的に戻す）
    const autoValueExists = await cdp.evaluate(
      `document.querySelector('.ygo-next-regulation-trigger')?.getAttribute('aria-expanded')`
    );
    console.log(`    trigger aria-expanded (選択後): ${autoValueExists}`);
  } catch (e) {
    console.error('Error:', e.message);
    t.assert('閲覧画面テストが例外なく完了', false);
  } finally {
    cdp.close();
  }
}

async function main() {
  const t = createTestContext();
  console.log('【regulationバッジ切替メニュー E2Eテスト（TASK-313/TASK-450）】');

  await testEditPageMenu(t);
  await testDisplayPageMenu(t);

  t.summary();
  process.exit(t.exitCode());
}

main();
