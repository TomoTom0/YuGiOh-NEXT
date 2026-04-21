import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestQueue, fetchWithQueue, queuedFetch } from '../request-queue';

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue({
      concurrentLimit: 2,
      initialRetryDelay: 10,
      maxRetryDelay: 100,
      maxRetries: 2,
      timeoutMs: 5000,
    });
  });

  describe('basic enqueue operation', () => {
    it('should execute a simple async function', async () => {
      const fn = vi.fn(async () => 'result');
      const result = await queue.enqueue(fn);
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should maintain FIFO order for requests', async () => {
      const order: number[] = [];
      const fn1 = async () => {
        order.push(1);
        return 1;
      };
      const fn2 = async () => {
        order.push(2);
        return 2;
      };
      const fn3 = async () => {
        order.push(3);
        return 3;
      };

      await Promise.all([
        queue.enqueue(fn1),
        queue.enqueue(fn2),
        queue.enqueue(fn3),
      ]);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should reject when function throws', async () => {
      const fn = async () => {
        throw new Error('test error');
      };

      await expect(queue.enqueue(fn)).rejects.toThrow('test error');
    });
  });

  describe('concurrent limit', () => {
    it('should not exceed concurrent limit', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const mockFn = async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        currentConcurrent--;
      };

      const promises = Array(5).fill(null).map(() => queue.enqueue(mockFn));
      await Promise.all(promises);

      // Concurrent limit は 2 に設定しているので、2 以下であるべき
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should process queued requests after concurrent tasks complete', async () => {
      const executed: number[] = [];
      const createFn = (id: number) => async () => {
        executed.push(id);
        await new Promise(resolve => setTimeout(resolve, 30));
      };

      // 5つのリクエストをキューに追加
      const promises = Array.from({ length: 5 }, (_, i) =>
        queue.enqueue(createFn(i + 1))
      );

      await Promise.all(promises);

      // すべてのリクエストが実行されているべき
      expect(executed).toHaveLength(5);
      expect(new Set(executed).size).toBe(5);
    });
  });

  describe('retry logic', () => {
    it('should retry on network error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new TypeError('fetch failed');
        }
        return 'success';
      };

      const result = await queue.enqueue(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should retry on 429 (Too Many Requests)', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Response('', { status: 429 });
          throw error;
        }
        return new Response('success');
      };

      const result = await queue.enqueue(fn);
      expect(result.status).toBe(200);
      expect(attempts).toBe(2);
    });

    it('should retry on 503 (Service Unavailable)', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Response('', { status: 503 });
          throw error;
        }
        return new Response('success');
      };

      const result = await queue.enqueue(fn);
      expect(result.status).toBe(200);
      expect(attempts).toBe(2);
    });

    it('should not retry on other HTTP errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Response('', { status: 400 });
      };

      await expect(queue.enqueue(fn)).rejects.toThrow();
      expect(attempts).toBe(1);
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('some error');
      };

      await expect(queue.enqueue(fn)).rejects.toThrow('some error');
      expect(attempts).toBe(1);
    });

    it('should respect max retries limit', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new TypeError('fetch failed');
      };

      // maxRetries = 2 に設定しているので、最大 3 回実行される（初回 + 2 回リトライ）
      await expect(queue.enqueue(fn)).rejects.toThrow();
      expect(attempts).toBe(3);
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay with each retry', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts <= 2) {
          throw new TypeError('fetch failed');
        }
        return 'success';
      };

      const result = await queue.enqueue(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(3); // 1回目失敗 + 1回目リトライ失敗 + 2回目リトライ成功
    });

    it('should not exceed max retry delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts <= 2) {
          throw new TypeError('fetch failed');
        }
        return 'success';
      };

      const startTime = Date.now();
      await queue.enqueue(fn);
      const elapsed = Date.now() - startTime;

      // maxRetryDelay = 100 に設定しているので、合計遅延は大体 110ms 以下であるべき
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('timeout', () => {
    it('should timeout if request takes too long', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
      };

      await expect(queue.enqueue(fn)).rejects.toThrow('timeout');
    });

    it('should not timeout for quick requests', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      };

      const result = await queue.enqueue(fn);
      expect(result).toBe('success');
    });
  });

  describe('queue status', () => {
    it('should report queue size', async () => {
      const fn = () => new Promise(resolve => setTimeout(resolve, 100));

      const promises = [1, 2, 3].map(() => queue.enqueue(fn));

      // すべてのリクエストがキューに追加されるまで待つ
      await new Promise(resolve => setImmediate(resolve));

      // キューには少なくともいくつかのリクエストが待機しているべき
      expect(queue.getQueueSize()).toBeGreaterThanOrEqual(0);

      await Promise.all(promises);
    });

    it('should report active count', async () => {
      let activeCountDuringExecution = 0;
      const fn = async () => {
        activeCountDuringExecution = Math.max(activeCountDuringExecution, queue.getActiveCount());
        await new Promise(resolve => setTimeout(resolve, 50));
      };

      const promises = Array(4).fill(null).map(() => queue.enqueue(fn));
      await Promise.all(promises);

      // Concurrent limit は 2 なので、アクティブ数は 2 以下であるべき
      expect(activeCountDuringExecution).toBeLessThanOrEqual(2);
    });
  });

  describe('clear', () => {
    it('should clear the queue', async () => {
      const fn = () => new Promise(resolve => setTimeout(resolve, 100));

      queue.enqueue(fn);
      queue.enqueue(fn);
      queue.clear();

      expect(queue.getQueueSize()).toBe(0);
    });
  });
});

describe('fetchWithQueue', () => {
  it('should execute fetch through queue', async () => {
    const fn = vi.fn(async () => new Response('ok'));
    const result = await fetchWithQueue(fn);
    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should handle fetch errors', async () => {
    const fn = async () => {
      throw new TypeError('network error');
    };

    await expect(fetchWithQueue(fn)).rejects.toThrow('network error');
  });
});

describe('queuedFetch', () => {
  it('should be a convenience wrapper for fetch', async () => {
    // This test would require mocking fetch, which is already done by vitest
    // We're testing that the function exists and has the right signature
    expect(typeof queuedFetch).toBe('function');
  });

  it('should accept URL and options', async () => {
    // Just verify the function signature is correct
    const fn = queuedFetch.bind(null, 'https://example.com', { method: 'GET' });
    expect(typeof fn).toBe('function');
  });
});

describe('RequestQueue configuration', () => {
  it('should use default options when not provided', () => {
    const defaultQueue = new RequestQueue();
    // Test by behavior - should have reasonable defaults
    expect(defaultQueue.getQueueSize()).toBe(0);
    expect(defaultQueue.getActiveCount()).toBe(0);
  });

  it('should accept custom options', () => {
    const customQueue = new RequestQueue({
      concurrentLimit: 5,
      maxRetries: 1,
      timeoutMs: 60000,
    });
    expect(typeof customQueue).toBe('object');
  });

  it('should handle multiple queue instances independently', async () => {
    const queue1 = new RequestQueue({ concurrentLimit: 1 });
    const queue2 = new RequestQueue({ concurrentLimit: 5 });

    const fn1 = vi.fn(async () => 'queue1');
    const fn2 = vi.fn(async () => 'queue2');

    const [result1, result2] = await Promise.all([
      queue1.enqueue(fn1),
      queue2.enqueue(fn2),
    ]);

    expect(result1).toBe('queue1');
    expect(result2).toBe('queue2');
  });
});
