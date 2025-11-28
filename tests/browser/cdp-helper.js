/**
 * Chrome DevTools Protocol (CDP) ヘルパー
 *
 * Chromium経由でブラウザ操作を行うための共通関数
 */

const WebSocket = require('ws');
const fs = require('fs');

/**
 * Chrome CDPに接続
 */
function connectCDP() {
  const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
  const ws = new WebSocket(wsUrl);
  let messageId = 1;

  const helper = {
    ws,
    messageId: () => messageId++,

    /**
     * CDPコマンドを送信
     */
    sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = this.messageId();
        const handler = (data) => {
          const message = JSON.parse(data);
          if (message.id === id) {
            ws.off('message', handler);
            resolve(message);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },

    /**
     * JavaScriptを評価（戻り値あり）
     */
    async evaluate(expression) {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return result.result && result.result.result ? result.result.result.value : undefined;
    },

    /**
     * ページに移動
     */
    async navigate(url) {
      await this.sendCommand('Page.navigate', { url });
    },

    /**
     * 待機（ミリ秒）
     */
    async wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 接続を閉じる
     */
    close() {
      ws.close();
    }
  };

  return new Promise((resolve) => {
    ws.on('open', () => {
      resolve(helper);
    });
  });
}

module.exports = { connectCDP };
