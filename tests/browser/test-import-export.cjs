/**
 * Import / Export ダイアログ操作の E2Eテスト（TASK-453）
 *
 * ImportExportDialog.vue の実ブラウザ操作（ダイアログ開閉・インポート・エクスポート）を検証する。
 * サーバーへの書き込みは一切行わない（保存ボタンは押さず、最後にページ再読み込みで
 * メモリ上のデッキ状態を破棄する）。エクスポートのダウンロード検証は
 * Browser.setDownloadBehavior で tmp/ 配下の一時ディレクトリを指定し、
 * 生成されたファイルの内容がプレビューと一致することを確認する。
 *
 * 検証項目:
 *   1. メニュー → Import / Export でダイアログが開く（Import タブ初期表示）
 *   2. Import タブ初期状態（ファイル未選択・プレビュー待ち表示・Importボタン disabled）
 *   3. close-btn / オーバーレイクリックでダイアログが閉じる
 *   4. Export タブのUI（CSV/TXTサブタブ・Side Deckトグル・プレビュー・カラムピル・ファイル名入力）
 *   5. CSVプレビューの合計枚数がデッキのカード数（main+extra+side）と一致
 *   6. Side Deckトグルで side 行の含有が切り替わる
 *   7. カラムピル（Name=非必須）のON/OFFでヘッダが変化・必須列ピルは required クラスを持つ
 *   8. TXT形式プレビュー（=== Main Deck 等のセクションヘッダ）
 *   9. Download で CSV / TXT ファイルがダウンロードされ内容がプレビューと完全一致
 *  10. 空ファイル → エラーメッセージ表示（Importボタン disabled のまま）
 *  11. 必須列欠損CSV → エラーメッセージ表示（Importボタン disabled のまま）
 *  12. 未対応形式(.json) → エラーメッセージ表示（Importボタン disabled のまま）
 *  13. 正常CSV（デッキ内カード2枚 + 不正cid行1行）→ 警告表示・プレビュー枚数・Import有効化
 *  14. Import実行（replace）→ ダイアログ閉鎖・メインデッキが2枚に置換・トースト表示
 *
 * 実装参照:
 *   src/components/DeckEditTopBar.vue
 *     ([data-testid="menu-btn"] → toggleMenu, [data-testid="import-export-deck-btn"]
 *      → handleImportExportClick → checkUnsavedChanges → deckStore.showImportDialog = true)
 *   src/content/edit-ui/DeckEditLayout.vue
 *     (<ImportExportDialog :isVisible="deckStore.showImportDialog || deckStore.showExportDialog">,
 *      BaseDialog は body 直下へ Teleport されるため .base-dialog-overlay 配下を参照,
 *      handleImported: replace でデッキクリア → resolveCard → addCard → トースト)
 *   src/components/ImportExportDialog.vue
 *     (.dialog-tab, input.file-input(@change="handleFileSelect"), .file-select-btn, .error-message,
 *      .warnings, .btn-import(:disabled="!previewInfo"), .export-tabs-row .sub-tab-btn,
 *      .toggle-pill-success, .column-pill(.required), textarea.export-preview, #filename-input,
 *      .btn-export → handleExport → downloadFile / downloadDeckAsTXT)
 *   src/utils/deck-import.ts
 *     (importDeckFromFile: 拡張子で自動判定, importFromCSV: 空データ/必須列欠損エラー)
 *   src/utils/deck-export.ts
 *     (generateExportRows: tempCardDBからカード名を解決, downloadFile: Blob + <a download>)
 *
 * 注意: TopBar は .main-content 内（デスクトップ側）と RightArea の deck-tab 内（モバイル側）
 * の2箇所に存在するため、メニュー系セレクタは必ず .main-content 配下にスコープする。
 * 一方ダイアログは Teleport で body 直下に配置されるため .main-content 配下には存在しない。
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');
const fs = require('fs');
const path = require('path');

// 固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317。既存テストと同じURL）
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=3';

// テスト用 fixture・ダウンロードの一時ディレクトリ（tmp/ は .gitignore 済み）
const WORK_DIR = path.join(process.cwd(), 'tmp', 'e2e-import-export');
const DL_DIR = path.join(WORK_DIR, 'downloads');

// TopBar は .main-content（デスクトップ）と RightArea（モバイル）に2箇所あるためスコープ必須
const MENU_BTN = '.main-content [data-testid="menu-btn"]';
const MENU_DROPDOWN = '.main-content .menu-dropdown';
const IE_MENU_ITEM = '.main-content [data-testid="import-export-deck-btn"]';
// ダイアログは BaseDialog(Teleport to body) 配下。
// ConfirmDialog（未保存確認）も同じ .base-dialog-overlay を使うため、
// ImportExportDialog 側は .dialog-header h2（ConfirmDialog は .dialog-title h3）で識別する
const OVERLAY = '.base-dialog-overlay';
const DIALOG_HEADER = `${OVERLAY} .dialog-header h2`;
const FILE_INPUT = `${OVERLAY} input.file-input`;
const DL_FILENAME_BASE = 'e2e-ie-test';

/** デッキ各セクションのカード枚数（DOM上の .deck-card 要素数 = 枚数） */
const DECK_COUNTS_EXPR = `(() => {
  const get = (sec) => {
    const s = document.querySelector('.main-content .deck-section.' + sec + '-deck');
    return s ? s.querySelectorAll('.card-grid .deck-card').length : -1;
  };
  const badge = document.querySelector('.main-content .deck-section.main-deck h3 .count');
  return { main: get('main'), extra: get('extra'), side: get('side'),
           badge: badge ? parseInt(badge.textContent, 10) : null };
})()`;

