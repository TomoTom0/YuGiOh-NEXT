import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCardDetailDisplay } from '@/composables/useCardDetailDisplay';
import type { CardInfo } from '@/types/card';

// vi.hoisted でモック関数を定義することで、hoisting される vi.mock ファクトリ内から
// 安全に参照できる。各モック関数はジェネリクスでシグネチャを型付けし、as キャスト不要に。
const mocks = vi.hoisted(() => {
  type DeckStore = { activeTab: string };
  return {
    startLoadingCard: vi.fn<() => void>(),
    endLoadingCard: vi.fn<() => void>(),
    setSelectedCard: vi.fn<(card: CardInfo) => void>(),
    setCardTab: vi.fn<(tab: string) => void>(),
    getCardDetailWithCache: vi.fn(),
    detectLanguage: vi.fn<() => string>(() => 'ja'),
    deckStore: { activeTab: 'deck' } as DeckStore,
  };
});

vi.mock('@/api/card-search', () => ({
  getCardDetailWithCache: mocks.getCardDetailWithCache,
}));

vi.mock('@/stores/card-detail', () => ({
  useCardDetailStore: () => ({
    startLoadingCard: mocks.startLoadingCard,
    endLoadingCard: mocks.endLoadingCard,
    setSelectedCard: mocks.setSelectedCard,
    setCardTab: mocks.setCardTab,
  }),
}));

vi.mock('@/stores/deck-edit', () => ({
  useDeckEditStore: () => mocks.deckStore,
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: mocks.detectLanguage,
}));

// テスト用カードデータ。fullCard と fallbackCard で ciid を変えて区別可能に。
const fullCard: CardInfo = {
  cardId: '1234',
  ciid: '1',
  lang: 'ja',
  imgs: [{ ciid: '1', imgHash: 'hash1' }],
  name: 'テストカード',
  cardType: 'spell',
};

const fallbackCard: CardInfo = {
  cardId: '1234',
  ciid: '2',
  lang: 'ja',
  imgs: [{ ciid: '2', imgHash: 'hash2' }],
  name: 'テストカード',
  cardType: 'spell',
};

