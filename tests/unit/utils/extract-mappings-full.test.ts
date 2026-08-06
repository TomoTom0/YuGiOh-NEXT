/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractMappingsFromSearchPage } from '@/utils/extract-mappings';
import { buildApiUrl } from '@/utils/url-builder';
import { detectCardGameType } from '@/utils/page-detector';

vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'ocg'),
}));

vi.mock('@/utils/url-builder', () => ({
  buildApiUrl: vi.fn((path: string, gameType: string) => `https://mock.test/${gameType}/${path}`),
}));

global.DOMParser = new JSDOM('').window.DOMParser;

function stubFetchHtml(html: string) {
  const text = vi.fn(async () => html);
  const fetchMock = vi.fn(async () => ({ ok: true, statusText: 'OK', text }));
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, text };
}

describe('extractMappingsFromSearchPage - full mapping extraction', () => {
  beforeEach(() => {
    vi.mocked(detectCardGameType).mockReturnValue('rush');
    vi.mocked(buildApiUrl).mockImplementation((path: string, gameType: string) => `https://mock.test/${gameType}/${path}`);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[covers:extract_search.builds_url_with_lang] [covers:extract_search.success_returns_all_maps] [covers:monster_type.valid_item_maps_internal_id] [covers:monster_type.missing_text_value_or_unknown_skipped] [covers:race.valid_item_maps_internal_id] [covers:race.missing_text_value_or_unknown_skipped] [covers:attribute.valid_item_maps_internal_id] [covers:attribute.missing_text_value_or_unknown_skipped] [covers:spell_effect.valid_magic_item_maps_internal_id] [covers:spell_effect.non_magic_or_invalid_skipped] [covers:trap_effect.trap_and_unclassified_items_selected] [covers:trap_effect.magic_or_invalid_skipped] [covers:value_to_id.parse_int_prefix_matches] [covers:value_to_id.no_match_null] returns normalized internal-id mappings from valid HTML', async () => {
    const html = `
      <div id="filter_specis">
        <li><span> Dragon
          Race </span><input name="species" value="1abc"></li>
        <li><span>Unknown Race</span><input name="species" value="999"></li>
        <li><span>    </span><input name="species" value="2"></li>
        <li><input name="species" value="3"></li>
        <li><span>No Species Input</span></li>
      </div>
      <div id="filter_other_monster">
        <li><span> Effect
          Monster </span><input name="other" value="1abc"></li>
        <li><span>Unknown Monster Type</span><input name="other" value="999"></li>
        <li><span>    </span><input name="other" value="2"></li>
        <li><input name="other" value="3"></li>
        <li><span>No Other Input</span></li>
      </div>
      <div id="filter_attribute">
        <li><span> Light
          Attribute </span><input name="attr" value="11abc"></li>
        <li><span>Unknown Attribute</span><input name="attr" value="999"></li>
        <li><span>    </span><input name="attr" value="12"></li>
        <li><input name="attr" value="13"></li>
        <li><span>No Attr Input</span></li>
      </div>
      <div id="filter_effect">
        <li class="f_e_magic"><span> Quick
          Spell </span><input name="effe" value="25abc"></li>
        <li class="f_e_magic"><span>Unknown Spell</span><input name="effe" value="999"></li>
        <li class="f_e_magic"><span>    </span><input name="effe" value="26"></li>
        <li class="f_e_trap"><span> Counter
          Trap </span><input name="effe" value="21abc"></li>
        <li><span> Continuous
          Trap </span><input name="effe" value="24abc"></li>
        <li class="f_e_magic"><span>Normal Spell Only</span><input name="effe" value="20"></li>
        <li class="f_e_trap"><span>Unknown Trap</span><input name="effe" value="999"></li>
      </div>
    `;
    const { fetchMock, text } = stubFetchHtml(html);

    const result = await extractMappingsFromSearchPage('ko');

    expect(detectCardGameType).toHaveBeenCalled();
    expect(buildApiUrl).toHaveBeenCalledWith('card_search.action?ope=1&request_locale=ko', 'rush');
    expect(fetchMock).toHaveBeenCalledWith('https://mock.test/rush/card_search.action?ope=1&request_locale=ko');
    expect(text).toHaveBeenCalled();
    expect(result).toEqual({
      race: { dragon: 'Dragon Race' },
      monsterType: { effect: 'Effect Monster' },
      attribute: { light: 'Light Attribute' },
      spellEffect: { quick: 'Quick Spell', normal: 'Normal Spell Only' },
      trapEffect: { counter: 'Counter Trap', continuous: 'Continuous Trap' },
    });
  });

  it('[covers:extract_search.response_not_ok_null] returns null without reading the body when fetch response is not ok', async () => {
    const text = vi.fn(async () => '<div id="filter_specis"></div>');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, statusText: 'Bad Request', text })));

    await expect(extractMappingsFromSearchPage('en')).resolves.toBeNull();

    expect(text).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Bad Request'));
  });
});
