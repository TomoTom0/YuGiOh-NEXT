/**
 * 操作履歴ダイアログ（CommandHistoryDialog）の E2Eテスト（TASK-458）
 *
 * メニュー「Operation History」から開くコマンド履歴ダイアログの実ブラウザ操作
 * （開閉・履歴項目の記録表示・履歴項目クリックによるデッキ復元（jumpToIndex）・
 * 履歴クリア）を検証する。サーバーへの書き込みは一切行わない（保存ボタンは
 * 押さず、最後にページ再読み込みでメモリ上のデッキ状態を破棄する）。
 *
 * 検証項目:
 *   1. メニュー → Operation History でダイアログが開く（ヘッダ「操作履歴」）
 *   2. ロード直後（履歴空）は「操作履歴がありません」表示・クリアボタン disabled・凡例4種
 *   3. close-btn / オーバーレイクリックでダイアログが閉じる
 *   4. カード追加×2 + main→side移動 の3操作が履歴に記録される
 *      （番号1..3・type-add/type-moveクラス・説明「追加: ... -> メイン」「移動: ... (メイン -> サイド)」・時刻表示）
 *   5. 最新項目に current クラス + 「現在」バッジ・それより前の項目は undone クラスなし
 *   6. 履歴項目クリック（過去位置へjump）でデッキがその時点の状態に復元される
 *      （jumpToIndex: 現在位置より前 = undo連続・1項目クリックは「そのコマンド実行後」の状態）
 *   7. 現在位置より後の項目クリックで進む（redo相当）・戻り（1つ過去へ）も検証
 *   8. 現在位置の項目クリックはno-op（デッキ不変）だがダイアログは閉じる
 *   9. 履歴クリアで履歴が空になり・undo/redoボタンが両方 disabled・トースト表示
 *  10. 未保存変更がある状態でも開ける（handleShowHistory は checkUnsavedChanges を通らない）
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     ([data-testid="menu-btn"] → toggleMenu, .menu-item "Operation History"
 *      → handleShowHistory（checkUnsavedChanges なし）→ showHistoryDialog = true,
 *      @jump-to="handleJumpToHistory" → deckStore.jumpToIndex(index) + ダイアログ閉鎖,
 *      @clear-history="handleClearHistory" → deckStore.clearHistory() + ダイアログ閉鎖
 *      + トースト「操作履歴をクリアしました」）
 *   src/components/CommandHistoryDialog.vue
 *     (BaseDialog(Teleport to body) 配下の .history-dialog。
 *      .history-dialog-header h2「操作履歴」/ .close-btn「x」/ .no-history「操作履歴がありません」/
 *      .history-list .history-item（.history-index=連番 / .history-description /
 *      .history-time=HH:MM:SS / .current-badge「現在」/ クラス current・undone・type-add等）/
 *      .history-dialog-footer .legend .legend-item×4 と .btn-clear「クリア」
 *      :disabled="history.length === 0"。項目クリック → emit('jump-to', index))
 *   src/composables/deck/useDeckUndoRedo.ts
 *     (jumpToIndex: 前へはundo・後ろへはredoを繰り返す。項目index i クリックは
 *      「コマンドi実行後」の状態へ移動（初期状態への復帰は不可・UI上はindex -1が存在しない）。
 *      clearHistory: 履歴配列を空にし commandIndex = -1（デッキ状態は不変）。
 *      canUndo = commandIndex >= 0, canRedo = commandIndex < history.length - 1)
 *   src/stores/deck-edit.ts
 *     (addToDisplayOrder: pushCommand(type:'add', description `追加: ${name} -> メイン`),
 *      moveCard 経由の main→side: pushCommand(type:'move', description
 *      `移動: ${name} (メイン -> サイド)`), loadDeck 時に clearHistory() → 初期状態は履歴空)
 *   src/components/DeckCard.vue
 *     (.card-btn.bottom-right（main）→ addCopyToSection(card,'main') = 追加,
 *      .card-btn.top-right（main）→ moveCardToSide = main→side 移動)
 *
 * 注意: TopBar は .main-content 内（デスクトップ側）と RightArea の deck-tab 内（モバイル側）
 * の2箇所に存在し、それぞれが CommandHistoryDialog を持つため、メニュー系セレクタは必ず
 * .main-content 配下にスコープする（.main-content 側のメニューから開いた場合、
 * Body直下に現れる .history-dialog は1つだけ）。ダイアログ自体は Teleport で body 直下。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// TopBar は .main-content（デスクトップ）と RightArea（モバイル）に2箇所あるためスコープ必須
const MENU_BTN = '.main-content [data-testid="menu-btn"]';
const MENU_DROPDOWN = '.main-content .menu-dropdown';
const MAIN_SECTION = '.main-content .deck-section.main-deck';
const UNDO_BTN = '.main-content [data-testid="undo-btn"]';
const REDO_BTN = '.main-content [data-testid="redo-btn"]';
// ダイアログは BaseDialog(Teleport to body) 配下
const OVERLAY = '.base-dialog-overlay';
const HISTORY_DIALOG = `${OVERLAY} .history-dialog`;

/** デッキ各セクションのカード枚数（DOM上の .deck-card 要素数 = 枚数） */
const DECK_COUNTS_EXPR = `(() => {
  const get = (sec) => {
    const s = document.querySelector('.main-content .deck-section.' + sec + '-deck');
    return s ? s.querySelectorAll('.card-grid .deck-card').length : -1;
  };
  const badge = document.querySelector('${MAIN_SECTION} h3 .count');
  return { main: get('main'), side: get('side'),
           badge: badge ? parseInt(badge.textContent, 10) : null };
})()`;

