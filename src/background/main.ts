/**
 * Background Service Worker
 *
 * - デッキメタデータの定期更新
 * - デッキ詳細情報のプリロード
 */

import { updateDeckMetadata } from '@/utils/deck-metadata-loader';
import { getVueEditUrl } from '@/utils/url-builder';
import { getFromStorageLocal, setToStorageLocal } from '@/utils/chrome-storage-utils';
import {
  CHROME_STORAGE_KEY_APP_SETTINGS,
  CHROME_STORAGE_KEY_DECK_LIST_PRELOAD,
} from '@/constants/storage-keys';

const METADATA_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24時間

/** GENESYS週次チェックのアラーム名 */
const GENESYS_ALARM_NAME = 'genesys-weekly-check';
/** GENESYSチェック間隔（毎週 = 7日） */
const GENESYS_CHECK_INTERVAL_MIN = 7 * 24 * 60;

/**
 * デッキメタデータを更新
 */
async function updateMetadata() {
  try {
    await updateDeckMetadata();
  } catch (error) {
    console.error('Failed to update deck metadata:', error);
  }
}

/**
 * 拡張機能インストール時の処理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  // 初回インストール時にメタデータを更新
  if (details.reason === 'install') {
    await updateMetadata();
  }

  // コンテキストメニューを作成（拡張機能アイコン右クリック用）
  chrome.contextMenus.create({
    id: 'open-deck-edit',
    title: 'デッキ編集画面を開く',
    contexts: ['action']
  });
});

/**
 * コンテキストメニュークリック時の処理
 */
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === 'open-deck-edit') {
    chrome.tabs.create({
      url: getVueEditUrl('ocg')
    });
  }
});

/**
 * 定期的なメタデータ更新
 */
async function scheduleMetadataUpdate() {
  // 即座に1回更新
  await updateMetadata();

  // 24時間ごとに更新
  setInterval(updateMetadata, METADATA_UPDATE_INTERVAL);
}

// 起動時に更新スケジュールを開始
scheduleMetadataUpdate();

/**
 * GENESYSポイントの週次更新チェックをスケジュール
 *
 * GENESYSは月次更新（毎月1日）。カード名->cid解決にカードデータが必要なため、
 * background単独ではなく、デッキ編集ページ（カードデータ保持）のcontent scriptへ
 * 更新チェックを依頼する。毎週実行し、翌月リストが公開されていれば取得する。
 */
function scheduleGenesysCheck(): void {
  chrome.alarms.create(GENESYS_ALARM_NAME, {
    delayInMinutes: 5,
    periodInMinutes: GENESYS_CHECK_INTERVAL_MIN,
  });
}

// GENESYS週次チェックのアラームリスナー
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== GENESYS_ALARM_NAME) {
    return;
  }
  try {
    // デッキ編集ページ（カードデータ保持）のタブへ更新チェックを依頼
    const tabs = await chrome.tabs.query({ url: 'https://www.db.yugioh-card.com/*' });
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, { type: 'GENESYS_CHECK_UPDATE' }).catch(() => {
          // content script未読み込みのタブは無視
        });
      }
    }
  } catch (err) {
    console.warn('[Background] GENESYS weekly check failed:', err);
  }
});

// 起動時にGENESYS週次チェックをスケジュール
scheduleGenesysCheck();

