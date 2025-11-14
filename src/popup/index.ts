/**
 * Popup UI
 *
 * 独自デッキ編集画面とオプションページへのリンクを表示
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.style.cssText = `
    padding: 0;
    width: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  `;

  // ヘッダー
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px;
    text-align: center;
    color: white;
  `;

  const title = document.createElement('h1');
  title.textContent = '遊戯王NEXT';
  title.style.cssText = `
    margin: 0 0 5px 0;
    font-size: 20px;
    font-weight: 600;
  `;

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Neuron EXTention';
  subtitle.style.cssText = `
    margin: 0;
    font-size: 12px;
    opacity: 0.9;
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
  const deckButton = createMenuButton(
    '🎴 デッキ編集画面',
    'メインデッキ、エクストラデッキ、サイドデッキを編集',
    () => {
      chrome.tabs.create({
        url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
      });
    }
  );

  // オプションボタン
  const optionsButton = createMenuButton(
    '⚙️ オプション',
    '拡張機能の設定を変更',
    () => {
      chrome.runtime.openOptionsPage();
    }
  );

  menu.appendChild(deckButton);
  menu.appendChild(optionsButton);

  container.appendChild(header);
  container.appendChild(menu);
  document.body.appendChild(container);
});

/**
 * メニューボタンを作成
 */
function createMenuButton(title: string, description: string, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.style.cssText = `
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  `;

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  `;

  const descEl = document.createElement('div');
  descEl.textContent = description;
  descEl.style.cssText = `
    font-size: 12px;
    color: #666;
  `;

  button.appendChild(titleEl);
  button.appendChild(descEl);

  button.addEventListener('click', onClick);

  button.addEventListener('mouseenter', () => {
    button.style.background = '#f5f5f5';
    button.style.borderColor = '#667eea';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'white';
    button.style.borderColor = '#e0e0e0';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
  });

  return button;
}
