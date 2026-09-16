/**
 * ロード画面の最初の描画前表示・チラつき解消の実機E2Eテスト（TASK-510）
 *
 * 実装参照:
 *   public/loader.js (run_at document_start. #/ytomo/系hashで early-hide + overlay を
 *     最初の描画前に同期注入。overlay は body 未生成時 documentElement 直付け)
 *   src/content/index.ts (notifyStart/handoff. loadEditUIIfNeeded: DCL待ち -> #bg検証 ->
 *     overlay冪等テイクオーバー(bodyへ移動) -> edit-ui import. catchで公式画面復帰)
 *   src/content/edit-ui/index.ts (loadEditUI: early-hide除去 -> #bg 書き換え ->
 *     #vue-edit-app 生成 -> Vueマウント)
 *   src/content/edit-ui/DeckEditLayout.vue (onMounted: デッキ読込完了 -> isReady ->
 *     overlay を opacity 0 -> 150ms 後 remove())
 *
 * 検証観点（docs/design/loader-early-loading-tech.md §8/§9・codexレビュー指摘4/5）:
 *   1. デッキ編集ページを about:blank からフルナビゲーションで開いた際、
 *      公式DOM(#wrapper/#bg)が非表示かつロード画面(#ygo-next-module-loading-overlay)が
 *      初期段階から存在すること（チラつきなし）
 *   2. Vue編集UI(#vue-edit-app/.deck-edit-container)がマウントされ overlay がフェード除去
 *   3. document_start 時の overlay の documentElement 直付けと body 出現後の body 移動で
 *      表示が維持されること（foster parenting で壊れない）
 *   4. 非ytomo公式ページ（トップ・デッキ表示）の回帰なし（公式UIは隠されず拡張機能が動作）
 *   5. 公式トップから hash で #/ytomo/edit へ遷移した場合も編集UIに入れる（保証レベルB）。
 *      TASK-513強化: window.ygoChangeLanguage（edit-uiモジュールスコープでのみ代入）を
 *      edit-ui評価完了マーカーとし、isolated worldのexecution contextでマーカーをpollして
 *      prefetch済み（モジュール評価済み）を確定してからhash遷移する。未評価import経路
 *      （DCL直後hashchange型）と判別不能なまま「たまたま成功」を排除する
 *
 * 計測方法:
 *   Page.addScriptToEvaluateOnNewDocument で main world に記録器を注入
 *   （content script の isolated world より先・文書生成直後に起動する）。
 *   requestAnimationFrame の毎フレームで DOM 状態スナップショットを記録
 *   （rAF callback は各ペイント直前に発火するため、ペイントされた状態の近似）。
 *   MutationObserver で主要要素の追加/削除時刻も記録する。
 *
 * 実行: node tests/browser/test-loader-flicker.cjs
 * 前提: ./scripts/debug/setup/start-chrome.sh でChromium起動済み。
 *       data/session/storageState.json があること（injectSessionでログイン。
 *       編集ページのデッキ取得に必要）
 */

const { connectCDP, createTestContext, PUBLIC_DECK_URL, PUBLIC_DECK_DNO, injectSession } = require('./cdp-helper.cjs');

const TOP_URL = 'https://www.db.yugioh-card.com/yugiohdb/';
const EDIT_URL = `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit?dno=${PUBLIC_DECK_DNO}`;

/** overlay 表示の rect 許容誤差(px) */
const RECT_EPS = 1;

/**
 * 新規documentに自動注入する記録器（main world）。
 * window.__ygoFlickerLog = { frames: [...], events: [...] }
 *  - frames: rAF毎のスナップショット（t=performance.now, rs=readyState頭文字,
 *    eh=early-hide有無, ov=overlay有無, ovP=overlay親タグ, ovR=overlay rect,
 *    wEx/wD=#wrapper 有無とcomputed display, bgEx/bgD=#bg 同,
 *    vue=#vue-edit-app有無, ready=.deck-edit-container有無）
 *  - events: MutationObserverによる主要要素の追加/削除時刻
 */
