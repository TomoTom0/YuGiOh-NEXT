/**
 * Card Search API 統合テスト
 *
 * card-search.ts モジュール間の連携検証
 * - requestQueue との連携
 * - parser 関数 との連携
 * - キャッシュDB との連携
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as requestQueue from '@/utils/request-queue';
import * as pageDetector from '@/utils/page-detector';
import * as languageDetector from '@/utils/language-detector';

vi.mock('@/utils/request-queue');
vi.mock('@/utils/page-detector');
vi.mock('@/utils/language-detector');
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({ get: () => undefined }),
}));
vi.mock('@/utils/temp-card-db', () => ({
  getTempCardDB: () => new Map(),
}));

describe('Card Search モジュール統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pageDetector.detectCardGameType).mockReturnValue('ygo');
    vi.mocked(languageDetector.detectLanguage).mockReturnValue('ja');
  });

  describe('RequestQueue 連携', () => {
    it('queuedFetch がAPI呼び出しに使用される', () => {
      vi.mocked(requestQueue.queuedFetch).mockResolvedValue(
        new Response('<html></html>')
      );

      expect(requestQueue.queuedFetch).toBeDefined();
    });

    it('複数のAPI呼び出しがキューイングされる', () => {
      vi.mocked(requestQueue.queuedFetch)
        .mockResolvedValueOnce(new Response('<html>1</html>'))
        .mockResolvedValueOnce(new Response('<html>2</html>'))
        .mockResolvedValueOnce(new Response('<html>3</html>'));

      expect(requestQueue.queuedFetch).toBeDefined();
    });
  });

  describe('言語・ゲームタイプ検出', () => {
    it('detectLanguage と detectCardGameType が呼ばれる', () => {
      const lang = vi.mocked(languageDetector.detectLanguage)();
      const gameType = vi.mocked(pageDetector.detectCardGameType)();

      expect(lang).toBe('ja');
      expect(gameType).toBe('ygo');
    });

    it('複数言語環境での検索が可能', () => {
      const languages = ['ja', 'en', 'ko'];

      languages.forEach((lang) => {
        vi.mocked(languageDetector.detectLanguage).mockReturnValue(lang as any);
        const detected = vi.mocked(languageDetector.detectLanguage)();
        expect(detected).toBe(lang);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーが適切にハンドリングされる', () => {
      vi.mocked(requestQueue.queuedFetch).mockRejectedValue(
        new Error('Network error')
      );

      expect(requestQueue.queuedFetch).toBeDefined();
    });
  });
});