/** Import タブの状態（ファイル名表示・エラー・警告・プレビュー枚数・Importボタン） */
const IMPORT_STATE_EXPR = `(() => {
  const name = document.querySelector('${OVERLAY} .file-name');
  const placeholder = document.querySelector('${OVERLAY} .file-name.placeholder');
  const err = document.querySelector('${OVERLAY} .error-message');
  const warn = document.querySelector('${OVERLAY} .warnings');
  const counts = [...document.querySelectorAll('${OVERLAY} .preview-counts .count-value')]
    .map(el => el.textContent.trim());
  const importBtn = document.querySelector('${OVERLAY} .btn-import');
  const idle = document.querySelector('${OVERLAY} .preview-image-placeholder-text');
  return {
    fileName: name ? name.textContent.trim() : null,
    hasPlaceholder: !!placeholder,
    error: err ? err.textContent.trim() : null,
    warnings: warn ? warn.textContent : null,
    counts,
    importDisabled: importBtn ? importBtn.disabled : null,
    idleText: idle ? idle.textContent.trim() : null
  };
})()`;

/** Export タブの状態（プレビュー内容・サブタブ・ピル・トグル・ファイル名） */
const EXPORT_STATE_EXPR = `(() => {
  const ta = document.querySelector('${OVERLAY} textarea.export-preview');
  const pills = [...document.querySelectorAll('${OVERLAY} .column-toggle-row .column-pill')]
    .map(el => ({ text: el.textContent.trim(), active: el.classList.contains('active'),
                  required: el.classList.contains('required') }));
  const side = document.querySelector('${OVERLAY} .toggle-pill-success');
  const filename = document.querySelector('${OVERLAY} #filename-input');
  const dlBtn = document.querySelector('${OVERLAY} .btn-export');
  const txtActive = [...document.querySelectorAll('${OVERLAY} .export-tabs-row .sub-tab-btn')]
    .find(el => el.textContent.trim() === 'TXT');
  return {
    preview: ta ? ta.value : null,
    pills,
    sideActive: side ? side.classList.contains('active') : null,
    filename: filename ? filename.value : null,
    downloadExists: !!dlBtn,
    txtTabActive: txtActive ? txtActive.classList.contains('active') : false
  };
})()`;

/**
 * ハッシュURL（#/ytomo/edit?dno=3）への Page.navigate は同一ページ遷移になるため
 * Vueアプリのストア状態が残る。実リロードが必要な場面では Page.reload を併用する。
 */
async function hardNavigate(cdp, url) {
  await cdp.navigate(url);
  await cdp.wait(500);
  await cdp.sendCommand('Page.reload');
}

