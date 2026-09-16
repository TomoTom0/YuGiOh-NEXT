# ロード画面の最初の描画前表示（loader.js 先行読み込み）技術設計

- 対応タスク: TASK-510（拡張機能ページ表示時に公式画面が一瞬表示される回帰の解消）、TASK-513（prefetch済みedit-uiモジュールでhash遷移時にロード画面から進まない問題の修正 -> §10 追補）
- 状態: 実装済み（v0.7.x）。実装後のコードレビュー（codex）指摘3件（必須）に対応済み -> §9 追補。TASK-513も実装済み -> §10 追補
- 履歴: 設計rev2（2026-09-16。codex設計レビュー「条件付き承認」の6指摘+実装時注記を反映）を清書した恒久版。一次出典の作業メモ（tmp/）は破棄済みで本書が正本

rev2で反映したレビュー指摘:
- 指摘1（Critical）: handoff を「評価開始通知（notifyStart）」と「引き継ぎ成功通知（handoff）」に分離。状態機械として整理
- 指摘2（High）: DCL 待ちを overlay 構築より前に移動（`document.head.appendChild(spinnerStyle)` の head 未生成クラッシュ解消）
- 指摘3（High）: prefetch/hashchange/ロード中hashchange との競合の状態遷移を明示
- 指摘4（High）: フェイルセーフは自要素参照のみ除去（同ID既存要素の誤削除防止）+ fired 後の遅延到着の状態管理
- 指摘5（Medium）: hash遷移の保証レベルと edit 離脱時の解除条件を明記（§7）
- 指摘6（Medium）: テスト方式を createLoader(deps) の依存注入化に統一（§5）

## 背景（回帰の原因）

- 旧構造: `run_at document_end` + css宣言なし + loader.js動的import -> 公式DOM完成後・全モジュール評価後にしかロード画面を出せない（2025-12から不変）
- regression発火: 97633cf（2026-08-28, PR #134）で日常デプロイが本番から開発ビルドに切替、content.jsが約600KBから3.0MB（約5倍）になり公式描画前に評価が間に合わなくなった

## 前提確認（コード調査結果・旧状態）

- 旧 `public/loader.js` は import のみ（14行）。content.js側（`src/content/index.ts`）に early-hide と完全版オーバーレイが既存
- 旧 `loadEditUIIfNeeded` の `document.head.appendChild(spinnerStyle)` は head 未生成（document_start 評価）で TypeError になる。body への append は null 対応済み
- dist鏡像: webpack.config.cjs の CopyWebpackPlugin（`from: 'public', to: '.'`）で manifest.json・loader.js は dist 直下へコピー -> scripts/deploy.sh が dist を rsync。deploy.sh の変更は不要。webpack.config.cjs はコードレビュー指摘1対応で style-loader の insert オプションを追加した（§9 追補。当初の「変更不要」前提は撤回）
- edit-ui の #bg 要求: `src/content/edit-ui/index.ts` の `loadEditUI()` は `document.getElementById('bg')` が無いと `console.error` して `isEditUILoaded=false` で中断する。edit-ui モジュールは動的import時点でトップレベルIIFEから `watchUrlChanges()` -> `loadEditUI()` を即実行するため、document_start で content.js を即時評価すると #bg 未生成でUIロードが失敗する。edit-ui を不変とするため、content/index.ts 側で edit-ui import を DOMContentLoaded（DCL）後に遅延する
- フラグの二重管理（既存構造・本設計では不変）: content/index.ts の `editUILoaded`（loadEditUIIfNeeded の再入防止。リセットされない）と edit-ui/index.ts の `isEditUILoaded`（hashchange で edit 離脱時にリセット）は別管理。edit 離脱->再入では content 側は早期returnし、edit-ui 側の hashchange リスナがUIを再ロードする（オーバーレイ無し・モジュールキャッシュ済みで高速）

---

## 1. loader.js の詳細設計

構造: 純関数 -> `createLoader(deps)` ファクトリ（依存注入・状態機械） -> 本番アダプタ起動、の順。classic script のまま（ESM化しない）。テストは `createLoader` にモック deps を渡して駆動する（§5）。

