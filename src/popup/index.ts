/**
 * Popup UI
 *
 * テストページへのリンクを表示
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 20px; min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

  const title = document.createElement('h2');
  title.textContent = '遊戯王NEXT';
  title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-size: 16px;';

  const button = document.createElement('button');
  button.textContent = 'テストページを開く';
  button.style.cssText = 'width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';

  button.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/test'
    });
  });

  button.addEventListener('mouseenter', () => {
    button.style.background = '#45a049';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#4CAF50';
  });

  container.appendChild(title);
  container.appendChild(button);
  document.body.appendChild(container);
});
