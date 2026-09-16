/**
 * デッキ画像作成ダイアログの位置・サイズ計算の実機テスト（TASK-511）
 *
 * 実装参照:
 *   src/utils/image-dialog-layout.ts (computeImageDialogLayout: VIEWPORT_MARGIN=16, BUTTON_GAP=8,
 *     MAX_DIALOG_WIDTH=640, DIALOG_PADDING=20, MAX_HEIGHT_RATIO=0.85, placement=center/below/above/clamped)
 *   src/components/ImageDialog.vue (.ygo-next-image-popup が position:fixed + popupStyle で
 *     top/left/width/maxHeight/overflowY:auto/padding を指定。resizeリスナで viewportWidth/Height を追従。
 *     .background-image は backgroundImageStyle.height=displayHeight*scale + background-size:contain)
 *   src/components/DeckEditTopBar.vue ([data-testid="menu-btn"] 開いた .menu-dropdown 内の
 *     [data-testid="deck-image-btn"] から showImageDialogWithData(..., null) = buttonRectなし=center配置)
 *   src/content/deck-recipe/addImageButton.ts (#bottom_btn_set の #ygo-next-deck-image-btn から
 *     showImageDialog() = buttonRectあり=below/above/clamped)
 *
 * 検証:
 *   a.  編集ページ(1280x1400: 縮小なし条件): アスペクト比維持(contain二重縮小なし)・center配置・viewport内
 *   a2. 編集ページ(1280x800: 標準): viewport内・QRトグル到達。アスペクト比は flex-shrink の影響を
 *       計測として記録（内容合計が maxHeight を超えると flex item の .background-image が縮む）
 *   b.  小window(900x600): 画面内収束・maxHeight<=85vh・縦スクロール/QR到達
 *   c.  resize(->500x400): 開いたままのリサイズで再クランプ
 *   d.  デッキ表示ページ: ボタン下端がviewport下端に一致する位置からカメラボタンで
 *       下はみ出しせず(above/clamped)・右端クランプ
 *
 * 実行: node tests/browser/test-image-dialog-layout.cjs
 * 前提: ./scripts/debug/setup/start-chrome.sh でChromium起動済み。
 *       data/session/storageState.json があること（injectSessionでログイン。編集ページのcgid取得・
 *       デッキ表示ページの画像生成に必要）
 * 注意: 編集ページ(#/ytomo/edit)はフルナビゲーションでのみ初期化される（hash変更ではVue UIが
 *       マウントされない実機挙動を確認済み）。そのため about:blank を経由する。
 */

const { connectCDP, createTestContext, PUBLIC_DECK_URL, PUBLIC_DECK_DNO, injectSession } = require('./cdp-helper.cjs');

// URL dno 指定（deck-edit.ts initializeOnPageLoad: URLStateManager.getDno() が最優先）。
// 指定なしだとデッキ未ロード(dno=0)となり Deck Image ボタンが「デッキ番号が設定されていません」で
// 中断するため、PUBLIC_DECK と同じ dno を明示する
const EDIT_URL = `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=${PUBLIC_DECK_DNO}`;

/** 幾何計算の許容誤差(px)。getBoundingClientRectはfloatを返すため小さな誤差を許容 */
const EPS = 1.5;

/**
 * dialog の計測値を一括取得する（ページ内evaluate）。
 * @param {object} cdp - connectCDP()の戻り値
 * @param {object} [opts]
 * @param {boolean} [opts.scrollDialogBottom] - trueなら計測前にdialogを最下部までスクロール
 *   （QRトグル等の下端要素の到達可能性の検証用）
 */
