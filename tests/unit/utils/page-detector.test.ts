/**
 * ページ判定ユーティリティのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isDeckDisplayPage,
  isDeckEditPage,
  isDeckListPage,
  isVueEditPage,
  isCardSearchPage,
  isCardDetailPage,
  isFAQSearchPage,
  isFAQDetailPage,
  isDeckSearchPage,
  isYugiohDBSite
} from '../../../src/utils/page-detector';

describe('page-detector', () => {
  // window.locationをモックするヘルパー関数
  const setLocation = (href: string, hash = '') => {
    // @ts-ignore
    delete window.location;

    // hrefからpathname, search, hashを抽出
    const url = new URL(href);
    const pathname = url.pathname;
    const search = url.search;

    // @ts-ignore
    window.location = {
      href,
      hash: hash || url.hash,
      pathname,
      search
    };
  };

  describe('isDeckDisplayPage', () => {
    it('デッキ表示ページ（ope=1）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(true);
    });

    it('デッキ編集ページ（ope=2）は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(false);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/member_deck.action?ope=1');
      expect(isDeckDisplayPage()).toBe(false);
    });
  });

  describe('isDeckEditPage', () => {
    it('デッキ編集ページ（ope=2）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(true);
    });

    it('デッキ表示ページ（ope=1）は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(false);
    });
  });

  describe('isDeckListPage', () => {
    it('デッキ一覧ページ（ope=4）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4');
      expect(isDeckListPage()).toBe(true);
    });

    it('他のopeは対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isDeckListPage()).toBe(false);
    });
  });

  describe('isVueEditPage', () => {
    it('Vue編集ページ（#/ytomo/edit）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('URLパラメータがあっても正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit?dno=123');
      expect(isVueEditPage()).toBe(true);
    });

    it('他のハッシュは対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/other/page');
      expect(isVueEditPage()).toBe(false);
    });
  });

  describe('isCardSearchPage', () => {
    it('カード検索ページを正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(false);
    });
  });

  describe('isCardDetailPage', () => {
    it('カード詳細ページ（ope=2）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12345');
      expect(isCardDetailPage()).toBe(true);
    });

    it('カード検索ページ（ope=1）は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardDetailPage()).toBe(false);
    });
  });

  describe('isFAQSearchPage', () => {
    it('FAQ検索ページを正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/faq_search.action');
      expect(isFAQSearchPage()).toBe(false);
    });
  });

  describe('isFAQDetailPage', () => {
    it('FAQ詳細ページ（ope=5）を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115');
      expect(isFAQDetailPage()).toBe(true);
    });

    it('他のopeは対象外', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQDetailPage()).toBe(false);
    });
  });

  describe('isDeckSearchPage', () => {
    it('デッキ検索ページを正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja');
      expect(isDeckSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/deck_search.action');
      expect(isDeckSearchPage()).toBe(false);
    });
  });

  describe('isYugiohDBSite', () => {
    it('遊戯王公式DBサイト内を正しく判定する', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/page.html');
      expect(isYugiohDBSite()).toBe(false);
    });

    it('他のドメインは対象外', () => {
      setLocation('https://example.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(false);
    });
  });
});