```
public/loader.js（擬似コード）
(function () {
  'use strict';
  var IDS = {
    overlay: 'ygo-next-module-loading-overlay',   // EXTENSION_IDS.loading.moduleLoadingOverlay と同一文字列
    earlyHide: 'ygo-next-early-hide'              // EXTENSION_IDS.loading.earlyHideStyle と同一文字列
  };
  var SETTINGS_KEY = 'ygoNext:settings';           // STORAGE_KEY_SETTINGS と同一文字列
  var LOADER_ATTR = 'data-ygo-next-loader';        // loader生成要素の識別属性（§9 追補・指摘3）
  var FAILSAFE_TIMEOUT_MS = 8000;

  // --- 純関数 ---
  function isYtomoHash(hash) {
    var base = String(hash || '').split('?')[0];
    return base === '#/ytomo' || base.indexOf('#/ytomo/') === 0;
  }
  function resolveThemeBgColor(settingsRaw, prefersDark) {
    // localStorage の ygoNext:settings を同期JSON.parse（try/catch）
    // theme: 'light'|'dark' -> そのまま / 'system'・undefined・parse失敗 -> prefersDark 引数で判定
    // 戻り値: '#1a1a1a'（dark） | '#ffffff'（light）
  }
  function buildEarlyHideCss(bg) {
    return 'html,body{background-color:' + bg + ' !important;overflow:hidden !important;}'
         + '#wrapper,#bg{display:none !important;}';
  }

  // --- createLoader(deps): 状態機械+DOM操作（deps注入でテスト可能） ---
  // deps = { doc, win, storage, scheduleTimer(cb, ms) -> id, cancelTimer(id),
  //          importContent() -> Promise, prefersDark() -> boolean, console }
  // 戻り値 api = { boot, notifyStart, handoff, getState, getOwnElements }
  function createLoader(deps) {
    var state = 'idle';          // 'idle' | 'armed' | 'handed_off' | 'fired'
    var ownElements = [];        // 自分が生成した要素の参照のみを追跡（フェイルセーフの除去対象）
    var timerId = null;

    function ensureEarlyHide(bg) {
      if (deps.doc.getElementById(IDS.earlyHide)) return;        // 冪等（既存同ID要素は追跡しない）
      var s = deps.doc.createElement('style');
      s.id = IDS.earlyHide; s.setAttribute(LOADER_ATTR, '1'); s.textContent = buildEarlyHideCss(bg);
      (deps.doc.head || deps.doc.documentElement).appendChild(s);  // head未生成でも最速
      track(s);
    }
    function ensureOverlay(bg) {
      if (deps.doc.getElementById(IDS.overlay)) return;          // 冪等
      // div#IDS.overlay: position:fixed 全画面・bg背景・zIndex 999999・flex縦中央・gap24px
      //   overlay.setAttribute(LOADER_ATTR, '1') で識別属性を付与（§9 追補・指摘3）
      //   子1: "YuGiOh NEXT"（42px/600/system-ui、darkなら#fff/lightなら#1a1a1a）
      //   子2: スピナー（48px角丸、border 3px #ddd/#333 + borderTop #666/#888、animation ygo-spin .8s linear infinite）
      //   子3: "NEXT Deck Edit Page"（13px、#666/#888）  <- 完全版（loadEditUIIfNeeded）と視覚一致
      // @keyframes ygo-spin を別 <style>（無ID）で注入 -> track する（除去対象）
      //   ※content.js側の同内容二重定義は無害
      (deps.doc.body || deps.doc.documentElement).appendChild(overlay);
      track(overlay); track(spinStyle);
    }

    function fireFailsafe() {
      if (state !== 'armed') return;
      state = 'fired';
      ownElements.forEach(function (el) { el.remove(); });       // 参照ベース除去（同IDの他人要素は削除しない）
      ownElements = [];
      deps.console.warn('[loader.js] content.js takeover timeout. Restored official page.');
    }
    function armFailsafe() {
      if (timerId !== null) deps.cancelTimer(timerId);
      timerId = deps.scheduleTimer(fireFailsafe, FAILSAFE_TIMEOUT_MS);
      state = 'armed';
    }

    var api = {
      // 評価開始通知: タイマーを解除しない。カウントダウンを1回やり直すだけ（fetch遅延対策・有界）
      notifyStart: function () { if (state === 'armed') armFailsafe(); },
      // 引き継ぎ成功通知: armed のときのみタイマー解除。idempotent
      handoff: function () {
        if (state !== 'armed') return;
        deps.cancelTimer(timerId); timerId = null; state = 'handed_off';
      },
      getState: function () { return state; },
      getOwnElements: function () { return ownElements.slice(); },
      boot: function () {
        var hash = deps.win.location.hash;
        var ytomo = isYtomoHash(hash);
        if (ytomo) {
          // テーマ解決（storage読み+prefersDark）はytomo系でのみ実行（§9 追補・指摘2）。
          // storageアクセス・prefersDarkとも例外は安全ラッパで吸収する
          var bg = resolveThemeBgColor(readSettingsRawSafely(), prefersDarkSafely());
          ensureEarlyHide(bg);      // 同期・最初の描画前
          ensureOverlay(bg);        // 同期・最初の描画前
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
        if (ytomo) { start(); }                                        // ytomo系: 即時（3MB評価を公式DOM構築と並行）
        else if (deps.doc.readyState === 'loading') {                  // ytomo以外: DCL後（公式ページの実行タイミング現状維持）
          deps.doc.addEventListener('DOMContentLoaded', start, { once: true });
        } else { start(); }
      }
    };
    return api;
  }

  // --- テスト用exportフック（CJS/vmテスト文脈のみ。本番classic scriptでは module 未定義） ---
  var api = { isYtomoHash, resolveThemeBgColor, buildEarlyHideCss, createLoader,
              IDS: IDS, SETTINGS_KEY: SETTINGS_KEY, FAILSAFE_TIMEOUT_MS: FAILSAFE_TIMEOUT_MS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }

  // --- 本番アダプタ: classic script実行（module未定義）のときのみ起動 ---
  //    テスト（module定義あり）では起動しない -> vm実行で import() の
  //    importModuleDynamically 問題を回避しつつ、createLoader(deps) で boot を含む全動作を検証可能
  if (typeof module === 'undefined') {
    createLoader({
      doc: document, win: window, storage: localStorage, console: console,
      scheduleTimer: function (cb, ms) { return setTimeout(cb, ms); },
      cancelTimer: function (id) { clearTimeout(id); },
      prefersDark: function () {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      },
      importContent: function () { return import(chrome.runtime.getURL('content.js')); }
    }).boot();
  }
})();
```

補足:
- `#/ytomo/` 系は content.js が document_start で評価される経路が増えるが、index.ts トップレベルのDOM依存のうち loader より前のものは early-hide（head/or MutationObserver 待機済み）のみ。overlay 構築は DCL 待ちの後（§2）なので head/body が保証される
- documentElement 直付け: document_start 時点で `document.documentElement` は必ず存在する（content script 実行時に html 要素は暗黙存在）。最終フォールバックとして `(head||documentElement)` / `(body||documentElement)` 構文を維持。実ブラウザで HTML parser による再配置・foster-parenting が起きないかは E2E で確認（§8）
- loader は MutationObserver を使わない（直付けで最初の描画前に間に合う）。したがって loader 起点の observer 解除処理は不要
- manifest: `content_scripts[0].run_at = 'document_start'`・`js[0] = 'loader.js'`・web_accessible_resources に content.js

## 2. 引き継ぎプロトコル（2フェーズ + 状態機械）

**window変数方式**。同一 isolated world 内で loader.js と content.js（動的import含む）は window を共有するため、DOM ID より確実かつ同期的。

### 2.1 状態機械（loader 側）

```
idle（非ytomo。要素・タイマー無し）
  | boot(): ytomo系hash
  v
armed（early-hide + overlay + spinner style 生成済み・タイマー走行中）
  | notifyStart()  -- タイマー解除しない。カウントダウンを1回再始動（fetch遅延対策）
  | handoff()      -- タイマー解除 -> handed_off（終態）
  | FAILSAFE_TIMEOUT_MS 経過 -> fired（終態）: 自要素を参照ベースで除去し公式画面復帰 + warn
  v
handed_off / fired（終態。以降 notifyStart/handoff は no-op）
```

