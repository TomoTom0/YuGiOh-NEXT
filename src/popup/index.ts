/**
 * Popup UI
 *
 * 独自デッキ編集画面とオプションページへのリンクを表示
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.style.cssText = `
    padding: 0;
    width: 260px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  `;

  // ヘッダー
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 24px 20px;
    text-align: center;
    color: white;
  `;

  const title = document.createElement('h1');
  title.textContent = '遊戯王NEXT';
  title.style.cssText = `
    margin: 0 0 6px 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.5px;
  `;

  const subtitle = document.createElement('p');
  subtitle.textContent = 'YuGiOh Neuron EXTention';
  subtitle.style.cssText = `
    margin: 0;
    font-size: 11px;
    opacity: 0.85;
    letter-spacing: 0.3px;
  `;

  header.appendChild(title);
  header.appendChild(subtitle);

  // メニューエリア
  const menu = document.createElement('div');
  menu.style.cssText = `
    background: white;
    border-radius: 12px 12px 0 0;
    padding: 16px;
  `;

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
  button.style.cssText = `
    width: 100%;
    padding: 14px 16px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  `;

  button.textContent = title;
  button.addEventListener('click', onClick);

  button.addEventListener('mouseenter', () => {
    button.style.background = '#f8f9fa';
    button.style.borderColor = '#34495e';
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'white';
    button.style.borderColor = '#e0e0e0';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
  });

  return button;
}