const RECORDER_SOURCE = `(function () {
  if (window.__ygoFlickerLog) return;
  var log = { frames: [], events: [] };
  window.__ygoFlickerLog = log;
  var WATCH = { 'ygo-next-early-hide': 1, 'ygo-next-module-loading-overlay': 1, 'wrapper': 1, 'bg': 1, 'vue-edit-app': 1 };
  function r1(n) { return Math.round(n * 10) / 10; }
  function snap() {
    var ov = document.getElementById('ygo-next-module-loading-overlay');
    var w = document.getElementById('wrapper');
    var bg = document.getElementById('bg');
    var ovR = null, ovP = null;
    if (ov) {
      var r = ov.getBoundingClientRect();
      ovR = { w: Math.round(r.width), h: Math.round(r.height) };
      ovP = ov.parentElement ? ov.parentElement.tagName : 'none';
    }
    log.frames.push({
      t: r1(performance.now()),
      rs: document.readyState.charAt(0),
      eh: !!document.getElementById('ygo-next-early-hide'),
      ov: !!ov, ovP: ovP, ovR: ovR,
      wEx: !!w, wD: w ? getComputedStyle(w).display : null,
      bgEx: !!bg, bgD: bg ? getComputedStyle(bg).display : null,
      vue: !!document.getElementById('vue-edit-app'),
      ready: !!document.querySelector('.deck-edit-container')
    });
  }
  function loop() {
    if (log.frames.length < 4000) { snap(); requestAnimationFrame(loop); }
  }
  function startObs() {
    if (log.started) return;
    log.started = true;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        var j, n;
        for (j = 0; j < m.addedNodes.length; j++) {
          n = m.addedNodes[j];
          if (n.nodeType === 1) {
            var id = n.id || '';
            if (WATCH[id] || n.tagName === 'HEAD' || n.tagName === 'BODY') {
              log.events.push({ t: r1(performance.now()), k: 'add', id: id || n.tagName });
            }
          }
        }
        for (j = 0; j < m.removedNodes.length; j++) {
          n = m.removedNodes[j];
          if (n.nodeType === 1 && n.id && WATCH[n.id]) {
            log.events.push({ t: r1(performance.now()), k: 'rem', id: n.id });
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    requestAnimationFrame(loop);
  }
  if (document.documentElement) { startObs(); }
  else {
    (function boot() {
      if (document.documentElement) { startObs(); } else { setTimeout(boot, 1); }
    })();
  }
})();`;

/** ページから記録ログを取得 */
async function readLog(cdp) {
  const raw = await cdp.evaluate('JSON.stringify(window.__ygoFlickerLog || null)');
  return raw ? JSON.parse(raw) : null;
}

/** フレームログを状態変化点のみに圧縮して表示 */
function printCondensedFrames(frames) {
  if (!frames || frames.length === 0) {
    console.log('  （フレーム記録なし）');
    return;
  }
  const keys = ['rs', 'eh', 'ov', 'ovP', 'wEx', 'wD', 'bgEx', 'bgD', 'vue', 'ready'];
  let prev = null;
  let printed = 0;
  for (const f of frames) {
    let changed = prev === null;
    if (!changed) {
      for (const k of keys) {
        if (f[k] !== prev[k]) { changed = true; break; }
      }
    }
    if (changed) {
      const rect = f.ovR ? `${f.ovR.w}x${f.ovR.h}` : '-';
      console.log(
        `  t=${String(f.t).padStart(8)} rs=${f.rs}` +
        ` eh=${f.eh ? 1 : 0} ov=${f.ov ? 1 : 0}(p=${f.ovP || '-'},rect=${rect})` +
        ` wrapper=${f.wEx ? (f.wD === 'none' ? 'HIDDEN' : 'VISIBLE(' + f.wD + ')') : '-'}` +
        ` bg=${f.bgEx ? (f.bgD === 'none' ? 'HIDDEN' : 'VISIBLE(' + f.bgD + ')') : '-'}` +
        ` vue=${f.vue ? 1 : 0} ready=${f.ready ? 1 : 0}`
      );
      printed++;
      if (printed > 60) {
        console.log('  ...（以降省略）');
        break;
      }
    }
    prev = f;
  }
  console.log(`  （全${frames.length}フレーム中、状態変化${printed}点を表示）`);
}

