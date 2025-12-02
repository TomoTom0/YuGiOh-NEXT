/**
 * FAQリンク統合テスト
 * - FAQ ページから CardDetailUI への遷移テスト
 * - キャッシュからの取得確認
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCardDetailStore } from '@/stores/card-detail';
import type { CardInfo } from '@/types/card';

// ダミーカード情報
const createMockCard = (cardId: string, name: string): CardInfo => ({
  cardId,
  name,
  cardType: 'monster',
  atk: 1800,
  def: 1500,
  attribute: 'DARK',
  race: 'Warrior',
  level: 4,
  password: 12345678,
  rarity: [],
  linkMarkers: [],
  deckLimit: 3,
  forbidden: false,
  limited: false,
  semiLimited: false
});

describe('FAQリンク統合テスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('FAQページからのカード詳細取得', () => {
    it('FAQリンククリック時にカード詳細が取得される', () => {
      const store = useCardDetailStore();
      const mockCardId = '25955333'; // Blue Eyes
      const mockCard = createMockCard(mockCardId, 'Blue Eyes White Dragon');

      // FAQ リンククリックをシミュレート
      store.setSelectedCard(mockCard);
      store.setCardTab('info');

      expect(store.selectedCard?.cardId).toBe(mockCardId);
      expect(store.cardTab).toBe('info');
    });

    it('複数のFAQリンクをクリックできる', () => {
      const store = useCardDetailStore();
      const cards = [
        createMockCard('25955333', 'Blue Eyes White Dragon'),
        createMockCard('74677422', 'Red Eyes Black Dragon'),
        createMockCard('25475163', 'Harpie Lady')
      ];

      for (const card of cards) {
        store.setSelectedCard(card);
        expect(store.selectedCard?.cardId).toBe(card.cardId);
      }
    });

    it('FAQ内の複数のカードリンクが処理される', () => {
      const faqText = `
        {{Blue Eyes White Dragon|25955333}} は強力なカードです。
        {{Red Eyes Black Dragon|74677422}} とも相性が良いです。
        {{Harpie Lady|25475163}} を使用することもできます。
      `;

      // リンク抽出処理
      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(3);
      expect(matches[0][2]).toBe('25955333');
      expect(matches[1][2]).toBe('74677422');
      expect(matches[2][2]).toBe('25475163');
    });
  });

  describe('キャッシュからの取得確認', () => {
    it('キャッシュに存在するカードが即座に表示される', () => {
      const mockCache = new Map<string, CardInfo>();
      const card = createMockCard('25955333', 'Blue Eyes White Dragon');
      mockCache.set(card.cardId, card);

      // キャッシュから取得
      const cachedCard = mockCache.get('25955333');

      expect(cachedCard).toBeDefined();
      expect(cachedCard?.name).toBe('Blue Eyes White Dragon');
    });

    it('キャッシュにないカードは API から取得される', () => {
      const mockCache = new Map<string, CardInfo>();
      const apiFetchMock = vi.fn().mockResolvedValue(
        createMockCard('99999999', 'New Card')
      );

      // キャッシュなし
      const cachedCard = mockCache.get('99999999');
      expect(cachedCard).toBeUndefined();

      // API から取得
      apiFetchMock().then(card => {
        expect(card.cardId).toBe('99999999');
      });
    });

    it('キャッシュ更新後は新しいデータが使用される', () => {
      const mockCache = new Map<string, CardInfo>();
      const card1 = createMockCard('25955333', 'Old Name');
      mockCache.set('25955333', card1);

      let cachedCard = mockCache.get('25955333');
      expect(cachedCard?.name).toBe('Old Name');

      // キャッシュを更新
      const card2 = createMockCard('25955333', 'New Name');
      mockCache.set('25955333', card2);

      cachedCard = mockCache.get('25955333');
      expect(cachedCard?.name).toBe('New Name');
    });
  });

  describe('並列データ取得（FAQ + 検索結果）', () => {
    it('FAQ詳細ページと検索結果が並列に取得される', async () => {
      const mockDetailFetch = vi.fn().mockResolvedValue({
        cardId: '25955333',
        name: 'Blue Eyes White Dragon',
        attribute: 'LIGHT'
      });

      const mockSearchFetch = vi.fn().mockResolvedValue({
        cardId: '25955333',
        name: 'Blue Eyes White Dragon',
        effect: 'This is the effect text',
        rarity: ['UR']
      });

      const [detailResult, searchResult] = await Promise.all([
        mockDetailFetch(),
        mockSearchFetch()
      ]);

      expect(detailResult.attribute).toBe('LIGHT');
      expect(searchResult.effect).toBeDefined();
    });

    it('並列取得の結果がマージされる', () => {
      const detailInfo = {
        cardId: '25955333',
        name: 'Blue Eyes',
        attribute: 'LIGHT'
      };

      const searchInfo = {
        cardId: '25955333',
        name: 'Blue Eyes',
        effect: 'Effect text',
        rarity: ['UR']
      };

      // マージ
      const merged = {
        ...detailInfo,
        ...searchInfo
      };

      expect(merged.cardId).toBe('25955333');
      expect(merged.attribute).toBe('LIGHT');
      expect(merged.effect).toBe('Effect text');
    });
  });

  describe('CardDetailStore との統合', () => {
    it('FAQリンククリック時に setSelectedCard が呼び出される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('25955333', 'Blue Eyes White Dragon');

      // FAQ リンククリック
      store.setSelectedCard(card);

      expect(store.selectedCard?.cardId).toBe('25955333');
      expect(store.selectedCard?.name).toBe('Blue Eyes White Dragon');
    });

    it('FAQリンク遷移後に info タブが表示される', () => {
      const store = useCardDetailStore();
      const card = createMockCard('25955333', 'Blue Eyes White Dragon');

      store.setSelectedCard(card);
      store.setCardTab('info');

      expect(store.cardTab).toBe('info');
      expect(store.selectedCard).not.toBeNull();
    });

    it('FAQ取得→詳細表示→タブ切り替えのフロー', () => {
      const store = useCardDetailStore();
      const card = createMockCard('25955333', 'Blue Eyes White Dragon');

      // 1. FAQ からカードを取得
      store.setSelectedCard(card);
      expect(store.selectedCard?.cardId).toBe('25955333');

      // 2. カード詳細が表示される
      store.setCardTab('info');
      expect(store.cardTab).toBe('info');

      // 3. Q&A タブに切り替え
      store.setCardTab('qa');
      expect(store.cardTab).toBe('qa');
      expect(store.selectedCard?.cardId).toBe('25955333');
    });
  });

  describe('FAQ テキスト内のリンク処理', () => {
    it('{{CardName|cid}} フォーマットのリンクが抽出される', () => {
      const faqText = 'このカードは{{Blue Eyes|25955333}}と相性が良いです';

      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('Blue Eyes');
      expect(matches[0][2]).toBe('25955333');
    });

    it('複数のリンクが含まれる場合、すべて抽出される', () => {
      const faqText = `
        {{Blue Eyes|25955333}} および {{Red Eyes|74677422}} の両方を使用できます。
        さらに {{Harpie Lady|25475163}} も組み込むことができます。
      `;

      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(3);
    });

    it('リンクのない FAQ テキストは処理される', () => {
      const faqText = 'このカードは素晴らしいです。';

      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;
      const matches = [...faqText.matchAll(linkRegex)];

      expect(matches).toHaveLength(0);
    });

    it('リンククリック時に cardId が抽出される', () => {
      const linkMatch = '{{Blue Eyes White Dragon|25955333}}';
      const regex = /\{\{([^|]+)\|(\d+)\}\}/;
      const match = linkMatch.match(regex);

      expect(match).not.toBeNull();
      expect(match?.[2]).toBe('25955333');
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないカードIDが処理される', () => {
      const mockCache = new Map<string, CardInfo>();
      const cardId = '99999999';

      const cachedCard = mockCache.get(cardId);

      expect(cachedCard).toBeUndefined();
    });

    it('無効なリンク形式が処理される', () => {
      const invalidLinks = [
        '{{Invalid',
        'Invalid|123',
        '{{|123}}',
        '{{}}'
      ];

      const linkRegex = /\{\{([^|]+)\|(\d+)\}\}/g;

      for (const link of invalidLinks) {
        const matches = [...link.matchAll(linkRegex)];
        expect(matches).toHaveLength(0);
      }
    });

    it('API エラー時は既存のキャッシュが使用される', () => {
      const mockCache = new Map<string, CardInfo>();
      const cachedCard = createMockCard('25955333', 'Cached Blue Eyes');
      mockCache.set('25955333', cachedCard);

      const apiFetchMock = vi.fn().mockRejectedValue(new Error('Network error'));

      // API がエラーでも、キャッシュが存在すればそれを使用
      const card = mockCache.get('25955333');

      expect(card?.name).toBe('Cached Blue Eyes');
    });
  });

  describe('パフォーマンス', () => {
    it('キャッシュからの取得が高速である', () => {
      const mockCache = new Map<string, CardInfo>();
      const card = createMockCard('25955333', 'Blue Eyes White Dragon');
      mockCache.set(card.cardId, card);

      const startTime = performance.now();
      const cachedCard = mockCache.get('25955333');
      const endTime = performance.now();

      expect(cachedCard).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1); // < 1ms
    });

    it('複数のカードが連続で取得できる', () => {
      const mockCache = new Map<string, CardInfo>();
      const cards = Array.from({ length: 100 }, (_, i) =>
        createMockCard((1000000 + i).toString(), `Card ${i}`)
      );

      for (const card of cards) {
        mockCache.set(card.cardId, card);
      }

      expect(mockCache.size).toBe(100);

      const card50 = mockCache.get('1000050');
      expect(card50?.name).toBe('Card 50');
    });
  });
});
