/**
 * Background Service Worker
 *
 * - デッキメタデータの定期更新
 */

import { updateDeckMetadata } from '@/utils/deck-metadata-loader';
import { getVueEditUrl } from '@/utils/url-builder';

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
