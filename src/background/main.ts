/**
 * Background Service Worker
 *
 * - デッキメタデータの定期更新
 * - デッキ詳細情報のプリロード
 */

import { updateDeckMetadata } from '@/utils/deck-metadata-loader';
import { getVueEditUrl } from '@/utils/url-builder';
import { setToStorageLocal } from '@/utils/chrome-storage-utils';

const METADATA_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24時間

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
 * デッキ詳細情報をプリロード
 * Content Script からのリクエストに応じて、DeckDetail を取得して Chrome Storage に保存
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  // 他のメッセージ型は処理しない
  return false;
});

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

      console.log('[Background] Deck preloaded:', key);
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
      const key = 'ygo-deck-list-preload';
      const data = {
        deckList,
        cgid,
        timestamp: Date.now()
      };

      await setToStorageLocal(key, JSON.stringify(data));
      console.log('[Background] Deck list preloaded:', deckList.length, 'decks');
    } else {
      console.warn('[Background] Failed to get deck list or empty list');
    }
  } catch (error) {
    console.error('[Background] Failed to preload deck list:', error);
  }
}