async function measureDialog(cdp, opts = {}) {
  const raw = await cdp.evaluate(`(async () => {
    const dialog = document.querySelector('.ygo-next-image-popup');
    if (!dialog) return null;
    if (${opts.scrollDialogBottom ? 'true' : 'false'}) {
      dialog.scrollTop = dialog.scrollHeight;
    }
    const cs = getComputedStyle(dialog);
    const bg = dialog.querySelector('.background-image');
    const qr = dialog.querySelector('.toggle-btn.qr-toggle');
    const dr = dialog.getBoundingClientRect();
    const bgr = bg ? bg.getBoundingClientRect() : null;
    const qrr = qr ? qr.getBoundingClientRect() : null;
    let natural = null;
    if (bg) {
      const m = getComputedStyle(bg).backgroundImage.match(/url\\(["']?(.*?)["']?\\)/);
      if (m) {
        const img = new Image();
        await new Promise((res) => { img.onload = res; img.onerror = res; img.src = m[1]; });
        natural = { width: img.naturalWidth, height: img.naturalHeight };
      }
    }
    return JSON.stringify({
      viewport: { w: window.innerWidth, h: window.innerHeight },
      dialog: {
        top: dr.top, left: dr.left, right: dr.right, bottom: dr.bottom,
        width: dr.width, height: dr.height
      },
      style: {
        top: dialog.style.top, left: dialog.style.left, width: dialog.style.width,
        maxHeight: dialog.style.maxHeight, overflowY: cs.overflowY, position: cs.position
      },
      bgStyleHeight: bg ? bg.style.height : null,
      scroll: { scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight, scrollTop: dialog.scrollTop },
      bg: bgr ? { width: bgr.width, height: bgr.height, top: bgr.top, bottom: bgr.bottom } : null,
      qr: qrr ? { top: qrr.top, left: qrr.left, right: qrr.right, bottom: qrr.bottom } : null,
      natural
    });
  })()`);
  return raw ? JSON.parse(raw) : null;
}

/** 計測値を見やすくログ出力する */
function logMeasurement(label, m) {
  if (!m) {
    console.log(`  [計測:${label}] dialog が存在しません`);
    return;
  }
  const d = m.dialog;
  const place = `top=${d.top.toFixed(1)} left=${d.left.toFixed(1)} right=${d.right.toFixed(1)} bottom=${d.bottom.toFixed(1)} (${d.width.toFixed(1)}x${d.height.toFixed(1)})`;
  console.log(`  [計測:${label}] viewport=${m.viewport.w}x${m.viewport.h} dialog[${place}]`);
  console.log(`    style: top=${m.style.top} left=${m.style.left} width=${m.style.width} maxHeight=${m.style.maxHeight} overflowY=${m.style.overflowY}`);
  console.log(`    scroll: scrollHeight=${m.scroll.scrollHeight} clientHeight=${m.scroll.clientHeight}`);
  if (m.bg) {
    console.log(`    .background-image: ${m.bg.width.toFixed(1)}x${m.bg.height.toFixed(1)} styleHeight=${m.bgStyleHeight} natural=${m.natural ? `${m.natural.width}x${m.natural.height}` : 'n/a'}`);
  }
  if (m.qr) console.log(`    .qr-toggle: top=${m.qr.top.toFixed(1)} right=${m.qr.right.toFixed(1)} bottom=${m.qr.bottom.toFixed(1)}`);
}

/**
 * placementをstyle値から分類する（image-dialog-layout.ts の配置ロジックの再現）
 * clamped は「below も above も置けないときの clampY(belowTop)」なので、
 * 期待値は clampY(buttonRect.bottom+8) と一致する（多くは下限16に張り付く）
 * @returns {string} 'center' | 'below' | 'above' | 'clamped' | 'unknown'
 */
function classifyPlacement(m, buttonRect) {
  const top = parseFloat(m.style.top);
  const maxHeight = parseFloat(m.style.maxHeight);
  const vh = m.viewport.h;
  if (!buttonRect) {
    const expected = (vh - maxHeight) / 2;
    return Math.abs(top - expected) <= EPS + 1 ? 'center' : 'unknown';
  }
  const belowTop = buttonRect.bottom + 8;
  if (Math.abs(top - belowTop) <= EPS + 1) return 'below';
  if (Math.abs(top - (buttonRect.top - 8 - maxHeight)) <= EPS + 1) return 'above';
  const clampedTop = Math.max(16, Math.min(belowTop, vh - maxHeight - 16));
  if (Math.abs(top - clampedTop) <= EPS + 1) return 'clamped';
  return 'unknown';
}

/** アスペクト比検証: .background-image の実測幅高比が生成画像の自然比と一致するか */
function aspectRatioOk(m) {
  if (!m.bg || !m.natural || m.natural.width === 0 || m.bg.height === 0) return false;
  const actual = m.bg.width / m.bg.height;
  const expected = m.natural.width / m.natural.height;
  return { ok: Math.abs(actual - expected) < 0.01, actual, expected };
}

/** viewportサイズを設定する */
async function setViewport(cdp, width, height) {
  await cdp.sendCommand('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false
  });
  await cdp.evaluate(`window.dispatchEvent(new Event('resize'))`);
}