- **評価開始だけではタイマーを解除しない**: content.js 評価開始（notifyStart）後に isVueEditPage 判定・early-hide/overlay処理・loadEditUIIfNeeded・initializeFeatures・chrome.storage/dynamic import 等で例外が出ても、タイマーは走り続け（最長 FAILSAFE_TIMEOUT_MS x2）、発火すれば loader 自身の参照で要素を除去して公式画面を復帰させる
- **fired 後に content.js が遅延到着した場合**: loader の notifyStart/handoff は no-op。content.js は自分の early-hide/overlay を新規生成するが、§2.3 のとおり content.js 自身の try/catch・catch 節による要素除去（復帰保証）が常にあるため「隠したまま戻らなくなる」状態は作らない

### 2.2 window API

```
window.__ygoNextLoaderNotifyStart()  // content.js モジュール評価冒頭から呼ぶ（タイマー継続）
window.__ygoNextLoaderHandoff()      // 引き継ぎ成功確定時に呼ぶ（タイマー解除）
```

いずれも ytomo系でのみ loader が登録する。非ytomoページでは undefined（content.js は optional chaining で呼ぶため無害）。

### 2.3 content.js 側（src/content/index.ts）

```ts
// ===== モジュール評価冒頭（他のトップレベル処理の前） =====
// 評価開始を通知。フェイルセーフは解除しない（指摘1対応）
window.__ygoNextLoaderNotifyStart?.();

/** loader由来の early-hide/overlay を除去（存在すれば）。公式画面復帰
 *  src/utils/loader-elements.ts に切り出し。識別属性 data-ygo-next-loader を持つ
 *  要素のみ削除する（同IDの他人要素は保護。§9 追補・指摘3） */
function removeLoaderDerivedElements(): void { /* 属性ゲート付き削除（utilからimport） */ }

// ===== 編集ページブート（runEditPageBoot に閉じる。同期クラッシュ保護付き） =====
function runEditPageBoot(): void {
  try {
    // テーマ判定 + early-hide（冪等化: 既存IDのstyleがあれば再注入skip）
    // preloadEditPageData().catch(...)
    // loadEditUIIfNeeded()
    //   .catch(err => { removeLoaderDerivedElements(); console.error('[Content] Edit UI boot failed:', err); })
  } catch (error) {
    // 同期クラッシュでも公式画面を復帰させる（指摘1: handoff前クラッシュの保護）
    removeLoaderDerivedElements();
    console.error('[Content] Edit page boot failed:', error);
  }
}

if (isVueEditPage()) {
  runEditPageBoot();
} else {
  // 非編集ページ: loader要素（緩いhash誤ヒット時に残存）を除去してから handoff
  removeLoaderDerivedElements();
  window.__ygoNextLoaderHandoff?.();      // 要素除去完了後＝引き継ぎ成功（指摘1の非編集ページ条件）
  // prefetchEditUI スケジュール（不変）
}
```

loadEditUIIfNeeded の変更:

```ts
async function loadEditUIIfNeeded(): Promise<void> {
  if (!isVueEditPage() || editUILoaded) return;
  editUILoaded = true;

  // [指摘2] head/body に依存する overlay 構築より前に DCL 待ちを置く
  //   - spinnerStyle の document.head.appendChild の head 未生成クラッシュ解消
  //   - edit-ui loadEditUI の #bg 要求も DCL 後に満たされる
  if (document.readyState === 'loading') {
    await new Promise<void>(resolve =>
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  }

  // [PR#156レビュー指摘1] 待機中のhash離脱再検証: 待機中に非編集hashへ遷移した場合は
  //   このまま続行すると overlay 生成 + handoff（フェイルセーフ解除）まで進む一方で
  //   edit-ui が非編集ルートをマウントせず公式画面が覆われたままになる。非編集評価
  //   経路と同型（要素除去後に handoff）で復帰して中断する
  if (!isVueEditPage()) {
    editUILoaded = false;
    removeLoaderDerivedElements();
    window.__ygoNextLoaderHandoff?.();
    return;
  }

  // [指摘1] edit-ui の前提検証: #bg が無ければ復帰して中断（edit-ui側の console.error 経路を先回り）
  if (!document.getElementById('bg')) {
    console.error('[Content] #bg not found after DOMContentLoaded');
    editUILoaded = false;
    removeLoaderDerivedElements();
    return;
  }

  // テーマ判定（不変）
  // オーバーレイ冪等テイクオーバー: 識別属性 data-ygo-next-loader を持つ同ID overlay
  //   （findLoaderOverlay() が要素を返す）なら中身（タイトル/スピナー/サブテキスト）を
  //   完全版に再構築し body へ移動（親が documentElement の場合）。属性を持たない同ID
  //   要素（他人要素）は改変せず新規生成する（新規overlayにも識別属性を付与。
  //   §9 追補・指摘3）。spinner用 style の二重注入は同一 @keyframes ygo-spin 定義のため無害
  //   [PR#156レビュー指摘2] lookup は getElementById でなく findLoaderOverlay() の
  //   識別属性セレクタ（#id[data-ygo-next-loader]）で行い、他人要素が文書順で先在して
  //   も拡張由来overlayを正しく捕捉する（cleanup側も同様）

  try {
    // [指摘1] 失敗時処理（下のcatch）の登録済み＋前提検証済みの状態で handoff＝フェイルセーフ解除
    window.__ygoNextLoaderHandoff?.();
    // withTimeout(editUIModulePromise || import('./edit-ui'), 30000)
  } catch (error) {
    // 既存のログ出し分け（TimeoutError か否か）+ editUILoaded = false（不変）
    // [指摘1/4b] import失敗・タイムアウト時に公式画面を復帰させる（隠したままにしない）
    removeLoaderDerivedElements();
  }
}
```

handoff 呼び出し条件のまとめ（指摘1の要求）:
- **非編集ページ**: loader要素除去完了後（上記 else 節）
- **編集ページ**: DCL 待ち・#bg 検証・overlay テイクオーバーが完了し、edit-ui import の失敗時処理（catch による要素除去）が登録された直後（import 開始直前）

### 2.4 hashchange 経路（不変）と競合の整理（指摘3）

`editUIModulePromise`（モジュールスコープ）を prefetchEditUI と loadEditUIIfNeeded が共有する既存構造は不変。DCL 待ち追加後の状態遷移:

