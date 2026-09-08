/**
 * 編集画面 Undo/Redo ボタン操作の E2Eテスト（TASK-452）
 *
 * DeckEditTopBar.vue の undo/redo ボタン（data-testid="undo-btn" / "redo-btn"）の
 * 実ボタンクリック・disabled状態・履歴復元（カード追加の取り消し/やり直し）を検証する。
 * サーバーへの書き込みは一切行わない（保存ボタンは押さず、最後にページ再読み込みで
 * メモリ上のデッキ状態を破棄する）。
 *
 * 検証項目:
 *   1. デッキロード直後（履歴空）は undo/redo ボタンが両方 disabled
 *   2. disabled 状態の undo ボタンをクリックしても何も起きない（native no-op）
 *   3. カード追加（メインデッキカードの右下 + ボタン → addCopyToSection(card,'main')）で
 *      メインデッキ枚数が +1 され、undo ボタンが有効化・redo ボタンは disabled のまま
 *   4. undo ボタンで追加が取り消され枚数が元に戻る（undo disabled / redo 有効化）
 *   5. redo ボタンで追加が再適用され枚数が再度 +1 される（undo 有効 / redo disabled）
 *   6. もう一度 undo して履歴を枯渇させると undo ボタンが disabled に戻る（redo は有効）
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     (data-testid="undo-btn"/"redo-btn", :disabled="!canUndo|!canRedo",
 *      @click="handleUndo|handleRedo" → deckStore.undo()/redo())
 *   src/composables/deck/useDeckUndoRedo.ts
 *     (pushCommand された操作のみが対象。canUndo = commandIndex >= 0,
 *      canRedo = commandIndex < history.length - 1)
 *   src/composables/deck/useDeckPersistence.ts (loadDeck 時に clearHistory() → 初期状態は履歴空)
 *   src/components/DeckCard.vue (.card-btn.bottom-right → handleBottomRight →
 *     mainセクションでは addCopyToSection(card,'main') = addCard → addToDisplayOrder →
 *     pushCommand(type:'add'))
 *   src/stores/deck-edit.ts (addCard: 枚数制限チェック。cardLimitMode デフォルト 'all-3' の
 *     ため合計3枚未満のカードのみ追加成功 → 候補は出現枚数の少ない順に試す)
 *   src/components/DeckSection.vue (.deck-section.main-deck .card-grid .deck-card, h3 .count)
 *
 * 注意: TopBar は .main-content 内（デスクトップ側）と RightArea の deck-tab 内（モバイル側）
 * の2箇所に存在するため、セレクタは必ず .main-content 配下にスコープする。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

const MAIN_SECTION = '.main-content .deck-section.main-deck';
const UNDO_BTN = '.main-content [data-testid="undo-btn"]';
const REDO_BTN = '.main-content [data-testid="redo-btn"]';

/** undo/redo ボタンの disabled 状態（TopBarが2箇所あるため .main-content 配下にスコープ） */
const BTN_STATE_EXPR = `(() => {
  const undo = document.querySelector('${UNDO_BTN}');
  const redo = document.querySelector('${REDO_BTN}');
  if (!undo || !redo) return null;
  return { undoDisabled: undo.disabled, redoDisabled: redo.disabled };
})()`;

/** メインデッキのカード枚数 + 見出しの枚数バッジ（h3 .count = displayCards.length） */
const MAIN_COUNT_EXPR = `(() => {
  const section = document.querySelector('${MAIN_SECTION}');
  if (!section) return null;
  const cards = section.querySelectorAll('.card-grid .deck-card').length;
  const badge = section.querySelector('h3 .count');
  return { cards, badge: badge ? parseInt(badge.textContent, 10) : null };
})()`;

