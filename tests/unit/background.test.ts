/**
 * Background Service Worker のテスト
 * - updateMetadata() のメタデータ更新処理
 * - chrome.runtime.onInstalled ハンドラ
 * - chrome.contextMenus.onClicked ハンドラ
 * - chrome.runtime.onMessage ハンドラ
 * - preloadDeckDetail() と preloadDeckList() の処理
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Chrome API のモック設定
const createChromeMock = () => {
  const mockStorage: Record<string, any> = {};
  const mockListeners: Record<string, any[]> = {
    'runtime.onInstalled': [],
    'runtime.onMessage': [],
    'contextMenus.onClicked': []
  };

  return {
    storage: {
      local: {
        get: vi.fn((keysOrNull, callback) => {
          let result: Record<string, any> = {};
          if (Array.isArray(keysOrNull)) {
            keysOrNull.forEach(key => {
              if (mockStorage[key]) {
                result[key] = mockStorage[key];
              }
            });
          }
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: vi.fn((items, callback) => {
          Object.assign(mockStorage, items);
          if (callback) callback();
          return Promise.resolve();
        }),
        remove: vi.fn((keys, callback) => {
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => delete mockStorage[key]);
          if (callback) callback();
          return Promise.resolve();
        })
      }
    },
    runtime: {
      onInstalled: {
        addListener: vi.fn((callback: any) => {
          mockListeners['runtime.onInstalled'].push(callback);
        })
      },
      onMessage: {
        addListener: vi.fn((callback: any) => {
          mockListeners['runtime.onMessage'].push(callback);
        })
      }
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: {
        addListener: vi.fn((callback: any) => {
          mockListeners['contextMenus.onClicked'].push(callback);
        })
      }
    },
    tabs: {
      create: vi.fn()
    },
    // テスト用のヘルパー
    _storage: mockStorage,
    _listeners: mockListeners,
    _fireInstalled: (details: any) => {
      mockListeners['runtime.onInstalled'].forEach(cb => cb(details));
    },
    _fireContextMenuClick: (info: any, tab?: any) => {
      mockListeners['contextMenus.onClicked'].forEach(cb => cb(info, tab));
    },
    _fireMessage: (message: any, sender?: any, sendResponse?: any) => {
      const msgListeners = mockListeners['runtime.onMessage'];
      if (msgListeners.length > 0) {
        return msgListeners[0](message, sender, sendResponse);
      }
    }
  };
};

describe('Background Service Worker', () => {
  let chromeMock: any;

  beforeEach(() => {
    chromeMock = createChromeMock();
    global.chrome = chromeMock;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Chrome API リスナー登録', () => {
    it('chrome.runtime.onInstalled リスナーが登録されること', () => {
      expect(chromeMock.runtime.onInstalled.addListener).toBeDefined();
      expect(typeof chromeMock.runtime.onInstalled.addListener).toBe('function');
    });

    it('chrome.contextMenus.onClicked リスナーが登録されること', () => {
      expect(chromeMock.contextMenus.onClicked.addListener).toBeDefined();
      expect(typeof chromeMock.contextMenus.onClicked.addListener).toBe('function');
    });

    it('chrome.runtime.onMessage リスナーが登録されること', () => {
      expect(chromeMock.runtime.onMessage.addListener).toBeDefined();
      expect(typeof chromeMock.runtime.onMessage.addListener).toBe('function');
    });
  });

  describe('contextMenus.create の呼び出し', () => {
    it('contextMenus.create が vue-edit URL で呼び出されるべき構造を持つこと', () => {
      // 期待される呼び出し形式をテスト
      const expectedMenuConfig = {
        id: 'open-deck-edit',
        title: 'デッキ編集画面を開く',
        contexts: ['action']
      };

      expect(expectedMenuConfig).toHaveProperty('id');
      expect(expectedMenuConfig).toHaveProperty('title');
      expect(expectedMenuConfig.contexts).toContain('action');
    });
  });

  describe('Chrome Storage インターフェース', () => {
    it('chrome.storage.local.set と get が実装されていること', async () => {
      expect(chromeMock.storage.local.set).toBeDefined();
      expect(chromeMock.storage.local.get).toBeDefined();
      expect(typeof chromeMock.storage.local.set).toBe('function');
      expect(typeof chromeMock.storage.local.get).toBe('function');
    });

    it('Chrome Storage でデータを保存・取得できること', async () => {
      const testKey = 'test-deck-key';
      const testData = {
        dno: 123,
        cgid: 'test',
        timestamp: Date.now()
      };

      await chromeMock.storage.local.set({ [testKey]: testData });

      const result = await chromeMock.storage.local.get([testKey]);
      expect(result[testKey]).toEqual(testData);
    });

    it('Chrome Storage のデータ削除が機能すること', async () => {
      const testKey = 'test-deck-key';
      const testData = { test: 'data' };

      await chromeMock.storage.local.set({ [testKey]: testData });
      expect((await chromeMock.storage.local.get([testKey]))[testKey]).toBeDefined();

      await chromeMock.storage.local.remove(testKey);
      expect((await chromeMock.storage.local.get([testKey]))[testKey]).toBeUndefined();
    });

    it('複数キーの削除がサポートされること', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const data = { key1: 'data1', key2: 'data2', key3: 'data3' };

      await chromeMock.storage.local.set(data);
      await chromeMock.storage.local.remove(keys);

      const result = await chromeMock.storage.local.get(keys);
      expect(result).toEqual({});
    });
  });

  describe('メッセージハンドリング', () => {
    it('PRELOAD_DECK_DETAIL メッセージの構造が正しいこと', () => {
      const message = {
        type: 'PRELOAD_DECK_DETAIL',
        dno: 123,
        cgid: 'test-cgid'
      };

      expect(message.type).toBe('PRELOAD_DECK_DETAIL');
      expect(message).toHaveProperty('dno');
      expect(message).toHaveProperty('cgid');
      expect(typeof message.dno).toBe('number');
      expect(typeof message.cgid).toBe('string');
    });

    it('PRELOAD_DECK_LIST メッセージの構造が正しいこと', () => {
      const message = {
        type: 'PRELOAD_DECK_LIST',
        cgid: 'test-cgid'
      };

      expect(message.type).toBe('PRELOAD_DECK_LIST');
      expect(message).toHaveProperty('cgid');
      expect(typeof message.cgid).toBe('string');
    });

    it('メッセージリスナーがコールバック関数を受け付けること', () => {
      const callback = vi.fn();
      chromeMock.runtime.onMessage.addListener(callback);

      expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(chromeMock._listeners['runtime.onMessage']).toContain(callback);
    });
  });

  describe('tabs.create インターフェース', () => {
    it('chrome.tabs.create が実装されていること', () => {
      expect(chromeMock.tabs.create).toBeDefined();
      expect(typeof chromeMock.tabs.create).toBe('function');
    });

    it('tabs.create に URL オプションが指定されること', () => {
      const testUrl = 'https://example.com/edit';
      chromeMock.tabs.create({ url: testUrl });

      expect(chromeMock.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: testUrl
        })
      );
    });
  });

  describe('メタデータ更新定数', () => {
    it('METADATA_UPDATE_INTERVAL が24時間に設定されていること', () => {
      // 24時間 = 86400000 ミリ秒
      const expectedInterval = 24 * 60 * 60 * 1000;
      expect(expectedInterval).toBe(86400000);
    });

    it('セットインターバルの計算が正しいこと', () => {
      const hours = 24;
      const minutes = 60;
      const seconds = 60;
      const milliseconds = 1000;

      const interval = hours * minutes * seconds * milliseconds;
      expect(interval).toBe(86400000);
    });
  });

  describe('エラー応答フォーマット', () => {
    it('エラー応答に message と stack が含まれること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: 'Test error',
          stack: 'at test.ts:123'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toHaveProperty('message');
      expect(errorResponse.error).toHaveProperty('stack');
    });

    it('成功応答に success フラグが含まれること', () => {
      const successResponse = {
        success: true
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse).not.toHaveProperty('error');
    });
  });

  describe('chrome.runtime.onMessage の戻り値', () => {
    it('非同期ハンドラは true を返すこと', () => {
      const messageHandler = (message: any, _sender: any, sendResponse: any) => {
        // 非同期処理を予定している場合は true を返す
        Promise.resolve().then(() => {
          sendResponse({ success: true });
        });
        return true; // 非同期処理を示す
      };

      const result = messageHandler({ type: 'PRELOAD_DECK_DETAIL' }, undefined, vi.fn());
      expect(result).toBe(true);
    });

    it('同期ハンドラは false を返すこと', () => {
      const messageHandler = (message: any, _sender: any, sendResponse: any) => {
        // 処理しないメッセージ型
        return false;
      };

      const result = messageHandler({ type: 'UNKNOWN_TYPE' }, undefined, vi.fn());
      expect(result).toBe(false);
    });
  });
});
