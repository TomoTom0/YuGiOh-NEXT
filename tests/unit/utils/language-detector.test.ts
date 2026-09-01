import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectLanguage } from '@/utils/language-detector';

// tests/design/language-detector/conditions.toml の条件を検証する。
// 各 it() の [covers:<id>] タグは conditions.toml の [[condition]].id に対応する。

interface MockDocOptions {
  /** html要素のlang属性。undefinedなら属性なし(getAttributeがnull) */
  lang?: string;
  /** #nowlanguage a.current 要素の有無 */
  nowLanguageCurrentPresent?: boolean;
  /** #nowlanguage a.current のhref属性値。undefinedならhref属性なし */
  nowLanguageCurrentHref?: string;
  /** #nowlanguage 要素の有無 */
  nowLanguagePresent?: boolean;
  /** #nowlanguage のtextContent。undefinedならtextContentがnull */
  nowLanguageText?: string;
  /** meta[property="og:url"] 要素の有無 */
  ogUrlPresent?: boolean;
  /** meta[property="og:url"] のcontent属性値。undefinedならcontent属性なし */
  ogUrlContent?: string;
  /** doc.location.href */
  locationHref?: string;
}

// モック用のヘルパー関数
function createMockDocument(options: MockDocOptions): Document {
  const mockQuerySelector = vi.fn((selector: string) => {
    if (selector === '#nowlanguage a.current') {
      if (!options.nowLanguageCurrentPresent) return null;
      return {
        getAttribute: (attr: string) =>
          attr === 'href' ? options.nowLanguageCurrentHref ?? null : null
      };
    }
    if (selector === '#nowlanguage') {
      if (!options.nowLanguagePresent) return null;
      return {
        textContent: options.nowLanguageText ?? null,
        getAttribute: () => null
      };
    }
    if (selector === 'meta[property="og:url"]') {
      if (!options.ogUrlPresent) return null;
      return {
        getAttribute: (attr: string) =>
          attr === 'content' ? options.ogUrlContent ?? null : null
      };
    }
    return null;
  });

  const mockDoc = {
    querySelector: mockQuerySelector,
    documentElement: {
      getAttribute: (attr: string) => {
        if (attr === 'lang') return options.lang ?? null;
        return null;
      }
    },
    location: {
      href: options.locationHref || 'https://www.db.yugioh-card.com/yugiohdb/'
    }
  } as any as Document;

  return mockDoc;
}

