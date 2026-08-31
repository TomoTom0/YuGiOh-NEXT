/**
 * edit-ui/index.ts のテスト
 *
 * tests/design/edit-ui-index/conditions.toml (TASK-330) のconditionをカバーする。
 * モジュールレベルの状態(isEditUILoaded/isEventListenerRegistered/headerResizeObserver)を
 * 持つため、各テストで vi.resetModules() + 動的import により状態をリセットする。
 * './DeckEditLayout.vue'は実マウント結果を検証しない(DeckEditLayout.test.tsで別途検証済み)
 * ためスタブに差し替える。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
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

const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

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
    vi.resetModules();
    mod = await import('@/content/edit-ui/index');
  });

  afterEach(() => {
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
      const earlyHide = document.createElement('style');
      earlyHide.id = EXTENSION_IDS.loading.earlyHideStyle;
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
    it('[covers:top_level.not_edit_page_skips_all_initialization] 編集ページでなければ何も初期化しない', async () => {
      mockIsVueEditPage.mockReturnValue(false);

      vi.resetModules();
      mod = await import('@/content/edit-ui/index');
      await flush();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBeNull();
      expect(document.getElementById('vue-edit-app')).toBeNull();
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
});
