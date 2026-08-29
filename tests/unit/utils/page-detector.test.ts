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
    it('url引数に/rushdb/が含まれる場合はrushを返す [covers:detect_card_game_type.rush_url_explicit]', () => {
      expect(detectCardGameType('https://www.db.yugioh-card.com/rushdb/member_deck.action?ope=1')).toBe('rush');
    });

    it('url引数に/rushdb/が含まれない場合はocgを返す [covers:detect_card_game_type.ocg_url_explicit]', () => {
      expect(detectCardGameType('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1')).toBe('ocg');
    });

    it('url引数省略時はwindow.location.hrefをフォールバックとして使用する [covers:detect_card_game_type.default_to_location_href]', () => {
      setLocation('https://www.db.yugioh-card.com/rushdb/member_deck.action');
      expect(detectCardGameType()).toBe('rush');
    });
  });

  describe('getGamePath', () => {
    it("gameType==='rush'の場合はrushdbを返す [covers:get_game_path.rush_to_rushdb]", () => {
      expect(getGamePath('rush')).toBe('rushdb');
    });

    it("gameType==='ocg'の場合はyugiohdbを返す [covers:get_game_path.ocg_to_yugiohdb]", () => {
      expect(getGamePath('ocg')).toBe('yugiohdb');
    });
  });

  describe('isDeckDisplayPage', () => {
    it('デッキ表示ページ（ope=1）を正しく判定する [covers:is_deck_display_page.ope1_explicit_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(true);
    });

    it('opeパラメータが無い場合はope=1のデフォルトとみなしtrueを返す [covers:is_deck_display_page.no_ope_param_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action');
      expect(isDeckDisplayPage()).toBe(true);
    });

    it('デッキ編集ページ（ope=2）は対象外 [covers:is_deck_display_page.ope2_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckDisplayPage()).toBe(false);
    });

    it('yugiohdbパスが含まれていない場合は対象外', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/member_deck.action?ope=1');
      expect(isDeckDisplayPage()).toBe(false);
    });

    it('gameType引数が明示された場合はURL自動判定より優先される [covers:is_deck_display_page.game_type_param_overrides_url_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckDisplayPage('rush')).toBe(false);
    });
  });

  describe('isDeckEditPage', () => {
    it('デッキ編集ページ（ope=2）を正しく判定する [covers:is_deck_edit_page.ope2_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(true);
    });

    it('デッキ表示ページ（ope=1）は対象外 [covers:is_deck_edit_page.ope1_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=123');
      expect(isDeckEditPage()).toBe(false);
    });

    it('opeパラメータが無い場合はfalseを返す（デフォルト解釈なし） [covers:is_deck_edit_page.no_ope_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action');
      expect(isDeckEditPage()).toBe(false);
    });
  });

  describe('isDeckListPage', () => {
    it('デッキ一覧ページ（ope=4）を正しく判定する [covers:is_deck_list_page.ope4_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4');
      expect(isDeckListPage()).toBe(true);
    });

    it('他のopeは対象外 [covers:is_deck_list_page.other_ope_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isDeckListPage()).toBe(false);
    });
  });

  describe('isVueEditPage', () => {
    it('Vue編集ページ（#/ytomo/edit、末尾スラッシュありpathname）を正しく判定する [covers:is_vue_edit_page.pathname_trailing_slash_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('pathnameが末尾スラッシュなし（/yugiohdb）でも正しく判定する [covers:is_vue_edit_page.pathname_no_trailing_slash_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('pathnameが/rushdb/でも正しく判定する [covers:is_vue_edit_page.pathname_rushdb_true]', () => {
      setLocation('https://www.db.yugioh-card.com/rushdb/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(true);
    });

    it('URLパラメータがあっても正しく判定する [covers:is_vue_edit_page.hash_query_suffix_stripped_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/ytomo/edit?dno=123');
      expect(isVueEditPage()).toBe(true);
    });

    it('他のハッシュは対象外 [covers:is_vue_edit_page.hash_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/', '#/other/page');
      expect(isVueEditPage()).toBe(false);
    });

    it('hashが一致してもpathnameが対象外の場合はfalseを返す [covers:is_vue_edit_page.pathname_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/', '#/ytomo/edit');
      expect(isVueEditPage()).toBe(false);
    });
  });

  describe('isCardSearchPage', () => {
    it('カード検索ページを正しく判定する [covers:is_card_search_page.path_match_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is_card_search_page.path_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/card_search.action?ope=1');
      expect(isCardSearchPage()).toBe(false);
    });

    it('opeパラメータを見ないため、isCardDetailPageがtrueになるope=2でもtrueを返す [covers:is_card_search_page.ope_irrelevant_overlaps_detail_page_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12345');
      expect(isCardSearchPage()).toBe(true);
      expect(isCardDetailPage()).toBe(true);
    });
  });

  describe('isCardDetailPage', () => {
    it('カード詳細ページ（ope=2）を正しく判定する [covers:is_card_detail_page.ope2_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12345');
      expect(isCardDetailPage()).toBe(true);
    });

    it('カード検索ページ（ope=1）は対象外 [covers:is_card_detail_page.ope1_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1');
      expect(isCardDetailPage()).toBe(false);
    });
  });

  describe('isFAQSearchPage', () => {
    it('FAQ検索ページを正しく判定する [covers:is_faq_search_page.path_match_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is_faq_search_page.path_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/faq_search.action');
      expect(isFAQSearchPage()).toBe(false);
    });
  });

  describe('isFAQDetailPage', () => {
    it('FAQ詳細ページ（ope=5）を正しく判定する [covers:is_faq_detail_page.ope5_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115');
      expect(isFAQDetailPage()).toBe(true);
    });

    it('他のopeは対象外 [covers:is_faq_detail_page.other_ope_false]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12345');
      expect(isFAQDetailPage()).toBe(false);
    });
  });

  describe('isDeckSearchPage', () => {
    it('デッキ検索ページを正しく判定する [covers:is_deck_search_page.path_match_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja');
      expect(isDeckSearchPage()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is_deck_search_page.path_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/deck_search.action');
      expect(isDeckSearchPage()).toBe(false);
    });
  });

  describe('isYugiohDBSite', () => {
    it('遊戯王公式DBサイト内を正しく判定する [covers:is_yugioh_db_site.domain_and_path_match_true]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(true);
    });

    it('yugiohdbパスが含まれていない場合は対象外 [covers:is_yugioh_db_site.path_mismatch_false]', () => {
      setLocation('https://www.db.yugioh-card.com/othersystem/page.html');
      expect(isYugiohDBSite()).toBe(false);
    });

    it('他のドメインは対象外 [covers:is_yugioh_db_site.domain_mismatch_false]', () => {
      setLocation('https://example.com/yugiohdb/member_deck.action?ope=1');
      expect(isYugiohDBSite()).toBe(false);
    });
  });

  describe('getMyDeckCgid', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('マイデッキリンクがDOM上に存在しない場合はnullを返しconsole.warnする [covers:get_my_deck_cgid.link_not_found_null]', () => {
      clearFooterMyDeckLink();
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('リンクは存在するがhref属性が無い場合はnullを返す [covers:get_my_deck_cgid.href_missing_null]', () => {
      setFooterMyDeckLink(null);
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('hrefにcgidが含まれない場合はnullを返す [covers:get_my_deck_cgid.href_no_cgid_match_null]', () => {
      setFooterMyDeckLink('/yugiohdb/some_other_page.action');
      expect(getMyDeckCgid()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('hrefにcgidが含まれる場合はそのcgidを返す [covers:get_my_deck_cgid.href_cgid_match_returns_id]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      expect(getMyDeckCgid()).toBe('abc123');
    });
  });

  describe('getDeckCgid', () => {
    it('location.searchにcgidパラメータが存在する場合はその値を返す [covers:get_deck_cgid.param_present_returns_value]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=def456&dno=123');
      expect(getDeckCgid()).toBe('def456');
    });

    it('location.searchにcgidパラメータが存在しない場合はnullを返す [covers:get_deck_cgid.param_absent_returns_null]', () => {
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&dno=123');
      expect(getDeckCgid()).toBeNull();
    });
  });

  describe('isOwnDeck', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('自分のcgidが取得できない場合はfalseを返す [covers:is_own_deck.my_cgid_null_false]', () => {
      clearFooterMyDeckLink();
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=abc123');
      expect(isOwnDeck()).toBe(false);
    });

    it('デッキのcgidが取得できない場合はfalseを返す [covers:is_own_deck.deck_cgid_null_false]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1');
      expect(isOwnDeck()).toBe(false);
    });

    it('両cgidが取得できても値が異なる場合はfalseを返す [covers:is_own_deck.cgid_mismatch_false]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=xyz789');
      expect(isOwnDeck()).toBe(false);
    });

    it('両cgidが一致する場合はtrueを返す [covers:is_own_deck.cgid_match_true]', () => {
      setFooterMyDeckLink('/yugiohdb/member_deck.action?ope=4&cgid=abc123');
      setLocation('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=abc123');
      expect(isOwnDeck()).toBe(true);
    });
  });
});
