import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildApiUrl,
  buildFullUrl,
  getCardSearchEndpoint,
  getCardSearchFormUrl,
  getDeckApiEndpoint,
  getDeckDisplayUrl,
  getDeckSearchPageUrl,
  getFaqSearchEndpoint,
  getForbiddenLimitedEndpoint,
  getGenesysIndexUrl,
  getGenesysListUrl,
  getImagePartsBaseUrl,
  getVueEditUrl
} from '@/utils/url-builder';
import { detectLanguage } from '@/utils/language-detector';

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja')
}));

const detectLanguageMock = vi.mocked(detectLanguage);

function parseUrl(url: string): URL {
  return new URL(url);
}

function parseHashParams(url: string): URLSearchParams {
  const hash = parseUrl(url).hash;
  const queryIndex = hash.indexOf('?');
  return new URLSearchParams(queryIndex === -1 ? '' : hash.slice(queryIndex + 1));
}

describe('url-builder: buildApiUrl()', () => {
  beforeEach(() => {
    detectLanguageMock.mockClear();
    detectLanguageMock.mockReturnValue('ja');
  });

  describe('getApiPathType() の判定ロジック', () => {
    it('[covers:api_path.card_search] card_search を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('card_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/card_search.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api_path.faq_search] faq_search をFAQ APIとして扱い request_locale=ja を付与する', () => {
      detectLanguageMock.mockReturnValue('en');

      const url = parseUrl(buildApiUrl('faq_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/faq_search.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:api_path.get_image] get_image を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('get_image.action?id=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/get_image.action');
      expect(url.searchParams.get('id')).toBe('test');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api_path.member_deck_ope6] ope=6 の member_deck では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=6&wname=MemberDeck&cgid=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('6');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api_path.member_deck_ope4] ope=4 の member_deck では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=4&cgid=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('4');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api_path.member_deck_other] ope=6/ope=4 以外の member_deck では request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=1&dno=123', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('1');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api_path.forbidden_limited] forbidden_limited を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('forbidden_limited.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/forbidden_limited.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api_path.deck_search] deck_search では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('deck_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/deck_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api_path.other] 既知パターン以外は通常APIとして request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('custom.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/custom.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });
  });

  describe('request_locale とパラメータの処理', () => {
    it('[covers:build_api.params_merge_overwrites] URLSearchParams を既存クエリへ set でマージする', () => {
      const params = new URLSearchParams();
      params.set('cgid', 'test-cgid');
      params.set('dno', '123');

      const url = parseUrl(buildApiUrl('member_deck.action?ope=1&dno=old', 'ocg', params));

      expect(url.searchParams.get('ope')).toBe('1');
      expect(url.searchParams.get('cgid')).toBe('test-cgid');
      expect(url.searchParams.get('dno')).toBe('123');
      expect(url.searchParams.getAll('dno')).toEqual(['123']);
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:build_api.no_locale_flag_deletes_locale] noLocale=true では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('card_search.action?request_locale=en', 'ocg', undefined, true));

      expect(url.pathname).toBe('/yugiohdb/card_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build_api.member_deck_new_deletes_locale] member_deck_new では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=6&request_locale=en', 'ocg'));

      expect(url.searchParams.get('ope')).toBe('6');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:build_api.deck_search_deletes_locale] deck_search では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('deck_search.action?request_locale=en', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/deck_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:build_api.existing_locale_retained] request_locale が既にある通常APIでは既存値を保持する', () => {
      const url = parseUrl(buildApiUrl('card_search.action?request_locale=en', 'ocg'));

      expect(url.searchParams.get('request_locale')).toBe('en');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build_api.faq_forces_ja] FAQでは検出言語ではなく ja を設定する', () => {
      detectLanguageMock.mockReturnValue('en');

      const url = parseUrl(buildApiUrl('faq_search.action', 'ocg'));

      expect(url.searchParams.get('request_locale')).toBe('ja');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build_api.other_uses_detected_language] FAQ以外の付与対象APIでは detectLanguage(document) を使う', () => {
      detectLanguageMock.mockReturnValue('en');

      const url = parseUrl(buildApiUrl('custom.action', 'rush'));

      expect(url.pathname).toBe('/rushdb/custom.action');
      expect(url.searchParams.get('request_locale')).toBe('en');
      expect(detectLanguageMock).toHaveBeenCalledWith(document);
    });
  });
});