/**
 * デッキ詳細情報をプリロード
 * Content Script からのリクエストに応じて、DeckDetail を取得して Chrome Storage に保存
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.warn('[BG-MSG] received', message?.type);
  if (message.type === 'PRELOAD_DECK_DETAIL') {
    const { dno, cgid } = message;

    // 非同期で実行
    preloadDeckDetail(dno, cgid)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({
        success: false,
        error: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }
      }));

    return true; // sendResponse が非同期のため必須
  }

  if (message.type === 'PRELOAD_DECK_LIST') {
    const { cgid } = message;

    // 非同期で実行
    preloadDeckList(cgid)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({
        success: false,
        error: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }
      }));

    return true; // sendResponse が非同期のため必須
  }

  if (message.type === 'GENESYS_FETCH') {
    const { requestId, url } = message as { requestId: string; url: string };
    // 応答は storage 経由（sendResponse を使わない＝"message port closed" 回避）。
    // return true で SW を fetch 完了まで生存させる。content script は応答を待たない。
    void performGenesysFetch(requestId, url);
    return true;
  }

  if (message.type === 'AI_CHAT') {
    const { systemPrompt, conversation } = message as {
      systemPrompt: string;
      conversation: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    };

    (async () => {
      try {
        const settings = await getFromStorageLocal(CHROME_STORAGE_KEY_APP_SETTINGS) as
          | { aiApiKey?: string }
          | null;
        const apiKey = settings?.aiApiKey ?? '';
        if (!apiKey) {
          sendResponse({ success: false, error: 'Z.ai APIキーが設定されていません' });
          return;
        }

        const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversation,
            ],
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          sendResponse({ success: false, error: `Z.ai API エラー: ${response.status} ${text}` });
          return;
        }

        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          sendResponse({ success: false, error: 'Z.ai APIから空の応答が返りました' });
          return;
        }
        sendResponse({ success: true, content });
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      }
    })();

    return true;
  }

  // 他のメッセージ型は処理しない
  return false;
});

/**
 * GENESYS fetch リレー（content script からの要求を onMessage で受けて fetch）
 *
 * content script が GENESYS_FETCH メッセージ（requestId, url）を送ると、host_permissions
 * で www.yugioh-card.com を fetch し、結果を chrome.storage.local の 'genesysFetchResp'
 * に書く。応答は sendResponse でなく storage 経由（"message port closed" 回避）。
 * 呼び出し側で return true して SW を fetch 完了まで生存させる。
 */
const GENESYS_FETCH_RESP_KEY = 'genesysFetchResp';
const BG_GENESYS_ALLOWED_URL_PREFIX = 'https://www.yugioh-card.com/japan/howto/genesys';

async function performGenesysFetch(requestId: string, url: string): Promise<void> {
  let resp: { requestId: string; success: boolean; text?: string; error?: string };
  try {
    if (!url.startsWith(BG_GENESYS_ALLOWED_URL_PREFIX)) {
      resp = { requestId, success: false, error: 'URL not allowed' };
    } else {
      console.warn('[BG-GENESYS] fetch start', requestId, url);
      const fetchResponse = await fetch(url);
      console.warn('[BG-GENESYS] fetch done', requestId, fetchResponse.status);
      if (!fetchResponse.ok) {
        resp = {
          requestId,
          success: false,
          error: `Failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
        };
      } else {
        const text = await fetchResponse.text();
        resp = { requestId, success: true, text };
      }
    }
  } catch (err) {
    resp = {
      requestId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    console.warn('[BG-GENESYS] fetch error', requestId, resp.error);
  }
  await chrome.storage.local.set({ [GENESYS_FETCH_RESP_KEY]: resp });
  console.warn('[BG-GENESYS] resp written', requestId, 'len=' + (resp.text?.length ?? 0));
}

/**
 * getDeckDetail + parseDeckDetail を実行して Chrome Storage に保存
 */
async function preloadDeckDetail(dno: number, cgid: string): Promise<void> {
  try {
    const { getDeckDetail } = await import('@/api/deck-operations');
    const deckInfo = await getDeckDetail(dno, cgid);

    if (deckInfo) {
      const key = `ygo-deck-preload:${dno}:${cgid}`;
      const data = {
        deckInfo,
        timestamp: Date.now()
      };

      await setToStorageLocal(key, JSON.stringify(data));

      // parseCardSection() で設定された UnifiedCacheDB をChrome Storageに同期（非同期で実行、await しない）
      const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db');
      saveUnifiedCacheDB().catch(err => console.warn('[Background] Failed to save UnifiedCacheDB:', err));
    } else {
      console.warn('[Background] Failed to get deck detail:', dno, cgid);
    }
  } catch (error) {
    console.error('[Background] Failed to preload deck detail:', error);
  }
}

/**
 * getDeckList を実行して Chrome Storage に保存
 */
async function preloadDeckList(cgid: string): Promise<void> {
  try {
    const { getDeckListInternal } = await import('@/api/deck-operations');
    const deckList = await getDeckListInternal(cgid);

    if (Array.isArray(deckList) && deckList.length > 0) {
      const data = {
        deckList,
        cgid,
        timestamp: Date.now()
      };

      await setToStorageLocal(CHROME_STORAGE_KEY_DECK_LIST_PRELOAD, JSON.stringify(data));
    } else {
      console.warn('[Background] Failed to get deck list or empty list');
    }
  } catch (error) {
    console.error('[Background] Failed to preload deck list:', error);
  }
}
