/**
 * Background Service Worker の実装駆動テスト
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateDeckMetadata: vi.fn(),
  getVueEditUrl: vi.fn(),
  getFromStorageLocal: vi.fn(),
  setToStorageLocal: vi.fn(),
  getDeckDetail: vi.fn(),
  getDeckListInternal: vi.fn(),
  saveUnifiedCacheDB: vi.fn(),
}));

vi.mock('@/utils/deck-metadata-loader', () => ({
  updateDeckMetadata: mocks.updateDeckMetadata,
}));

vi.mock('@/utils/url-builder', () => ({
  getVueEditUrl: mocks.getVueEditUrl,
}));

vi.mock('@/utils/chrome-storage-utils', () => ({
  getFromStorageLocal: mocks.getFromStorageLocal,
  setToStorageLocal: mocks.setToStorageLocal,
}));

vi.mock('@/api/deck-operations', () => ({
  getDeckDetail: mocks.getDeckDetail,
  getDeckListInternal: mocks.getDeckListInternal,
}));

vi.mock('@/utils/unified-cache-db', () => ({
  saveUnifiedCacheDB: mocks.saveUnifiedCacheDB,
}));

type ListenerMap = {
  installed: Array<(details: chrome.runtime.InstalledDetails) => void | Promise<void>>;
  contextMenu: Array<(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void>;
  alarms: Array<(alarm: chrome.alarms.Alarm) => void | Promise<void>>;
  messages: Array<(
    message: any,
    sender: chrome.runtime.MessageSender | undefined,
    sendResponse: (response?: any) => void
  ) => boolean | undefined>;
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
};

function createChromeMock() {
  const listeners: ListenerMap = {
    installed: [],
    contextMenu: [],
    alarms: [],
    messages: [],
  };

  const chromeMock = {
    runtime: {
      lastError: undefined,
      onInstalled: {
        addListener: vi.fn((callback: ListenerMap['installed'][number]) => {
          listeners.installed.push(callback);
        }),
      },
      onMessage: {
        addListener: vi.fn((callback: ListenerMap['messages'][number]) => {
          listeners.messages.push(callback);
        }),
      },
      sendMessage: vi.fn(),
      getURL: vi.fn((path: string) => path),
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: {
        addListener: vi.fn((callback: ListenerMap['contextMenu'][number]) => {
          listeners.contextMenu.push(callback);
        }),
      },
    },
    tabs: {
      create: vi.fn(),
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    alarms: {
      create: vi.fn(),
      onAlarm: {
        addListener: vi.fn((callback: ListenerMap['alarms'][number]) => {
          listeners.alarms.push(callback);
        }),
      },
    },
    storage: {
      local: {
        set: vi.fn((_items: Record<string, unknown>, callback?: () => void) => {
          callback?.();
          return Promise.resolve();
        }),
        get: vi.fn(),
        remove: vi.fn(),
      },
    },
    _listeners: listeners,
  };

  return chromeMock;
}

async function loadBackground(chromeMock: ReturnType<typeof createChromeMock>) {
  vi.resetModules();
  global.chrome = chromeMock as any;
  vi.spyOn(global, 'setInterval').mockReturnValue(1 as any);
  await import('../../src/background/main');
  await flushPromises();
}

describe('Background Service Worker', () => {
  let chromeMock: ReturnType<typeof createChromeMock>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    chromeMock = createChromeMock();

    mocks.updateDeckMetadata.mockResolvedValue(undefined);
    mocks.getVueEditUrl.mockReturnValue('chrome-extension://edit.html?regulation=ocg');
    mocks.getFromStorageLocal.mockResolvedValue(null);
    mocks.setToStorageLocal.mockResolvedValue(undefined);
    mocks.getDeckDetail.mockResolvedValue(null);
    mocks.getDeckListInternal.mockResolvedValue([]);
    mocks.saveUnifiedCacheDB.mockResolvedValue(undefined);

    vi.stubGlobal('fetch', vi.fn());
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('起動時処理', () => {
    it('起動時にmetadata更新を即時実行し、24時間intervalとGENESYS weekly alarmを登録する [covers:schedule_metadata_update.immediate_then_interval] [covers:schedule_genesys_check.creates_weekly_alarm] [covers:update_metadata.success]', async () => {
      await loadBackground(chromeMock);

      expect(mocks.updateDeckMetadata).toHaveBeenCalledTimes(1);
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000);
      expect(chromeMock.alarms.create).toHaveBeenCalledWith('genesys-weekly-check', {
        delayInMinutes: 5,
        periodInMinutes: 7 * 24 * 60,
      });
    });

    it('metadata更新が失敗してもconsole.errorに記録して起動処理を継続する [covers:update_metadata.catch_error]', async () => {
      const err = new Error('metadata failed');
      mocks.updateDeckMetadata.mockRejectedValueOnce(err);

      await loadBackground(chromeMock);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update deck metadata:', err);
      expect(chromeMock.alarms.create).toHaveBeenCalled();
    });
  });

  describe('chrome.runtime.onInstalled', () => {
    it('install時はmetadata更新後にcontext menuを作成する [covers:on_installed.install_updates_metadata_and_creates_menu]', async () => {
      await loadBackground(chromeMock);
      mocks.updateDeckMetadata.mockClear();
      chromeMock.contextMenus.create.mockClear();

      await chromeMock._listeners.installed[0]!({ reason: 'install' } as chrome.runtime.InstalledDetails);

      expect(mocks.updateDeckMetadata).toHaveBeenCalledTimes(1);
      expect(chromeMock.contextMenus.create).toHaveBeenCalledWith({
        id: 'open-deck-edit',
        title: 'デッキ編集画面を開く',
        contexts: ['action'],
      });
    });

    it('install以外ではmetadata更新せずcontext menuだけ作成する [covers:on_installed.non_install_creates_menu_only]', async () => {
      await loadBackground(chromeMock);
      mocks.updateDeckMetadata.mockClear();
      chromeMock.contextMenus.create.mockClear();

      await chromeMock._listeners.installed[0]!({ reason: 'update' } as chrome.runtime.InstalledDetails);

      expect(mocks.updateDeckMetadata).not.toHaveBeenCalled();
      expect(chromeMock.contextMenus.create).toHaveBeenCalledWith({
        id: 'open-deck-edit',
        title: 'デッキ編集画面を開く',
        contexts: ['action'],
      });
    });
  });

  describe('chrome.contextMenus.onClicked', () => {
    it('open-deck-editではocg編集URLのタブを開く [covers:context_menu.open_deck_edit_creates_ocg_tab]', async () => {
      await loadBackground(chromeMock);

      chromeMock._listeners.contextMenu[0]!({ menuItemId: 'open-deck-edit' } as chrome.contextMenus.OnClickData);

      expect(mocks.getVueEditUrl).toHaveBeenCalledWith('ocg');
      expect(chromeMock.tabs.create).toHaveBeenCalledWith({
        url: 'chrome-extension://edit.html?regulation=ocg',
      });
    });

    it('open-deck-edit以外のmenuItemIdは無視する [covers:context_menu.other_id_ignored]', async () => {
      await loadBackground(chromeMock);

      chromeMock._listeners.contextMenu[0]!({ menuItemId: 'other' } as chrome.contextMenus.OnClickData);

      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });
  });

  describe('chrome.alarms.onAlarm', () => {
    it('別名alarmは早期returnしてtabs.queryを呼ばない [covers:alarm.name_mismatch_returns]', async () => {
      await loadBackground(chromeMock);

      await chromeMock._listeners.alarms[0]!({ name: 'other' } as chrome.alarms.Alarm);

      expect(chromeMock.tabs.query).not.toHaveBeenCalled();
    });

    it('weekly alarmではDBタブへGENESYS_CHECK_UPDATEを送る [covers:alarm.matching_queries_db_tabs] [covers:alarm.tab_with_id_sends_check_update] [covers:alarm.tab_without_id_skipped]', async () => {
      await loadBackground(chromeMock);
      chromeMock.tabs.query.mockResolvedValue([{ id: 10 }, {}, { id: 11 }]);
      chromeMock.tabs.sendMessage.mockResolvedValue(undefined);

      await chromeMock._listeners.alarms[0]!({ name: 'genesys-weekly-check' } as chrome.alarms.Alarm);

      expect(chromeMock.tabs.query).toHaveBeenCalledWith({ url: 'https://www.db.yugioh-card.com/*' });
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(chromeMock.tabs.sendMessage).toHaveBeenNthCalledWith(1, 10, { type: 'GENESYS_CHECK_UPDATE' });
      expect(chromeMock.tabs.sendMessage).toHaveBeenNthCalledWith(2, 11, { type: 'GENESYS_CHECK_UPDATE' });
    });

    it('tabs.sendMessageのrejectは無視する [covers:alarm.send_message_rejection_ignored]', async () => {
      await loadBackground(chromeMock);
      chromeMock.tabs.query.mockResolvedValue([{ id: 10 }]);
      chromeMock.tabs.sendMessage.mockRejectedValue(new Error('no receiver'));

      await expect(chromeMock._listeners.alarms[0]!({ name: 'genesys-weekly-check' } as chrome.alarms.Alarm))
        .resolves.toBeUndefined();
    });

    it('tabs.query失敗時はconsole.warnに記録してrejectしない [covers:alarm.query_error_warns]', async () => {
      await loadBackground(chromeMock);
      const err = new Error('query failed');
      chromeMock.tabs.query.mockRejectedValue(err);

      await expect(chromeMock._listeners.alarms[0]!({ name: 'genesys-weekly-check' } as chrome.alarms.Alarm))
        .resolves.toBeUndefined();

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Background] GENESYS weekly check failed:', err);
    });
  });

  describe('chrome.runtime.onMessage preload', () => {
    it('PRELOAD_DECK_DETAILはtrueを返し、deckInfoをstorage保存してsuccess応答する [covers:on_message.preload_deck_detail_returns_true_and_success] [covers:preload_deck_detail.truthy_stores_and_saves_cache]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      const deckInfo = { name: 'deck' };
      mocks.getDeckDetail.mockResolvedValue(deckInfo);

      const result = chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_DETAIL', dno: 123, cgid: 'cgid' }, undefined, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(mocks.getDeckDetail).toHaveBeenCalledWith(123, 'cgid');
      expect(mocks.setToStorageLocal).toHaveBeenCalledTimes(1);
      expect(mocks.setToStorageLocal.mock.calls[0]![0]).toBe('ygo-deck-preload:123:cgid');
      expect(JSON.parse(mocks.setToStorageLocal.mock.calls[0]![1] as string)).toMatchObject({ deckInfo });
      expect(mocks.saveUnifiedCacheDB).toHaveBeenCalledTimes(1);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('saveUnifiedCacheDBのrejectはconsole.warnに記録される [covers:preload_deck_detail.save_unified_cache_rejection_warns]', async () => {
      await loadBackground(chromeMock);
      const err = new Error('cache failed');
      mocks.getDeckDetail.mockResolvedValue({ name: 'deck' });
      mocks.saveUnifiedCacheDB.mockRejectedValue(err);

      chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_DETAIL', dno: 123, cgid: 'cgid' }, undefined, vi.fn());
      await flushPromises();

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Background] Failed to save UnifiedCacheDB:', err);
    });

    it('deckInfoがfalsyならstorage保存せずwarnする [covers:preload_deck_detail.falsy_warns_without_storage]', async () => {
      await loadBackground(chromeMock);
      mocks.getDeckDetail.mockResolvedValue(null);

      chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_DETAIL', dno: 123, cgid: 'cgid' }, undefined, vi.fn());
      await flushPromises();

      expect(mocks.setToStorageLocal).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Background] Failed to get deck detail:', 123, 'cgid');
    });

    it('preloadDeckDetail内の例外はconsole.errorに記録され、onMessageはsuccess応答する [covers:preload_deck_detail.catch_error]', async () => {
      await loadBackground(chromeMock);
      const err = new Error('detail failed');
      const sendResponse = vi.fn();
      mocks.getDeckDetail.mockRejectedValue(err);

      const result = chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_DETAIL', dno: 123, cgid: 'cgid' }, undefined, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Background] Failed to preload deck detail:', err);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('PRELOAD_DECK_LISTはtrueを返し、非空配列をstorage保存してsuccess応答する [covers:on_message.preload_deck_list_returns_true_and_success] [covers:preload_deck_list.nonempty_array_stores]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      const deckList = [{ dno: 1 }];
      mocks.getDeckListInternal.mockResolvedValue(deckList);

      const result = chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_LIST', cgid: 'cgid' }, undefined, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(mocks.getDeckListInternal).toHaveBeenCalledWith('cgid');
      expect(mocks.setToStorageLocal).toHaveBeenCalledTimes(1);
      expect(mocks.setToStorageLocal.mock.calls[0]![0]).toBe('ygo-deck-list-preload');
      expect(JSON.parse(mocks.setToStorageLocal.mock.calls[0]![1] as string)).toMatchObject({ deckList, cgid: 'cgid' });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('deckListが空配列または非配列ならstorage保存せずwarnする [covers:preload_deck_list.empty_or_nonarray_warns_without_storage]', async () => {
      await loadBackground(chromeMock);
      mocks.getDeckListInternal.mockResolvedValue([]);

      chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_LIST', cgid: 'cgid' }, undefined, vi.fn());
      await flushPromises();

      expect(mocks.setToStorageLocal).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Background] Failed to get deck list or empty list');
    });

    it('preloadDeckList内の例外はconsole.errorに記録され、onMessageはsuccess応答する [covers:preload_deck_list.catch_error]', async () => {
      await loadBackground(chromeMock);
      const err = new Error('list failed');
      const sendResponse = vi.fn();
      mocks.getDeckListInternal.mockRejectedValue(err);

      const result = chromeMock._listeners.messages[0]!({ type: 'PRELOAD_DECK_LIST', cgid: 'cgid' }, undefined, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Background] Failed to preload deck list:', err);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('chrome.runtime.onMessage GENESYS_FETCH', () => {
    it('許可されないURLはfetchせずstorageにURL not allowedを書き、sendResponseを使わない [covers:on_message.genesys_fetch_returns_true_no_send_response] [covers:perform_genesys_fetch.url_not_allowed]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();

      const result = chromeMock._listeners.messages[0]!({
        type: 'GENESYS_FETCH',
        requestId: 'req-1',
        url: 'https://example.com/japan/howto/genesys',
      }, { origin: 'https://evil.example' } as chrome.runtime.MessageSender, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(sendResponse).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        "genesysFetchResp_req-1": { requestId: 'req-1', success: false, error: 'URL not allowed' },
      });
    });

    it('許可URLのfetchがnot okならFailedエラーをstorageに書く [covers:perform_genesys_fetch.fetch_not_ok]', async () => {
      await loadBackground(chromeMock);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      chromeMock._listeners.messages[0]!({
        type: 'GENESYS_FETCH',
        requestId: 'req-2',
        url: 'https://www.yugioh-card.com/japan/howto/genesys/?list=202608',
      }, undefined, vi.fn());
      await flushPromises();

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        "genesysFetchResp_req-2": { requestId: 'req-2', success: false, error: 'Failed: 404 Not Found' },
      });
    });

    it('許可URLのfetchがokならtextをstorageに書く [covers:perform_genesys_fetch.fetch_success]', async () => {
      await loadBackground(chromeMock);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<html>ok</html>'),
      } as unknown as Response);

      chromeMock._listeners.messages[0]!({
        type: 'GENESYS_FETCH',
        requestId: 'req-3',
        url: 'https://www.yugioh-card.com/japan/howto/genesys/?list=202608',
      }, undefined, vi.fn());
      await flushPromises();

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        "genesysFetchResp_req-3": { requestId: 'req-3', success: true, text: '<html>ok</html>' },
      });
    });

    it('fetchがthrowした場合はerror messageをstorageに書く [covers:perform_genesys_fetch.fetch_throws]', async () => {
      await loadBackground(chromeMock);
      vi.mocked(global.fetch).mockRejectedValue(new Error('network down'));

      chromeMock._listeners.messages[0]!({
        type: 'GENESYS_FETCH',
        requestId: 'req-4',
        url: 'https://www.yugioh-card.com/japan/howto/genesys/?list=202608',
      }, undefined, vi.fn());
      await flushPromises();

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        "genesysFetchResp_req-4": { requestId: 'req-4', success: false, error: 'network down' },
      });
    });
  });

  describe('chrome.runtime.onMessage AI_CHAT', () => {
    it('APIキー未設定ならfetchせずエラー応答する [covers:on_message.ai_chat_no_api_key]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      mocks.getFromStorageLocal.mockResolvedValue(null);

      const result = chromeMock._listeners.messages[0]!({
        type: 'AI_CHAT',
        systemPrompt: 'sys',
        conversation: [{ role: 'user', content: 'hi' }],
      }, undefined, sendResponse);
      await flushPromises();

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Z.ai APIキーが設定されていません' });
    });

    it('APIキーがあればZ.aiへ固定payloadでPOSTする [covers:on_message.ai_chat_fetch_payload] [covers:on_message.ai_chat_success]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      mocks.getFromStorageLocal.mockResolvedValue({ aiApiKey: 'key' });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'answer' } }] }),
      } as unknown as Response);

      chromeMock._listeners.messages[0]!({
        type: 'AI_CHAT',
        systemPrompt: 'sys',
        conversation: [{ role: 'user', content: 'hi' }],
      }, undefined, sendResponse);
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith('https://api.z.ai/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer key',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          messages: [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'hi' },
          ],
          max_tokens: 1024,
        }),
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true, content: 'answer' });
    });

    it('Z.ai responseがnot okならtextを含むAPIエラーを返す [covers:on_message.ai_chat_response_not_ok]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      const json = vi.fn();
      mocks.getFromStorageLocal.mockResolvedValue({ aiApiKey: 'key' });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('server error'),
        json,
      } as unknown as Response);

      chromeMock._listeners.messages[0]!({ type: 'AI_CHAT', systemPrompt: 'sys', conversation: [] }, undefined, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Z.ai API エラー: 500 server error' });
      expect(json).not.toHaveBeenCalled();
    });

    it('Z.ai responseがnot okでtext取得に失敗した場合は本文空でAPIエラーを返す [covers:on_message.ai_chat_response_not_ok_text_rejects]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      mocks.getFromStorageLocal.mockResolvedValue({ aiApiKey: 'key' });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockRejectedValue(new Error('text failed')),
      } as unknown as Response);

      chromeMock._listeners.messages[0]!({ type: 'AI_CHAT', systemPrompt: 'sys', conversation: [] }, undefined, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Z.ai API エラー: 503 ' });
    });

    it('contentがfalsyなら空応答エラーを返す [covers:on_message.ai_chat_empty_content]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      mocks.getFromStorageLocal.mockResolvedValue({ aiApiKey: 'key' });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ choices: [{ message: {} }] }),
      } as unknown as Response);

      chromeMock._listeners.messages[0]!({ type: 'AI_CHAT', systemPrompt: 'sys', conversation: [] }, undefined, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Z.ai APIから空の応答が返りました' });
    });

    it('AI_CHAT処理中の例外はerror応答に変換する [covers:on_message.ai_chat_catch_error]', async () => {
      await loadBackground(chromeMock);
      const sendResponse = vi.fn();
      mocks.getFromStorageLocal.mockRejectedValue(new Error('storage failed'));

      chromeMock._listeners.messages[0]!({ type: 'AI_CHAT', systemPrompt: 'sys', conversation: [] }, undefined, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'storage failed' });
    });
  });

  describe('chrome.runtime.onMessage unknown', () => {
    it('未知のmessage typeはfalseを返す [covers:on_message.unknown_type_returns_false]', async () => {
      await loadBackground(chromeMock);

      const result = chromeMock._listeners.messages[0]!({ type: 'UNKNOWN_TYPE' }, undefined, vi.fn());

      expect(result).toBe(false);
    });
  });
});
