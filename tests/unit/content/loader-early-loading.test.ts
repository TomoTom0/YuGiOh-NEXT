/**
 * TASK-510: ロード画面の最初の描画前表示（loader.js先行読み込み）のテスト
 *
 * 設計: docs/design/loader-early-loading-tech.md（TASK-510実装済み・全条件green）。
 * テスト先行で作成したため当初は red だったが、実装（段階6）後に全passしている。
 * コードレビュー対応（追試）: 非ytomoでのstorage例外耐性・loader生成要素の識別属性
 * （data-ygo-next-loader）を検証する条件を追加
 *
 * テスト方式（設計書§5・指摘6対応: 依存注入に統一）:
 * - public/loader.js を fs.readFileSync + vm.Script で評価（module オブジェクト注入により
 *   本番アダプタは起動しない。importModuleDynamically で動的importを拒否しており
 *   現行loader.jsを評価した場合もloader自身のcatchに収まる）
 * - exportフックから取り出した createLoader(deps) に happy-dom の document
 *   （document.implementation.createHTMLDocument で都度生成）・fake timer・
 *   importContent spy を注入して状態機械・フェイルセーフ・boot を駆動する
 *
 * 条件書: tests/design/loader-early-loading/conditions.toml
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vm from 'node:vm';
import { isRecord } from '@/utils/type-guards';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import { STORAGE_KEY_SETTINGS } from '@/constants/storage-keys';
import { LOADER_ATTR } from '@/utils/loader-elements';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOADER_PATH = path.resolve(__dirname, '../../../public/loader.js');
const LOADER_SOURCE = fs.readFileSync(LOADER_PATH, 'utf8');

// --- loader.js の exportフックの型（設計書§1。as無しで型ガードにより絞り込む） ---

interface LoaderIds {
  overlay: string;
  earlyHide: string;
}

interface LoaderWin {
  location: { hash: string };
  __ygoNextLoaderNotifyStart?: () => void;
  __ygoNextLoaderHandoff?: () => void;
}

interface LoaderApi {
  boot: () => void;
  notifyStart: () => void;
  handoff: () => void;
  getState: () => string;
  getOwnElements: () => HTMLElement[];
}

interface LoaderDeps {
  doc: Document;
  win: LoaderWin;
  storage: { getItem: (key: string) => string | null };
  scheduleTimer: (callback: () => void, ms: number) => number;
  cancelTimer: (id: number) => void;
  importContent: () => Promise<unknown>;
  prefersDark: () => boolean;
  console: {
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

interface LoaderExports {
  isYtomoHash: (hash: string | null | undefined) => boolean;
  resolveThemeBgColor: (settingsRaw: string | null, prefersDark: boolean) => string;
  buildEarlyHideCss: (bg: string) => string;
  createLoader: (deps: LoaderDeps) => LoaderApi;
  IDS: LoaderIds;
  SETTINGS_KEY: string;
  FAILSAFE_TIMEOUT_MS: number;
}

const isLoaderIds = (value: unknown): value is LoaderIds =>
  isRecord(value) && typeof value.overlay === 'string' && typeof value.earlyHide === 'string';

const isLoaderExports = (value: unknown): value is LoaderExports =>
  isRecord(value) &&
  typeof value.isYtomoHash === 'function' &&
  typeof value.resolveThemeBgColor === 'function' &&
  typeof value.buildEarlyHideCss === 'function' &&
  typeof value.createLoader === 'function' &&
  isLoaderIds(value.IDS) &&
  typeof value.SETTINGS_KEY === 'string' &&
  typeof value.FAILSAFE_TIMEOUT_MS === 'number';

// --- loader.js の評価（module オブジェクト注入により本番アダプタは起動しない） ---

let cachedLoader: LoaderExports | null = null;

const getLoader = (): LoaderExports => {
  if (cachedLoader) return cachedLoader;
  const moduleExports: Record<string, unknown> = {};
  const moduleObject = { exports: moduleExports };
  const script = new vm.Script(LOADER_SOURCE, {
    filename: 'public/loader.js',
    // 現行loader.js（起動ゲート無し）を評価した場合の import() を拒否する。
    // 拒否されたPromiseはloader自身のcatchが受け取るため未処理拒否にはならない
    importModuleDynamically: () =>
      Promise.reject(new Error('dynamic import must not be invoked in vm tests')),
  });
  script.runInNewContext({
    module: moduleObject,
    console: {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
    chrome: { runtime: { getURL: (urlPath: string) => urlPath } },
  });
  const exported = moduleObject.exports;
  if (!isLoaderExports(exported)) {
    throw new Error(
      'public/loader.js のexportフックに期待されるAPI（createLoader等）が無い。TASK-510実装未了の red 状態'
    );
  }
  cachedLoader = exported;
  return cachedLoader;
};

// --- fake timer（設計書§5: vi.useFakeTimers相当のscheduleTimer/cancelTimerモック） ---

interface FakeTimer {
  id: number;
  callback: () => void;
  fireAtMs: number;
  cancelled: boolean;
}

const createFakeTimers = () => {
  let now = 0;
  let nextId = 1;
  const timers: FakeTimer[] = [];
  const scheduleTimer = (callback: () => void, ms: number): number => {
    const id = nextId;
    nextId += 1;
    timers.push({ id, callback, fireAtMs: now + ms, cancelled: false });
    return id;
  };
  const cancelTimer = (id: number): void => {
    const timer = timers.find(entry => entry.id === id);
    if (timer) timer.cancelled = true;
  };
  // 発火時刻昇順（同時刻は登録順）に発火。発火済みはcancelled扱いにして再入を防ぐ
  const advance = (ms: number): void => {
    const target = now + ms;
    for (;;) {
      const due = timers
        .filter(entry => !entry.cancelled && entry.fireAtMs <= target)
        .sort((a, b) => a.fireAtMs - b.fireAtMs || a.id - b.id);
      const next = due[0];
      if (!next) break;
      now = next.fireAtMs;
      next.cancelled = true;
      next.callback();
    }
    now = target;
  };
  const pendingCount = (): number => timers.filter(entry => !entry.cancelled).length;
  // 絶対時刻指定で進める（テストの可読性のため。advanceは相対ms指定）
  const runTo = (absoluteMs: number): void => {
    advance(absoluteMs - now);
  };
  return { scheduleTimer, cancelTimer, advance, runTo, pendingCount };
};

// --- createLoader deps の組み立て（happy-dom document + fake timer + spy） ---

interface DepsOptions {
  hash: string;
  readyState: string;
  removeHead: boolean;
  removeBody: boolean;
  storageRaw: string | null;
  prefersDark: boolean;
}

const createDeps = (options: Partial<DepsOptions> = {}) => {
  const config: DepsOptions = {
    hash: '#/ytomo/edit?dno=123',
    readyState: 'loading',
    removeHead: true,
    removeBody: true,
    storageRaw: null,
    prefersDark: false,
    ...options,
  };
  // document.implementation.createHTMLDocument で都度freshなdocumentを生成する
  // （happy-dom実装。head/bodyは除去して documentElement 直付け経路を既定にする）
  const doc = document.implementation.createHTMLDocument('loader-test');
  if (config.removeHead) doc.head.remove();
  if (config.removeBody) doc.body.remove();
  Object.defineProperty(doc, 'readyState', {
    get: () => config.readyState,
    configurable: true,
  });

  const timers = createFakeTimers();
  const importContent = vi.fn((): Promise<unknown> => Promise.resolve({}));
  const consoleWarn = vi.fn();
  const consoleError = vi.fn();
  const win: LoaderWin = { location: { hash: config.hash } };
  const deps: LoaderDeps = {
    doc,
    win,
    storage: { getItem: vi.fn(() => config.storageRaw) },
    scheduleTimer: timers.scheduleTimer,
    cancelTimer: timers.cancelTimer,
    importContent,
    prefersDark: vi.fn(() => config.prefersDark),
    console: { warn: consoleWarn, error: consoleError },
  };
  return { deps, timers, importContent, consoleWarn, consoleError, win, doc };
};

// boot まで実行した loader を組み立てる（hash は options で ytomo系/非ytomo を切替）
const bootLoader = (options: Partial<DepsOptions> = {}) => {
  const context = createDeps(options);
  const loader = getLoader();
  const api = loader.createLoader(context.deps);
  api.boot();
  return { ...context, loader, api };
};

describe('loader.js（TASK-510 先行読み込み）', () => {
  describe('純関数: isYtomoHash', () => {
    it('[covers:is-ytomo-hash.accepts-ytomo-prefix-and-bare] bare #/ytomo と #/ytomo/ prefix とクエリ付きをtrueとする', () => {
      const { isYtomoHash } = getLoader();
      expect(isYtomoHash('#/ytomo')).toBe(true);
      expect(isYtomoHash('#/ytomo/')).toBe(true);
      expect(isYtomoHash('#/ytomo/edit')).toBe(true);
      expect(isYtomoHash('#/ytomo/edit?dno=123')).toBe(true);
      expect(isYtomoHash('#/ytomo?request_locale=ja')).toBe(true);
    });

    it('[covers:is-ytomo-hash.rejects-other-hashes-and-query-suffix] ytomo系以外・空・falsy・境界違いはfalseとする', () => {
      const { isYtomoHash } = getLoader();
      expect(isYtomoHash('')).toBe(false);
      expect(isYtomoHash(null)).toBe(false);
      expect(isYtomoHash(undefined)).toBe(false);
      expect(isYtomoHash('#/top')).toBe(false);
      expect(isYtomoHash('#ytomo')).toBe(false);
      // #/ytomo を含むが直後がスラッシュでない（prefix境界の確認）
      expect(isYtomoHash('#/ytomoo')).toBe(false);
    });
  });

  describe('純関数: resolveThemeBgColor', () => {
    it('[covers:resolve-theme-bg.explicit-theme-wins] 明示themeはprefersDark引数に優先する', () => {
      const { resolveThemeBgColor } = getLoader();
      expect(resolveThemeBgColor('{"theme":"dark"}', false)).toBe('#1a1a1a');
      expect(resolveThemeBgColor('{"theme":"light"}', true)).toBe('#ffffff');
    });

    it('[covers:resolve-theme-bg.system-follows-prefers-color-scheme] theme:systemはprefersDark引数で判定する', () => {
      const { resolveThemeBgColor } = getLoader();
      expect(resolveThemeBgColor('{"theme":"system"}', true)).toBe('#1a1a1a');
      expect(resolveThemeBgColor('{"theme":"system"}', false)).toBe('#ffffff');
    });

    it('[covers:resolve-theme-bg.invalid-json-falls-back-to-media] 不正JSON・未保存もthrowせずprefersDarkで判定する', () => {
      const { resolveThemeBgColor } = getLoader();
      expect(resolveThemeBgColor('{invalid json', true)).toBe('#1a1a1a');
      expect(resolveThemeBgColor('{invalid json', false)).toBe('#ffffff');
      expect(resolveThemeBgColor(null, true)).toBe('#1a1a1a');
      expect(resolveThemeBgColor(null, false)).toBe('#ffffff');
    });
  });

  describe('純関数: buildEarlyHideCss', () => {
    it('[covers:build-early-hide-css.includes-bg-overflow-and-wrapper-bg-hide] 背景色・overflow hidden・#wrapper/#bg非表示を包含する', () => {
      const { buildEarlyHideCss } = getLoader();
      const css = buildEarlyHideCss('#1a1a1a');
      expect(css).toContain('background-color:#1a1a1a');
      expect(css).toContain('!important');
      expect(css).toContain('overflow:hidden');
      expect(css).toContain('#wrapper,#bg');
      expect(css).toContain('display:none');
    });
  });

  describe('createLoader: DOM生成（ensureEarlyHide / ensureOverlay）', () => {
    it('[covers:create-loader.ensure-early-hide-attaches-without-head-and-skips-existing] head未生成でも直付けし既存同IDはskipする', () => {
      // (a) head無し: documentElement 直下に同期注入される
      const bootedA = bootLoader();
      const earlyHideA = bootedA.doc.getElementById(bootedA.loader.IDS.earlyHide);
      expect(earlyHideA).not.toBeNull();
      expect(earlyHideA?.textContent).toContain('background-color');
      expect(bootedA.api.getOwnElements()).toContain(earlyHideA);
      expect(earlyHideA?.parentNode).toBe(bootedA.doc.documentElement);

      // (b) 既存同ID要素あり: 再注入せず追跡もしない
      const contextB = createDeps();
      const existing = contextB.doc.createElement('style');
      existing.id = getLoader().IDS.earlyHide;
      existing.textContent = 'sentinel-early-hide';
      contextB.doc.documentElement.appendChild(existing);
      const apiB = getLoader().createLoader(contextB.deps);
      apiB.boot();
      const after = contextB.doc.getElementById(getLoader().IDS.earlyHide);
      expect(after).toBe(existing);
      expect(after?.textContent).toBe('sentinel-early-hide');
      expect(apiB.getOwnElements()).not.toContain(existing);
    });

    it('[covers:create-loader.ensure-overlay-creates-title-spinner-subtext-without-body] body未生成でもoverlay3要素とspin styleを注入する', () => {
      const { doc, loader, api } = bootLoader();
      const overlay = doc.getElementById(loader.IDS.overlay);
      expect(overlay).not.toBeNull();
      expect(overlay?.children).toHaveLength(3);
      expect(overlay?.children[0].textContent).toBe('YuGiOh NEXT');
      expect(overlay?.children[2].textContent).toBe('NEXT Deck Edit Page');
      expect(overlay?.children[1].getAttribute('style')).toContain('ygo-spin');
      // body未生成のため documentElement 直下に置かれる
      expect(overlay?.parentNode).toBe(doc.documentElement);
      // @keyframes ygo-spin を含む別styleが注入され追跡対象になる
      const ownStyles = api
        .getOwnElements()
        .filter((el): el is HTMLStyleElement => el.tagName === 'STYLE')
        .map(el => el.textContent ?? '');
      expect(ownStyles.some(text => text.includes('ygo-spin'))).toBe(true);
      expect(api.getOwnElements()).toContain(overlay);
    });

    it('[covers:create-loader.ensure-overlay-skips-when-same-id-exists-not-tracked] 既存同ID overlayは改変せず追跡しない', () => {
      const context = createDeps();
      const foreign = context.doc.createElement('div');
      foreign.id = getLoader().IDS.overlay;
      const sentinel = context.doc.createElement('span');
      sentinel.textContent = 'foreign-sentinel';
      foreign.appendChild(sentinel);
      context.doc.documentElement.appendChild(foreign);
      const api = getLoader().createLoader(context.deps);
      api.boot();
      const after = context.doc.getElementById(getLoader().IDS.overlay);
      expect(after).toBe(foreign);
      expect(after?.children).toHaveLength(1);
      expect(after?.children[0].textContent).toBe('foreign-sentinel');
      expect(api.getOwnElements()).not.toContain(foreign);
    });

    it('[covers:create-loader.own-elements-carry-loader-attribute] loader生成要素は識別属性を持ちsrc側定数と一致する', () => {
      const { doc, loader } = bootLoader();
      const overlay = doc.getElementById(loader.IDS.overlay);
      const earlyHide = doc.getElementById(loader.IDS.earlyHide);
      // content.js側はこの属性を持つ要素のみ削除・takeoverする（同ID他人要素の保護）
      expect(overlay?.getAttribute(LOADER_ATTR)).toBe('1');
      expect(earlyHide?.getAttribute(LOADER_ATTR)).toBe('1');
      // 二重管理（loader.js直書き vs src/utils/loader-elements.ts）のずれ検知
      expect(LOADER_SOURCE).toContain(LOADER_ATTR);
    });
  });

  describe('createLoader: boot', () => {
    it('[covers:create-loader.boot-ytomo-creates-elements-arms-failsafe-and-imports-immediately] ytomo系は要素生成・arm・importを即時行う', () => {
      const { doc, loader, api, importContent, timers } = bootLoader({
        hash: '#/ytomo/edit?dno=1',
        readyState: 'loading',
      });
      // 要素生成（同期・最初の描画前）
      expect(doc.getElementById(loader.IDS.earlyHide)).not.toBeNull();
      expect(doc.getElementById(loader.IDS.overlay)).not.toBeNull();
      // 即時import（DCLを待たない。readyStateはloading）
      expect(importContent).toHaveBeenCalledTimes(1);
      // フェイルセーフarm
      expect(api.getState()).toBe('armed');
      expect(timers.pendingCount()).toBe(1);
    });

    it('[covers:create-loader.boot-non-ytomo-defers-import-until-domcontentloaded] 非ytomo・loadingはDCLまでimportを遅延する', () => {
      const context = createDeps({ hash: '#/deck', readyState: 'loading' });
      const api = getLoader().createLoader(context.deps);
      api.boot();
      // DCL前: import・要素・タイマーとも無し
      expect(context.importContent).not.toHaveBeenCalled();
      expect(api.getState()).toBe('idle');
      expect(api.getOwnElements()).toHaveLength(0);
      expect(context.timers.pendingCount()).toBe(0);
      expect(context.doc.getElementById(getLoader().IDS.earlyHide)).toBeNull();
      // DCL発火でimportが1回呼ばれる
      context.doc.dispatchEvent(new Event('DOMContentLoaded'));
      expect(context.importContent).toHaveBeenCalledTimes(1);
    });

    it('[covers:create-loader.boot-non-ytomo-imports-immediately-when-not-loading] 非ytomo・completeは即時importする', () => {
      const { api, importContent, timers } = bootLoader({
        hash: '#/deck',
        readyState: 'complete',
      });
      expect(importContent).toHaveBeenCalledTimes(1);
      expect(api.getState()).toBe('idle');
      expect(api.getOwnElements()).toHaveLength(0);
      expect(timers.pendingCount()).toBe(0);
    });

    it('[covers:create-loader.boot-publishes-notify-start-and-handoff-only-when-armed] ytomo系のみ状態機械をwinに公開する', () => {
      // ytomo系: 公開され、公開関数はloader状態機械に接続される
      const ytomo = bootLoader({ hash: '#/ytomo' });
      expect(typeof ytomo.win.__ygoNextLoaderNotifyStart).toBe('function');
      expect(typeof ytomo.win.__ygoNextLoaderHandoff).toBe('function');
      ytomo.win.__ygoNextLoaderHandoff?.();
      expect(ytomo.api.getState()).toBe('handed_off');

      // 非ytomo: 公開しない
      const nonYtomo = bootLoader({ hash: '#/deck', readyState: 'complete' });
      expect(nonYtomo.win.__ygoNextLoaderNotifyStart).toBeUndefined();
      expect(nonYtomo.win.__ygoNextLoaderHandoff).toBeUndefined();
    });

    it('[covers:create-loader.boot-non-ytomo-never-accesses-storage] 非ytomoはstorageにアクセスせず例外環境でもimportする', () => {
      // localStorage が SecurityError 等を投げる環境でも、非ytomoページでは
      // storage/テーマ解決を実行しないため loader全体が例外終了しない
      const context = createDeps({ hash: '#/deck', readyState: 'complete' });
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('localStorage SecurityError');
        }),
      };
      context.deps.storage = throwingStorage;
      const api = getLoader().createLoader(context.deps);
      expect(() => api.boot()).not.toThrow();
      expect(throwingStorage.getItem).not.toHaveBeenCalled();
      expect(context.importContent).toHaveBeenCalledTimes(1);
      expect(api.getState()).toBe('idle');
    });

    it('[covers:create-loader.boot-ytomo-storage-error-falls-back-to-default-theme] ytomo系でstorage例外でもデフォルトテーマで起動する', () => {
      // ytomo系は storage例外を未保存扱い（prefersDarkで解決）して続行する
      const context = createDeps({ hash: '#/ytomo/edit', readyState: 'loading', prefersDark: false });
      context.deps.storage = {
        getItem: vi.fn(() => {
          throw new Error('localStorage SecurityError');
        }),
      };
      const api = getLoader().createLoader(context.deps);
      expect(() => api.boot()).not.toThrow();
      // 要素生成・arm・importは阻害されない
      expect(context.importContent).toHaveBeenCalledTimes(1);
      expect(api.getState()).toBe('armed');
      // 未保存+非darkフォールバックはlight背景
      const earlyHide = context.doc.getElementById(getLoader().IDS.earlyHide);
      expect(earlyHide?.textContent).toContain('background-color:#ffffff');
    });
  });

  describe('createLoader: 状態機械（notifyStart / handoff）', () => {
    it('[covers:state-machine.notify-start-rearms-countdown-without-cancelling] notifyStartはカウントダウンを再始動し解除はしない', () => {
      const { loader, api, doc, timers, consoleWarn } = bootLoader();
      const timeoutMs = loader.FAILSAFE_TIMEOUT_MS;
      // t=0でarm済み。t=7000で評価開始通知（カウントダウンは期限 t=7000+timeoutMs へ再始動）
      timers.runTo(7000);
      api.notifyStart();
      expect(api.getState()).toBe('armed');
      // 旧タイマー期限（t=timeoutMs=8000）を超えても再始動期限（t=15000）未満では未発火
      timers.runTo(timeoutMs + 2000);
      expect(api.getState()).toBe('armed');
      expect(doc.getElementById(loader.IDS.overlay)).not.toBeNull();
      expect(consoleWarn).not.toHaveBeenCalled();
      // 再始動後の期限（t=7000+timeoutMs）到達で発火する（解除されず有界に残っている）
      timers.runTo(7000 + timeoutMs + 1);
      expect(api.getState()).toBe('fired');
      expect(doc.getElementById(loader.IDS.overlay)).toBeNull();
    });

    it('[covers:state-machine.handoff-cancels-timer-when-armed] armedでのhandoffはタイマーを解除する', () => {
      const { loader, api, doc, timers, consoleWarn } = bootLoader();
      api.handoff();
      expect(api.getState()).toBe('handed_off');
      // タイムアウトを大きく超えても発火しない（自要素が残る）
      timers.advance(loader.FAILSAFE_TIMEOUT_MS * 3);
      expect(api.getState()).toBe('handed_off');
      expect(doc.getElementById(loader.IDS.overlay)).not.toBeNull();
      expect(doc.getElementById(loader.IDS.earlyHide)).not.toBeNull();
      expect(consoleWarn).not.toHaveBeenCalled();
    });

    it('[covers:state-machine.handoff-noop-when-idle-or-fired] idle・firedでのhandoffはno-op', () => {
      // idle（boot前）
      const context = createDeps();
      const apiIdle = getLoader().createLoader(context.deps);
      expect(() => apiIdle.handoff()).not.toThrow();
      expect(apiIdle.getState()).toBe('idle');

      // fired（フェイルセーフ発火後）
      const fired = bootLoader();
      fired.timers.advance(fired.loader.FAILSAFE_TIMEOUT_MS);
      expect(fired.api.getState()).toBe('fired');
      expect(() => fired.api.handoff()).not.toThrow();
      expect(fired.api.getState()).toBe('fired');
    });

    it('[covers:state-machine.handoff-idempotent] handoffは冪等（2回目はno-op）', () => {
      const { api, timers } = bootLoader();
      api.handoff();
      expect(() => api.handoff()).not.toThrow();
      expect(api.getState()).toBe('handed_off');
      // 2回目のhandoffでタイマーが再設定されない
      expect(timers.pendingCount()).toBe(0);
    });
  });

  describe('createLoader: フェイルセーフ', () => {
    it('[covers:failsafe.timeout-removes-only-own-elements-by-reference] 発火時に自要素のみ参照ベースで除去する', () => {
      const { loader, api, doc, timers } = bootLoader();
      // 公式DOM由来の無関係要素を併置（documentElement配下に残すべきもの）
      const official = doc.createElement('div');
      official.id = 'official-element';
      doc.documentElement.appendChild(official);
      expect(api.getOwnElements().length).toBeGreaterThanOrEqual(3);

      timers.advance(loader.FAILSAFE_TIMEOUT_MS);

      // 自要素（early-hide・overlay・spin style）は除去され、ownElementsは空になる
      expect(doc.getElementById(loader.IDS.earlyHide)).toBeNull();
      expect(doc.getElementById(loader.IDS.overlay)).toBeNull();
      expect(api.getOwnElements()).toHaveLength(0);
      // 無関係要素は残る
      expect(doc.getElementById('official-element')).toBe(official);
    });

    it('[covers:failsafe.timeout-keeps-same-id-foreign-elements] 同IDの他人要素は発火後も残る', () => {
      const context = createDeps();
      const foreign = context.doc.createElement('div');
      foreign.id = getLoader().IDS.overlay;
      context.doc.documentElement.appendChild(foreign);
      const api = getLoader().createLoader(context.deps);
      api.boot();
      context.timers.advance(getLoader().FAILSAFE_TIMEOUT_MS);
      expect(api.getState()).toBe('fired');
      expect(context.doc.getElementById(getLoader().IDS.overlay)).toBe(foreign);
    });

    it('[covers:failsafe.warns-on-fire] 発火時にconsole.warnで通知する', () => {
      const { loader, api, timers, consoleWarn } = bootLoader();
      timers.advance(loader.FAILSAFE_TIMEOUT_MS);
      expect(consoleWarn).toHaveBeenCalledTimes(1);
    });
  });

  describe('本番アダプタ（コード包含検証）', () => {
    it('[covers:production-adapter.boots-only-when-module-undefined] 起動はtypeof moduleゲート内・exportフックはmodule定義側', () => {
      // 本番アダプタ起動ゲート（module未定義＝classic script実行時のみ）
      expect(LOADER_SOURCE).toContain("typeof module === 'undefined'");
      // exportフック（vm テストで使用。module定義側）
      expect(LOADER_SOURCE).toContain("typeof module !== 'undefined'");
    });

    it('[covers:production-adapter.imports-via-chrome-runtime-geturl] importはchrome.runtime.getURL(content.js)を直接呼ぶ', () => {
      expect(LOADER_SOURCE).toMatch(
        /import\(\s*chrome\.runtime\.getURL\(\s*['"]content\.js['"]\s*\)\s*\)/
      );
    });

    it('[covers:main.ids-match-extension-ids-constants] ID/キー定数はsrc側定数と一致する', () => {
      // webpack外の直書きとsrc側定数の二重管理のずれ検知（設計書リスク4）
      expect(LOADER_SOURCE).toContain(EXTENSION_IDS.loading.moduleLoadingOverlay);
      expect(LOADER_SOURCE).toContain(EXTENSION_IDS.loading.earlyHideStyle);
      expect(LOADER_SOURCE).toContain(STORAGE_KEY_SETTINGS);
    });
  });
});
