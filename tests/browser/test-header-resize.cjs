/**
 * デッキ編集画面: ヘッダー成長時のスクロール到達性 回帰テスト
 *
 * TASK-286 の回帰テスト。
 * ヘッダーが遅延ロード（画像・バナー・お知らせ等）で成長した際、
 * --header-height が ResizeObserver で追従し、
 * .deck-edit-container が viewport 内に収まり、
 * 一番下までスクロールしてもトラッシュセクションが見切れないことを検証する。
 *
 * 実行: node tests/browser/test-header-resize.cjs
 * 前提: ./scripts/debug/setup/start-chrome.sh でChromium起動済み、editページでログイン済み
 */
const WebSocket = require('ws');
const fs = require('fs');
const { WS_FILE } = require('./cdp-helper.cjs');

const wsUrl = fs.readFileSync(WS_FILE, 'utf8').trim();
const ws = new WebSocket(wsUrl);

let messageId = 1;

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    const handler = (data) => {
      const message = JSON.parse(data);
      if (message.id === id) {
        ws.off('message', handler);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function evaluate(expression) {
  return sendCommand('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

async function readState() {
  const r = await evaluate(`
    (() => {
      const header = document.querySelector('header') || document.querySelector('#header');
      const container = document.querySelector('.deck-edit-container');
      const deckAreas = document.querySelector('.deck-areas');
      if (!header || !container || !deckAreas) {
        return JSON.stringify({ missing: true });
      }
      const cb = container.getBoundingClientRect();
      const hc = header.getBoundingClientRect();
      return JSON.stringify({
        missing: false,
        headerVar: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0,
        headerActual: Math.round(hc.height),
        containerBottom: Math.round(cb.bottom),
        viewportH: window.innerHeight,
      });
    })()
  `);
  return JSON.parse(r.result.value);
}

async function readScrollState() {
  const r = await evaluate(`
    (() => {
      const deckAreas = document.querySelector('.deck-areas');
      deckAreas.scrollTop = deckAreas.scrollHeight;
      const sections = deckAreas.querySelectorAll(':scope > *');
      const lastSection = sections[sections.length - 1];
      const lb = lastSection.getBoundingClientRect();
      const maxScrollReached = deckAreas.scrollTop + deckAreas.clientHeight >= deckAreas.scrollHeight - 1;
      return JSON.stringify({
        lastSectionBottom: Math.round(lb.bottom),
        viewportH: window.innerHeight,
        maxScrollReached,
      });
    })()
  `);
  return JSON.parse(r.result.value);
}

async function run() {
  try {
    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    console.log('=== デッキ編集画面 ヘッダー成長時スクロール到達性テスト ===\n');

    // editページへ移動
    await sendCommand('Page.navigate', { url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit' });
    await sleep(5000);

    console.log('--- 初期状態（ヘッダー成長なし） ---');
    const initial = await readState();
    if (initial.missing) {
      console.log('  FAIL: 編集UIがロードされていません（ログイン済みか確認）');
      failed++;
    } else {
      assert('--header-height が実際のヘッダー高さに一致', initial.headerVar === initial.headerActual);
      assert('.deck-edit-container が viewport 内に収まる', initial.containerBottom <= initial.viewportH);
    }

    console.log('\n--- ヘッダー成長をシミュレート（遅延ロードのバナー追加） ---');
    // 実際のヘッダーに220pxの子要素を追加して成長を再現
    await evaluate(`
      (() => {
        const header = document.querySelector('header') || document.querySelector('#header');
        const spacer = document.createElement('div');
        spacer.id = '__test_header_banner';
        spacer.style.height = '220px';
        spacer.style.width = '100%';
        header.appendChild(spacer);
        return 'appended';
      })()
    `);
    // ResizeObserver の発火と --header-height 更新を待つ
    await sleep(800);

    const after = await readState();
    const expectedHeader = initial.headerActual + 220;
    assert('ヘッダーが実際に成長した', after.headerActual === expectedHeader);
    assert('--header-height がヘッダー成長に追従（ResizeObserver）', after.headerVar === after.headerActual);
    assert('.deck-edit-container が viewport 内に収まる（見切れなし）', after.containerBottom <= after.viewportH);

    console.log('\n--- 一番下までスクロール ---');
    const scroll = await readScrollState();
    assert('スクロール最大位置に到達', scroll.maxScrollReached);
    assert('トラッシュセクションまでスクロール到達可能（見切れなし）', scroll.lastSectionBottom <= scroll.viewportH);

    console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  } catch (e) {
    console.error('Error:', e.message);
    failed++;
  } finally {
    // テスト用バナーを削除
    try {
      await evaluate(`document.getElementById('__test_header_banner')?.remove(); 'cleaned'`);
    } catch (_) {
      // クリーンアップ失敗は無視
    }
    ws.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

ws.on('open', run);
ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