/**
 * メニュー → Import / Export からダイアログを開く。
 * デッキに未保存の変更がある場合は checkUnsavedChanges により未保存確認ダイアログ
 * （ConfirmDialog / .dialog-title「未保存の変更があります」）が先に表示されるため、
 * 「保存せず続ける」で続行する（保存して続けるは押さない＝サーバーへ書き込まない）。
 */
async function openDialog(cdp) {
  await cdp.evaluate(`document.querySelector('${MENU_BTN}')?.click()`);
  const menuOpen = await cdp.waitFor(`document.querySelector('${MENU_DROPDOWN}') !== null`, 5000);
  if (!menuOpen) return false;
  await cdp.evaluate(`document.querySelector('${IE_MENU_ITEM}')?.click()`);
  // ImportExportDialog は defineAsyncComponent のため chunk ロードを含めて待機
  const which = await cdp.waitFor(`(() => {
    const title = document.querySelector('${OVERLAY} .dialog-title');
    if (title && title.textContent.includes('未保存の変更')) return 'confirm';
    if (document.querySelector('${DIALOG_HEADER}')) return 'dialog';
    return false;
  })()`, 10000, 100);
  if (which === 'confirm') {
    await cdp.evaluate(`(() => {
      const btn = [...document.querySelectorAll('${OVERLAY} .dialog-footer .btn')]
        .find(b => b.textContent.trim() === '保存せず続ける');
      if (btn) btn.click();
      return !!btn;
    })()`);
    return cdp.waitFor(`document.querySelector('${DIALOG_HEADER}') !== null`, 5000);
  }
  return which === 'dialog';
}

/** ダイアログが閉じる（Transition 0.15s 含む）まで待機 */
function waitDialogClosed(cdp, timeout = 3000) {
  return cdp.waitFor(`document.querySelector('${OVERLAY}') === null`, timeout, 100);
}

/** ダイアログタブ（Import / Export）を切り替え */
function clickDialogTab(cdp, label) {
  return cdp.evaluate(`(() => {
    const tab = [...document.querySelectorAll('${OVERLAY} .dialog-tab')]
      .find(el => el.textContent.trim() === '${label}');
    if (tab) tab.click();
    return !!tab;
  })()`);
}

/** Export 内の形式サブタブ（CSV / TXT）を切り替え */
function clickFormatTab(cdp, label) {
  return cdp.evaluate(`(() => {
    const tab = [...document.querySelectorAll('${OVERLAY} .export-tabs-row .sub-tab-btn')]
      .find(el => el.textContent.trim() === '${label}');
    if (tab) tab.click();
    return !!tab;
  })()`);
}

/** 非表示の <input type="file"> に CDP でファイルを設定（change イベントが発火する） */
async function setFileInput(cdp, filePath) {
  // cdp-helper の sendCommand は CDP の生メッセージ（{id, result} / {id, error}）を返すため
  // result 配下を参照する
  const doc = await cdp.sendCommand('DOM.getDocument', {});
  const rootId = doc && doc.result && doc.result.root && doc.result.root.nodeId;
  if (!rootId) return false;
  const node = await cdp.sendCommand('DOM.querySelector', {
    nodeId: rootId,
    selector: FILE_INPUT
  });
  const nodeId = node && node.result && node.result.nodeId;
  if (!nodeId) return false;
  const res = await cdp.sendCommand('DOM.setFileInputFiles', {
    files: [filePath],
    nodeId
  });
  return !(res && res.error);
}

/**
 * ファイル選択 → インポート処理（非同期）完了後のエラー/警告表示を待って状態を返す。
 * 前回選択時のエラー表示が残っている可能性があるため、
 * 「ファイル名が今回のものに変わった後で」エラー or プレビュー枚数が出るまで待つ。
 */
async function importFileAndWait(cdp, filePath, timeout = 6000) {
  const expectedName = path.basename(filePath);
  const ok = await setFileInput(cdp, filePath);
  if (!ok) return { setFailed: true };
  const state = await cdp.waitFor(`(() => {
    const s = ${IMPORT_STATE_EXPR};
    return (s.fileName === '${expectedName}' && (s.error !== null || s.counts.length > 0)) ? s : false;
  })()`, timeout, 150);
  return { setFailed: false, state };
}

