/**
 * カードのドラッグ＆ドロップ移動（DeckCard.vue HTML5 DnD）の E2Eテスト（TASK-457）
 *
 * デッキ編集画面のカードD&Dによる並び替え・セクション間移動を実ブラウザ操作
 * （実HTML5 DnDイベント: dragstart → dragover → drop → dragend を共有DataTransferで
 * dispatch）で検証する。サーバーへの書き込みは一切行わない（保存ボタンは押さず、
 * 最後にページ再読み込みでメモリ上のデッキ状態を破棄する）。
 *
 * D&D発火方式: CDP Runtime.evaluate（main world）での合成 DragEvent。
 *   - DeckCard.vue のデッキ編集D&DはネイティブHTML5 DnD実装（:draggable="!card.empty"、
 *     ルート要素に @dragstart/@dragover/@dragleave/@drop/@dragend）。pointerdown ベースの
 *     カスタムドラッグではない（useDragQuarter 等は practice モード専用）。
 *   - dragstart ハンドラが dataTransfer へ 'text/plain' JSON（{sectionType, index, card,
 *     uuid}）を書き込み（src/utils/drag-data.ts setDragData）、かつ deckStore.setDraggingCard
 *     で draggingCard を設定する。dragover/drop の canMoveCard 判定はこの draggingCard と
 *     dataTransfer の両方に依存するため、本物の dragstart ハンドラを通した合成イベント
 *     シーケンスが必要（ペイロードを自作すると canMoveCard の card.cardType/types が
 *     再現できない）。CDP Input.dispatchMouseEvent だけでは HTML5 ドラッグセッションは
 *     開始されないため不採用。
 *   - 合成イベントは実際のドラッグセッションを伴わないため DataTransfer は readwrite
 *     モードのまま（dragover 中でも getData 可）。main world で dispatch したイベントは
 *     DOM共有を通じて content script（isolated world）の Vue ハンドラへ到達する
 *     （element.click() と同じ伝播）。
 *
 * 検証項目:
 *   1. 合成 dragstart がアプリ実装のハンドラを通過すること（dataTransfer に
 *      {sectionType, uuid, card.cardId} が書き込まれる）
 *   2. ドラッグオーバーでドロップ先カードに .drag-over ハイライト（canMoveCard 通過）・
 *      ドラッグ中の自分自身へ dragover してもハイライトしない
 *   3. main内reorder（カード→カード）: ソースがターゲットの直後に配置・uuid多重集合の
 *      不変・枚数/バッジ不変
 *   4. Ctrl+Z（実キーイベント）で reorder が復元される
 *      ※現状挙動: 元の位置の1つ手前（元の直前カードの直前）に配置される
 *      （reorderWithinSectionInternal の undo targetIdx 計算による off-by-one。要修正確認）
 *   5. 自分自身へのドロップはno-op（順序・枚数不変）
 *   6. main内reorder（カード→末尾drop-zone-end）
 *      ※現状挙動: ソースは末尾ではなく末尾から2番目に配置される（off-by-one。
 *      要修正確認）。Ctrl+Z で同様に1つ手前へ復元
 *   7. 準備（main→side を末尾drop-zone経由）+ main→side 移動（カード→sideカード）:
 *      main -1 / side +1・バッジ更新・移動元uuid消失・sideに新uuid（同cardId）が
 *      ドロップ先の直前に出現・sideカードの .drag-over ハイライト・
 *      Ctrl+Z で完全復元（uuid・位置も完全一致）
 *   8. side→main 移動（sideカード→mainカード）: 枚数が戻る・mainに新uuid（同cardId）が
 *      ドロップ先の直前に出現・Ctrl+Z 2回で完全復元
 *   9. 履歴の全巻き戻し: 残コマンドを Ctrl+Z で消化し全セクション枚数がロード時状態に復帰
 *  10. trashへのD&Dは不可（canMoveCard拒否）: trashセクションにハイライトなし
 *      （sideセクションはハイライトあり）・ドロップしても枚数・順序不変
 *
 * 実装参照:
 *   src/components/DeckCard.vue
 *     (:draggable="!card.empty" / handleDragStart: setDragData + setDraggingCard /
 *      handleDragOver: canMoveCard→preventDefault+isDragOver（同一cardId+同一セクションは
 *      ハイライト抑制）/ handleDrop: 同一セクション→reorderCard(sourceUuid, targetUuid,
 *      section) / 異セクション→moveCardWithPosition(cardId, from, to, sourceUuid,
 *      targetUuid) / handleDragEnd: setDraggingCard(null)。'drag-over' クラスは isDragOver)
 *   src/components/DeckSection.vue
 *     (.deck-section ルートと .drop-zone-end の @drop="handleEndDrop": 同一セクション→
 *      reorderWithinSection(sec, sourceUuid, null) / 異セクション→moveCard（uuid保持・
 *      末尾追加）。handleSectionDragOver: canDropToSection→preventDefault+
 *      'section-drag-over' クラス)
 *   src/stores/deck-edit.ts
 *     (reorderCard→reorderWithinSection: uuid保持・pushCommand(type 'reorder')。
 *      undo は originalPrevUuid を targetUuid にして reorderWithinSectionInternal を呼ぶ
 *      → from>targetIdx では「targetの直前」挿入になるため復元位置が1つ手前になる
 *      【現状挙動】。targetUuid=null（末尾）は toIndex=length-1 → adjusted=length-2 で
 *      末尾から2番目になる【現状挙動】。
 *      moveCardWithPosition: 移動元から削除し targetUuid の直前に新uuid
 *      generateDeckCardUUID(cardId, ciid)=`${cid}-${ciid}-${連番}` で挿入・undo は元のuuidを
 *      元のインデックスへ正確に復帰。moveCard→moveInDisplayOrder: uuid保持で移動先
 *      セクション末尾へpush・undo も正確)
 *   src/composables/deck/useDeckDisplayOrder.ts
 *     (reorderWithinSection(from, to): from<to は to-1 へ補正挿入。deck-edit.ts の
 *      toIndex 計算（from>target→target / else target+1）と合わせるとドロップは
 *      「ソースがターゲットより前→直後 / 後→直前」に配置される)
 *   src/composables/deck/useDeckValidation.ts
 *     (canMoveCard: sideへの移動は常時可 / mainへの移動はextraデッキカード不可 /
 *      trashへの移動は不可)
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (trash DeckSection は :show-count="false"。main-content と RightArea deck-tab
 *      の2箇所にセクションが存在するためセレクタは必ず .main-content 配下にスコープ)
 *
 * 注意:
 *   - Vue/Pinia 内部プロパティにはアクセスしない（DOMの data-uuid / data-card-id で検証）
 *   - TransitionGroup の leave トランザクション（0.3s）より長く待ってからDOM計測する
 *   - dno=3 のsideデッキは空のため、card→カードのmain⇔sideドロップ検証の前に
 *     末尾drop-zone経由（moveCard・uuid保持）でsideへカードを補充する
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// セクションは .main-content と RightArea deck-tab の2箇所に存在するためスコープ
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

/** 指定セクションのカードリスト（DOM順 = displayOrder順。uuid と cardId） */
const sectionCardsExpr = (section) => `(() => {
  const s = document.querySelector('${SCOPE} .deck-section.${section}-deck');
  if (!s) return null;
  return Array.from(s.querySelectorAll('.card-grid .deck-card[data-uuid]')).map(el => ({
    uuid: el.dataset.uuid, cardId: el.dataset.cardId
  }));
})()`;

