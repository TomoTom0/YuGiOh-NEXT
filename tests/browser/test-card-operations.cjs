/**
 * カード4隅移動ボタン（DeckCard.vue）操作の E2Eテスト（TASK-455）
 *
 * デッキ編集画面のカード4隅ボタン（.card-controls 配下の .card-btn.top-left /
 * top-right / bottom-left / bottom-right）の実クリックでのセクション間移動・
 * 枚数バッジ更新・Undo（Ctrl+Z 実キーイベント）による復元を検証する。
 * サーバーへの書き込みは一切行わない（保存ボタンは押さず、最後にページ再読み込みで
 * メモリ上のデッキ状態を破棄する）。
 *
 * 検証項目:
 *   1. mainカードの4隅ボタン構造（top-left詳細 / top-right=S(card-btn-s) /
 *      bottom-left=trashアイコン / bottom-right=plusアイコン）。
 *      trashセクションは :show-count="false" で枚数バッジなし
 *   2. main→side 移動（top-right S）で main -1 / side +1・バッジ更新・
 *      移動したカード(uuid)がsideセクション末尾に表示される
 *   3. Ctrl+Z で main→side 移動が復元される（uuidがmainに戻る）
 *   4. side→main 移動（sideカードのtop-right M/E）で元の枚数に戻る
 *   5. main→trash 移動（bottom-left trashアイコン）で main -1 / trash +1・
 *      trashカードはtop-rightボタンなし・bottom-left=M/E(card-btn-me)・
 *      bottom-right=S(card-btn-side)
 *   6. trash→main 移動（trashカードのbottom-left M/E）で元の枚数に戻る
 *   7. trash→side 移動（trashカードのbottom-right S）→ sideカードのtop-right(M/E)
 *      でmainに復帰し全セクションが初期状態に戻る
 *   8. Ctrl+Z で main→trash 移動も復元される
 *   9. カードコピー（bottom-right +）で main +1・Ctrl+Z で取り消し（TASK-452の軽い再確認）
 *  10. top-left（詳細表示）クリックでCard詳細タブが表示され、Deckタブに戻せる
 *
 * 実装参照:
 *   src/components/DeckCard.vue
 *     (.card-controls: 4隅ボタン。hoverで opacity 1（常時DOM存在・クリック可）。
 *      handleTopRight: main/extra→moveCardToSide / side→moveCardFromSide。
 *      handleBottomLeft: main/extra/side→moveCardToTrash / trash→moveCardToMainOrExtra。
 *      handleBottomRight: main/extra/side→addCopyToSection(コピー) / trash→moveCardToSide。
 *      handleTopLeft: getCardDetailAndDisplay → activeTab='card'。
 *      topRightText: main/extra='S'(card-btn-s) / side='M/E'(card-btn-me) / trash=''
 *      （trashカードにtop-rightボタンは無い）。
 *      bottomLeft: main/extra/side=trashアイコン / trash='M/E'(card-btn-me)。
 *      bottomRight: main/extra/side=plusアイコン / trash='S'(card-btn-side))
 *   src/stores/deck-edit.ts
 *     (moveCardToSide/FromSide/ToTrash/ToMainOrExtra → moveCard → moveInDisplayOrder:
 *      uuidを保持したまま移動先セクション末尾にpush・type:'move'コマンドをpushCommand。
 *      addCopyToSection → addCard: cardLimitMode デフォルト 'all-3' のため
 *      合計3枚未満のカードのみ追加成功。trash への移動は枚数制限チェックなし)
 *   src/composables/deck/useDeckDisplayOrder.ts (moveInDisplayOrder: uuid保持)
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (trash DeckSection は :show-count="false"。main-content と RightArea deck-tab
 *      の2箇所にセクションが存在するためセレクタは必ず .main-content 配下にスコープ。
 *      onMounted は await fetchDeckList() の完了後に window keydown リスナー
 *      （handleGlobalKeydown）を登録する。カード描画〜リスナー登録の間はボタン操作は
 *      可能だがCtrl+Z等が無反応になるため、本テストはphase1前に'/'→Escapeで
 *      ショートカット有効化を待ってから検証する（TASK-461）)
 *   src/components/RightArea.vue
 *     (.card-detail-content は v-show="deckStore.activeTab === 'card'",
 *      .deck-tab ボタンで Deck タブに復帰)
 *   src/composables/useCardDetailDisplay.ts (showCardDetail → activeTab='card')
 *
 * 注意: Undo は Ctrl+Z の実キーイベント（CDP Input.dispatchKeyEvent）で送出する
 * （TASK-459と同じ方法。送出前にフォーカスを解除しておく）。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// TopBar/DeckSection がデスクトップ・モバイル2箇所に存在するため .main-content 配下にスコープ
const SCOPE = '.main-content';

/** 全セクションのカード枚数 + 見出しの枚数バッジ（h3 .count = displayCards.length。trashはnull） */
const COUNTS_EXPR = `(() => {
  const get = (sec) => {
    const s = document.querySelector('${SCOPE} .deck-section.' + sec + '-deck');
    if (!s) return null;
    const cards = s.querySelectorAll('.card-grid .deck-card').length;
    const badgeEl = s.querySelector('h3 .count');
    return { cards, badge: badgeEl ? parseInt(badgeEl.textContent, 10) : null };
  };
  return { main: get('main'), side: get('side'), extra: get('extra'), trash: get('trash') };
})()`;

