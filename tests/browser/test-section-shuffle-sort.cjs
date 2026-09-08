/**
 * セクション単位シャッフル/ソートボタン（DeckSection.vue）操作の E2Eテスト（TASK-456）
 *
 * デッキ編集画面の各セクション見出しのシャッフル/ソートボタン
 * （h3 .section-buttons .btn-section[title="Shuffle"/"Sort"]）の実クリックによる
 * 並び順変更・要素集合の保存（uuid多重集合の不変）・Undo（Ctrl+Z 実キーイベント）による
 * 可逆性・trashセクションのボタン非表示仕様を検証する。
 * サーバーへの書き込みは一切行わない（保存ボタンは押さず、最後にページ再読み込みで
 * メモリ上のデッキ状態を破棄する）。
 *
 * 検証項目:
 *   1. ボタン構造: main/extra/side の h3 内 .section-buttons に .btn-section が2つ
 *      （title="Shuffle" / "Sort"・disabledなし）・枚数バッジ(h3 .count)あり。
 *      trash は v-if="sectionType !== 'trash'" で .section-buttons 自体が描画されず
 *      .btn-section も存在しない（:show-count="false" でバッジもなし）
 *   2. main シャッフル: 順序が変化（同一順序の偶然はリトライで吸収）・
 *      uuid多重集合が不変・枚数/バッジが不変・他セクションの順序に影響しない
 *   3. Ctrl+Z でシャッフル前の順序に戻る
 *   4. main ソート: シャッフル状態から順序が変化・uuid多重集合が不変・
 *      Ctrl+Z でソート前の順序に戻る
 *   5. ソートの決定性: 別のシャッフル状態からソートしても同じ順序になる
 *      （createDeckCardComparator による正規順序）・
 *      履歴を順に全巻き戻しするとロード時の順序に戻る
 *   6. ソート方向トグル（deckLevelSortOrder 既定 toggle-desc かつ
 *      categoryPrioritySortMode 既定 level の場合のみ実行）:
 *      descソート済みの状態で5秒以内に再ソートすると順序が変化（ascへトグル）・
 *      5秒経過後の再ソートで desc に戻る・desc状態で5秒以上経過した再ソートでは
 *      順序が変化しない（TOGGLE_SORT_TIMEOUT_MS=5000 のタイムアウトでトグルしない）
 *   7. extra/side（カード2枚以上ある場合）: シャッフル→Undo・ソート→Undo と
 *      他セクション（main）への影響なしを確認
 *
 * 実装参照:
 *   src/components/DeckSection.vue
 *     (h3 内 v-if="sectionType !== 'trash'" の .section-buttons。
 *      .btn-section[title="Shuffle"]→handleShuffle→deckStore.shuffleSection、
 *      .btn-section[title="Sort"]→handleSort→deckStore.sortSection)
 *   src/stores/deck-edit.ts
 *     (shuffleSection: fisherYatesShuffle で uuid を保持したまま並べ替え・undoは元順序を復元。
 *      sortSection: createDeckCardComparator でソート（方向は resolveEffectiveLevelSortOrder:
 *      deckLevelSortOrder 既定 'toggle-desc' では「descソート済み かつ 前回ソートから
 *      TOGGLE_SORT_TIMEOUT_MS=5000ms 以内」の再クリックなら asc にトグル）。
 *      いずれも type:'reorder' コマンドを pushCommand)
 *   src/composables/deck/useDeckCardSorter.ts
 *     (createDeckCardComparator: カードタイプ→先頭配置→カテゴリ優先→末尾配置→
 *      モンスタータイプ→レベル/ランク/リンク(levelSortOrder)→魔法罠タイプ→カード名昇順)
 *   src/utils/array-shuffle.ts (fisherYatesShuffle: 多重集合を保存した純粋な置換)
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (main/extra/side/trash の DeckSection・trash は :show-count="false"。
 *      セクションは .main-content と RightArea deck-tab の2箇所に存在するため
 *      セレクタは必ず .main-content 配下にスコープ。Ctrl+Z → handleGlobalKeydown → undo)
 *   configs/app-settings.toml
 *     (deckLevelSortOrder 既定 "toggle-desc"・categoryPrioritySortMode 既定 "level")
 *   src/components/DeckCard.vue (.deck-card[data-uuid])
 *
 * 注意: カードのレベル/種族等のソートキー情報は拡張機能ストレージ（chrome.storage）由来で
 * CDP（main world）からは読めないため、ソート順の検証は「決定性（どの入力順から
 * ソートしても同一の正規順序になる）」と「方向トグルによる順序変化」で行う。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// セクションが .main-content と RightArea deck-tab の2箇所に存在するためスコープ
const SCOPE = '.main-content';
const SECTIONS = ['main', 'extra', 'side', 'trash'];

// CDP Input.dispatchKeyEvent の修飾キービットマスク
const MODIFIERS = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

/** 指定セクションのカードuuid順序 */
const orderExpr = (sec) => `(() => {
  const s = document.querySelector('${SCOPE} .deck-section.${sec}-deck');
  if (!s) return null;
  return Array.from(s.querySelectorAll('.card-grid .deck-card')).map(el => el.dataset.uuid);
})()`;

