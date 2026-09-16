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
    // TOMLセクション形式 [section]\nkey = "value" に対応
    // keyは "section.subkey" 形式（例: "chrome.ws_file"）
    const parts = key.split('.');
    if (parts.length === 2) {
      const sectionRe = new RegExp(`\\[${parts[0]}\\]\\n([^[]*)`, 'm');
      const sectionMatch = toml.match(sectionRe);
      if (sectionMatch && sectionMatch[1]) {
        const keyRe = new RegExp(`^${parts[1]}\\s*=\\s*"([^"]*)"`, 'm');
        const keyMatch = sectionMatch[1].match(keyRe);
        return keyMatch ? keyMatch[1] : '';
      }
    }
    // フォールバック: フラットキーとして検索
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

/** セッションstateファイルのパス（configs/browser.toml の session.state_file から取得） */
const SESSION_STATE_FILE = readBrowserConfig('session.state_file');

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

// --- 公開デッキ表示URL（テストデータの一元化。TASK-467） ---
// ope=1 のGET表示には ytkn（CSRFトークン）は不要で cgid（公開デッキID）のみで表示可能
// （TASK-467で実機検証済み。ytknはcookieセッションとペアで失効するためURLから除去）。
// cgid は約6週間で失効する。失効時は PUBLIC_DECK_CGID のみ差し替える
// （再調達手順は tests/browser/README.md「テスト対象URL」参照）。
const PUBLIC_DECK_CGID = '3d839f01a4d87b01928c60f262150bec';
const PUBLIC_DECK_DNO = '8';
const PUBLIC_DECK_URL =
  `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck` +
  `&cgid=${PUBLIC_DECK_CGID}&dno=${PUBLIC_DECK_DNO}`;

/**
 * ログインセッション（storageState）を現在のChromiumへcookieとして注入する（TASK-467）
 *
 * 呼び出し基準: (a) 認証が必要なページへアクセスする、かつ (b) 手動ログイン済み
 * プロファイルの状態に依存せず動かしたい、というテストだけが呼ぶ。
 * ope=1公開URLのみのテストは呼ばない（詳細: tests/browser/README.md「ログインセッション」）。
 *
 * @param {object} cdp - connectCDP() の戻り値（helper）
 * @returns {Promise<number>} 注入したcookie件数
 * @throws {Error} stateファイルの不備・cookie注入の失敗時（fail-fast）
 */
async function injectSession(cdp) {
  if (!SESSION_STATE_FILE) {
    throw new Error('configs/browser.toml の session.state_file が読み取れません');
  }
  if (!fs.existsSync(SESSION_STATE_FILE)) {
    throw new Error(
      `セッションstateファイルが見つかりません: ${SESSION_STATE_FILE}\n` +
      '  再生成: ./scripts/debug/setup/export-session-state.sh（詳細: tests/browser/README.md「ログインセッション」）');
  }
  let state;
  try {
    state = JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf8'));
  } catch (e) {
    throw new Error(`セッションstateファイルの読み取りに失敗: ${SESSION_STATE_FILE} (${e.message})`);
  }
  if (!Array.isArray(state.cookies) || state.cookies.length === 0) {
    throw new Error(`セッションstateファイルにcookieがありません: ${SESSION_STATE_FILE}`);
  }
  await cdp.sendCommand('Page.enable');
  await cdp.sendCommand('Network.enable');
  await cdp.navigate('https://www.db.yugioh-card.com/yugiohdb/');
  // waitFor はタイムアウト時にfalseを返すだけのため、失敗をここでfail-fastさせる
  const ready = await cdp.waitFor("document.readyState === 'complete'", 15000, 300);
  if (!ready) {
    throw new Error('db.yugioh-card.com へのナビゲーションがタイムアウトしました（cookie注入の前提が成立しません）');
  }
  await cdp.wait(1000);
  // sameSite は Strict/Lax のみ明示し、それ以外はキーを省略する
  // （未指定を明示的な 'None'（=SameSite=None; Secure相当）に変換しないため。レビューL-1）
  const cookies = state.cookies.map((c) => {
    const ck = {
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      expires: c.expires > 0 ? c.expires : undefined,
      httpOnly: c.httpOnly, secure: c.secure
    };
    if (c.sameSite === 'Strict' || c.sameSite === 'Lax') ck.sameSite = c.sameSite;
    return ck;
  });
  await cdp.sendCommand('Network.setCookies', { cookies });
  const res = await cdp.sendCommand('Network.getCookies', { urls: ['https://www.db.yugioh-card.com/'] });
  const dbCookies = (res.result && res.result.cookies) || [];
  if (dbCookies.length === 0) {
    // sendCommand はCDP errorをrejectしないため、元エラーを含めて診断可能にする（レビューL-2）
    const cdpErr = res.error ? ` CDP error: ${res.error.code || ''} ${res.error.message || ''}` : '';
    throw new Error(`cookie注入に失敗しました（db.yugioh-card.com のcookieが0件）${cdpErr}`);
  }
  console.log(`[session] cookie注入完了: ${cookies.length}件（db.yugioh-card.com: ${dbCookies.length}件）`);
  return cookies.length;
}

module.exports = { connectCDP, createTestContext, WS_FILE, PUBLIC_DECK_URL, PUBLIC_DECK_CGID, PUBLIC_DECK_DNO, injectSession };
