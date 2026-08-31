/**
 * vueSetup.ts のテスト
 *
 * tests/design/vue-setup/conditions.toml (TASK-330) のconditionをカバーする。
 * 既存のtests/unit/deck-display/vueSetup-cleanup.test.tsはvueSetup.tsを
 * 一切importせず実装の分岐を検証していなかったため、本ファイルを新規作成した。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';

vi.mock('@/content/deck-display/DeckDisplayApp.vue', () => ({
  default: { name: 'StubDeckDisplayApp', render: () => null }
}));

const mockLoadCommonSettings = vi.fn().mockResolvedValue(undefined);
let mockEffectiveTheme = 'light';
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    loadCommonSettings: mockLoadCommonSettings,
    get effectiveTheme() { return mockEffectiveTheme; }
  })
}));

const mockInitCardDetailUI = vi.fn().mockResolvedValue(undefined);
vi.mock('@/content/deck-display/card-detail-ui', () => ({
  initCardDetailUI: (...args: unknown[]) => mockInitCardDetailUI(...args)
}));

const mockInitShuffle = vi.fn();
vi.mock('@/content/shuffle', () => ({
  initShuffle: (...args: unknown[]) => mockInitShuffle(...args)
}));

const mockGetCardDetailWithCache = vi.fn();
vi.mock('@/api/card-search', () => ({
  getCardDetailWithCache: (...args: unknown[]) => mockGetCardDetailWithCache(...args)
}));

import { setupVueApp, cleanupCardImageHoverUI } from '@/content/deck-display/vueSetup';

const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

function createDeckImageDom(): { deckImage: HTMLElement; mainLink: HTMLAnchorElement } {
  const deckImage = document.createElement('div');
  deckImage.id = 'deck_image';

  const main = document.createElement('div');
  main.id = 'main';
  const imageSet = document.createElement('div');
  imageSet.className = 'image_set';
  const mainLink = document.createElement('a');
  mainLink.href = 'https://example.com/card?cid=12345';
  imageSet.appendChild(mainLink);
  main.appendChild(imageSet);
  deckImage.appendChild(main);

  document.body.appendChild(deckImage);
  return { deckImage, mainLink };
}

describe('vueSetup.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    vi.clearAllMocks();
    mockLoadCommonSettings.mockResolvedValue(undefined);
    mockEffectiveTheme = 'light';
    document.documentElement.removeAttribute('data-ygo-next-theme');
  });

  describe('setupVueApp', () => {
    it('[covers:setup_vue_app.no_main980_returns_early] #main980が無い場合何もしない', async () => {
      await expect(setupVueApp()).resolves.toBeUndefined();
      expect(mockInitCardDetailUI).not.toHaveBeenCalled();
    });

    it('[covers:setup_vue_app.already_mounted_returns_early] 既にCard Detailがマウント済みの場合は再マウントしない', async () => {
      const main980 = document.createElement('div');
      main980.id = 'main980';
      const existing = document.createElement('div');
      existing.id = 'ygo-next-card-detail-container';
      main980.appendChild(existing);
      document.body.appendChild(main980);

      await setupVueApp();

      expect(mockInitCardDetailUI).not.toHaveBeenCalled();
      expect(main980.querySelectorAll('#ygo-next-deck-display-app').length).toBe(0);
    });

    it('[covers:setup_vue_app.success_sets_theme_and_mounts] 正常時はテーマ属性を設定しappContainerをマウントする', async () => {
      mockEffectiveTheme = 'dark';
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);

      await setupVueApp();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
      const appContainer = document.getElementById('ygo-next-deck-display-app');
      expect(appContainer).not.toBeNull();
      expect(appContainer?.style.backgroundColor).toBe('#1a1a1a');
      expect(mockInitCardDetailUI).toHaveBeenCalled();
      expect(mockInitShuffle).toHaveBeenCalled();
    });

    it('[covers:setup_vue_app.success_sets_theme_and_mounts] light テーマの場合背景色は白になる', async () => {
      mockEffectiveTheme = 'light';
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);

      await setupVueApp();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('light');
      expect(document.getElementById('ygo-next-deck-display-app')?.style.backgroundColor).toBe('#ffffff');
    });
  });

  describe('cleanupCardImageHoverUI', () => {
    it('[covers:cleanup_hover_ui.no_deck_image_or_handler_skips] セットアップ未実行状態で呼んでもエラーにならない', () => {
      expect(() => cleanupCardImageHoverUI()).not.toThrow();
    });

    it('[covers:cleanup_hover_ui.removes_listener_when_present][covers:setup_hover_ui.already_delegated_skips_reattach] セットアップ後にcleanupするとdata-ygo-next-event-delegated属性が削除される', async () => {
      const { deckImage } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);

      await setupVueApp();
      await flush();

      expect(deckImage.hasAttribute('data-ygo-next-event-delegated')).toBe(true);

      cleanupCardImageHoverUI();

      expect(deckImage.hasAttribute('data-ygo-next-event-delegated')).toBe(false);
    });

    it('[covers:cleanup_hover_ui.removes_controls_from_marked_links_only] data-hover-handler-added属性を持つリンクのみcontrolsが削除される', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);

      await setupVueApp();
      await flush();

      expect(mainLink.hasAttribute('data-hover-handler-added')).toBe(true);
      expect(mainLink.querySelector('.ygo-next-card-controls')).not.toBeNull();

      cleanupCardImageHoverUI();

      expect(mainLink.hasAttribute('data-hover-handler-added')).toBe(false);
      expect(mainLink.querySelector('.ygo-next-card-controls')).toBeNull();
    });
  });

  describe('setupCardImageHoverUI (setupVueApp経由)', () => {
    it('[covers:setup_hover_ui.no_deck_image_warns_and_returns] #deck_imageが無い場合警告してreturnする', async () => {
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await setupVueApp();
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[DeckDisplay] #deck_image not found');
    });

    it('[covers:setup_hover_ui.adds_controls_to_unmarked_links_only] カードリンクにcard-controlsボタンが追加される', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);

      await setupVueApp();
      await flush();

      const controls = mainLink.querySelector('.ygo-next-card-controls');
      expect(controls).not.toBeNull();
      expect(controls?.querySelectorAll('.ygo-next-card-btn').length).toBe(4);
    });

    it('[covers:setup_hover_ui.click_ignores_non_button_target] ボタン以外をクリックしても何も起きない', async () => {
      const { deckImage, mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      await setupVueApp();
      await flush();

      mainLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardDetailWithCache).not.toHaveBeenCalled();
    });

    it('[covers:setup_hover_ui.click_ignores_non_top_left_button] top-left以外のボタンをクリックしても何も起きない', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      await setupVueApp();
      await flush();

      const topRightBtn = mainLink.querySelector('.ygo-next-card-btn.top-right') as HTMLElement;
      topRightBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardDetailWithCache).not.toHaveBeenCalled();
    });

    it('[covers:setup_hover_ui.click_no_cid_in_href_warns] hrefにcidが無い場合警告する', async () => {
      const { mainLink } = createDeckImageDom();
      mainLink.href = 'https://example.com/no-cid-here';
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      await setupVueApp();
      await flush();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const topLeftBtn = mainLink.querySelector('.ygo-next-card-btn.top-left') as HTMLElement;
      topLeftBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[DeckDisplay] No card ID found in href:', mainLink.href);
      expect(mockGetCardDetailWithCache).not.toHaveBeenCalled();
    });

    it('[covers:setup_hover_ui.click_success_sets_selected_card] 有効なcidをクリックするとカード詳細が設定される', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      mockGetCardDetailWithCache.mockResolvedValue({ detail: { card: { cardId: '12345', name: 'テストカード' } } });
      await setupVueApp();
      await flush();

      const topLeftBtn = mainLink.querySelector('.ygo-next-card-btn.top-left') as HTMLElement;
      topLeftBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardDetailWithCache).toHaveBeenCalledWith('12345');
      const store = useCardDetailStore();
      expect(store.selectedCard).toMatchObject({ cardId: '12345', name: 'テストカード' });
    });

    it('[covers:setup_hover_ui.click_no_card_data_warns] カードデータが無い場合警告のみでselectedCardは変わらない', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      mockGetCardDetailWithCache.mockResolvedValue({});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await setupVueApp();
      await flush();

      const topLeftBtn = mainLink.querySelector('.ygo-next-card-btn.top-left') as HTMLElement;
      topLeftBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[DeckDisplay] No card data in result');
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('[covers:setup_hover_ui.click_fetch_error_warns] カード詳細取得が失敗しても例外は伝播しない', async () => {
      const { mainLink } = createDeckImageDom();
      const main980 = document.createElement('div');
      main980.id = 'main980';
      document.body.appendChild(main980);
      mockGetCardDetailWithCache.mockRejectedValue(new Error('fetch failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await setupVueApp();
      await flush();

      const topLeftBtn = mainLink.querySelector('.ygo-next-card-btn.top-left') as HTMLElement;
      expect(() => topLeftBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[DeckDisplay] Failed to fetch card detail:', expect.any(Error));
    });
  });
});
