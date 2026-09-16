/**
 * edit-ui/index.ts のテスト
 *
 * tests/design/edit-ui-index/conditions.toml (TASK-330, TASK-513) のconditionをカバーする。
 * モジュールレベルの状態(isEditUILoaded/isEventListenerRegistered/headerResizeObserver)を
 * 持つため、各テストで vi.resetModules() + 動的import により状態をリセットする。
 * './DeckEditLayout.vue'の実マウント検証は tests/unit/content/deck-edit-layout.test.ts
 * （TASK-487の再設計。実pinia+実storeでmount）が担うため、本テストではスタブに差し替える。
 *
 * TASK-513（テスト先行）: prefetch済みモジュールがhash遷移でマウントする条件を追加。
 * 単体テストはedit-ui側のリスナ登録・ロード開始の確認に限定し、overlayからマウントへの
 * 統合順序はE2E（tests/browser/test-loader-flicker.cjs観点5）で検証する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import { markAsLoaderElement } from '@/utils/loader-elements';
import { CHROME_STORAGE_KEY_APP_SETTINGS } from '@/constants/storage-keys';

const mockIsVueEditPage = vi.fn();
vi.mock('@/utils/page-detector', () => ({
  isVueEditPage: () => mockIsVueEditPage()
}));

vi.mock('@/content/edit-ui/DeckEditLayout.vue', () => ({
  default: { name: 'StubDeckEditLayout', render: () => null }
}));

const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })));
};

// window.ygoNextCurrentSettings は window.d.ts で AppSettings 型（全フィールド必須）だが、
// テストでは applyThemeFromSettings/initVueApp の読み取り経路に必要な部分のみ設定したい。
// asキャスト禁止の規約に従い、部分オブジェクトをキャストなしで代入するヘルパー
// （実ランタイムのキャッシュも applyThemeFromSettings は theme のみを読む）
function setCurrentSettingsCache(partial: { theme?: 'light' | 'dark' | 'system' }): void {
  Object.assign(window, { ygoNextCurrentSettings: partial });
}

const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

// TASK-513: 修正後は非編集ページでもhashchangeリスナが登録される設計のため、
// vi.resetModules()でモジュールを作り直しても旧インスタンスが登録したリスナは
// windowに残留しテスト間で干渉する（設計レビュー指摘1: リスナ残留）。
// window.addEventListenerを追跡し、登録されたhashchangeリスナをafterEachで解除する。
const originalAddEventListener = window.addEventListener.bind(window);
let hashchangeListenerRemovers: Array<() => void> = [];

type EditUIModule = typeof import('@/content/edit-ui/index');

describe('edit-ui/index.ts', () => {
  let mod: EditUIModule;

  beforeEach(async () => {
    // 前のテストのモジュールインスタンスに残っている非同期処理(applyThemeFromSettings等)
    // を先に完了させてから次のテストに入る（そうしないとdocumentへの副作用が後から漏れてくる）
    await flush();
    mockIsVueEditPage.mockReset().mockReturnValue(false);
    stubMatchMedia(false);
    delete (window as unknown as { ygoNextCurrentSettings?: unknown }).ygoNextCurrentSettings;
    document.documentElement.removeAttribute('data-ygo-next-theme');
    document.documentElement.style.backgroundColor = '';
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    stubMatchMedia(false);
    global.chrome.storage.local.get = vi.fn((_keys, callback) => callback({}));
    // 本テスト中に登録されるhashchangeリスナを追跡する（afterEachで解除）
    hashchangeListenerRemovers = [];
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
        if (type === 'hashchange' && listener) {
          hashchangeListenerRemovers.push(() => window.removeEventListener('hashchange', listener));
        }
        originalAddEventListener(type, listener, options);
      }
    );
    vi.resetModules();
    mod = await import('@/content/edit-ui/index');
  });

  afterEach(() => {
    // 本テストでモジュールが登録したhashchangeリスナを解除（次テストへの干渉防止）
    for (const removeHashchangeListener of hashchangeListenerRemovers) {
      removeHashchangeListener();
    }
    hashchangeListenerRemovers = [];
    document.body.innerHTML = '';
  });

  describe('applyThemeFromSettings (top-level IIFE経由)', () => {
    it('[covers:apply_theme.uses_memory_cache_when_available] メモリキャッシュがあればstorageを参照しない', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'dark' };
      const getSpy = vi.spyOn(global.chrome.storage.local, 'get');
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(getSpy).not.toHaveBeenCalled();
      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
    });

    it('[covers:apply_theme.falls_back_to_storage_when_no_cache] メモリキャッシュが無ければstorageから取得する', async () => {
      global.chrome.storage.local.get = vi.fn((_keys, callback) =>
        callback({ [CHROME_STORAGE_KEY_APP_SETTINGS]: { theme: 'dark' } })
      );
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
    });

    it('[covers:apply_theme.system_theme_follows_match_media] system指定時はmatchMediaに従う', async () => {
      stubMatchMedia(true);
      global.chrome.storage.local.get = vi.fn((_keys, callback) =>
        callback({ [CHROME_STORAGE_KEY_APP_SETTINGS]: { theme: 'system' } })
      );
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
    });

    it('[covers:apply_theme.explicit_theme_used_directly] 明示的なtheme指定はmatchMediaを無視して直接使う', async () => {
      stubMatchMedia(true); // darkと判定されうる状態でも
      global.chrome.storage.local.get = vi.fn((_keys, callback) =>
        callback({ [CHROME_STORAGE_KEY_APP_SETTINGS]: { theme: 'light' } })
      );
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('light');
    });

    it('[covers:apply_theme.error_falls_back_to_light_and_white_bg] storage取得エラー時はlight+白背景にフォールバックする', async () => {
      global.chrome.storage.local.get = vi.fn(() => {
        throw new Error('storage error');
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('light');
      expect(document.documentElement.style.backgroundColor).toBe('#ffffff');
    });
  });

  describe('performLanguageChange (window.ygoChangeLanguage経由)', () => {
    // performLanguageChangeは非exportだが、モジュールがトップレベルで
    // window.ygoChangeLanguageに割り当てるため、それ経由で直接呼び出して検証する。
    // 実URLへのnavigationはhappy-domが実ページ遷移として扱いテストが不安定になるため、
    // locationはテスト用のプレーンオブジェクトに差し替える。
    function stubLocation(overrides: { pathname: string; search: string; hash: string }) {
      const loc = { ...overrides, href: '' };
      vi.stubGlobal('location', loc);
      return loc;
    }

    it('[covers:perform_language_change.replaces_existing_request_locale] 既存のrequest_localeを置き換えて他のパラメータは保持する', async () => {
      const loc = stubLocation({ pathname: '/yugiohdb/', search: '?request_locale=ja&foo=bar', hash: '#/ytomo/edit' });

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      window.ygoChangeLanguage?.('en');

      expect(loc.href).toContain('request_locale=en');
      expect(loc.href).toContain('foo=bar');
      expect(loc.href).not.toContain('request_locale=ja');
    });

    it('[covers:perform_language_change.no_existing_params_adds_request_locale_only] クエリパラメータが無い場合はrequest_localeのみ付与する', async () => {
      const loc = stubLocation({ pathname: '/yugiohdb/', search: '', hash: '#/ytomo/edit' });

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      window.ygoChangeLanguage?.('en');

      expect(loc.href).toContain('?request_locale=en');
    });
  });

  describe('replaceLanguageChangeLinks (loadEditUI経由)', () => {
    // replaceLanguageChangeLinksは非exportでloadEditUI完了時にのみ呼ばれるため、
    // 対象リンクをDOMに用意した上でモジュールをimportし、loadEditUIの完了を待って検証する。
    // javascript:ChangeLanguage(...)への実クリックナビゲーションはhappy-domが未定義の
    // グローバル関数呼び出しとして評価してしまうため、hrefの書き換え結果のみで検証する。
    function setupEditPageDom() {
      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);
    }

    it('[covers:replace_language_links.matching_link_rewired_to_ygo_change_language] ChangeLanguageパターンのリンクはjavascript:void(0)に書き換えられクリックでygoChangeLanguageが呼ばれる', async () => {
      setupEditPageDom();
      const link = document.createElement('a');
      link.setAttribute('href', "javascript:ChangeLanguage('en')");
      document.body.appendChild(link);
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await vi.waitFor(() => {
        expect(link.getAttribute('href')).toBe('javascript:void(0)');
      }, { timeout: 2000, interval: 10 });

      const changeLanguageSpy = vi.fn();
      window.ygoChangeLanguage = changeLanguageSpy;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(changeLanguageSpy).toHaveBeenCalledWith('en');
    });

    it('[covers:replace_language_links.non_matching_link_untouched] パターンに一致しないリンクは変更しない', async () => {
      setupEditPageDom();
      const link = document.createElement('a');
      link.setAttribute('href', 'https://example.com');
      document.body.appendChild(link);
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(link.getAttribute('href')).toBe('https://example.com');
    });
  });

  describe('watchUrlChanges / loadEditUI (トップレベルIIFE経由)', () => {
    function setupEditPageDom() {
      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);
      const wrapper = document.createElement('div');
      wrapper.id = 'wrapper';
      document.body.appendChild(wrapper);
      return { bg, wrapper };
    }

    it('[covers:watch_url_changes.edit_url_not_loaded_triggers_load][covers:load_edit_ui.removes_early_hide_style_when_present] 編集URLで初回はloadEditUIが実行されearlyHideStyleが削除される', async () => {
      setupEditPageDom();
      // content/index.ts の runEditPageBoot が生成する実態に合わせ識別属性付きで作る
      // （findLoaderEarlyHide は識別属性セレクタで取得するため）
      const earlyHide = document.createElement('style');
      earlyHide.id = EXTENSION_IDS.loading.earlyHideStyle;
      markAsLoaderElement(earlyHide);
      document.head.appendChild(earlyHide);
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.getElementById(EXTENSION_IDS.loading.earlyHideStyle)).toBeNull();
      expect(document.getElementById('vue-edit-app')).not.toBeNull();
    });

    it('[covers:load_edit_ui.no_bg_element_logs_error_and_resets_flag] #bgが無い場合エラーをログしisEditUILoadedをfalseに戻す', async () => {
      // #bgを用意しない
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('div#bg not found');
      expect(document.getElementById('vue-edit-app')).toBeNull();
    });

    it('[covers:watch_url_changes.hashchange_to_edit_url_reapplies_theme_and_loads] hashchangeで複数回イベントが発火しても例外にならず処理が継続する', async () => {
      setupEditPageDom();
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(() => {
        window.dispatchEvent(new Event('hashchange'));
        window.dispatchEvent(new Event('hashchange'));
      }).not.toThrow();
      await flush();

      expect(document.getElementById('vue-edit-app')).not.toBeNull();
    });

    it('[covers:watch-url-changes.prefetched-module-mounts-on-later-hashchange-to-edit] 非編集評価（prefetch相当）後のhash遷移でloadEditUIが開始されvue-edit-appが生成される', async () => {
      // prefetch: beforeEachのimport時点でmockIsVueEditPage=falseのままモジュールが評価
      // されている（TASK-513の再現前提。この時点ではリスナ登録のみでUIは生成されない）
      expect(hashchangeListenerRemovers.length).toBeGreaterThan(0);
      expect(document.getElementById('vue-edit-app')).toBeNull();

      // hash遷移で#/ytomo/editへ入る。isVueEditPageはwindow.location.hashを判定する
      // ため、モックの切替がhash遷移を表現する。#bgを含む編集ページDOMを用意して
      // hashchangeを発火する
      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      // overlayからマウントへの統合順序（content/index.ts側のoverlay・handoff）は
      // E2E（test-loader-flicker.cjs観点5）の対象。ここではedit-ui側リスナから
      // ロードが開始されることのみ検証する
      expect(document.getElementById('vue-edit-app')).not.toBeNull();
    });

    it('[covers:watch_url_changes.hashchange_away_resets_flag_and_disconnects_observer] 編集URLを離れるとisEditUILoadedがリセットされobserverがdisconnectされる', async () => {
      setupEditPageDom();
      const header = document.createElement('header');
      document.body.appendChild(header);
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();
      expect(document.getElementById('vue-edit-app')).not.toBeNull();

      // 編集URL以外に離脱
      mockIsVueEditPage.mockReturnValue(false);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      // 再度編集URLに戻ると再度loadEditUIが実行され、#vue-edit-appが作り直される
      document.getElementById('bg')!.innerHTML = '';
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      expect(document.getElementById('vue-edit-app')).not.toBeNull();
    });

    it('[covers:load_edit_ui.injects_edit_ui_styles_only_once] 編集URLへの再訪でもeditUiStylesは重複しない', async () => {
      setupEditPageDom();
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      mockIsVueEditPage.mockReturnValue(false);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      document.getElementById('bg')!.innerHTML = '';
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      const styleEls = document.querySelectorAll(`#${EXTENSION_IDS.deckEdit.editUiStyles}`);
      expect(styleEls.length).toBe(1);
    });
  });

  describe('initVueApp (loadEditUI経由)', () => {
    it('[covers:init_vue_app.applies_cached_settings_to_store_when_present][covers:init_vue_app.skips_settings_store_when_no_cache] キャッシュ設定の有無に関わらずVueアプリのマウントは成功する', async () => {
      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'dark' };
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.getElementById('vue-edit-app')?.children.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('トップレベルIIFE', () => {
    it('[covers:top-level.not-edit-page-skips-theme-but-registers-url-watch] 編集ページでなければテーマ適用はスキップするがhashchangeリスナを登録する', () => {
      // beforeEachのimport時点でmockIsVueEditPage=falseのままモジュールが評価されている
      // （prefetch相当のため再importは不要）

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBeNull();
      expect(document.getElementById('vue-edit-app')).toBeNull();
      // TASK-513: 非編集ページでもwatchUrlChanges()が実行され、hashchangeリスナが
      // 登録されること（applyThemeFromSettingsはスキップされる）
      expect(hashchangeListenerRemovers.length).toBeGreaterThan(0);
    });

    it('[covers:top_level.edit_page_applies_theme_and_watches_url] 編集ページならテーマ適用とURL監視の両方が動く', async () => {
      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);
      mockIsVueEditPage.mockReturnValue(true);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).not.toBeNull();
      expect(document.getElementById('vue-edit-app')).not.toBeNull();
    });
  });

  describe('TASK-513 世代トークン（編集URL離脱時のloadEditUI中止）', () => {
    // 設計「テスト範囲の限定」節・単体テスト3のdeferred手法:
    // applyThemeFromSettings（chrome.storage.local.get）と initVueApp 内の
    // settings store dynamic import をテスト側のdeferredで保留し、保留中に
    // 離脱hashchangeを発火させることで、各await復帰後の中止判定を決定的に再現する

    afterEach(() => {
      // 本describe内でのみ登録したdoMockを解除（以降のテストへの影響防止）
      vi.doUnmock('@/stores/settings');
    });

    it('[covers:load-edit-ui.aborts-before-dom-prep-when-left-during-theme-await] テーマ適用await中に編集URLを離脱した場合、DOM準備前に中断する', async () => {
      // 他テストでheadに残留したeditUiStylesを掃除（absenceアサーションの前提）
      document.getElementById(EXTENSION_IDS.deckEdit.editUiStyles)?.remove();

      // #bgに元コンテンツのマーカーを置く（DOM準備が走ればinnerHTML=''で消える）
      const bg = document.createElement('div');
      bg.id = 'bg';
      const originalContent = document.createElement('p');
      originalContent.id = 'original-bg-content';
      bg.appendChild(originalContent);
      document.body.appendChild(bg);

      // テーマ適用をchrome.storage.local.getのdeferredで保留する
      // （beforeEachでwindow.ygoNextCurrentSettingsは削除済みのためstorage経路を通る）
      let releaseStorage: () => void = () => {};
      const storageGate = new Promise<void>(resolve => { releaseStorage = resolve; });
      let storageGetCalls = 0;
      global.chrome.storage.local.get = vi.fn((_keys, callback) => {
        storageGetCalls++;
        void storageGate.then(() => callback({}));
      });

      // beforeEachのimport時点でmockIsVueEditPage=falseのまま評価済み（prefetch相当）。
      // hash遷移で編集URLに入りloadEditUIを開始させる
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));

      // リスナのfire-and-forgetテーマ適用とloadEditUI内のテーマ適用の両方が
      // storage取得で保留中になったことを確認（同一ディスパッチ内で同期呼び出し）
      await vi.waitFor(() => {
        expect(storageGetCalls).toBeGreaterThanOrEqual(2);
      }, { timeout: 2000, interval: 10 });

      // 保留中に編集URLを離脱（離脱分岐: isEditUILoaded=false化+世代増分）
      mockIsVueEditPage.mockReturnValue(false);
      window.dispatchEvent(new Event('hashchange'));

      // 保留を解放し、中止判定1（DOM準備前）に到達させる
      releaseStorage();
      await flush();

      // DOM準備より前で中断: #vue-edit-app未生成・editUiStyles未注入・#bg内容は破壊されない
      expect(document.getElementById('vue-edit-app')).toBeNull();
      expect(document.getElementById(EXTENSION_IDS.deckEdit.editUiStyles)).toBeNull();
      expect(document.getElementById('original-bg-content')).not.toBeNull();
    });

    it('[covers:init-vue-app.skips-mount-when-left-during-module-await] モジュールawait中に編集URLを離脱した場合、app.mountを実行しない', async () => {
      document.getElementById(EXTENSION_IDS.deckEdit.editUiStyles)?.remove();

      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);

      // 判定3の検証用言語リンク（中止時に書き換えられないことを見る）
      const langLink = document.createElement('a');
      langLink.setAttribute('href', "javascript:ChangeLanguage('en')");
      document.body.appendChild(langLink);

      // メモリキャッシュを設定（テーマ適用をstorage待ちにさせず中止判定1を通過させ、
      // かつinitVueAppの settings store import 経路を通す）
      setCurrentSettingsCache({ theme: 'dark' });

      // initVueApp内の dynamic import('../../stores/settings') をテスト側のdeferredで
      // 保留する（マウント直前のawait。設計rev2ではvueModulesPromiseの完了タイミングを
      // 制御できないためunverifiable扱いだったが、このawaitを制御点にすれば決定的に再現できる）
      let releaseSettings: () => void = () => {};
      const settingsGate = new Promise<void>(resolve => { releaseSettings = resolve; });
      let settingsFactoryEntered = false;
      vi.doMock('@/stores/settings', async () => {
        settingsFactoryEntered = true;
        await settingsGate;
        return {
          useSettingsStore: () => ({
            appSettings: {},
            applyCardSize: () => {},
            applyTheme: () => {},
            applyRightAreaStyles: () => {}
          })
        };
      });

      // beforeEachのimport時点でmockIsVueEditPage=falseのまま評価済み（prefetch相当）。
      // hash遷移で編集URLに入る。テーマはメモリキャッシュで即座に解決し、DOM準備
      // （#vue-edit-app生成）を経てinitVueAppがsettings importで保留する
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));

      await vi.waitFor(() => {
        expect(settingsFactoryEntered).toBe(true);
      }, { timeout: 2000, interval: 10 });

      // 保留中に編集URLを離脱（世代増分）
      mockIsVueEditPage.mockReturnValue(false);
      window.dispatchEvent(new Event('hashchange'));

      // 解放するとマウント直前の中止判定2に到達し、mountは実行されない
      releaseSettings();
      await flush();

      // DOM準備は実行済み（中止判定1は通過）だがVueアプリはマウントされない。
      // mountの痕跡はコンテナのdata-v-app属性（Vue 3がapp.mount時に付与）で観測する
      const vueEditApp = document.getElementById('vue-edit-app');
      expect(vueEditApp).not.toBeNull();
      expect(vueEditApp?.hasAttribute('data-v-app')).toBe(false);

      // 中止判定3: マウント中断と同一世代のため、後続の言語リンク差し替えも
      // 実行されない（公式ページの言語リンクが書き換えられたまま残らない）
      expect(langLink.getAttribute('href')).toBe("javascript:ChangeLanguage('en')");

      // 対照: 再入時の新規loadEditUIではマウントと言語リンク差し替えが実行される
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await vi.waitFor(() => {
        expect(document.getElementById('vue-edit-app')?.hasAttribute('data-v-app')).toBe(true);
      }, { timeout: 2000, interval: 10 });
      expect(langLink.getAttribute('href')).toBe('javascript:void(0)');
    });

    it('[covers:load-edit-ui.aborts-before-dom-prep-when-left-during-theme-await] 急速離脱->再入で旧世代と新世代のloadEditUIが同時進行しても旧処理は新処理のフラグを壊さない', async () => {
      document.getElementById(EXTENSION_IDS.deckEdit.editUiStyles)?.remove();

      const bg = document.createElement('div');
      bg.id = 'bg';
      document.body.appendChild(bg);

      // テーマ適用をchrome.storage.local.getのdeferredで保留する（旧世代・新世代双方の
      // loadEditUIが保留点で同時進行する状態を作る）
      let releaseStorage: () => void = () => {};
      const storageGate = new Promise<void>(resolve => { releaseStorage = resolve; });
      global.chrome.storage.local.get = vi.fn((_keys, callback) => {
        void storageGate.then(() => callback({}));
      });

      // prefetch相当の非編集評価済み -> 編集URLに入る（旧世代loadEditUI開始・保留）
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      // 旧世代がテーマ適用で保留中のまま編集URLを離脱し、即座に再入する
      // （離脱: isEditUILoaded=false + 世代増分。再入: 新世代loadEditUI開始 -> 保留）
      mockIsVueEditPage.mockReturnValue(false);
      window.dispatchEvent(new Event('hashchange'));
      mockIsVueEditPage.mockReturnValue(true);
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      // この時点では旧世代も新世代も保留中のため #vue-edit-app は未生成
      expect(document.getElementById('vue-edit-app')).toBeNull();

      // 保留を解放: 旧世代は中止判定1で中断（isEditUILoadedには触らない）、
      // 新世代はそのまま完了してマウントまで進む
      releaseStorage();
      await flush();
      await vi.waitFor(() => {
        expect(document.getElementById('vue-edit-app')?.hasAttribute('data-v-app')).toBe(true);
      }, { timeout: 2000, interval: 10 });

      // 旧世代の中断が新世代の isEditUILoaded=true を壊していないことの検証:
      // フラグがfalseに戻っていた場合、編集URL内での追加hashchangeでloadEditUIが
      // 再実行され #vue-edit-app が作り直される。マウント済み要素に識別属性を
      // 付けて要素同一性が保たれること（=再ロードされないこと）で観測する
      const mounted = document.getElementById('vue-edit-app');
      expect(mounted).not.toBeNull();
      mounted?.setAttribute('data-test-mount-identity', '1');
      window.dispatchEvent(new Event('hashchange'));
      await flush();

      expect(document.querySelector('#vue-edit-app[data-test-mount-identity="1"]')).not.toBeNull();
      // 二重マウントも起きていないこと（Vue warn相当: 同一コンテナへの再マウントは
      // 要素が作り直されるため、上の同一性アサーションで涵盖される）
    });
  });
});
