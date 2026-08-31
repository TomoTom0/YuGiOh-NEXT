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
    it('[covers:load_settings.loads_common_then_deck_edit] [covers:load_common.no_saved_settings_uses_defaults_and_default_tail] [covers:load_deck_edit.applies_deck_edit_card_size] loads defaults and applies common/deck CSS', async () => {
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

    it('[covers:load_common.saved_nonempty_tail_ids_are_kept] keeps stored non-empty tail placement ids', async () => {
      mockStorage.tailPlacementCardIds = ['1', '2'];
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.tailPlacementCardIds).toEqual(['1', '2']);
    });

    it('[covers:load_common.empty_or_invalid_tail_ids_use_default_tail] falls back to default tail placement ids for empty or invalid stored values', async () => {
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

    it('[covers:load_common.migrates_toggle_and_deletes_ai_text_links] migrates removed and renamed old settings keys', async () => {
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

    it('[covers:load_common.migrates_legacy_ux_when_ux_missing] migrates top-level legacy UX keys only when ux is missing', async () => {
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

    it('[covers:load_common.existing_ux_skips_legacy_ux_migration] does not move legacy UX keys when ux already exists', async () => {
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

    it('[covers:load_common.deep_merge_skips_null_undefined_and_empty_arrays] merges saved values using the store deepMerge rules', async () => {
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

    it('[covers:load_common.genesys_stored_artifact_overridden_by_default] 旧prodビルドが永続化したgenesys=false（category 3強制OFFのアーティファクト）はDEFAULT値で上書きされる', async () => {
      mockStorage.featureSettings = {
        genesys: false,
      };
      const store = useSettingsStore();

      await store.loadCommonSettings();

      expect(store.featureSettings.genesys).toBe(DEFAULT_FEATURE_SETTINGS.genesys);
      expect(store.featureSettings.genesys).toBe(true);
    });

    it('[covers:load_common.storage_get_throw_rejects] rejects when chrome.storage.local.get throws synchronously', async () => {
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
    it('[covers:save_settings.persists_storage_and_cache] saves settings to chrome storage, localStorage, and window cache', async () => {
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

    it('[covers:save_settings.local_storage_failure_still_resolves] resolves and warns when the localStorage cache update fails', async () => {
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

    it('[covers:save_settings.storage_set_throw_rejects] rejects when chrome.storage.local.set throws synchronously', async () => {
      const store = await createLoadedStore();
      (chrome.storage.local.set as any).mockImplementation(() => {
        throw new Error('Failed to save settings');
      });

      await expect(store.saveSettings()).rejects.toThrow('Failed to save settings');
    });
  });

  describe('card sizes', () => {
    it('[covers:set_deck_edit_card_size.updates_applies_saves] [covers:set_info_card_size.updates_applies_saves] [covers:set_grid_card_size.updates_applies_saves] [covers:set_list_card_size.updates_applies_saves] updates individual card sizes, applies CSS, and saves', async () => {
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

    it('[covers:set_practice_card_size.updates_saves_without_css_apply] [covers:set_practice_card_size_2p.updates_saves_without_css_apply] updates practice card sizes and saves', async () => {
      const store = await createLoadedStore();

      store.setPracticeCardSize('large');
      store.setPracticeCardSize2P('xlarge');

      expect(store.appSettings.practiceCardSize).toBe('large');
      expect(store.appSettings.practiceCardSize2P).toBe('xlarge');
      expect(mockStorage.appSettings.practiceCardSize).toBe('large');
      expect(mockStorage.appSettings.practiceCardSize2P).toBe('xlarge');
      expect(document.documentElement.style.setProperty).not.toHaveBeenCalled();
    });

    it('[covers:set_card_size_preset.xl_mapping] [covers:set_card_size_preset.l_mapping] [covers:set_card_size_preset.m_mapping] [covers:set_card_size_preset.s_mapping] applies all preset mappings', async () => {
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

    it('[covers:get_current_preset.returns_xl_l_m_s_or_null] returns the matching preset or null', async () => {
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

    it('[covers:set_card_width.list_mode_updates_list_css] [covers:set_card_width.grid_mode_updates_grid_css] sets direct list/grid widths and calculated heights', async () => {
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
    it('[covers:set_theme.updates_applies_saves] [covers:apply_theme.uses_effective_theme_direct_or_system] applies direct, system dark, and system fallback themes', async () => {
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

    it('[covers:set_language.auto_skips_mapping_ensure] [covers:set_language.non_auto_ensures_mapping_async] updates language and only ensures mappings for non-auto languages', async () => {
      const store = await createLoadedStore();

      store.setLanguage('auto');
      expect(store.appSettings.language).toBe('auto');
      expect(ensureMappingForLanguageMock).not.toHaveBeenCalled();

      store.setLanguage('en');
      expect(store.appSettings.language).toBe('en');
      expect(mockStorage.appSettings.language).toBe('en');
      expect(ensureMappingForLanguageMock).toHaveBeenCalledWith('en');
    });

    it('[covers:set_language.mapping_ensure_rejection_is_logged] logs mapping ensure rejections', async () => {
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
    it('[covers:set_middle_decks_layout.updates_saves] [covers:set_card_list_view_mode.updates_section_saves] [covers:set_mouse_operations.updates_saves] [covers:set_change_favicon.updates_saves] [covers:set_search_input_position.updates_saves] [covers:set_default_search_mode.updates_saves] [covers:set_include_timestamp_in_export_filename.updates_saves] [covers:set_show_card_detail_in_deck_display.updates_saves] [covers:set_deck_display_card_image_size.updates_saves] [covers:set_background_deck_info_fetch.updates_saves] [covers:set_update_thumbnail_without_fetch.updates_saves] updates scalar and nested settings and saves them', async () => {
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

    it('[covers:toggle_feature.updates_dynamic_key_saves] writes dynamic feature keys and saves', async () => {
      const store = await createLoadedStore();

      store.toggleFeature('testFeature', true);
      expect(store.featureSettings.testFeature).toBe(true);
      expect(mockStorage.featureSettings.testFeature).toBe(true);

      store.toggleFeature('testFeature', false);
      expect(store.featureSettings.testFeature).toBe(false);
    });
  });

  describe('right area and font CSS', () => {
    it('[covers:set_right_area_width.updates_applies_saves] [covers:apply_right_area_styles.max_fit_sets_flexible_vars] applies MAX-FIT right area CSS variables', async () => {
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

    it('[covers:set_right_area_font_size.updates_applies_saves] [covers:apply_right_area_styles.fixed_width_sets_fixed_vars] applies fixed right area CSS variables and font size', async () => {
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

    it('[covers:set_dialog_font_size.updates_applies_saves] [covers:set_search_ui_font_size.updates_applies_saves] [covers:apply_font_sizes.maps_dialog_and_search_ui] maps dialog and search UI font sizes to CSS variables', async () => {
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

    it('[covers:add_keyboard_shortcut.below_limit_pushes_and_saves] adds shortcuts while below the limit', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [];

      store.addKeyboardShortcut('globalSearch', shortcut('1'));

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
      expect(mockStorage.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
    });

    it('[covers:add_keyboard_shortcut.limit_reached_warns_and_returns] warns and skips save at the shortcut limit', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1'), shortcut('2'), shortcut('3')];
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      store.addKeyboardShortcut('globalSearch', shortcut('4'));

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('2'), shortcut('3')]);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[Settings] Cannot add more than 3 shortcuts for globalSearch');
    });

    it('[covers:remove_keyboard_shortcut.valid_index_splices_and_saves] removes a shortcut at a valid index', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1'), shortcut('2'), shortcut('3')];

      store.removeKeyboardShortcut('globalSearch', 1);

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('3')]);
      expect(mockStorage.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1'), shortcut('3')]);
    });

    it('[covers:remove_keyboard_shortcut.invalid_index_is_noop] ignores invalid shortcut indexes without saving', async () => {
      const store = await createLoadedStore();
      store.appSettings.ux.keyboardShortcuts.globalSearch = [shortcut('1')];

      store.removeKeyboardShortcut('globalSearch', -1);
      store.removeKeyboardShortcut('globalSearch', 1);

      expect(store.appSettings.ux.keyboardShortcuts.globalSearch).toEqual([shortcut('1')]);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('tail placement cards', () => {
    it('[covers:add_tail_placement_card.absent_pushes_and_saves] [covers:add_tail_placement_card.duplicate_is_noop] adds missing tail placement cards and ignores duplicates', async () => {
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

    it('[covers:remove_tail_placement_card.present_splices_and_saves] [covers:remove_tail_placement_card.missing_is_noop] removes present tail placement cards and ignores missing ids', async () => {
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

    it('[covers:is_tail_placement_card.returns_includes_result] returns whether a card id is in the tail placement list', async () => {
      const store = await createLoadedStore();
      store.tailPlacementCardIds = ['100'];

      expect(store.isTailPlacementCard('100')).toBe(true);
      expect(store.isTailPlacementCard('999')).toBe(false);
    });
  });

  describe('reset and public apply functions', () => {
    it('[covers:reset_settings.resets_defaults_applies_and_saves] resets settings to defaults, applies CSS, and saves', async () => {
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

    it('[covers:apply_card_size.applies_common_and_deck_sizes] applies common and deck card CSS variables', async () => {
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