/** セクション内の指定uuidカードのセレクタ */
const cardSel = (section, uuid) =>
  `${SCOPE} .deck-section.${section}-deck .card-grid .deck-card[data-uuid="${uuid}"]`;

/** セクション末尾のドロップゾーン（DeckSection.vue .drop-zone-end）のセレクタ */
const endZoneSel = (section) => `${SCOPE} .deck-section.${section}-deck .card-grid .drop-zone-end`;

/** セクション本体（.deck-section ルート。section-drag-overlay/section-drag-over判定用） */
const sectionSel = (section) => `${SCOPE} .deck-section.${section}-deck`;

/**
 * D&D前半: 共有DataTransferを作成し、src に dragstart、dst に dragover を dispatch。
 * DataTransfer と要素を window.__ygoDnDTest に退避し、後半（drop/dragend）で使い回す。
 * （dragover → Vue の isDragOver=true 反映（.drag-over クラス）はマイクロタスクで
 *  適用されるため、ハイライト検証はこの式と後半の間で別evaluateで行う）
 */
const DRAG_START_OVER = (srcSelector, dstSelector) => `(() => {
  const src = document.querySelector(${JSON.stringify(srcSelector)});
  const dst = document.querySelector(${JSON.stringify(dstSelector)});
  if (!src || !dst) return { ok: false, error: !src ? 'src-not-found' : 'dst-not-found' };
  const dt = new DataTransfer();
  window.__ygoDnDTest = { dt, src, dst };
  const opts = { bubbles: true, cancelable: true };
  src.dispatchEvent(new DragEvent('dragstart', Object.assign({}, opts, { dataTransfer: dt })));
  dst.dispatchEvent(new DragEvent('dragover', Object.assign({}, opts, { dataTransfer: dt })));
  return { ok: true };
})()`;

