/**
 * Content Script Loader（TASK-510: ロード画面の最初の描画前表示）
 *
 * manifest.json の run_at: document_start で最初の公式DOM描画前に評価される。
 * #/ytomo/ 系hash（デッキ編集UI）では:
 *   1. 公式DOM非表示スタイル（early-hide）とテーマ背景色を同期注入
 *   2. ロード画面（簡易オーバーレイ）を同期生成
 *   3. フェイルセーフタイマー（FAILSAFE_TIMEOUT_MS）を arm し、content.js の
 *      引き継ぎ（__ygoNextLoaderHandoff）が無ければ自要素を除去して公式画面へ復帰
 * ytomo以外は従来どおり DOMContentLoaded 後に content.js を評価する。
 *
 * 構造: 純関数 -> createLoader(deps)（依存注入・状態機械） -> 本番アダプタ。
 * classic script のまま（ESM化しない）。webpack外のため ID/キー文字列は
 * src側定数（EXTENSION_IDS.loading / STORAGE_KEY_SETTINGS）との二重管理であり、
 * tests/unit/content/loader-early-loading.test.ts がずれを機械検知する。
 *
 * 設計: docs/design/loader-early-loading-tech.md
 */
(function () {
  'use strict';

  // src/utils/dom-selectors.ts EXTENSION_IDS.loading・src/constants/storage-keys.ts
  // STORAGE_KEY_SETTINGS と同一文字列（二重管理。テストがずれを検知）
  var IDS = {
    overlay: 'ygo-next-module-loading-overlay',
    earlyHide: 'ygo-next-early-hide'
  };
  var SETTINGS_KEY = 'ygoNext:settings';
  // loader が生成した要素の識別属性（content.js 側はこの属性を持つ要素のみ削除・
  // takeover する。同IDの他人要素を誤って削除・改変しないための識別子）
  var LOADER_ATTR = 'data-ygo-next-loader';
  // dark/light 両テーマの背景色定数（src/content/index.ts と同一）
  var BG_DARK = '#1a1a1a';
  var BG_LIGHT = '#ffffff';
  var FAILSAFE_TIMEOUT_MS = 8000;

  // --- 純関数 ---

  /**
   * デッキ編集UI（#/ytomo/ 系）のhashか。
   * クエリ部分（?dno= 等）は除去した base 部で判定する（緩い判定。
   * 誤ヒット時は content.js 側の復帰処理とフェイルセーフが公式画面へ戻す）
   */
  function isYtomoHash(hash) {
    var base = String(hash || '').split('?')[0];
    return base === '#/ytomo' || base.indexOf('#/ytomo/') === 0;
  }

  /**
   * テーマ背景色を解決する。localStorage の ygoNext:settings を同期JSON.parseし、
   * theme が明示値（light/dark）ならそれを採る。system・未設定・parse失敗は
   * prefersDark 引数（prefers-color-scheme: dark 一致）で判定する。
   * 判定優先順位と背景色定数は src/content/index.ts と完全一致させる
   */
  function resolveThemeBgColor(settingsRaw, prefersDark) {
    var theme = null;
    if (typeof settingsRaw === 'string' && settingsRaw) {
      try {
        var parsed = JSON.parse(settingsRaw);
        if (parsed && typeof parsed === 'object' && typeof parsed.theme === 'string') {
          theme = parsed.theme;
        }
      } catch (e) {
        // parse失敗はprefersDarkへフォールバック（例外を外に漏らさない）
      }
    }
    if (theme === 'dark') return BG_DARK;
    if (theme === 'light') return BG_LIGHT;
    return prefersDark ? BG_DARK : BG_LIGHT;
  }

  /**
   * 公式DOM非表示CSS。src/content/index.ts の early-hide と同一内容
   */
  function buildEarlyHideCss(bg) {
    return (
      'html,body{background-color:' + bg + ' !important;overflow:hidden !important;}' +
      '#wrapper,#bg{display:none !important;}'
    );
  }

  // --- createLoader(deps): 状態機械+DOM操作（deps注入でテスト可能） ---
  // deps = { doc, win, storage, scheduleTimer(cb, ms) -> id, cancelTimer(id),
  //          importContent() -> Promise, prefersDark() -> boolean, console }
  // 戻り値 api = { boot, notifyStart, handoff, getState, getOwnElements }
  function createLoader(deps) {
    // 'idle' | 'armed' | 'handed_off' | 'fired'
    var state = 'idle';
    // 自分が生成した要素の参照のみを追跡（フェイルセーフの除去対象。
    // 同ID既存要素は他人のもののため含めない）
    var ownElements = [];
    var timerId = null;

    function track(el) {
      ownElements.push(el);
    }

    // storageアクセス（localStorage は SecurityError 等を投げうる）・prefersDark 取得の
    // 安全ラッパ。失敗時は未保存・非dark扱いで続行し、boot全体を例外終了させない
    function readSettingsRawSafely() {
      try {
        return deps.storage.getItem(SETTINGS_KEY);
      } catch (e) {
        return null;
      }
    }

    function prefersDarkSafely() {
      try {
        return !!deps.prefersDark();
      } catch (e) {
        return false;
      }
    }

    function ensureEarlyHide(bg) {
      if (deps.doc.getElementById(IDS.earlyHide)) return; // 冪等（既存は他人のもの→追跡しない）
      var style = deps.doc.createElement('style');
      style.id = IDS.earlyHide;
      style.setAttribute(LOADER_ATTR, '1');
      style.textContent = buildEarlyHideCss(bg);
      // head未生成でも最速（documentElement は content script 実行時に必ず存在する）
      (deps.doc.head || deps.doc.documentElement).appendChild(style);
      track(style);
    }

    function ensureOverlay(bg) {
      if (deps.doc.getElementById(IDS.overlay)) return; // 冪等
      var dark = bg === BG_DARK;
      var titleColor = dark ? '#ffffff' : '#1a1a1a';
      var spinnerTrack = dark ? '#333' : '#ddd';
      var spinnerTop = dark ? '#888' : '#666';
      var subColor = dark ? '#888' : '#666';

      // 完全版（src/content/index.ts loadEditUIIfNeeded）と視覚一致するオーバーレイ
      var overlay = deps.doc.createElement('div');
      overlay.id = IDS.overlay;
      overlay.setAttribute(LOADER_ATTR, '1');
      var overlayStyle = overlay.style;
      overlayStyle.position = 'fixed';
      overlayStyle.top = '0';
      overlayStyle.left = '0';
      overlayStyle.width = '100%';
      overlayStyle.height = '100%';
      overlayStyle.backgroundColor = bg;
      overlayStyle.zIndex = '999999';
      overlayStyle.pointerEvents = 'none';
      overlayStyle.display = 'flex';
      overlayStyle.flexDirection = 'column';
      overlayStyle.alignItems = 'center';
      overlayStyle.justifyContent = 'center';
      overlayStyle.gap = '24px';

      var title = deps.doc.createElement('div');
      title.textContent = 'YuGiOh NEXT';
      title.style.fontSize = '42px';
      title.style.fontWeight = '600';
      title.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      title.style.color = titleColor;
      title.style.letterSpacing = '1px';

      var spinner = deps.doc.createElement('div');
      spinner.style.width = '48px';
      spinner.style.height = '48px';
      spinner.style.border = '3px solid ' + spinnerTrack;
      spinner.style.borderTop = '3px solid ' + spinnerTop;
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'ygo-spin 0.8s linear infinite';

      var subText = deps.doc.createElement('div');
      subText.textContent = 'NEXT Deck Edit Page';
      subText.style.color = subColor;
      subText.style.fontSize = '13px';
      subText.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      subText.style.fontWeight = '400';
      subText.style.letterSpacing = '0.5px';

      overlay.appendChild(title);
      overlay.appendChild(spinner);
      overlay.appendChild(subText);

      // スピナー用 @keyframes（無ID）。content.js側の同内容二重定義は無害
      var spinStyle = deps.doc.createElement('style');
      spinStyle.textContent =
        '@keyframes ygo-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';

      (deps.doc.body || deps.doc.documentElement).appendChild(overlay);
      (deps.doc.head || deps.doc.documentElement).appendChild(spinStyle);
      track(overlay);
      track(spinStyle);
    }

    function fireFailsafe() {
      if (state !== 'armed') return;
      state = 'fired';
      // 参照ベース除去（同IDの他人要素は削除しない）
      ownElements.forEach(function (el) {
        el.remove();
      });
      ownElements = [];
      deps.console.warn('[loader.js] content.js takeover timeout. Restored official page.');
    }

    function armFailsafe() {
      if (timerId !== null) deps.cancelTimer(timerId);
      timerId = deps.scheduleTimer(fireFailsafe, FAILSAFE_TIMEOUT_MS);
      state = 'armed';
    }

    var api = {
      // 評価開始通知: タイマーを解除しない。カウントダウンを1回やり直すだけ
      // （fetch遅延対策・有界。content.js 評価後に例外が出ても発火すれば復帰する）
      notifyStart: function () {
        if (state === 'armed') armFailsafe();
      },
      // 引き継ぎ成功通知: armed のときのみタイマー解除。idempotent
      handoff: function () {
        if (state !== 'armed') return;
        if (timerId !== null) {
          deps.cancelTimer(timerId);
          timerId = null;
        }
        state = 'handed_off';
      },
      getState: function () {
        return state;
      },
      getOwnElements: function () {
        return ownElements.slice();
      },
      boot: function () {
        var hash = deps.win.location.hash;
        var ytomo = isYtomoHash(hash);
        if (ytomo) {
          // テーマ解決（storage読み+prefersDark）はytomo系でのみ実行する。
          // 非ytomoページでstorageアクセスが例外（SecurityError等）を投げる環境でも
          // loader全体が例外終了して content.js ロードが阻害されないようにするため
          var bg = resolveThemeBgColor(readSettingsRawSafely(), prefersDarkSafely());
          ensureEarlyHide(bg); // 同期・最初の描画前
          ensureOverlay(bg);   // 同期・最初の描画前
          armFailsafe();
          // 状態機械を content.js へ公開（ytomo系のみ。非ytomoでは公開しない）
          deps.win.__ygoNextLoaderNotifyStart = api.notifyStart;
          deps.win.__ygoNextLoaderHandoff = api.handoff;
        }
        var start = function () {
          deps.importContent().catch(function (e) {
            deps.console.error('[loader.js] Failed to load content.js:', e);
          });
        };
        if (ytomo) {
          // ytomo系: 即時（大容量content.jsの評価を公式DOM構築と並行）
          start();
        } else if (deps.doc.readyState === 'loading') {
          // ytomo以外: DCL後（公式ページの実行タイミング現状維持）
          deps.doc.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
          start();
        }
      }
    };
    return api;
  }

  // --- テスト用exportフック（CJS/vmテスト文脈のみ。本番classic scriptでは module 未定義） ---
  var exported = {
    isYtomoHash: isYtomoHash,
    resolveThemeBgColor: resolveThemeBgColor,
    buildEarlyHideCss: buildEarlyHideCss,
    createLoader: createLoader,
    IDS: IDS,
    SETTINGS_KEY: SETTINGS_KEY,
    FAILSAFE_TIMEOUT_MS: FAILSAFE_TIMEOUT_MS
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }

  // --- 本番アダプタ: classic script実行（module未定義）のときのみ起動 ---
  //    テスト（module定義あり）では起動しない -> vm実行で import() の
  //    importModuleDynamically 問題を回避しつつ、createLoader(deps) で
  //    boot を含む全動作を検証可能
  if (typeof module === 'undefined') {
    createLoader({
      doc: document,
      win: window,
      storage: localStorage,
      console: console,
      scheduleTimer: function (cb, ms) {
        return setTimeout(cb, ms);
      },
      cancelTimer: function (id) {
        clearTimeout(id);
      },
      prefersDark: function () {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      },
      importContent: function () {
        return import(chrome.runtime.getURL('content.js'));
      }
    }).boot();
  }
})();
