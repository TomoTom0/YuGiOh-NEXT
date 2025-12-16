/**
 * Popup UI
 *
 * 独自デッキ編集画面とオプションページへのリンクを表示
 */

import '../styles/themes.scss';
import './popup.css';
import { createPinia } from 'pinia';
import { useSettingsStore } from '../stores/settings';
import { getVueEditUrl } from '../utils/url-builder';

// Piniaを初期化してテーマを適用
const pinia = createPinia();
const settingsStore = useSettingsStore(pinia);

// 設定を読み込んでテーマを適用（非同期）
(async () => {
  await settingsStore.loadSettings();
  // テーマ属性を設定（CSS変数の解決のため）
  document.documentElement.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme);
})();

/**
 * URLから request_locale を抽出
 */
function extractLocaleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('request_locale');
  } catch {
    return null;
  }
}

/**
 * 現在のアクティブなタブから request_locale を取得
 */
async function getLocaleFromActiveTab(): Promise<string | undefined> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
      const locale = extractLocaleFromUrl(tabs[0].url);
      return locale || undefined;
    }
  } catch (error) {
    console.error('[YGO Helper] Failed to get active tab:', error);
  }
  return undefined;
}

document.addEventListener('DOMContentLoaded', () => {
  // コンテナ
  const container = document.createElement('div');
  container.className = 'popup-container';

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'popup-header';

  const title = document.createElement('h1');
  title.className = 'popup-title';
  title.textContent = '遊戯王NEXT';

  const subtitle = document.createElement('p');
  subtitle.className = 'popup-subtitle';
  subtitle.textContent = 'YuGiOh Neuron EXTension';

  header.appendChild(title);
  header.appendChild(subtitle);

  // メニューエリア
  const menu = document.createElement('div');
  menu.className = 'popup-menu';

  // デッキ編集ボタン
  const deckButton = createMenuButton('デッキ編集画面', async () => {
    const locale = await getLocaleFromActiveTab();
    chrome.tabs.create({
      url: getVueEditUrl('ocg', undefined, locale)
    });
  });

  // デッキ編集(ラッシュ)ボタン
  const deckRushButton = createMenuButton('Rushデッキ編集', async () => {
    const locale = await getLocaleFromActiveTab();
    chrome.tabs.create({
      url: getVueEditUrl('rush', undefined, locale)
    });
  });

  // オプションボタン
  const optionsButton = createMenuButton('オプション', () => {
    chrome.runtime.openOptionsPage();
  });

  menu.appendChild(deckButton);
  menu.appendChild(deckRushButton);
  menu.appendChild(optionsButton);

  container.appendChild(header);
  container.appendChild(menu);

  const appDiv = document.getElementById('app');
  if (appDiv) {
    appDiv.appendChild(container);
    // FOUC防止：コンテンツ追加後にフェードイン
    requestAnimationFrame(() => {
      appDiv.classList.add('loaded');
    });
  }
});

/**
 * メニューボタンを作成
 */
function createMenuButton(title: string, onClick: () => void | Promise<void>): HTMLElement {
  const button = document.createElement('button');
  button.className = 'menu-button';
  button.textContent = title;
  button.addEventListener('click', onClick);
  return button;
}