/** undo/redo ボタンの disabled 状態（TopBarが2箇所あるため .main-content 配下にスコープ） */
const BTN_STATE_EXPR = `(() => {
  const undo = document.querySelector('${UNDO_BTN}');
  const redo = document.querySelector('${REDO_BTN}');
  if (!undo || !redo) return null;
  return { undoDisabled: undo.disabled, redoDisabled: redo.disabled };
})()`;

/** 操作履歴ダイアログの全体状態（項目リスト・空状態・クリアボタン・凡例） */
const HISTORY_STATE_EXPR = `(() => {
  const dlg = document.querySelector('${HISTORY_DIALOG}');
  if (!dlg) return null;
  const items = [...dlg.querySelectorAll('.history-list .history-item')].map(li => {
    const idx = li.querySelector('.history-index');
    const desc = li.querySelector('.history-description');
    const time = li.querySelector('.history-time');
    const badge = li.querySelector('.current-badge');
    return {
      index: idx ? idx.textContent.trim() : null,
      description: desc ? desc.textContent.trim() : null,
      time: time ? time.textContent.trim() : null,
      current: li.classList.contains('current'),
      undone: li.classList.contains('undone'),
      badge: badge ? badge.textContent.trim() : null,
      typeAdd: li.classList.contains('type-add'),
      typeMove: li.classList.contains('type-move')
    };
  });
  const clear = dlg.querySelector('.btn-clear');
  const noHistory = dlg.querySelector('.no-history p');
  const header = dlg.querySelector('.history-dialog-header h2');
  const legend = [...dlg.querySelectorAll('.legend .legend-item')].map(el => el.textContent.trim());
  return {
    header: header ? header.textContent.trim() : null,
    items,
    noHistory: noHistory ? noHistory.textContent.trim() : null,
    clearDisabled: clear ? clear.disabled : null,
    clearText: clear ? clear.textContent.trim() : null,
    legend
  };
})()`;

/**
 * 追加候補カードの一覧を取得（main/extra/side 全体の出現枚数が少ない順）。
 * cardLimitMode デフォルト 'all-3' では合計3枚未満のカードが追加可能。
 */
const CANDIDATES_EXPR = `(() => {
  const counts = {};
  for (const sec of ['main', 'extra', 'side']) {
    const section = document.querySelector('.main-content .deck-section.' + sec + '-deck');
    if (!section) continue;
    section.querySelectorAll('.card-grid .deck-card').forEach(el => {
      const id = el.dataset.cardId;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
  }
  const main = document.querySelector('${MAIN_SECTION}');
  if (!main) return [];
  const seen = new Set();
  const out = [];
  main.querySelectorAll('.card-grid .deck-card').forEach(el => {
    const id = el.dataset.cardId;
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ uuid: el.dataset.uuid, cardId: id, total: counts[id] || 0 });
  });
  out.sort((a, b) => a.total - b.total);
  return out;
})()`;

/**
 * ハッシュURL（#/ytomo/edit?dno=3）への Page.navigate は同一ページ遷移になるため
 * Vueアプリのストア状態（コマンド履歴を含む）が残る。履歴空の初期状態を検証するには
 * 実リロードが必要なため Page.reload を併用する。
 */
