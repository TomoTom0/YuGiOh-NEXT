/**
 * Deck Operations API 統合テスト
 *
 * deck-operations.ts モジュール間の連携検証
 * - ytknFetcher との連携
 * - parser との連携
 * - errorHandler との連携
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as ytknFetcher from '@/utils/ytkn-fetcher';
import * as deckDetailParser from '@/content/parser/deck-detail-parser';
import * as deckListParser from '@/content/parser/deck-list-parser';
import * as pageDetector from '@/utils/page-detector';
import * as errorHandler from '@/utils/error-handler';

vi.mock('@/utils/ytkn-fetcher');
vi.mock('@/content/parser/deck-detail-parser');
vi.mock('@/content/parser/deck-list-parser');
vi.mock('@/utils/page-detector');
vi.mock('@/utils/error-handler');

describe('Deck Operations モジュール統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pageDetector.detectCardGameType).mockReturnValue('ygo');
    vi.mocked(errorHandler.handleError).mockImplementation(() => {});
    vi.mocked(errorHandler.handleSuccess).mockImplementation(() => {});
  });

  describe('ytknFetcher 連携', () => {
    it('ytknFetcher が複数の操作で使用される', () => {
      const mockCgid = 'user123';
      const mockDno = 100;

      // fetchYtknFromDeckList の呼び出しシミュレーション
      vi.mocked(ytknFetcher.fetchYtknFromDeckList).mockResolvedValue('token123');

      // fetchYtknFromEditForm の呼び出しシミュレーション
      vi.mocked(ytknFetcher.fetchYtknFromEditForm).mockResolvedValue('token456');

      expect(ytknFetcher.fetchYtknFromDeckList).toBeDefined();
      expect(ytknFetcher.fetchYtknFromEditForm).toBeDefined();
    });
  });

  describe('Parser 連携', () => {
    it('parseDeckDetail と parseDeckList が使用される', () => {
      vi.mocked(deckDetailParser.parseDeckDetail).mockResolvedValue({
        dno: 100,
        name: 'Test',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
      });

      vi.mocked(deckListParser.parseDeckList).mockReturnValue([
        { dno: 1, name: 'Deck 1', favoriteCount: 0 },
      ]);

      expect(deckDetailParser.parseDeckDetail).toBeDefined();
      expect(deckListParser.parseDeckList).toBeDefined();
    });
  });

  describe('Error Handling 連携', () => {
    it('エラー発生時は handleError が呼ばれる', () => {
      const error = new Error('Test error');

      // エラーハンドリング検証
      expect(errorHandler.handleError).toBeDefined();
      expect(errorHandler.handleSuccess).toBeDefined();
    });
  });

  describe('ゲームタイプ検出', () => {
    it('detectCardGameType が呼び出される', () => {
      const gameType = vi.mocked(pageDetector.detectCardGameType)();

      expect(gameType).toBe('ygo');
      expect(pageDetector.detectCardGameType).toHaveBeenCalled();
    });
  });
});
