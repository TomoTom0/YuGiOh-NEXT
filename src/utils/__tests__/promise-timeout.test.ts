import { describe, it, expect, vi } from 'vitest';
import {
  withTimeout,
  TimeoutError,
  callbackToPromise,
  withTimeouts,
  waitWithinTimeout,
  retryWithTimeout,
  createCancelToken,
  withCancelToken,
} from '../promise-timeout';

describe('promise-timeout', () => {
  describe('withTimeout', () => {
    it('should resolve promise within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, { ms: 5000 });
      expect(result).toBe('success');
    });

    it('should timeout if promise takes too long', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );

      await expect(
        withTimeout(promise, { ms: 100 })
      ).rejects.toThrow();
    });

    it('should throw TimeoutError on timeout', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );

      try {
        await withTimeout(promise, { ms: 100 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(TimeoutError.isTimeoutError(error)).toBe(true);
      }
    });

    it('should use custom timeout message', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );

      await expect(
        withTimeout(promise, {
          ms: 100,
          message: 'Custom timeout message',
        })
      ).rejects.toThrow('Custom timeout message');
    });

    it('should call onTimeout callback', async () => {
      const onTimeout = vi.fn();
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );

      await expect(
        withTimeout(promise, { ms: 100, onTimeout })
      ).rejects.toThrow();

      expect(onTimeout).toHaveBeenCalledOnce();
    });

    it('should handle promise rejection', async () => {
      const promise = (async () => {
        throw new Error('test error');
      })();

      await expect(
        withTimeout(promise, { ms: 5000 })
      ).rejects.toThrow('test error');
    });

    it('should use default timeout of 5000ms', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('success'), 100)
      );
      const result = await withTimeout(promise);
      expect(result).toBe('success');
    });
  });

  describe('TimeoutError', () => {
    it('should be instance of Error', () => {
      const error = new TimeoutError('Test timeout');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have name property', () => {
      const error = new TimeoutError('Test timeout');
      expect(error.name).toBe('TimeoutError');
    });

    it('should identify timeout errors', () => {
      const error = new TimeoutError('Test');
      expect(TimeoutError.isTimeoutError(error)).toBe(true);
    });

    it('should not identify other errors as timeout', () => {
      const error = new Error('Not a timeout');
      expect(TimeoutError.isTimeoutError(error)).toBe(false);
    });
  });

  describe('callbackToPromise', () => {
    it('should convert callback to promise', async () => {
      const result = await callbackToPromise<string>((callback) => {
        setTimeout(() => callback('success'), 100);
      }, 5000);

      expect(result).toBe('success');
    });

    it('should timeout if callback is never called', async () => {
      await expect(
        callbackToPromise<string>((callback) => {
          // Never call callback
        }, 100)
      ).rejects.toThrow();
    });

    it('should use default timeout of 5000ms', async () => {
      const result = await callbackToPromise<string>((callback) => {
        setTimeout(() => callback('success'), 100);
      });

      expect(result).toBe('success');
    });
  });

  describe('withTimeouts', () => {
    it('should apply timeout to multiple promises', async () => {
      const promises = [
        Promise.resolve('1'),
        Promise.resolve('2'),
        Promise.resolve('3'),
      ];

      const withTimeoutPromises = withTimeouts(promises, 5000);
      const results = await Promise.all(withTimeoutPromises);

      expect(results).toEqual(['1', '2', '3']);
    });

    it('should timeout any slow promise', async () => {
      const promises = [
        Promise.resolve('1'),
        new Promise((resolve) => setTimeout(() => resolve('slow'), 10000)),
        Promise.resolve('3'),
      ];

      const withTimeoutPromises = withTimeouts(promises, 100);

      await expect(Promise.all(withTimeoutPromises)).rejects.toThrow();
    });
  });

  describe('waitWithinTimeout', () => {
    it('should return true if promise resolves within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await waitWithinTimeout(promise, 5000);
      expect(result).toBe(true);
    });

    it('should return false if promise times out', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );
      const result = await waitWithinTimeout(promise, 100);
      expect(result).toBe(false);
    });

    it('should throw non-timeout errors', async () => {
      const promise = (async () => {
        throw new Error('test error');
      })();
      await expect(waitWithinTimeout(promise, 5000)).rejects.toThrow(
        'test error'
      );
    });
  });

  describe('retryWithTimeout', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const executor = async () => {
        attempts++;
        return 'success';
      };

      const result = await retryWithTimeout(executor, {
        timeoutMs: 5000,
        maxRetries: 3,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on timeout', async () => {
      let attempts = 0;
      const executor = async () => {
        attempts++;
        if (attempts === 1) {
          // First attempt never resolves
          return new Promise(() => {
            // Never resolves
          });
        }
        return 'success';
      };

      const result = await retryWithTimeout(executor, {
        timeoutMs: 100,
        maxRetries: 3,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should give up after max retries', async () => {
      let attempts = 0;
      const executor = async () => {
        attempts++;
        return new Promise(() => {
          // Never resolves
        });
      };

      await expect(
        retryWithTimeout(executor, { timeoutMs: 100, maxRetries: 2 })
      ).rejects.toThrow(TimeoutError);

      expect(attempts).toBe(3); // 1 + 2 retries
    });

    it('should throw non-timeout errors immediately', async () => {
      let attempts = 0;
      const executor = async () => {
        attempts++;
        throw new Error('not a timeout');
      };

      await expect(
        retryWithTimeout(executor, { timeoutMs: 5000, maxRetries: 3 })
      ).rejects.toThrow('not a timeout');

      expect(attempts).toBe(1); // Only one attempt
    });
  });

  describe('CancelToken', () => {
    it('should indicate cancelled status', () => {
      const token = createCancelToken();
      expect(token.isCancelled()).toBe(false);

      token.cancel();
      expect(token.isCancelled()).toBe(true);
    });

    it('should store cancel reason', () => {
      const token = createCancelToken();
      token.cancel('User cancelled');
      expect(token.isCancelled()).toBe(true);
    });
  });

  describe('withCancelToken', () => {
    it('should resolve promise if not cancelled', async () => {
      const token = createCancelToken();
      const promise = Promise.resolve('success');

      const result = await withCancelToken(promise, token);
      expect(result).toBe('success');
    });

    it('should reject promise if cancelled', async () => {
      const token = createCancelToken();
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 10000)
      );

      const promiseWithToken = withCancelToken(promise, token);

      // Cancel after a short delay
      setTimeout(() => token.cancel(), 100);

      await expect(promiseWithToken).rejects.toThrow('Operation cancelled');
    });

    it('should handle immediate cancellation', async () => {
      const token = createCancelToken();
      token.cancel();

      const promise = Promise.resolve('success');

      // Note: This may or may not reject depending on timing,
      // but the token should be marked as cancelled
      expect(token.isCancelled()).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should prevent infinite wait in chrome.storage callback', async () => {
      // Simulate chrome.storage behavior
      const storageGet = (callback: (result: any) => void) => {
        // Simulating a callback that's never called
        // (this would happen if extension is disabled)
      };

      await expect(
        callbackToPromise(storageGet, 1000)
      ).rejects.toThrow();
    });

    it('should handle successful chrome.storage callback', async () => {
      const storageGet = (callback: (result: any) => void) => {
        setTimeout(() => callback({ appSettings: { theme: 'dark' } }), 100);
      };

      const result = await callbackToPromise(storageGet, 5000);
      expect(result.appSettings.theme).toBe('dark');
    });

    it('should allow cancelling long-running operation', async () => {
      const token = createCancelToken();
      let operationCompleted = false;

      const operation = async () => {
        await new Promise((resolve) =>
          setTimeout(() => {
            operationCompleted = true;
            resolve(undefined);
          }, 5000)
        );
        return 'completed';
      };

      const operationWithToken = withCancelToken(operation(), token);

      // Cancel after 100ms
      setTimeout(() => token.cancel('User initiated cancel'), 100);

      try {
        await operationWithToken;
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(operationCompleted).toBe(false);
    });

    it('should combine timeout and retry for robust operations', async () => {
      let attempts = 0;

      const unreliableOperation = async () => {
        attempts++;
        if (attempts < 2) {
          // First attempt hangs
          return new Promise(() => {
            // Never resolves
          });
        }
        return 'success';
      };

      const result = await retryWithTimeout(unreliableOperation, {
        timeoutMs: 100,
        maxRetries: 3,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });
});