async function hardNavigate(cdp, url) {
  await cdp.navigate(url);
  await cdp.wait(500);
  await cdp.sendCommand('Page.reload');
}

/** デッキ枚数が期待値になるまでポーリング（null を指定したセクションは検査しない） */
async function waitForCounts(cdp, expectedMain, expectedSide, timeout = 5000, interval = 150) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(DECK_COUNTS_EXPR);
    if (last) {
      const mainOk = expectedMain === null || last.main === expectedMain;
      const sideOk = expectedSide === null || last.side === expectedSide;
      if (mainOk && sideOk) return last;
    }
    await cdp.wait(interval);
  }
  return null;
}

/**
 * メニュー → Operation History から操作履歴ダイアログを開く。
 * handleShowHistory は checkUnsavedChanges を通らないため、デッキに未保存変更が
 * あっても未保存確認ダイアログ（ConfirmDialog）は出ない（はず・項目10で検証）。
 */
async function openHistoryDialog(cdp) {
  await cdp.evaluate(`document.querySelector('${MENU_BTN}')?.click()`);
  const menuOpen = await cdp.waitFor(`document.querySelector('${MENU_DROPDOWN}') !== null`, 5000);
  if (!menuOpen) return false;
  const clicked = await cdp.evaluate(`(() => {
    const item = [...document.querySelectorAll('${MENU_DROPDOWN} .menu-item')]
      .find(el => el.textContent.trim() === 'Operation History');
    if (item) item.click();
    return !!item;
  })()`);
  if (!clicked) return false;
  return cdp.waitFor(`document.querySelector('${HISTORY_DIALOG}') !== null`, 5000, 100);
}

/** ダイアログが閉じる（Transition 0.15s 含む）まで待機 */
function waitDialogClosed(cdp, timeout = 3000) {
  return cdp.waitFor(`document.querySelector('${OVERLAY}') === null`, timeout, 100);
}

/** 履歴項目（0始まりの位置指定）をクリック → emit('jump-to', index) */
function clickHistoryItem(cdp, n) {
  return cdp.evaluate(`(() => {
    const items = document.querySelectorAll('${HISTORY_DIALOG} .history-list .history-item');
    if (items.length <= ${n}) return false;
    items[${n}].click();
    return true;
  })()`);
}

/** 対象カードの右下 + ボタン（addCopyToSection → addCard）をクリック */
const clickPlus = (cdp, uuid) => cdp.evaluate(
  `document.querySelector('${MAIN_SECTION} .deck-card[data-uuid="${uuid}"] .card-btn.bottom-right')?.click()`
);

/** 対象カードの右上 S ボタン（main → moveCardToSide）をクリック */
const clickMoveToSide = (cdp, uuid) => cdp.evaluate(
  `document.querySelector('${MAIN_SECTION} .deck-card[data-uuid="${uuid}"] .card-btn.top-right')?.click()`
);

/**
 * 追加可能なカードを探して + ボタンで1枚追加する（枚数が +1 したら成功）。
 * 枚数制限（'all-3' で合計3枚）に引っかかると addCard が追加せず履歴にも乗らないため、
 * 候補を出現枚数の少ない順に試す。
 */
async function addOneCard(cdp, currentMain) {
  const candidates = await cdp.evaluate(CANDIDATES_EXPR);
  for (const cand of (candidates || []).slice(0, 8)) {
    await clickPlus(cdp, cand.uuid);
    const after = await waitForCounts(cdp, currentMain + 1, null, 2500);
    if (after) return { added: true, cardId: cand.cardId };
  }
  return { added: false };
}

/**
 * main カードを1枚 side へ移動する（side が +1 したら成功）。
 * moveCard は移動先が main/extra/side の場合に言語ごとのciidチェックを行うため、
 * 拒否された場合は次の候補を試す。
 */
async function moveOneToSide(cdp, currentSide) {
  const uuids = await cdp.evaluate(
    `[...document.querySelectorAll('${MAIN_SECTION} .card-grid .deck-card')].slice(0, 8).map(el => el.dataset.uuid)`
  );
  for (const uuid of (uuids || [])) {
    await clickMoveToSide(cdp, uuid);
    const after = await waitForCounts(cdp, null, currentSide + 1, 2500);
    if (after) return { moved: true, uuid };
  }
  return { moved: false };
}

