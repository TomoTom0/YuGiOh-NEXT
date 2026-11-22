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
    it('[covers:api-path.card-search] card_search を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('card_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/card_search.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api-path.faq-search] faq_search をFAQ APIとして扱い request_locale=ja を付与する', () => {
      detectLanguageMock.mockReturnValue('en');

      const url = parseUrl(buildApiUrl('faq_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/faq_search.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:api-path.get-image] get_image を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('get_image.action?id=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/get_image.action');
      expect(url.searchParams.get('id')).toBe('test');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api-path.member-deck-ope6] ope=6 の member_deck では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=6&wname=MemberDeck&cgid=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('6');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api-path.member-deck-ope4] ope=4 の member_deck では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=4&cgid=test', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('4');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api-path.member-deck-other] ope=6/ope=4 以外の member_deck では request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=1&dno=123', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/member_deck.action');
      expect(url.searchParams.get('ope')).toBe('1');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api-path.forbidden-limited] forbidden_limited を通常APIとして扱い request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('forbidden_limited.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/forbidden_limited.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });

    it('[covers:api-path.deck-search] deck_search では request_locale を付与しない', () => {
      const url = parseUrl(buildApiUrl('deck_search.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/deck_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:api-path.other] 既知パターン以外は通常APIとして request_locale を付与する', () => {
      const url = parseUrl(buildApiUrl('custom.action', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/custom.action');
      expect(url.searchParams.get('request_locale')).toBe('ja');
    });
  });

  describe('request_locale とパラメータの処理', () => {
    it('[covers:build-api.params-merge-overwrites] URLSearchParams を既存クエリへ set でマージする', () => {
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

    it('[covers:build-api.params-merge-preserves-duplicates] 同名キーが複数ある場合、setで上書きせず全ての値を保持する', () => {
      // TASK-373: モンスタータイプ(other=6&other=9等)のような複数選択パラメータが
      // 最後の1つ以外消えてしまい、AND/OR絞り込みが常にOR相当になってしまっていたバグの回帰テスト
      const params = new URLSearchParams();
      params.append('other', '6');
      params.append('other', '9');
      params.append('othercon', '1');

      const url = parseUrl(buildApiUrl('card_search.action', 'ocg', params));

      expect(url.searchParams.getAll('other')).toEqual(['6', '9']);
      expect(url.searchParams.get('othercon')).toBe('1');
    });

    it('[covers:build-api.no-locale-flag-deletes-locale] noLocale=true では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('card_search.action?request_locale=en', 'ocg', undefined, true));

      expect(url.pathname).toBe('/yugiohdb/card_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build-api.member-deck-new-deletes-locale] member_deck_new では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('member_deck.action?ope=6&request_locale=en', 'ocg'));

      expect(url.searchParams.get('ope')).toBe('6');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:build-api.deck-search-deletes-locale] deck_search では既存 request_locale も削除する', () => {
      const url = parseUrl(buildApiUrl('deck_search.action?request_locale=en', 'ocg'));

      expect(url.pathname).toBe('/yugiohdb/deck_search.action');
      expect(url.searchParams.has('request_locale')).toBe(false);
    });

    it('[covers:build-api.existing-locale-retained] request_locale が既にある通常APIでは既存値を保持する', () => {
      const url = parseUrl(buildApiUrl('card_search.action?request_locale=en', 'ocg'));

      expect(url.searchParams.get('request_locale')).toBe('en');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build-api.faq-forces-ja] FAQでは検出言語ではなく ja を設定する', () => {
      detectLanguageMock.mockReturnValue('en');

      const url = parseUrl(buildApiUrl('faq_search.action', 'ocg'));

      expect(url.searchParams.get('request_locale')).toBe('ja');
      expect(detectLanguageMock).not.toHaveBeenCalled();
    });

    it('[covers:build-api.other-uses-detected-language] FAQ以外の付与対象APIでは detectLanguage(document) を使う', () => {
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

  it('[covers:build-full.absolute-http-returned] http で始まるURLはそのまま返す', () => {
    expect(buildFullUrl('https://example.test/image.png')).toBe('https://example.test/image.png');
  });

  it('[covers:build-full.relative-prefixed] 相対パスは BASE_URL と単純連結する', () => {
    expect(buildFullUrl('card_search.action')).toBe('https://www.db.yugioh-card.comcard_search.action');
    expect(buildFullUrl('/yugiohdb/card_search.action')).toBe('https://www.db.yugioh-card.com/yugiohdb/card_search.action');
  });

  it('[covers:deck-api-endpoint.delegates-member-deck] getDeckApiEndpoint は member_deck.action のURLを返す', () => {
    const url = parseUrl(getDeckApiEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/member_deck.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:card-search-endpoint.delegates-card-search] getCardSearchEndpoint はカード検索APIのURLを返す', () => {
    const url = parseUrl(getCardSearchEndpoint('rush'));

    expect(url.pathname).toBe('/rushdb/card_search.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:faq-search-endpoint.delegates-faq-search] getFaqSearchEndpoint はFAQ検索APIのURLを返す', () => {
    const url = parseUrl(getFaqSearchEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/faq_search.action');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:deck-search-page.default-locale-removed] getDeckSearchPageUrl はデフォルトlocaleを最終URLから削除する', () => {
    const url = parseUrl(getDeckSearchPageUrl('ocg'));

    expect(url.pathname).toBe('/yugiohdb/deck_search.action');
    expect(url.searchParams.has('request_locale')).toBe(false);
  });

  it('[covers:deck-search-page.explicit-locale-removed] getDeckSearchPageUrl は指定localeも最終URLから削除する', () => {
    const url = parseUrl(getDeckSearchPageUrl('ocg', 'en'));

    expect(url.pathname).toBe('/yugiohdb/deck_search.action');
    expect(url.searchParams.has('request_locale')).toBe(false);
  });

  it('[covers:card-search-form.delegates-card-search-ope1] getCardSearchFormUrl は ope=1 のカード検索URLを返す', () => {
    const url = parseUrl(getCardSearchFormUrl('ocg'));

    expect(url.pathname).toBe('/yugiohdb/card_search.action');
    expect(url.searchParams.get('ope')).toBe('1');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:image-parts-base.uses-game-path] getImagePartsBaseUrl はゲーム種別に対応する画像パーツベースURLを返す', () => {
    expect(getImagePartsBaseUrl('rush')).toBe('https://www.db.yugioh-card.com/rushdb/external/image/parts');
  });

  it('[covers:vue-edit.no-params] getVueEditUrl は引数省略時にクエリなしの編集ハッシュURLを返す', () => {
    expect(getVueEditUrl('ocg')).toBe('https://www.db.yugioh-card.com/yugiohdb#/ytomo/edit');
  });

  it('[covers:vue-edit.locale-pre-hash] locale はハッシュ前 request_locale へ追加される', () => {
    const url = parseUrl(getVueEditUrl('ocg', undefined, 'ja'));

    expect(url.searchParams.get('request_locale')).toBe('ja');
    expect(url.hash).toBe('#/ytomo/edit');
  });

  it('[covers:vue-edit.dno-post-hash] dno はハッシュ後クエリへ追加される', () => {
    const url = getVueEditUrl('ocg', 1);

    expect(parseUrl(url).searchParams.has('dno')).toBe(false);
    expect(parseHashParams(url).get('dno')).toBe('1');
  });

  it('[covers:vue-edit.zero-dno-omitted] dno=0 は falsy として省略される', () => {
    const url = getVueEditUrl('ocg', 0);

    expect(parseHashParams(url).has('dno')).toBe(false);
    expect(url).toBe('https://www.db.yugioh-card.com/yugiohdb#/ytomo/edit');
  });

  it('[covers:vue-edit.additional-params-appended] additionalParams はハッシュ後クエリへ append される', () => {
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

  it('[covers:deck-display.delegates-member-deck-ope1] getDeckDisplayUrl は ope=1/cgid/dno を持つ表示URLを返す', () => {
    const url = parseUrl(getDeckDisplayUrl('cgid-1', 7, 'ocg'));

    expect(url.pathname).toBe('/yugiohdb/member_deck.action');
    expect(url.searchParams.get('ope')).toBe('1');
    expect(url.searchParams.get('cgid')).toBe('cgid-1');
    expect(url.searchParams.get('dno')).toBe('7');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:forbidden-limited.no-effective-date] getForbiddenLimitedEndpoint は日付省略時 forbiddenLimitedDate を付与しない', () => {
    const url = parseUrl(getForbiddenLimitedEndpoint('ocg'));

    expect(url.pathname).toBe('/yugiohdb/forbidden_limited.action');
    expect(url.searchParams.has('forbiddenLimitedDate')).toBe(false);
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:forbidden-limited.with-effective-date] getForbiddenLimitedEndpoint は日付指定時 forbiddenLimitedDate を付与する', () => {
    const url = parseUrl(getForbiddenLimitedEndpoint('ocg', '2026-04-01'));

    expect(url.searchParams.get('forbiddenLimitedDate')).toBe('2026-04-01');
    expect(url.searchParams.get('request_locale')).toBe('ja');
  });

  it('[covers:genesys-index.constant-url] getGenesysIndexUrl はGENESYSベースURLを返す', () => {
    expect(getGenesysIndexUrl()).toBe('https://www.yugioh-card.com/japan/howto/genesys/');
  });

  it('[covers:genesys-list.list-query] getGenesysListUrl はlistクエリを単純連結する', () => {
    expect(getGenesysListUrl('202606')).toBe('https://www.yugioh-card.com/japan/howto/genesys/?list=202606');
  });
});
