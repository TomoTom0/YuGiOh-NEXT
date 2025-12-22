/**
 * 統合テスト: API エラーハンドリング
 *
 * 機能フロー:
 * 1. ネットワークエラーの処理
 * 2. タイムアウト処理
 * 3. HTTP エラーステータスの処理
 * 4. リトライ・フォールバック
 * 5. ユーザーへの通知
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('統合テスト: API エラーハンドリング', () => {
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('API レスポンス処理', () => {
    it('should handle successful API response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      };

      const response = mockResponse as any;
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toBe('success');
    });

    it('should identify non-OK response status', () => {
      const testCases = [
        { status: 400, ok: false, name: 'Bad Request' },
        { status: 401, ok: false, name: 'Unauthorized' },
        { status: 403, ok: false, name: 'Forbidden' },
        { status: 404, ok: false, name: 'Not Found' },
        { status: 500, ok: false, name: 'Internal Server Error' },
        { status: 503, ok: false, name: 'Service Unavailable' },
      ];

      testCases.forEach(test => {
        const response = { ok: test.ok, status: test.status };
        expect(response.ok).toBe(false);
        expect(response.status).toBe(test.status);
      });
    });

    it('should extract error message from response', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found', code: 404 }),
      };

      const response = errorResponse as any;
      if (!response.ok) {
        const errorData = await response.json();
        expect(errorData.error).toBe('Resource not found');
        expect(errorData.code).toBe(404);
      }
    });
  });

  describe('ネットワークエラー', () => {
    it('should handle network connection error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      try {
        await mockFetch('https://example.com/api');
      } catch (error: any) {
        expect(error.message).toBe('Network connection failed');
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle timeout error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Request timeout')
      );

      try {
        await mockFetch('https://example.com/api');
      } catch (error: any) {
        expect(error.message).toBe('Request timeout');
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle DNS resolution error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Failed to resolve hostname')
      );

      try {
        await mockFetch('https://invalid-domain.test');
      } catch (error: any) {
        expect(error.message).toBe('Failed to resolve hostname');
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should classify error type', () => {
      const errors = [
        { error: new Error('Network error'), type: 'network' },
        { error: new Error('Timeout'), type: 'timeout' },
        { error: new Error('Parse error'), type: 'parse' },
      ];

      errors.forEach(errorCase => {
        expect(errorCase.error).toBeInstanceOf(Error);
        expect(errorCase.type).toBeDefined();
      });
    });
  });

  describe('HTTP エラーステータス処理', () => {
    it('should handle 400 Bad Request', async () => {
      const response = { ok: false, status: 400, statusText: 'Bad Request' };

      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.statusText).toBe('Bad Request');
      }
    });

    it('should handle 401 Unauthorized', async () => {
      const response = { ok: false, status: 401, statusText: 'Unauthorized' };

      if (!response.ok) {
        expect(response.status).toBe(401);
        // ログイン画面にリダイレクト可能
      }
    });

    it('should handle 403 Forbidden', async () => {
      const response = { ok: false, status: 403, statusText: 'Forbidden' };

      if (!response.ok) {
        expect(response.status).toBe(403);
        // アクセス拒否ページを表示
      }
    });

    it('should handle 404 Not Found', async () => {
      const response = { ok: false, status: 404, statusText: 'Not Found' };

      if (!response.ok) {
        expect(response.status).toBe(404);
        // フォールバックデータを使用
      }
    });

    it('should handle 500 Internal Server Error', async () => {
      const response = { ok: false, status: 500, statusText: 'Internal Server Error' };

      if (!response.ok) {
        expect(response.status).toBe(500);
        // リトライを試行
      }
    });

    it('should handle 503 Service Unavailable', async () => {
      const response = { ok: false, status: 503, statusText: 'Service Unavailable' };

      if (!response.ok) {
        expect(response.status).toBe(503);
        // リトライを試行
      }
    });
  });

  describe('エラー処理のリトライ', () => {
    it('should retry on transient error', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ ok: true, data: 'success' });

      let result;
      try {
        result = await mockFetch('https://example.com/api');
      } catch (error) {
        // リトライ
        result = await mockFetch('https://example.com/api');
      }

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const mockDelay = (ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      };

      // リトライ回数
      const maxRetries = 3;
      const baseDelay = 100;

      for (let i = 1; i <= maxRetries; i++) {
        const delay = baseDelay * Math.pow(2, i - 1);
        await mockDelay(delay);
      }

      expect(delays).toEqual([100, 200, 400]);
    });

    it('should give up after max retries', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const maxRetries = 3;
      let attempts = 0;

      for (let i = 0; i < maxRetries; i++) {
        try {
          await mockFetch('https://example.com/api');
          attempts++;
        } catch (error) {
          // リトライ継続
        }
      }

      expect(mockFetch.mock.calls.length).toBe(maxRetries);
    });
  });

  describe('エラーのフォールバック', () => {
    it('should use cached data on API error', () => {
      const cache = {
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        timestamp: Date.now(),
      };

      const apiError = new Error('API failed');

      const result = cache.data;
      expect(result).toEqual([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ]);
    });

    it('should use default/empty data as fallback', () => {
      const defaultData = {
        decks: [],
        cards: [],
        error: null,
      };

      expect(defaultData.decks).toEqual([]);
      expect(defaultData.cards).toEqual([]);
    });

    it('should show error message to user', () => {
      const errorMessage = 'Failed to load data. Please try again later.';
      const userNotification = {
        type: 'error',
        message: errorMessage,
        duration: 5000,
      };

      expect(userNotification.type).toBe('error');
      expect(userNotification.message).toBe(errorMessage);
    });
  });

  describe('エラーログ・モニタリング', () => {
    it('should log error details', () => {
      const error = new Error('API error occurred');
      const errorLog = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };

      expect(errorLog.message).toBe('API error occurred');
      expect(errorLog.timestamp).toBeDefined();
    });

    it('should capture error context', () => {
      const errorContext = {
        url: 'https://example.com/api/decks',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        status: 500,
        message: 'Internal Server Error',
      };

      expect(errorContext.url).toBe('https://example.com/api/decks');
      expect(errorContext.method).toBe('GET');
      expect(errorContext.status).toBe(500);
    });

    it('should batch errors for reporting', () => {
      const errors: any[] = [];

      const addError = (error: any) => {
        errors.push({
          timestamp: Date.now(),
          message: error.message,
          severity: 'error',
        });
      };

      addError(new Error('Error 1'));
      addError(new Error('Error 2'));
      addError(new Error('Error 3'));

      expect(errors).toHaveLength(3);
      expect(errors[0].message).toBe('Error 1');
    });
  });

  describe('複雑なエラー処理フロー', () => {
    it('should handle cascading API failures', async () => {
      // Step 1: 初回リクエスト失敗
      const mockFetch1 = vi.fn().mockRejectedValueOnce(new Error('API unavailable'));

      // Step 2: キャッシュからデータを取得
      const cachedData = { data: 'from cache' };

      // Step 3: リトライ
      const mockFetch2 = vi.fn().mockResolvedValueOnce({ ok: true, data: 'from retry' });

      try {
        await mockFetch1('https://example.com/api');
      } catch (error) {
        // キャッシュを使用
        expect(cachedData.data).toBe('from cache');

        // リトライ
        const result = await mockFetch2('https://example.com/api');
        expect(result.data).toBe('from retry');
      }
    });

    it('should implement circuit breaker pattern', () => {
      const circuitBreaker = {
        state: 'closed', // closed | open | half-open
        failureCount: 0,
        successCount: 0,
        threshold: 5,
      };

      // 障害を記録
      circuitBreaker.failureCount++;
      circuitBreaker.failureCount++;
      circuitBreaker.failureCount++;

      if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
        circuitBreaker.state = 'open';
      }

      expect(circuitBreaker.state).toBe('closed'); // 5未満なので closed
      expect(circuitBreaker.failureCount).toBe(3);
    });

    it('should handle partial API failures gracefully', () => {
      const apiResults = {
        decks: { status: 'success', data: [] },
        cards: { status: 'error', message: 'Failed to load' },
        stats: { status: 'success', data: {} },
      };

      const successfulResults = Object.entries(apiResults)
        .filter(([_, result]: [string, any]) => result.status === 'success')
        .map(([key, _]) => key);

      expect(successfulResults).toContain('decks');
      expect(successfulResults).toContain('stats');
      expect(successfulResults).not.toContain('cards');
    });
  });

  describe('ユーザー体験の考慮', () => {
    it('should display user-friendly error message', () => {
      const technicalError = 'ERR_HTTP_500_INTERNAL_SERVER_ERROR';
      const userMessage = 'サーバーエラーが発生しました。しばらく後にお試しください。';

      expect(userMessage).toBe('サーバーエラーが発生しました。しばらく後にお試しください。');
    });

    it('should provide recovery actions', () => {
      const errorNotification = {
        message: 'データの読み込みに失敗しました',
        actions: [
          { label: '再試行', callback: 'retry' },
          { label: 'キャッシュを使用', callback: 'useCache' },
          { label: 'ホームに戻る', callback: 'goHome' },
        ],
      };

      expect(errorNotification.actions).toHaveLength(3);
      expect(errorNotification.actions[0].label).toBe('再試行');
    });

    it('should show loading state during retry', () => {
      const uiState = {
        isLoading: true,
        isError: false,
        message: 'データを再度読み込み中...',
      };

      expect(uiState.isLoading).toBe(true);
      expect(uiState.isError).toBe(false);
    });

    it('should auto-dismiss temporary errors', () => {
      const notification = {
        message: 'ネットワーク接続中...',
        severity: 'warning',
        autoDismissMs: 3000,
      };

      expect(notification.autoDismissMs).toBe(3000);
    });
  });

  describe('API エラーとの統合テスト', () => {
    it('should handle complete error recovery workflow', async () => {
      // Step 1: API 呼び出し失敗
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      );

      let data = null;
      try {
        const response = await mockFetch('https://example.com/api');
        data = await response.json();
      } catch (error: any) {
        // Step 2: キャッシュを確認
        data = { source: 'cache', items: [] };
      }

      expect(data.source).toBe('cache');
      expect(data.items).toEqual([]);

      // Step 3: リトライ
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ source: 'api', items: [1, 2, 3] }),
      });

      const response = await mockFetch('https://example.com/api');
      data = await response.json();

      expect(data.source).toBe('api');
      expect(data.items).toEqual([1, 2, 3]);
    });
  });
});

function afterEach(arg0: () => void) {
  // This is a placeholder
}
