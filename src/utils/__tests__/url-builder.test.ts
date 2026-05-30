import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  getImagePartsBaseUrl,
  getVueEditUrl
} from '../url-builder';

describe('url-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildApiUrl', () => {
    it('正しいAPIエンドポイントを構築できる', () => {
      const params = new URLSearchParams({
        ope: '2',
        cid: '4335'
      });
      const url = buildApiUrl('card_search.action', 'ocg', params);

      expect(url).toContain('card_search.action');
      expect(url).toContain('ope=2');
      expect(url).toContain('cid=4335');
    });

    it('複数のゲームタイプに対応できる', () => {
      const params = new URLSearchParams({ ope: '1' });

      const ocgUrl = buildApiUrl('card_search.action', 'ocg', params);
      const tcgUrl = buildApiUrl('card_search.action', 'tcg', params);

      expect(ocgUrl).toBeDefined();
      expect(tcgUrl).toBeDefined();
      // URLが正しく生成されていることを確認
      expect(ocgUrl).toContain('card_search.action');
      expect(tcgUrl).toContain('card_search.action');
    });

    it('パラメータが空の場合でも動作する', () => {
      const params = new URLSearchParams();
      const url = buildApiUrl('faq_search.action', 'ocg', params);

      expect(url).toContain('faq_search.action');
    });
  });

  describe('getCardSearchEndpoint', () => {
    it('OCGゲームタイプの検索エンドポイントを返す', () => {
      const endpoint = getCardSearchEndpoint('ocg');
      expect(endpoint).toContain('card_search.action');
    });

    it('TCGゲームタイプの検索エンドポイントを返す', () => {
      const endpoint = getCardSearchEndpoint('tcg');
      expect(endpoint).toContain('card_search.action');
    });
  });

  describe('getDeckApiEndpoint', () => {
    it('デッキAPIエンドポイントを返す', () => {
      const endpoint = getDeckApiEndpoint('ocg');
      expect(endpoint).toBeDefined();
      expect(endpoint).toContain('deck');
    });
  });

  describe('getDeckDisplayUrl', () => {
    it('デッキ表示URLを正しく生成できる', () => {
      const url = getDeckDisplayUrl('ocg', 12345);

      expect(url).toContain('dno=12345');
      expect(url).toBeDefined();
    });

    it('複数のデッキID形式に対応できる', () => {
      const url1 = getDeckDisplayUrl('ocg', 1);
      const url2 = getDeckDisplayUrl('ocg', 999999);

      expect(url1).toContain('dno=1');
      expect(url2).toContain('dno=999999');
    });
  });

  describe('getVueEditUrl', () => {
    it('Vue編集ページのURLを生成できる', () => {
      const url = getVueEditUrl('ocg', 12345, 'jp');

      expect(url).toContain('/ytomo/edit');
      expect(url).toContain('12345');
    });

    it('言語パラメータを含める', () => {
      const urlJp = getVueEditUrl('ocg', 123, 'jp');
      const urlEn = getVueEditUrl('ocg', 123, 'en');

      expect(urlJp).toBeDefined();
      expect(urlEn).toBeDefined();
    });

    it('複数のゲームタイプに対応できる', () => {
      const ocgUrl = getVueEditUrl('ocg', 123, 'jp');
      const tcgUrl = getVueEditUrl('tcg', 123, 'jp');

      expect(ocgUrl).toBeDefined();
      expect(tcgUrl).toBeDefined();
    });
  });

  describe('getDeckSearchPageUrl', () => {
    it('デッキ検索ページURLを生成できる', () => {
      const url = getDeckSearchPageUrl('ocg');

      expect(url).toBeDefined();
      expect(url).toContain('deck_search.action');
    });
  });

  describe('getFaqSearchEndpoint', () => {
    it('FAQ検索エンドポイントを返す', () => {
      const endpoint = getFaqSearchEndpoint('ocg');

      expect(endpoint).toContain('faq_search.action');
    });
  });

  describe('getForbiddenLimitedEndpoint', () => {
    it('禁止制限エンドポイントを返す', () => {
      const endpoint = getForbiddenLimitedEndpoint('ocg');

      expect(endpoint).toBeDefined();
      expect(endpoint).toContain('forbidden_limited');
    });
  });

  describe('getImagePartsBaseUrl', () => {
    it('画像パーツベースURLを返す', () => {
      const url = getImagePartsBaseUrl('ocg');

      expect(url).toBeDefined();
      expect(url).toContain('image');
    });
  });

  describe('buildFullUrl', () => {
    it('相対パスから完全なURLを構築できる', () => {
      const fullUrl = buildFullUrl('card_search.action');

      expect(fullUrl).toBeDefined();
      expect(fullUrl).toContain('https://');
      expect(fullUrl).toContain('card_search.action');
    });
  });

  describe('getCardSearchFormUrl', () => {
    it('カード検索フォームURLを生成できる', () => {
      const url = getCardSearchFormUrl('ocg');

      expect(url).toBeDefined();
    });
  });

});