/** CSVプレビュー text を解析（ヘッダ・行数・数量合計・side行数） */
function parseCsvPreview(text) {
  const lines = text.split('\n');
  const header = lines[0] || '';
  const rows = lines.slice(1).filter(l => l.length > 0);
  const qtySum = rows.reduce((sum, l) => {
    const q = parseInt(l.split(',').pop(), 10);
    return sum + (isNaN(q) ? 0 : q);
  }, 0);
  return { header, rowCount: rows.length, qtySum, sideRows: rows.filter(l => l.startsWith('side,')).length };
}

/** ファイル名入力（v-model）を設定 */
function setFilename(cdp, value) {
  return cdp.evaluate(`(() => {
    const input = document.querySelector('${OVERLAY} #filename-input');
    if (!input) return false;
    input.value = '${value}';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

/** Download ボタンをクリック */
function clickDownload(cdp) {
  return cdp.evaluate(`document.querySelector('${OVERLAY} .btn-export')?.click()`);
}

/** ダウンロード完了をポーリング（.crdownload 消失確認つき） */
async function waitForDownloadFile(fileName, timeout = 8000) {
  const target = path.join(DL_DIR, fileName);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (fs.existsSync(target)) {
        const entries = fs.readdirSync(DL_DIR);
        const downloading = entries.some(e => e.startsWith(fileName) && e.endsWith('.crdownload'));
        if (!downloading) return target;
      }
    } catch (_) { /* ディレクトリ未作成の場合はリトライ */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

/** ダウンロード保存先を CDP に設定（Browser ドメイン不可なら Page ドメインにフォールバック） */
async function enableDownloads(cdp, t) {
  let res = await cdp.sendCommand('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: DL_DIR
  });
  if (res.error) {
    res = await cdp.sendCommand('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DL_DIR
    });
  }
  t.assert('ダウンロード保存先を設定（Browser/Page.setDownloadBehavior）', !res.error);
  return !res.error;
}

/** テスト用 fixture ファイルを作成 */
function setupFixtures() {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(DL_DIR, { recursive: true });
  // 空ファイル（0バイト）: readFileAsText の結果が空 → importDeckFromFile の catch 経由でエラー
  fs.writeFileSync(path.join(WORK_DIR, 'empty.csv'), '');
  // ヘッダに section はあるが cid / quantity が無い → 「必須列（section, cid, quantity）が不足」エラー
  fs.writeFileSync(path.join(WORK_DIR, 'bad-header.csv'), 'section,name\nmain,Test\n');
  // 拡張子が未対応（.json）→「サポートされていないファイル形式」エラー
  fs.writeFileSync(path.join(WORK_DIR, 'invalid.json'), '{"foo":"bar"}\n');
  return {
    empty: path.join(WORK_DIR, 'empty.csv'),
    badHeader: path.join(WORK_DIR, 'bad-header.csv'),
    invalid: path.join(WORK_DIR, 'invalid.json')
  };
}

async function testImportExport() {
  console.log('【Import / Export ダイアログ E2Eテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();
  const fixtures = setupFixtures();

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

    // メインデッキのカードが描画されるまで待機（エクスポート内容の比較基准としても使用）
    const cardsReady = await cdp.waitFor(
      `document.querySelectorAll('.main-content .deck-section.main-deck .card-grid .deck-card').length > 10`,
      15000
    );
    t.assert('メインデッキのカードが表示される', cardsReady === true);
    if (!cardsReady) { t.summary(); return; }

    const initialCounts = await cdp.evaluate(DECK_COUNTS_EXPR);
    console.log(`  デッキ枚数: main=${initialCounts.main} extra=${initialCounts.extra} side=${initialCounts.side}`);
    const totalWithSide = initialCounts.main + initialCounts.extra + initialCounts.side;

    const dlReady = await enableDownloads(cdp, t);
    if (!dlReady) { t.summary(); return; }

    // ============================================================
    console.log('\n--- 1. ダイアログを開く（Import タブ初期表示） ---');
    // ============================================================
    const opened = await openDialog(cdp);
    t.assert('メニューの Import / Export でダイアログが開く', opened === true);
    if (!opened) { t.summary(); return; }

    const header = await cdp.evaluate(`document.querySelector('${DIALOG_HEADER}')?.textContent`);
    t.assert('ヘッダが「Import / Export」', header === 'Import / Export');

    // ============================================================
    console.log('\n--- 2. Import タブの初期状態 ---');
    // ============================================================
    const importTabActive = await cdp.evaluate(
      `(() => { const tab = [...document.querySelectorAll('${OVERLAY} .dialog-tab')].find(el => el.textContent.trim() === 'Import'); return tab ? tab.classList.contains('active') : false; })()`
    );
    t.assert('初期タブは Import', importTabActive === true);

    const initialState = await cdp.evaluate(IMPORT_STATE_EXPR);
    t.assert('ファイル未選択のプレースホルダが表示される', initialState.hasPlaceholder === true);
    t.assert('プレビュー欄に待機メッセージが表示される', initialState.idleText === 'Preview will appear here');
    t.assert('ファイル未選択では Import ボタンが disabled', initialState.importDisabled === true);
    t.assert('初期状態でエラーは表示されない', initialState.error === null);

    // ============================================================
    console.log('\n--- 3. close-btn でダイアログを閉じる ---');
    // ============================================================
    await cdp.evaluate(`document.querySelector('${OVERLAY} .dialog-header .close-btn')?.click()`);
    const closedByBtn = await waitDialogClosed(cdp);
    t.assert('close-btn クリックでダイアログが閉じる', closedByBtn === true);

    // --- 再オープンしてオーバーレイクリックでのクローズを確認 ---
    const reopened = await openDialog(cdp);
    t.assert('ダイアログを再オープンできる', reopened === true);
    await cdp.evaluate(`document.querySelector('${OVERLAY}')?.click()`);
    const closedByOverlay = await waitDialogClosed(cdp);
    t.assert('オーバーレイクリックでダイアログが閉じる', closedByOverlay === true);

    // ============================================================
    console.log('\n--- 4. Export タブのUI構成 ---');
    // ============================================================
    const openedForExport = await openDialog(cdp);
    t.assert('検証用にダイアログを開く', openedForExport === true);
    const switched = await clickDialogTab(cdp, 'Export');
    const exportUi = await cdp.waitFor(
      `document.querySelector('${OVERLAY} textarea.export-preview') !== null`, 5000
    );
    t.assert('Export タブに切り替えられる', switched === true && exportUi === true);

    const csvState = await cdp.evaluate(EXPORT_STATE_EXPR);
    t.assert('CSV形式が初期選択されている（TXTタブは非active）', csvState.txtTabActive === false);
    t.assert('CSVプレビューのヘッダが全カラム順', csvState.preview && parseCsvPreview(csvState.preview).header === 'section,name,cid,ciid,enc,quantity');
    const csvParsed = parseCsvPreview(csvState.preview || '');
    t.assert('CSVプレビューに行が存在する', csvParsed.rowCount > 0);
    t.assert(
      `CSVプレビューの合計枚数がデッキ枚数と一致（${csvParsed.qtySum} === ${totalWithSide}）`,
      csvParsed.qtySum === totalWithSide
    );
    t.assert('Side Deckトグルは初期ON（active）', csvState.sideActive === true);
    t.assert('カラムピルが6つ表示される', csvState.pills.length === 6);
    t.assert(
      '必須列（Section/CID/Qty）ピルは required クラスを持つ',
      ['Section', 'CID', 'Qty'].every(label =>
        csvState.pills.some(p => p.text === label && p.required === true))
    );
    t.assert('Download ボタンが存在する', csvState.downloadExists === true);
    t.assert(
      'ファイル名が自動生成されている（デッキ名/デッキ番号+タイムスタンプ）',
      typeof csvState.filename === 'string' && csvState.filename.length > 0
    );

    // ============================================================
    console.log('\n--- 5. Side Deck トグル ---');
    // ============================================================
    await cdp.evaluate(`document.querySelector('${OVERLAY} .toggle-pill-success')?.click()`);
    await cdp.wait(200);
    const noSideState = await cdp.evaluate(EXPORT_STATE_EXPR);
    const noSideParsed = parseCsvPreview(noSideState.preview || '');
    t.assert('Side Deckトグルで active が外れる', noSideState.sideActive === false);
    t.assert(
      `Side Deck OFF で side 行が消える（${noSideParsed.sideRows} 行）`,
      noSideParsed.sideRows === 0
    );
    t.assert(
      `Side Deck OFF の合計枚数が main+extra と一致（${noSideParsed.qtySum} === ${initialCounts.main + initialCounts.extra}）`,
      noSideParsed.qtySum === initialCounts.main + initialCounts.extra
    );
    // 後続の検証のため元に戻す
    await cdp.evaluate(`document.querySelector('${OVERLAY} .toggle-pill-success')?.click()`);
    await cdp.wait(200);

    // ============================================================
    console.log('\n--- 6. カラムピル（Name）のON/OFF ---');
    // ============================================================
    const namePillClicked = await cdp.evaluate(`(() => {
      const pill = [...document.querySelectorAll('${OVERLAY} .column-toggle-row .column-pill')]
        .find(el => el.textContent.trim() === 'Name');
      if (pill) pill.click();
      return !!pill;
    })()`);
    await cdp.wait(200);
    const noNameState = await cdp.evaluate(EXPORT_STATE_EXPR);
    t.assert('Nameピルをクリックできる', namePillClicked === true);
    t.assert(
      'Name OFF でヘッダから name 列が消える',
      parseCsvPreview(noNameState.preview || '').header === 'section,cid,ciid,enc,quantity'
    );
    await cdp.evaluate(`(() => {
      const pill = [...document.querySelectorAll('${OVERLAY} .column-toggle-row .column-pill')]
        .find(el => el.textContent.trim() === 'Name');
      if (pill) pill.click();
      return !!pill;
    })()`);
    await cdp.wait(200);
    const nameBackState = await cdp.evaluate(EXPORT_STATE_EXPR);
    t.assert(
      'Name ON でヘッダが元に戻る',
      parseCsvPreview(nameBackState.preview || '').header === 'section,name,cid,ciid,enc,quantity'
    );

    // ============================================================
    console.log('\n--- 7. CSVダウンロード ---');
    // ============================================================
    const csvBeforeDownload = (await cdp.evaluate(EXPORT_STATE_EXPR)).preview;
    t.assert('ファイル名を設定できる', (await setFilename(cdp, DL_FILENAME_BASE)) === true);
    await clickDownload(cdp);
    const csvFile = await waitForDownloadFile(`${DL_FILENAME_BASE}.csv`);
    t.assert('Download で CSV ファイルが保存される', csvFile !== null);
    t.assert('Download 後にダイアログが閉じる', (await waitDialogClosed(cdp)) === true);
    if (csvFile) {
      const content = fs.readFileSync(csvFile, 'utf8');
      t.assert('CSVファイルの内容がプレビューと完全一致する', content === csvBeforeDownload);
      t.assert('CSVファイルの拡張子が .csv', csvFile.endsWith('.csv'));
    }

    // ============================================================
    console.log('\n--- 8. TXT形式プレビューとダウンロード ---');
    // ============================================================
    const reopenedForTxt = await openDialog(cdp);
    t.assert('TXT検証用にダイアログを開く', reopenedForTxt === true);
    await clickDialogTab(cdp, 'Export');
    await cdp.waitFor(`document.querySelector('${OVERLAY} textarea.export-preview') !== null`, 5000);
    const txtSwitched = await clickFormatTab(cdp, 'TXT');
    await cdp.wait(200);
    const txtState = await cdp.evaluate(EXPORT_STATE_EXPR);
    t.assert('TXT形式に切り替えられる', txtSwitched === true && txtState.txtTabActive === true);
    t.assert(
      'TXTプレビューにセクションヘッダがある',
      (txtState.preview || '').includes('=== Main Deck')
    );
    const txtBeforeDownload = txtState.preview;
    await setFilename(cdp, DL_FILENAME_BASE);
    await clickDownload(cdp);
    const txtFile = await waitForDownloadFile(`${DL_FILENAME_BASE}.txt`);
    t.assert('Download で TXT ファイルが保存される', txtFile !== null);
    t.assert('TXTダウンロード後もダイアログが閉じる', (await waitDialogClosed(cdp)) === true);
    if (txtFile) {
      const content = fs.readFileSync(txtFile, 'utf8');
      t.assert('TXTファイルの内容がプレビューと完全一致する', content === txtBeforeDownload);
    }

    // ============================================================
    console.log('\n--- 9. 空ファイルのインポートでエラー ---');
    // ============================================================
    await openDialog(cdp);
    const emptyResult = await importFileAndWait(cdp, fixtures.empty);
    t.assert('空ファイルを設定できる', emptyResult.setFailed === false);
    t.assert(
      '空ファイルでエラーメッセージが表示される',
      emptyResult.state && typeof emptyResult.state.error === 'string' && emptyResult.state.error.length > 0
    );
    if (emptyResult.state) {
      console.log(`  エラー内容: ${emptyResult.state.error}`);
      t.assert('空ファイルでは Import ボタンが disabled のまま', emptyResult.state.importDisabled === true);
    }

    // ============================================================
    console.log('\n--- 10. 必須列欠損CSVのインポートでエラー ---');
    // ============================================================
    const badHeaderResult = await importFileAndWait(cdp, fixtures.badHeader);
    t.assert('必須列欠損CSVでエラーメッセージが表示される',
      badHeaderResult.state && badHeaderResult.state.error !== null &&
      badHeaderResult.state.error.includes('section, cid, quantity')
    );
    if (badHeaderResult.state) {
      console.log(`  エラー内容: ${badHeaderResult.state.error}`);
      t.assert('必須列欠損では Import ボタンが disabled のまま', badHeaderResult.state.importDisabled === true);
    }

    // ============================================================
    console.log('\n--- 11. 未対応形式(.json)のインポートでエラー ---');
    // ============================================================
    const invalidResult = await importFileAndWait(cdp, fixtures.invalid);
    t.assert('未対応形式でエラーメッセージが表示される',
      invalidResult.state && invalidResult.state.error !== null &&
      invalidResult.state.error.includes('サポートされていないファイル形式')
    );
    if (invalidResult.state) {
      console.log(`  エラー内容: ${invalidResult.state.error}`);
      t.assert('未対応形式では Import ボタンが disabled のまま', invalidResult.state.importDisabled === true);
    }

    // ============================================================
    console.log('\n--- 12. 正常CSVのインポート（プレビュー・警告・ボタン活性） ---');
    // ============================================================
    // 読み込み済みデッキ内のカードcidを使う（カード情報はキャッシュ済みのため
    // resolveCard がAPI通信不要の完全ローカル完結なインポートになる）。
    // ciid はカード画像URL（get_image.action?...ciid=N）から実際の値を抽出する
    // （addCard が言語ごとの有効ciidチェックを行うため、実在するciidを使う必要がある）
    const importTarget = await cdp.evaluate(`(() => {
      const el = document.querySelector('.main-content .deck-section.main-deck .card-grid .deck-card[data-card-id]');
      if (!el) return null;
      const img = el.querySelector('img.card-image');
      const ciidMatch = img && img.src ? img.src.match(/[?&]ciid=(\\d+)/) : null;
      return { cid: el.dataset.cardId, ciid: ciidMatch ? ciidMatch[1] : null };
    })()`);
    t.assert(
      'インポート対象カードのcid/ciidをデッキから取得できる',
      importTarget !== null && /^\d+$/.test(importTarget.cid || '') && /^\d+$/.test(importTarget.ciid || '')
    );
    if (!importTarget || !importTarget.cid || !importTarget.ciid) { t.summary(); return; }
    console.log(`  インポート対象: cid=${importTarget.cid} ciid=${importTarget.ciid}`);

    const validCsvPath = path.join(WORK_DIR, 'valid.csv');
    fs.writeFileSync(validCsvPath,
      `section,name,cid,ciid,enc,quantity\n` +
      `main,E2E Import,${importTarget.cid},${importTarget.ciid},,2\n` +
      `main,InvalidRow,abc,1,,1\n`
    );
    const validResult = await importFileAndWait(cdp, validCsvPath);
    t.assert('正常CSVでエラーは表示されない', validResult.state && validResult.state.error === null);
    t.assert('選択ファイル名が表示される', validResult.state && validResult.state.fileName === 'valid.csv');
    t.assert(
      'プレビュー枚数が main=2 / extra=0 / side=0',
      validResult.state && JSON.stringify(validResult.state.counts) === JSON.stringify(['2', '0', '0'])
    );
    t.assert(
      '不正cid行による警告が表示される',
      validResult.state && validResult.state.warnings !== null &&
      validResult.state.warnings.includes('cidが不正です')
    );
    t.assert('正常CSVで Import ボタンが有効化される', validResult.state && validResult.state.importDisabled === false);

    // テキストプレビューにインポート内容が反映されているか
    await cdp.evaluate(`(() => {
      const tab = [...document.querySelectorAll('${OVERLAY} .preview-view-tabs .sub-tab-btn')]
        .find(el => el.textContent.trim() === 'Text');
      if (tab) tab.click();
      return !!tab;
    })()`);
    await cdp.wait(200);
    const textPreview = await cdp.evaluate(`document.querySelector('${OVERLAY} .preview-text-view')?.textContent`);
    t.assert(
      'Text プレビューに「=== Main Deck (2 cards) ===」が表示される',
      typeof textPreview === 'string' && textPreview.includes('=== Main Deck (2 cards) ===')
    );

    // ============================================================
    console.log('\n--- 13. Import実行（replace）でデッキが置き換わる ---');
    // ============================================================
    await cdp.evaluate(`document.querySelector('${OVERLAY} .btn-import')?.click()`);
    const closedAfterImport = await waitDialogClosed(cdp, 5000);
    t.assert('Import 実行でダイアログが閉じる', closedAfterImport === true);

    const replaced = await cdp.waitFor(
      `(() => { const s = ${DECK_COUNTS_EXPR}; return s.main === 2 && s.extra === 0 && s.side === 0 ? s : false; })()`,
      10000, 150
    );
    t.assert('replace モードでメインデッキが2枚に置換される（extra/sideは0）', replaced !== false);
    if (replaced) {
      t.assert('置換後の枚数バッジ(h3 .count)も2になる', replaced.badge === 2);
    }

    const toastText = await cdp.waitFor(`(() => {
      const el = document.querySelector('.toast-container .toast');
      return el ? el.textContent : '';
    })()`, 5000, 100);
    t.assert(
      '置換完了のトーストが表示される',
      typeof toastText === 'string' && toastText.includes('デッキを置き換えました')
    );

    // ============================================================
    console.log('\n--- 14. 再オープンでImport状態がリセットされる（未保存確認は「保存せず続ける」） ---');
    // ============================================================
    // デッキが置換済みのため checkUnsavedChanges（unsavedWarning=always）により
    // 未保存確認ダイアログが表示される。「保存せず続ける」で続行する（保存はしない）。
    const reopenedAfterImport = await openDialog(cdp);
    t.assert('デッキ変更後の再オープンで未保存確認を経てダイアログが開く', reopenedAfterImport === true);
    const resetState = await cdp.waitFor(`(() => {
      const s = ${IMPORT_STATE_EXPR};
      return (s.hasPlaceholder && s.importDisabled) ? s : false;
    })()`, 5000);
    t.assert(
      '再オープンでファイル選択・Importボタンがリセットされる',
      resetState !== false
    );

    // --- 後始末: 保存は一切行っていない。実リロードでメモリ上のデッキ状態を破棄 ---
    console.log('\n--- クリーンアップ（メモリ状態の破棄のみ・保存は一切行わない） ---');
    await hardNavigate(cdp, EDIT_URL);
    fs.rmSync(WORK_DIR, { recursive: true, force: true });
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

testImportExport();