| ケース | 経路 | 挙動 |
|---|---|---|
| (a) 初期URLが #/ytomo/edit（直アクセス） | トップレベル -> loadEditUIIfNeeded（readyState='loading'） | DCL 待ち -> #bg 検証 -> overlay -> handoff -> import。**editUILoaded=true は await 前に立つ**ため、待機中の再呼び出し（hashchange・DCL時点の再評価等）は早期returnでガード |
| (b) 非編集ページで prefetch 後に hashchange で edit 入遷移 | hashchange リスナ -> loadEditUIIfNeeded（readyState='complete'） | DCL 待ちなし（即時）。`editUIModulePromise || import(...)` で prefetch 済み Promise を再利用。prefetch が reject 済みで null リセット後なら新規 import。reject が伝播した場合は catch -> 要素除去で復帰。**注（TASK-513）**: Promise の再利用は content 側の責務のまま変更なし。マウント実行は edit-ui 側が担う（prefetch済みなら評価時に登録済みの edit-ui 側リスナが駆動。§10） |
| (c) ページロード中に hashchange が発生（初期URL非ytomo->ロード中に #/ytomo/edit へ変化） | hashchange リスナ -> loadEditUIIfNeeded（readyState='loading' の可能性） | 「hashchange経路は readyState complete」という前提は排他的でないため、DCL 待ちは**経路によらず readyState==='loading' なら適用**。DCL 即〜短時間待ちで (a) と同じ流れに合流 |
| (d) edit 離脱 -> 再入（hashchange） | edit-ui 側 isEditUILoaded リセット、content 側 editUILoaded は未リセット（既存） | content 側 loadEditUIIfNeeded は早期return。edit-ui 側 hashchange リスナが loadEditUI を再実行（overlay なし・高速）。**現行挙動のまま変更しない**（前提確認の二重管理参照）。**注（TASK-513）**: (b) 型経由（prefetch済みモジュールでの hash 入遷移）での初回マウント後も成立する（修正前は (b) 型の初回マウント自体が起きずリスナも未登録のため壊れていた。§10） |

なお (a) の DCL 待ち中に prefetched promise が存在するケースは無い（ytomo直アクセスでは prefetchEditUI は走らない。非編集ページのみ idle スケジュールのため）。

## 3. 既存コードとの整合（壊さない変更箇所の特定）

| 箇所 | 変更 | 影響 |
|---|---|---|
| index.ts モジュール冒頭 | notifyStart 呼び出し + removeLoaderDerivedElements/runEditPageBoot 追加 | 既存の console.temp 定義・import 文は不変 |
| index.ts 編集ページ分岐（旧トップレベル） | runEditPageBoot へ関数化 + try/catch + early-hide 冪等化（既存IDあればskip） | テーマ判定ロジック・preloadEditPageData は不変 |
| index.ts 非編集ページ分岐 | 分岐先頭に loader要素除去 + handoff | prefetchEditUI の readyState 分岐は不変 |
| index.ts loadEditUIIfNeeded | 先頭にDCL待ち・#bg検証、overlay テイクオーバー、handoff、catch に復帰追加 | テーマ判定、withTimeout、editUILoaded フラグは不変。hashchange 呼び出しも同一関数なので自動的に対応 |
| index.ts hashchangeリスナ | 不変 | (b)(c)(d) の経路は loadEditUIIfNeeded 内の readyState 分岐で吸収 |
| edit-ui/index.ts | TASK-510時点は変更なし。TASK-513で IIFE の常時 watchUrlChanges() 登録と世代トークン機構を追加（§10） | loadEditUI は DCL 後に呼ばれるため #bg が保証される（公式HTMLの静的要素。旧 document_end 動作の実績と同一条件）という TASK-510 の前提は不変 |
| initializeFeatures | 不変 | ytomo系で document_start 評価される経路が増えるが、isDeckDisplayPage=false で deck-display 系はスキップ。cacheCgidInStorage 内 sessionManager.getCgid() のDOM抽出は初回訪問時のみ失敗し得るが catch 済み（warnのみ）・cgid は通常 Chrome Storage 保存済みで preload へ影響なし（§8 注記） |
| src/types/window.d.ts | `__ygoNextLoaderNotifyStart` / `__ygoNextLoaderHandoff` の型宣言追加 | - |
| webpack.config.cjs + scripts/lib/style-insert.cjs | css/scss両ruleの style-loader に insert オプション（挿入先: head \|\| documentElement）を追加（§9 追補・レビュー指摘1） | headが存在する通常ページ（popup/options等）では挙動不変 |
| src/utils/loader-elements.ts | 新設。識別属性（data-ygo-next-loader）による削除・takeover のゲート（§9 追補・レビュー指摘3） | content/index.ts から利用。unit テスト可能な形にロジックを分離 |

## 4. テーマ背景色の重複回避

- loader.js は `ygoNext:settings`（cacheSettingsGlobally が保存する AppSettings JSON）を同期読み。`theme: 'light'|'dark'|'system'`。system/欠損/parse失敗は `prefers-color-scheme` へフォールバック。**判定優先順位と背景色定数（#1a1a1a/#ffffff）は index.ts のテーマ判定と完全一致させる**
- 既存のテーマ適用処理（edit-ui/index.ts `applyThemeFromSettings` の data-ygo-next-theme 属性・CSS変数）は不変。loader は背景色の注入のみで属性は触らないため重複なし
- テーマ判定の共通関数化は行わない（webpack外の loader.js からは共有不能で、既存2箇所のリファクタは範囲外）。ずれ検知はテストで担保（§5）

## 5. テスト設計方針

**方式（指摘6対応: 依存注入に統一）**: loader.js を `fs.readFileSync` + vm.Script で評価（module オブジェクト注入）し、export フックから `createLoader` を取り出す。`createLoader(mockDeps)` に happy-dom の document・fake timer（scheduleTimer/cancelTimer モック）・importContent spy を注入して boot・状態機械・フェイルセーフを直接駆動する。本番アダプタ（末尾の `if (typeof module === 'undefined')` ブロック）は vm 実行で起動しない構造のため、`importModuleDynamically` callback の設定は不要。本番アダプタの中身はコード包含検証で担保。

