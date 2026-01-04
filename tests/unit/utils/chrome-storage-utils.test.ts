import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFromStorageLocal,
  setToStorageLocal,
  getFromStorageLocalMultiple,
  setToStorageLocalMultiple,
  removeFromStorageLocal,
  removeFromStorageLocalMultiple,
  clearStorageLocal,
} from '../../../src/utils/chrome-storage-utils';

describe('chrome-storage-utils', () => {
  let mockStorage: Record<string, any>;
  let mockLastError: { message: string } | undefined;

  beforeEach(() => {
    // chrome.storage.local のモック
    mockStorage = {};
    mockLastError = undefined;

    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys, callback) => {
            let result: Record<string, any> = {};
            if (typeof keys === 'string') {
              if (mockStorage[keys] !== undefined) {
                result[keys] = mockStorage[keys];
              }
            } else if (Array.isArray(keys)) {
              keys.forEach((key) => {
                if (mockStorage[key] !== undefined) {
                  result[key] = mockStorage[key];
                }
              });
            }
            callback(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(mockStorage, items);
            if (callback) callback();
          }),
          remove: vi.fn((keys, callback) => {
            if (typeof keys === 'string') {
              delete mockStorage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach((key) => {
                delete mockStorage[key];
              });
            }
            if (callback) callback();
          }),
          clear: vi.fn((callback) => {
            mockStorage = {};
            if (callback) callback();
          }),
        },
      },
      runtime: {
        get lastError() {
          return mockLastError;
        },
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFromStorageLocal', () => {
    it('存在するキーの値を取得できる', async () => {
      mockStorage['testKey'] = 'testValue';
      const result = await getFromStorageLocal('testKey');
      expect(result).toBe('testValue');
    });

    it('存在しないキーの場合nullを返す', async () => {
      const result = await getFromStorageLocal('nonExistentKey');
      expect(result).toBeNull();
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Test error' };
      await expect(getFromStorageLocal('testKey')).rejects.toThrow('Chrome Storage error: Test error');
    });

    it('オブジェクトを取得できる', async () => {
      const testObject = { name: 'test', count: 42 };
      mockStorage['testKey'] = testObject;
      const result = await getFromStorageLocal('testKey');
      expect(result).toEqual(testObject);
    });
  });

  describe('setToStorageLocal', () => {
    it('値を正しく保存できる', async () => {
      await setToStorageLocal('testKey', 'testValue');
      expect(mockStorage['testKey']).toBe('testValue');
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Set error' };
      await expect(setToStorageLocal('testKey', 'testValue')).rejects.toThrow(
        'Chrome Storage error: Set error'
      );
    });

    it('オブジェクトを保存できる', async () => {
      const testObject = { name: 'test', count: 42 };
      await setToStorageLocal('testKey', testObject);
      expect(mockStorage['testKey']).toEqual(testObject);
    });

    it('既存の値を上書きできる', async () => {
      mockStorage['testKey'] = 'oldValue';
      await setToStorageLocal('testKey', 'newValue');
      expect(mockStorage['testKey']).toBe('newValue');
    });
  });

  describe('getFromStorageLocalMultiple', () => {
    it('複数のキーの値を取得できる', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      const result = await getFromStorageLocalMultiple(['key1', 'key2']);
      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('存在しないキーは結果に含まれない', async () => {
      mockStorage['key1'] = 'value1';
      const result = await getFromStorageLocalMultiple(['key1', 'nonExistent']);
      expect(result).toEqual({ key1: 'value1' });
      expect(result.nonExistent).toBeUndefined();
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Multiple get error' };
      await expect(getFromStorageLocalMultiple(['key1', 'key2'])).rejects.toThrow(
        'Chrome Storage error: Multiple get error'
      );
    });

    it('空の配列を渡した場合空のオブジェクトを返す', async () => {
      const result = await getFromStorageLocalMultiple([]);
      expect(result).toEqual({});
    });
  });

  describe('setToStorageLocalMultiple', () => {
    it('複数の値を正しく保存できる', async () => {
      await setToStorageLocalMultiple({ key1: 'value1', key2: 'value2' });
      expect(mockStorage['key1']).toBe('value1');
      expect(mockStorage['key2']).toBe('value2');
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Multiple set error' };
      await expect(setToStorageLocalMultiple({ key1: 'value1' })).rejects.toThrow(
        'Chrome Storage error: Multiple set error'
      );
    });

    it('空のオブジェクトを保存できる', async () => {
      await setToStorageLocalMultiple({});
      expect(Object.keys(mockStorage).length).toBe(0);
    });
  });

  describe('removeFromStorageLocal', () => {
    it('値を削除できる', async () => {
      mockStorage['testKey'] = 'testValue';
      await removeFromStorageLocal('testKey');
      expect(mockStorage['testKey']).toBeUndefined();
    });

    it('存在しないキーを削除してもエラーにならない', async () => {
      await expect(removeFromStorageLocal('nonExistent')).resolves.toBeUndefined();
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Remove error' };
      await expect(removeFromStorageLocal('testKey')).rejects.toThrow(
        'Chrome Storage error: Remove error'
      );
    });
  });

  describe('removeFromStorageLocalMultiple', () => {
    it('複数の値を削除できる', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      mockStorage['key3'] = 'value3';
      await removeFromStorageLocalMultiple(['key1', 'key2']);
      expect(mockStorage['key1']).toBeUndefined();
      expect(mockStorage['key2']).toBeUndefined();
      expect(mockStorage['key3']).toBe('value3');
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Multiple remove error' };
      await expect(removeFromStorageLocalMultiple(['key1'])).rejects.toThrow(
        'Chrome Storage error: Multiple remove error'
      );
    });

    it('空の配列を渡してもエラーにならない', async () => {
      await expect(removeFromStorageLocalMultiple([])).resolves.toBeUndefined();
    });
  });

  describe('clearStorageLocal', () => {
    it('すべての値をクリアできる', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      await clearStorageLocal();
      expect(Object.keys(mockStorage).length).toBe(0);
    });

    it('chrome.runtime.lastErrorがある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Clear error' };
      await expect(clearStorageLocal()).rejects.toThrow('Chrome Storage error: Clear error');
    });

    it('空のストレージをクリアしてもエラーにならない', async () => {
      await expect(clearStorageLocal()).resolves.toBeUndefined();
    });
  });
});
