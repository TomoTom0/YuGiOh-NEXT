/**
 * Background Service Worker
 *
 * - デッキメタデータの定期更新
 */

import { updateDeckMetadata } from '@/utils/deck-metadata-loader';

console.log('Background service worker loaded');

const METADATA_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24時間

/**
 * デッキメタデータを更新
 */
async function updateMetadata() {
  try {
    console.log('Updating deck metadata...');
    await updateDeckMetadata();
    console.log('Deck metadata updated successfully');
  } catch (error) {
    console.error('Failed to update deck metadata:', error);
  }
}

/**
 * 拡張機能インストール時の処理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);

  // 初回インストール時にメタデータを更新
  if (details.reason === 'install') {
    await updateMetadata();
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