async function testCommandHistory() {
  console.log('【操作履歴ダイアログ（CommandHistoryDialog）E2Eテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('固定テスト用デッキ(dno=3)の編集ページにアクセス中（ログイン済み前提）...');
    await hardNavigate(cdp, EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.deck-edit-container') !== null`, 10000);
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) {
      console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
      t.summary();
      return;
    }

    // メインデッキのカードが描画されるまで待機（ロード完了 = clearHistory 済み状態）
    const cardsReady = await cdp.waitFor(
      `document.querySelectorAll('${MAIN_SECTION} .card-grid .deck-card').length > 10`,
      15000
    );
    t.assert('メインデッキのカードが表示される', cardsReady === true);
    if (!cardsReady) { t.summary(); return; }

    const initial = await cdp.evaluate(DECK_COUNTS_EXPR);
    console.log(`  デッキ枚数: main=${initial.main} side=${initial.side}`);
    // 履歴操作後の期待値の組み合わせ（操作: 追加×2 → main→side移動×1）
    //   履歴[0]=追加後:  main=M+1, side=S
    //   履歴[1]=追加後:  main=M+2, side=S
    //   履歴[2]=移動後:  main=M+1, side=S+1

    // ============================================================
    console.log('\n--- 1. ロード直後（履歴空）のダイアログを開く ---');
    // ============================================================
    const opened = await openHistoryDialog(cdp);
    t.assert('メニューの Operation History でダイアログが開く', opened === true);
    if (!opened) { t.summary(); return; }

    const emptyState = await cdp.evaluate(HISTORY_STATE_EXPR);
    t.assert('ヘッダが「操作履歴」', emptyState.header === '操作履歴');
    t.assert(
      'body直下の .history-dialog は1つだけ（モバイル側TopBarのダイアログは未開）',
      (await cdp.evaluate(`document.querySelectorAll('${HISTORY_DIALOG}').length`)) === 1
    );
    t.assert('履歴なしの表示は「操作履歴がありません」', emptyState.noHistory === '操作履歴がありません');
    t.assert('履歴項目は0件', emptyState.items.length === 0);
    t.assert('クリアボタンの表示は「クリア」', emptyState.clearText === 'クリア');
    t.assert('履歴空ではクリアボタンが disabled', emptyState.clearDisabled === true);
    t.assert(
      '凡例が4種（追加/削除/移動/順序）',
      JSON.stringify(emptyState.legend) === JSON.stringify(['追加', '削除', '移動', '順序'])
    );

    // ============================================================
    console.log('\n--- 2. close-btn / オーバーレイクリックで閉じる ---');
    // ============================================================
    await cdp.evaluate(`document.querySelector('${HISTORY_DIALOG} .close-btn')?.click()`);
    const closedByBtn = await waitDialogClosed(cdp);
    t.assert('close-btn クリックでダイアログが閉じる', closedByBtn === true);

    const reopened = await openHistoryDialog(cdp);
    t.assert('ダイアログを再オープンできる', reopened === true);
    await cdp.evaluate(`document.querySelector('${OVERLAY}')?.click()`);
    const closedByOverlay = await waitDialogClosed(cdp);
    t.assert('オーバーレイクリックでダイアログが閉じる', closedByOverlay === true);

    // ============================================================
    console.log('\n--- 3. 操作の記録（カード追加×2 + main→side移動×1） ---');
    // ============================================================
    const add1 = await addOneCard(cdp, initial.main);
    t.assert('+ ボタンでカードが1枚追加される（1回目）', add1.added === true);
    const add2 = await addOneCard(cdp, initial.main + 1);
    t.assert('+ ボタンでカードが1枚追加される（2回目）', add2.added === true);
    if (!add1.added || !add2.added) {
      console.log('  ※ 追加可能なカードが見つかりません（枚数制限の可能性）');
      t.summary();
      return;
    }
    const moved = await moveOneToSide(cdp, initial.side);
    t.assert('main カードの S ボタンで side へ1枚移動される', moved.moved === true);
    if (!moved.moved) { t.summary(); return; }

    const afterOps = await waitForCounts(cdp, initial.main + 1, initial.side + 1);
    t.assert('3操作後の枚数は main=+1 / side=+1', afterOps !== null);
    t.assert('3操作後の枚数バッジ(h3 .count)も +1', afterOps && afterOps.badge === initial.main + 1);

    // ============================================================
    console.log('\n--- 4. 履歴項目の表示内容（未保存変更ありで開く・確認ダイアログなし） ---');
    // ============================================================
    const openedDirty = await openHistoryDialog(cdp);
    t.assert('未保存変更がある状態でもそのままダイアログが開く', openedDirty === true);
    t.assert(
      '未保存確認ダイアログ（ConfirmDialog）は表示されない',
      (await cdp.evaluate(`document.querySelector('${OVERLAY} .dialog-title') === null`)) === true
    );

    const histState = await cdp.evaluate(HISTORY_STATE_EXPR);
    t.assert('履歴項目が3件表示される', histState.items.length === 3);
    if (histState.items.length === 3) {
      const [item0, item1, item2] = histState.items;
      t.assert('項目の連番は 1, 2, 3',
        item0.index === '1' && item1.index === '2' && item2.index === '3');
      t.assert('項目1は type-add（追加）', item0.typeAdd === true);
      t.assert('項目2は type-add（追加）', item1.typeAdd === true);
      t.assert('項目3は type-move（移動）', item2.typeMove === true);
      t.assert('追加の説明は「追加: ... -> メイン」形式',
        item0.description.startsWith('追加: ') && item0.description.includes('-> メイン'));
      t.assert('移動の説明は「移動: ... (メイン -> サイド)」形式',
        item2.description.startsWith('移動: ') && item2.description.includes('(メイン -> サイド)'));
      t.assert('全項目に時刻（HH:MM:SS）が表示される',
        [item0, item1, item2].every(it => /^\d{2}:\d{2}:\d{2}$/.test(it.time || '')));
      t.assert('最新項目（3）に current クラスと「現在」バッジ',
        item2.current === true && item2.badge === '現在');
      t.assert('最新位置では undone 項目はなし',
        histState.items.every(it => !it.undone));
      t.assert('過去項目（1, 2）には current クラスなし',
        !item0.current && !item1.current);
    }
    t.assert('履歴ありではクリアボタンが有効', histState.clearDisabled === false);
    t.assert('履歴ありでは「操作履歴がありません」は非表示', histState.noHistory === null);

    // ============================================================
    console.log('\n--- 5. 過去位置へのジャンプ（undo相当・項目1クリック） ---');
    // ============================================================
    t.assert('履歴項目1をクリックできる', (await clickHistoryItem(cdp, 0)) === true);
    t.assert('ジャンプでダイアログが閉じる', (await waitDialogClosed(cdp)) === true);
    // 項目1 = 「1つ目の追加の実行後」→ main=M+1 / side=S（移動は取り消され、2つ目の追加も未実行）
    const at0 = await waitForCounts(cdp, initial.main + 1, initial.side);
    t.assert(`項目1クリックで main=${initial.main + 1} / side=${initial.side} に復元される`, at0 !== null);

    const stateAt0 = await cdp.evaluate(BTN_STATE_EXPR);
    t.assert('過去位置では undo ボタンが有効', stateAt0 && stateAt0.undoDisabled === false);
    t.assert('過去位置では redo ボタンが有効', stateAt0 && stateAt0.redoDisabled === false);

    // 再オープンして current / undone の表示を検証
    const reopenedAt0 = await openHistoryDialog(cdp);
    t.assert('ジャンプ後にダイアログを再オープンできる', reopenedAt0 === true);
    const state0 = await cdp.evaluate(HISTORY_STATE_EXPR);
    if (state0.items.length === 3) {
      t.assert('項目1に current クラスと「現在」バッジ',
        state0.items[0].current === true && state0.items[0].badge === '現在');
      t.assert('項目2, 3 は undone クラス（現在位置より後）',
        state0.items[1].undone === true && state0.items[2].undone === true);
      t.assert('項目2, 3 には「現在」バッジなし',
        state0.items[1].badge === null && state0.items[2].badge === null);
    } else {
      t.assert('再オープン後も履歴項目は3件', false);
    }

    // ============================================================
    console.log('\n--- 6. 現在位置の項目クリックはno-op ---');
    // ============================================================
    t.assert('現在位置の項目1をクリックできる', (await clickHistoryItem(cdp, 0)) === true);
    t.assert('現在位置クリックでもダイアログは閉じる', (await waitDialogClosed(cdp)) === true);
    await cdp.wait(300);
    const noOpCounts = await cdp.evaluate(DECK_COUNTS_EXPR);
    t.assert('現在位置クリックでデッキ枚数は変化しない',
      noOpCounts.main === initial.main + 1 && noOpCounts.side === initial.side);

    // ============================================================
    console.log('\n--- 7. 未来位置へのジャンプ（redo相当・項目3クリック） ---');
    // ============================================================
    const reopenedForRedo = await openHistoryDialog(cdp);
    t.assert('redo検証用にダイアログを開く', reopenedForRedo === true);
    t.assert('履歴項目3をクリックできる', (await clickHistoryItem(cdp, 2)) === true);
    t.assert('ジャンプでダイアログが閉じる', (await waitDialogClosed(cdp)) === true);
    // 項目3 = 全操作の実行後 → main=M+1 / side=S+1
    const at2 = await waitForCounts(cdp, initial.main + 1, initial.side + 1);
    t.assert(`項目3クリックで main=${initial.main + 1} / side=${initial.side + 1} に進む`, at2 !== null);

    const stateAt2 = await cdp.evaluate(BTN_STATE_EXPR);
    t.assert('最新位置では undo ボタンが有効', stateAt2 && stateAt2.undoDisabled === false);
    t.assert('最新位置では redo ボタンが disabled', stateAt2 && stateAt2.redoDisabled === true);

    // ============================================================
    console.log('\n--- 8. 1つ過去へのジャンプ（項目2クリック） ---');
    // ============================================================
    const reopenedFor1 = await openHistoryDialog(cdp);
    t.assert('検証用にダイアログを開く', reopenedFor1 === true);
    t.assert('履歴項目2をクリックできる', (await clickHistoryItem(cdp, 1)) === true);
    // 項目2 = 2つ目の追加の実行後 → main=M+2 / side=S
    const at1 = await waitForCounts(cdp, initial.main + 2, initial.side);
    t.assert(`項目2クリックで main=${initial.main + 2} / side=${initial.side} に戻る`, at1 !== null);

    // ============================================================
    console.log('\n--- 9. 履歴クリア ---');
    // ============================================================
    const reopenedForClear = await openHistoryDialog(cdp);
    t.assert('クリア検証用にダイアログを開く', reopenedForClear === true);
    await cdp.evaluate(`document.querySelector('${HISTORY_DIALOG} .btn-clear')?.click()`);
    t.assert('クリアでダイアログが閉じる', (await waitDialogClosed(cdp)) === true);

    const toastText = await cdp.waitFor(`(() => {
      const el = [...document.querySelectorAll('.toast-container .toast')]
        .find(t => t.textContent.includes('操作履歴をクリアしました'));
      return el ? el.textContent : '';
    })()`, 5000, 100);
    t.assert('クリア実行でトースト「操作履歴をクリアしました」が表示される',
      typeof toastText === 'string' && toastText.length > 0);

    const stateAfterClear = await cdp.evaluate(BTN_STATE_EXPR);
    t.assert('クリア後は undo ボタンが disabled', stateAfterClear && stateAfterClear.undoDisabled === true);
    t.assert('クリア後は redo ボタンが disabled', stateAfterClear && stateAfterClear.redoDisabled === true);

    const countsAfterClear = await cdp.evaluate(DECK_COUNTS_EXPR);
    t.assert('クリアでデッキ枚数は変化しない',
      countsAfterClear.main === initial.main + 2 && countsAfterClear.side === initial.side);

    const reopenedCleared = await openHistoryDialog(cdp);
    t.assert('クリア後にダイアログを開ける', reopenedCleared === true);
    const clearedState = await cdp.evaluate(HISTORY_STATE_EXPR);
    t.assert('クリア後は履歴なし表示に戻る', clearedState.noHistory === '操作履歴がありません');
    t.assert('クリア後は履歴項目が0件', clearedState.items.length === 0);
    t.assert('クリア後はクリアボタンが disabled', clearedState.clearDisabled === true);
    await cdp.evaluate(`document.querySelector('${HISTORY_DIALOG} .close-btn')?.click()`);
    await waitDialogClosed(cdp);

    // --- 後始末: 保存は一切行っていない。実リロードでメモリ上のデッキ状態を破棄 ---
    console.log('\n--- クリーンアップ（メモリ状態の破棄のみ・保存は一切行わない） ---');
    await hardNavigate(cdp, EDIT_URL);
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

testCommandHistory();