- テスト: `tests/unit/content/loader-early-loading.test.ts`（23it。[covers:*]タグ付き）
- 条件書: `tests/design/loader-early-loading/conditions.toml`（23条件）
- manifest 検証（run_at document_start・js[0]=loader.js・web_accessible_resources）: `tests/unit/webpack/dynamic-import-bundle.test.ts` が public/ と dist/ の両 manifest を検証
- loader.js サイズ上限: 実測基準（実測 10.84KB に対し上限 13KB = 実測 + 約2KBマージン。document_start 評価の初期描画影響ガード）
- content/index.ts 側（トップレベル副作用）: `tests/design/content-index/conditions.toml` に12条件を条件化のみ（verified=false + unverifiable_reason。E2E方針）
- E2E: `tests/browser/test-loader-flicker.cjs` 案 - CDP で edit ページを開き、初期フレームから #wrapper が非表示・オーバーレイ表示を確認（tracing or 連続 screenshot）。rushdb（`/rushdb/#/ytomo/edit`、`?request_locale=ja` 付き）でも #bg/#wrapper の実DOM構成が同一であることを確認する項目を含める（§8）

## 6. dist鏡像

public/ -> dist/ は CopyWebpackPlugin で自動コピー。manifest.json・loader.js とも対象内。`mise run build-deploy` で反映され deploy.sh が rsync。**deploy.sh の設定変更は不要**（webpack.config.cjs は §9 追補の style-loader insert 追加のみ）。

## 7. hash遷移の扱いの一貫化（保証レベルと解除条件）

| 経路 | 保証レベル | 挙動 |
|---|---|---|
| 初期URLが #/ytomo/ 系（直アクセス・リロード） | **A: 最初の描画前hide保証あり** | loader が document_start で early-hide + overlay を最初の描画前に注入。content.js 引き継ぎ後、edit-ui loadEditUI が early-hide 除去、DeckEditLayout.vue が overlay をフェード除去 |
| hashchange で edit に入遷移 | **B: 最初の描画前hide保証なし**（公式ページは既に描画済みのため保証の対象外） | loader は不関与（document_start の1回のみ動作）。content.js の loadEditUIIfNeeded が overlay を即時生成（readyState='complete' なので DCL 待ちなし）。マウント実行は edit-ui 側が担う: モジュール未評価なら import 完了時のトップレベルIIFEが、prefetch済み（非編集ページで評価済み）なら評価時に登録済みの edit-ui 側 hashchange リスナが loadEditUI を駆動する（TASK-513修正。修正前は prefetch 済みの場合に誰も loadEditUI を呼ばずロード画面のまま進まなかった。§10） |
| edit から公式画面へ hashchange 離脱 | - | edit-ui 側: isEditUILoaded リセット + headerResizeObserver disconnect。overlay は deck ロード完了時に既に除去済み、early-hide は loadEditUI 実行時に既に除去済みのため、離脱時に残す loader 由来要素は無い。loader は observer を持たないため解除不要 |
| 離脱が deck ロード完了前（overlay 表示中）に起こる場合 | - | 現行では Vue アプリは #bg 内に残存し公式DOMと混在する既存挙動（edit-ui に unmount 無し）。本設計では不変（整理のみ。改善は別タスク候補） |

## 8. 実装時の注意（codexレビューの注記項目）

- **documentElement 直付けの実装条件**: `(head || documentElement)` / `(body || documentElement)` のフォールバック構文を維持する。overlay は content.js テイクオーバー時に body へ移動する（§2.3）。実ブラウザで HTML parser が document_start 時点の直付け要素を再配置しないこと・foster-parenting が起きないことを E2E（test-loader-flicker.cjs）で実機確認する
- **ytomo系即時評価の影響**:
  - cgid 抽出（cacheCgidInStorage -> sessionManager.getCgid -> DOM走査）は初回訪問時のみ失敗し得る（catch済み・warnのみ）。Chrome Storage に保存済みなら preload へ影響なし。**DOM完成後の再試行は行わない**（初回直アクセス時のみ preload が省略され、edit UI の通常ロード経路（デッキ取得はloadDeck時）で機能するため実害が無い。再試行を入れるなら別タスク）
  - detectLanguage(document)（html lang 属性）・initializeMappingManager は document_start でも動作（html 要素の属性はパース開始時に存在）。forbiddenLimitedCache/genesysPointCache は chrome.storage 依存で DOM 非依存
- **rushdb 実確認**: `isVueEditPage` は `/rushdb/` パスも許容するが、loader の hash 判定は pathname 非依存（hash のみ）で rushdb も自動カバーされる。ただし rushdb ページの #bg/#wrapper 実DOM構成が yugiohdb と同一かは E2E で実確認する（§5 の E2E 項目）
- **content-index 追加条件は verified=false + unverifiable_reason を維持**（トップレベル副作用のため既存方針踏襲）
- **残リスク（受容）**: handoff 後に edit-ui 内部で予期せぬ throw があると overlay が残る経路は edit-ui 不変の範囲で残る（applyThemeFromSettings・initVueApp は try/catch 済み。loadEditUI 自体の予期せぬ throw は未catch＝現行と同一）。フェイルセーフ（8秒）も handoff 済みのため発火しない。発生時は手動リロードで復旧。編集UIの実績上 #bg 事前検証後の失敗は稀と判断し受容する

---

## 9. 追補: 実装後コードレビュー（codex）の必須指摘対応

実装（段階6）後のコードレビューで指摘された必須3件の対応。いずれも本設計の当初前提を一部修正する。

### 9.1 指摘1: document_start で style-loader が例外化し content.js が起動不能になる経路

- **問題**: src/content/index.ts の冒頭の静的SCSS import群はエントリ本体より先に評価され、dist/content.js 内の style-loader ランタイムのデフォルト挿入先は `document.querySelector("head")` 固定（insertBySelector.js）。document_start 時点で head が未生成だと style target 未発見の例外 -> モジュール評価全体が失敗 -> notifyStart 未到達 -> import失敗 -> フェイルセーフ発火で公式画面には戻るが**編集UIが起動しない**
- **対応**: webpack.config.cjs の css/scss 両ruleの style-loader に `options.insert`（絶対パス指定の挿入先モジュール `scripts/lib/style-insert.cjs`）を追加。挿入先は `document.head || document.documentElement`（loader.js の early-hide/overlay と同一フォールバック）。headが存在する通常ページ（popup/options等・Vue SFCのstyleブロックを含む）では挙動不変
- **備考**: style-loader 4.x の `insert` はセレクタ文字列か絶対モジュールパスのみ受付（インライン関数は不可）のため、挿入先関数はモジュールファイルとして分離した。当初の「webpack.config.cjs 変更不要」前提は撤回
- **検証**: `tests/unit/webpack/dynamic-import-bundle.test.ts` の `production-adapter.style-loader-inserts-into-head-or-document-element` 条件（configのinsert指定・挿入先モジュールのフォールバック・distにデフォルト挿入モジュールが含まれないこと）

