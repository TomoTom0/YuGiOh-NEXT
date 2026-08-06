/**
 * GENESYSポイント取得（OCG/GENESYSリミットレギュレーション）のE2Eテスト
 *
 * 検証対象（TASK-302）:
 *   content script（db.yugioh-card.com 上）からの GENESYSデータ取得が
 *   background service worker 経由のfetchリレー（GENESYS_FETCH_TEXT）で成功する（CORS回避）。
 *
 * 3段階検証:
 *   1. background service worker から www.yugioh-card.com への直接fetch（CORS回避の前提確認）
 *   2. エンドツーエンド: 公開デッキ表示ページを開き content script 経由で
 *      chrome.storage.local の genesysPointList キャッシュが格納されるか
 *   3. GENESYS_FETCH_TEXT 経路（content script → background → fetch）の統合確認
 *
 * 注: GENESYSポイント表示（.genesys-pt-badge）はデッキ編集ページのみだが、
 *     キャッシュ取得（genesysPointCache.init）は全 content script で走るため、
 *     認証不要な公開デッキ表示ページで取得ロジックを検証できる。
 */

const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const { createTestContext } = require('./cdp-helper.cjs');

const PAGE_WS_URL = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
// 公開デッキ表示URL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';
const GENESYS_INDEX_URL = 'https://www.yugioh-card.com/japan/howto/genesys/';

/** 汎用 CDP 接続（wsUrl を指定） */
function connectTo(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let messageId = 1;
  const pending = new Map();

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve } = pending.get(message.id);
      pending.delete(message.id);
      resolve(message);
    }
  });

  const sendCommand = (method, params = {}) =>
    new Promise((resolve) => {
      const id = messageId++;
      pending.set(id, { resolve });
      ws.send(JSON.stringify({ id, method, params }));
    });

  return new Promise((resolve, reject) => {
    ws.on('open', () =>
      resolve({
        async evaluate(expression) {
          const result = await sendCommand('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
          });
          const r = result.result && result.result.result;
          if (!r || r.type === 'undefined') return undefined;
          return r.value;
        },
        navigate: (url) => sendCommand('Page.navigate', { url }),
        wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        async waitFor(expression, timeout = 40000, interval = 1500) {
          const start = Date.now();
          let last;
          while (Date.now() - start < timeout) {
            last = await this.evaluate(expression);
            if (last) return last;
            await this.wait(interval);
          }
          return last;
        },
        close: () => ws.close(),
      })
    );
    ws.on('error', reject);
  });
}

