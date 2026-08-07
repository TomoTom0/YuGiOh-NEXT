/**
 * Chrome DevTools Protocol (CDP) ヘルパー
 *
 * Chromium経由でブラウザ操作を行うための共通関数
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

/**
 * configs/browser.toml から指定キーの値を読み取る
 * プロジェクトルートから実行される前提（相対パスで configs/browser.toml にアクセス）
 * @param {string} key - TOMLキー（例: "chrome.ws_file"）
 * @returns {string} 値。読み取り失敗時は空文字列
 */
function readBrowserConfig(key) {
  try {
    const toml = fs.readFileSync('configs/browser.toml', 'utf8');
    const escaped = key.replace(/\./g, '\\.');
    const re = new RegExp(`^${escaped}\\s*=\\s*"([^"]*)"`, 'm');
    const match = toml.match(re);
    return match ? match[1] : '';
  } catch (e) {
    console.error('Failed to read configs/browser.toml:', e.message);
    return '';
  }
}

/** WebSocketエンドポイントファイルのパス（configs/browser.toml から取得） */
const WS_FILE = readBrowserConfig('chrome.ws_file');

/**
 * Chrome CDPに接続
 */
function connectCDP() {
  const wsUrl = fs.readFileSync(WS_FILE, 'utf8').trim();
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
     * イベントリスナーを追加
     */
    on(eventName, callback) {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.method === eventName) {
          callback(message.params);
        }
      });
    },

    /**
     * イベントリスナーを削除
     */
    off(eventName, callback) {
      // WebSocketのイベントリスナーを削除
      ws.off('message', callback);
    },

    /**
     * 条件式が真を返すまでポーリング待機（Vue の v-if + await 非同期描画に対応）
     * タイムアウト時は最終値（偽）を返し例外は投げない（呼び出し側で assert すること）
     */
    async waitFor(expression, timeout = 5000, interval = 200) {
      const start = Date.now();
      let last;
      while (Date.now() - start < timeout) {
        last = await this.evaluate(expression);
        if (last) return last;
        await this.wait(interval);
      }
      return last;
    },

    /**
     * 指定パターンを含むURLのNetworkリクエストを待機（フラグベース・cdp.offバグ回避）
     * タイムアウト時は null を返し例外投げなし（呼側で assert すること）
     * ※リクエストを取りこぼさないよう、navigate より前に呼び出して監視を開始すること
     */
    async waitForRequest(urlPattern, timeout = 10000) {
      await this.sendCommand('Network.enable');
      return new Promise((resolve) => {
        let resolved = false;
        const handler = (data) => {
          try {
            const message = JSON.parse(data);
            if (message.method === 'Network.requestWillBeSent' && !resolved) {
              const url = message.params && message.params.request && message.params.request.url;
              if (url && url.includes(urlPattern)) {
                resolved = true;
                ws.off('message', handler);
                resolve({ url, requestId: message.params.requestId });
              }
            }
          } catch (e) { /* ignore parse errors */ }
        };
        ws.on('message', handler);
        setTimeout(() => {
          if (!resolved) { resolved = true; ws.off('message', handler); resolve(null); }
        }, timeout);
      });
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

/**
 * テスト用の assert コンテキストを生成
 * 使用例:
 *   const t = createTestContext();
 *   t.assert('検証名', 条件);
 *   t.summary();
 *   process.exit(t.exitCode());
 */
function createTestContext() {
  let passed = 0;
  let failed = 0;
  return {
    assert(name, condition) {
      if (condition) { console.log(`  PASS: ${name}`); passed++; }
      else { console.log(`  FAIL: ${name}`); failed++; }
    },
    get passed() { return passed; },
    get failed() { return failed; },
    summary() {
      console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
    },
    exitCode() { return failed > 0 ? 1 : 0; }
  };
}

module.exports = { connectCDP, createTestContext, WS_FILE };
