/**
 * ページの言語を検出
 *
 * @param doc Document オブジェクト
 * @returns 言語コード ('ja', 'en', etc.)
 */
export function detectLanguage(doc: Document): string {
  // 1. #nowlanguage 要素から検出（a.current がある場合）
  const nowLanguageEl = doc.querySelector('#nowlanguage a.current');
  if (nowLanguageEl) {
    const href = nowLanguageEl.getAttribute('href');
    const match = href?.match(/request_locale=([a-z]{2})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 2. #nowlanguage 要素のテキストから検出（a.current がない場合）
  const nowLanguageDiv = doc.querySelector('#nowlanguage');
  if (nowLanguageDiv) {
    const text = nowLanguageDiv.textContent?.trim();
    const languageMap: Record<string, string> = {
      '日本語': 'ja',
      '한글': 'ko',
      'English(Asia)': 'ae',
      '簡体字': 'cn',
      'English': 'en',
      'Deutsch': 'de',
      'Français': 'fr',
      'Italiano': 'it',
      'Español': 'es',
      'Portugues': 'pt',
    };
    if (text && languageMap[text]) {
      return languageMap[text];
    }
  }

  // 3. metaタグのog:urlから検出
  const ogUrlMeta = doc.querySelector('meta[property="og:url"]');
  if (ogUrlMeta) {
    const content = ogUrlMeta.getAttribute('content');
    const match = content?.match(/request_locale=([a-z]{2})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 4. URLパラメータから検出
  const url = new URL(doc.location.href);
  const locale = url.searchParams.get('request_locale');
  if (locale) {
    return locale;
  }

  // 5. html lang属性から検出
  const htmlLang = doc.documentElement.getAttribute('lang');
  if (htmlLang) {
    const langCode = htmlLang.split('-')[0];
    if (langCode) {
      return langCode; // 'ja-JP' -> 'ja'
    }
  }

  // デフォルトは日本語
  return 'ja';
}
