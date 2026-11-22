/**
 * ページ判定ユーティリティのテスト
 *
 * tests/design/page-detector/conditions.toml の条件を検証する。
 * 各it()のコメントに[covers:<id>]タグでカバーする条件IDを明記する。
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  detectCardGameType,
  getGamePath,
  isDeckDisplayPage,
  isDeckEditPage,
  isDeckListPage,
  isVueEditPage,
  isCardSearchPage,
  isCardDetailPage,
  isFAQSearchPage,
  isFAQDetailPage,
  isDeckSearchPage,
  isYugiohDBSite,
  getMyDeckCgid,
  getDeckCgid,
  isOwnDeck
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

  // フッターメニューの「マイデッキ」リンクをDOMに設置するヘルパー
  // セレクタ: #footer_menu > ul > li.my.menu_my_decks.sab_menu > ul > li:nth-child(1) > a
  const setFooterMyDeckLink = (href: string | null) => {
    document.body.innerHTML = '';
    const footer = document.createElement('div');
    footer.id = 'footer_menu';
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.className = 'my menu_my_decks sab_menu';
    const innerUl = document.createElement('ul');
    const innerLi = document.createElement('li');
    const a = document.createElement('a');
    if (href !== null) {
      a.setAttribute('href', href);
    }
    innerLi.appendChild(a);
    innerUl.appendChild(innerLi);
    li.appendChild(innerUl);
    ul.appendChild(li);
    footer.appendChild(ul);
    document.body.appendChild(footer);
  };

  const clearFooterMyDeckLink = () => {
    document.body.innerHTML = '';
  };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectCardGameType', () => {
    it('url引数に/rushdb/が含まれる場合はrushを返す [covers:detect-card-game-type.rush-url-explicit]', () => {
      expect(detectCardGameType('https://www.db.yugioh-card.com/rushdb/member_deck.action?ope=1')).toBe('rush');
    });

    it('url引数に/rushdb/が含まれない場合はocgを返す [covers:detect-card-game-type.ocg-url-explicit]', () => {
      expect(detectCardGameType('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1')).toBe('ocg');
    });

    it('url引数省略時はwindow.location.hrefをフォールバックとして使用する [covers:detect-card-game-type.default-to-location-href]', () => {
      setLocation('https://www.db.yugioh-card.com/rushdb/member_deck.action');
      expect(detectCardGameType()).toBe('rush');
    });
  });

  describe('getGamePath', () => {
    it("gameType==='rush'の場合はrushdbを返す [covers:get-game-path.rush-to-rushdb]", () => {
      expect(getGamePath('rush')).toBe('rushdb');
    });

    it("gameType==='ocg'の場合はyugiohdbを返す [covers:get-game-path.ocg-to-yugiohdb]", () => {
      expect(getGamePath('ocg')).toBe('yugiohdb');
    });
  });

  describe('isDeckDisplayPage', () => {
    it('デッキ表示ページ（ope=1）を正しく判定する [covers:is-deck-display-page.ope1-explicit-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(true);
    });

    it('opeパラメータが無い場合はope=1のデフォルトとみなしtrueを返す [covers:is-deck-display-page.no-ope-param-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action');
      expect(isDeckDisplayPage()).toBe(true);
    });

    it('デッキ編集ページ（ope=2）は対象外 [covers:is-deck-display-page.ope2-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(false);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/member_deck.action?ope=1');
      expect(isDeckDisplayPage()).toBe(false);
    });

    it('gameType引数が明示された場合はURL自動判定より優先される [covers:is-deck-display-page.game-type-param-overrides-url-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckDisplayPage('rush')).toBe(false);
    });
  });

  describe('isDeckEditPage', () => {
    it('デッキ編集ページ（ope=2）を正しく判定する [covers:is-deck-edit-page.ope2-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(true);
    });

    it('デッキ表示ページ（ope=1）は対象外 [covers:is-deck-edit-page.ope1-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(false);
    });

    it('opeパラメータが無い場合はfalseを返す（デフォルト解釈なし） [covers:is-deck-edit-page.no-ope-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action');
      expect(isDeckEditPage()).toBe(false);
    });
  });

  describe('isDeckListPage', () => {
    it('デッキ一覧ページ（ope=4）を正しく判定する [covers:is-deck-list-page.ope4-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4');
      expect(isDeckListPage()).toBe(true);
    });

    it('他のopeは対象外 [covers:is-deck-list-page.other-ope-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isDeckListPage()).toBe(false);
    });
  });

  describe('isVueEditPage', () => {
    it('Vue編集ページ（#/ytomo/edit、末尾スラッシュありpathname）を正しく判定する [covers:is-vue-edit-page.pathname-trailing-slash-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('pathnameが末尾スラッシュなし（/yugiohdb）でも正しく判定する [covers:is-vue-edit-page.pathname-no-trailing-slash-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('pathnameが/rushdb/でも正しく判定する [covers:is-vue-edit-page.pathname-rushdb-true]', () => {
      setLocation('https://www.db.yugioh-card.com/rushdb/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('URLパラメータがあっても正しく判定する [covers:is-vue-edit-page.hash-query-suffix-stripped-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit?dno=123');
      expect(isVueEditPage()).toBe(true);
    });

    it('他のハッシュは対象外 [covers:is-vue-edit-page.hash-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/other/page');
      expect(isVueEditPage()).toBe(false);
    });

    it('hashが一致してもpathnameが対象外の場合はfalseを返す [covers:is-vue-edit-page.pathname-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(false);
    });
  });

  describe('isCardSearchPage', () => {
    it('カード検索ページを正しく判定する [covers:is-card-search-page.path-match-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is-card-search-page.path-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(false);
    });

    it('opeパラメータを見ないため、isCardDetailPageがtrueになるope=2でもtrueを返す [covers:is-card-search-page.ope-irrelevant-overlaps-detail-page-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12345');
      expect(isCardSearchPage()).toBe(true);
      expect(isCardDetailPage()).toBe(true);
    });
  });

  describe('isCardDetailPage', () => {
    it('カード詳細ページ（ope=2）を正しく判定する [covers:is-card-detail-page.ope2-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12345');
      expect(isCardDetailPage()).toBe(true);
    });

    it('カード検索ページ（ope=1）は対象外 [covers:is-card-detail-page.ope1-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardDetailPage()).toBe(false);
    });
  });

  describe('isFAQSearchPage', () => {
    it('FAQ検索ページを正しく判定する [covers:is-faq-search-page.path-match-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is-faq-search-page.path-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/faq_search.action');
      expect(isFAQSearchPage()).toBe(false);
    });
  });

  describe('isFAQDetailPage', () => {
    it('FAQ詳細ページ（ope=5）を正しく判定する [covers:is-faq-detail-page.ope5-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115');
      expect(isFAQDetailPage()).toBe(true);
    });

    it('他のopeは対象外 [covers:is-faq-detail-page.other-ope-false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQDetailPage()).toBe(false);
    });
  });

  describe('isDeckSearchPage', () => {
    it('デッキ検索ページを正しく判定する [covers:is-deck-search-page.path-match-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja');
      expect(isDeckSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is-deck-search-page.path-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/deck_search.action');
      expect(isDeckSearchPage()).toBe(false);
    });
  });

  describe('isYugiohDBSite', () => {
    it('遊戯王公式DBサイト内を正しく判定する [covers:is-yugioh-db-site.domain-and-path-match-true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is-yugioh-db-site.path-mismatch-false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/page.html');
      expect(isYugiohDBSite()).toBe(false);
    });

    it('他のドメインは対象外 [covers:is-yugioh-db-site.domain-mismatch-false]', () => {
      setLocation('https://example.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(false);
    });
  });

  describe('getMyDeckCgid', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('マイデッキリンクがDOM上に存在しない場合はnullを返しconsole.warnする [covers:get-my-deck-cgid.link-not-found-null]', () => {
      clearFooterMyDeckLink();
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('リンクは存在するがhref属性が無い場合はnullを返す [covers:get-my-deck-cgid.href-missing-null]', () => {
      setFooterMyDeckLink(null);
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('hrefにcgidが含まれない場合はnullを返す [covers:get-my-deck-cgid.href-no-cgid-match-null]', () => {
      setFooterMyDeckLink('/yugiohdb/some_other_page.action');
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('hrefにcgidが含まれる場合はそのcgidを返す [covers:get-my-deck-cgid.href-cgid-match-returns-id]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      expect(getMyDeckCgid()).toBe('abc123');
    });
  });

  describe('getDeckCgid', () => {
    it('location.searchにcgidパラメータが存在する場合はその値を返す [covers:get-deck-cgid.param-present-returns-value]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=def456&dno=123');
      expect(getDeckCgid()).toBe('def456');
    });

    it('location.searchにcgidパラメータが存在しない場合はnullを返す [covers:get-deck-cgid.param-absent-returns-null]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&dno=123');
      expect(getDeckCgid()).toBeNull();
    });
  });

  describe('isOwnDeck', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('自分のcgidが取得できない場合はfalseを返す [covers:is-own-deck.my-cgid-null-false]', () => {
      clearFooterMyDeckLink();
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=abc123');
      expect(isOwnDeck()).toBe(false);
    });

    it('デッキのcgidが取得できない場合はfalseを返す [covers:is-own-deck.deck-cgid-null-false]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isOwnDeck()).toBe(false);
    });

    it('両cgidが取得できても値が異なる場合はfalseを返す [covers:is-own-deck.cgid-mismatch-false]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xyz789');
      expect(isOwnDeck()).toBe(false);
    });

    it('両cgidが一致する場合はtrueを返す [covers:is-own-deck.cgid-match-true]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=abc123');
      expect(isOwnDeck()).toBe(true);
    });
  });
});