/**
 * 追加候補カードの一覧を取得（main/extra/side 全体の出現枚数が少ない順）。
 * cardLimitMode デフォルト 'all-3' では合計3枚未満のカードが追加可能。
 * 同じ cardId のカードは1候補として返す（uuid は最初の1枚）。
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

/** 指定 cardId のメインデッキ内の出現枚数 */
const cardCountExpr = (cardId) => `(() => {
  const section = document.querySelector('${MAIN_SECTION}');
  if (!section) return -1;
  return section.querySelectorAll('.card-grid .deck-card[data-card-id="${cardId}"]').length;
})()`;

/** メインデッキ枚数が期待値になるまでポーリング（Vue再描画待ち） */
async function waitForMainCount(cdp, expected, timeout = 5000, interval = 150) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(MAIN_COUNT_EXPR);
    if (last && last.cards === expected) return last;
    await cdp.wait(interval);
  }
  return null;
}

/** ボタンdisabled状態が期待値になるまでポーリング */
async function waitForBtnState(cdp, expected, timeout = 5000, interval = 150) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(BTN_STATE_EXPR);
    if (last &&
        last.undoDisabled === expected.undoDisabled &&
        last.redoDisabled === expected.redoDisabled) return last;
    await cdp.wait(interval);
  }
  return null;
}

const clickUndo = (cdp) => cdp.evaluate(`document.querySelector('${UNDO_BTN}').click()`);
const clickRedo = (cdp) => cdp.evaluate(`document.querySelector('${REDO_BTN}').click()`);
/** 対象カードの右下 + ボタン（addCopyToSection → addCard）をクリック */
const clickPlus = (cdp, uuid) => cdp.evaluate(
  `document.querySelector('${MAIN_SECTION} .deck-card[data-uuid="${uuid}"] .card-btn.bottom-right')?.click()`
);

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

/**
 * 追加可能なカードを探して + ボタンで1枚追加する（枚数が +1 したら成功）。
 * 枚数制限（'all-3' で合計3枚 / 'limit-reg' では禁止・制限カード）に引っかかると
 * addCard が追加せず履歴にも乗らないため、候補を順に試す。
 * @param {number} initialCount - 追加前のメインデッキ枚数
 */
async function addOneCard(cdp, initialCount) {
  const candidates = await cdp.evaluate(CANDIDATES_EXPR);
  for (const cand of (candidates || []).slice(0, 8)) {
    await clickPlus(cdp, cand.uuid);
    const after = await waitForMainCount(cdp, initialCount + 1, 2500);
    if (after) return { added: true, cardId: cand.cardId, cand };
  }
  return { added: false };
}