/** MutationObserverイベントログを表示 */
function printEvents(events) {
  if (!events || events.length === 0) {
    console.log('  （要素イベント記録なし）');
    return;
  }
  for (const e of events.slice(0, 40)) {
    console.log(`  t=${String(e.t).padStart(8)} ${e.k === 'add' ? '追加' : '削除'}: ${e.id}`);
  }
  if (events.length > 40) console.log(`  ...（全${events.length}件中40件表示）`);
}

/**
 * 編集ページ読み込みログの解析と検証（観点1〜3）
 * @returns {object} 解析サマリ（assert内でも使用）
 */
function analyzeEditLoad(t, log, label) {
  const frames = (log && log.frames) || [];
  t.assert(`${label}: フレームログが取得できる（rAF記録あり）`, frames.length > 0);
  if (frames.length === 0) return null;

  // --- 状態タイムライン表示 ---
  printCondensedFrames(frames);
  if (log && log.events) printEvents(log.events);

  // --- 観点1: チラつき（公式UIが見える状態のフレーム）の検出 ---
  // チラつきフレーム = #wrapper が存在・表示(display!=='none')・overlay不在・Vue UI未生成
  const flickerFrames = frames.filter(
    f => f.wEx && f.wD !== 'none' && !f.ov && !f.vue
  );
  const firstFlicker = flickerFrames[0];
  t.assert(
    `${label}: チラつきフレームなし（wrapper表示 && overlay不在 && Vue未生成 のフレームが0）`,
    flickerFrames.length === 0
  );
  if (firstFlicker) {
    console.log(`    [FAIL詳細] 最初のチラつきフレーム: t=${firstFlicker.t} rs=${firstFlicker.rs} wD=${firstFlicker.wD}`);
  }

  // wrapper が最初に観測された時点で overlay と early-hide が既に存在すること
  const firstWrapperFrame = frames.find(f => f.wEx);
  if (firstWrapperFrame) {
    t.assert(
      `${label}: #wrapper 初観測時点（t=${firstWrapperFrame.t}）で overlay・early-hide が既に存在`,
      firstWrapperFrame.ov === true && firstWrapperFrame.eh === true
    );
  } else {
    t.assert(`${label}: #wrapper が観測される`, false);
  }

  // 観点1: 公式DOMがVue UI takeover前は非表示維持
  const officialVisibleBeforeTakeover = frames.filter(
    f => f.wEx && !f.vue && f.wD !== 'none'
  );
  t.assert(
    `${label}: Vue UI takeover前の全フレームで #wrapper が非表示（early-hide維持）`,
    officialVisibleBeforeTakeover.length === 0
  );

  // --- 観点3: documentElement直付けとbody移動 ---
  const overlayFrames = frames.filter(f => f.ov);
  const firstOverlayFrame = overlayFrames[0];
  if (firstOverlayFrame) {
    console.log(
      `    overlay初観測: t=${firstOverlayFrame.t} rs=${firstOverlayFrame.rs}` +
      ` 親=${firstOverlayFrame.ovP} rect=${firstOverlayFrame.ovR ? firstOverlayFrame.ovR.w + 'x' + firstOverlayFrame.ovR.h : 'null'}`
    );
    t.assert(
      `${label}: overlay初観測時の親が documentElement(HTML)（document_start直付け）`,
      firstOverlayFrame.ovP === 'HTML'
    );
  } else {
    t.assert(`${label}: ロード中に overlay が観測される`, false);
  }
  const bodyParentFrames = overlayFrames.filter(f => f.ovP === 'BODY');
  t.assert(
    `${label}: overlay が body へ移動（takeover）されたフレームが存在`,
    bodyParentFrames.length > 0
  );
  // 観点3: 表示維持（全overlay観測フレームでrectがviewport一致・親はHTML/BODYのみ）
  const brokenRectFrames = overlayFrames.filter(
    f => !f.ovR || f.ovR.w < 1280 - RECT_EPS || f.ovR.h < 800 - RECT_EPS
  );
  t.assert(
    `${label}: overlay 観測全フレームで rect が viewport(1280x800) を維持（foster parentingで壊れない）`,
    brokenRectFrames.length === 0
  );
  if (brokenRectFrames.length > 0) {
    const b = brokenRectFrames[0];
    console.log(`    [FAIL詳細] rect破壊フレーム: t=${b.t} 親=${b.ovP} rect=${b.ovR ? b.ovR.w + 'x' + b.ovR.h : 'null'}`);
  }
  const weirdParentFrames = overlayFrames.filter(f => f.ovP !== 'HTML' && f.ovP !== 'BODY');
  t.assert(
    `${label}: overlay の親が HTML/BODY 以外に変化したフレームなし`,
    weirdParentFrames.length === 0
  );

  return {
    flickerCount: flickerFrames.length,
    firstOverlayT: firstOverlayFrame ? firstOverlayFrame.t : null,
    overlayParentTransition: {
      html: overlayFrames.some(f => f.ovP === 'HTML'),
      body: bodyParentFrames.length > 0
    },
    frameCount: frames.length
  };
}