/**
 * 指定セクションのカードcid順序（data-card-id）。
 * 同一cidの重複カード（3枚積み等）は comparator が同一視するため安定ソートの
 * uuid相対順序は入力順依存になる。ソート結果の決定性はcid列で検証する。
 */
const cidOrderExpr = (sec) => `(() => {
  const s = document.querySelector('${SCOPE} .deck-section.${sec}-deck');
  if (!s) return null;
  return Array.from(s.querySelectorAll('.card-grid .deck-card')).map(el => el.dataset.cardId);
})()`;

/** 指定セクションの状態（枚数・バッジ・順序） */
const stateExpr = (sec) => `(() => {
  const s = document.querySelector('${SCOPE} .deck-section.${sec}-deck');
  if (!s) return null;
  const badge = s.querySelector('h3 .count');
  return {
    cards: s.querySelectorAll('.card-grid .deck-card').length,
    badge: badge ? parseInt(badge.textContent, 10) : null,
    order: Array.from(s.querySelectorAll('.card-grid .deck-card')).map(el => el.dataset.uuid)
  };
})()`;

/** 指定セクションの見出しボタン構造 */
const buttonsExpr = (sec) => `(() => {
  const s = document.querySelector('${SCOPE} .deck-section.${sec}-deck');
  if (!s) return null;
  const wrap = s.querySelector('h3 .section-buttons');
  const btns = wrap ? Array.from(wrap.querySelectorAll('.btn-section')) : [];
  const anyBtnInSection = s.querySelectorAll('.btn-section').length;
  return {
    hasWrap: !!wrap,
    btnCount: btns.length,
    anyBtnInSection,
    titles: btns.map(b => b.getAttribute('title')),
    allEnabled: btns.every(b => !b.disabled),
    hasBadge: !!s.querySelector('h3 .count')
  };
})()`;

/** 全セクションのuuid順序（セクション間の影響調査用） */
const ALL_ORDERS_EXPR = `(() => {
  const out = {};
  for (const sec of ${JSON.stringify(SECTIONS)}) {
    const s = document.querySelector('${SCOPE} .deck-section.' + sec + '-deck');
    out[sec] = s ? Array.from(s.querySelectorAll('.card-grid .deck-card')).map(el => el.dataset.uuid) : null;
  }
  return out;
})()`;

/** localStorageミラー（ygoNext:settings）からソート方向関連設定を読む（無ければ null） */
const SORT_SETTINGS_EXPR = `(() => {
  try {
    const raw = localStorage.getItem('ygoNext:settings');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return {
      deckLevelSortOrder: s.deckLevelSortOrder ?? null,
      categoryPrioritySortMode: s.categoryPrioritySortMode ?? null
    };
  } catch (e) { return null; }
})()`;

const clickShuffle = (cdp, sec) => cdp.evaluate(
  `document.querySelector('${SCOPE} .deck-section.${sec}-deck h3 .section-buttons .btn-section[title="Shuffle"]')?.click()`
);
const clickSort = (cdp, sec) => cdp.evaluate(
  `document.querySelector('${SCOPE} .deck-section.${sec}-deck h3 .section-buttons .btn-section[title="Sort"]')?.click()`
);

async function getOrder(cdp, sec) {
  return cdp.evaluate(orderExpr(sec));
}

/** uuid配列の多重集合が一致するか（要素集合の保存確認） */
function sameMultiset(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 順序が期待値と一致するまでポーリング（undo/ソート後のVue再描画待ち） */
async function waitForOrder(cdp, sec, expected, timeout = 5000, interval = 150) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const cur = await cdp.evaluate(orderExpr(sec));
    if (eq(cur, expected)) return true;
    await cdp.wait(interval);
  }
  return false;
}

