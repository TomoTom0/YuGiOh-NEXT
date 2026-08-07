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

describe('extractMappingsFromSearchPage - monster type selector behavior', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[covers:monster_type.no_other_input_filter_skipped] [covers:monster_type.valid_item_maps_internal_id] extracts monster types from input[name="other"] even when h3 text is not English', async () => {
    stubFetchHtml(`
      <div id="filter_specis">
        <li><span>Dragon</span><input name="species" value="1"></li>
      </div>
      <div id="filter_other_decoy">
        <h3>Card Type</h3>
        <li><span>Should Be Ignored</span><input name="species" value="15"></li>
      </div>
      <div id="filter_other_real">
        <h3>카드 종류</h3>
        <li><span>Effect</span><input name="other" value="1"></li>
      </div>
    `);

    const result = await extractMappingsFromSearchPage('ko');

    expect(result?.monsterType).toEqual({ effect: 'Effect' });
  });
});
