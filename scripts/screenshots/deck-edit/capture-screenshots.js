const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
const ws = new WebSocket(wsUrl);
let messageId = 1;

function sendCommand(method, params = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const message = JSON.parse(data);
      if (message.id === id) {
        ws.off('message', handler);
        resolve(message.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreenshot(filename, description) {
  const screenshot = await sendCommand('Page.captureScreenshot', {
    format: 'png'
  });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const filepath = path.join(__dirname, '../../../docs/usage/images', filename);
  fs.writeFileSync(filepath, buffer);
  console.log('✅', description);
}

async function captureScreenshots() {
  console.log('デモ用スクリーンショット撮影開始...\n');

  await sendCommand('Page.navigate', {
    url: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=ja#/ytomo/edit'
  });
  console.log('ページロード中...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 1. 初期状態
  console.log('\n1. 初期状態');
  await captureScreenshot('01-initial-state.png', '  初期状態');

  // 2. デッキ名を入力
  console.log('\n2. デッキ名入力');
  await sendCommand('Runtime.evaluate', {
    expression: `
      const nameInput = document.querySelector('.deck-name-input');
      if (nameInput) {
        nameInput.value = 'サンプルデッキ - v0.3.0';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await captureScreenshot('02-deck-name-input.png', '  デッキ名入力完了');

  // 3. Cardタブに切り替えてカード詳細表示
  console.log('\n3. Cardタブに切り替え＋カード選択');
  await sendCommand('Runtime.evaluate', {
    expression: `
      const tabs = document.querySelectorAll('.right-area > .tabs > button');
      const cardTab = Array.from(tabs).find(t => t.textContent.trim() === 'Card');
      if (cardTab) cardTab.click();
    `
  });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 左側デッキエリアの最初のカードをクリック
  await sendCommand('Runtime.evaluate', {
    expression: `
      const mainCards = document.querySelectorAll('.main-deck .card-item, .left-area .main .card-item, .deck-list .main .card-item');
      if (mainCards.length > 0) {
        const firstCard = mainCards[0];
        const infoBtn = firstCard.querySelector('.card-btn.top-left');
        if (infoBtn) infoBtn.click();
      }
    `
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await captureScreenshot('03-card-detail-info.png', '  カード詳細（Info）');

  // 4. Related
  console.log('\n4. カード詳細（Relatedタブ）');
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const cardTabs = document.querySelectorAll('.card-detail-tabs button');
        const targetTab = Array.from(cardTabs).find(t => t.textContent.trim() === 'Related');
        if (targetTab) targetTab.click();
      })()
    `
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await captureScreenshot('04-card-detail-related.png', '  カード詳細（Related）');

  // 5. Products
  console.log('\n5. カード詳細（Productsタブ）');
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const cardTabs = document.querySelectorAll('.card-detail-tabs button');
        const targetTab = Array.from(cardTabs).find(t => t.textContent.trim() === 'Products');
        if (targetTab) targetTab.click();
      })()
    `
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await captureScreenshot('05-card-detail-products.png', '  カード詳細（Products）');

  // 6. Q&A
  console.log('\n6. カード詳細（Q&Aタブ）');
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const cardTabs = document.querySelectorAll('.card-detail-tabs button');
        const targetTab = Array.from(cardTabs).find(t => t.textContent.trim() === 'Q&A');
        if (targetTab) targetTab.click();
      })()
    `
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await captureScreenshot('06-card-detail-qa.png', '  カード詳細（Q&A）');

  // 7. 検索機能（Searchタブ）
  console.log('\n7. 検索機能（Searchタブ）');
  await sendCommand('Runtime.evaluate', {
    expression: `
      const tabs = document.querySelectorAll('.right-area > .tabs > button');
      const searchTab = Array.from(tabs).find(t => t.textContent.trim() === 'Search');
      if (searchTab) searchTab.click();
    `
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 検索欄に入力
  const boxResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const searchInput = document.querySelector('.search-input-bottom input');
        const rect = searchInput.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `,
    returnByValue: true
  });

  const box = boxResult.result.value;

  await sendCommand('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: box.x,
    y: box.y,
    button: 'left',
    clickCount: 1
  });
  await sendCommand('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: box.x,
    y: box.y,
    button: 'left',
    clickCount: 1
  });
  await new Promise(resolve => setTimeout(resolve, 300));

  await sendCommand('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await sendCommand('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await new Promise(resolve => setTimeout(resolve, 100));

  await sendCommand('Input.insertText', {
    text: 'ブラック・マジシャン'
  });
  console.log('  検索テキスト入力: ブラック・マジシャン');
  await new Promise(resolve => setTimeout(resolve, 500));

  await sendCommand('Runtime.evaluate', {
    expression: `
      const searchBtn = document.querySelector('.search-btn');
      if (searchBtn) searchBtn.click();
    `
  });
  console.log('  検索ボタンクリック');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 検索結果を確認
  const searchResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const resultsContainer = document.querySelector('.card-list-results');
        const cards = resultsContainer ? resultsContainer.querySelectorAll('.card-item') : [];
        return cards.length;
      })()
    `,
    returnByValue: true
  });
  console.log('  検索結果:', searchResult.result.value, '件');

  await captureScreenshot('07-search-function.png', '  検索機能');

  console.log('\n✅ 全てのスクリーンショットを撮影しました！');
  ws.close();
}

ws.on('open', () => captureScreenshots().catch(err => {console.error(err); ws.close(); process.exit(1);}));
