/**
 * 設定ダイアログ（SettingsDialog.vue）操作・永続化の E2Eテスト（TASK-454）
 *
 * SettingsDialog.vue の実ブラウザ操作（ダイアログ開閉・タブ切替・テーマ切替）と
 * 設定の永続化（chrome.storage.local + localStorageミラー）を検証する。
 * サーバーへの書き込みは一切行わない（保存ボタンは押さない）。
 *
 * 検証項目:
 *   1. メニュー → Options で設定ダイアログが開く（Settings ヘッダ）
 *   2. タブ構成（General / Deck Edit）と初期タブ（General active）
 *   3. General タブのテーマボタン（Light / Dark / Auto）と現在設定の active 表示
 *   4. close-btn / オーバーレイクリックでダイアログが閉じる
 *   5. Deck Edit タブ切替で画面固有設定（Edit Image Size 等）が表示され General に戻せる
 *   6. テーマ切替で document.documentElement の data-ygo-next-theme が変化する
 *      （.deck-edit-container の同名属性も追従）
 *   7. 切替が永続化される（localStorage ミラー ygoNext:settings の theme が更新 +
 *      リロード後も属性が維持 = chrome.storage ラウンドトリップ）
 *   8. light <-> dark 両方向の切替を検証
 *   9. クリーンアップ: 元のテーマ設定に復元し、リロード後も初期状態と一致することを確認
 *      （theme 以外の設定フィールドが変化していないことも確認）
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     ([data-testid="menu-btn"] → toggleMenu, .menu-item "Options" → handleOptions
 *      → deckStore.showSettingsDialog = true。checkUnsavedChanges を通らないため
 *      未保存確認ダイアログは表示されない）
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (<SettingsDialog :isVisible="deckStore.showSettingsDialog">, defineAsyncComponent,
 *      .deck-edit-container 自身も :data-ygo-next-theme="effectiveTheme" を持つ)
 *   src/components/SettingsDialog.vue
 *     (.dialog-header h2 "Settings", .close-btn, .dialog-tab (General / 画面固有タブ),
 *      .toggle-btn.theme-btn (Light/Dark/Auto, active=appSettings.theme), .setting-block,
 *      deck-edit コンテキストの画面固有タブラベルは "Deck Edit")
 *   src/components/BaseDialog.vue
 *     (Teleport to body → .base-dialog-overlay, closeOnClickOverlay=true)
 *   src/stores/settings.ts
 *     (setTheme: appSettings.theme 変更 → applyTheme → saveSettings,
 *      applyTheme: document.documentElement.setAttribute('data-ygo-next-theme', effective),
 *      effectiveTheme: 'system' は matchMedia で light/dark 解決,
 *      saveSettings: chrome.storage.local(appSettings) + localStorage 'ygoNext:settings' ミラー,
 *      ロード時 loadCommonSettings は chrome.storage.local から読み applyTheme)
 *
 * 注意:
 *   - TopBar は .main-content 内（デスクトップ側）と RightArea の deck-tab 内（モバイル側）
 *     の2箇所に存在するため、メニュー系セレクタは必ず .main-content 配下にスコープする。
 *   - ダイアログは BaseDialog(Teleport to body) 配下のため .main-content 配下には存在しない。
 *   - 拡張機能は content script の isolated world で動作するため window.ygoNextCurrentSettings
 *     は CDP（main world）からは見えないが、localStorage は origin 共有のため読み取れる。
 *   - テーマは「元の設定に必ず復元する」（初期 raw テーマのボタンをクリックして保存し、
 *     リロード後の属性がテスト前と一致することを確認）。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// TopBar は .main-content（デスクトップ）と RightArea（モバイル）に2箇所あるためスコープ必須
const MENU_BTN = '.main-content [data-testid="menu-btn"]';
const MENU_DROPDOWN = '.main-content .menu-dropdown';
// ダイアログは BaseDialog(Teleport to body) 配下。
// SettingsDialog は .dialog-header h2（ConfirmDialog は .dialog-title h3）で識別する
const OVERLAY = '.base-dialog-overlay';
const DIALOG_HEADER = `${OVERLAY} .dialog-header h2`;

// テーマボタン表示ラベル ↔ 設定値（raw テーマ）の対応（SettingsDialog.vue themes 定義）
const THEME_LABEL_TO_VALUE = { Light: 'light', Dark: 'dark', Auto: 'system' };
const THEME_VALUE_TO_LABEL = { light: 'Light', dark: 'Dark', system: 'Auto' };

/** localStorage ミラー（ygoNext:settings）に保存された設定オブジェクト（無ければ null） */
function readStoredSettings(cdp) {
  return cdp.evaluate(`(() => {
    try {
      const s = localStorage.getItem('ygoNext:settings');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  })()`);
}

