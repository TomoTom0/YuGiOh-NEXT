/**
 * card-detail-ui.ts のテスト
 *
 * tests/design/card-detail-ui/conditions.toml (TASK-330) のconditionをカバーする。
 * モジュールレベルの状態(selectedCard/currentTab/parsedDeckInfo)を持つため、
 * 各テストで vi.resetModules() + 動的import により状態をリセットする。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';
import type { DeckInfo, DeckCardRef } from '@/types/deck';

const mockParseDeckDetail = vi.fn();
vi.mock('@/content/parser/deck-detail-parser', () => ({
  parseDeckDetail: (...args: unknown[]) => mockParseDeckDetail(...args)
}));

const mockTempCache = new Map<string, Record<string, unknown>>();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockTempCache.get(cid)
  })
}));

const mockGetCardDetailWithCache = vi.fn();
vi.mock('@/api/card-search', () => ({
  getCardDetailWithCache: (...args: unknown[]) => mockGetCardDetailWithCache(...args)
}));

const mockGetCardFAQList = vi.fn();
vi.mock('@/api/card-faq', () => ({
  getCardFAQList: (...args: unknown[]) => mockGetCardFAQList(...args)
}));

type CardDetailUIModule = typeof import('@/content/deck-display/card-detail-ui');

const makeDeckCardRef = (cid: string, ciid: string): DeckCardRef =>
  ({ cid, ciid, lang: 'ja', quantity: 1 }) as DeckCardRef;

const makeDeckInfo = (mainDeck: DeckCardRef[] = []): DeckInfo => ({
  dno: 1,
  name: 'テストデッキ',
  mainDeck,
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
});

function createTabButtonsDom(tabs: Array<'info' | 'qa'>): HTMLElement {
  const container = document.createElement('div');
  container.id = 'ygo-next-card-detail-container';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'ygo-next tab-btn';
    btn.setAttribute('data-tab', tab);
    container.appendChild(btn);
  });
  document.body.appendChild(container);
  return container;
}

function createCardInfoContent(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'ygo-next-card-info-content';
  document.body.appendChild(el);
  return el;
}

function createDeckImage(imgs: Array<{ src: string; id?: string }>): HTMLElement {
  const deckImage = document.createElement('div');
  deckImage.id = 'deck_image';
  imgs.forEach(({ src, id }) => {
    const img = document.createElement('img');
    img.src = src;
    if (id) img.id = id;
    deckImage.appendChild(img);
  });
  document.body.appendChild(deckImage);
  return deckImage;
}

const flush = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
};

describe('card-detail-ui.ts', () => {
  let mod: CardDetailUIModule;

  beforeEach(async () => {
    setActivePinia(createPinia());
    mockParseDeckDetail.mockReset().mockResolvedValue(makeDeckInfo());
    mockGetCardDetailWithCache.mockReset();
    mockGetCardFAQList.mockReset();
    mockTempCache.clear();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.resetModules();
    mod = await import('@/content/deck-display/card-detail-ui');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initCardDetailUI', () => {
    it('[covers:init_card_detail_ui.parse_success_no_skipped_no_warn] スキップカードが無い場合は警告しない', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('[covers:init_card_detail_ui.parse_success_with_skipped_cards_warns] スキップカードがある場合は件数と詳細を警告する', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockParseDeckDetail.mockResolvedValue({
        ...makeDeckInfo(),
        skippedCardsCount: 2,
        skippedCards: [
          { name: 'カードA', cid: '111', lang: 'ja' },
          { name: 'カードB', cid: '222', lang: 'ja' }
        ]
      });

      await mod.initCardDetailUI();

      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('[covers:init_card_detail_ui.parse_failure_sets_null_and_logs_error] パース失敗時はエラーをログしparsedDeckInfoをnullにする', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockParseDeckDetail.mockRejectedValue(new Error('parse failed'));

      await mod.initCardDetailUI();

      expect(errorSpy).toHaveBeenCalled();
      expect(mod.getParsedDeckInfo()).toBeNull();
    });

    it('[covers:init_card_detail_ui.tab_click_with_data_tab_calls_switch_tab][covers:switch_tab.updates_current_tab_and_active_class] data-tab付きボタンのクリックでタブが切り替わる', async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      createCardInfoContent();

      await mod.initCardDetailUI();
      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      const infoBtn = container.querySelector<HTMLElement>('[data-tab="info"]')!;
      infoBtn.classList.add('ygo-next-active');

      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mod.getCurrentTab()).toBe('qa');
      expect(qaBtn.classList.contains('ygo-next-active')).toBe(true);
      expect(infoBtn.classList.contains('ygo-next-active')).toBe(false);
    });

    it('[covers:init_card_detail_ui.tab_click_without_data_tab_noop] data-tab属性が無いボタンをクリックしてもタブは変わらない', async () => {
      const container = createTabButtonsDom(['info']);
      const btn = container.querySelector<HTMLElement>('.tab-btn')!;
      btn.removeAttribute('data-tab');
      createCardInfoContent();

      await mod.initCardDetailUI();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mod.getCurrentTab()).toBe('info');
    });

    it('[covers:init_card_detail_ui.tab_click_handler_error_caught] クリックハンドラ内の例外はcatchされthrowしない', async () => {
      const container = createTabButtonsDom(['info']);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // cardInfoContentを用意せず、内部処理でエラーになりうる状況でも例外が外に漏れないことを確認
      await mod.initCardDetailUI();
      const btn = container.querySelector<HTMLElement>('.tab-btn')!;

      expect(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      await flush();
      // updateTabContent内でcontentContainerが無くても早期returnするだけでエラーにはならない
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('getSelectedCard / getCurrentTab / getParsedDeckInfo', () => {
    it('[covers:get_selected_card.returns_module_state] selectedCardは再代入されないため常にnullを返す', async () => {
      await mod.initCardDetailUI();
      expect(mod.getSelectedCard()).toBeNull();
    });

    it('[covers:get_current_tab.returns_module_state] 初期状態のcurrentTabは"info"', () => {
      expect(mod.getCurrentTab()).toBe('info');
    });

    it('[covers:get_parsed_deck_info.returns_module_state] initCardDetailUI実行後、parseDeckDetailの結果を反映する', async () => {
      const deckInfo = makeDeckInfo([makeDeckCardRef('123', '1')]);
      mockParseDeckDetail.mockResolvedValue(deckInfo);

      await mod.initCardDetailUI();

      expect(mod.getParsedDeckInfo()).toEqual(deckInfo);
    });
  });

  describe('ensureParsedDeckInfo', () => {
    it('[covers:ensure_parsed_deck_info.cache_hit_skips_reparse] 既にパース済みなら再パースしない', async () => {
      const deckInfo = makeDeckInfo();
      mockParseDeckDetail.mockResolvedValue(deckInfo);
      await mod.initCardDetailUI();
      mockParseDeckDetail.mockClear();

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toEqual(deckInfo);
      expect(mockParseDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:ensure_parsed_deck_info.null_triggers_parse] 未パースならparseDeckDetailを呼び結果を返す', async () => {
      const deckInfo = makeDeckInfo([makeDeckCardRef('999', '1')]);
      mockParseDeckDetail.mockResolvedValue(deckInfo);

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toEqual(deckInfo);
      expect(mockParseDeckDetail).toHaveBeenCalledTimes(1);
    });

    it('[covers:ensure_parsed_deck_info.parse_error_returns_null] パース失敗時はnullを返す', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockParseDeckDetail.mockRejectedValue(new Error('parse failed'));

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toBeNull();
    });
  });

  describe('findCardInParsedDeck / attachCardClickHandlers (initCardDetailUI経由)', () => {
    it('[covers:attach_card_click_handlers.no_deck_image_returns_early] #deck_imageが無い場合エラーにならない', async () => {
      await expect(mod.initCardDetailUI()).resolves.toBeUndefined();
    });

    it('[covers:find_card_in_parsed_deck.cid_not_in_any_section_returns_null][covers:attach_card_click_handlers.click_card_not_found_logs_error] デッキに無いcidをクリックするとエラーログのみでselectCardは呼ばれない', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=9999&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('[CardDetailUI] Card not found in parsed deck:', '9999');
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('[covers:find_card_in_parsed_deck.not_in_tempcache_logs_error_returns_null] デッキにはあるがTempCacheDBに無いcidはエラーログのみでselectCardは呼ばれない', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      // mockTempCacheに123を登録しない
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('[CardDetailUI] Card not found in TempCacheDB:', '123');
    });

    it('[covers:find_card_in_parsed_deck.found_returns_merged_card_with_ciid][covers:attach_card_click_handlers.click_card_found_calls_select_card][covers:select_card.success_fetches_and_sets_store] 有効なcidをクリックするとselectCardが呼ばれstoreに反映される', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { cardId: '123', name: 'テストカード', ciid: '1' });
      mockGetCardDetailWithCache.mockResolvedValue({
        detail: { card: { cardId: '123', name: 'テストカード（詳細）' } }
      });

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      const store = useCardDetailStore();
      expect(store.selectedCard).toMatchObject({ cardId: '123', name: 'テストカード（詳細）' });
      expect(store.cardTab).toBe('info');
    });

    it('[covers:attach_card_click_handlers.click_extracts_ciid_from_id_pattern] img idからciidが抽出されデッキのciidを上書きする', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1', id: 'card_image_0_3' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { cardId: '123', name: 'テストカード', ciid: '1' });
      mockGetCardDetailWithCache.mockResolvedValue({ detail: { card: { cardId: '123' } } });

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      const store = useCardDetailStore();
      expect(store.selectedCard?.ciid).toBe('3');
    });

    it('[covers:attach_card_click_handlers.click_no_cid_match_skips_lookup] srcにcidが含まれない場合はselectCardを呼ばない', async () => {
      createDeckImage([{ src: '/images/no_cid_here.png' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardDetailWithCache).not.toHaveBeenCalled();
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('[covers:attach_card_click_handlers.filters_to_card_images_when_found] "/card/"を含むimgのみにハンドラが追加される', async () => {
      createDeckImage([
        { src: '/other/image.png' },
        { src: '/yugiohdb/images/card/card_image.png?cid=123' }
      ]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();

      const imgs = document.querySelectorAll('img');
      expect(imgs[0].hasAttribute('data-click-handler-added')).toBe(false);
      expect(imgs[1].hasAttribute('data-click-handler-added')).toBe(true);
    });

    it('[covers:attach_card_click_handlers.falls_back_to_all_images_when_none_match] "/card/"を含むimgが無い場合は全imgにハンドラが追加される', async () => {
      createDeckImage([{ src: '/other/image.png' }, { src: '/other/image2.png' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();

      const imgs = document.querySelectorAll('img');
      imgs.forEach(img => {
        expect(img.hasAttribute('data-click-handler-added')).toBe(true);
      });
    });

    it('[covers:attach_card_click_handlers.skips_already_handled_images] 既にハンドラが付いたimgには重複してハンドラを追加しない', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { cardId: '123', ciid: '1' });
      mockGetCardDetailWithCache.mockResolvedValue({ detail: { card: { cardId: '123' } } });

      await mod.initCardDetailUI();
      await mod.initCardDetailUI(); // 2回目: 既存ハンドラは再登録されない

      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardDetailWithCache).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectCard (attachCardClickHandlers経由)', () => {
    it('[covers:select_card.partial_from_error_still_proceeds_with_warn] isPartialFromErrorの場合も警告しつつstoreに設定する', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { cardId: '123', ciid: '1' });
      mockGetCardDetailWithCache.mockResolvedValue({
        isPartialFromError: true,
        detail: { card: { cardId: '123', name: '不完全なデータ' } }
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(warnSpy).toHaveBeenCalledWith(
        '[CardDetailUI] Card info may be incomplete due to API error for cardId:',
        '123'
      );
      const store = useCardDetailStore();
      expect(store.selectedCard).toMatchObject({ cardId: '123' });
    });

    it('[covers:select_card.imgs_and_ciid_fallback_preference] fullCard.imgsが無い場合cardInfo.imgsを使い、ciidはcardInfo優先', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=9' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '9')]));
      mockTempCache.set('123', { cardId: '123', ciid: '9', imgs: [{ ciid: '9', imgHash: 'h' }] });
      mockGetCardDetailWithCache.mockResolvedValue({
        detail: { card: { cardId: '123' } } // imgs/ciidを持たない
      });

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      const store = useCardDetailStore();
      expect(store.selectedCard?.ciid).toBe('9');
      expect(store.selectedCard?.imgs).toEqual([{ ciid: '9', imgHash: 'h' }]);
    });

    it('[covers:select_card.api_error_falls_back_to_cardinfo_only] API取得失敗時はcardInfoのみでstoreに設定しendLoadingCardも呼ばれる', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { cardId: '123', name: 'フォールバック名', ciid: '1' });
      mockGetCardDetailWithCache.mockRejectedValue(new Error('api failed'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const store = useCardDetailStore();
      const endLoadingSpy = vi.spyOn(store, 'endLoadingCard');

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(errorSpy).toHaveBeenCalled();
      expect(store.selectedCard).toMatchObject({ cardId: '123', name: 'フォールバック名' });
      expect(store.cardTab).toBe('info');
      expect(endLoadingSpy).toHaveBeenCalled();
    });
  });

  describe('updateTabContent', () => {
    it('[covers:update_tab_content.no_container_returns] cardInfoContentが無い場合エラーにならない', async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      // cardInfoContentは意図的に作らない
      await mod.initCardDetailUI();
      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;

      expect(() => qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      await flush();
    });

    it('[covers:update_tab_content.no_selected_card_shows_placeholder] selectedCardが無い場合は案内文を表示する（現状常にこの状態）', async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      const content = createCardInfoContent();

      await mod.initCardDetailUI();
      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(content.innerHTML).toContain('カードを選択してください');
    });
  });
});