describe('useCardDetailDisplay', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deckStore.activeTab = 'deck';
    mocks.detectLanguage.mockReturnValue('ja');
    mocks.getCardDetailWithCache.mockResolvedValue({
      detail: { card: fullCard },
      isPartialFromError: false,
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('showCardDetail', () => {
    // [covers:showcarddetail.show_loading_starts_loading]
    it('showLoading=true の場合 startLoadingCard が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.startLoadingCard).toHaveBeenCalledTimes(1);
    });

    // [covers:showcarddetail.show_loading_false_skips_start_loading]
    it('showLoading 省略時は startLoadingCard は呼ばれない', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.startLoadingCard).not.toHaveBeenCalled();
    });

    // [covers:showcarddetail.fromFAQ_propagated_to_api]
    it('fromFAQ=true が getCardDetailWithCache の第5引数に渡される', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fromFAQ: true });
      expect(mocks.getCardDetailWithCache).toHaveBeenCalledWith(
        '1234',
        'ja',
        true,
        'release_desc',
        true
      );
    });

    // [covers:showcarddetail.fromFAQ_default_false_propagated]
    it('fromFAQ 省略時は getCardDetailWithCache の第5引数が false になる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.getCardDetailWithCache).toHaveBeenCalledWith(
        '1234',
        'ja',
        true,
        'release_desc',
        false
      );
    });

    // [covers:showcarddetail.success_fullcard_preserve_ciid_with_fallback]
    it('fullCard取得成功 + preserveCiid + fallbackCard の場合、ciid を fallbackCard.ciid で上書き', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
      expect(cardData.imgs).not.toBe(fullCard.imgs); // 別インスタンス
      expect(cardData.imgs).toEqual(fullCard.imgs); // 同じ要素
    });

    // [covers:showcarddetail.success_fullcard_no_overwrite_when_preserve_false]
    it('fullCard取得成功 + preserveCiid 省略時は fullCard がそのまま渡る', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard }); // preserveCiid 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fullCard); // 同じ参照（ciid は fullCard.ciid のまま）
      expect(cardData.ciid).toBe(fullCard.ciid); // '1'
    });

    // [covers:showcarddetail.success_fullcard_no_overwrite_when_fallback_absent]
    it('fullCard取得成功 + preserveCiid=true でも fallbackCard 無しなら fullCard がそのまま渡る', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { preserveCiid: true }); // fallbackCard 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fullCard);
      expect(cardData.ciid).toBe(fullCard.ciid); // '1'
    });

    // [covers:showcarddetail.no_fullcard_fallback_preserve_ciid]
    it('fullCard 無し + fallbackCard 有り + preserveCiid=true なら別インスタンスで ciid 維持', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).not.toBe(fallbackCard); // 別インスタンス
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
      expect(cardData.imgs).not.toBe(fallbackCard.imgs); // 別配列
    });

    // [covers:showcarddetail.no_fullcard_fallback_no_preserve]
    it('fullCard 無し + fallbackCard 有り + preserveCiid 省略時は fallbackCard 参照がそのまま渡る', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard }); // preserveCiid 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fallbackCard); // 同じ参照
    });

    // [covers:showcarddetail.no_fullcard_no_fallback_early_return]
    it('fullCard 無し + fallbackCard 無し なら console.error して早期return', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234'); // fallbackCard 省略
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('deck'); // 変更されていない
      expect(mocks.setCardTab).not.toHaveBeenCalled();
    });

    // [covers:showcarddetail.active_tab_set_to_card_on_success]
    it('正常系ルートでは deckStore.activeTab が "card" に設定される', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.deckStore.activeTab).toBe('card');
    });

    // [covers:showcarddetail.reset_card_tab_default_true]
    it('resetCardTab 省略時は setCardTab("info") が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.setCardTab).toHaveBeenCalledWith('info');
    });

    // [covers:showcarddetail.reset_card_tab_false_skips]
    it('resetCardTab=false 時は setCardTab は呼ばれない（activeTab="card" は設定される）', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { resetCardTab: false });
      expect(mocks.setCardTab).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('card');
    });

    // [covers:showcarddetail.catch_with_fallback_falls_back]
    it('例外発生 + fallbackCard 有りなら fallbackCard で setSelectedCard, activeTab, setCardTab を実行', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      expect(mocks.deckStore.activeTab).toBe('card');
      expect(mocks.setCardTab).toHaveBeenCalledWith('info'); // デフォルト
    });

    // [covers:showcarddetail.catch_preserve_ciid_in_fallback]
    it('例外発生 + fallbackCard + preserveCiid=true なら別インスタンスで ciid 維持', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).not.toBe(fallbackCard); // 別インスタンス
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
    });

    // [covers:showcarddetail.catch_without_fallback_no_state_change]
    it('例外発生 + fallbackCard 無しなら console.error のみで状態変更なし', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234'); // fallbackCard 省略
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('deck'); // 変更なし
      expect(mocks.setCardTab).not.toHaveBeenCalled();
    });

    // [covers:showcarddetail.finally_end_loading_when_showLoading]
    it('showLoading=true なら成功時に endLoadingCard が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.endLoadingCard).toHaveBeenCalledTimes(1);
    });

    // [covers:showcarddetail.finally_end_loading_when_showLoading]
    it('showLoading=true なら例外時にも endLoadingCard が呼ばれる（try-finally保証）', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.endLoadingCard).toHaveBeenCalledTimes(1);
    });

    // [covers:showcarddetail.finally_no_end_loading_when_showLoading_false]
    it('showLoading 省略時は endLoadingCard は呼ばれない', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.endLoadingCard).not.toHaveBeenCalled();
    });
  });
});