/** localStorage ミラーの theme が指定値になるまで待機（saveSettings は chrome.storage コールバック内でミラー更新） */
function waitStoredTheme(cdp, value, timeout = 5000) {
  return cdp.waitFor(`(() => {
    try {
      const s = localStorage.getItem('ygoNext:settings');
      return !!s && JSON.parse(s).theme === '${value}';
    } catch (e) { return false; }
  })()`, timeout, 100);
}

/** document.documentElement（html）の data-ygo-next-theme 属性値（実テーマ light/dark） */
function getHtmlTheme(cdp) {
  return cdp.evaluate(`document.documentElement.getAttribute('data-ygo-next-theme')`);
}

/** .deck-edit-container の data-ygo-next-theme 属性値（effectiveTheme バインド） */
function getContainerTheme(cdp) {
  return cdp.evaluate(`document.querySelector('.deck-edit-container')?.getAttribute('data-ygo-next-theme') || null`);
}

/** ダイアログ内テーマボタンの状態（ラベル一覧と active ラベル） */
function getThemeButtonsState(cdp) {
  return cdp.evaluate(`(() => {
    const btns = [...document.querySelectorAll('${OVERLAY} .toggle-btn.theme-btn')];
    if (btns.length === 0) return null;
    const active = btns.find(b => b.classList.contains('active'));
    return { labels: btns.map(b => b.textContent.trim()), activeLabel: active ? active.textContent.trim() : null };
  })()`);
}

/**
 * ハッシュURL（#/ytomo/edit?dno=3）への Page.navigate は同一ページ遷移になるため
 * Vueアプリのストア状態が残る。実リロードが必要な場面では Page.reload を併用する。
 */
async function hardNavigate(cdp, url) {
  await cdp.navigate(url);
  await cdp.wait(500);
  await cdp.sendCommand('Page.reload');
}

/** ページのロード完了を待つ（コンテナ + メニューボタン + テーマ属性適用済み） */
async function waitPageReady(cdp, timeout = 20000) {
  const ready = await cdp.waitFor(
    `document.querySelector('.deck-edit-container') !== null && document.querySelector('${MENU_BTN}') !== null`,
    timeout
  );
  if (!ready) return false;
  // loadCommonSettings → applyTheme で html 属性が付くまで待つ
  return cdp.waitFor(`document.documentElement.getAttribute('data-ygo-next-theme') !== null`, timeout, 200);
}

/**
 * メニュー → Options から設定ダイアログを開く。
 * handleOptions は checkUnsavedChanges を通らないため未保存確認ダイアログは出ない。
 * SettingsDialog は defineAsyncComponent のため chunk ロードを含めて待機。
 */
async function openSettingsDialog(cdp) {
  await cdp.evaluate(`document.querySelector('${MENU_BTN}')?.click()`);
  const menuOpen = await cdp.waitFor(`document.querySelector('${MENU_DROPDOWN}') !== null`, 5000);
  if (!menuOpen) return false;
  const clicked = await cdp.evaluate(`(() => {
    const item = [...document.querySelectorAll('${MENU_DROPDOWN} .menu-item')]
      .find(el => el.textContent.trim() === 'Options');
    if (item) item.click();
    return !!item;
  })()`);
  if (!clicked) return false;
  return cdp.waitFor(`(() => {
    const h = document.querySelector('${DIALOG_HEADER}');
    return h ? h.textContent.trim() === 'Settings' : false;
  })()`, 10000, 100);
}

/** ダイアログが閉じる（Transition 0.15s 含む）まで待機 */
function waitDialogClosed(cdp, timeout = 3000) {
  return cdp.waitFor(`document.querySelector('${OVERLAY}') === null`, timeout, 100);
}

/** ダイアログ内のテーマボタン（Light/Dark/Auto）をクリック */
function clickThemeBtn(cdp, label) {
  return cdp.evaluate(`(() => {
    const btn = [...document.querySelectorAll('${OVERLAY} .toggle-btn.theme-btn')]
      .find(b => b.textContent.trim() === '${label}');
    if (btn) btn.click();
    return !!btn;
  })()`);
}

/** ダイアログタブ（General / Deck Edit）を切り替え */
function clickDialogTab(cdp, label) {
  return cdp.evaluate(`(() => {
    const tab = [...document.querySelectorAll('${OVERLAY} .dialog-tab')]
      .find(el => el.textContent.trim() === '${label}');
    if (tab) tab.click();
    return !!tab;
  })()`);
}

