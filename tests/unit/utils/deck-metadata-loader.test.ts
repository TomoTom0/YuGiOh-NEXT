import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeckMetadata } from '@/utils/deck-metadata-loader';

const STORAGE_KEY = 'deck_metadata';

type LoaderModule = typeof import('@/utils/deck-metadata-loader');

const sampleMetadata = (lastUpdated = '2025-12-04T12:00:00.000Z'): DeckMetadata => ({
  deckTypes: [{ value: 'type1', label: 'Type 1' }],
  deckStyles: [{ value: 'style1', label: 'Style 1' }],
  categories: [{ value: 'cat1', label: 'Category 1' }],
  tags: { tag1: 'Tag 1' },
  lastUpdated
});

const importLoader = async (): Promise<LoaderModule> => {
  return await import('@/utils/deck-metadata-loader');
};

const installChromeStorage = (
  initialStorage: Record<string, unknown> = {},
  overrides: Partial<{
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  }> = {}
) => {
  const storage = { ...initialStorage };
  const get = overrides.get ?? vi.fn((key: string) => Promise.resolve({ [key]: storage[key] }));
  const set =
    overrides.set ??
    vi.fn((items: Record<string, unknown>) => {
      Object.assign(storage, items);
      return Promise.resolve();
    });

  (globalThis as any).chrome = {
    storage: {
      local: {
        get,
        set
      }
    }
  };

  return { storage, get, set };
};

const mockSearchUrl = (url = 'https://example.test/deck-search') => {
  const getDeckSearchPageUrl = vi.fn(() => url);
  vi.doMock('@/utils/url-builder', () => ({
    getDeckSearchPageUrl
  }));
  return { url, getDeckSearchPageUrl };
};

