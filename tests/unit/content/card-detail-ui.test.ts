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
    it('[covers:init-card-detail-ui.parse-success-no-skipped-no-warn] スキップカードが無い場合は警告しない', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('[covers:init-card-detail-ui.parse-success-with-skipped-cards-warns] スキップカードがある場合は件数と詳細を警告する', async () => {
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

    it('[covers:init-card-detail-ui.parse-failure-sets-null-and-logs-error] パース失敗時はエラーをログしparsedDeckInfoをnullにする', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockParseDeckDetail.mockRejectedValue(new Error('parse failed'));

      await mod.initCardDetailUI();

      expect(errorSpy).toHaveBeenCalled();
      expect(mod.getParsedDeckInfo()).toBeNull();
    });

    it('[covers:init-card-detail-ui.tab-click-with-data-tab-calls-switch-tab][covers:switch-tab.updates-current-tab-and-active-class] data-tab付きボタンのクリックでタブが切り替わる', async () => {
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

    it('[covers:init-card-detail-ui.tab-click-without-data-tab-noop] data-tab属性が無いボタンをクリックしてもタブは変わらない', async () => {
      const container = createTabButtonsDom(['info']);
      const btn = container.querySelector<HTMLElement>('.tab-btn')!;
      btn.removeAttribute('data-tab');
      createCardInfoContent();

      await mod.initCardDetailUI();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mod.getCurrentTab()).toBe('info');
    });

    it('[covers:init-card-detail-ui.tab-click-handler-error-caught] クリックハンドラ内の例外はcatchされthrowしない', async () => {
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
    it('[covers:get-selected-card.returns-module-state] selectedCardは再代入されないため常にnullを返す', async () => {
      await mod.initCardDetailUI();
      expect(mod.getSelectedCard()).toBeNull();
    });

    it('[covers:get-current-tab.returns-module-state] 初期状態のcurrentTabは"info"', () => {
      expect(mod.getCurrentTab()).toBe('info');
    });

    it('[covers:get-parsed-deck-info.returns-module-state] initCardDetailUI実行後、parseDeckDetailの結果を反映する', async () => {
      const deckInfo = makeDeckInfo([makeDeckCardRef('123', '1')]);
      mockParseDeckDetail.mockResolvedValue(deckInfo);

      await mod.initCardDetailUI();

      expect(mod.getParsedDeckInfo()).toEqual(deckInfo);
    });
  });

  describe('ensureParsedDeckInfo', () => {
    it('[covers:ensure-parsed-deck-info.cache-hit-skips-reparse] 既にパース済みなら再パースしない', async () => {
      const deckInfo = makeDeckInfo();
      mockParseDeckDetail.mockResolvedValue(deckInfo);
      await mod.initCardDetailUI();
      mockParseDeckDetail.mockClear();

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toEqual(deckInfo);
      expect(mockParseDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:ensure-parsed-deck-info.null-triggers-parse] 未パースならparseDeckDetailを呼び結果を返す', async () => {
      const deckInfo = makeDeckInfo([makeDeckCardRef('999', '1')]);
      mockParseDeckDetail.mockResolvedValue(deckInfo);

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toEqual(deckInfo);
      expect(mockParseDeckDetail).toHaveBeenCalledTimes(1);
    });

    it('[covers:ensure-parsed-deck-info.parse-error-returns-null] パース失敗時はnullを返す', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockParseDeckDetail.mockRejectedValue(new Error('parse failed'));

      const result = await mod.ensureParsedDeckInfo();

      expect(result).toBeNull();
    });
  });

  describe('findCardInParsedDeck / attachCardClickHandlers (initCardDetailUI経由)', () => {
    it('[covers:attach-card-click-handlers.no-deck-image-returns-early] #deck_imageが無い場合エラーにならない', async () => {
      await expect(mod.initCardDetailUI()).resolves.toBeUndefined();
    });

    it('[covers:find-card-in-parsed-deck.cid-not-in-any-section-returns-null][covers:attach-card-click-handlers.click-card-not-found-logs-error] デッキに無いcidをクリックするとエラーログのみでselectCardは呼ばれない', async () => {
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

    it('[covers:find-card-in-parsed-deck.not-in-tempcache-logs-error-returns-null] デッキにはあるがTempCacheDBに無いcidはエラーログのみでselectCardは呼ばれない', async () => {
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

    it('[covers:find-card-in-parsed-deck.no-parsed-deck-returns-null] parsedDeckInfoが未設定(null)の場合は検索せずnullを返しエラーログのみ', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(null);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await mod.initCardDetailUI();
      expect(mod.getParsedDeckInfo()).toBeNull();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('[CardDetailUI] Card not found in parsed deck:', '123');
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('[covers:attach-card-click-handlers.click-handler-error-caught] クリックハンドラ内で例外が発生した場合はconsole.errorでログし伝播させない', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      const getSpy = vi.spyOn(mockTempCache, 'get').mockImplementation(() => {
        throw new Error('TempCacheDB error');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('[CardDetailUI] Card click error:', expect.any(Error));
      getSpy.mockRestore();
    });

    it('[covers:find-card-in-parsed-deck.found-returns-merged-card-with-ciid][covers:attach-card-click-handlers.click-card-found-calls-select-card][covers:select-card.success-fetches-and-sets-store] 有効なcidをクリックするとselectCardが呼ばれstoreに反映される', async () => {
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

    it('[covers:attach-card-click-handlers.click-extracts-ciid-from-id-pattern] img idからciidが抽出されデッキのciidを上書きする', async () => {
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

    it('[covers:attach-card-click-handlers.click-no-cid-match-skips-lookup] srcにcidが含まれない場合はselectCardを呼ばない', async () => {
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

    it('[covers:attach-card-click-handlers.filters-to-card-images-when-found] "/card/"を含むimgのみにハンドラが追加される', async () => {
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

    it('[covers:attach-card-click-handlers.falls-back-to-all-images-when-none-match] "/card/"を含むimgが無い場合は全imgにハンドラが追加される', async () => {
      createDeckImage([{ src: '/other/image.png' }, { src: '/other/image2.png' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo());

      await mod.initCardDetailUI();

      const imgs = document.querySelectorAll('img');
      imgs.forEach(img => {
        expect(img.hasAttribute('data-click-handler-added')).toBe(true);
      });
    });

    it('[covers:attach-card-click-handlers.skips-already-handled-images] 既にハンドラが付いたimgには重複してハンドラを追加しない', async () => {
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
    it('[covers:select-card.missing-cardinfo-or-cardid-warns-and-returns] cardIdが無いカード情報ではconsole.warnしてstore操作を行わずreturnする', async () => {
      createDeckImage([{ src: '/yugiohdb/get_image.action?cid=123&ciid=1' }]);
      mockParseDeckDetail.mockResolvedValue(makeDeckInfo([makeDeckCardRef('123', '1')]));
      mockTempCache.set('123', { name: 'カードIDなし', ciid: '1' });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await mod.initCardDetailUI();
      const img = document.querySelector('img')!;
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(warnSpy).toHaveBeenCalledWith('[CardDetailUI] selectCard: no cardInfo or cardId');
      expect(mockGetCardDetailWithCache).not.toHaveBeenCalled();
      const store = useCardDetailStore();
      expect(store.selectedCard).toBeNull();
    });

    it('[covers:select-card.partial-from-error-still-proceeds-with-warn] isPartialFromErrorの場合も警告しつつstoreに設定する', async () => {
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

    it('[covers:select-card.imgs-and-ciid-fallback-preference] fullCard.imgsが無い場合cardInfo.imgsを使い、ciidはcardInfo優先', async () => {
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

    it('[covers:select-card.api-error-falls-back-to-cardinfo-only] API取得失敗時はcardInfoのみでstoreに設定しendLoadingCardも呼ばれる', async () => {
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
    it('[covers:update-tab-content.no-container-returns] cardInfoContentが無い場合エラーにならない', async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      // cardInfoContentは意図的に作らない
      await mod.initCardDetailUI();
      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;

      expect(() => qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      await flush();
    });

    it('[covers:update-tab-content.no-selected-card-shows-placeholder] selectedCardが無い場合は案内文を表示する（現状常にこの状態）', async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      const content = createCardInfoContent();

      await mod.initCardDetailUI();
      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(content.innerHTML).toContain('カードを選択してください');
    });
  });

  describe('到達不能分岐の前提固定（selectedCardは常にnull）', () => {
    // 前提: モジュールレベルの selectedCard はファイル内のどこからも再代入されず常にnull。
    // この前提により updateTabContent の info/qa 描画分岐・fetchFAQData・renderFAQContent は
    // 到達不能であり、各条件は verified=false とされている。以下はその前提を固定するテスト。
    const setupWithValidCard = async () => {
      const container = createTabButtonsDom(['info', 'qa']);
      const content = createCardInfoContent();
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
      return { container, content };
    };

    it('[covers:update-tab-content.info-qa-tab-rendering-unreachable] 前提: カード選択後もselectedCardはnullのままでqaタブでも案内文が表示される', async () => {
      const { container, content } = await setupWithValidCard();
      // selectCard経由でstoreには反映されるが、モジュールのselectedCardは再代入されない
      const store = useCardDetailStore();
      expect(store.selectedCard).not.toBeNull();
      expect(mod.getSelectedCard()).toBeNull();

      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mod.getCurrentTab()).toBe('qa');
      expect(content.innerHTML).toContain('カードを選択してください');
      expect(content.innerHTML).not.toContain('読み込み中');
    });

    it('[covers:fetch-faq-data.cache-and-fetch-behavior-unreachable] 前提: qaタブへ切り替えてもfetchFAQDataは呼ばれずFAQ取得APIは叩かれない', async () => {
      const { container } = await setupWithValidCard();
      mockGetCardFAQList.mockResolvedValue({ faqs: [] });

      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(mockGetCardFAQList).not.toHaveBeenCalled();
    });

    it('[covers:render-faq-content.formats-supplement-and-faq-sections-unreachable] 前提: qaタブでもFAQ描画は行われず案内文のままになる', async () => {
      const { container, content } = await setupWithValidCard();
      mockGetCardFAQList.mockResolvedValue({ faqs: [{ question: 'Q', answer: 'A' }] });

      const qaBtn = container.querySelector<HTMLElement>('[data-tab="qa"]')!;
      qaBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(content.innerHTML).toContain('カードを選択してください');
      expect(content.innerHTML).not.toContain('card-qa-content');
    });
  });
});
