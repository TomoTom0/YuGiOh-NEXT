/**
 * deck-display/index.ts のテスト
 *
 * tests/design/deck-display-index/conditions.toml (TASK-330) のconditionをカバーする。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApplyDeckDisplayLayout = vi.fn();
const mockSetCardImageSize = vi.fn();
vi.mock('@/content/deck-display/deckDisplayLayout', () => ({
  applyDeckDisplayLayout: (...args: unknown[]) => mockApplyDeckDisplayLayout(...args),
  setCardImageSize: (...args: unknown[]) => mockSetCardImageSize(...args)
}));

const mockApplyCardDetailStyles = vi.fn();
vi.mock('@/content/deck-display/styles', () => ({
  applyCardDetailStyles: (...args: unknown[]) => mockApplyCardDetailStyles(...args)
}));

const mockSetupVueApp = vi.fn().mockResolvedValue(undefined);
vi.mock('@/content/deck-display/vueSetup', () => ({
  setupVueApp: (...args: unknown[]) => mockSetupVueApp(...args)
}));

const mockSetupRegulationDisplay = vi.fn().mockResolvedValue(undefined);
vi.mock('@/content/deck-display/regulation-ui', () => ({
  setupRegulationDisplay: (...args: unknown[]) => mockSetupRegulationDisplay(...args)
}));

const mockEnsureParsedDeckInfo = vi.fn().mockResolvedValue(null);
vi.mock('@/content/deck-display/card-detail-ui', () => ({
  ensureParsedDeckInfo: mockEnsureParsedDeckInfo
}));

import { initDeckDisplay } from '@/content/deck-display/index';

const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query
  })));
};

describe('deck-display/index.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-ygo-next-theme');
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    stubMatchMedia(false);
    delete (window as unknown as { ygoNextCurrentSettings?: unknown }).ygoNextCurrentSettings;
    global.chrome.storage.local.get = vi.fn((_keys, callback) => callback({}));
  });

  describe('initDeckDisplay', () => {
    it('[covers:init_deck_display.uses_memory_cache_when_available] メモリキャッシュがあればstorageを参照しない', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'dark' };
      const getSpy = vi.spyOn(global.chrome.storage.local, 'get');

      await initDeckDisplay();

      expect(getSpy).not.toHaveBeenCalled();
      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
    });

    it('[covers:init_deck_display.fetches_from_storage_when_no_cache] メモリキャッシュが無ければstorageから取得しキャッシュする', async () => {
      global.chrome.storage.local.get = vi.fn((_keys, callback) => callback({ appSettings: { theme: 'dark' } }));

      await initDeckDisplay();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
      expect((window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings).toEqual({ theme: 'dark' });
    });

    it('[covers:init_deck_display.applies_theme_from_settings] 設定のthemeがDOMに適用される', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'light' };

      await initDeckDisplay();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('light');
      expect(mockApplyDeckDisplayLayout).toHaveBeenCalled();
      expect(mockApplyCardDetailStyles).toHaveBeenCalled();
    });

    it('[covers:init_deck_display.sets_up_regulation_display_regardless_of_show_card_detail] showCardDetailInDeckDisplayの値に関わらずsetupRegulationDisplayがensureParsedDeckInfoと共に呼ばれる', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();

      expect(mockSetupRegulationDisplay).toHaveBeenCalledWith(mockEnsureParsedDeckInfo);
    });

    it('[covers:init_deck_display.deck_image_gets_ygo_next_class_when_present] #deck_imageにygo-nextクラスが追加される', async () => {
      const deckImage = document.createElement('div');
      deckImage.id = 'deck_image';
      document.body.appendChild(deckImage);
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();

      expect(deckImage.classList.contains('ygo-next')).toBe(true);
    });

    it('[covers:init_deck_display.no_deck_image_skips_class_add] #deck_imageが無くてもエラーにならない', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await expect(initDeckDisplay()).resolves.toBeUndefined();
    });

    it('[covers:init_deck_display.show_card_detail_true_mounts_vue] showCardDetailInDeckDisplay=trueでsetupVueAppが呼ばれる', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { showCardDetailInDeckDisplay: true };

      await initDeckDisplay();

      expect(mockSetupVueApp).toHaveBeenCalled();
      expect(mockSetupRegulationDisplay).toHaveBeenCalledWith(mockEnsureParsedDeckInfo);
    });

    it('[covers:init_deck_display.show_card_detail_false_or_missing_skips_vue_mount] showCardDetailInDeckDisplay未設定ならsetupVueAppは呼ばれない', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();

      expect(mockSetupVueApp).not.toHaveBeenCalled();
    });

    it('[covers:init_deck_display.sets_card_image_size_with_default] deckDisplayCardImageSize未設定時はmediumが使われる', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();

      expect(mockSetCardImageSize).toHaveBeenCalledWith('medium');
    });

    it('[covers:init_deck_display.sets_card_image_size_with_default] deckDisplayCardImageSizeが設定されていればその値が使われる', async () => {
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { deckDisplayCardImageSize: 'large' };

      await initDeckDisplay();

      expect(mockSetCardImageSize).toHaveBeenCalledWith('large');
    });
  });

  describe('setupImageLoadedEffect (initDeckDisplay経由)', () => {
    it('[covers:setup_image_loaded_effect.already_complete_adds_class_immediately] 読み込み済み画像には即座にloadedクラスが付く', async () => {
      const img = document.createElement('img');
      img.src = '/yugiohdb/images/card/12345.jpg';
      Object.defineProperty(img, 'complete', { value: true, configurable: true });
      Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true });
      const deckImage = document.createElement('div');
      deckImage.id = 'deck_image';
      deckImage.appendChild(img);
      document.body.appendChild(deckImage);
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();

      expect(img.classList.contains('loaded')).toBe(true);
    });

    it('[covers:setup_image_loaded_effect.not_complete_adds_class_on_load_event] 未読み込み画像はloadイベント発火後にloadedクラスが付く', async () => {
      const img = document.createElement('img');
      img.src = '/yugiohdb/images/card/12345.jpg';
      Object.defineProperty(img, 'complete', { value: false, configurable: true });
      const deckImage = document.createElement('div');
      deckImage.id = 'deck_image';
      deckImage.appendChild(img);
      document.body.appendChild(deckImage);
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = {};

      await initDeckDisplay();
      expect(img.classList.contains('loaded')).toBe(false);

      img.dispatchEvent(new Event('load'));
      expect(img.classList.contains('loaded')).toBe(true);
    });
  });

  describe('applyTheme (initDeckDisplay経由)', () => {
    it('[covers:apply_theme.system_follows_match_media] system指定時はmatchMediaに従う', async () => {
      stubMatchMedia(true);
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'system' };

      await initDeckDisplay();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('dark');
    });

    it('[covers:apply_theme.explicit_value_used_directly] 明示的なtheme指定はmatchMediaを無視する', async () => {
      stubMatchMedia(true); // darkと判定されうる状態でも
      (window as unknown as { ygoNextCurrentSettings: unknown }).ygoNextCurrentSettings = { theme: 'light' };

      await initDeckDisplay();

      expect(document.documentElement.getAttribute('data-ygo-next-theme')).toBe('light');
    });
  });
});
