/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractMappingsFromSearchPage } from '@/utils/extract-mappings';

vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'ocg'),
}));

vi.mock('@/utils/url-builder', () => ({
  buildApiUrl: vi.fn(() => 'https://mock.test/card_search.action'),
}));

global.DOMParser = new JSDOM('').window.DOMParser;

function stubFetchHtml(html: string) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    statusText: 'OK',
    text: vi.fn(async () => html),
  })));
}

describe('extractMappingsFromSearchPage - empty and error paths', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[covers:extract_search.empty_race_null] [covers:race.no_species_filter_empty] [covers:attribute.no_filter_empty] returns null when the species and attribute filters are absent', async () => {
    stubFetchHtml(`
      <div id="filter_other_monster">
        <li><span>Effect</span><input name="other" value="1"></li>
      </div>
    `);

    await expect(extractMappingsFromSearchPage('ko')).resolves.toBeNull();

    expect(console.warn).toHaveBeenCalledWith('[extractRaceMapping] Species filter element not found');
    expect(console.warn).toHaveBeenCalledWith('[extractAttributeMapping] Attribute filter element not found');
    expect(console.warn).toHaveBeenCalledWith('[extractMappingsFromSearchPage] Race mappings seem empty for ko');
  });

  it('[covers:extract_search.empty_race_null] [covers:race.no_list_items_empty] returns null when the species filter has no list items', async () => {
    stubFetchHtml('<div id="filter_specis"></div>');

    await expect(extractMappingsFromSearchPage('en')).resolves.toBeNull();

    expect(console.warn).toHaveBeenCalledWith('[extractRaceMapping] No list items found in species filter');
    expect(console.warn).toHaveBeenCalledWith('[extractMappingsFromSearchPage] Race mappings seem empty for en');
  });

  it('[covers:extract_search.catch_returns_null] returns null when fetch rejects', async () => {
    const error = new Error('network down');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw error;
    }));

    await expect(extractMappingsFromSearchPage('en')).resolves.toBeNull();

    expect(console.error).toHaveBeenCalledWith('[extractMappingsFromSearchPage] Error:', error);
  });
});