const mockFetchHtml = (html: string) => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      text: () => Promise.resolve(html)
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('utils/deck-metadata-loader', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock('@/data/deck-metadata.json');
    vi.doUnmock('@/utils/url-builder');
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete (globalThis as any).chrome;
  });

  describe('getDeckMetadata', () => {
    it('[covers:stored_metadata.chrome_unavailable_null] falls back to bundled metadata when chrome is unavailable', async () => {
      delete (globalThis as any).chrome;
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(metadata.tags).toBeDefined();
      expect(Array.isArray(metadata.deckTypes)).toBe(true);
      expect(Array.isArray(metadata.deckStyles)).toBe(true);
      expect(Array.isArray(metadata.categories)).toBe(true);
    });

    it('[covers:stored_metadata.storage_missing_null] falls back to bundled metadata when storage has no metadata key', async () => {
      const { get } = installChromeStorage();
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(get).toHaveBeenCalledWith(STORAGE_KEY);
      expect(Array.isArray(metadata.categories)).toBe(true);
      expect(metadata).not.toHaveProperty('deck_metadata');
    });

    it('[covers:stored_metadata.get_error_null] swallows storage get errors and falls back to bundled metadata', async () => {
      const get = vi.fn(() => Promise.reject(new Error('load failed')));
      installChromeStorage({}, { get });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(get).toHaveBeenCalledWith(STORAGE_KEY);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load metadata from chrome.storage:',
        expect.any(Error)
      );
      expect(Array.isArray(metadata.categories)).toBe(true);
    });

    it('[covers:stored_metadata.storage_value_returns] [covers:get_metadata.stored_preferred] returns stored metadata before bundled metadata', async () => {
      const stored = sampleMetadata('2026-01-01T00:00:00.000Z');
      installChromeStorage({ [STORAGE_KEY]: stored });
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(metadata).toBe(stored);
    });

    it('[covers:get_metadata.cached_returns_without_storage] returns the in-memory cache without reading changed storage', async () => {
      const first = sampleMetadata('2026-01-01T00:00:00.000Z');
      const second = sampleMetadata('2026-01-02T00:00:00.000Z');
      const { storage, get } = installChromeStorage({ [STORAGE_KEY]: first });
      const { getDeckMetadata } = await importLoader();

      const metadata1 = await getDeckMetadata();
      storage[STORAGE_KEY] = second;
      const metadata2 = await getDeckMetadata();

      expect(metadata1).toBe(first);
      expect(metadata2).toBe(first);
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('[covers:get_metadata.initial_array_categories_preserved] returns bundled array categories as an array', async () => {
      delete (globalThis as any).chrome;
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(Array.isArray(metadata.categories)).toBe(true);
      expect(metadata.categories[0]).toHaveProperty('value');
      expect(metadata.categories[0]).toHaveProperty('label');
    });

    it('[covers:get_metadata.initial_record_categories_converted] converts bundled record categories through assignCategoryGroups', async () => {
      delete (globalThis as any).chrome;
      vi.doMock('@/data/deck-metadata.json', () => ({
        default: {
          deckTypes: [],
          deckStyles: [],
          categories: {
            cat1: 'Category 1'
          },
          tags: {},
          lastUpdated: '2026-01-01T00:00:00.000Z'
        }
      }));
      const { getDeckMetadata } = await importLoader();

      const metadata = await getDeckMetadata();

      expect(metadata.categories).toEqual([
        expect.objectContaining({ value: 'cat1', label: 'Category 1' })
      ]);
    });
  });

  describe('saveDeckMetadata', () => {
    it('[covers:save_metadata.chrome_unavailable_returns] returns without throwing when chrome storage is unavailable', async () => {
      delete (globalThis as any).chrome;
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { saveDeckMetadata } = await importLoader();

      await expect(saveDeckMetadata(sampleMetadata())).resolves.toBeUndefined();

      expect(consoleWarn).toHaveBeenCalledWith('chrome.storage is not available');
    });

    it('[covers:save_metadata.success_sets_storage_and_cache] stores metadata and updates the in-memory cache', async () => {
      const { storage, set, get } = installChromeStorage();
      const metadata = sampleMetadata();
      const { saveDeckMetadata, getDeckMetadata } = await importLoader();

      await saveDeckMetadata(metadata);
      const cached = await getDeckMetadata();

      expect(set).toHaveBeenCalledWith({ [STORAGE_KEY]: metadata });
      expect(storage[STORAGE_KEY]).toBe(metadata);
      expect(cached).toBe(metadata);
      expect(get).not.toHaveBeenCalled();
    });

    it('[covers:save_metadata.set_error_rethrows] rethrows chrome storage set errors', async () => {
      const saveError = new Error('Save failed');
      installChromeStorage({}, { set: vi.fn(() => Promise.reject(saveError)) });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { saveDeckMetadata } = await importLoader();

      await expect(saveDeckMetadata(sampleMetadata())).rejects.toBe(saveError);

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save metadata to chrome.storage:',
        saveError
      );
    });
  });

  describe('updateDeckMetadata', () => {
    it('[covers:update_metadata.default_game_type_ocg] fetches the Japanese OCG search URL when gameType is omitted', async () => {
      installChromeStorage();
      const { url, getDeckSearchPageUrl } = mockSearchUrl();
      const fetchMock = mockFetchHtml('<html></html>');
      const { updateDeckMetadata } = await importLoader();

      await updateDeckMetadata();

      expect(getDeckSearchPageUrl).toHaveBeenCalledWith('ocg', 'ja');
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('[covers:update_metadata.deck_types_filters] [covers:update_metadata.deck_styles_filters] extracts only valid deck type and style inputs', async () => {
      installChromeStorage();
      mockSearchUrl();
      mockFetchHtml(`
        <input id="dt1" name="deck_type" value="type1"><label for="dt1"> Type 1 </label>
        <input id="dt2" name="deck_type" value="type2"><label for="dt2">-----</label>
        <input id="dt3" name="deck_type" value="type3">
        <input id="dt4" name="deck_type"><label for="dt4">No Value</label>
        <input id="ds1" name="deckStyle" value="style1"><label for="ds1"> Style 1 </label>
        <input id="ds2" name="deckStyle" value="style2"><label for="ds2">----</label>
        <input id="ds3" name="deckStyle" value="-1"><label for="ds3">Ignore Minus One</label>
        <input id="ds4" name="deckStyle"><label for="ds4">No Value</label>
      `);
      const { updateDeckMetadata } = await importLoader();

      const metadata = await updateDeckMetadata('rd');

      expect(metadata.deckTypes).toEqual([{ value: 'type1', label: 'Type 1' }]);
      expect(metadata.deckStyles).toEqual([{ value: 'style1', label: 'Style 1' }]);
    });

    it('[covers:update_metadata.categories_select_absent_empty] [covers:extract_options.no_select_empty] returns empty categories and tags when selects are absent', async () => {
      installChromeStorage();
      mockSearchUrl();
      mockFetchHtml('<html></html>');
      const { updateDeckMetadata } = await importLoader();

      const metadata = await updateDeckMetadata();

      expect(metadata.categories).toEqual([]);
      expect(metadata.tags).toEqual({});
    });

    it('[covers:update_metadata.categories_filters_and_groups] [covers:update_metadata.tags_from_helper] [covers:extract_options.includes_valid_options] [covers:extract_options.filters_empty_excluded_or_no_value] extracts valid categories and tags only', async () => {
      installChromeStorage();
      mockSearchUrl();
      mockFetchHtml(`
        <select name="dckCategoryMst">
          <option value="cat1"> Category 1 </option>
          <option value="cat2">------------</option>
          <option value="cat3">   </option>
          <option>Missing Value</option>
        </select>
        <select name="dckTagMst">
          <option value="tag1"> Tag 1 </option>
          <option value="tag2">------------</option>
          <option value="tag3">   </option>
          <option>No Value</option>
        </select>
      `);
      const { updateDeckMetadata } = await importLoader();

      const metadata = await updateDeckMetadata();

      expect(metadata.categories).toEqual([
        expect.objectContaining({ value: 'cat1', label: 'Category 1' })
      ]);
      expect(metadata.tags).toEqual({ tag1: 'Tag 1' });
    });

    it('[covers:update_metadata_saves_and_returns] saves and returns extracted metadata with an ISO timestamp', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T03:04:05.000Z'));
      const { storage, set } = installChromeStorage();
      mockSearchUrl();
      mockFetchHtml(`
        <input id="dt1" name="deck_type" value="type1"><label for="dt1">Type 1</label>
        <input id="ds1" name="deckStyle" value="style1"><label for="ds1">Style 1</label>
        <select name="dckCategoryMst"><option value="cat1">Category 1</option></select>
        <select name="dckTagMst"><option value="tag1">Tag 1</option></select>
      `);
      const { updateDeckMetadata } = await importLoader();

      const metadata = await updateDeckMetadata();

      expect(metadata.lastUpdated).toBe('2026-08-06T03:04:05.000Z');
      expect(set).toHaveBeenCalledWith({ [STORAGE_KEY]: metadata });
      expect(storage[STORAGE_KEY]).toBe(metadata);
    });

    it('[covers:update_metadata_error_rethrows] rethrows fetch errors', async () => {
      installChromeStorage();
      mockSearchUrl();
      const fetchError = new Error('network failed');
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(fetchError)));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { updateDeckMetadata } = await importLoader();

      await expect(updateDeckMetadata()).rejects.toBe(fetchError);

      expect(consoleError).toHaveBeenCalledWith('Failed to update deck metadata:', fetchError);
    });
  });
});