/** main デッキのカード候補一覧（main/extra/side 全体の出現枚数が少ない順・cardIdで重複排除） */
const CANDIDATES_EXPR = `(() => {
  const counts = {};
  for (const sec of ['main', 'extra', 'side']) {
    const section = document.querySelector('${SCOPE} .deck-section.' + sec + '-deck');
    if (!section) continue;
    section.querySelectorAll('.card-grid .deck-card').forEach(el => {
      const id = el.dataset.cardId;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
  }
  const main = document.querySelector('${SCOPE} .deck-section.main-deck');
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

/** 指定uuidのカードが .main-content 内のどのセクションに存在するか */
const uuidLocExpr = (uuid) => `(() => {
  for (const sec of ['main', 'extra', 'side', 'trash']) {
    const s = document.querySelector('${SCOPE} .deck-section.' + sec + '-deck');
    if (s && s.querySelector('.deck-card[data-uuid="${uuid}"]')) return sec;
  }
  return null;
})()`;

/**
 * 指定セクションのカードの4隅ボタン構造（存在・クラス・ラベル・アイコンsvg）を取得。
 * アイコン判定は DeckCard.vue の SVG path d 属性の先頭部分で行う
 * （trash: 'M9,3V4H4' / plus: 'M19,13H13'）。
 */
const btnSpecExpr = (section, uuid) => `(() => {
  const card = document.querySelector('${SCOPE} .deck-section.${section}-deck .deck-card[data-uuid="${uuid}"]');
  if (!card) return null;
  const btn = (c) => card.querySelector('.card-btn.' + c);
  const svgPath = (c) => {
    const b = btn(c);
    if (!b) return null;
    const p = b.querySelector('svg path');
    return p ? p.getAttribute('d') : null;
  };
  return {
    topLeft: !!btn('top-left'),
    topRight: !!btn('top-right'),
    topRightClasses: btn('top-right') ? btn('top-right').className : null,
    topRightText: btn('top-right') ? (btn('top-right').textContent || '').trim() : null,
    bottomLeft: !!btn('bottom-left'),
    bottomLeftClasses: btn('bottom-left') ? btn('bottom-left').className : null,
    bottomLeftText: btn('bottom-left') ? (btn('bottom-left').textContent || '').trim() : null,
    bottomLeftHasTrashSvg: svgPath('bottom-left') ? svgPath('bottom-left').startsWith('M9,3V4H4') : false,
    bottomRight: !!btn('bottom-right'),
    bottomRightClasses: btn('bottom-right') ? btn('bottom-right').className : null,
    bottomRightText: btn('bottom-right') ? (btn('bottom-right').textContent || '').trim() : null,
    bottomRightHasPlusSvg: svgPath('bottom-right') ? svgPath('bottom-right').startsWith('M19,13H13') : false,
  };
})()`;

/** Card詳細タブ（activeTab==='card'）とDeckタブの表示状態（v-show → display） */
const TAB_STATE_EXPR = `(() => {
  const disp = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return getComputedStyle(el).display !== 'none';
  };
  return {
    cardDetail: disp('.right-area .card-detail-content'),
    deck: disp('.right-area .deck-content'),
  };
})()`;

/** 指定セクション内の指定uuidカードの4隅ボタンをクリック */
const clickBtn = (cdp, section, uuid, corner) => cdp.evaluate(
  `document.querySelector('${SCOPE} .deck-section.${section}-deck .deck-card[data-uuid="${uuid}"] .card-btn.${corner}')?.click()`
);

/**
 * ハッシュURL（#/ytomo/edit?dno=3）への Page.navigate は同一ページ遷移になるため
 * Vueアプリのストア状態（コマンド履歴・trash等を含む）が残る。初期状態を検証するには
 * 実リロードが必要なため Page.reload を併用する。
 */
async function hardNavigate(cdp, url) {
  await cdp.navigate(url);
  await cdp.wait(500);
  await cdp.sendCommand('Page.reload');
}

/** 全セクション枚数が期待値（{main,side,extra,trash} の .cards）に一致するまでポーリング */
async function waitCounts(cdp, expected, timeout = 5000, interval = 150) {
  const target = JSON.stringify({
    main: expected.main, side: expected.side, extra: expected.extra, trash: expected.trash,
  });
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(COUNTS_EXPR);
    if (last && JSON.stringify({
      main: last.main && last.main.cards,
      side: last.side && last.side.cards,
      extra: last.extra && last.extra.cards,
      trash: last.trash && last.trash.cards,
    }) === target) return last;
    await cdp.wait(interval);
  }
  return null;
}

/** 指定uuidのカードが期待セクションに現れるまでポーリング */
async function waitUuidLoc(cdp, uuid, expectedSec, timeout = 5000, interval = 150) {
  const expr = uuidLocExpr(uuid);
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(expr);
    if (last === expectedSec) return true;
    await cdp.wait(interval);
  }
  return false;
}

/**
 * main デッキのカードの指定コーナーボタンをクリックし、全セクション枚数が
 * 期待値になるまで候補を順に試す（枚数制限・言語ciid制約で移動が拒否される場合の保険）。
 * @returns 成功時 { uuid, cardId, total } / 失敗時 null
 */
async function moveFromMainUntil(cdp, corner, expected, maxTries = 6) {
  const candidates = await cdp.evaluate(CANDIDATES_EXPR);
  for (const cand of (candidates || []).slice(0, maxTries)) {
    await clickBtn(cdp, 'main', cand.uuid, corner);
    const ok = await waitCounts(cdp, expected, 2000);
    if (ok) return cand;
  }
  return null;
}

// CDP Input.dispatchKeyEvent の修飾キービットマスク
// (https://chromedevtools.github.io/devtools-protocol/tot/Input/#type-KeyModifiers)
const MODIFIERS = { ctrl: 2 };

/** 実キーイベントを送出（keyDown + keyUp） */
async function pressKey(cdp, key, code, keyCode, { ctrl = false } = {}) {
  const base = {
    modifiers: ctrl ? MODIFIERS.ctrl : 0,
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  };
  await cdp.sendCommand('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
  await cdp.wait(80);
  await cdp.sendCommand('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await cdp.wait(250);
}

/** Ctrl+Z の実キーイベントを送出 */
async function ctrlZ(cdp) {
  await cdp.evaluate(`document.activeElement && document.activeElement.blur()`);
  await cdp.wait(50);
  await pressKey(cdp, 'z', 'KeyZ', 90, { ctrl: true });
}

/**
 * グローバルキーボードショートカットが有効になるまで待機する（TASK-461）。
 *
 * DeckEditLayout.vue の onMounted は await fetchDeckList()（ネットワーク）の完了後に
 * window keydown リスナーを登録する。カード描画からリスナー登録までは約1秒の間が空き、
 * その間はボタン操作は可能だが Ctrl+Z 等のショートカットが無反応になる。
 * 本テストは Ctrl+Z で undo を検証するため、'/'（globalSearch有効化）→ Escape（解除）
 * でリスナー登録済みことを確認してから検証を開始する。
 * （'/'+Escape の状態復帰は test-keyboard-shortcuts.cjs で検証済みの挙動）
 */
async function waitForShortcutsReady(cdp, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await cdp.evaluate(`document.activeElement && document.activeElement.blur()`);
    await pressKey(cdp, '/', 'Slash', 191);
    const opened = await cdp.waitFor(`document.querySelector('.global-search-overlay') !== null`, 1000);
    if (opened) {
      await pressKey(cdp, 'Escape', 'Escape', 27);
      await cdp.waitFor(`document.querySelector('.global-search-overlay') === null`, 3000);
      return true;
    }
    await cdp.wait(300);
  }
  return false;
}

async function testCardOperations() {
  console.log('【カード4隅移動ボタン E2Eテスト】\n');
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

    const cardsReady = await cdp.waitFor(
      `document.querySelectorAll('${SCOPE} .deck-section.main-deck .card-grid .deck-card').length > 10`,
      15000
    );
    t.assert('メインデッキのカードが表示される', cardsReady === true);
    if (!cardsReady) { t.summary(); return; }

    // Ctrl+Z検証の前提: グローバルショートカットのリスナー登録済みであることを確認
    // （カード描画直後はリスナー未登録でCtrl+Zが無反応になる窓がある。TASK-461）
    t.assert(
      'グローバルキーボードショートカットが有効になる（Ctrl+Z検証の前提）',
      await waitForShortcutsReady(cdp) === true
    );

    const base = await cdp.evaluate(COUNTS_EXPR);
    const M = base.main.cards, S = base.side.cards, E = base.extra.cards, T = base.trash.cards;
    console.log(`  初期枚数: main=${M} extra=${E} side=${S} trash=${T}`);
    const baseline = { main: M, side: S, extra: E, trash: T };

    // ============================================================
    console.log('\n--- 1. 4隅ボタンの構造（mainカード・trashセクション仕様） ---');
    // ============================================================
    const cand1 = (await cdp.evaluate(CANDIDATES_EXPR) || [])[0];
    t.assert('mainカードの候補が取得できる', !!cand1);
    const specMain = cand1 ? await cdp.evaluate(btnSpecExpr('main', cand1.uuid)) : null;
    t.assert('mainカードに4隅ボタンが全て存在する', specMain &&
      specMain.topLeft === true && specMain.topRight === true &&
      specMain.bottomLeft === true && specMain.bottomRight === true);
    t.assert('mainカードのtop-rightはSide移動ボタン（card-btn-s・表示"S"）', specMain &&
      specMain.topRightClasses.includes('card-btn-s') && specMain.topRightText === 'S');
    t.assert('mainカードのbottom-leftはtrashアイコン（SVG）', specMain && specMain.bottomLeftHasTrashSvg === true);
    t.assert('mainカードのbottom-rightはplusアイコン（SVG）', specMain && specMain.bottomRightHasPlusSvg === true);
    t.assert('trashセクションは枚数バッジを表示しない（show-count=false）', base.trash.badge === null);
    t.assert('mainセクションの枚数バッジがカード数と一致する', base.main.badge === M);

    // ============================================================
    console.log('\n--- 2. main→side 移動（top-right S ボタン） ---');
    // ============================================================
    const cand2 = await moveFromMainUntil(cdp, 'top-right', { main: M - 1, side: S + 1, extra: E, trash: T });
    t.assert('top-right(S)クリックで main -1 / side +1 になる', !!cand2);
    if (!cand2) { t.summary(); return; }
    console.log(`  移動対象カード: cardId=${cand2.cardId}（全体出現枚数: ${cand2.total}）`);
    const st2 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('移動後の枚数バッジも更新される（main badge -1 / side badge +1）', st2 &&
      st2.main.badge === M - 1 && st2.side.badge === S + 1);
    t.assert('移動したカード(uuid)がsideセクションに表示される', await waitUuidLoc(cdp, cand2.uuid, 'side'));
    const specSide = await cdp.evaluate(btnSpecExpr('side', cand2.uuid));
    t.assert('side内カードのtop-rightはMain/Extra戻しボタン（card-btn-me・表示"M"）', specSide &&
      specSide.topRightClasses.includes('card-btn-me') && specSide.topRightText === 'M');

    // ============================================================
    console.log('\n--- 3. Ctrl+Z で main→side 移動が復元される ---');
    // ============================================================
    await ctrlZ(cdp);
    const st3 = await waitCounts(cdp, baseline);
    t.assert('Ctrl+Z で全セクション枚数が初期状態に戻る', !!st3);
    t.assert('Ctrl+Z で移動したカード(uuid)がmainセクションに戻る', await waitUuidLoc(cdp, cand2.uuid, 'main'));
    t.assert('undo後の枚数バッジも初期状態に戻る', st3 && st3.main.badge === M && st3.side.badge === S);

    // ============================================================
    console.log('\n--- 4. side→main 移動（sideカードのtop-right M/E ボタン） ---');
    // ============================================================
    const cand4 = await moveFromMainUntil(cdp, 'top-right', { main: M - 1, side: S + 1, extra: E, trash: T });
    t.assert('準備: top-right(S)で main→side 移動ができる', !!cand4);
    if (!cand4) { t.summary(); return; }
    await waitUuidLoc(cdp, cand4.uuid, 'side');
    await clickBtn(cdp, 'side', cand4.uuid, 'top-right');
    const st4 = await waitCounts(cdp, baseline);
    t.assert('sideカードのtop-right(M/E)で side→main に戻り全セクションが初期状態になる', !!st4);
    t.assert('戻したカード(uuid)がmainセクションに表示される', await waitUuidLoc(cdp, cand4.uuid, 'main'));

    // ============================================================
    console.log('\n--- 5. main→trash 移動（bottom-left trashアイコン） ---');
    // ============================================================
    const cand5 = await moveFromMainUntil(cdp, 'bottom-left', { main: M - 1, side: S, extra: E, trash: T + 1 });
    t.assert('bottom-left(trash)クリックで main -1 / trash +1 になる', !!cand5);
    if (!cand5) { t.summary(); return; }
    t.assert('移動したカード(uuid)がtrashセクションに表示される', await waitUuidLoc(cdp, cand5.uuid, 'trash'));
    const st5 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('trash移動後もtrashセクションに枚数バッジは表示されない', st5 && st5.trash.badge === null);
    const specTrash = await cdp.evaluate(btnSpecExpr('trash', cand5.uuid));
    t.assert('trash内カードにtop-rightボタンは存在しない（topRightText=""）', specTrash && specTrash.topRight === false);
    t.assert('trash内カードのbottom-leftはM/Eボタン（card-btn-me）', specTrash &&
      specTrash.bottomLeftClasses.includes('card-btn-me') && specTrash.bottomLeftText.includes('M'));
    t.assert('trash内カードのbottom-rightはSide移動ボタン（card-btn-side・表示"S"）', specTrash &&
      specTrash.bottomRightClasses.includes('card-btn-side') && specTrash.bottomRightText === 'S');

    // ============================================================
    console.log('\n--- 6. trash→main 移動（trashカードのbottom-left M/E ボタン） ---');
    // ============================================================
    await clickBtn(cdp, 'trash', cand5.uuid, 'bottom-left');
    const st6 = await waitCounts(cdp, baseline);
    t.assert('trashカードのbottom-left(M/E)で trash→main に戻り全セクションが初期状態になる', !!st6);
    t.assert('戻したカード(uuid)がmainセクションに表示される', await waitUuidLoc(cdp, cand5.uuid, 'main'));

    // ============================================================
    console.log('\n--- 7. trash→side 移動（trashカードのbottom-right S ボタン） ---');
    // ============================================================
    const cand7 = await moveFromMainUntil(cdp, 'bottom-left', { main: M - 1, side: S, extra: E, trash: T + 1 });
    t.assert('準備: bottom-left(trash)で main→trash 移動ができる', !!cand7);
    if (!cand7) { t.summary(); return; }
    await waitUuidLoc(cdp, cand7.uuid, 'trash');
    await clickBtn(cdp, 'trash', cand7.uuid, 'bottom-right');
    const st7 = await waitCounts(cdp, { main: M - 1, side: S + 1, extra: E, trash: T });
    t.assert('trashカードのbottom-right(S)で trash→side 移動になる（main -1 / side +1 / trash 元通り）', !!st7);
    t.assert('移動したカード(uuid)がsideセクションに表示される', await waitUuidLoc(cdp, cand7.uuid, 'side'));
    await clickBtn(cdp, 'side', cand7.uuid, 'top-right');
    const st7b = await waitCounts(cdp, baseline);
    t.assert('sideカードのtop-right(M/E)でmainに復帰し全セクションが初期状態に戻る', !!st7b);

    // ============================================================
    console.log('\n--- 8. Ctrl+Z で main→trash 移動が復元される ---');
    // ============================================================
    const cand8 = await moveFromMainUntil(cdp, 'bottom-left', { main: M - 1, side: S, extra: E, trash: T + 1 });
    t.assert('準備: bottom-left(trash)で main→trash 移動ができる', !!cand8);
    if (!cand8) { t.summary(); return; }
    await ctrlZ(cdp);
    const st8 = await waitCounts(cdp, baseline);
    t.assert('Ctrl+Z で trash 移動も全セクション枚数が初期状態に戻る', !!st8);
    t.assert('Ctrl+Z で移動したカード(uuid)がmainセクションに戻る', await waitUuidLoc(cdp, cand8.uuid, 'main'));

    // ============================================================
    console.log('\n--- 9. カードコピー（bottom-right + ボタン）で +1（TASK-452の再確認） ---');
    // ============================================================
    const cand9 = await moveFromMainUntil(cdp, 'bottom-right', { main: M + 1, side: S, extra: E, trash: T });
    t.assert('bottom-right(+)クリックで main +1 になる（枚数制限回避のため候補順に試す）', !!cand9);
    if (cand9) {
      const st9 = await cdp.evaluate(COUNTS_EXPR);
      t.assert('コピー後の枚数バッジも +1 される', st9 && st9.main.badge === M + 1);
      await ctrlZ(cdp);
      const st9b = await waitCounts(cdp, baseline);
      t.assert('Ctrl+Z でコピー追加が取り消され初期状態に戻る', !!st9b);
    }

    // ============================================================
    console.log('\n--- 10. top-left（詳細表示）で Card 詳細タブに切替 ---');
    // ============================================================
    const cand10 = (await cdp.evaluate(CANDIDATES_EXPR) || [])[0];
    const tabBefore = await cdp.evaluate(TAB_STATE_EXPR);
    t.assert('準備: Card詳細タブは初期状態では表示されていない', tabBefore && tabBefore.cardDetail === false);
    await clickBtn(cdp, 'main', cand10.uuid, 'top-left');
    // showCardDetail はAPI取得をawaitしてから activeTab='card' を設定するため余裕を持って待つ
    const detailShown = await cdp.waitFor(
      `(() => { const el = document.querySelector('.right-area .card-detail-content'); return !!(el && getComputedStyle(el).display !== 'none' && el.querySelector('.card-item')); })()`,
      10000
    );
    t.assert('top-left(ⓘ)クリックで Card 詳細タブが表示されカードが描画される', detailShown === true);
    await cdp.evaluate(`document.querySelector('.right-area .tabs .deck-tab')?.click()`);
    await cdp.wait(300);
    const tabAfter = await cdp.evaluate(TAB_STATE_EXPR);
    t.assert('Deckタブボタンで元のタブ表示に戻せる', tabAfter && tabAfter.deck === true && tabAfter.cardDetail === false);

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

testCardOperations();
