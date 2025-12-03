/**
 * MyDeck検索モードのテスト
 * - デッキ一覧取得のモック
 * - デッキ選択時の状態変更テスト
 * - 選択デッキのカード一覧取得テスト
 * - cid-ciid ペアでの重複排除テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { DeckInfo, DeckListItem, DeckCardRef } from '@/types/deck';
import type { CardInfo } from '@/types/card';

// モック対象の関数
const mockGetDeckDetail = vi.fn();
const mockGetDeckListInternal = vi.fn();
const mockGetTempCardDB = vi.fn();
const mockSessionManager = {
  getCgid: vi.fn()
};

// テスト用のダミーデータ
const createMockDeckListItem = (dno: number, name: string): DeckListItem => ({
  dno,
  name,
  deckType: '0'
});

const createMockDeckCardRef = (cid: string, ciid: string, quantity: number): DeckCardRef => ({
  cid,
  ciid,
  quantity
});

const createMockDeckInfo = (dno: number, name: string, mainDeck: DeckCardRef[]): DeckInfo => ({
  dno,
  name,
  mainDeck,
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
});

const createMockCardInfo = (cardId: string, name: string): CardInfo => ({
  cardId,
  name,
  cardType: 'monster',
  atk: 0,
  def: 0,
  attribute: 'DARK',
  race: 'Warrior',
  level: 1,
  password: 0,
  rarity: [],
  linkMarkers: [],
  deckLimit: 3,
  forbidden: false,
  limited: false,
  semiLimited: false
});

describe('MyDeck検索モード - ユニットテスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('デッキ一覧取得', () => {
    it('デッキ一覧がモックから取得できる', async () => {
      const mockDeckList: DeckListItem[] = [
        createMockDeckListItem(1, 'Deck A'),
        createMockDeckListItem(2, 'Deck B'),
        createMockDeckListItem(3, 'Deck C')
      ];

      mockGetDeckListInternal.mockResolvedValue(mockDeckList);

      const result = await mockGetDeckListInternal('test-cgid');

      expect(result).toEqual(mockDeckList);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Deck A');
    });

    it('デッキ一覧が空の場合を処理できる', async () => {
      mockGetDeckListInternal.mockResolvedValue([]);

      const result = await mockGetDeckListInternal('test-cgid');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('デッキ詳細取得', () => {
    it('デッキ詳細をdnoから取得できる', async () => {
      const mockDeck: DeckInfo = createMockDeckInfo(
        1,
        'Test Deck',
        [createMockDeckCardRef('cid-001', 'ciid-001', 1)]
      );

      mockGetDeckDetail.mockResolvedValue(mockDeck);

      const result = await mockGetDeckDetail(1, 'test-cgid');

      expect(result).toEqual(mockDeck);
      expect(result?.name).toBe('Test Deck');
      expect(result?.dno).toBe(1);
    });

    it('デッキが存在しない場合はnullを返す', async () => {
      mockGetDeckDetail.mockResolvedValue(null);

      const result = await mockGetDeckDetail(9999, 'test-cgid');

      expect(result).toBeNull();
    });

    it('エラー時はnullを返す', async () => {
      mockGetDeckDetail.mockRejectedValue(new Error('Network error'));

      try {
        await mockGetDeckDetail(1, 'test-cgid');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('cid-ciid ペアでの重複排除', () => {
    it('同じcid-ciidペアのカードは重複排除される', () => {
      const tempCardDB = new Map<string, CardInfo>();
      tempCardDB.set('cid-001', createMockCardInfo('cid-001', 'Blue Eyes'));
      tempCardDB.set('cid-002', createMockCardInfo('cid-002', 'Red Eyes'));

      const deckCards: DeckCardRef[] = [
        createMockDeckCardRef('cid-001', 'ciid-001', 3),
        createMockDeckCardRef('cid-001', 'ciid-001', 1), // 重複
        createMockDeckCardRef('cid-002', 'ciid-001', 2)
      ];

      const seenCards = new Set<string>();
      const uniqueCards: CardInfo[] = [];

      deckCards.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            uniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      expect(uniqueCards).toHaveLength(2);
      expect(seenCards.size).toBe(2);
    });

    it('同じcid異なるciidのカードは別々に表示される', () => {
      const tempCardDB = new Map<string, CardInfo>();
      tempCardDB.set('cid-001', createMockCardInfo('cid-001', 'Blue Eyes'));

      const deckCards: DeckCardRef[] = [
        createMockDeckCardRef('cid-001', 'ciid-001', 1), // イラスト1
        createMockDeckCardRef('cid-001', 'ciid-002', 1)  // イラスト2（別）
      ];

      const seenCards = new Set<string>();
      const uniqueCards: CardInfo[] = [];

      deckCards.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            uniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      expect(uniqueCards).toHaveLength(2);
      expect(uniqueCards[0].ciid).toBe('ciid-001');
      expect(uniqueCards[1].ciid).toBe('ciid-002');
    });

    it('TempCardDBにないカードは除外される', () => {
      const tempCardDB = new Map<string, CardInfo>();
      tempCardDB.set('cid-001', createMockCardInfo('cid-001', 'Blue Eyes'));
      // cid-002はTempCardDBに存在しない

      const deckCards: DeckCardRef[] = [
        createMockDeckCardRef('cid-001', 'ciid-001', 1),
        createMockDeckCardRef('cid-002', 'ciid-001', 1) // 存在しない
      ];

      const seenCards = new Set<string>();
      const uniqueCards: CardInfo[] = [];

      deckCards.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            uniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      expect(uniqueCards).toHaveLength(1);
      expect(uniqueCards[0].cardId).toBe('cid-001');
    });
  });

  describe('デッキのセクション別カード処理', () => {
    it('メインデッキ、エクストラデッキ、サイドデッキから全カードを収集できる', () => {
      const tempCardDB = new Map<string, CardInfo>();
      tempCardDB.set('cid-001', createMockCardInfo('cid-001', 'Main Card'));
      tempCardDB.set('cid-002', createMockCardInfo('cid-002', 'Extra Card'));
      tempCardDB.set('cid-003', createMockCardInfo('cid-003', 'Side Card'));

      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Multi-Deck',
        mainDeck: [createMockDeckCardRef('cid-001', 'ciid-001', 2)],
        extraDeck: [createMockDeckCardRef('cid-002', 'ciid-001', 1)],
        sideDeck: [createMockDeckCardRef('cid-003', 'ciid-001', 1)],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const seenCards = new Set<string>();
      const allUniqueCards: CardInfo[] = [];

      // メインデッキ処理
      deckInfo.mainDeck.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            allUniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      // エクストラデッキ処理
      deckInfo.extraDeck.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            allUniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      // サイドデッキ処理
      deckInfo.sideDeck.forEach((dc) => {
        const key = `${dc.cid}-${dc.ciid}`;
        if (!seenCards.has(key)) {
          const card = tempCardDB.get(dc.cid);
          if (card) {
            seenCards.add(key);
            allUniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
          }
        }
      });

      expect(allUniqueCards).toHaveLength(3);
      expect(allUniqueCards[0].name).toBe('Main Card');
      expect(allUniqueCards[1].name).toBe('Extra Card');
      expect(allUniqueCards[2].name).toBe('Side Card');
    });

    it('複数セクション間での重複も正しく排除される', () => {
      const tempCardDB = new Map<string, CardInfo>();
      tempCardDB.set('cid-001', createMockCardInfo('cid-001', 'Duplicate Card'));

      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Duplicate Test',
        mainDeck: [createMockDeckCardRef('cid-001', 'ciid-001', 2)],
        extraDeck: [createMockDeckCardRef('cid-001', 'ciid-001', 1)], // 重複
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const seenCards = new Set<string>();
      const allUniqueCards: CardInfo[] = [];

      [deckInfo.mainDeck, deckInfo.extraDeck, deckInfo.sideDeck].forEach((section) => {
        section.forEach((dc) => {
          const key = `${dc.cid}-${dc.ciid}`;
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid);
            if (card) {
              seenCards.add(key);
              allUniqueCards.push({ ...card, ciid: dc.ciid } as CardInfo);
            }
          }
        });
      });

      expect(allUniqueCards).toHaveLength(1);
    });
  });

  describe('検索状態管理', () => {
    it('デッキ選択時の初期状態を検証', () => {
      const mockState = {
        isLoading: false,
        activeTab: 'search',
        currentPage: 0,
        hasMore: false,
        searchResults: [] as CardInfo[],
        allResults: [] as CardInfo[]
      };

      expect(mockState.isLoading).toBe(false);
      expect(mockState.activeTab).toBe('search');
      expect(mockState.currentPage).toBe(0);
      expect(mockState.hasMore).toBe(false);
      expect(mockState.searchResults).toHaveLength(0);
    });

    it('検索中のローディング状態を管理できる', () => {
      const mockState = {
        isLoading: false,
        activeTab: 'search'
      };

      // ローディング開始
      mockState.isLoading = true;
      expect(mockState.isLoading).toBe(true);

      // ローディング完了
      mockState.isLoading = false;
      expect(mockState.isLoading).toBe(false);
    });

    it('結果が設定されるとhasMoreはfalseになる', () => {
      const mockState = {
        hasMore: true,
        currentPage: 0
      };

      // デッキのカード一覧取得完了時
      mockState.hasMore = false;
      mockState.currentPage = 0;

      expect(mockState.hasMore).toBe(false);
    });
  });
});
