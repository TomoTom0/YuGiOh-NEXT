import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TimeoutError,
  callbackToPromise,
  createCancelToken,
  retryWithTimeout,
  waitWithinTimeout,
  withCancelToken,
  withTimeout,
  withTimeouts,
} from '@/utils/promise-timeout';

describe('promise-timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('withTimeout', () => {
    it('[covers:with_timeout.promise_resolves_before_timeout] タイムアウト前にresolveした値を返しタイムアウトを解除する', async () => {
      const onTimeout = vi.fn();

      await expect(withTimeout(Promise.resolve('ok'), { ms: 50, onTimeout })).resolves.toBe('ok');

      expect(onTimeout).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('[covers:with_timeout.promise_rejects_before_timeout] タイムアウト前にrejectした理由をそのまま返しタイムアウトを解除する', async () => {
      const error = new Error('failed');

      await expect(withTimeout(Promise.reject(error), { ms: 50 })).rejects.toBe(error);

      expect(vi.getTimerCount()).toBe(0);
    });

    it('[covers:with_timeout.timeout_rejects_default_message] デフォルト設定では5000ms後にTimeoutErrorでrejectする', async () => {
      const promise = expect(withTimeout(new Promise(() => {}))).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Promise timeout after 5000ms',
      });

      await vi.advanceTimersByTimeAsync(5000);

      await promise;
    });

    it('[covers:with_timeout.timeout_rejects_custom_message_and_callback] 指定メッセージとonTimeoutを使ってタイムアウトする', async () => {
      const onTimeout = vi.fn();
      const promise = expect(
        withTimeout(new Promise(() => {}), { ms: 25, message: 'custom timeout', onTimeout })
      ).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'custom timeout',
      });

      await vi.advanceTimersByTimeAsync(25);

      await promise;
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('[covers:with_timeout.timeout_without_callback] onTimeout未指定でもタイムアウトできる', async () => {
      const promise = expect(withTimeout(new Promise(() => {}), { ms: 25 })).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Promise timeout after 25ms',
      });

      await vi.advanceTimersByTimeAsync(25);

      await promise;
    });
  });

  describe('TimeoutError.isTimeoutError', () => {
    it('[covers:timeout_error.instance_true] TimeoutErrorインスタンスならtrue', () => {
      expect(TimeoutError.isTimeoutError(new TimeoutError('x'))).toBe(true);
    });

    it('[covers:timeout_error.name_true] nameがTimeoutErrorならtrue', () => {
      expect(TimeoutError.isTimeoutError({ name: 'TimeoutError' })).toBe(true);
    });

    it('[covers:timeout_error.other_false] TimeoutErrorでなければfalse', () => {
      expect(TimeoutError.isTimeoutError(new Error('x'))).toBe(false);
    });

    it('[covers:timeout_error.nullish_throws] nullではerror.name参照によりthrowする', () => {
      expect(() => TimeoutError.isTimeoutError(null)).toThrow(TypeError);
    });
  });

  describe('callbackToPromise', () => {
    it('[covers:callback_to_promise.callback_resolves] callback引数でresolveする', async () => {
      const result = callbackToPromise<string>((callback) => {
        callback('ok');
      }, 30);

      await expect(result).resolves.toBe('ok');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('[covers:callback_to_promise.default_timeout_message] デフォルトの5000msメッセージでタイムアウトする', async () => {
      const promise = expect(callbackToPromise<string>(() => {})).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Callback-based operation timeout after 5000ms',
      });

      await vi.advanceTimersByTimeAsync(5000);

      await promise;
    });

    it('[covers:callback_to_promise.custom_timeout_message] 指定timeoutMsをメッセージへ反映する', async () => {
      const promise = expect(callbackToPromise<string>(() => {}, 30)).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Callback-based operation timeout after 30ms',
      });

      await vi.advanceTimersByTimeAsync(30);

      await promise;
    });
  });

  describe('withTimeouts', () => {
    it('[covers:with_timeouts_maps_each_promise] 各Promiseを個別にtimeout付きPromiseへ変換する', async () => {
      const wrapped = withTimeouts([Promise.resolve('ok'), new Promise<string>(() => {})], 20);

      expect(wrapped).toHaveLength(2);
      await expect(wrapped[0]).resolves.toBe('ok');

      const timedOut = expect(wrapped[1]).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Promise timeout after 20ms',
      });
      await vi.advanceTimersByTimeAsync(20);
      await timedOut;
    });

    it('[covers:with_timeouts_empty_array] 空配列なら空配列を返す', () => {
      expect(withTimeouts([])).toEqual([]);
    });
  });

  describe('waitWithinTimeout', () => {
    it('[covers:wait_within_timeout_resolved_true] 時間内にresolveすればtrue', async () => {
      await expect(waitWithinTimeout(Promise.resolve('ok'), 20)).resolves.toBe(true);
    });

    it('[covers:wait_within_timeout_timeout_false] TimeoutErrorならfalse', async () => {
      const result = waitWithinTimeout(new Promise(() => {}), 20);

      await vi.advanceTimersByTimeAsync(20);

      await expect(result).resolves.toBe(false);
    });

    it('[covers:wait_within_timeout_non_timeout_rethrows] TimeoutError以外は再throwする', async () => {
      const error = new Error('failed');

      await expect(waitWithinTimeout(Promise.reject(error), 20)).rejects.toBe(error);
    });
  });

  describe('retryWithTimeout', () => {
    it('[covers:retry_with_timeout_first_success] 1回目で成功したらリトライしない', async () => {
      const executor = vi.fn(async () => 'ok');

      await expect(retryWithTimeout(executor, { timeoutMs: 20, maxRetries: 3 })).resolves.toBe('ok');
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it('[covers:retry_with_timeout_timeout_then_success_after_delay] TimeoutError後は100ms待機してリトライし成功値を返す', async () => {
      const executor = vi
        .fn<() => Promise<string>>()
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockResolvedValueOnce('ok');

      const result = retryWithTimeout(executor, { timeoutMs: 20, maxRetries: 1 });

      expect(executor).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(20);
      await vi.advanceTimersByTimeAsync(99);
      expect(executor).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      await expect(result).resolves.toBe('ok');
      expect(executor).toHaveBeenCalledTimes(2);
    });

    it('[covers:retry_with_timeout_last_timeout_rethrows] 最終attemptのTimeoutErrorはthrowする', async () => {
      const executor = vi.fn<() => Promise<string>>(() => new Promise(() => {}));
      const result = expect(
        retryWithTimeout(executor, { timeoutMs: 20, maxRetries: 1 })
      ).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Promise timeout after 20ms',
      });

      await vi.advanceTimersByTimeAsync(20);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(20);

      await result;
      expect(executor).toHaveBeenCalledTimes(2);
    });

    it('[covers:retry_with_timeout_non_timeout_rethrows_immediately] TimeoutError以外は即throwしリトライしない', async () => {
      const error = new Error('failed');
      const executor = vi.fn<() => Promise<string>>(async () => {
        throw error;
      });

      await expect(retryWithTimeout(executor, { timeoutMs: 20, maxRetries: 3 })).rejects.toBe(error);
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it('[covers:retry_with_timeout_negative_retries_max_exceeded] maxRetriesが負数ならexecutorを呼ばずMax retries exceededをthrowする', async () => {
      const executor = vi.fn(async () => 'ok');

      await expect(retryWithTimeout(executor, { maxRetries: -1 })).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Max retries exceeded',
      });
      expect(executor).not.toHaveBeenCalled();
    });
  });

  describe('createCancelToken', () => {
    it('[covers:cancel_token_initial_false] 作成直後は未キャンセル', () => {
      const token = createCancelToken();

      expect(token.isCancelled()).toBe(false);
    });

    it('[covers:cancel_token_cancel_sets_true] cancel後はreasonに関係なくキャンセル済み', () => {
      const token = createCancelToken();

      token.cancel('reason');

      expect(token.isCancelled()).toBe(true);
    });
  });

  describe('withCancelToken', () => {
    it('[covers:with_cancel_token_promise_resolves_first] Promiseが先にresolveしたらその値を返す', async () => {
      const token = createCancelToken();

      await expect(withCancelToken(Promise.resolve('ok'), token)).resolves.toBe('ok');
    });

    it('[covers:with_cancel_token_promise_rejects_first] Promiseが先にrejectしたらその理由を返す', async () => {
      const token = createCancelToken();
      const error = new Error('failed');

      await expect(withCancelToken(Promise.reject(error), token)).rejects.toBe(error);
    });

    it('[covers:with_cancel_token_cancel_rejects] cancel後のintervalチェックでOperation cancelledをthrowする', async () => {
      const token = createCancelToken();
      const result = expect(withCancelToken(new Promise(() => {}), token)).rejects.toThrow('Operation cancelled');

      token.cancel();
      await vi.advanceTimersByTimeAsync(10);

      await result;
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
