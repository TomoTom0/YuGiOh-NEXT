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
    // [covers:ctx_invalidated.message_extension_context_invalidated_true]
    it('エラーメッセージに "Extension context invalidated" が含まれる場合trueを返す', () => {
      const error = new Error('Extension context invalidated');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    // [covers:ctx_invalidated.message_cannot_access_true]
    it('エラーメッセージに "Cannot access" が含まれる場合trueを返す', () => {
      const error = new Error('Cannot access chrome.storage');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    // [covers:ctx_invalidated.runtime_id_undefined_true]
    it('chrome.runtime.id が undefined の場合trueを返す', () => {
      mockRuntimeId = undefined;
      const error = new Error('Some error');
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    // [covers:ctx_invalidated.falsy_error_returns_false]
    it('エラーがない場合falseを返す', () => {
      expect(isExtensionContextInvalidated(null)).toBe(false);
      expect(isExtensionContextInvalidated(undefined)).toBe(false);
    });

    // [covers:ctx_invalidated.all_false]
    it('関連しないエラーメッセージの場合falseを返す', () => {
      const error = new Error('Some other error');
      expect(isExtensionContextInvalidated(error)).toBe(false);
    });

    // [covers:ctx_invalidated.message_fallback_to_string]
    it('エラーオブジェクトでない場合でも文字列として処理する', () => {
      const errorString = 'Extension context invalidated';
      expect(isExtensionContextInvalidated(errorString)).toBe(true);
    });

    // [covers:ctx_invalidated.message_fallback_to_string]
    it('error.messageが空文字の場合、String(error)へフォールバックして判定する', () => {
      const error = { message: '', toString: () => 'Extension context invalidated' };
      expect(isExtensionContextInvalidated(error)).toBe(true);
    });

    // [covers:ctx_invalidated.runtime_id_empty_string_not_undefined]
    it('chrome.runtime.id が空文字（falsyだがundefinedでない）の場合、厳密等価判定によりfalseを返す', () => {
      mockRuntimeId = '';
      const error = new Error('Some other error');
      expect(isExtensionContextInvalidated(error)).toBe(false);
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

    // [covers:show_reload_prompt.creates_banner_and_logs]
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
    // [covers:safe_storage_get.success_resolves]
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

    // [covers:safe_storage_get.runtime_id_falsy_throws_and_prompts]
    it('chrome.runtime.id が undefined の場合エラーをthrowし、showReloadPromptが呼ばれる', async () => {
      mockRuntimeId = undefined;
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node as Node);
      await expect(safeStorageGet('testKey')).rejects.toThrow('Extension context invalidated');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Extension] Context invalidated. Please reload the page.'
      );
      appendChildSpy.mockRestore();
    });

    // [covers:safe_storage_get.last_error_rejects_no_prompt]
    it('chrome.runtime.lastError がある場合エラーをthrowするが、showReloadPromptは呼ばれない', async () => {
      mockLastError = { message: 'Storage error' };
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node as Node);
      await expect(safeStorageGet('testKey')).rejects.toThrow('Storage get failed: Storage error');
      expect(appendChildSpy).not.toHaveBeenCalled();
      appendChildSpy.mockRestore();
    });
  });

  describe('safeStorageSet', () => {
    // [covers:safe_storage_set.success_resolves_void]
    it('正常に値を設定できる', async () => {
      await safeStorageSet({ testKey: 'testValue' });
      expect(mockStorage['testKey']).toBe('testValue');
    });

    it('複数の値を設定できる', async () => {
      await safeStorageSet({ key1: 'value1', key2: 'value2' });
      expect(mockStorage['key1']).toBe('value1');
      expect(mockStorage['key2']).toBe('value2');
    });

    // [covers:safe_storage_set.runtime_id_falsy_throws_and_prompts]
    it('chrome.runtime.id が undefined の場合エラーをthrowし、showReloadPromptが呼ばれる', async () => {
      mockRuntimeId = undefined;
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node as Node);
      await expect(safeStorageSet({ testKey: 'testValue' })).rejects.toThrow(
        'Extension context invalidated'
      );
      expect(appendChildSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Extension] Context invalidated. Please reload the page.'
      );
      appendChildSpy.mockRestore();
    });

    // [covers:safe_storage_set.last_error_rejects_no_prompt]
    it('chrome.runtime.lastError がある場合エラーをthrowするが、showReloadPromptは呼ばれない', async () => {
      mockLastError = { message: 'Set error' };
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node as Node);
      await expect(safeStorageSet({ testKey: 'testValue' })).rejects.toThrow(
        'Storage set failed: Set error'
      );
      expect(appendChildSpy).not.toHaveBeenCalled();
      appendChildSpy.mockRestore();
    });
  });
});