/** service worker ターゲットの webSocketDebuggerUrl を取得 */
function getServiceWorkerWsUrl() {
  return new Promise((resolve) => {
    http
      .get('http://localhost:9222/json', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const targets = JSON.parse(data);
            const sw = targets.find(
              (t) => t.type === 'service_worker' && t.url && t.url.startsWith('chrome-extension://')
            );
            resolve(sw ? sw.webSocketDebuggerUrl : null);
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
}

async function main() {
  const t = createTestContext();
  console.log('【GENESYSポイント取得 E2Eテスト（TASK-302）】\n');

  const page = await connectTo(PAGE_WS_URL);

  // 公開デッキページを開いて background service worker を起動させる
  console.log('公開デッキ表示ページにアクセス中...');
  await page.navigate(DECK_URL);
  await page.wait(6000);

  // service worker ターゲット取得（リトライ付き）
  let sw = null;
  for (let i = 0; i < 3 && !sw; i++) {
    const swWsUrl = await getServiceWorkerWsUrl();
    if (swWsUrl) {
      sw = await connectTo(swWsUrl);
    } else {
      await page.wait(3000);
    }
  }
  if (sw) {
    console.log('background service worker に接続');
  } else {
    console.log('WARNING: service worker ターゲット未検出');
  }

  // === 検証1: service worker から www.yugioh-card.com への直接fetch（CORS回避の前提）===
  console.log('\n--- 検証1: background からのCORS越えfetch ---');
  if (sw) {
    const fetchResult = await sw.evaluate(`
      (async () => {
        try {
          const r = await fetch(${JSON.stringify(GENESYS_INDEX_URL)});
          const text = await r.text();
          return { ok: r.ok, status: r.status, hasIndexSection: text.includes('id="point"'), length: text.length };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      })()
    `);
    t.assert(
      'background から GENESYS howtoページをfetch成功（CORS回避）',
      fetchResult && fetchResult.ok && fetchResult.hasIndexSection
    );
    console.log(
      '    status=' + (fetchResult && fetchResult.status) +
      ', length=' + (fetchResult && fetchResult.length) +
      (fetchResult && fetchResult.error ? ', error=' + fetchResult.error : '')
    );
  } else {
    t.assert('background service worker ターゲット取得', false);
  }

  // === 検証2: エンドツーエンド（content script → background経由fetch → storage）===
  console.log('\n--- 検証2: エンドツーエンド（キャッシュ取得）---');

  // 既存キャッシュをクリア
  if (sw) {
    await sw.evaluate(
      `new Promise(r => chrome.storage.local.remove('genesysPointList', () => r(true)))`
    );
    console.log('既存キャッシュ（genesysPointList）をクリア');
  }

  // ページリロードで content script を再実行（genesysPointCache.init → fetch）
  await page.navigate(DECK_URL);
  console.log('ページリロード、content script の GENESYS取得を待機中...');

  let cacheJson = null;
  if (sw) {
    cacheJson = await sw.waitFor(
      `
      new Promise(resolve => {
        chrome.storage.local.get('genesysPointList', d => {
          const c = d && d.genesysPointList;
          if (c && c.lists && Object.keys(c.lists).length > 0) {
            resolve(JSON.stringify({ listParams: Object.keys(c.lists), latest: c.latestListParam }));
          } else {
            resolve(null);
          }
        });
      })
    `,
      45000,
      1500
    );
  }

  if (cacheJson) {
    const parsed = JSON.parse(cacheJson);
    t.assert('GENESYSポイントキャッシュがchrome.storageに格納された', true);
    t.assert('取得したリストが1件以上', parsed.listParams && parsed.listParams.length > 0);
    console.log('    取得リスト: ' + (parsed.listParams || []).join(', '));
    console.log('    最新リスト: ' + parsed.latest);

    // 最新リストのエントリ詳細
    const detail = await sw.evaluate(`
      new Promise(resolve => {
        chrome.storage.local.get('genesysPointList', d => {
          const c = d && d.genesysPointList;
          if (!c || !c.latestListParam) return resolve(null);
          const list = c.lists[c.latestListParam];
          if (!list) return resolve(null);
          const points = list.points || {};
          const cids = Object.keys(points);
          resolve(JSON.stringify({
            listParam: list.listParam,
            effectiveDate: list.effectiveDate,
            incomplete: list.incomplete,
            entryCount: cids.length,
            sample: cids.slice(0, 5).map(cid => ({ cid, point: points[cid] })),
          }));
        });
      })
    `);
    if (detail) {
      const d = JSON.parse(detail);
      t.assert('最新リストにカードエントリが含まれる', d.entryCount > 0);
      console.log(
        '    エントリ数: ' + d.entryCount + ', incomplete: ' + d.incomplete +
        ', effectiveDate: ' + d.effectiveDate
      );
      console.log('    サンプル: ' + JSON.stringify(d.sample));
    } else {
      t.assert('最新リストの詳細取得', false);
    }
  } else {
    t.assert('GENESYSポイントキャッシュがchrome.storageに格納された', false);
    console.log('    （タイムアウト: キャッシュ未取得。background経由fetchリレー失敗の可能性）');
  }

  // === 検証3: GENESYS_FETCH_TEXT 経路（統合確認）===
  console.log('\n--- 検証3: GENESYS_FETCH_TEXT 経路（content script -> background -> fetch）---');
  // 検証1で background fetch が成功し、検証2で content script→background→storage の
  // 全フローが成功したことで、GENESYS_FETCH_TEXT リレー経路が機能していることを確認
  t.assert('GENESYS_FETCH_TEXT リレー経路が機能した', cacheJson !== null);

  // === 補足診断: content script の set が storage に届いているか ===
  if (sw) {
    const reqDump = await sw.evaluate(
      `new Promise(r => chrome.storage.local.get('genesysFetchReq', d => r(JSON.stringify(d))))`
    );
    console.log('\n=== genesysFetchReq の内容（content script の set が storage に書けたか）===');
    console.log('  ' + (reqDump || '(null)'));
  }

  t.summary();
  page.close();
  if (sw) sw.close();
  process.exit(t.exitCode());
}

main().catch((err) => {
  console.error('テストエラー:', err);
  process.exit(1);
});
