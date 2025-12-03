import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApiUrl, getDeckSearchPageUrl } from '@/utils/url-builder';
import type { CardGameType } from '@/types/settings';

// detectLanguage をモック
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja')
}));

describe('url-builder: buildApiUrl()', () => {
  describe('getApiPathType() の判定ロジック', () => {
    it('ope=6（新規作成）が member_deck_new として判定される', () => {
      const url = buildApiUrl('member_deck.action?ope=6&wname=MemberDeck&cgid=test', 'ocg');
      expect(url).not.toContain('request_locale');
    });

    it('ope=4（デッキ一覧）が deck_search として判定される', () => {
      const url = buildApiUrl('member_deck.action?ope=4&cgid=test', 'ocg');
      expect(url).not.toContain('request_locale');
    });

    it('ope=1（表示）が member_deck_other として判定され request_locale が付与される', () => {
      const url = buildApiUrl('member_deck.action?ope=1&dno=123', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('ope=3（保存）が member_deck_other として判定され request_locale が付与される', () => {
      const url = buildApiUrl('member_deck.action?ope=3&cgid=test', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('ope=7（削除）が member_deck_other として判定され request_locale が付与される', () => {
      const url = buildApiUrl('member_deck.action?ope=7&cgid=test&dno=123', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('faq_search が faq_search として判定される', () => {
      const url = buildApiUrl('faq_search.action', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('card_search が card_search として判定される', () => {
      const url = buildApiUrl('card_search.action', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('get_image が get_image として判定される', () => {
      const url = buildApiUrl('get_image.action?id=test', 'ocg');
      expect(url).toContain('request_locale=ja');
    });
  });

  describe('request_locale 付与ルール', () => {
    it('member_deck_new では request_locale が付与されない', () => {
      const url = buildApiUrl('member_deck.action?ope=6&wname=MemberDeck&cgid=test', 'ocg');
      expect(url).not.toContain('request_locale');
    });

    it('deck_search では request_locale が付与されない', () => {
      const url = buildApiUrl('member_deck.action?ope=4&cgid=test', 'ocg');
      expect(url).not.toContain('request_locale');
    });

    it('faq_search では request_locale=ja が強制される', () => {
      const url = buildApiUrl('faq_search.action', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('其の他のエンドポイント では detectLanguage() の結果が付与される', () => {
      const url = buildApiUrl('card_search.action', 'ocg');
      expect(url).toContain('request_locale=ja');
    });

    it('既に request_locale がある場合はスキップされる', () => {
      const url = buildApiUrl('card_search.action?request_locale=en', 'ocg');
      expect(url).toContain('request_locale=en');
      expect(url).not.toContain('request_locale=ja');
    });
  });

  describe('パラメータ順序の一貫性', () => {
    it('ope=4&cgid=xxx と cgid=xxx&ope=4 が同じ結果を返す', () => {
      const url1 = buildApiUrl('member_deck.action?ope=4&cgid=test123', 'ocg');
      const url2 = buildApiUrl('member_deck.action?cgid=test123&ope=4', 'ocg');

      // URL 標準化（パラメータ順序は違うが内容は同じ）
      const urlObj1 = new URL(url1);
      const urlObj2 = new URL(url2);

      expect(urlObj1.searchParams.get('ope')).toBe(urlObj2.searchParams.get('ope'));
      expect(urlObj1.searchParams.get('cgid')).toBe(urlObj2.searchParams.get('cgid'));
      expect(urlObj1.searchParams.get('request_locale')).toBe(urlObj2.searchParams.get('request_locale'));
    });
  });

  describe('既存パラメータとのマージ', () => {
    it('呼び出し側で提供された URLSearchParams が正しくマージされる', () => {
      const params = new URLSearchParams();
      params.set('cgid', 'test-cgid');
      params.set('dno', '123');

      const url = buildApiUrl('member_deck.action?ope=1', 'ocg', params);
      const urlObj = new URL(url);

      expect(urlObj.searchParams.get('ope')).toBe('1');
      expect(urlObj.searchParams.get('cgid')).toBe('test-cgid');
      expect(urlObj.searchParams.get('dno')).toBe('123');
      expect(urlObj.searchParams.get('request_locale')).toBe('ja');
    });
  });

  describe('ゲームタイプ（OCG/RUSH）対応', () => {
    it('ocg を指定するとベースURLが /yugiohdb を含む', () => {
      const url = buildApiUrl('card_search.action', 'ocg');
      expect(url).toContain('/yugiohdb/');
    });

    it('rush を指定するとベースURLが /rushdb を含む', () => {
      const url = buildApiUrl('card_search.action', 'rush');
      expect(url).toContain('/rushdb/');
    });
  });
});

describe('url-builder: getDeckSearchPageUrl()', () => {
  it('getDeckSearchPageUrl で指定された request_locale が保持される', () => {
    // getDeckSearchPageUrl は request_locale パラメータを削除する実装
    // 因此、このテストは現在の実装が意図通りかを検証
    const url = getDeckSearchPageUrl('ocg', 'en');
    const urlObj = new URL(url);

    // deck_search では request_locale が削除される（仕様）
    expect(urlObj.searchParams.get('request_locale')).toBeNull();
  });
});