/** 順序が指定値から変化するまでポーリング（変化後の順序を返す） */
async function waitForOrderChange(cdp, sec, from, timeout = 5000, interval = 150) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await cdp.evaluate(orderExpr(sec));
    if (!eq(last, from)) return last;
    await cdp.wait(interval);
  }
  return null;
}

/** シャッフルをクリックし、順序が変わるまでリトライ（偶然同一順序になる確率を吸収） */
async function shuffleUntilChanged(cdp, sec, before, tries = 5) {
  for (let i = 0; i < tries; i++) {
    await clickShuffle(cdp, sec);
    await cdp.wait(300);
    const cur = await cdp.evaluate(orderExpr(sec));
    if (!eq(cur, before)) return cur;
  }
  return null;
}

/** 実キーイベント（keyDown + keyUp）を送出 */
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

/** フォーカス中の要素を blur（ショートカット有効条件を作る） */
async function blurActiveElement(cdp) {
  await cdp.evaluate(`document.activeElement && document.activeElement.blur()`);
  await cdp.wait(100);
}

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

async function testSectionShuffleSort() {
  console.log('【セクション単位シャッフル/ソートボタン E2Eテスト】\n');
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

    // dno-chip はデッキロード前は '-' 表示のため、ロード完了後に確認する
    const dno = await cdp.evaluate(`document.querySelector('.deck-edit-container .dno-chip')?.textContent || ''`);
    t.assert('固定テスト用デッキ(dno=3)が開かれている', dno.includes('3'));

    const initialMain = await cdp.evaluate(stateExpr('main'));
    const initialAll = await cdp.evaluate(ALL_ORDERS_EXPR);
    console.log('  各セクション枚数:',
      SECTIONS.map(sec => `${sec}=${(initialAll[sec] || []).length}`).join(' / '));

    // ============================================================
    console.log('\n--- 1. セクション見出しのボタン構造 ---');
    // ============================================================
    for (const sec of ['main', 'extra', 'side']) {
      const b = await cdp.evaluate(buttonsExpr(sec));
      t.assert(`${sec} の h3 に .section-buttons が存在`, b && b.hasWrap === true);
      t.assert(`${sec} の .btn-section は2つ（Shuffle/Sort）`, b && b.btnCount === 2);
      t.assert(
        `${sec} のボタンの title が Shuffle/Sort`,
        b && eq(b.titles, ['Shuffle', 'Sort'])
      );
      t.assert(`${sec} のボタンが disabled でない`, b && b.allEnabled === true);
      t.assert(`${sec} に枚数バッジ(h3 .count)がある`, b && b.hasBadge === true);
    }
    const trashBtns = await cdp.evaluate(buttonsExpr('trash'));
    t.assert('trash の h3 に .section-buttons がない（v-if="sectionType !== \'trash\'"）',
      trashBtns && trashBtns.hasWrap === false);
    t.assert('trash に .btn-section が1つも存在しない', trashBtns && trashBtns.anyBtnInSection === 0);
    t.assert('trash に枚数バッジがない（:show-count="false"）', trashBtns && trashBtns.hasBadge === false);

    // ============================================================
    console.log('\n--- 2. main シャッフル: 順序変化 + 要素集合/枚数の保存 ---');
    // ============================================================
    const originalOrder = initialMain.order;
    const shuffled = await shuffleUntilChanged(cdp, 'main', originalOrder);
    t.assert('シャッフルでカード順序が変わる（リトライ吸収済み）', shuffled !== null);
    if (!shuffled) { t.summary(); return; }
    t.assert('シャッフル後も uuid の多重集合が一致（要素集合は不変）', sameMultiset(shuffled, originalOrder));
    const afterShuffleState = await cdp.evaluate(stateExpr('main'));
    t.assert('シャッフル後も枚数が不変', afterShuffleState.cards === initialMain.cards);
    t.assert('シャッフル後も枚数バッジが不変', afterShuffleState.badge === initialMain.badge);
    const afterShuffleAll = await cdp.evaluate(ALL_ORDERS_EXPR);
    t.assert(
      'main のシャッフルで他セクション（extra/side/trash）の順序は変化しない',
      eq(afterShuffleAll.extra, initialAll.extra) &&
      eq(afterShuffleAll.side, initialAll.side) &&
      eq(afterShuffleAll.trash, initialAll.trash)
    );

    // ============================================================
    console.log('\n--- 3. Ctrl+Z でシャッフルが元に戻る（可逆性） ---');
    // ============================================================
    await blurActiveElement(cdp);
    await ctrlZ(cdp);
    const undoneShuffle = await waitForOrder(cdp, 'main', originalOrder);
    t.assert('Ctrl+Z でシャッフル前の順序に戻る', undoneShuffle === true);

    // ============================================================
    console.log('\n--- 4. main ソート: 順序変化 + 要素集合の保存 + Undo ---');
    // ============================================================
    // シャッフル状態からソート（ソート結果が偶然入力順と同一の場合はやり直し）
    let sh1 = await shuffleUntilChanged(cdp, 'main', originalOrder);
    t.assert('ソート検証用のシャッフルで順序が変わる', sh1 !== null);
    let sorted1 = null;
    let sorted1Cids = null;
    for (let i = 0; i < 4 && !sorted1; i++) {
      await clickSort(cdp, 'main');
      sorted1 = await waitForOrderChange(cdp, 'main', sh1, 3000);
      if (!sorted1) {
        // ソート結果 == シャッフル後順序（ほぼ起きない）: undo して別シャッフルで再試行
        await blurActiveElement(cdp);
        await ctrlZ(cdp);
        await waitForOrder(cdp, 'main', sh1);
        sh1 = await shuffleUntilChanged(cdp, 'main', sh1);
      }
    }
    t.assert('シャッフル状態からソートでカード順序が変わる', sorted1 !== null);
    if (!sorted1) { t.summary(); return; }
    sorted1Cids = await cdp.evaluate(cidOrderExpr('main'));
    t.assert('ソート後も uuid の多重集合が一致（要素集合は不変）', sameMultiset(sorted1, originalOrder));

    await blurActiveElement(cdp);
    await ctrlZ(cdp);
    const undoneSort = await waitForOrder(cdp, 'main', sh1);
    t.assert('Ctrl+Z でソート前（シャッフル後）の順序に戻る', undoneSort === true);

    // ============================================================
    console.log('\n--- 5. ソートの決定性と履歴の完全巻き戻し ---');
    // ============================================================
    const sh2 = await shuffleUntilChanged(cdp, 'main', sh1);
    t.assert('別のシャッフルで再度順序が変わる', sh2 !== null);
    await clickSort(cdp, 'main');
    const sorted2 = await waitForOrderChange(cdp, 'main', sh2, 3000);
    t.assert('2回目のソートでも順序が変わる', sorted2 !== null);
    const sorted2Cids = await cdp.evaluate(cidOrderExpr('main'));
    t.assert(
      '別の入力順からソートしても同一の正規順序になる（cid列で比較・ソートの決定性）',
      sorted2Cids !== null && eq(sorted2Cids, sorted1Cids)
    );
    t.assert('2回目のソート後も uuid の多重集合が一致', sorted2 !== null && sameMultiset(sorted2, originalOrder));

    // 履歴を1コマンドずつ巻き戻し、最終的にロード時順序に戻ることを確認。
    // （途中のシャッフル再試行でコマンド数が増える場合もあるため、期待状態の固定列ではなく
    //   「ロード時順序に到達するまで undo を繰り返す」適応的な巻き戻しにする）
    let rewindUndos = 0;
    let rewoundAll = false;
    await blurActiveElement(cdp);
    for (let i = 0; i < 10; i++) {
      if (eq(await getOrder(cdp, 'main'), originalOrder)) { rewoundAll = true; break; }
      await ctrlZ(cdp);
      rewindUndos++;
      await cdp.wait(400);
    }
    if (!rewoundAll) {
      rewoundAll = await waitForOrder(cdp, 'main', originalOrder, 1500);
    }
    t.assert(`連続 Undo で履歴を全巻き戻しロード時順序に戻る（undo ${rewindUndos} 回）`, rewoundAll === true);

    // ============================================================
    console.log('\n--- 6. ソート方向トグル（toggle-desc 既定の場合のみ） ---');
    // ============================================================
    const sortSettings = await cdp.evaluate(SORT_SETTINGS_EXPR);
    const toggleEligible =
      (!sortSettings || (sortSettings.deckLevelSortOrder ?? 'toggle-desc') === 'toggle-desc') &&
      (!sortSettings || (sortSettings.categoryPrioritySortMode ?? 'level') === 'level');
    if (!toggleEligible) {
      console.log(`  ※ トグル検証をスキップ（設定: ${JSON.stringify(sortSettings)}）`);
    } else {
      // シャッフル → ソートで desc 状態を作る
      const shD = await shuffleUntilChanged(cdp, 'main', originalOrder);
      await clickSort(cdp, 'main');
      const descOrder = await waitForOrderChange(cdp, 'main', shD, 3000);
      t.assert('トグル検証準備: シャッフル→ソートで順序が変わる', descOrder !== null);
      if (descOrder) {
        // descソート済みの状態で5秒以内に再ソート → asc へトグル
        await cdp.wait(150);
        await clickSort(cdp, 'main');
        const ascOrder = await waitForOrderChange(cdp, 'main', descOrder, 3000);
        t.assert('descソート済み+5秒以内の再ソートで順序が変化する（ascへトグル）', ascOrder !== null);
        t.assert('トグル後も uuid の多重集合が一致', ascOrder !== null && sameMultiset(ascOrder, originalOrder));

        // 5秒経過後（TOGGLE_SORT_TIMEOUT_MS=5000）の再ソート: asc状態からは desc に戻る
        await cdp.wait(5500);
        await clickSort(cdp, 'main');
        const backToDesc = await waitForOrder(cdp, 'main', descOrder, 3000);
        t.assert('5秒経過後の再ソートで desc 順に戻る', backToDesc === true);

        // desc状態で5秒以上経過して再ソート: タイムアウトで asc にトグルしない（順序不変）
        await cdp.wait(5500);
        await clickSort(cdp, 'main');
        await cdp.wait(800);
        const stayedDesc = await getOrder(cdp, 'main');
        t.assert('desc状態で5秒以上経過した再ソートでは順序が変化しない（トグルしない）',
          eq(stayedDesc, descOrder));
      }
    }

    // ============================================================
    console.log('\n--- 7. extra/side のシャッフル・ソート（2枚以上ある場合） ---');
    // ============================================================
    for (const sec of ['extra', 'side']) {
      const st0 = await cdp.evaluate(stateExpr(sec));
      console.log(`  [${sec}] 枚数: ${st0.cards}`);
      if (!st0.order || st0.order.length < 2) {
        console.log(`  ※ ${sec} はカード2枚未満のためシャッフル/ソート検証をスキップ`);
        continue;
      }
      const o0 = st0.order;

      // シャッフル → Undo
      const beforeAll = await cdp.evaluate(ALL_ORDERS_EXPR);
      const shE = await shuffleUntilChanged(cdp, sec, o0, 8);
      t.assert(`${sec} のシャッフルでカード順序が変わる`, shE !== null);
      t.assert(`${sec} のシャッフル後も uuid の多重集合が一致`, shE !== null && sameMultiset(shE, o0));
      const afterShuffleAllE = await cdp.evaluate(ALL_ORDERS_EXPR);
      t.assert(`${sec} のシャッフルで main の順序は変化しない`, eq(afterShuffleAllE.main, beforeAll.main));
      await blurActiveElement(cdp);
      await ctrlZ(cdp);
      t.assert(`${sec} の Ctrl+Z でシャッフル前の順序に戻る`, await waitForOrder(cdp, sec, o0) === true);

      // ソート → Undo（シャッフル状態からソートして順序変化を確認）
      const shE2 = await shuffleUntilChanged(cdp, sec, o0, 8);
      await clickSort(cdp, sec);
      const sortedE = await waitForOrderChange(cdp, sec, shE2, 3000);
      t.assert(`${sec} のシャッフル状態からソートでカード順序が変わる`, sortedE !== null);
      t.assert(`${sec} のソート後も uuid の多重集合が一致`, sortedE !== null && sameMultiset(sortedE, o0));
      await blurActiveElement(cdp);
      await ctrlZ(cdp);
      const undoneSortE = await waitForOrder(cdp, sec, shE2);
      await ctrlZ(cdp);
      const undoneShuffleE = await waitForOrder(cdp, sec, o0);
      t.assert(`${sec} の Ctrl+Z でソート→シャッフルを巻き戻し元の順序に戻る`,
        undoneSortE === true && undoneShuffleE === true);
    }

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

testSectionShuffleSort();