### 9.2 指摘2: loader.js が ytomo 判定前に storage/matchMedia を評価する経路

- **問題**: boot() がテーマ解決（`deps.storage.getItem` + `deps.prefersDark()`）を ytomo 判定の前に無条件実行していた。localStorage が SecurityError 等を投げる環境では非ytomoページでも loader 全体が例外終了し、従来起動していた content.js がロードされない回帰となる
- **対応**: テーマ解決を ytomo 分岐内へ移動し、storageアクセス（readSettingsRawSafely）・prefersDark 取得（prefersDarkSafely）を個別の try/catch ラッパで保護（例外は未保存・非dark扱いで続行）
- **検証**: `create-loader.boot-non-ytomo-never-accesses-storage`（非ytomoでstorage未アクセス・例外環境でもimport継続）・`create-loader.boot-ytomo-storage-error-falls-back-to-default-theme`（ytomoでstorage例外でもデフォルトテーマで起動）

### 9.3 指摘3: content側のID削除・takeoverが同ID他要素を保護していない

- **問題**: content側 removeLoaderDerivedElements はID一致で無条件削除、overlay takeover は同ID HTMLDivElement の子要素を無条件に消去・再利用していた。loader側はフェイルセーフの ownElements 参照ベースで他人要素を保護しているのに不整合
- **対応**:
  - loader生成要素（early-hide・overlay）に識別属性 `data-ygo-next-loader="1"` を付与
  - content側のゲートロジックを `src/utils/loader-elements.ts` に新設: removeLoaderDerivedElements（識別属性を持つ要素のみ削除）・markAsLoaderElement（contentが新規生成する early-hide/overlay にも付与し、復帰処理で拡張由来要素を一貫して除去）・takeover判定（識別属性付き HTMLDivElement のみ対象。属性なしなら新規生成に切り替え。§11 で findLoaderOverlay() に発展）
  - 属性名の loader.js 直書きと src側 LOADER_ATTR 定数の二重管理はテストがずれを機械検知する（`create-loader.own-elements-carry-loader-attribute`）
- **検証**: `tests/design/loader-elements/conditions.toml`（unit）+ `tests/design/content-index/conditions.toml` の配線条件（E2E）

---

## 10. 追補: TASK-513 — prefetch済みedit-uiモジュールでhash遷移時にロード画面から進まない問題の修正

TASK-510のE2E（test-loader-flicker.cjs観点5）で発見された既存問題（2025-12から存在。TASK-510の変更由来ではない）。設計レビュー（codex rev2）を経た採用案・論証の詳細は tm TASK-513 の設計書（tmp/20260916_design_task513_hashchange-prefetch.md・作業メモ）に記載のとおり。

### 現象・原因

- 公式ページ閲覧後（edit-ui prefetch完了後）に hash 遷移（`#/ytomo/edit`）で編集ページに入ると、ロード画面（overlay）が表示されたまま編集UIがマウントされない。フェイルセーフも loader が非 armed のため不発
- 原因: 非編集ページで prefetchEditUI が idle 時に edit-ui を import すると、モジュールトップレベルIIFEが `isVueEditPage()=false` で早期returnし、`watchUrlChanges()`（edit-ui側hashchangeリスナ登録）が未実行のままになる。hash遷移後、content側 loadEditUIIfNeeded はキャッシュ済みモジュールを再利用するが loadEditUI を呼ぶ経路が無い（content側 `editUILoaded` と edit-ui側 `isEditUILoaded`+watchUrlChanges の二重管理の隙間）。DCL直後（prefetch前）の hash 遷移はモジュール未評価のため fresh import の IIFE が駆動して成功する（prefetchキャッシュ時のみ発生）

### 採用案（A案）と却下案

**A案（採用）**: edit-ui のトップレベルIIFE早期returnをやめ、非編集ページでも常に `watchUrlChanges()` を登録する。起動はリスナ内の `isEditUrl() && !isEditUILoaded` ガードで従来どおり単一。**`applyThemeFromSettings` は必ず `isVueEditPage()` ガード内に残留させる**（ガード外実行は公式ページの documentElement/body/#wrapper/#bg への背景色・data-ygo-next-theme 設定という視覚回帰になるため）。ルート原因（「動的import時点で編集ページにいる」というIIFEの前提がprefetchで破綻）を直接解消し、content/index.ts・loader.js・webpack構成に触れない最小差分

却下案（詳細は設計書）:
- B案（content側からキャッシュ済みモジュールの export を直接呼ぶ）: 効果はAと等価だが起動経路が二重に分断し、将来の import 呼び忘れで同バグ再発
- C案（フラグ二重管理の一元化）: 単体では本バグを修正しない。route 4 semantics の再設計を伴い範囲過大 → tech-debt 起票候補
- D1（prefetchやめる。UX目的の性能回帰）/ D2（評価なしprefetch。chrome-extension: URL への link prefetch の実効性が不確実で editUIModulePromise の timeout/reset 機構全体の書き換え）/ D3（hashchange時の再import再評価。ESMは評価済みモジュールをキャッシュしIIFEを再実行しないため技術的に不可能）/ D4（loader.jsにhashchange監視。制約違反＋main world最小スクリプトの肥大化）/ D5（edit-ui側URL polling。リスナがある以上不要）

### 4経路の論証（overlay生成 -> マウント順序の主論拠3点）

route (c)（本バグの経路: prefetch済みhash入遷移）において mount 時点で overlay が必ず存在し DeckEditLayout.vue の onMounted が除去する:

1. **content側リスナは同期登録で必ず先行**: content側 hashchange リスナ（loadEditUIIfNeeded）は content/index.ts トップレベルで同期的に登録される。edit-ui モジュールは必ず content.js から import されるため edit-ui 側リスナ登録は常に後。hashchange リスナは登録順に呼ばれる
2. **overlay生成は await 前に同期完了**: loadEditUIIfNeeded の overlay 構築は最初の await（withTimeout(importPromise)）より前の同期処理で完了する
3. **edit-ui側マウントは非同期**: loadEditUI のマウントは await applyThemeFromSettings() と await initVueApp() を経由し、同期ディスパッチ内では完了しない

