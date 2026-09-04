/**
 * グローバルキーボードショートカットのE2Eテスト（TASK-459）
 *
 * DeckEditLayout.vue の handleGlobalKeydown（window keydownリスナー）を実キーイベント
 * （CDP Input.dispatchKeyEvent）で検証する。サーバーへの書き込みは一切行わない。
 *
 * 検証項目:
 *   1. Ctrl+Z で undo（シャッフルが取り消され元の順序に戻る）
 *   2. Ctrl+Y で redo（シャッフルが再適用される）
 *   3. 入力欄（デッキ名input）フォーカス中は Ctrl+Z が無視される
 *      （フォーカス解除後に同じキーで undo できることを確認して仕様どおりであることを裏取り）
 *   4. 「/」キーでグローバル検索モードが有効化される（オーバーレイ+検索欄+自動フォーカス）
 *   5. Escape でグローバル検索モードが閉じる
 *   6. Ctrl+J でもグローバル検索モードが有効化される
 *   7. グローバル検索モード中は Ctrl+Z が無視される（モード解除後に undo できることを裏取り）
 *   8. 入力欄フォーカス中は「/」でもグローバル検索モードにならない
 *
 * デッキ操作はシャッフルのみ（displayOrder の並び替え）。シャッフルは captureDeckSnapshot
 * の比較対象（name/mainDeck/extraDeck/...）に含まれないため未保存変更は発生せず、
 * 保存ボタンは一切押さない（ページ再読み込みで全て破棄される）。
 *
 * 実装参照:
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (handleGlobalKeydown: isGlobalSearchMode/入力フォーカスなら無視,
 *      matchesAnyShortcut → globalSearch/undo/redo, window keydown登録)
 *   configs/ux.toml (keyboardShortcuts デフォルト: globalSearch=/ or Ctrl+J, undo=Ctrl+Z, redo=Ctrl+Y)
 *   src/components/RightArea.vue
 *     (.global-search-overlay, .search-input-bottom.global-search-mode,
 *      watch(isGlobalSearchMode)→focus(), closeGlobalSearch, @escape)
 *   src/components/DeckSection.vue (.deck-section.main-deck .btn-section[title="Shuffle"] → shuffleSection)
 *   src/components/DeckCard.vue (.deck-card[data-uuid])
 *   src/stores/deck-edit.ts (shuffleSection: undo対応コマンドをpush、displayOrderのみ変更)
 *   src/components/DeckEditTopBar.vue (.deck-name-input)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// CDP Input.dispatchKeyEvent の修飾キービットマスク
// (https://chromedevtools.github.io/devtools-protocol/tot/Input/#type-KeyModifiers)
const MODIFIERS = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

/** メインデッキ（デスクトップ側 .main-content 配下）のカードuuid順序をDOMから取得 */
const ORDER_EXPR = `(() => {
  const section = document.querySelector('.main-content .deck-section.main-deck');
  if (!section) return null;
  return Array.from(section.querySelectorAll('.card-grid .deck-card')).map(el => el.dataset.uuid);
})()`;

/**
 * 実キーイベントを送出（keyDown + keyUp）
 * @param {object} k - { key, code, keyCode, ctrl, shift, alt }
 */
