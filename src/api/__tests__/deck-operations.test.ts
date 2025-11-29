import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createNewDeckInternal, saveDeckInternal, deleteDeckInternal } from '../deck-operations';
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
  });
});
