import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createNewDeckInternal, saveDeckInternal, deleteDeckInternal, getDeckDetail, getDeckListInternal } from '../deck-operations';
import { DeckInfo } from '@/types/deck';
import axios from 'axios';

// axiosをモック
vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

// ytkn-fetcherをモック
vi.mock('@/utils/ytkn-fetcher', () => {
  return {
    fetchYtknFromDeckList: vi.fn().mockResolvedValue('mock-ytkn'),
    fetchYtknFromEditForm: vi.fn().mockResolvedValue('mock-ytkn'),
  };
});

// parseDeckListをモック
vi.mock('@/content/parser/deck-list-parser', () => {
  return {
    parseDeckList: vi.fn().mockReturnValue([
      { dno: 10, name: 'Test Deck' }
    ]),
  };
});

// detectLanguageをモック
vi.mock('@/utils/language-detector', () => {
  return {
    detectLanguage: vi.fn().mockReturnValue('ja'),
  };
});

/**
 * デッキ操作API関数のテスト
 */
describe('デッキ操作API', () => {
  const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';
  const testCgid = 'a'.repeat(32);
  const testYtkn = 'b'.repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNewDeckInternal', () => {
    it('新規デッキを作成し、デッキ番号を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <input type="hidden" name="dno" value="10">
          </body>
        </html>
      `;
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse
      });

      const result = await createNewDeckInternal(testCgid);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`${BASE_URL}?ope=6&wname=MemberDeck&cgid=${testCgid}`),
        expect.any(Object)
      );
      expect(result).toBe(10);
    });

    it('デッキ番号が取得できない場合は0を返す', async () => {
      const mockResponse = '<html><body></body></html>';
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse
      });

      const result = await createNewDeckInternal(testCgid);

      expect(result).toBe(0);
    });

    it('axiosが失敗した場合は0を返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await createNewDeckInternal(testCgid);

      expect(result).toBe(0);
    });
  });


  describe('saveDeckInternal', () => {
    it('デッキを保存し、成功結果を返す', async () => {
      const deckData: DeckInfo = {
        dno: 4,
        name: 'テストデッキ',
        mainDeck: [
          {
            card: {
              name: 'ブラック・マジシャン',
              cardId: '12345',
              ciid: '1',
              imgs: [{ ciid: '1', imgHash: '12345_1_1_1' }],
              cardType: 'monster' as const,
              attribute: 'dark' as const,
              levelType: 'level' as const,
              levelValue: 7,
              race: 'spellcaster' as const,
              types: ['normal' as const],
              isExtraDeck: false
            },
            quantity: 2
          }
        ],
        extraDeck: [],
        sideDeck: [],
        isPublic: true,
        deckType: 1,
        comment: 'テストコメント'
      };

      // saveDeckInternalはJSONレスポンスを期待（data.resultで成功判定）
      vi.mocked(axios.post).mockResolvedValue({
        data: { result: true }
      });

      const result = await saveDeckInternal(testCgid, 4, deckData, testYtkn);

      expect(axios.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('エラーがある場合は失敗結果を返す', async () => {
      const deckData: DeckInfo = {
        dno: 4,
        name: '',
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      // saveDeckInternalはJSONレスポンスを期待（data.errorでエラー判定）
      vi.mocked(axios.post).mockResolvedValue({
        data: { result: false, error: ['エラー1', 'エラー2'] }
      });

      const result = await saveDeckInternal(testCgid, 4, deckData, testYtkn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('エラー1');
    });
  });

  describe('deleteDeckInternal', () => {
    it('デッキを削除し、成功結果を返す', async () => {
      // fetchYtknFromEditFormが成功するようにモック
      const { fetchYtknFromEditForm } = await import('@/utils/ytkn-fetcher');
      vi.mocked(fetchYtknFromEditForm).mockResolvedValueOnce('test-ytkn');

      const mockResponse = `
        <html>
          <body>
            <div class="success">削除しました</div>
          </body>
        </html>
      `;
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse,
        status: 200
      } as any);

      const result = await deleteDeckInternal(testCgid, 4);

      expect(result).toBe(true);
    });

    it('ytknの取得に失敗した場合はfalseを返す', async () => {
      const { fetchYtknFromEditForm } = await import('@/utils/ytkn-fetcher');
      vi.mocked(fetchYtknFromEditForm).mockResolvedValueOnce('');

      const result = await deleteDeckInternal(testCgid, 4);

      expect(result).toBe(false);
    });

    it('削除リクエストが失敗した場合はfalseを返す', async () => {
      const { fetchYtknFromEditForm } = await import('@/utils/ytkn-fetcher');
      vi.mocked(fetchYtknFromEditForm).mockResolvedValueOnce('test-ytkn');
      vi.mocked(axios.get).mockResolvedValue({
        data: '<html></html>',
        status: 500
      } as any);

      const result = await deleteDeckInternal(testCgid, 4);

      expect(result).toBe(false);
    });
  });

  describe('getDeckDetail', () => {
    it('正常にHTMLを取得してデッキ詳細をリクエストする', async () => {
      const mockResponse = `<html><body></body></html>`;
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse
      });

      // parseDeckDetailがモック化されているので、結果は依存する
      const result = await getDeckDetail(95);

      // APIリクエストが正しいパラメータで行われたかをチェック
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('ope=1&dno=95'),
        expect.any(Object)
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        { withCredentials: true }
      );
    });

    it('cgidパラメータがある場合は含める', async () => {
      const mockResponse = `<html><body></body></html>`;
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse
      });

      await getDeckDetail(4, testCgid);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`ope=1&dno=4&cgid=${testCgid}`),
        expect.any(Object)
      );
    });

    it('デッキ取得失敗時はnullを返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await getDeckDetail(999);

      expect(result).toBeNull();
    });
  });

  describe('getDeckListInternal', () => {
    it('正しいパラメータでマイデッキ一覧をリクエストする', async () => {
      const mockResponse = `<html><body></body></html>`;
      vi.mocked(axios.get).mockResolvedValue({
        data: mockResponse
      });

      await getDeckListInternal(testCgid);

      // APIリクエストが正しいパラメータで行われたかをチェック
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`ope=4&cgid=${testCgid}`),
        expect.objectContaining({ withCredentials: true })
      );
    });

    it('デッキ一覧取得失敗時は空配列を返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await getDeckListInternal(testCgid);

      expect(result).toEqual([]);
    });
  });

  describe('saveDeckInternal - 詳細なFormDataテスト', () => {
    it('メインデッキの複数カード型を正しくFormDataに追加する', async () => {
      const deckData: DeckInfo = {
        dno: 5,
        name: 'マルチ型デッキ',
        mainDeck: [
          {
            cid: '12345',
            ciid: '1',
            quantity: 2
          },
          {
            cid: '54321',
            ciid: '1',
            quantity: 1
          }
        ],
        extraDeck: [
          {
            cid: '99999',
            ciid: '1',
            quantity: 1
          }
        ],
        sideDeck: [
          {
            cid: '77777',
            ciid: '1',
            quantity: 3
          }
        ]
      };

      // TempCardDB と UnifiedCacheDB をセットアップ
      const { getTempCardDB } = await import('@/utils/temp-card-db');
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db');
      const tempDB = getTempCardDB();
      const unifiedDB = getUnifiedCacheDB();

      const cards = [
        {
          name: 'モンスターA',
          cardType: 'monster',
          cardId: '12345',
          ciid: '1',
          imgs: [{ ciid: '1', imgHash: 'hash1' }]
        },
        {
          name: '呪文B',
          cardType: 'spell',
          cardId: '54321',
          ciid: '1',
          imgs: [{ ciid: '1', imgHash: 'hash2' }]
        },
        {
          name: '融合デッキC',
          cardType: 'monster',
          cardId: '99999',
          ciid: '1',
          imgs: [{ ciid: '1', imgHash: 'hash3' }]
        },
        {
          name: 'サイドD',
          cardType: 'spell',
          cardId: '77777',
          ciid: '1',
          imgs: [{ ciid: '1', imgHash: 'hash4' }]
        }
      ];

      for (const card of cards) {
        tempDB.set(card.cardId, card as any);
        unifiedDB.setCardInfo(card as any);
      }

      vi.mocked(axios.post).mockResolvedValue({
        data: { result: true }
      });

      const result = await saveDeckInternal(testCgid, 5, deckData, testYtkn);

      expect(result.success).toBe(true);
      // Post呼び出しで複数カード情報が含まれることを確認
      const callArgs = vi.mocked(axios.post).mock.calls[0];
      const postData = callArgs[1] as string;
      expect(postData).toContain('12345'); // モンスターカードID
      expect(postData).toContain('54321'); // 呪文カードID
    });

    it('空のデッキを保存時にエラー返却する', async () => {
      const deckData: DeckInfo = {
        dno: 6,
        name: '',
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      vi.mocked(axios.post).mockResolvedValue({
        data: {
          result: false,
          error: ['デッキ名が空です', 'カードが足りません']
        }
      });

      const result = await saveDeckInternal(testCgid, 6, deckData, testYtkn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('デッキ名が空です');
      expect(result.error).toHaveLength(2);
    });

    it('Postリクエスト時にタグ・カテゴリーを含める', async () => {
      const deckData: DeckInfo = {
        dno: 7,
        name: 'カテゴリー付きデッキ',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: ['cat1', 'cat2'],
        tags: ['tag1', 'tag2', 'tag3']
      };

      vi.mocked(axios.post).mockResolvedValue({
        data: { result: true }
      });

      const result = await saveDeckInternal(testCgid, 7, deckData, testYtkn);

      expect(result.success).toBe(true);
      const callArgs = vi.mocked(axios.post).mock.calls[0];
      const postData = callArgs[1] as string;
      // カテゴリーとタグが含まれることを確認
      expect(postData).toContain('dckCategoryMst');
      expect(postData).toContain('dckTagMst');
    });

    it('Postリクエスト失敗時はエラーメッセージを返す', async () => {
      const deckData: DeckInfo = {
        dno: 8,
        name: 'テストデッキ',
        mainDeck: [],
        extraDeck: [],
        sideDeck: []
      };

      // axiosのPost失敗をシミュレート
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'));

      const result = await saveDeckInternal(testCgid, 8, deckData, testYtkn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});