async function testUndoRedoButtons() {
  console.log('【編集画面 Undo/Redo ボタン E2Eテスト】\n');
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

    const initial = await cdp.evaluate(MAIN_COUNT_EXPR);
    console.log(`  メインデッキ枚数: ${initial.cards}`);

    // ============================================================
    console.log('\n--- 1. ロード直後（履歴空）は両ボタン disabled ---');
    // ============================================================
    const initialState = await cdp.evaluate(BTN_STATE_EXPR);
    t.assert('undo ボタンが存在する', initialState !== null);
    t.assert(
      '初期状態で undo ボタンが disabled（loadDeck 時に clearHistory）',
      initialState && initialState.undoDisabled === true
    );
    t.assert(
      '初期状態で redo ボタンが disabled',
      initialState && initialState.redoDisabled === true
    );

    // ============================================================
    console.log('\n--- 2. disabled の undo ボタンをクリックしても何も起きない ---');
    // ============================================================
    await clickUndo(cdp);
    await cdp.wait(400);
    const afterDisabledClick = await cdp.evaluate(MAIN_COUNT_EXPR);
    const stateAfterDisabledClick = await cdp.evaluate(BTN_STATE_EXPR);
    t.assert(
      'disabled の undo クリックで枚数は変化しない',
      afterDisabledClick.cards === initial.cards
    );
    t.assert(
      'disabled の undo クリックでボタン状態も変化しない',
      stateAfterDisabledClick.undoDisabled === true && stateAfterDisabledClick.redoDisabled === true
    );

    // ============================================================
    console.log('\n--- 3. カード追加（+ボタン）で undo ボタンが有効化 ---');
    // ============================================================
    const addResult = await addOneCard(cdp, initial.cards);
    t.assert(
      'メインデッキカードの + ボタンでカードが1枚追加される',
      addResult.added === true
    );
    if (!addResult.added) {
      console.log('  ※ 追加可能なカードが見つかりません（枚数制限の可能性）');
      t.summary();
      return;
    }
    console.log(`  追加対象カード: cardId=${addResult.cardId}（追加前の全体出現枚数: ${addResult.cand.total}）`);

    const addedState = await waitForBtnState(cdp, { undoDisabled: false, redoDisabled: true });
    t.assert('カード追加後に undo ボタンが有効化される', addedState !== null);
    t.assert('カード追加直後は redo ボタンが disabled のまま', addedState && addedState.redoDisabled === true);

    const added = await cdp.evaluate(MAIN_COUNT_EXPR);
    t.assert('追加後のメインデッキ枚数が +1 になる', added.cards === initial.cards + 1);
    t.assert('見出しの枚数バッジ(h3 .count)も +1 に更新される', added.badge === initial.cards + 1);
    const perCardAfterAdd = await cdp.evaluate(cardCountExpr(addResult.cardId));
    t.assert('追加対象カードの枚数が +1 になる', perCardAfterAdd === addResult.cand.total + 1);

    // ============================================================
    console.log('\n--- 4. undo ボタンで追加が取り消される ---');
    // ============================================================
    await clickUndo(cdp);
    const undone = await waitForMainCount(cdp, initial.cards);
    t.assert('undo ボタンでメインデッキ枚数が元に戻る', undone !== null);
    const undoneState = await waitForBtnState(cdp, { undoDisabled: true, redoDisabled: false });
    t.assert('undo 後は undo ボタンが disabled に戻る（履歴枯渇）', undoneState !== null);
    t.assert('undo 後は redo ボタンが有効化される', undoneState && undoneState.redoDisabled === false);
    const perCardAfterUndo = await cdp.evaluate(cardCountExpr(addResult.cardId));
    t.assert('undo で追加対象カードの枚数も元に戻る', perCardAfterUndo === addResult.cand.total);
    t.assert('undo 後の枚数バッジも元に戻る', undone && undone.badge === initial.cards);

    // ============================================================
    console.log('\n--- 5. redo ボタンで追加が再適用される ---');
    // ============================================================
    await clickRedo(cdp);
    const redone = await waitForMainCount(cdp, initial.cards + 1);
    t.assert('redo ボタンでメインデッキ枚数が再度 +1 になる', redone !== null);
    const redoneState = await waitForBtnState(cdp, { undoDisabled: false, redoDisabled: true });
    t.assert('redo 後は undo ボタンが有効化される', redoneState !== null);
    t.assert('redo 後は redo ボタンが disabled に戻る', redoneState && redoneState.redoDisabled === true);
    const perCardAfterRedo = await cdp.evaluate(cardCountExpr(addResult.cardId));
    t.assert('redo で追加対象カードの枚数が再度 +1 になる', perCardAfterRedo === addResult.cand.total + 1);

    // ============================================================
    console.log('\n--- 6. 履歴枯渇でボタンが disabled に戻る ---');
    // ============================================================
    await clickUndo(cdp);
    const exhausted = await waitForMainCount(cdp, initial.cards);
    t.assert('もう一度 undo で追加が取り消される', exhausted !== null);
    const exhaustedState = await waitForBtnState(cdp, { undoDisabled: true, redoDisabled: false });
    t.assert('履歴枯渇で undo ボタンが disabled に戻る', exhaustedState !== null);
    t.assert('履歴枯渇後も redo ボタンは有効のまま', exhaustedState && exhaustedState.redoDisabled === false);

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

testUndoRedoButtons();
