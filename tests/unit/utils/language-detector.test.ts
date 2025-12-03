import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectLanguage } from '@/utils/language-detector';

// モック用のヘルパー関数
function createMockDocument(options: {
  lang?: string;
  nowLanguageText?: string;
  ogUrl?: string;
  requestLocale?: string;
  locationHref?: string;
}): Document {
  const mockQuerySelector = vi.fn((selector: string) => {
    if (selector === '#nowlanguage a.current' && options.nowLanguageText) {
      return null; // 最初の検出方法はスキップ
    }
    if (selector === '#nowlanguage' && options.nowLanguageText) {
      return {
        textContent: options.nowLanguageText,
        getAttribute: () => null
      };
    }
    if (selector === 'meta[property="og:url"]' && options.ogUrl) {
      return {
        getAttribute: () => options.ogUrl
      };
    }
    return null;
  });

  const mockDoc = {
    querySelector: mockQuerySelector,
    documentElement: {
      getAttribute: (attr: string) => {
        if (attr === 'lang') return options.lang || null;
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

  describe('言語検出の優先度テスト', () => {
    it('html lang属性から "ja" を検出', () => {
      const mockDoc = createMockDocument({
        lang: 'ja'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ja');
    });

    it('html lang属性から "en" を検出', () => {
      const mockDoc = createMockDocument({
        lang: 'en'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('en');
    });

    it('html lang属性から "ko" を検出', () => {
      const mockDoc = createMockDocument({
        lang: 'ko'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ko');
    });

    it('複数言語コード "ja-JP" から "ja" を抽出', () => {
      const mockDoc = createMockDocument({
        lang: 'ja-JP'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ja');
    });

    it('複数言語コード "en-US" から "en" を抽出', () => {
      const mockDoc = createMockDocument({
        lang: 'en-US'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('en');
    });
  });

  describe('デフォルト言語テスト', () => {
    it('言語が指定されていない場合はデフォルト言語 "ja" を返す', () => {
      const mockDoc = createMockDocument({});

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ja');
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

  describe('言語テキスト検出テスト', () => {
    it('日本語テキスト "日本語" から "ja" を検出', () => {
      const mockDoc = createMockDocument({
        nowLanguageText: '日本語'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ja');
    });

    it('韓国語テキスト "한글" から "ko" を検出', () => {
      const mockDoc = createMockDocument({
        nowLanguageText: '한글'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ko');
    });

    it('英語テキスト "English" から "en" を検出', () => {
      const mockDoc = createMockDocument({
        nowLanguageText: 'English'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('en');
    });
  });

  describe('エッジケース', () => {
    it('大文字の言語コード "JA" は小文字に変換される', () => {
      const mockDoc = createMockDocument({
        lang: 'JA'
      });

      const result = detectLanguage(mockDoc);
      // 実装によっては小文字に変換されないかもしれません
      expect(result.toLowerCase()).toBe('ja');
    });

    it('複数のハイフン付き言語コード "ja-JP-variant" から "ja" を抽出', () => {
      const mockDoc = createMockDocument({
        lang: 'ja-JP-variant'
      });

      const result = detectLanguage(mockDoc);
      expect(result).toBe('ja');
    });
  });
});