/** 編集ページでメニューから Deck Image ボタンを押してdialogを開く */
async function openDialogFromEditPage(cdp, t, label) {
  await cdp.evaluate(`document.querySelector('[data-testid="menu-btn"]')?.click()`);
  await cdp.wait(300);
  const clicked = await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('[data-testid="deck-image-btn"]');
      if (btn) btn.click();
      return !!btn;
    })()
  `);
  t.assert(`${label}: メニュー内 Deck Image ボタン(data-testid="deck-image-btn")をクリック`, clicked === true);
  // isVisible はプレビューcanvas生成完了後に true（test-dialog.cjs と同じ待ち方）
  const visible = await cdp.waitFor(`document.querySelector('.ygo-next-image-popup') !== null`, 15000, 300);
  t.assert(`${label}: dialog(.ygo-next-image-popup)が表示される`, visible === true);
}

/** dialogを閉じて消失を待つ */
async function closeDialog(cdp) {
  await cdp.evaluate(`document.querySelector('.ygo-next-image-popup-overlay')?.click()`);
  await cdp.waitFor(`document.querySelector('.ygo-next-image-popup') === null`, 4000, 100);
}

async function run() {
  console.log('=== TASK-511 deck image dialog 位置・サイズ 実機テスト ===\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    await cdp.sendCommand('Page.enable');

    // ログインセッション注入（編集ページのcgid取得・デッキ表示ページの画像生成に必要）
    await injectSession(cdp);

    // ------------------------------------------------------------
    console.log('--- a. 編集ページ 1280x1400（.background-image 縮小が起きない高さでの検証） ---');
    await setViewport(cdp, 1280, 1400);
    // hash変更では編集UIが初期化されないため about:blank 経由でフルナビゲーション
    await cdp.navigate('about:blank');
    await cdp.wait(300);
    await cdp.navigate(EDIT_URL);
    await cdp.wait(6000);

    const editReady = await cdp.waitFor(`!!document.querySelector('.deck-edit-container')`, 10000, 500);
    t.assert('a: 編集UI(.deck-edit-container)がロードされる（ログイン・拡張機能有効）', editReady === true);

    await openDialogFromEditPage(cdp, t, 'a');
    await cdp.wait(500); // 表示アニメーション後の安定値を取る

    const mA = await measureDialog(cdp);
    logMeasurement('a-1280x1400', mA);
    if (!mA) {
      t.assert('a: dialog計測値が取得できる', false);
    } else {
      const vw = mA.viewport.w;
      const vh = mA.viewport.h;
      t.assert('a1: dialog が viewport 内 (left>=16, top>=16, right<=vw-16, bottom<=vh)',
        mA.dialog.left >= 16 - EPS && mA.dialog.top >= 16 - EPS &&
        mA.dialog.right <= vw - 16 + EPS && mA.dialog.bottom <= vh + EPS);
      const ratioA = aspectRatioOk(mA);
      console.log(`    幅高比: actual=${ratioA.actual ? ratioA.actual.toFixed(4) : 'n/a'} natural=${ratioA.expected ? ratioA.expected.toFixed(4) : 'n/a'}`);
      t.assert('a2: .background-image の幅高比が生成画像の自然比と一致 (contain二重縮小なし)', ratioA.ok === true);
      t.assert('a3: Include QRトグル(.toggle-btn.qr-toggle)が viewport 内',
        !!mA.qr && mA.qr.top >= -EPS && mA.qr.bottom <= vh + EPS &&
        mA.qr.left >= -EPS && mA.qr.right <= vw + EPS);
      const placementA = classifyPlacement(mA, null);
      t.assert(`a4: 配置がcenter（buttonRectなし） [actual=${placementA}]`, placementA === 'center');
      t.assert('a5: dialog の overflowY が auto', mA.style.overflowY === 'auto');
      t.assert('a6: dialog の position が fixed', mA.style.position === 'fixed');
      t.assert(`a7: dialog幅が min(vw-32,640)=640 以下`, mA.dialog.width <= Math.min(vw - 32, 640) + EPS);
    }

    // ------------------------------------------------------------
    console.log('\n--- a2. 編集ページ 1280x800（標準高。maxHeight による flex-shrink の計測を含む） ---');
    await closeDialog(cdp);
    await setViewport(cdp, 1280, 800);
    await cdp.wait(500);

    await openDialogFromEditPage(cdp, t, 'a2');
    await cdp.wait(500);

    const mA2 = await measureDialog(cdp);
    logMeasurement('a2-1280x800', mA2);
    if (!mA2) {
      t.assert('a2: dialog計測値が取得できる', false);
    } else {
      const vw = mA2.viewport.w;
      const vh = mA2.viewport.h;
      t.assert('a2-1: dialog が viewport 内',
        mA2.dialog.left >= 16 - EPS && mA2.dialog.top >= 16 - EPS &&
        mA2.dialog.right <= vw - 16 + EPS && mA2.dialog.bottom <= vh + EPS);
      const ratioA2 = aspectRatioOk(mA2);
      console.log(`    幅高比: actual=${ratioA2.actual ? ratioA2.actual.toFixed(4) : 'n/a'} natural=${ratioA2.expected ? ratioA2.expected.toFixed(4) : 'n/a'}`);
      console.log(`    （参考）.background-image style.height=${mA2.bgStyleHeight} 実測height=${mA2.bg ? mA2.bg.height.toFixed(1) : 'n/a'}`
        + ` scrollHeight=${mA2.scroll.scrollHeight} clientHeight=${mA2.scroll.clientHeight}`
        + ` ※実測がstyle.heightより縮む場合、dialog(maxHeight)内のflex-shrinkで押し縮められている`);
      t.assert('a2-2: 標準高でも幅高比が自然比と一致（縮小条件ではflex-shriftで崩れる場合、実装側の横膨れ残存として報告）', ratioA2.ok === true);
      const placementA2 = classifyPlacement(mA2, null);
      t.assert(`a2-3: 配置がcenter [actual=${placementA2}]`, placementA2 === 'center');
      // QRトグル到達性（必要ならdialog内スクロール後）
      const qrVisible = !!mA2.qr && mA2.qr.bottom <= vh + EPS && mA2.qr.top >= -EPS;
      let qrReachable = qrVisible;
      let how = '初期表示で見えている';
      if (!qrReachable) {
        const mA2S = await measureDialog(cdp, { scrollDialogBottom: true });
        logMeasurement('a2-1280x800-scrollBottom', mA2S);
        qrReachable = !!mA2S.qr && mA2S.qr.bottom <= vh + EPS;
        how = 'dialog内スクロールで到達';
      }
      console.log(`    QRトグル到達: ${how}`);
      t.assert('a2-4: QRトグルが見切れなし、またはdialog内スクロールで到達可能', qrReachable === true);
    }

    // ------------------------------------------------------------
    console.log('\n--- b. 編集ページ・小window (900x600) で開き直し ---');
    await closeDialog(cdp);
    await setViewport(cdp, 900, 600);
    await cdp.wait(500);

    await openDialogFromEditPage(cdp, t, 'b');
    await cdp.wait(500);

    const mB = await measureDialog(cdp);
    logMeasurement('b-900x600', mB);
    if (!mB) {
      t.assert('b: dialog計測値が取得できる', false);
    } else {
      const vw = mB.viewport.w;
      const vh = mB.viewport.h;
      t.assert('b1: dialog が viewport 内（900x600でもはみ出さない）',
        mB.dialog.left >= 16 - EPS && mB.dialog.top >= 16 - EPS &&
        mB.dialog.right <= vw - 16 + EPS && mB.dialog.bottom <= vh + EPS);
      const maxHeightPx = parseFloat(mB.style.maxHeight);
      t.assert(`b2: maxHeight <= 85vh (${maxHeightPx} <= ${vh * 0.85})`, maxHeightPx <= vh * 0.85 + EPS);
      const hasScroll = mB.scroll.scrollHeight > mB.scroll.clientHeight + 1;
      console.log(`    縦スクロール状態: scrollHeight=${mB.scroll.scrollHeight} clientHeight=${mB.scroll.clientHeight} (${hasScroll ? 'スクロールあり' : 'スクロールなし（flex-shrinkで収まっている場合は実装側挙動として記録）'})`);
      const mBScrolled = await measureDialog(cdp, { scrollDialogBottom: true });
      logMeasurement('b-900x600-scrollBottom', mBScrolled);
      t.assert('b3: QRトグルが見えている、またはdialog内スクロールで到達可能',
        (!!mB.qr && mB.qr.bottom <= vh + EPS) || (!!mBScrolled.qr && mBScrolled.qr.bottom <= vh + EPS));
      const ratioB = aspectRatioOk(mB);
      console.log(`    幅高比: actual=${ratioB.actual ? ratioB.actual.toFixed(4) : 'n/a'} natural=${ratioB.expected ? ratioB.expected.toFixed(4) : 'n/a'}`);
      t.assert('b4: 幅高比が自然比と一致（縮小条件下の検証。崩れる場合はflex-shrink影響として報告）', ratioB.ok === true);
    }

    // ------------------------------------------------------------
    console.log('\n--- c. 開いたまま resize (900x600 -> 500x400) で再クランプ ---');
    await setViewport(cdp, 500, 400);
    await cdp.wait(800); // Vueの再計算と再描画を待つ

    const mC = await measureDialog(cdp);
    logMeasurement('c-500x400', mC);
    if (!mC) {
      t.assert('c: dialog計測値が取得できる', false);
    } else {
      const vw = mC.viewport.w;
      const vh = mC.viewport.h;
      t.assert('c1: resize後 dialog が新しい viewport 内へ再クランプ',
        mC.dialog.left >= 16 - EPS && mC.dialog.top >= 16 - EPS &&
        mC.dialog.right <= vw - 16 + EPS && mC.dialog.bottom <= vh + EPS);
      t.assert(`c2: resize後 dialog幅 <= min(vw-32,640)=${Math.min(vw - 32, 640)}`,
        mC.dialog.width <= Math.min(vw - 32, 640) + EPS);
      const mCScrolled = await measureDialog(cdp, { scrollDialogBottom: true });
      logMeasurement('c-500x400-scrollBottom', mCScrolled);
      t.assert('c3: resize後もQRトグルに到達可能（見えている、またはスクロールで）',
        (!!mC.qr && mC.qr.bottom <= vh + EPS) || (!!mCScrolled.qr && mCScrolled.qr.bottom <= vh + EPS));
    }

    await closeDialog(cdp);

    // ------------------------------------------------------------
    console.log('\n--- d. デッキ表示ページ (1280x800, #bottom_btn_set のカメラボタン) ---');
    await setViewport(cdp, 1280, 800);
    await cdp.navigate(PUBLIC_DECK_URL);
    await cdp.wait(5000);

    const camReady = await cdp.waitFor(`!!document.getElementById('ygo-next-deck-image-btn')`, 10000, 500);
    t.assert('d: カメラボタン(#ygo-next-deck-image-btn)が存在', camReady === true);

    // ボタン下端が viewport 下端に一致する位置へスクロール（下端寄りのボタンから開く状況を再現）
    await cdp.evaluate(`
      (() => {
        const btn = document.getElementById('ygo-next-deck-image-btn');
        const rect = btn.getBoundingClientRect();
        const docTop = rect.top + window.scrollY;
        window.scrollTo(0, Math.max(0, docTop + rect.height - window.innerHeight));
      })()
    `);
    await cdp.wait(500);
    const buttonRect = await cdp.evaluate(`JSON.stringify(document.getElementById('ygo-next-deck-image-btn')?.getBoundingClientRect() || null)`);
    const btnRect = JSON.parse(buttonRect);
    console.log(`  カメラボタンrect: top=${btnRect.top.toFixed(1)} left=${btnRect.left.toFixed(1)} right=${btnRect.right.toFixed(1)} bottom=${btnRect.bottom.toFixed(1)}（viewport 1280x800）`);

    await cdp.evaluate(`document.getElementById('ygo-next-deck-image-btn')?.click()`);
    const dVisible = await cdp.waitFor(`document.querySelector('.ygo-next-image-popup') !== null`, 15000, 300);
    t.assert('d: dialogが表示される', dVisible === true);
    await cdp.wait(500);

    const mD = await measureDialog(cdp);
    logMeasurement('d-1280x800', mD);
    if (!mD) {
      t.assert('d: dialog計測値が取得できる', false);
    } else {
      const vw = mD.viewport.w;
      const vh = mD.viewport.h;
      t.assert('d1: dialog の bottom <= vh（下はみ出しなし）', mD.dialog.bottom <= vh + EPS);
      t.assert('d2: dialog の right <= vw-16（右端クランプ）', mD.dialog.right <= vw - 16 + EPS);
      const placementD = classifyPlacement(mD, btnRect);
      console.log(`    配置判定: ${placementD}（below=ボタン直下, above=フリップ上, clamped=下端クランプ）`);
      t.assert(`d3: 配置がabove/clamped/belowいずれかの画面内配置 [actual=${placementD}]`,
        ['above', 'clamped', 'below'].includes(placementD));
      const qrVisibleInitially = !!mD.qr && mD.qr.bottom <= vh + EPS && mD.qr.top >= -EPS;
      let qrReachable = qrVisibleInitially;
      if (!qrReachable) {
        const mDScrolled = await measureDialog(cdp, { scrollDialogBottom: true });
        logMeasurement('d-1280x800-scrollBottom', mDScrolled);
        qrReachable = !!mDScrolled.qr && mDScrolled.qr.bottom <= vh + EPS;
      }
      t.assert('d4: QRトグルが見切れなし、または縦スクロールで到達可能', qrReachable === true);
    }

    await closeDialog(cdp);
    await cdp.sendCommand('Emulation.clearDeviceMetricsOverride');

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

run();