/** ダイアログ内の .block-title テキスト一覧（表示中タブの設定ブロック群） */
function getBlockTitles(cdp) {
  return cdp.evaluate(
    `[...document.querySelectorAll('${OVERLAY} .setting-block .block-title')].map(el => el.textContent.trim())`
  );
}

/**
 * 初期と復元後の設定オブジェクトを比較し、両方に存在するキーの値が変わっていないか検査する。
 * （chrome.storage の古い保存形式 → マージ後の差分は「追加/削除キー」として情報表示のみ。
 *   両方に存在するキーの値の違いはテスト失敗扱い = theme 以外を壊していないことの検証）
 */
function collectSettingDiffs(initial, restored) {
  const valueDiffs = [];
  const addedKeys = [];
  const removedKeys = [];
  function walk(a, b, path) {
    if (b === undefined) { if (path) removedKeys.push(path); return; }
    if (a === undefined) { if (path) addedKeys.push(path); return; }
    const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    if (isObject(a) && isObject(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) walk(a[k], b[k], path ? `${path}.${k}` : k);
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) valueDiffs.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
  walk(initial || {}, restored || {}, '');
  return { valueDiffs, addedKeys, removedKeys };
}

async function testSettings() {
  console.log('【設定ダイアログ E2Eテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('固定テスト用デッキ(dno=3)の編集ページにアクセス中（ログイン済み前提）...');
    await hardNavigate(cdp, EDIT_URL);
    const loaded = await waitPageReady(cdp);
    t.assert('編集ページがロードされる', loaded === true);
    if (!loaded) {
      console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
      t.summary();
      return;
    }

    // ============================================================
    console.log('\n--- 1. ダイアログを開く ---');
    // ============================================================
    const opened = await openSettingsDialog(cdp);
    t.assert('メニューの Options で設定ダイアログが開く', opened === true);
    if (!opened) { t.summary(); return; }

    const header = await cdp.evaluate(`document.querySelector('${DIALOG_HEADER}')?.textContent.trim()`);
    t.assert('ヘッダが「Settings」', header === 'Settings');

    // テスト前の状態を記録（復元用）
    const initialHtmlTheme = await getHtmlTheme(cdp);
    const initialStored = await readStoredSettings(cdp);
    const initialRawTheme = initialStored ? initialStored.theme : null;
    console.log(`  初期状態: html属性=${initialHtmlTheme}, 保存rawテーマ=${initialRawTheme || '(ミラーなし)'}`);

    // ============================================================
    console.log('\n--- 2. タブ構成と General タブ初期状態 ---');
    // ============================================================
    const tabs = await cdp.evaluate(
      `[...document.querySelectorAll('${OVERLAY} .dialog-tab')].map(el => ({ text: el.textContent.trim(), active: el.classList.contains('active') }))`
    );
    t.assert(
      'タブは General / Deck Edit の2つ（編集ページは deck-edit コンテキスト）',
      tabs.length === 2 && tabs[0].text === 'General' && tabs[1].text === 'Deck Edit'
    );
    t.assert('初期タブは General', tabs[0].active === true && tabs[1].active === false);

    const themeBtns = await getThemeButtonsState(cdp);
    t.assert(
      'テーマボタン Light / Dark / Auto が表示される',
      themeBtns !== null && JSON.stringify(themeBtns.labels) === JSON.stringify(['Light', 'Dark', 'Auto'])
    );
    if (initialRawTheme) {
      t.assert(
        `現在のテーマ設定（${initialRawTheme}）のボタンが active`,
        themeBtns.activeLabel === THEME_VALUE_TO_LABEL[initialRawTheme]
      );
    }
    // ミラーが無い場合の復元用に、最初に開いた時点の active ラベル（= 初期 raw テーマ）を記録
    const initialActiveLabel = themeBtns ? themeBtns.activeLabel : null;

    const generalBlocks = await getBlockTitles(cdp);
    t.assert(
      'General タブに Theme / Right Area Width 等のブロックがある',
      generalBlocks.includes('Theme') && generalBlocks.includes('Right Area Width') &&
      generalBlocks.includes('Right Area Font') && generalBlocks.includes('Dialog Font')
    );

    // ============================================================
    console.log('\n--- 3. close-btn でダイアログを閉じる ---');
    // ============================================================
    await cdp.evaluate(`document.querySelector('${OVERLAY} .dialog-header .close-btn')?.click()`);
    const closedByBtn = await waitDialogClosed(cdp);
    t.assert('close-btn クリックでダイアログが閉じる', closedByBtn === true);

    // --- 再オープンしてオーバーレイクリックでのクローズを確認 ---
    const reopened = await openSettingsDialog(cdp);
    t.assert('ダイアログを再オープンできる', reopened === true);
    await cdp.evaluate(`document.querySelector('${OVERLAY}')?.click()`);
    const closedByOverlay = await waitDialogClosed(cdp);
    t.assert('オーバーレイクリックでダイアログが閉じる', closedByOverlay === true);

    // ============================================================
    console.log('\n--- 4. Deck Edit タブ（画面固有設定）---');
    // ============================================================
    await openSettingsDialog(cdp);
    const switched = await clickDialogTab(cdp, 'Deck Edit');
    await cdp.wait(200);
    const screenBlocks = await getBlockTitles(cdp);
    t.assert('Deck Edit タブに切り替えられる', switched === true);
    t.assert(
      'deck-edit コンテキストの設定ブロック（Edit Image Size / Search Position / Extra/Side / Export Timestamp）が表示される',
      ['Edit Image Size', 'Search Position', 'Extra/Side', 'Export Timestamp']
        .every(title => screenBlocks.includes(title))
    );
    t.assert('Deck Edit タブでは Theme ブロックは表示されない', !screenBlocks.includes('Theme'));

    const backToGeneral = await clickDialogTab(cdp, 'General');
    await cdp.wait(200);
    const generalBlocksAgain = await getBlockTitles(cdp);
    t.assert('General タブに戻せる（Theme ブロックが再表示）', backToGeneral === true && generalBlocksAgain.includes('Theme'));

    // ============================================================
    console.log('\n--- 5. テーマ切替 → まず現在と逆の明示テーマへ ---');
    // ============================================================
    // 初期実テーマ（initialHtmlTheme）と逆の明示テーマ（light/dark）に切り替える。
    // 双方向検証のため、Phase A: 逆テーマ → Phase B: もとの実テーマ側の明示テーマ、と続ける。
    const firstTarget = initialHtmlTheme === 'dark' ? 'Light' : 'Dark';
    const firstTargetValue = THEME_LABEL_TO_VALUE[firstTarget];
    const oppositeHtmlTheme = firstTargetValue; // 明示テーマなので実テーマ == 設定値

    const clickedFirst = await clickThemeBtn(cdp, firstTarget);
    await cdp.wait(200);
    t.assert(`${firstTarget} ボタンをクリックできる`, clickedFirst === true);

    const htmlThemeAfterFirst = await getHtmlTheme(cdp);
    t.assert(
      `クリック直後に html の data-ygo-next-theme が「${oppositeHtmlTheme}」に変化する`,
      htmlThemeAfterFirst === oppositeHtmlTheme
    );
    const containerThemeAfterFirst = await getContainerTheme(cdp);
    t.assert(
      `.deck-edit-container の data-ygo-next-theme も「${oppositeHtmlTheme}」に追従する`,
      containerThemeAfterFirst === oppositeHtmlTheme
    );

    const btnsAfterFirst = await getThemeButtonsState(cdp);
    t.assert(
      `active なテーマボタンが「${firstTarget}」に切り替わる`,
      btnsAfterFirst !== null && btnsAfterFirst.activeLabel === firstTarget
    );

    const storedAfterFirst = await waitStoredTheme(cdp, firstTargetValue);
    t.assert(
      `localStorage ミラー（ygoNext:settings）の theme が「${firstTargetValue}」に保存される`,
      storedAfterFirst === true
    );

    // --- リロード後も維持される（chrome.storage.local → loadCommonSettings → applyTheme の実永続化経路） ---
    await hardNavigate(cdp, EDIT_URL);
    const reloaded1 = await waitPageReady(cdp);
    t.assert('リロード後にページがロードされる', reloaded1 === true);
    const htmlThemeAfterReload1 = await getHtmlTheme(cdp);
    t.assert(
      `リロード後も html の data-ygo-next-theme が「${oppositeHtmlTheme}」に維持される（chrome.storage 永続化）`,
      htmlThemeAfterReload1 === oppositeHtmlTheme
    );

    // ============================================================
    console.log('\n--- 6. 逆方向のテーマ切替 ---');
    // ============================================================
    const secondTarget = firstTarget === 'Dark' ? 'Light' : 'Dark';
    const secondTargetValue = THEME_LABEL_TO_VALUE[secondTarget];

    const reopenedForSecond = await openSettingsDialog(cdp);
    t.assert('逆方向切替用にダイアログを開く', reopenedForSecond === true);
    const clickedSecond = await clickThemeBtn(cdp, secondTarget);
    await cdp.wait(200);
    t.assert(`${secondTarget} ボタンをクリックできる`, clickedSecond === true);

    const htmlThemeAfterSecond = await getHtmlTheme(cdp);
    t.assert(
      `html の data-ygo-next-theme が「${secondTargetValue}」に変化する`,
      htmlThemeAfterSecond === secondTargetValue
    );
    const storedAfterSecond = await waitStoredTheme(cdp, secondTargetValue);
    t.assert(
      `localStorage ミラーの theme が「${secondTargetValue}」に保存される`,
      storedAfterSecond === true
    );

    await hardNavigate(cdp, EDIT_URL);
    const reloaded2 = await waitPageReady(cdp);
    t.assert('逆方向切替後にリロードしてもページがロードされる', reloaded2 === true);
    const htmlThemeAfterReload2 = await getHtmlTheme(cdp);
    t.assert(
      `リロード後も html の data-ygo-next-theme が「${secondTargetValue}」に維持される`,
      htmlThemeAfterReload2 === secondTargetValue
    );

    // ============================================================
    console.log('\n--- 7. クリーンアップ: 元のテーマ設定に復元 ---');
    // ============================================================
    // 元の raw テーマ（light/dark/system）に戻す。ミラーがない場合は
    // テスト冒頭で開いたダイアログの active ラベルから初期 raw テーマを用いる。
    let restoreValue = initialRawTheme;
    if (!restoreValue && initialActiveLabel) {
      restoreValue = THEME_LABEL_TO_VALUE[initialActiveLabel];
    }
    const restoreLabel = restoreValue ? THEME_VALUE_TO_LABEL[restoreValue] : null;
    t.assert(
      `復元対象の元テーマ設定を特定できる（${restoreValue || '不明'}）`,
      restoreLabel !== null
    );

    if (restoreLabel) {
      const reopenedForRestore = await openSettingsDialog(cdp);
      t.assert('復元用にダイアログを開く', reopenedForRestore === true);
      const clickedRestore = await clickThemeBtn(cdp, restoreLabel);
      await cdp.wait(200);
      t.assert(`元のテーマボタン（${restoreLabel}）をクリックできる`, clickedRestore === true);

      const storedRestored = await waitStoredTheme(cdp, restoreValue);
      t.assert(`localStorage ミラーの theme が「${restoreValue}」に復元される`, storedRestored === true);

      // --- 復元をリロードして確認（chrome.storage 側も元に戻っていること） ---
      await hardNavigate(cdp, EDIT_URL);
      const reloaded3 = await waitPageReady(cdp);
      t.assert('復元確認用にリロードしてもページがロードされる', reloaded3 === true);
      const finalHtmlTheme = await getHtmlTheme(cdp);
      t.assert(
        `リロード後の html 属性がテスト前（${initialHtmlTheme}）と一致し復元されている`,
        finalHtmlTheme === initialHtmlTheme
      );

      const finalStored = await readStoredSettings(cdp);
      t.assert(
        `リロード後の保存 theme がテスト前（${restoreValue}）と一致する`,
        finalStored !== null && finalStored.theme === restoreValue
      );

      // theme 以外の設定が変化していないことの検証
      // （両方に存在するキーの値違いは失敗。片方にしか無いキーは旧形式マージ差分として情報表示のみ）
      const diffs = collectSettingDiffs(initialStored, finalStored);
      if (diffs.addedKeys.length > 0) console.log(`  [info] 復元後に追加されたキー（デフォルトマージ）: ${diffs.addedKeys.join(', ')}`);
      if (diffs.removedKeys.length > 0) console.log(`  [info] 復元後に存在しないキー（旧形式マイグレーション）: ${diffs.removedKeys.join(', ')}`);
      t.assert(
        `theme 以外の設定値は変化していない（値の違い: ${diffs.valueDiffs.length} 件）`,
        diffs.valueDiffs.length === 0
      );
      if (diffs.valueDiffs.length > 0) console.log(`  [diff] ${diffs.valueDiffs.join(' / ')}`);
    }

    // --- 後始末: 保存は一切行っていない（デッキには触れていない）。実リロードで終了 ---
    console.log('\n--- クリーンアップ完了（テーマ設定は初期状態に復元済み） ---');
    await hardNavigate(cdp, EDIT_URL);
    t.assert('例外なく完了', true);
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

testSettings();
