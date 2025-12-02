/**
 * Popup UI
 *
 * 独自デッキ編集画面とオプションページへのリンクを表示
 */

import '../styles/themes.scss';
import './popup.css';
import { createPinia } from 'pinia';
import { useSettingsStore } from '../stores/settings';

// Piniaを初期化してテーマを適用
const pinia = createPinia();
const settingsStore = useSettingsStore(pinia);
// 設定を読み込んでテーマを適用
settingsStore.loadSettings();

// テーマ属性を設定（CSS変数の解決のため）
document.documentElement.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme);

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
  const deckButton = createMenuButton('デッキ編集画面', () => {
    chrome.tabs.create({
      url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
    });
  });

  // デッキ編集(ラッシュ)ボタン
  const deckRushButton = createMenuButton('Rushデッキ編集', () => {
    chrome.tabs.create({
      url: 'https://www.db.yugioh-card.com/rushdb/#/ytomo/edit'
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
  document.body.appendChild(container);
});

/**
 * メニューボタンを作成
 */
function createMenuButton(title: string, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'menu-button';
  button.textContent = title;
  button.addEventListener('click', onClick);
  return button;
}
