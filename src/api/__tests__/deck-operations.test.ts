import { createNewDeckInternal, saveDeckInternal, duplicateDeckInternal, deleteDeckInternal } from '../deck-operations';
import { DeckInfo } from '@/types/deck';

/**
 * デッキ操作API関数のテスト
 */
describe('デッキ操作API', () => {
  const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';
  const testCgid = 'a'.repeat(32);
  const testYtkn = 'b'.repeat(64);

  beforeEach(() => {
    // fetchのモックをリセット
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createNewDeckInternal', () => {
    it('新規デッキを作成し、デッキ番号を返す', async () => {
      // Arrange
      const mockResponse = `
        <html>
          <body>
            <input type="hidden" name="dno" value="10">
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      // Act
      const result = await createNewDeckInternal(testCgid);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}?ope=6&cgid=${testCgid}`,
        expect.any(Object)
      );
      expect(result).toBe(10);
    });

    it('デッキ番号が取得できない場合は0を返す', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await createNewDeckInternal(testCgid);

      expect(result).toBe(0);
    });

    it('fetchが失敗した場合は0を返す', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await createNewDeckInternal(testCgid);

      expect(result).toBe(0);
    });
  });

  describe('duplicateDeckInternal', () => {
    it('デッキを複製し、新しいデッキ番号を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <input type="hidden" name="dno" value="11">
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await duplicateDeckInternal(testCgid, 5);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}?ope=8&cgid=${testCgid}&dno=5`,
        expect.any(Object)
      );
      expect(result).toBe(11);
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
              imageId: '1',
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

      const mockResponse = `
        <html>
          <body>
            <div class="success">保存しました</div>
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await saveDeckInternal(testCgid, 4, deckData, testYtkn);

      expect(global.fetch).toHaveBeenCalledWith(
        BASE_URL,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
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

      const mockResponse = `
        <html>
          <body>
            <div class="error">エラー1</div>
            <div class="error">エラー2</div>
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await saveDeckInternal(testCgid, 4, deckData, testYtkn);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(['エラー1', 'エラー2']);
    });
  });

  describe('deleteDeckInternal', () => {
    it('デッキを削除し、成功結果を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <div class="success">削除しました</div>
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await deleteDeckInternal(testCgid, 4, testYtkn);

      expect(global.fetch).toHaveBeenCalledWith(
        BASE_URL,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
      expect(result.success).toBe(true);
    });

    it('fetchが失敗した場合は失敗結果を返す', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await deleteDeckInternal(testCgid, 4, testYtkn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP error: 500');
    });
  });
});