各経路: (a) 直アクセスは従来どおり / (b) DCL直後（prefetch前）hash遷移は fresh import の IIFE が駆動 / (b') 競合は次項 / (c) prefetch済みhash遷移は edit-ui 側リスナが駆動（本修正）/ (d) 離脱->再入は既存挙動（(c)経由初回マウント後も成立）。二重マウントなし: content は loadEditUI を呼ばず、起動は常に edit-ui 内部の isEditUILoaded ガードで単一

### 競合ケース(b'): DCL直後 hashchange と idle prefetch の競合

非編集初期URLで DCL リスナが prefetchEditUI を登録した後に hashchange が発生するケース。`isPrefetching=true` は同期的に立つが `editUIModulePromise` は idle callback 内で設定されるため中間状態が生じうるが、**hashchange リスナは同期実行され idle callback（別マクロタスク）は割り込めない**ため editUIModulePromise はこの時点で決定的に null となり、content は自前の import#1 を開始する（競合ではなく決定的順序）。

二重評価の無害性: (1) webpack の chunk ロードとモジュールレジストリは同一チャンク/モジュールを dedup し、idle callback の2回目の import#2 も同一 promise/評価結果に解決するため IIFE は2回実行されない (2) 評価は hashchange より後に完了するため IIFE は `isVueEditPage()=true` で駆動し（(b) 型に合流）、マウントは単一 (3) import#1/import#2 の withTimeout ラッパー二重は基盤が同一 promise のため無害 (4) 失敗時は import#1 の catch が公式画面復帰、import#2 の catch が warn+null リセット+rethrow（rethrow の unhandled rejection は prefetch promise が fire-and-forget である既存構造の挙動で不変）

### 世代トークン機構（離脱中 loadEditUI の中止）と残リスク

A案で route (c) が成立するようになったため、hashchangeで素早く離脱（戻るボタン等）する経路が現実的になり、await を挟む進行中 loadEditUI が離脱後に公式DOMへ副作用を及ぼすリスクが顕在化する。対策としてモジュールスコープの世代トークン（`urlLeaveGeneration`）を導入:

- 増分は**編集URLからの離脱時のみ**（hashchange リスナの離脱分岐）。全hashchangeで増分すると編集URL内のhash変化（dno変更等）で進行中ロードが中止されたまま再起動者がいなくなる
- loadEditUI は開始時点の世代を記録し、(判定1) applyThemeFromSettings await 後・DOM準備前に世代不一致なら中断（テーマ適用await中の離脱=副作用ゼロ中止）、(判定2) initVueApp 内 app.mount 直前に世代不一致なら mount をスキップ（マウント防止）、(判定3) initVueApp await 後・後続処理前に世代不一致なら replaceLanguageChangeLinks を実行せず中断（公式ページの言語リンク書き換えという副作用の残存防止。実装後レビュー必須指摘1対応）
- 中止時に isEditUILoaded を書き戻さない: フラグの所有権は「離脱リスナ（false）」または「再入で開始した新規 loadEditUI（true）」のいずれかにある
- **残リスク（明示的に受容）**: 判定1通過後の同期DOM準備〜判定2の間に離脱した場合、マウントは防止されるが #bg 書き換え（innerHTML クリア・#vue-edit-app 空 div・editUiStyles 注入）は実行済みで残る。完全復元（スナップショット保存等）は leave-during-boot recovery として後続タスクに切り出し。マウント済みVueの離脱時残存（unmount無し）は§7最終行の既存残リスクと同列

世代トークンは edit-ui 内部完結の機構であり、loader プロトコル（notifyStart/handoff/フェイルセーフ）には干渉しない。

### テスト対応

- 単体テスト（tests/unit/content/edit-ui-index.test.ts）: (1) 非編集評価でのリスナ登録 (2) hash遷移後の loadEditUI 開始・#vue-edit-app 生成 (3) 世代トークンによる中止2件（chrome.storage.local.get と initVueApp 内 settings store dynamic import をテスト側 deferred で保留して離脱を決定的に再現。mount の観測は Vue 3 がコンテナへ付与する data-v-app 属性で行う。判定2でのマウント中断時は言語リンク書き換え（判定3）も実行されないことを検証） (4) 急速離脱->再入で旧世代と新世代の loadEditUI が同時進行するケース（旧処理保留のまま再入->新処理開始後に旧処理解放。旧処理の中止が再入側の isEditUILoaded を壊さないこと=再ロードされないことを要素同一性で検証。実装後レビュー改善指摘3対応）。overlay からマウントへの統合順序は E2E の対象
- 条件書（tests/design/edit-ui-index/conditions.toml）: 旧 `top_level.not_edit_page_skips_all_initialization` を削除し、`top-level.not-edit-page-skips-theme-but-registers-url-watch` / `watch-url-changes.prefetched-module-mounts-on-later-hashchange-to-edit` / `load-edit-ui.aborts-before-dom-prep-when-left-during-theme-await` / `init-vue-app.skips-mount-when-left-during-module-await` の4条件を新設（kebab-case stable id 形式）
- E2E（tests/browser/test-loader-flicker.cjs観点5）: `window.ygoChangeLanguage`（edit-ui モジュールスコープでのみ代入される）を edit-ui 評価完了マーカーとし、isolated world の execution context でマーカーを poll して prefetch 評価済みを確定してから hash 遷移するよう強化（未評価 import 経路＝(b)型との判別を可能にする）

---

## 変更ファイル一覧（実装時点・レビュー対応込み）

| ファイル | 変更 |
|---|---|
| `public/manifest.json` | `run_at: document_end` -> `document_start`（1行） |
| `public/loader.js` | §1 の createLoader(deps) 構造・状態機械・本番アダプタ（webpack外のまま）。レビュー対応で識別属性付与・storageアクセス保護・ytomo分岐内テーマ解決を追加（§9） |
| `src/content/index.ts` | §2.3 の notifyStart・removeLoaderDerivedElements・runEditPageBoot・DCL待ち・#bg検証・handoff・復帰catch |
| `src/types/window.d.ts` | `__ygoNextLoaderNotifyStart?: () => void` / `__ygoNextLoaderHandoff?: () => void` 追加 |
| `webpack.config.cjs` + `scripts/lib/style-insert.cjs` | style-loader の insert オプション（§9 追補・レビュー指摘1） |
| `src/utils/loader-elements.ts` | 新設（§9 追補・レビュー指摘3）。識別属性による削除・takeover のゲート |
| `tests/design/loader-early-loading/conditions.toml` | 27条件（verified=true。23+レビュー対応4） |
| `tests/design/loader-elements/conditions.toml` | 新設（verified=true・4条件。レビュー指摘3対応） |
| `tests/design/content-index/conditions.toml` | 12条件追記（verified=false維持・E2E方針。レビュー指摘3対応で属性ゲートの記述に更新） |
| `tests/unit/content/loader-early-loading.test.ts` | vm + createLoader DI 駆動（26it。23+レビュー対応3） |
| `tests/unit/utils/loader-elements.test.ts` | 新設（4it） |
| `tests/unit/webpack/dynamic-import-bundle.test.ts` | loader/manifest 検証（両manifest・run_at・サイズ実測基準 13KB・style-loader insert） |
| `tests/browser/test-loader-flicker.cjs` | E2E（チラつき確認・観点1-5。TASK-510で作成。TASK-513で観点5を edit-ui 評価完了マーカー（window.ygoChangeLanguage）による prefetch済み経路の確定的再現へ強化。§10） |
| `docs/design/loader-early-loading-tech.md` | 本書 |

TASK-513の変更（§10）:
| ファイル | 変更 |
|---|---|
| `src/content/edit-ui/index.ts` | トップレベルIIFEの常時 watchUrlChanges() 登録（applyThemeFromSettings は isVueEditPage() ガード内に残留）+ 世代トークン機構（urlLeaveGeneration・中止判定1/2） |
| `tests/design/edit-ui-index/conditions.toml` | 旧id削除・新id4件（TASK-513）。実装完了時点で verified=true・source_hash 記載 |
| `tests/unit/content/edit-ui-index.test.ts` | TASK-513のテスト追加（リスナ登録・prefetch済みhash遷移マウント・世代トークン中止2件）+ hashchangeリスナのテスト間残留対策（追跡とafterEach解除） |
| `docs/design/loader-early-loading-tech.md` | §7/§2.4/§3/§10・変更ファイル一覧の追補（本項） |

変更なし: `scripts/deploy.sh`

## 11. 追補: PR#156レビュー指摘対応 — DCL待機後のルート再検証・属性ベースlookup

PR#156（TASK-510/511/513の実装PR）へのレビューで指摘された2件（P2）への対応。

### 11.1 指摘1: DCL待機後のルート再検証なし（src/content/index.ts）

- **問題**: `#/ytomo/edit` 直接ロードが document_start で開始し、DCL 待機中にユーザーが hash で非編集へ離脱した場合、`loadEditUIIfNeeded()` の await 復帰は `isVueEditPage()` を再チェックしない。このまま overlay 生成と handoff（フェイルセーフ解除）まで進む一方、import された edit-ui は非編集ルートをマウントせず、公式ページが reload まで覆われたままになる
- **対応**: DCL 待機の await 直後に `isVueEditPage()` を再検証し、非編集なら `editUILoaded=false` + `removeLoaderDerivedElements()` + handoff（要素除去後＝引き継ぎ成功）で復帰して中断（非編集ページ評価経路と同型）。§2.3 のコード例に反映済み
- **検証**: `tests/design/content-index/conditions.toml` の `load-edit-ui-if-needed.revalidates-route-after-domcontentloaded-wait`（verified=false・E2E方針。test-loader-flicker.cjs の coversタグ付与は TASK-516）

### 11.2 指摘2: 同ID他人要素との overlay ID 衝突で拡張overlayが残存（src/content/index.ts:231）

- **問題**: 属性なしの他人要素が overlay と同一IDを持つ状態（ownership check が保護対象とする衝突そのもの）で content 側が同IDの別要素を新規生成すると重複IDが並存する。cleanup（DeckEditLayout.vue の overlay 削除・edit-ui の early-hide 削除・removeLoaderDerivedElements）が `document.getElementById` ベース（文書順最初のみ返却）のため、先在する他人要素を捕捉して拡張由来の全画面 overlay がマウントUIの上に永続残存した
- **対応**: lookup と cleanup を識別属性セレクタ（`#id[data-ygo-next-loader]`）ベースに統一:
  - `src/utils/loader-elements.ts`: `findLoaderOverlay()` / `findLoaderEarlyHide()`（他人要素をスキップした単一取得）を新設。`removeLoaderDerivedElements()` は `querySelectorAll` で属性付き全件削除に変更。旧 `isLoaderOverlayElement`（takeover判定の型ガード）は `findLoaderOverlay()` がセレクタベースで担うため削除
  - `src/content/index.ts`: overlay テイクオーバー判定を `findLoaderOverlay()` に変更
  - `src/content/edit-ui/DeckEditLayout.vue`: overlay フェードアウト削除を `findLoaderOverlay()` に変更
  - `src/content/edit-ui/index.ts`: early-hide 削除を `findLoaderEarlyHide()` に変更
- **検証**: `tests/design/loader-elements/conditions.toml`（4条件→7条件・verified=true。他人要素先在時の全件削除・lookup の他人要素スキップ・div以外拒否）+ `tests/unit/utils/loader-elements.test.ts`

## リスク・未確定事項

1. **フェイルセーフタイムアウト値 8000ms**: devビルド3MB評価は実測数百ms程度のため十分なマージン。notifyStart による再始動で実質最大16秒。長すぎると拡張破損時に背景画面がその間残る。調整余地あり（値は api 定数としてテスト可能）
2. **ytomo系での content.js 即時評価により初回訪問時のみ cgid 抽出が失敗し得る**: §8 注記のとおり受容（preload省略のみで機能劣化なし）。許容しない場合は ytomo系もDCL後importにする選択肢がある（3MB評価の並行性を失い編集UI表示がやや遅くなる）
3. **緩いhash判定に `#/ytomo`（スラッシュなし)を含めた**: 誤ヒット時は content.js の復帰処理（非編集ページでの要素除去+handoff）とフェイルセーフの二重防御で公式画面に戻る
4. **loader.js のID/キー直書きと `EXTENSION_IDS`/`STORAGE_KEY_SETTINGS` の二重管理**: webpack外という制約上避けられない。`main.ids-match-extension-ids-constants` 条件でずれを機械検知する
5. **残リスク**: §8 のとおり、handoff 後の edit-ui 内部予期せぬ throw はフェイルセーフ対象外（現行と同一・受容）
