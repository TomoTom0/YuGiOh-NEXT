import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RequestQueue,
  fetchWithQueue,
  queuedFetch,
  globalRequestQueue,
} from '@/utils/request-queue';

// このテストは tests/design/request-queue/conditions.toml の各条件に対応する。
// 各テストは it() のタイトルに [covers:<id>] タグを付与し、対応するconditionを明示する。
//
// RequestQueueの内部メソッド（process/executeWithRetry/executeWithTimeout/isRetryableError/
// calculateBackoffDelay）はprivateだが、tests/unit/utils/background-fetch-queue.test.ts の
// 既存の慣習（`(queue as any).xxx`）に倣い、分岐を直接検証するためにアクセスする。

describe('request-queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalRequestQueue.clear();
  });

  describe('constructor', () => {
    it('[covers:constructor.defaults-applied-when-options-omitted] optionsを省略した場合デフォルト値が適用される', () => {
      const queue = new RequestQueue();

      expect((queue as any).options).toEqual({
        concurrentLimit: 3,
        initialRetryDelay: 100,
        maxRetryDelay: 10000,
        maxRetries: 3,
        timeoutMs: 30000,
      });
    });

    it('[covers:constructor.custom-options-override-defaults] optionsを指定した場合その値が使われる', () => {
      const queue = new RequestQueue({
        concurrentLimit: 1,
        initialRetryDelay: 10,
        maxRetryDelay: 200,
        maxRetries: 2,
        timeoutMs: 500,
      });

      expect((queue as any).options).toEqual({
        concurrentLimit: 1,
        initialRetryDelay: 10,
        maxRetryDelay: 200,
        maxRetries: 2,
        timeoutMs: 500,
      });
    });
  });

  describe('enqueue', () => {
    it('[covers:enqueue.wraps-fn-in-request-and-starts-processing] fnの結果でPromiseがresolveする', async () => {
      const queue = new RequestQueue();
      const fn = vi.fn().mockResolvedValue('ok');

      await expect(queue.enqueue(fn)).resolves.toBe('ok');
    });
  });

  describe('process (private)', () => {
    it('[covers:process.skip-when-concurrent-limit-reached] activeCountがconcurrentLimit以上なら何もしない', async () => {
      const queue = new RequestQueue({ concurrentLimit: 1 });
      const request = { fn: vi.fn(), resolve: vi.fn(), reject: vi.fn(), retries: 0 };
      (queue as any).activeCount = 1;
      (queue as any).queue = [request];

      await (queue as any).process();

      expect((queue as any).activeCount).toBe(1);
      expect((queue as any).queue.length).toBe(1);
      expect(request.fn).not.toHaveBeenCalled();
    });

    it('[covers:process.skip-when-queue-empty] queueが空なら何もしない', async () => {
      const queue = new RequestQueue();
      (queue as any).activeCount = 0;
      (queue as any).queue = [];

      await (queue as any).process();

      expect((queue as any).activeCount).toBe(0);
    });

    it('[covers:process.shift-undefined-defensive-guard] shift()がundefinedを返す場合activeCountを相殺してreturnする', async () => {
      const queue = new RequestQueue();
      (queue as any).activeCount = 0;
      (queue as any).queue = { length: 1, shift: () => undefined };

      await (queue as any).process();

      expect((queue as any).activeCount).toBe(0);
    });

    it('[covers:process.success-resolves-request] executeWithRetryが成功したらresolveを呼ぶ', async () => {
      const queue = new RequestQueue();
      const resolve = vi.fn();
      const reject = vi.fn();
      const fn = vi.fn().mockResolvedValue('value1');
      (queue as any).activeCount = 0;
      (queue as any).queue = [{ fn, resolve, reject, retries: 0 }];

      await (queue as any).process();

      expect(resolve).toHaveBeenCalledWith('value1');
      expect(reject).not.toHaveBeenCalled();
    });

    it('[covers:process.failure-rejects-request] executeWithRetryが失敗したらrejectを呼ぶ', async () => {
      const queue = new RequestQueue();
      const resolve = vi.fn();
      const reject = vi.fn();
      const error = new Error('boom');
      const fn = vi.fn().mockRejectedValue(error);
      (queue as any).activeCount = 0;
      (queue as any).queue = [{ fn, resolve, reject, retries: 0 }];

      await (queue as any).process();

      expect(reject).toHaveBeenCalledWith(error);
      expect(resolve).not.toHaveBeenCalled();
    });

    it('[covers:process.finally-decrements-and-continues-next] concurrentLimit到達中は次を処理せず、空いたら続けて処理する', async () => {
      const queue = new RequestQueue({ concurrentLimit: 1 });
      let resolveFirst: (value: string) => void = () => {};
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
      const fn1 = vi.fn(() => firstPromise);
      const fn2 = vi.fn().mockResolvedValue('second');

      const p1 = queue.enqueue(fn1);
      const p2 = queue.enqueue(fn2);

      // concurrentLimit=1のため、fn1処理中はfn2が呼ばれない
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();

      resolveFirst('first');
      await expect(p1).resolves.toBe('first');

      // fn1完了後、finallyのthis.process()再帰呼び出しでfn2が開始される
      expect(fn2).toHaveBeenCalledTimes(1);
      await expect(p2).resolves.toBe('second');
    });
  });

  describe('executeWithRetry (private)', () => {
    it('[covers:execute-with-retry.first-attempt-success] 1回目で成功したら即returnしリトライしない', async () => {
      const queue = new RequestQueue();
      const fn = vi.fn().mockResolvedValue('ok');
      const request = { fn, resolve: vi.fn(), reject: vi.fn(), retries: 0 };

      await expect((queue as any).executeWithRetry(request)).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('[covers:execute-with-retry.retryable-error-retries-then-succeeds] リトライ可能エラー後にバックオフ待機してリトライし成功する', async () => {
      const queue = new RequestQueue({ maxRetries: 3, initialRetryDelay: 50 });
      const response = new Response(null, { status: 429 });
      const fn = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(response)
        .mockResolvedValueOnce('second-value');
      const request = { fn, resolve: vi.fn(), reject: vi.fn(), retries: 0 };

      const resultPromise = (queue as any).executeWithRetry(request);

      // 1回目失敗直後はまだ2回目が呼ばれていない（バックオフ待機中）
      await Promise.resolve();
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(200);

      await expect(resultPromise).resolves.toBe('second-value');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(request.retries).toBe(1);
    });

    it('[covers:execute-with-retry.exhausted-retries-throws-last-error] retries===maxRetriesならリトライせず即throwする', async () => {
      const queue = new RequestQueue({ maxRetries: 3 });
      const response = new Response(null, { status: 503 });
      const fn = vi.fn().mockRejectedValue(response);
      const request = { fn, resolve: vi.fn(), reject: vi.fn(), retries: 3 };

      await expect((queue as any).executeWithRetry(request)).rejects.toBe(response);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('[covers:execute-with-retry.non-retryable-error-throws-immediately] リトライ対象外のエラーは即throwする', async () => {
      const queue = new RequestQueue({ maxRetries: 3 });
      const error = new Error('boom');
      const fn = vi.fn().mockRejectedValue(error);
      const request = { fn, resolve: vi.fn(), reject: vi.fn(), retries: 0 };

      await expect((queue as any).executeWithRetry(request)).rejects.toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('[covers:execute-with-retry.negative-max-retries-throws-max-exceeded] maxRetriesが負数ならfnを呼ばずMax retries exceededをthrowする', async () => {
      const queue = new RequestQueue({ maxRetries: -1 });
      const fn = vi.fn();
      const request = { fn, resolve: vi.fn(), reject: vi.fn(), retries: 0 };

      await expect((queue as any).executeWithRetry(request)).rejects.toMatchObject({
        message: 'Max retries exceeded',
      });
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('executeWithTimeout (private)', () => {
    it('[covers:execute-with-timeout.fn-resolves-before-timeout] timeoutMs以内にresolveすればその値を返す', async () => {
      const queue = new RequestQueue({ timeoutMs: 500 });
      const fn = vi.fn().mockResolvedValue('value');

      await expect((queue as any).executeWithTimeout(fn)).resolves.toBe('value');
    });

    it('[covers:execute-with-timeout.fn-rejects-before-timeout] timeoutMs以内にrejectすればその理由を返す', async () => {
      const queue = new RequestQueue({ timeoutMs: 500 });
      const error = new Error('fail');
      const fn = vi.fn().mockRejectedValue(error);

      await expect((queue as any).executeWithTimeout(fn)).rejects.toBe(error);
    });

    it('[covers:execute-with-timeout.timeout-rejects-with-message] timeoutMs経過後にRequest timeoutメッセージでrejectする', async () => {
      const queue = new RequestQueue({ timeoutMs: 500 });
      const fn = vi.fn(() => new Promise(() => {}));

      const promise = expect((queue as any).executeWithTimeout(fn)).rejects.toMatchObject({
        message: 'Request timeout after 500ms',
      });

      await vi.advanceTimersByTimeAsync(500);

      await promise;
    });
  });

  describe('isRetryableError (private)', () => {
    it("[covers:is-retryable-error.typeerror-fetch-message-true] TypeErrorかつmessageに'fetch'を含めばtrue", () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it("[covers:is-retryable-error.typeerror-non-fetch-message-false] TypeErrorでもmessageに'fetch'を含まなければfalse", () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError(new TypeError('other error'))).toBe(false);
    });

    it('[covers:is-retryable-error.response-status-429-or-503-true] Responseでstatus 429/503ならtrue', () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError(new Response(null, { status: 429 }))).toBe(true);
      expect((queue as any).isRetryableError(new Response(null, { status: 503 }))).toBe(true);
    });

    it('[covers:is-retryable-error.response-status-other-false] Responseでもstatusが429/503以外ならfalse', () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError(new Response(null, { status: 500 }))).toBe(false);
    });

    it('[covers:is-retryable-error.custom-status-object-429-or-503-true] statusプロパティを持つオブジェクトで429/503ならtrue', () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError({ status: 503 })).toBe(true);
    });

    it('[covers:is-retryable-error.custom-status-object-other-false] statusプロパティを持つオブジェクトでも429/503以外ならfalse', () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError({ status: 400 })).toBe(false);
    });

    it('[covers:is-retryable-error.default-false] いずれにも該当しなければfalse', () => {
      const queue = new RequestQueue();
      expect((queue as any).isRetryableError(new Error('generic failure'))).toBe(false);
    });
  });

  describe('calculateBackoffDelay (private)', () => {
    it('[covers:calculate-backoff-delay.exponential-with-jitter] 指数バックオフにジッターを掛けた値を返す', () => {
      const queue = new RequestQueue({ initialRetryDelay: 100 });
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // exponentialDelay = 100 * 2^1 = 200, jitter係数 = 0.8 + 0.5*0.4 = 1.0 -> 200
      expect((queue as any).calculateBackoffDelay(1)).toBe(200);
    });

    it('[covers:calculate-backoff-delay.capped-at-max-retry-delay] maxRetryDelayを超える場合は切り詰められる', () => {
      const queue = new RequestQueue({ initialRetryDelay: 1000, maxRetryDelay: 200 });
      vi.spyOn(Math, 'random').mockReturnValue(1);

      // exponentialDelay = 1000 * 2^5 = 32000, jitter係数 = 1.2 -> 38400 -> maxRetryDelay=200に切り詰め
      expect((queue as any).calculateBackoffDelay(5)).toBe(200);
    });
  });

  describe('fetchWithQueue', () => {
    it('[covers:fetch-with-queue.delegates-to-global-queue] globalRequestQueue.enqueueに委譲する', async () => {
      const fn = vi.fn().mockResolvedValue('queued-value');

      await expect(fetchWithQueue(fn)).resolves.toBe('queued-value');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('未処理リクエストをキューから破棄しgetQueueSizeを0にする（条件化対象外のbranchなし公開メソッド）', async () => {
      const queue = new RequestQueue({ concurrentLimit: 1 });
      let resolveFirst: () => void = () => {};
      const fn1 = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          })
      );
      const fn2 = vi.fn().mockResolvedValue('second');

      const firstPromise = queue.enqueue(fn1);
      void queue.enqueue(fn2);

      // concurrentLimit=1のためfn1がactive、fn2はキューに残る
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(queue.getQueueSize()).toBe(1);
      expect(queue.getActiveCount()).toBe(1);

      queue.clear();

      expect(queue.getQueueSize()).toBe(0);

      resolveFirst();
      await expect(firstPromise).resolves.toBeUndefined();
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe('複数インスタンスの独立性', () => {
    it('インスタンスごとのキュー状態は共有されず独立して動作する', async () => {
      const queue1 = new RequestQueue({ concurrentLimit: 1 });
      const queue2 = new RequestQueue({ concurrentLimit: 5 });
      const fn1 = vi.fn().mockResolvedValue('queue1');
      const fn2 = vi.fn().mockResolvedValue('queue2');

      const [result1, result2] = await Promise.all([
        queue1.enqueue(fn1),
        queue2.enqueue(fn2),
      ]);

      expect(result1).toBe('queue1');
      expect(result2).toBe('queue2');
      expect(queue1.getQueueSize()).toBe(0);
      expect(queue2.getQueueSize()).toBe(0);
    });
  });

  describe('queuedFetch', () => {
    it('[covers:queued-fetch.delegates-to-fetch-with-queue] fetch(url, init)をキュー経由で実行する', async () => {
      const mockResponse = new Response('body');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      await expect(queuedFetch('https://example.com', { method: 'GET' })).resolves.toBe(
        mockResponse
      );
      expect(fetchSpy).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
    });
  });
});
