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
    it('[covers:showcarddetail.show-loading-starts-loading] showLoading=true の場合 startLoadingCard が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.startLoadingCard).toHaveBeenCalledTimes(1);
    });

    it('[covers:showcarddetail.show-loading-false-skips-start-loading] showLoading 省略時は startLoadingCard は呼ばれない', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.startLoadingCard).not.toHaveBeenCalled();
    });

    it('[covers:showcarddetail.from-faq-propagated-to-api] fromFAQ=true が getCardDetailWithCache の第5引数に渡される', async () => {
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

    it('[covers:showcarddetail.from-faq-default-false-propagated] fromFAQ 省略時は getCardDetailWithCache の第5引数が false になる', async () => {
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

    it('[covers:showcarddetail.success-fullcard-preserve-ciid-with-fallback] fullCard取得成功 + preserveCiid + fallbackCard の場合、ciid を fallbackCard.ciid で上書き', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
      expect(cardData.imgs).not.toBe(fullCard.imgs); // 別インスタンス
      expect(cardData.imgs).toEqual(fullCard.imgs); // 同じ要素
    });

    it('[covers:showcarddetail.success-fullcard-no-overwrite-when-preserve-false] fullCard取得成功 + preserveCiid 省略時は fullCard がそのまま渡る', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard }); // preserveCiid 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fullCard); // 同じ参照（ciid は fullCard.ciid のまま）
      expect(cardData.ciid).toBe(fullCard.ciid); // '1'
    });

    it('[covers:showcarddetail.success-fullcard-no-overwrite-when-fallback-absent] fullCard取得成功 + preserveCiid=true でも fallbackCard 無しなら fullCard がそのまま渡る', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { preserveCiid: true }); // fallbackCard 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fullCard);
      expect(cardData.ciid).toBe(fullCard.ciid); // '1'
    });

    it('[covers:showcarddetail.no-fullcard-fallback-preserve-ciid] fullCard 無し + fallbackCard 有り + preserveCiid=true なら別インスタンスで ciid 維持', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).not.toBe(fallbackCard); // 別インスタンス
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
      expect(cardData.imgs).not.toBe(fallbackCard.imgs); // 別配列
    });

    it('[covers:showcarddetail.no-fullcard-fallback-no-preserve] fullCard 無し + fallbackCard 有り + preserveCiid 省略時は fallbackCard 参照がそのまま渡る', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard }); // preserveCiid 省略
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).toBe(fallbackCard); // 同じ参照
    });

    it('[covers:showcarddetail.no-fullcard-no-fallback-early-return] fullCard 無し + fallbackCard 無し なら console.error して早期return', async () => {
      mocks.getCardDetailWithCache.mockResolvedValue({ detail: null });
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234'); // fallbackCard 省略
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('deck'); // 変更されていない
      expect(mocks.setCardTab).not.toHaveBeenCalled();
    });

    it('[covers:showcarddetail.active-tab-set-to-card-on-success] 正常系ルートでは deckStore.activeTab が "card" に設定される', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.deckStore.activeTab).toBe('card');
    });

    it('[covers:showcarddetail.reset-card-tab-default-true] resetCardTab 省略時は setCardTab("info") が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.setCardTab).toHaveBeenCalledWith('info');
    });

    it('[covers:showcarddetail.reset-card-tab-false-skips] resetCardTab=false 時は setCardTab は呼ばれない（activeTab="card" は設定される）', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { resetCardTab: false });
      expect(mocks.setCardTab).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('card');
    });

    it('[covers:showcarddetail.catch-with-fallback-falls-back] 例外発生 + fallbackCard 有りなら fallbackCard で setSelectedCard, activeTab, setCardTab を実行', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      expect(mocks.deckStore.activeTab).toBe('card');
      expect(mocks.setCardTab).toHaveBeenCalledWith('info'); // デフォルト
    });

    it('[covers:showcarddetail.catch-preserve-ciid-in-fallback] 例外発生 + fallbackCard + preserveCiid=true なら別インスタンスで ciid 維持', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { fallbackCard, preserveCiid: true });
      expect(mocks.setSelectedCard).toHaveBeenCalledTimes(1);
      const cardData = mocks.setSelectedCard.mock.calls[0][0];
      expect(cardData).not.toBe(fallbackCard); // 別インスタンス
      expect(cardData.ciid).toBe(fallbackCard.ciid); // '2'
    });

    it('[covers:showcarddetail.catch-without-fallback-no-state-change] 例外発生 + fallbackCard 無しなら console.error のみで状態変更なし', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234'); // fallbackCard 省略
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mocks.setSelectedCard).not.toHaveBeenCalled();
      expect(mocks.deckStore.activeTab).toBe('deck'); // 変更なし
      expect(mocks.setCardTab).not.toHaveBeenCalled();
    });

    it('[covers:showcarddetail.finally-end-loading-when-show-loading] showLoading=true なら成功時に endLoadingCard が呼ばれる', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.endLoadingCard).toHaveBeenCalledTimes(1);
    });

    it('[covers:showcarddetail.finally-end-loading-when-show-loading] showLoading=true なら例外時にも endLoadingCard が呼ばれる（try-finally保証）', async () => {
      mocks.getCardDetailWithCache.mockRejectedValue(new Error('API Error'));
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234', { showLoading: true });
      expect(mocks.endLoadingCard).toHaveBeenCalledTimes(1);
    });

    it('[covers:showcarddetail.finally-no-end-loading-when-show-loading-false] showLoading 省略時は endLoadingCard は呼ばれない', async () => {
      const { showCardDetail } = useCardDetailDisplay();
      await showCardDetail('1234');
      expect(mocks.endLoadingCard).not.toHaveBeenCalled();
    });
  });
});