describe('utils/language-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('優先度1: #nowlanguage a.current の href (ChangeLanguageパターン)', () => {
    it('[covers:method1_match_returns] hrefが javascript:ChangeLanguage(\'xx\') にマッチする場合その言語コードを返す', () => {
      const mockDoc = createMockDocument({
        nowLanguageCurrentPresent: true,
        nowLanguageCurrentHref: "javascript:ChangeLanguage('en')"
      });

      expect(detectLanguage(mockDoc)).toBe('en');
    });

    it('[covers:method1_no_element_fallthrough] 要素が存在しない場合は優先度2以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguageCurrentPresent: false
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method1_href_null_fallthrough] 要素は存在するがhref属性が無い場合は優先度2以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguageCurrentPresent: true
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method1_href_no_match_fallthrough] hrefがChangeLanguageパターンにマッチしない場合は優先度2以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguageCurrentPresent: true,
        nowLanguageCurrentHref: 'javascript:someOtherFunc()'
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method1_priority_over_lang_attribute] html lang属性より優先される', () => {
      const mockDoc = createMockDocument({
        nowLanguageCurrentPresent: true,
        nowLanguageCurrentHref: "javascript:ChangeLanguage('en')",
        lang: 'ko'
      });

      expect(detectLanguage(mockDoc)).toBe('en');
    });
  });

  describe('優先度2: #nowlanguage のtextContent (languageMap)', () => {
    it.each([
      ['日本語', 'ja'],
      ['한글', 'ko'],
      ['English(Asia)', 'ae'],
      ['簡体字', 'cn'],
      ['English', 'en'],
      ['Deutsch', 'de'],
      ['Français', 'fr'],
      ['Italiano', 'it'],
      ['Español', 'es'],
      ['Portugues', 'pt']
    ])(
      '[covers:method2_known_texts_map] textContent "%s" から "%s" を検出する',
      (text, expected) => {
        const mockDoc = createMockDocument({
          nowLanguagePresent: true,
          nowLanguageText: text
        });

        expect(detectLanguage(mockDoc)).toBe(expected);
      }
    );

    it('[covers:method2_no_element_fallthrough] 要素が存在しない場合は優先度3以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguagePresent: false
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method2_text_not_in_map_fallthrough] textContentがlanguageMapに無い場合は優先度3以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguagePresent: true,
        nowLanguageText: '未知の言語名'
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method2_text_null_fallthrough] textContentがnullの場合は優先度3以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        nowLanguagePresent: true
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method2_priority_over_method3_4_5] og:urlやhtml langより優先される', () => {
      const mockDoc = createMockDocument({
        nowLanguagePresent: true,
        nowLanguageText: 'English',
        ogUrlPresent: true,
        ogUrlContent: 'https://example.com/?request_locale=de',
        lang: 'fr'
      });

      expect(detectLanguage(mockDoc)).toBe('en');
    });
  });

  describe('優先度3: meta[property="og:url"] のcontent', () => {
    it('[covers:method3_match_returns] contentが request_locale=xx にマッチする場合その言語コードを返す', () => {
      const mockDoc = createMockDocument({
        ogUrlPresent: true,
        ogUrlContent: 'https://example.com/?request_locale=de'
      });

      expect(detectLanguage(mockDoc)).toBe('de');
    });

    it('[covers:method3_no_element_fallthrough] 要素が存在しない場合は優先度4以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        ogUrlPresent: false
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method3_content_null_fallthrough] content属性が無い場合は優先度4以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        ogUrlPresent: true
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method3_content_no_match_fallthrough] contentがrequest_localeパターンにマッチしない場合は優先度4以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        ogUrlPresent: true,
        ogUrlContent: 'https://example.com/no-locale-param'
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method3_priority_over_method4_5] URLパラメータやhtml langより優先される', () => {
      const mockDoc = createMockDocument({
        ogUrlPresent: true,
        ogUrlContent: 'https://example.com/?request_locale=es',
        locationHref: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=cn',
        lang: 'fr'
      });

      expect(detectLanguage(mockDoc)).toBe('es');
    });
  });

  describe('優先度4: URLパラメータ request_locale', () => {
    it('[covers:method4_param_present_returns_as_is] location.hrefのrequest_localeパラメータをそのまま返す', () => {
      const mockDoc = createMockDocument({
        locationHref: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=pt'
      });

      expect(detectLanguage(mockDoc)).toBe('pt');
    });

    it('[covers:method4_param_arbitrary_value_no_validation] 2文字コード以外の任意の値でもフォーマット検証なしにそのまま返す', () => {
      const mockDoc = createMockDocument({
        locationHref: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=xx-custom'
      });

      expect(detectLanguage(mockDoc)).toBe('xx-custom');
    });

    it('[covers:method4_param_absent_fallthrough] request_localeパラメータが無い場合は優先度5以降にフォールスルーする', () => {
      const mockDoc = createMockDocument({
        locationHref: 'https://www.db.yugioh-card.com/yugiohdb/'
      });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method4_invalid_href_throws] location.hrefが不正なURLの場合はTypeErrorをthrowする', () => {
      const mockDoc = createMockDocument({
        locationHref: 'not-a-valid-url'
      });

      expect(() => detectLanguage(mockDoc)).toThrow(TypeError);
    });

    it('[covers:method4_priority_over_method5] html langより優先される', () => {
      const mockDoc = createMockDocument({
        locationHref: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=it',
        lang: 'fr'
      });

      expect(detectLanguage(mockDoc)).toBe('it');
    });
  });

  describe('優先度5: html lang属性', () => {
    it('[covers:method5_lang_present_returns] html lang属性から "ja" を検出', () => {
      const mockDoc = createMockDocument({ lang: 'ja' });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method5_lang_present_returns] html lang属性から "en" を検出', () => {
      const mockDoc = createMockDocument({ lang: 'en' });

      expect(detectLanguage(mockDoc)).toBe('en');
    });

    it('[covers:method5_lang_present_returns] html lang属性から "ko" を検出', () => {
      const mockDoc = createMockDocument({ lang: 'ko' });

      expect(detectLanguage(mockDoc)).toBe('ko');
    });

    it('[covers:method5_hyphenated_lang_takes_first_segment] 複数言語コード "ja-JP" から "ja" を抽出', () => {
      const mockDoc = createMockDocument({ lang: 'ja-JP' });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method5_hyphenated_lang_takes_first_segment] 複数言語コード "en-US" から "en" を抽出', () => {
      const mockDoc = createMockDocument({ lang: 'en-US' });

      expect(detectLanguage(mockDoc)).toBe('en');
    });

    it('[covers:method5_hyphenated_lang_takes_first_segment] 複数のハイフン付き言語コード "ja-JP-variant" から "ja" を抽出', () => {
      const mockDoc = createMockDocument({ lang: 'ja-JP-variant' });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method5_no_lowercase_conversion] 大文字の言語コード "JA" は小文字に変換されずそのまま返る', () => {
      // 実装(L58-63)はsplit('-')[0]の結果をそのまま返すのみで、大文字小文字の変換は行わない。
      // 修正前のテストは `expect(result.toLowerCase()).toBe('ja')` としてassert側を小文字化しており、
      // 実際の戻り値が 'JA' のままでも検知できなかった(conditions.tomlの実装コメントとの差異を参照)。
      const mockDoc = createMockDocument({ lang: 'JA' });

      expect(detectLanguage(mockDoc)).toBe('JA');
    });

    it('[covers:method5_lang_absent_fallthrough] lang属性が無い場合はデフォルト言語 "ja" にフォールスルーする', () => {
      const mockDoc = createMockDocument({});

      expect(detectLanguage(mockDoc)).toBe('ja');
    });

    it('[covers:method5_leading_hyphen_empty_segment_fallthrough] lang属性がハイフンで始まる場合、空文字にならずデフォルト "ja" にフォールスルーする', () => {
      const mockDoc = createMockDocument({ lang: '-JP' });

      expect(detectLanguage(mockDoc)).toBe('ja');
    });
  });

  describe('複数ドキュメントの言語検出', () => {
    it('異なるドキュメントで異なる言語が検出される', () => {
      const docJa = createMockDocument({ lang: 'ja' });
      const docEn = createMockDocument({ lang: 'en' });
      const docKo = createMockDocument({ lang: 'ko' });

      expect(detectLanguage(docJa)).toBe('ja');
      expect(detectLanguage(docEn)).toBe('en');
      expect(detectLanguage(docKo)).toBe('ko');
    });

    it('同じドキュメントに複数回アクセスしても同じ言語を返す（一貫性）', () => {
      const mockDoc = createMockDocument({ lang: 'ja' });

      const result1 = detectLanguage(mockDoc);
      const result2 = detectLanguage(mockDoc);
      const result3 = detectLanguage(mockDoc);

      expect(result1).toBe('ja');
      expect(result2).toBe('ja');
      expect(result3).toBe('ja');
    });
  });

  describe('デフォルト言語テスト', () => {
    it('[covers:default_ja_when_none_match] 何も検出できない場合はデフォルト言語 "ja" を返す', () => {
      const mockDoc = createMockDocument({});

      expect(detectLanguage(mockDoc)).toBe('ja');
    });
  });
});