/** ドラッグオーバー中の要素のハイライト状態（.drag-over クラス） */
const DRAG_OVER_STATE = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  return el ? el.classList.contains('drag-over') : null;
})()`;

/** セクションのドラッグオーバー状態（.section-drag-over クラス） */
const SECTION_OVER_STATE = (section) => `(() => {
  const el = document.querySelector(${JSON.stringify(sectionSel(section))});
  return el ? el.classList.contains('section-drag-over') : null;
})()`;

/** ドラッグ進行中に追加の要素へ dragover を dispatch（自己ハイライト抑制等の検証用） */
const DRAG_FIRE_OVER = (selector) => `(() => {
  const st = window.__ygoDnDTest;
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!st || !el) return false;
  el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: st.dt }));
  return true;
})()`;

/**
 * D&D後半: dst に drop、src に dragend を dispatch し、dragstart でアプリが書き込んだ
 * dataTransfer ペイロード（'text/plain' JSON）を返す。
 * drop のハンドラは同期実行されるが Vue のDOM反映はマイクロタスクのため、
 * 計測は呼び出し側で wait 後に行うこと。
 */
const DRAG_FINISH = () => `(() => {
  const st = window.__ygoDnDTest;
  if (!st) return { ok: false, error: 'no-drag-in-progress' };
  const opts = { bubbles: true, cancelable: true };
  st.dst.dispatchEvent(new DragEvent('drop', Object.assign({}, opts, { dataTransfer: st.dt })));
  st.src.dispatchEvent(new DragEvent('dragend', Object.assign({}, opts, { dataTransfer: st.dt })));
  const raw = st.dt.getData('text/plain');
  window.__ygoDnDTest = null;
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch (e) { payload = null; }
  return { ok: true, payload };
})()`;

/**
 * D&Dキャンセル: drop せずに src へ dragend のみ dispatch（ハイライト検証後に
 * デッキ状態を変更せずにドラッグを終了するためのもの）
 */
const DRAG_CANCEL = () => `(() => {
  const st = window.__ygoDnDTest;
  if (!st) return { ok: false, error: 'no-drag-in-progress' };
  const opts = { bubbles: true, cancelable: true };
  st.src.dispatchEvent(new DragEvent('dragend', Object.assign({}, opts, { dataTransfer: st.dt })));
  window.__ygoDnDTest = null;
  return { ok: true };
})()`;

/** 1評価で完結する dragstart→dragover→drop→dragend（ハイライト検証が不要な場面用） */
const DRAG_DROP = (srcSelector, dstSelector) => `(() => {
  const src = document.querySelector(${JSON.stringify(srcSelector)});
  const dst = document.querySelector(${JSON.stringify(dstSelector)});
  if (!src || !dst) return { ok: false, error: !src ? 'src-not-found' : 'dst-not-found' };
  const dt = new DataTransfer();
  const opts = { bubbles: true, cancelable: true };
  const fire = (el, type) => el.dispatchEvent(new DragEvent(type, Object.assign({}, opts, { dataTransfer: dt })));
  fire(src, 'dragstart');
  fire(dst, 'dragover');
  fire(dst, 'drop');
  fire(src, 'dragend');
  return { ok: true };
})()`;

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

/** TransitionGroup の leave（0.3s）+ FLIPアニメーションが収まるまでの待機 */
const SETTLE_MS = 600;

// CDP Input.dispatchKeyEvent の修飾キービットマップ
const MODIFIERS = { ctrl: 2 };

/** Ctrl+Z の実キーイベントを送出（keyDown + keyUp） */
async function ctrlZ(cdp) {
  await cdp.evaluate('document.activeElement && document.activeElement.blur()');
  await cdp.wait(50);
  const base = {
    modifiers: MODIFIERS.ctrl,
    key: 'z',
    code: 'KeyZ',
    windowsVirtualKeyCode: 90,
    nativeVirtualKeyCode: 90,
  };
  await cdp.sendCommand('Input.dispatchKeyEvent', Object.assign({}, base, { type: 'keyDown' }));
  await cdp.wait(80);
  await cdp.sendCommand('Input.dispatchKeyEvent', Object.assign({}, base, { type: 'keyUp' }));
  await cdp.wait(300);
}

/** uuid列の多重集合比較（並び替えで集合が保存されることの検証用） */
function sameMultiset(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

const uuids = (cards) => (cards || []).map(c => c.uuid);

async function testDragDrop() {
  console.log('【カードD&D移動 E2Eテスト】\n');
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
    await cdp.wait(SETTLE_MS);

    const base = await cdp.evaluate(COUNTS_EXPR);
    const M = base.main.cards, S = base.side.cards, E = base.extra.cards, T = base.trash.cards;
    console.log(`  初期枚数: main=${M} extra=${E} side=${S} trash=${T}`);
    const baseline = { main: M, side: S, extra: E, trash: T };
    // dno=3 は side=0 のため、card→カードのmain⇔sideドロップ検証では事前にsideへ補充する

    const main0 = await cdp.evaluate(sectionCardsExpr('main'));
    t.assert('mainのuuidリストが取得できる', Array.isArray(main0) && main0.length === M);
    if (!Array.isArray(main0) || main0.length !== M) { t.summary(); return; }

    // reorder 検証用: 異なるcardId・間隔の空いた (source, target) ペアを選ぶ
    let pair = null;
    for (let i = 1; i < Math.min(6, main0.length - 3) && !pair; i++) {
      for (let j = main0.length - 2; j > i + 2 && !pair; j--) {
        if (main0[i].cardId !== main0[j].cardId) pair = { src: main0[i], dst: main0[j], si: i, di: j };
      }
    }
    t.assert('reorder検証用のカードペアが選択できる', !!pair);
    if (!pair) { t.summary(); return; }
    console.log(`  reorder対象: main[${pair.si}] -> main[${pair.di}] にドロップ`);

    // ============================================================
    console.log('\n--- 1. dragstart がアプリ実装ハンドラを通過する（dataTransfer ペイロード） ---');
    // ============================================================
    const start1 = await cdp.evaluate(DRAG_START_OVER(cardSel('main', pair.src.uuid), cardSel('main', pair.dst.uuid)));
    t.assert('合成DnDシーケンス前半（dragstart+dragover）が実行できる', start1 && start1.ok === true);
    await cdp.wait(250);
    const payloadRaw = await cdp.evaluate(`window.__ygoDnDTest ? window.__ygoDnDTest.dt.getData('text/plain') : null`);
    let payload = null;
    try { payload = payloadRaw ? JSON.parse(payloadRaw) : null; } catch (e) { payload = null; }
    t.assert('dragstartでアプリがdataTransferにペイロードを書き込む（sectionType=main）',
      !!payload && payload.sectionType === 'main');
    t.assert('ペイロードのuuidがドラッグ元カードと一致する', !!payload && payload.uuid === pair.src.uuid);
    t.assert('ペイロードのcard.cardIdがドラッグ元カードと一致する',
      !!payload && payload.card && String(payload.card.cardId) === String(pair.src.cardId));

    // ============================================================
    console.log('\n--- 2. dragover でドロップ先カードにハイライト（.drag-over） ---');
    // ============================================================
    const over1 = await cdp.evaluate(DRAG_OVER_STATE(cardSel('main', pair.dst.uuid)));
    t.assert('ドラッグオーバー中のドロップ先に .drag-over が付く', over1 === true);
    // 自分自身へも dragover を発火（handleDragOver は canMove で preventDefault するが
    // 同一cardId+同一セクションでは isDragOver を立てない）
    const firedSelf = await cdp.evaluate(DRAG_FIRE_OVER(cardSel('main', pair.src.uuid)));
    await cdp.wait(250);
    const overSelf = await cdp.evaluate(DRAG_OVER_STATE(cardSel('main', pair.src.uuid)));
    t.assert('ドラッグ中の自分自身に dragover しても .drag-over が付かない',
      firedSelf === true && overSelf === false);
    const over1b = await cdp.evaluate(DRAG_OVER_STATE(cardSel('main', pair.dst.uuid)));
    t.assert('ドロップ先のハイライトは維持される', over1b === true);

    // ============================================================
    console.log('\n--- 3. main内reorder（カード→カード）: 順序変化と集合保存 ---');
    // ============================================================
    const fin3 = await cdp.evaluate(DRAG_FINISH());
    t.assert('drop + dragend が実行できる', fin3 && fin3.ok === true);
    await cdp.wait(SETTLE_MS);
    const counts3 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('reorder後も全セクション枚数が不変', counts3 &&
      counts3.main.cards === M && counts3.side.cards === S && counts3.trash.cards === T);
    t.assert('reorder後もmainの枚数バッジが不変', counts3 && counts3.main.badge === M);
    const main3 = await cdp.evaluate(sectionCardsExpr('main'));
    t.assert('reorder後もmainのuuid多重集合が不変', sameMultiset(uuids(main3), uuids(main0)));
    // 期待順序: 元から src を除き、dst の直後に src を挿入
    // （deck-edit.ts: fromIndex < targetIdx → toIndex = targetIdx+1、
    //   useDeckDisplayOrder.ts: adjusted = toIndex-1 → dst の直後）
    const expected3 = uuids(main0).filter(u => u !== pair.src.uuid);
    expected3.splice(expected3.indexOf(pair.dst.uuid) + 1, 0, pair.src.uuid);
    t.assert('ソースカードがドロップ先カードの直後に配置される',
      JSON.stringify(uuids(main3)) === JSON.stringify(expected3));

    // ============================================================
    console.log('\n--- 4. Ctrl+Z で reorder が復元される ---');
    // ============================================================
    // 【現状挙動】undo は originalPrevUuid を targetUuid にして reorderWithinSectionInternal
    // を呼ぶが、from>targetIdx では「targetの直前」挿入になるため、src は元の位置の
    // 1つ手前（元の直前カードの直前）に復元される（元の直後が文書上の意図）
    await ctrlZ(cdp);
    const main4 = await cdp.evaluate(sectionCardsExpr('main'));
    const expected4 = uuids(main0).filter(u => u !== pair.src.uuid);
    expected4.splice(pair.si - 1, 0, pair.src.uuid);
    t.assert('Ctrl+Z で src が元の位置の1つ手前に復元される【現状挙動: off-by-one】',
      JSON.stringify(uuids(main4)) === JSON.stringify(expected4));
    t.assert('undo後もuuid多重集合は不変', sameMultiset(uuids(main4), uuids(main0)));
    const counts4 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('Ctrl+Z 後も全セクション枚数が不変', counts4 &&
      counts4.main.cards === M && counts4.side.cards === S && counts4.trash.cards === T);

    // ============================================================
    console.log('\n--- 5. 自分自身へのドロップはno-op ---');
    // ============================================================
    const self5 = main4[2] || main4[0];
    await cdp.evaluate(DRAG_DROP(cardSel('main', self5.uuid), cardSel('main', self5.uuid)));
    await cdp.wait(SETTLE_MS);
    const main5 = await cdp.evaluate(sectionCardsExpr('main'));
    t.assert('自分自身にドロップしても順序が変化しない',
      JSON.stringify(uuids(main5)) === JSON.stringify(uuids(main4)));

    // ============================================================
    console.log('\n--- 6. main内reorder（カード→末尾drop-zone-end）---');
    // ============================================================
    const src6 = main5[2]; // 2番目以降（undo挙動の prev が存在する位置）
    await cdp.evaluate(DRAG_DROP(cardSel('main', src6.uuid), endZoneSel('main')));
    await cdp.wait(SETTLE_MS);
    const main6 = await cdp.evaluate(sectionCardsExpr('main'));
    // 【現状挙動】targetUuid=null は toIndex=length-1 → adjusted=length-2 のため
    // 「末尾」ではなく末尾から2番目に配置される（末尾移動が文書上の意図）
    const rest6 = uuids(main5).filter(u => u !== src6.uuid);
    const expected6 = rest6.slice(0, rest6.length - 1).concat([src6.uuid, rest6[rest6.length - 1]]);
    t.assert('drop-zone-endへのドロップでソースが末尾から2番目に移動する【現状挙動: off-by-one】',
      JSON.stringify(uuids(main6)) === JSON.stringify(expected6));
    t.assert('末尾移動でもuuid多重集合は不変', sameMultiset(uuids(main6), uuids(main5)));
    await ctrlZ(cdp);
    const main6b = await cdp.evaluate(sectionCardsExpr('main'));
    const expected6undo = uuids(main5).filter(u => u !== src6.uuid);
    expected6undo.splice(main5.indexOf(src6) - 1, 0, src6.uuid);
    t.assert('Ctrl+Z で src が元の位置の1つ手前に復元される【現状挙動: off-by-one】',
      JSON.stringify(uuids(main6b)) === JSON.stringify(expected6undo));

    // ============================================================
    console.log('\n--- 7. 準備（main→side をdrop-zone経由）+ main→side 移動（カード→sideカード） ---');
    // ============================================================
    // 7a. sideが空のため、末尾drop-zone経由（moveCard・uuid保持）でsideへ1枚補充
    const mainBefore7 = await cdp.evaluate(sectionCardsExpr('main'));
    let prepCard = null;
    for (const cand of mainBefore7.slice(0, 8)) {
      await cdp.evaluate(DRAG_DROP(cardSel('main', cand.uuid), endZoneSel('side')));
      const ok = await waitCounts(cdp, { main: M - 1, side: 1, extra: E, trash: T }, 2500);
      if (ok) { prepCard = cand; break; }
      console.log(`  ※ cardId=${cand.cardId} の移動が拒否されたため次候補へ`);
    }
    t.assert('準備: drop-zone経由で main -1 / side +1 になる', !!prepCard);
    if (!prepCard) { t.summary(); return; }
    await cdp.wait(SETTLE_MS);
    const side7 = await cdp.evaluate(sectionCardsExpr('side'));
    t.assert('準備: 移動したカードがuuidを保持したままside末尾に配置される（moveCard経路）',
      side7.length === 1 && side7[0].uuid === prepCard.uuid);

    // 7b. main→side を sideカードへのドロップで移動（.drag-over ハイライトも検証）
    const mainB = await cdp.evaluate(sectionCardsExpr('main'));
    const sideB = await cdp.evaluate(sectionCardsExpr('side'));
    const sideTarget = sideB[0];
    const mainTarget = mainB.find(c => c.uuid !== mainB[0].uuid) || mainB[1] || mainB[0];

    let done7 = null;
    const candidates7 = mainB.slice(0, 8).filter(c => c.uuid !== mainTarget.uuid);
    for (const cand of candidates7) {
      const st = await cdp.evaluate(DRAG_START_OVER(cardSel('main', cand.uuid), cardSel('side', sideTarget.uuid)));
      if (!st || !st.ok) continue;
      await cdp.wait(250);
      const fin = await cdp.evaluate(DRAG_FINISH());
      if (!fin || !fin.ok) continue;
      const ok = await waitCounts(cdp, { main: M - 2, side: 2, extra: E, trash: T }, 2500);
      if (ok) { done7 = cand; break; }
      console.log(`  ※ cardId=${cand.cardId} の移動が拒否されたため次候補へ`);
    }
    t.assert('main→side のカードドロップで main -1 / side +1 になる', !!done7);
    if (done7) {
      const counts7 = await cdp.evaluate(COUNTS_EXPR);
      t.assert('移動後の枚数バッジも更新される（main badge -1 / side badge +1）', counts7 &&
        counts7.main.badge === M - 2 && counts7.side.badge === 2);
      const main7 = await cdp.evaluate(sectionCardsExpr('main'));
      const side7b = await cdp.evaluate(sectionCardsExpr('side'));
      t.assert('移動元uuidがmainから消失する', !main7.some(c => c.uuid === done7.uuid));
      const newUuids = side7b.map(c => c.uuid).filter(u => !sideB.some(c => c.uuid === u));
      t.assert('sideに新uuidが1つ追加される（uuidはcid-ciid-連番で再生成）', newUuids.length === 1);
      const newCard = side7b.find(c => c.uuid === newUuids[0]);
      t.assert('新uuidカードのcardIdが移動元カードと一致する', newCard && String(newCard.cardId) === String(done7.cardId));
      const sideTargetIdx = side7b.findIndex(c => c.uuid === sideTarget.uuid);
      t.assert('新uuidカードがドロップ先sideカードの直前に配置される',
        sideTargetIdx >= 1 && side7b[sideTargetIdx - 1].uuid === newUuids[0]);
      t.assert('mainはsrcを抜いた順序を保つ',
        JSON.stringify(uuids(main7)) === JSON.stringify(uuids(mainB).filter(u => u !== done7.uuid)));

      // 7c. dragover中のsideカードハイライト（main→side は canMoveCard 常時可）
      // ※drop は行わず dragend のみで終了（デッキ状態を変更しない）
      await cdp.evaluate(DRAG_START_OVER(cardSel('main', mainTarget.uuid), cardSel('side', sideTarget.uuid)));
      await cdp.wait(250);
      const overSide = await cdp.evaluate(DRAG_OVER_STATE(cardSel('side', sideTarget.uuid)));
      t.assert('main→side ドラッグオーバーでsideカードに .drag-over が付く', overSide === true);
      await cdp.evaluate(DRAG_CANCEL());

      // 7d. Ctrl+Z で完全復元（uuid・位置も完全一致: moveCardWithPosition のundoは正確）
      await ctrlZ(cdp);
      const restored7 = await waitCounts(cdp, { main: M - 1, side: 1, extra: E, trash: T }, 3000);
      t.assert('Ctrl+Z で枚数が準備後の状態に戻る', !!restored7);
      const main7b = await cdp.evaluate(sectionCardsExpr('main'));
      const side7c = await cdp.evaluate(sectionCardsExpr('side'));
      t.assert('Ctrl+Z でmainのuuid順序が準備後に完全復元（元のuuid・元の位置）',
        JSON.stringify(uuids(main7b)) === JSON.stringify(uuids(mainB)));
      t.assert('Ctrl+Z でsideのuuidリストが準備後に完全復元',
        JSON.stringify(uuids(side7c)) === JSON.stringify(uuids(sideB)));

      // ============================================================
      console.log('\n--- 8. side→main 移動（sideカード→mainカード）+ Ctrl+Z 2回 ---');
      // ============================================================
      // 8a. 準備: main→side をカードドロップでもう1枚移動
      let done8 = null;
      for (const cand of candidates7) {
        await cdp.evaluate(DRAG_DROP(cardSel('main', cand.uuid), cardSel('side', sideTarget.uuid)));
        const ok = await waitCounts(cdp, { main: M - 2, side: 2, extra: E, trash: T }, 2500);
        if (ok) { done8 = cand; break; }
      }
      t.assert('準備: main→side へのD&D移動ができる', !!done8);
      if (done8) {
        const side8 = await cdp.evaluate(sectionCardsExpr('side'));
        const main8prep = await cdp.evaluate(sectionCardsExpr('main'));
        const movedUuid = side8.map(c => c.uuid).filter(u => !sideB.some(c => c.uuid === u))[0];
        t.assert('sideに移動済みカードの新uuidが取得できる', !!movedUuid);

        // 8b. side→main のカードドロップ
        const dd8 = await cdp.evaluate(DRAG_DROP(cardSel('side', movedUuid), cardSel('main', mainTarget.uuid)));
        t.assert('side→main のD&Dが実行できる', dd8 && dd8.ok === true);
        const counts8 = await waitCounts(cdp, { main: M - 1, side: 1, extra: E, trash: T }, 3000);
        t.assert('side→main で枚数が準備後の状態に戻る', !!counts8);
        const main8 = await cdp.evaluate(sectionCardsExpr('main'));
        const side8b = await cdp.evaluate(sectionCardsExpr('side'));
        t.assert('sideが準備後のuuidリストに戻る',
          JSON.stringify(uuids(side8b)) === JSON.stringify(uuids(sideB)));
        const newUuids8 = main8.map(c => c.uuid).filter(u => !main8prep.some(c => c.uuid === u));
        t.assert('mainに新uuidが1つ出現する（side→mainでもuuidは再生成）', newUuids8.length === 1);
        const newCard8 = main8.find(c => c.uuid === newUuids8[0]);
        t.assert('新uuidカードのcardIdが移動したカードと一致する',
          newCard8 && String(newCard8.cardId) === String(done8.cardId));
        const mainTargetIdx = main8.findIndex(c => c.uuid === mainTarget.uuid);
        t.assert('新uuidカードがドロップ先mainカードの直前に配置される',
          mainTargetIdx >= 1 && main8[mainTargetIdx - 1].uuid === newUuids8[0]);

        // 8c. Ctrl+Z 2回で準備後の状態に完全復元
        await ctrlZ(cdp); // side→main をundo
        const midCounts = await waitCounts(cdp, { main: M - 2, side: 2, extra: E, trash: T }, 3000);
        t.assert('Ctrl+Z(1回目) でside→main移動が取り消される（main -1 / side +1）', !!midCounts);
        const mainU1 = await cdp.evaluate(sectionCardsExpr('main'));
        const sideU1 = await cdp.evaluate(sectionCardsExpr('side'));
        t.assert('Ctrl+Z(1回目) で8a移動直後のuuid順序に完全復元',
          JSON.stringify(uuids(mainU1)) === JSON.stringify(uuids(main8prep)) &&
          JSON.stringify(uuids(sideU1)) === JSON.stringify(uuids(side8)));
        await ctrlZ(cdp); // main→side をundo
        const counts8b = await waitCounts(cdp, { main: M - 1, side: 1, extra: E, trash: T }, 3000);
        t.assert('Ctrl+Z(2回目) で枚数が準備後の状態に戻る', !!counts8b);
        const main8b = await cdp.evaluate(sectionCardsExpr('main'));
        const side8c = await cdp.evaluate(sectionCardsExpr('side'));
        t.assert('Ctrl+Z 2回でmain/sideとも準備後のuuid順序に完全復元',
          JSON.stringify(uuids(main8b)) === JSON.stringify(uuids(mainB)) &&
          JSON.stringify(uuids(side8c)) === JSON.stringify(uuids(sideB)));
      }
    }

    // ============================================================
    console.log('\n--- 9. 履歴の全巻き戻し: 残コマンドを消化してロード時枚数に復帰 ---');
    // ============================================================
    // 残っているコマンド = 7aの準備移動（+ 7cで取り消し忘れが無いことを確認する意味でも
    // 巻き戻しはループで実施）。全セクション枚数がロード時(baseline)に戻るまで Ctrl+Z
    let rolled = false;
    for (let i = 0; i < 6; i++) {
      const cur = await cdp.evaluate(COUNTS_EXPR);
      if (cur && cur.main.cards === baseline.main && cur.side.cards === baseline.side &&
          cur.extra.cards === baseline.extra && cur.trash.cards === baseline.trash) {
        rolled = true; break;
      }
      await ctrlZ(cdp);
    }
    const counts9 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('Ctrl+Z で履歴を全巻き戻しすると全セクション枚数がロード時状態に復帰', rolled ||
      (counts9 && counts9.main.cards === baseline.main && counts9.side.cards === baseline.side &&
       counts9.trash.cards === baseline.trash));
    const main9 = await cdp.evaluate(sectionCardsExpr('main'));
    const side9 = await cdp.evaluate(sectionCardsExpr('side'));
    t.assert('全巻き戻し後: sideがロード時の枚数に戻る', side9.length === S);
    t.assert('全巻き戻し後: mainのuuid多重集合がロード時と一致',
      sameMultiset(uuids(main9), uuids(main0)));

    // ============================================================
    console.log('\n--- 10. trashへのD&Dは不可（canMoveCard拒否） ---');
    // ============================================================
    const main10 = await cdp.evaluate(sectionCardsExpr('main'));
    const src10 = main10[0];
    await cdp.evaluate(DRAG_START_OVER(cardSel('main', src10.uuid), sectionSel('trash')));
    await cdp.wait(250);
    // sideセクションは常時ドロップ可（正の対照）→ .section-drag-over が付く
    await cdp.evaluate(DRAG_FIRE_OVER(sectionSel('side')));
    await cdp.wait(250);
    const overSideSec = await cdp.evaluate(SECTION_OVER_STATE('side'));
    t.assert('main→side ドラッグオーバーでsideセクションに .section-drag-over が付く（正の対照）',
      overSideSec === true);
    const overTrashSec = await cdp.evaluate(SECTION_OVER_STATE('trash'));
    t.assert('trashセクションへのドラッグオーバーでは .section-drag-over が付かない', overTrashSec === false);
    await cdp.evaluate(DRAG_FINISH());
    await cdp.wait(SETTLE_MS);
    const counts10 = await cdp.evaluate(COUNTS_EXPR);
    t.assert('trashへドロップしても全セクション枚数は不変', counts10 &&
      counts10.main.cards === M && counts10.trash.cards === T && counts10.side.cards === S);
    const main10b = await cdp.evaluate(sectionCardsExpr('main'));
    t.assert('trashへドロップしてもmainのuuid順序は不変',
      JSON.stringify(uuids(main10b)) === JSON.stringify(uuids(main10)));

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

testDragDrop();
