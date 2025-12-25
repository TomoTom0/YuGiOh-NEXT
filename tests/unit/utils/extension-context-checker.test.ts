import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isExtensionContextInvalidated,
  showReloadPrompt,
  safeStorageGet,
  safeStorageSet,
} from '../../../src/utils/extension-context-checker';

describe('extension-context-checker', () => {
  let mockStorage: Record<string, any>;
  let mockLastError: { message: string } | undefined;
  let mockRuntimeId: string | undefined;
  let consoleErrorSpy: any;

  beforeEach(() => {
    mockStorage = {};
    mockLastError = undefined;
    mockRuntimeId = 'test-extension-id';

    // chrome オブジェクトのモック
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
        },
      },
      runtime: {
        get lastError() {
          return mockLastError;
        },
        get id() {
          return mockRuntimeId;
        },
      },
    } as any;

    // console.error のスパイ
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('isExtensionContextInvalidated', () => {
    it('エラーメッセージに "Extension context invalidated" が含まれる場合trueを返す', () => {
      const error = new Error('Extension context invalidated');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    it('エラーメッセージに "Cannot access" が含まれる場合trueを返す', () => {
      const error = new Error('Cannot access chrome.storage');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    it('chrome.runtime.id が undefined の場合trueを返す', () => {
      mockRuntimeId = undefined;
      const error = new Error('Some error');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    it('エラーがない場合falseを返す', () => {
      expect(isExtensionContextInvalidated(null)).toBe(false);
      expect(isExtensionContextInvalidated(undefined)).toBe(false);
    });

    it('関連しないエラーメッセージの場合falseを返す', () => {
      const error = new Error('Some other error');
      expect(isExtensionContextInvalidated(error)).toBe(false);
    });

    it('エラーオブジェクトでない場合でも文字列として処理する', () => {
      const errorString = 'Extension context invalidated';
      expect(isExtensionContextInvalidated(errorString)).toBe(true);
    });
  });

  describe('showReloadPrompt', () => {
    let appendChildSpy: any;
    let bannerElement: HTMLElement | null = null;

    beforeEach(() => {
      // document.body.appendChild のスパイ
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        bannerElement = node as HTMLElement;
        return node;
      });
    });

    afterEach(() => {
      appendChildSpy.mockRestore();
      bannerElement = null;
    });

    it('バナー要素が作成される', () => {
      showReloadPrompt();
      expect(bannerElement).not.toBeNull();
      expect(bannerElement?.tagName).toBe('DIV');
    });

    it('バナーに適切なスタイルが設定される', () => {
      showReloadPrompt();
      expect(bannerElement?.style.position).toBe('fixed');
      expect(bannerElement?.style.top).toBe('0px');
      expect(bannerElement?.style.zIndex).toBe('999999');
    });

    it('バナーに適切なメッセージが含まれる', () => {
      showReloadPrompt();
      expect(bannerElement?.innerHTML).toContain('拡張機能が更新されました');
      expect(bannerElement?.innerHTML).toContain('リロード');
    });

    it('document.body.appendChild が呼ばれる', () => {
      showReloadPrompt();
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('console.error が呼ばれる', () => {
      showReloadPrompt();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Extension] Context invalidated. Please reload the page.'
      );
    });
  });

  describe('safeStorageGet', () => {
    it('正常に値を取得できる', async () => {
      mockStorage['testKey'] = 'testValue';
      const result = await safeStorageGet('testKey');
      expect(result).toEqual({ testKey: 'testValue' });
    });

    it('複数のキーを取得できる', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      const result = await safeStorageGet(['key1', 'key2']);
      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('chrome.runtime.id が undefined の場合エラーをthrowする', async () => {
      mockRuntimeId = undefined;
      await expect(safeStorageGet('testKey')).rejects.toThrow('Extension context invalidated');
    });

    it('chrome.runtime.lastError がある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Storage error' };
      await expect(safeStorageGet('testKey')).rejects.toThrow('Storage get failed: Storage error');
    });
  });

  describe('safeStorageSet', () => {
    it('正常に値を設定できる', async () => {
      await safeStorageSet({ testKey: 'testValue' });
      expect(mockStorage['testKey']).toBe('testValue');
    });

    it('複数の値を設定できる', async () => {
      await safeStorageSet({ key1: 'value1', key2: 'value2' });
      expect(mockStorage['key1']).toBe('value1');
      expect(mockStorage['key2']).toBe('value2');
    });

    it('chrome.runtime.id が undefined の場合エラーをthrowする', async () => {
      mockRuntimeId = undefined;
      await expect(safeStorageSet({ testKey: 'testValue' })).rejects.toThrow(
        'Extension context invalidated'
      );
    });

    it('chrome.runtime.lastError がある場合エラーをthrowする', async () => {
      mockLastError = { message: 'Set error' };
      await expect(safeStorageSet({ testKey: 'testValue' })).rejects.toThrow(
        'Storage set failed: Set error'
      );
    });
  });
});