describe('url-builder: exported helpers', () => {
  beforeEach(() => {
    detectLanguageMock.mockClear();
    detectLanguageMock.mockReturnValue('ja');
  });

  it('[covers:build_full.absolute_http_returned] http で始まるURLはそのまま返す', () => {
    expect(buildFullUrl('https://example.test/image.png')).toBe('https://example.test/image.png');
  });

  it('[covers:build_full.relative_prefixed] 相対パスは BASE_URL と単純連結する', () => {
    expect(buildFullUrl('card_search.action')).toBe('https://www.db.yugioh-card.comcard_search.action');
    expect(buildFullUrl('/yugiohdb/card_search.action')).toBe('https://www.db.yugioh-card.com/yugiohdb/card_search.action');
  });

  it('[covers:deck_api_endpoint.delegates_member_deck] getDeckApiEndpoint は member_deck.action のURLを返す', () => {
    const url = parseUrl(getDeckApiEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/member_deck.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:card_search_endpoint.delegates_card_search] getCardSearchEndpoint はカード検索APIのURLを返す', () => {
    const url = parseUrl(getCardSearchEndpoint('rush'));

    expect(url.pathname).toBe('/rushdb/card_search.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:faq_search_endpoint.delegates_faq_search] getFaqSearchEndpoint はFAQ検索APIのURLを返す', () => {
    const url = parseUrl(getFaqSearchEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/faq_search.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:deck_search_page.default_locale_removed] getDeckSearchPageUrl はデフォルトlocaleを最終URLから削除する', () => {
    const url = parseUrl(getDeckSearchPageUrl('ocg'));

    expect(url.pathname).toBe('/yugiohdb/deck_search.action');
    expect(url.searchParams.has('request_locale')).toBe(false);
  });

  it('[covers:deck_search_page.explicit_locale_removed] getDeckSearchPageUrl は指定localeも最終URLから削除する', () => {
    const url = parseUrl(getDeckSearchPageUrl('ocg', 'en'));

    expect(url.pathname).toBe('/yugiohdb/deck_search.action');
    expect(url.searchParams.has('request_locale')).toBe(false);
  });

  it('[covers:card_search_form.delegates_card_search_ope1] getCardSearchFormUrl は ope=1 のカード検索URLを返す', () => {
    const url = parseUrl(getCardSearchFormUrl('ocg'));

    expect(url.pathname).toBe('/yugiohdb/card_search.action');
    expect(url.searchParams.get('ope')).toBe('1');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:image_parts_base.uses_game_path] getImagePartsBaseUrl はゲーム種別に対応する画像パーツベースURLを返す', () => {
    expect(getImagePartsBaseUrl('rush')).toBe('https://www.db.yugioh-card.com/rushdb/external/image/parts');
  });

  it('[covers:vue_edit.no_params] getVueEditUrl は引数省略時にクエリなしの編集ハッシュURLを返す', () => {
    expect(getVueEditUrl('ocg')).toBe('https://www.db.yugioh-card.com/yugiohdb#/ytomo/edit');
  });

  it('[covers:vue_edit.locale_pre_hash] locale はハッシュ前 request_locale へ追加される', () => {
    const url = parseUrl(getVueEditUrl('ocg', undefined, 'ja'));

    expect(url.searchParams.get('request_locale')).toBe('ja');
    expect(url.hash).toBe('#/ytomo/edit');
  });

  it('[covers:vue_edit.dno_post_hash] dno はハッシュ後クエリへ追加される', () => {
    const url = getVueEditUrl('ocg', 1);

    expect(parseUrl(url).searchParams.has('dno')).toBe(false);
    expect(parseHashParams(url).get('dno')).toBe('1');
  });

  it('[covers:vue_edit.zero_dno_omitted] dno=0 は falsy として省略される', () => {
    const url = getVueEditUrl('ocg', 0);

    expect(parseHashParams(url).has('dno')).toBe(false);
    expect(url).toBe('https://www.db.yugioh-card.com/yugiohdb#/ytomo/edit');
  });

  it('[covers:vue_edit.additional_params_appended] additionalParams はハッシュ後クエリへ append される', () => {
    const params = new URLSearchParams({
      'copy-from-cgid': 'abc',
      'copy-from-dno': '2'
    });
    const url = getVueEditUrl('rush', undefined, 'en', params);
    const hashParams = parseHashParams(url);

    expect(parseUrl(url).pathname).toBe('/rushdb');
    expect(parseUrl(url).searchParams.get('request_locale')).toBe('en');
    expect(hashParams.get('copy-from-cgid')).toBe('abc');
    expect(hashParams.get('copy-from-dno')).toBe('2');
  });

  it('[covers:deck_display.delegates_member_deck_ope1] getDeckDisplayUrl は ope=1/cgid/dno を持つ表示URLを返す', () => {
    const url = parseUrl(getDeckDisplayUrl('cgid-1', 7, 'ocg'));

    expect(url.pathname).toBe('/yugiohdb/member_deck.action');
    expect(url.searchParams.get('ope')).toBe('1');
    expect(url.searchParams.get('cgid')).toBe('cgid-1');
    expect(url.searchParams.get('dno')).toBe('7');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:forbidden_limited.no_effective_date] getForbiddenLimitedEndpoint は日付省略時 forbiddenLimitedDate を付与しない', () => {
    const url = parseUrl(getForbiddenLimitedEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/forbidden_limited.action');
    expect(url.searchParams.has('forbiddenLimitedDate')).toBe(false);
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:forbidden_limited.with_effective_date] getForbiddenLimitedEndpoint は日付指定時 forbiddenLimitedDate を付与する', () => {
    const url = parseUrl(getForbiddenLimitedEndpoint('ocg', '2026-04-01'));

    expect(url.searchParams.get('forbiddenLimitedDate')).toBe('2026-04-01');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:genesys_index.constant_url] getGenesysIndexUrl はGENESYSベースURLを返す', () => {
    expect(getGenesysIndexUrl()).toBe('https://www.yugioh-card.com/japan/howto/genesys/');
  });

  it('[covers:genesys_list.list_query] getGenesysListUrl はlistクエリを単純連結する', () => {
    expect(getGenesysListUrl('202606')).toBe('https://www.yugioh-card.com/japan/howto/genesys/?list=202606');
  });
});