async function press(cdp, k) {
  const modifiers =
    (k.ctrl ? MODIFIERS.ctrl : 0) |
    (k.shift ? MODIFIERS.shift : 0) |
    (k.alt ? MODIFIERS.alt : 0);
  const base = {
    modifiers,
    key: k.key,
    code: k.code,
    windowsVirtualKeyCode: k.keyCode,
    nativeVirtualKeyCode: k.keyCode,
  };
  await cdp.sendCommand('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
  await cdp.wait(80);
  await cdp.sendCommand('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await cdp.wait(250);
}

const ctrlZ = (cdp) => press(cdp, { key: 'z', code: 'KeyZ', keyCode: 90, ctrl: true });
const ctrlY = (cdp) => press(cdp, { key: 'y', code: 'KeyY', keyCode: 89, ctrl: true });
const ctrlJ = (cdp) => press(cdp, { key: 'j', code: 'KeyJ', keyCode: 74, ctrl: true });
const slash = (cdp) => press(cdp, { key: '/', code: 'Slash', keyCode: 191 });
const escape = (cdp) => press(cdp, { key: 'Escape', code: 'Escape', keyCode: 27 });

async function getOrder(cdp) {
  return cdp.evaluate(ORDER_EXPR);
}

/** 順序が期待値と一致するまでポーリング（undo/redo後のVue再描画待ち） */
async function waitForOrder(cdp, expected, timeout = 5000, interval = 150) {
  const target = JSON.stringify(expected);
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(ORDER_EXPR);
    if (JSON.stringify(last) === target) return true;
    await cdp.wait(interval);
  }
  return false;
}

/** シャッフルボタンをクリックし、順序が変わるまでリトライ（同一順序になる可能性はほぼ無いが保険） */
async function shuffleUntilChanged(cdp, before) {
  const beforeStr = JSON.stringify(before);
  for (let i = 0; i < 5; i++) {
    await cdp.evaluate(
      `document.querySelector('.main-content .deck-section.main-deck .btn-section[title="Shuffle"]')?.click()`
    );
    await cdp.wait(300);
    const cur = await cdp.evaluate(ORDER_EXPR);
    if (JSON.stringify(cur) !== beforeStr) return cur;
  }
  return null;
}

/** フォーカス中の要素を blur して body に戻す（ショートカット有効条件を作る） */
async function blurActiveElement(cdp) {
  await cdp.evaluate(`document.activeElement && document.activeElement.blur()`);
  await cdp.wait(100);
}

async function focusDeckNameInput(cdp) {
  await cdp.evaluate(`document.querySelector('.deck-name-input')?.focus()`);
  await cdp.wait(100);
}

// --- グローバル検索モードのDOM状態 ---
const OVERLAY_EXPR = `document.querySelector('.global-search-overlay') !== null`;
const MODE_BAR_EXPR = `document.querySelector('.search-input-bottom.global-search-mode') !== null`;
const FOCUSED_IN_MODE_BAR_EXPR = `(() => {
  const el = document.activeElement;
  return !!el && el.tagName === 'INPUT' && !!el.closest('.search-input-bottom.global-search-mode');
})()`;
const INPUT_FOCUSED_EXPR = `(() => {
  const el = document.activeElement;
  return !!el && el.tagName === 'INPUT';
})()`;

async function testKeyboardShortcuts() {
  console.log('【グローバルキーボードショートカット E2Eテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('固定テスト用デッキ(dno=3)の編集ページにアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.deck-edit-container') !== null`, 10000);
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) {
      console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
      t.summary();
      return;
    }

    // メインデッキのカードが描画されるまで待機（ショートカット対象の操作に必要）
    const cardsReady = await cdp.waitFor(
      `document.querySelectorAll('.main-content .deck-section.main-deck .deck-card').length > 10`,
      15000
    );
    t.assert('メインデッキのカードが表示される', cardsReady === true);
    if (!cardsReady) {
      t.summary();
      return;
    }

    const originalOrder = await getOrder(cdp);
    console.log(`  メインデッキ枚数: ${originalOrder.length}`);

    // ============================================================
    console.log('\n--- 1. Ctrl+Z で undo（シャッフル取り消し） ---');
    // ============================================================
    const shuffled1 = await shuffleUntilChanged(cdp, originalOrder);
    t.assert('シャッフルでカード順序が変わる（undo対象の操作を作る）', shuffled1 !== null);
    if (!shuffled1) { t.summary(); return; }

    await blurActiveElement(cdp); // body フォーカスでショートカット有効条件を作る
    await ctrlZ(cdp);
    const undone = await waitForOrder(cdp, originalOrder);
    t.assert('Ctrl+Z で undo されシャッフル前の順序に戻る', undone === true);

    // ============================================================
    console.log('\n--- 2. Ctrl+Y で redo（シャッフル再適用） ---');
    // ============================================================
    await ctrlY(cdp);
    const redone = await waitForOrder(cdp, shuffled1);
    t.assert('Ctrl+Y で redo されシャッフル後の順序に戻る', redone === true);

    // 後続テストのために一旦 undo して元の順序に戻す
    await ctrlZ(cdp);
    const backToOriginal = await waitForOrder(cdp, originalOrder);
    t.assert('再度 Ctrl+Z で元の順序に戻る（履歴状態のリセット）', backToOriginal === true);

    // ============================================================
    console.log('\n--- 3. 入力欄フォーカス中は Ctrl+Z が無視される ---');
    // ============================================================
    const shuffled2 = await shuffleUntilChanged(cdp, originalOrder);
    t.assert('2回目のシャッフルで順序が変わる', shuffled2 !== null);
    if (!shuffled2) { t.summary(); return; }

    await focusDeckNameInput(cdp);
    const inputFocused = await cdp.evaluate(INPUT_FOCUSED_EXPR);
    t.assert('デッキ名入力欄(.deck-name-input)にフォーカスできる', inputFocused === true);

    await ctrlZ(cdp);
    await ctrlZ(cdp); // 2回押しても無視されることを確認
    await cdp.wait(300);
    const orderAfterIgnored = await getOrder(cdp);
    t.assert(
      '入力欄フォーカス中の Ctrl+Z では undo されない（順序はシャッフルのまま）',
      JSON.stringify(orderAfterIgnored) === JSON.stringify(shuffled2)
    );

    await blurActiveElement(cdp);
    await ctrlZ(cdp);
    const undoneAfterBlur = await waitForOrder(cdp, originalOrder);
    t.assert('フォーカス解除後の Ctrl+Z で undo される（無視はフォーカス起因と裏取り）', undoneAfterBlur === true);

    // ============================================================
    console.log('\n--- 4. 「/」キーでグローバル検索モード有効化 + Escape で終了 ---');
    // ============================================================
    await blurActiveElement(cdp);
    await slash(cdp);
    const overlayShown = await cdp.waitFor(OVERLAY_EXPR, 3000);
    t.assert('「/」キーで global-search-overlay が表示される', overlayShown === true);
    const modeBarShown = await cdp.evaluate(MODE_BAR_EXPR);
    t.assert('「/」キーで検索入力欄(.search-input-bottom.global-search-mode)が表示される', modeBarShown === true);
    const focusedInMode = await cdp.waitFor(FOCUSED_IN_MODE_BAR_EXPR, 3000);
    t.assert('グローバル検索モードの検索欄に自動フォーカスされる', focusedInMode === true);

    await escape(cdp);
    const overlayClosed = await cdp.waitFor(`!(${OVERLAY_EXPR})`, 3000);
    t.assert('Escape でグローバル検索モードが閉じる', overlayClosed === true);
    const modeBarClosed = await cdp.evaluate(`!(${MODE_BAR_EXPR})`);
    t.assert('閉じた後で検索入力欄が取り除かれる', modeBarClosed === true);

    // ============================================================
    console.log('\n--- 5. Ctrl+J でグローバル検索モード有効化 ---');
    // ============================================================
    await ctrlJ(cdp);
    const overlayByCtrlJ = await cdp.waitFor(OVERLAY_EXPR, 3000);
    t.assert('Ctrl+J で global-search-overlay が表示される', overlayByCtrlJ === true);
    const focusedByCtrlJ = await cdp.waitFor(FOCUSED_IN_MODE_BAR_EXPR, 3000);
    t.assert('Ctrl+J でも検索欄に自動フォーカスされる', focusedByCtrlJ === true);

    // ============================================================
    console.log('\n--- 6. グローバル検索モード中は Ctrl+Z が無視される ---');
    // ============================================================
    // 検索欄をblurして「入力フォーカス」条件を外し、isGlobalSearchMode 条件のみで無視されることを検証
    await blurActiveElement(cdp);
    const shuffled3 = await shuffleUntilChanged(cdp, originalOrder);
    t.assert('3回目のシャッフルで順序が変わる（モード中無視判定の対照操作）', shuffled3 !== null);
    if (!shuffled3) { t.summary(); return; }

    const stillOverlay = await cdp.evaluate(OVERLAY_EXPR);
    t.assert('シャッフル操作後もグローバル検索モードが継続している', stillOverlay === true);

    await ctrlZ(cdp);
    await cdp.wait(300);
    const orderIgnoredInMode = await getOrder(cdp);
    t.assert(
      'グローバル検索モード中の Ctrl+Z では undo されない（順序はシャッフルのまま）',
      JSON.stringify(orderIgnoredInMode) === JSON.stringify(shuffled3)
    );

    // オーバーレイクリックでモードを閉じる（RightArea closeGlobalSearch）
    await cdp.evaluate(`document.querySelector('.global-search-overlay')?.click()`);
    const modeClosedByOverlay = await cdp.waitFor(`!(${OVERLAY_EXPR})`, 3000);
    t.assert('オーバーレイクリックでグローバル検索モードが閉じる', modeClosedByOverlay === true);

    await ctrlZ(cdp);
    const undoneAfterModeClose = await waitForOrder(cdp, originalOrder);
    t.assert('モード解除後の Ctrl+Z で undo される（無視はモード起因と裏取り）', undoneAfterModeClose === true);

    // ============================================================
    console.log('\n--- 7. 入力欄フォーカス中は「/」でもグローバル検索モードにならない ---');
    // ============================================================
    await focusDeckNameInput(cdp);
    await slash(cdp);
    await cdp.wait(300);
    const noOverlayWhileFocused = await cdp.evaluate(`!(${OVERLAY_EXPR})`);
    t.assert('入力欄フォーカス中の「/」ではグローバル検索モードにならない', noOverlayWhileFocused === true);
    await blurActiveElement(cdp);

    // --- 後始末: 何も保存しておらず未保存変更も無い。念のためページを再読み込みして状態を破棄 ---
    console.log('\n--- クリーンアップ（メモリ状態の破棄のみ・保存は一切行わない） ---');
    await cdp.navigate(EDIT_URL);
    t.summary();
  } catch (e) {
    console.error('Error:', e);
    t.assert('例外なく完了', false);
    t.summary();
  } finally {
    cdp.close();
    process.exit(t.exitCode());
  }
}

testKeyboardShortcuts();
