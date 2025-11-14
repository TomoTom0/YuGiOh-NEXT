/**
 * Popup UI
 *
 * 独自デッキ編集画面とオプションページへのリンクを表示
 */

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
  subtitle.textContent = 'YuGiOh Neuron EXTention';

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

  // オプションボタン
  const optionsButton = createMenuButton('オプション', () => {
    chrome.runtime.openOptionsPage();
  });

  menu.appendChild(deckButton);
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
