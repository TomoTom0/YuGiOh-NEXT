import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import {
  CARD_SIZE_MAP,
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_SETTINGS,
  DEFAULT_UX_SETTINGS,
  type KeyboardShortcut,
} from '@/types/settings';
import { DEFAULT_TAIL_PLACEMENT_CARD_IDS } from '@/config/default-tail-placement-cards';

const ensureMappingForLanguageMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/mapping-manager', () => ({
  mappingManager: {
    ensureMappingForLanguage: ensureMappingForLanguageMock,
  },
}));

describe('stores/settings', () => {
  let mockStorage: Record<string, any>;

  const matchMediaListeners: Array<(event: MediaQueryListEvent) => void> = [];

  function installMatchMedia(matches = false) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
          matchMediaListeners.push(listener);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  function installChromeStorage() {
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        getURL: (path: string) => path,
        onMessage: { addListener: vi.fn() },
      },
      storage: {
        local: {
          get: vi.fn((keys: string[], callback: (result: Record<string, any>) => void) => {
            const result: Record<string, any> = {};
            for (const key of keys) {
              if (Object.prototype.hasOwnProperty.call(mockStorage, key)) {
                result[key] = mockStorage[key];
              }
            }
            callback(result);
          }),
          set: vi.fn((items: Record<string, any>, callback?: () => void) => {
            Object.assign(mockStorage, items);
            callback?.();
          }),
          remove: vi.fn(),
        },
      },
    } as any;
  }

  async function createLoadedStore() {
    const store = useSettingsStore();
    await store.loadSettings();
    (chrome.storage.local.set as any).mockClear();
    vi.mocked(document.documentElement.style.setProperty).mockClear();
    return store;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockStorage = {};
    matchMediaListeners.length = 0;
    ensureMappingForLanguageMock.mockReset();
    ensureMappingForLanguageMock.mockResolvedValue(undefined);
    installChromeStorage();
    installMatchMedia(false);
    localStorage.clear();
    vi.spyOn(document.documentElement.style, 'setProperty');
    vi.spyOn(document.documentElement, 'setAttribute');
    delete (window as any).ygoNextCurrentSettings;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('load', () => {
    it('[covers:load-settings.loads-common-then-deck-edit] [covers:load-common.no-saved-settings-uses-defaults-and-default-tail] [covers:load-deck-edit.applies-deck-edit-card-size] loads defaults and applies common/deck CSS', async () => {
      const store = useSettingsStore();

      await store.loadSettings();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        ['appSettings', 'featureSettings', 'tailPlacementCardIds'],
        expect.any(Function)
      );
      expect(store.appSettings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
      expect(store.featureSettings).toEqual(DEFAULT_FEATURE_SETTINGS);
      expect(store.tailPlacementCardIds).toEqual(DEFAULT_TAIL_PLACEMENT_CARD_IDS);
      expect(store.tailPlacementCardIds).not.toBe(DEFAULT_TAIL_PLACEMENT_CARD_IDS);
      expect(store.isLoaded).toBe(true);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--card-width-info',
        `${CARD_SIZE_MAP.xlarge.width}px`
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--card-width-deck',
        `${CARD_SIZE_MAP.large.width}px`
      );
    });

    it('[covers:load-common.saved-nonempty-tail-ids-are-kept] keeps stored non-empty tail placement ids', async () => {
      mockStorage.tailPlacementCardIds = ['1', '2'];
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.tailPlacementCardIds).toEqual(['1', '2']);
    });

    it('[covers:load-common.empty-or-invalid-tail-ids-use-default-tail] falls back to default tail placement ids for empty or invalid stored values', async () => {
      mockStorage.tailPlacementCardIds = [];
      const firstStore = useSettingsStore();
      await firstStore.loadCommonSettings();
      expect(firstStore.tailPlacementCardIds).toEqual(DEFAULT_TAIL_PLACEMENT_CARD_IDS);

      setActivePinia(createPinia());
      mockStorage.tailPlacementCardIds = 'not-array';
      const secondStore = useSettingsStore();
      await secondStore.loadCommonSettings();
      expect(secondStore.tailPlacementCardIds).toEqual(DEFAULT_TAIL_PLACEMENT_CARD_IDS);
    });

    it('[covers:load-common.migrates-toggle-and-deletes-ai-text-links] migrates removed and renamed old settings keys', async () => {
      mockStorage.appSettings = {
        theme: 'light',
        deckLevelSortOrder: 'toggle',
        aiTextLinksEnabled: true,
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.appSettings.deckLevelSortOrder).toBe('toggle-desc');
      expect((store.appSettings as any).aiTextLinksEnabled).toBeUndefined();
    });

    it('[covers:load-common.migrates-legacy-ux-when-ux-missing] migrates top-level legacy UX keys only when ux is missing', async () => {
      mockStorage.appSettings = {
        theme: 'dark',
        searchInputPosition: 'right-bottom',
        defaultSearchMode: 'text',
        enableMouseOperations: true,
        changeFavicon: false,
        keyboardShortcuts: {
          globalSearch: [{ key: '?', ctrl: false, shift: true, alt: false }],
          undo: [{ key: 'z', ctrl: true, shift: false, alt: false }],
          redo: [{ key: 'y', ctrl: true, shift: false, alt: false }],
        },
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.appSettings.ux.searchInputPosition).toBe('right-bottom');
      expect(store.appSettings.ux.defaultSearchMode).toBe('text');
      expect(store.appSettings.ux.enableMouseOperations).toBe(true);
      expect(store.appSettings.ux.changeFavicon).toBe(false);
      expect(store.appSettings.ux.keyboardShortcuts.globalSearch[0]?.key).toBe('?');
      expect((store.appSettings as any).searchInputPosition).toBeUndefined();
      expect((store.appSettings as any).keyboardShortcuts).toBeUndefined();
    });

    it('[covers:load-common.existing-ux-skips-legacy-ux-migration] does not move legacy UX keys when ux already exists', async () => {
      mockStorage.appSettings = {
        theme: 'dark',
        searchInputPosition: 'right-bottom',
        ux: {
          searchInputPosition: 'right-top',
          defaultSearchMode: 'auto',
        },
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.appSettings.ux.searchInputPosition).toBe('right-top');
      expect(store.appSettings.ux.defaultSearchMode).toBe('auto');
      expect((store.appSettings as any).searchInputPosition).toBe('right-bottom');
    });

    it('[covers:load-common.deep-merge-skips-null-undefined-and-empty-arrays] merges saved values using the store deepMerge rules', async () => {
      mockStorage.appSettings = {
        theme: null,
        language: undefined,
        ux: {
          keyboardShortcuts: {
            globalSearch: [],
            undo: [{ key: 'u', ctrl: true, shift: true, alt: false }],
          },
          cardListViewMode: {
            search: 'list',
          },
        },
      };
      mockStorage.featureSettings = {
        'deck-edit': false,
        chat: null,
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.appSettings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
      expect(store.appSettings.language).toBe(DEFAULT_APP_SETTINGS.language);
      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual(DEFAULT_UX_SETTINGS.keyboardShortcuts.globalSearch);
      expect(store.appSettings.ux.keyboardShortcuts.undo).toEqual([{ key: 'u', ctrl: true, shift: true, alt: false }]);
      expect(store.appSettings.ux.cardListViewMode.search).toBe('list');
      expect(store.appSettings.ux.cardListViewMode.related).toBe(DEFAULT_UX_SETTINGS.cardListViewMode.related);
      expect(store.featureSettings['deck-edit']).toBe(false);
      expect(store.featureSettings.chat).toBe(DEFAULT_FEATURE_SETTINGS.chat);
    });

    it('[covers:load-common.genesys-stored-artifact-overridden-by-default] 旧prodビルドが永続化したgenesys=false（category 3強制OFFのアーティファクト）はDEFAULT値で上書きされる', async () => {
      mockStorage.featureSettings = {
        genesys: false,
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.featureSettings.genesys).toBe(DEFAULT_FEATURE_SETTINGS.genesys);
      expect(store.featureSettings.genesys).toBe(true);
    });

    it('[covers:load-common.storage-get-throw-rejects] rejects when chrome.storage.local.get throws synchronously', async () => {
      (chrome.storage.local.get as any).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      const store = useSettingsStore();

      await expect(store.loadCommonSettings()).rejects.toThrow('Storage quota exceeded');
      expect(store.isLoaded).toBe(false);
      expect(store.appSettings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
    });
  });

  describe('save', () => {
    it('[covers:save-settings.persists-storage-and-cache] saves settings to chrome storage, localStorage, and window cache', async () => {
      const store = await createLoadedStore();
      store.appSettings.theme = 'dark';
      store.featureSettings.chat = true;
      store.tailPlacementCardIds = ['777'];

      await store.saveSettings();

      expect(mockStorage.appSettings.theme).toBe('dark');
      expect(mockStorage.featureSettings.chat).toBe(true);
      expect(mockStorage.tailPlacementCardIds).toEqual(['777']);
      expect(JSON.parse(localStorage.getItem('ygoNext:settings') || '{}').theme).toBe('dark');
      expect((window as any).ygoNextCurrentSettings.theme).toBe('dark');
    });

    it('[covers:save-settings.local-storage-failure-still-resolves] resolves and warns when the localStorage cache update fails', async () => {
      const store = await createLoadedStore();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      await expect(store.saveSettings()).resolves.toBeUndefined();

      expect(mockStorage.appSettings).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Settings] Failed to update localStorage cache:',
        expect.any(Error)
      );
    });

    it('[covers:save-settings.storage-set-throw-rejects] rejects when chrome.storage.local.set throws synchronously', async () => {
      const store = await createLoadedStore();
      (chrome.storage.local.set as any).mockImplementation(() => {
        throw new Error('Failed to save settings');
      });

      await expect(store.saveSettings()).rejects.toThrow('Failed to save settings');
    });
  });

  describe('card sizes', () => {
    it('[covers:set-deck-edit-card-size.updates-applies-saves] [covers:set-info-card-size.updates-applies-saves] [covers:set-grid-card-size.updates-applies-saves] [covers:set-list-card-size.updates-applies-saves] updates individual card sizes, applies CSS, and saves', async () => {
      const store = await createLoadedStore();

      store.setDeckEditCardSize('xlarge');
      store.setInfoCardSize('small');
      store.setGridCardSize('large');
      store.setListCardSize('medium');

      expect(store.appSettings.deckEditCardSize).toBe('xlarge');
      expect(store.appSettings.infoCardSize).toBe('small');
      expect(store.appSettings.gridCardSize).toBe('large');
      expect(store.appSettings.listCardSize).toBe('medium');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-deck', `${CARD_SIZE_MAP.xlarge.width}px`);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-info', `${CARD_SIZE_MAP.small.width}px`);
      expect(mockStorage.appSettings.listCardSize).toBe('medium');
    });

    it('[covers:set-practice-card-size.updates-saves-without-css-apply] [covers:set-practice-card-size-2p.updates-saves-without-css-apply] updates practice card sizes and saves', async () => {
      const store = await createLoadedStore();

      store.setPracticeCardSize('large');
      store.setPracticeCardSize2P('xlarge');

      expect(store.appSettings.practiceCardSize).toBe('large');
      expect(store.appSettings.practiceCardSize2P).toBe('xlarge');
      expect(mockStorage.appSettings.practiceCardSize).toBe('large');
      expect(mockStorage.appSettings.practiceCardSize2P).toBe('xlarge');
      expect(document.documentElement.style.setProperty).not.toHaveBeenCalled();
    });

    it('[covers:set-card-size-preset.xl-mapping] [covers:set-card-size-preset.l-mapping] [covers:set-card-size-preset.m-mapping] [covers:set-card-size-preset.s-mapping] applies all preset mappings', async () => {
      const store = await createLoadedStore();

      store.setCardSizePreset('xl');
      expect([store.appSettings.deckEditCardSize, store.appSettings.infoCardSize, store.appSettings.gridCardSize, store.appSettings.listCardSize]).toEqual(['xlarge', 'xlarge', 'large', 'xlarge']);

      store.setCardSizePreset('l');
      expect([store.appSettings.deckEditCardSize, store.appSettings.infoCardSize, store.appSettings.gridCardSize, store.appSettings.listCardSize]).toEqual(['large', 'xlarge', 'medium', 'large']);

      store.setCardSizePreset('m');
      expect([store.appSettings.deckEditCardSize, store.appSettings.infoCardSize, store.appSettings.gridCardSize, store.appSettings.listCardSize]).toEqual(['medium', 'large', 'small', 'medium']);

      store.setCardSizePreset('s');
      expect([store.appSettings.deckEditCardSize, store.appSettings.infoCardSize, store.appSettings.gridCardSize, store.appSettings.listCardSize]).toEqual(['small', 'medium', 'small', 'small']);
      expect(mockStorage.appSettings.listCardSize).toBe('small');
    });

    it('[covers:get-current-preset.returns-xl-l-m-s-or-null] returns the matching preset or null', async () => {
      const store = await createLoadedStore();

      store.setCardSizePreset('xl');
      expect(store.getCurrentPreset()).toBe('xl');
      store.setCardSizePreset('l');
      expect(store.getCurrentPreset()).toBe('l');
      store.setCardSizePreset('m');
      expect(store.getCurrentPreset()).toBe('m');
      store.setCardSizePreset('s');
      expect(store.getCurrentPreset()).toBe('s');
      store.appSettings.gridCardSize = 'xlarge';
      expect(store.getCurrentPreset()).toBeNull();
    });

    it('[covers:set-card-width.list-mode-updates-list-css] [covers:set-card-width.grid-mode-updates-grid-css] sets direct list/grid widths and calculated heights', async () => {
      const store = await createLoadedStore();

      store.setCardWidth('list', 100);
      store.setCardWidth('grid', 80);

      expect(store.cardWidthList).toBe(100);
      expect(store.cardWidthGrid).toBe(80);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-list', '100px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-height-list', '146px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-grid', '80px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-height-grid', '117px');
    });
  });

  describe('theme and language', () => {
    it('[covers:set-theme.updates-applies-saves] [covers:apply-theme.uses-effective-theme-direct-or-system] applies direct, system dark, and system fallback themes', async () => {
      const store = await createLoadedStore();

      store.setTheme('dark');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-ygo-next-theme', 'dark');
      expect(mockStorage.appSettings.theme).toBe('dark');

      installMatchMedia(true);
      store.setTheme('system');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-ygo-next-theme', 'dark');

      (window as any).matchMedia = undefined;
      store.applyTheme();
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-ygo-next-theme', 'light');
    });

    it('[covers:set-language.auto-skips-mapping-ensure] [covers:set-language.non-auto-ensures-mapping-async] updates language and only ensures mappings for non-auto languages', async () => {
      const store = await createLoadedStore();

      store.setLanguage('auto');
      expect(store.appSettings.language).toBe('auto');
      expect(ensureMappingForLanguageMock).not.toHaveBeenCalled();

      store.setLanguage('en');
      expect(store.appSettings.language).toBe('en');
      expect(mockStorage.appSettings.language).toBe('en');
      expect(ensureMappingForLanguageMock).toHaveBeenCalledWith('en');
    });

    it('[covers:set-language.mapping-ensure-rejection-is-logged] logs mapping ensure rejections', async () => {
      const error = new Error('mapping failed');
      ensureMappingForLanguageMock.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const store = await createLoadedStore();

      store.setLanguage('en');
      await Promise.resolve();
      await Promise.resolve();

      expect(errorSpy).toHaveBeenCalledWith('[Settings] Failed to ensure mapping for language:', error);
    });
  });

  describe('simple settings', () => {
    it('[covers:set-middle-decks-layout.updates-saves] [covers:set-card-list-view-mode.updates-section-saves] [covers:set-mouse-operations.updates-saves] [covers:set-change-favicon.updates-saves] [covers:set-search-input-position.updates-saves] [covers:set-default-search-mode.updates-saves] [covers:set-include-timestamp-in-export-filename.updates-saves] [covers:set-show-card-detail-in-deck-display.updates-saves] [covers:set-deck-display-card-image-size.updates-saves] [covers:set-background-deck-info-fetch.updates-saves] [covers:set-update-thumbnail-without-fetch.updates-saves] updates scalar and nested settings and saves them', async () => {
      const store = await createLoadedStore();

      store.setMiddleDecksLayout('horizontal');
      store.setCardListViewMode('related', 'list');
      store.setMouseOperations(true);
      store.setChangeFavicon(false);
      store.setSearchInputPosition('right-bottom');
      store.setDefaultSearchMode('text');
      store.setIncludeTimestampInExportFilename(false);
      store.setShowCardDetailInDeckDisplay(false);
      store.setDeckDisplayCardImageSize('large');
      store.setBackgroundDeckInfoFetch(false);
      store.setUpdateThumbnailWithoutFetch(false);

      expect(store.appSettings.middleDecksLayout).toBe('horizontal');
      expect(store.appSettings.ux.cardListViewMode.related).toBe('list');
      expect(store.appSettings.ux.cardListViewMode.search).toBe(DEFAULT_UX_SETTINGS.cardListViewMode.search);
      expect(store.appSettings.ux.enableMouseOperations).toBe(true);
      expect(store.appSettings.ux.changeFavicon).toBe(false);
      expect(store.appSettings.ux.searchInputPosition).toBe('right-bottom');
      expect(store.appSettings.ux.defaultSearchMode).toBe('text');
      expect(store.appSettings.includeTimestampInExportFilename).toBe(false);
      expect(store.appSettings.showCardDetailInDeckDisplay).toBe(false);
      expect(store.appSettings.deckDisplayCardImageSize).toBe('large');
      expect(store.appSettings.backgroundDeckInfoFetch).toBe(false);
      expect(store.appSettings.updateThumbnailWithoutFetch).toBe(false);
      expect(mockStorage.appSettings.updateThumbnailWithoutFetch).toBe(false);
    });

    it('[covers:toggle-feature.updates-dynamic-key-saves] writes dynamic feature keys and saves', async () => {
      const store = await createLoadedStore();

      store.toggleFeature('testFeature', true);
      expect(store.featureSettings.testFeature).toBe(true);
      expect(mockStorage.featureSettings.testFeature).toBe(true);

      store.toggleFeature('testFeature', false);
      expect(store.featureSettings.testFeature).toBe(false);
    });
  });

  describe('right area and font CSS', () => {
    it('[covers:set-right-area-width.updates-applies-saves] [covers:apply-right-area-styles.max-fit-sets-flexible-vars] applies MAX-FIT right area CSS variables', async () => {
      const store = await createLoadedStore();

      store.setRightAreaWidth('MAX-FIT');

      expect(store.appSettings.ux.rightAreaWidth).toBe('MAX-FIT');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-width', '100%');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-grow', '1');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-shrink', '1');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-basis', '300px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-max-width', 'max(300px, min(40%, calc(100% - 600px)))');
      expect(mockStorage.appSettings.ux.rightAreaWidth).toBe('MAX-FIT');
    });

    it('[covers:set-right-area-font-size.updates-applies-saves] [covers:apply-right-area-styles.fixed-width-sets-fixed-vars] applies fixed right area CSS variables and font size', async () => {
      const store = await createLoadedStore();

      store.setRightAreaWidth('S');
      store.setRightAreaFontSize('xl');

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-width', '300px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-grow', '0');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-shrink', '0');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-flex-basis', '300px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-max-width', 'none');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--right-area-font-size', '18px');
      expect(mockStorage.appSettings.ux.rightAreaFontSize).toBe('xl');
    });

    it('[covers:set-dialog-font-size.updates-applies-saves] [covers:set-search-ui-font-size.updates-applies-saves] [covers:apply-font-sizes.maps-dialog-and-search-ui] maps dialog and search UI font sizes to CSS variables', async () => {
      const store = await createLoadedStore();

      store.setDialogFontSize('xl');
      store.setSearchUIFontSize('s');

      expect(store.appSettings.dialogFontSize).toBe('xl');
      expect(store.appSettings.searchUIFontSize).toBe('s');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--dialog-font-size', '18px');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--search-ui-font-size', '12px');
    });
  });

  describe('keyboard shortcuts', () => {
    const shortcut = (key: string): KeyboardShortcut => ({ key, ctrl: false, shift: false, alt: false });

    it('[covers:add-keyboard-shortcut.below-limit-pushes-and-saves] adds shortcuts while below the limit', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [];

      store.addKeyboardShortcut('globalSearch', shortcut('1'));

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
      expect(mockStorage.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
    });

    it('[covers:add-keyboard-shortcut.limit-reached-warns-and-returns] warns and skips save at the shortcut limit', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1'), shortcut('2'), shortcut('3')];
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      store.addKeyboardShortcut('globalSearch', shortcut('4'));

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('2'), shortcut('3')]);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[Settings] Cannot add more than 3 shortcuts for globalSearch');
    });

    it('[covers:remove-keyboard-shortcut.valid-index-splices-and-saves] removes a shortcut at a valid index', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1'), shortcut('2'), shortcut('3')];

      store.removeKeyboardShortcut('globalSearch', 1);

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('3')]);
      expect(mockStorage.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('3')]);
    });

    it('[covers:remove-keyboard-shortcut.invalid-index-is-noop] ignores invalid shortcut indexes without saving', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1')];

      store.removeKeyboardShortcut('globalSearch', -1);
      store.removeKeyboardShortcut('globalSearch', 1);

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('tail placement cards', () => {
    it('[covers:add-tail-placement-card.absent-pushes-and-saves] [covers:add-tail-placement-card.duplicate-is-noop] adds missing tail placement cards and ignores duplicates', async () => {
      const store = await createLoadedStore();
      store.tailPlacementCardIds = ['100'];
      (chrome.storage.local.set as any).mockClear();

      store.addTailPlacementCard('200');
      expect(store.tailPlacementCardIds).toEqual(['100', '200']);
      expect(mockStorage.tailPlacementCardIds).toEqual(['100', '200']);

      (chrome.storage.local.set as any).mockClear();
      store.addTailPlacementCard('200');
      expect(store.tailPlacementCardIds).toEqual(['100', '200']);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('[covers:remove-tail-placement-card.present-splices-and-saves] [covers:remove-tail-placement-card.missing-is-noop] removes present tail placement cards and ignores missing ids', async () => {
      const store = await createLoadedStore();
      store.tailPlacementCardIds = ['100', '200'];
      (chrome.storage.local.set as any).mockClear();

      store.removeTailPlacementCard('100');
      expect(store.tailPlacementCardIds).toEqual(['200']);
      expect(mockStorage.tailPlacementCardIds).toEqual(['200']);

      (chrome.storage.local.set as any).mockClear();
      store.removeTailPlacementCard('999');
      expect(store.tailPlacementCardIds).toEqual(['200']);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('[covers:is-tail-placement-card.returns-includes-result] returns whether a card id is in the tail placement list', async () => {
      const store = await createLoadedStore();
      store.tailPlacementCardIds = ['100'];

      expect(store.isTailPlacementCard('100')).toBe(true);
      expect(store.isTailPlacementCard('999')).toBe(false);
    });
  });

  describe('reset and public apply functions', () => {
    it('[covers:reset-settings.resets-defaults-applies-and-saves] resets settings to defaults, applies CSS, and saves', async () => {
      const store = await createLoadedStore();
      store.appSettings.theme = 'dark';
      store.featureSettings.chat = true;

      await store.resetSettings();

      expect(store.appSettings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
      expect(store.featureSettings).toEqual(DEFAULT_FEATURE_SETTINGS);
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-ygo-next-theme', 'light');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-deck', `${CARD_SIZE_MAP.large.width}px`);
      expect(mockStorage.appSettings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
    });

    it('[covers:apply-card-size.applies-common-and-deck-sizes] applies common and deck card CSS variables', async () => {
      const store = await createLoadedStore();
      store.appSettings.deckEditCardSize = 'small';
      store.appSettings.infoCardSize = 'medium';
      store.appSettings.gridCardSize = 'large';
      store.appSettings.listCardSize = 'xlarge';

      store.applyCardSize();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-deck', `${CARD_SIZE_MAP.small.width}px`);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-info', `${CARD_SIZE_MAP.medium.width}px`);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-grid', `${CARD_SIZE_MAP.large.width}px`);
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--card-width-list', `${CARD_SIZE_MAP.xlarge.width}px`);
    });
  });
});
