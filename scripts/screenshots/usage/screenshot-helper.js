/**
 * スクリーンショット撮影用のCDPヘルパー
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

/**
 * Chrome CDPに接続してスクリーンショット機能を提供
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
        returnByValue: true
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
     * ページ全体のスクリーンショットを撮影
     * @param {string} outputPath - 出力先のファイルパス
     */
    async captureFullPage(outputPath) {
      console.log(`Capturing full page to: ${outputPath}`);

      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      });

      if (result.result && result.result.data) {
        const buffer = Buffer.from(result.result.data, 'base64');
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
        return outputPath;
      }
      throw new Error('Failed to capture screenshot');
    },

    /**
     * ビューポート領域のスクリーンショットを撮影
     * @param {string} outputPath - 出力先のファイルパス
     */
    async captureViewport(outputPath) {
      console.log(`Capturing viewport to: ${outputPath}`);

      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png'
      });

      if (result.result && result.result.data) {
        const buffer = Buffer.from(result.result.data, 'base64');
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
        return outputPath;
      }
      throw new Error('Failed to capture screenshot');
    },

    /**
     * 特定の要素のスクリーンショットを撮影
     * @param {string} selector - CSS セレクタ
     * @param {string} outputPath - 出力先のファイルパス
     * @param {object} options - オプション（padding など）
     */
    async captureElement(selector, outputPath, options = {}) {
      console.log(`Capturing element "${selector}" to: ${outputPath}`);

      // 要素の位置とサイズを取得
      const rect = await this.evaluate(`
        (() => {
          const el = document.querySelector('${selector}');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
          };
        })()
      `);

      if (!rect) {
        throw new Error(`Element not found: ${selector}`);
      }

      // パディングを適用
      const padding = options.padding || 0;
      const clip = {
        x: Math.max(0, rect.x - padding),
        y: Math.max(0, rect.y - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        scale: 1
      };

      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip
      });

      if (result.result && result.result.data) {
        const buffer = Buffer.from(result.result.data, 'base64');
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
        return outputPath;
      }
      throw new Error('Failed to capture screenshot');
    },

    /**
     * 座標指定でスクリーンショットを撮影
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} width - 幅
     * @param {number} height - 高さ
     * @param {string} outputPath - 出力先のファイルパス
     */
    async captureClip(x, y, width, height, outputPath) {
      console.log(`Capturing clip (${x}, ${y}, ${width}, ${height}) to: ${outputPath}`);

      const result = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip: { x, y, width, height, scale: 1 }
      });

      if (result.result && result.result.data) {
        const buffer = Buffer.from(result.result.data, 'base64');
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
        return outputPath;
      }
      throw new Error('Failed to capture screenshot');
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