/** コンソール警告/エラーの収集結果を表示し、ロード失敗系のログが無いか検証 */
function checkConsole(t, consoleLogs, label) {
  const problemLogs = consoleLogs.filter(
    e => e.type === 'error' || e.type === 'warning' || e.type === 'exception'
  );
  if (problemLogs.length > 0) {
    console.log(`  [console warn/error] ${label}:`);
    for (const e of problemLogs.slice(0, 15)) {
      console.log(`    ${e.type}: ${e.text.slice(0, 160)}`);
    }
  } else {
    console.log(`  [console warn/error] ${label}: なし`);
  }
  const failsafeLogs = problemLogs.filter(e => e.text.includes('[loader.js]'));
  t.assert(`${label}: フェイルセーフ（takeover timeout）が発火していない`, failsafeLogs.length === 0);
  const bootErrorLogs = problemLogs.filter(
    e => e.text.includes('[Content]') || e.text.includes('Failed to load edit UI')
  );
  t.assert(`${label}: content.js の起動エラーログなし`, bootErrorLogs.length === 0);
}

async function run() {
  console.log('=== TASK-510 loader チラつき解消 実機E2Eテスト ===\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  // console収集（warn/error・例外）
  const consoleLogs = [];
  cdp.on('Runtime.consoleAPICalled', (params) => {
    const type = params.type;
    if (type === 'warning' || type === 'error') {
      const text = (params.args || []).map(a => a.value !== undefined ? String(a.value) : `<${a.type}>`).join(' ');
      consoleLogs.push({ t: Date.now(), type, text });
    }
  });
  cdp.on('Runtime.exceptionThrown', (params) => {
    const d = params.exceptionDetails;
    const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || 'unknown';
    consoleLogs.push({ t: Date.now(), type: 'exception', text: String(text) });
  });

  try {
    await cdp.sendCommand('Page.enable');
    await cdp.sendCommand('Runtime.enable');
    await cdp.sendCommand('Network.enable');

    // viewport 1280x800（analyzeEditLoad の rect 検証もこの値で行う）
    await cdp.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
    });

    // 新規documentに記録器を注入（以降の全ナビゲーションで有効）
    await cdp.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER_SOURCE });
    console.log('[setup] 記録器を addScriptToEvaluateOnNewDocument で注入済み\n');

    // ログインセッション注入（編集ページのデッキ取得に必要。トップページへもナビゲートされる）
    await injectSession(cdp);

    // ==========================================================
    console.log('--- 観点1/2/3: 編集ページフルナビゲーション（about:blank 経由） ---');
    consoleLogs.length = 0;
    await cdp.navigate('about:blank');
    await cdp.wait(300);
    await cdp.navigate(EDIT_URL);

    // 編集UIマウント待ち（30秒）
    const editReady = await cdp.waitFor(`!!document.querySelector('.deck-edit-container')`, 30000, 300);
    t.assert('2: 編集UI(.deck-edit-container)が30秒以内にマウントされる', editReady === true);

    // overlayフェードアウト(150ms)完了待ちを含めて安定化
    await cdp.wait(1500);

    const editLog = await readLog(cdp);
    const summary1 = analyzeEditLoad(t, editLog, '1/3');

    // --- 観点2: 編集UI正常起動とoverlay除去 ---
    const finalStateRaw = await cdp.evaluate(`(() => {
      const overlay = document.getElementById('ygo-next-module-loading-overlay');
      const earlyHide = document.getElementById('ygo-next-early-hide');
      const vueApp = document.getElementById('vue-edit-app');
      const container = document.querySelector('.deck-edit-container');
      return JSON.stringify({
        overlayExists: !!overlay,
        earlyHideExists: !!earlyHide,
        vueAppExists: !!vueApp,
        vueAppChildCount: vueApp ? vueApp.children.length : 0,
        containerExists: !!container,
        containerVisible: container ? getComputedStyle(container).display !== 'none' : false,
        containerRect: container ? (r => ({ w: Math.round(r.width), h: Math.round(r.height) }))(container.getBoundingClientRect()) : null,
        bgVisible: (() => { const bg = document.getElementById('bg'); return bg ? getComputedStyle(bg).display !== 'none' : false; })()
      });
    })()`);
    const fs = JSON.parse(finalStateRaw);
    console.log(`  [最終状態] overlay=${fs.overlayExists} earlyHide=${fs.earlyHideExists}` +
      ` vueEditApp=${fs.vueAppExists}(children=${fs.vueAppChildCount})` +
      ` container=${fs.containerExists}(${fs.containerVisible ? 'visible' : 'hidden'},rect=${fs.containerRect ? fs.containerRect.w + 'x' + fs.containerRect.h : 'null'})`);
    t.assert('2: ロード完了後 overlay(#ygo-next-module-loading-overlay)が除去されている', fs.overlayExists === false);
    t.assert('2: ロード完了後 early-hide(#ygo-next-early-hide)が除去されている', fs.earlyHideExists === false);
    t.assert('2: #vue-edit-app が生成されVueアプリがマウントされている', fs.vueAppExists === true && fs.vueAppChildCount > 0);
    t.assert('2: .deck-edit-container が表示状態（v-show isReady）', fs.containerExists === true && fs.containerVisible === true);
    t.assert('2: #bg が表示状態（Vue UIが#bg内で描画）', fs.bgVisible === true);

    // overlayが「存在してから除去される」経過をフレームログから確認
    if (editLog && editLog.frames) {
      const overlayRemoved = editLog.events
        ? editLog.events.some(e => e.k === 'rem' && e.id === 'ygo-next-module-loading-overlay')
        : true;
      t.assert('2: フレーム/イベントログ上で overlay 追加->削除 の遷移が観測される',
        editLog.frames.some(f => f.ov) && (overlayRemoved || !fs.overlayExists));
    }

    checkConsole(t, consoleLogs, '1/2/3');

    // ==========================================================
    console.log('\n--- 観点4a: 公式トップページのフルナビゲーション（回帰なし） ---');
    consoleLogs.length = 0;
    await cdp.navigate('about:blank');
    await cdp.wait(300);
    await cdp.navigate(TOP_URL);
    const topComplete = await cdp.waitFor(`document.readyState === 'complete'`, 20000, 300);
    t.assert('4a: トップページがロード完了する', topComplete === true);
    await cdp.wait(1500);

    const topLog = await readLog(cdp);
    const topStateRaw = await cdp.evaluate(`(() => {
      const wrapper = document.getElementById('wrapper');
      return JSON.stringify({
        wrapperExists: !!wrapper,
        wrapperDisplay: wrapper ? getComputedStyle(wrapper).display : null,
        overlayExists: !!document.getElementById('ygo-next-module-loading-overlay'),
        earlyHideExists: !!document.getElementById('ygo-next-early-hide'),
        htmlOverflowHidden: getComputedStyle(document.documentElement).overflow === 'hidden'
      });
    })()`);
    const ts = JSON.parse(topStateRaw);
    console.log(`  [トップページ状態] wrapper=${ts.wrapperExists ? ts.wrapperDisplay : 'missing'}` +
      ` overlay=${ts.overlayExists} earlyHide=${ts.earlyHideExists} htmlOverflowHidden=${ts.htmlOverflowHidden}`);
    t.assert('4a: トップページで #wrapper が表示状態（公式UIは隠されない）',
      ts.wrapperExists === true && ts.wrapperDisplay !== 'none');
    t.assert('4a: トップページで overlay なし', ts.overlayExists === false);
    t.assert('4a: トップページで early-hide なし', ts.earlyHideExists === false);
    t.assert('4a: トップページで html が overflow:hidden にされていない', ts.htmlOverflowHidden === false);
    if (topLog && topLog.frames && topLog.frames.length > 0) {
      const hiddenFrames = topLog.frames.filter(f => f.wEx && f.wD === 'none');
      const overlayFramesTop = topLog.frames.filter(f => f.ov || f.eh);
      console.log(`  [フレーム観測] 全${topLog.frames.length}フレーム: wrapper非表示フレーム=${hiddenFrames.length}` +
        ` overlay/early-hide存在フレーム=${overlayFramesTop.length}`);
      t.assert('4a: トップページの全フレームで #wrapper が非表示にされた期間なし', hiddenFrames.length === 0);
      t.assert('4a: トップページの全フレームで loader由来要素が現れない', overlayFramesTop.length === 0);
    } else {
      t.assert('4a: トップページのフレームログが取得できる', false);
    }
    checkConsole(t, consoleLogs, '4a');

    // ==========================================================
    console.log('\n--- 観点4b: デッキ表示ページ（content.js 動作・公式UI表示の回帰なし） ---');
    consoleLogs.length = 0;
    await cdp.navigate('about:blank');
    await cdp.wait(300);
    await cdp.navigate(PUBLIC_DECK_URL);
    await cdp.wait(4000);
    // デッキ画像ボタン（content.js の deck-image feature が公式ページに注入する要素）
    const camBtn = await cdp.waitFor(`!!document.getElementById('ygo-next-deck-image-btn')`, 20000, 500);
    t.assert('4b: デッキ表示ページで拡張機能のボタン(#ygo-next-deck-image-btn)が注入される（content.js動作）', camBtn === true);

    const deckStateRaw = await cdp.evaluate(`(() => {
      const wrapper = document.getElementById('wrapper');
      return JSON.stringify({
        wrapperExists: !!wrapper,
        wrapperDisplay: wrapper ? getComputedStyle(wrapper).display : null,
        overlayExists: !!document.getElementById('ygo-next-module-loading-overlay'),
        earlyHideExists: !!document.getElementById('ygo-next-early-hide')
      });
    })()`);
    const ds = JSON.parse(deckStateRaw);
    console.log(`  [デッキ表示ページ状態] wrapper=${ds.wrapperExists ? ds.wrapperDisplay : 'missing'}` +
      ` overlay=${ds.overlayExists} earlyHide=${ds.earlyHideExists}`);
    t.assert('4b: デッキ表示ページで #wrapper が表示状態', ds.wrapperExists === true && ds.wrapperDisplay !== 'none');
    t.assert('4b: デッキ表示ページで overlay/early-hide なし',
      ds.overlayExists === false && ds.earlyHideExists === false);
    checkConsole(t, consoleLogs, '4b');

    // ==========================================================
    console.log('\n--- 観点5: 公式トップから hashchange で #/ytomo/edit へ遷移（保証レベルB・prefetch済み経路の確定的再現） ---');
    consoleLogs.length = 0;

    // TASK-513: isolated world（content script）の execution context を追跡。
    // フルナビゲーションごとにcontextは再生成されるため、TOP_URL遷移の直前にリセットする。
    // cdp-helperのevaluateはcontextId選択に対応しないため、Runtime.evaluateは
    // sendCommandで直接呼ぶ（cdp-helper.cjsは変更しない）
    const isolatedContexts = new Map();
    cdp.on('Runtime.executionContextCreated', (params) => {
      const ctx = params.context || {};
      const isIsolated =
        (ctx.auxData && ctx.auxData.type === 'isolated') ||
        String(ctx.origin || '').startsWith('chrome-extension://');
      if (isIsolated) isolatedContexts.set(ctx.id, ctx);
    });
    cdp.on('Runtime.executionContextDestroyed', (params) => {
      isolatedContexts.delete(params.executionContextId);
    });

    await cdp.navigate('about:blank');
    await cdp.wait(300);
    isolatedContexts.clear();
    await cdp.navigate(TOP_URL);
    const topComplete2 = await cdp.waitFor(`document.readyState === 'complete'`, 20000, 300);
    t.assert('5: 遷移元トップページがロード完了する', topComplete2 === true);
    await cdp.wait(1500);

    // edit-ui 評価完了マーカーの poll（interval 200ms / timeout 10秒）。
    // window.ygoChangeLanguage は edit-ui/index.ts のモジュールスコープでのみ代入される
    // ため、'function' === edit-uiモジュール評価完了（prefetch経路の前提）。
    // timeoutにならないこと自体が前提検証（ならない場合はfailとして診断情報を出力）
    let markerSeen = false;
    let lastMarkerValue = null;
    const markerPollStart = Date.now();
    while (Date.now() - markerPollStart < 10000) {
      for (const contextId of Array.from(isolatedContexts.keys())) {
        try {
          const res = await cdp.sendCommand('Runtime.evaluate', {
            expression: 'typeof window.ygoChangeLanguage',
            contextId,
            returnByValue: true
          });
          const value = res && res.result && res.result.result ? res.result.result.value : undefined;
          lastMarkerValue = value === undefined ? String(value) : value;
          if (value === 'function') { markerSeen = true; break; }
        } catch (e) {
          // 破棄済みcontext等の評価エラーは読み飛ばす（次周回で追跡mapからは消える）
        }
      }
      if (markerSeen) break;
      await cdp.wait(200);
    }
    const markerElapsed = Date.now() - markerPollStart;
    t.assert(
      '5: edit-ui評価完了マーカー(window.ygoChangeLanguage)がisolated worldで10秒以内に観測される（prefetch済み確定）',
      markerSeen === true
    );
    console.log(`  [edit-ui評価マーカー] observed=${markerSeen} elapsed=${markerElapsed}ms` +
      ` isolatedContexts=${isolatedContexts.size} lastValue=${JSON.stringify(lastMarkerValue)}`);
    if (!markerSeen) {
      console.log('  [FAIL詳細] マーカー不達 = prefetchによるedit-ui評価が起きていない。' +
        ' tracked contexts: ' + JSON.stringify(
          Array.from(isolatedContexts.values()).map(c => ({ id: c.id, origin: c.origin }))
        ));
    }

    // hash遷移（フルナビゲーションなし。edit-ui評価済みが確定した後に行う）
    await cdp.evaluate(`location.hash = '#/ytomo/edit?dno=${PUBLIC_DECK_DNO}'`);
    // 途中状態サンプリング（overlayが表示されるか。チラつき自体は許容）
    await cdp.wait(600);
    const midState = await cdp.evaluate(`(() => ({
      overlayExists: !!document.getElementById('ygo-next-module-loading-overlay'),
      vueAppExists: !!document.getElementById('vue-edit-app')
    }))()`);
    console.log(`  [hash遷移600ms後] overlay=${midState.overlayExists} vueEditApp=${midState.vueAppExists}`);

    const hashEditReady = await cdp.waitFor(`!!document.querySelector('.deck-edit-container')`, 30000, 300);
    t.assert('5: hash遷移で編集UI(.deck-edit-container)がマウントされる', hashEditReady === true);
    await cdp.wait(1500);
    const hashFinal = await cdp.evaluate(`(() => ({
      overlayExists: !!document.getElementById('ygo-next-module-loading-overlay'),
      vueAppExists: !!document.getElementById('vue-edit-app'),
      containerExists: !!document.querySelector('.deck-edit-container')
    }))()`);
    console.log(`  [hash遷移最終状態] overlay=${hashFinal.overlayExists} vueEditApp=${hashFinal.vueAppExists}` +
      ` container=${hashFinal.containerExists}`);
    if (hashEditReady === true) {
      t.assert('5: hash遷移でも overlay が最終的に除去される', hashFinal.overlayExists === false);
      t.assert('5: hash遷移でも #vue-edit-app が生成される', hashFinal.vueAppExists === true);
    } else {
      console.log('  [FAIL詳細] hash遷移でマウントされない場合の状態を記録: ' + JSON.stringify(hashFinal));
    }
    checkConsole(t, consoleLogs, '5');

    // 後片付け（次テストに影響しないよう拡張ページから離れる）
    await cdp.navigate('about:blank');

    if (summary1) {
      console.log('\n--- 観点1/3 計測サマリ ---');
      console.log(`  チラつきフレーム数: ${summary1.flickerCount}`);
      console.log(`  overlay初観測時刻: ${summary1.firstOverlayT !== null ? summary1.firstOverlayT + 'ms（performance.now基準）' : 'n/a'}`);
      console.log(`  overlay親遷移: HTML直付け=${summary1.overlayParentTransition.html} BODY移動=${summary1.overlayParentTransition.body}`);
      console.log(`  記録フレーム数: ${summary1.frameCount}`);
    }

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
