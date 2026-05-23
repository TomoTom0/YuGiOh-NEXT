/**
 * 一人回し機能 最終テスト
 */
const WebSocket = require('ws');
const fs = require('fs');

const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
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

async function sleep(ms) {
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

async function run() {
  try {
    await sendCommand('Runtime.enable');

    // リロード
    await sendCommand('Page.reload');
    await sleep(6000);

    console.log('=== 一人回し機能 ブラウザテスト ===\n');

    // === 基本UI ===
    console.log('--- 基本UI ---');

    const ext = await evaluate(`!!document.querySelector('.ygo-next')`);
    assert('拡張機能ロード', ext.result.value);

    const hasPracticeBtn = await evaluate(`
      document.querySelectorAll('.practice-toggle-btn').length > 0
    `);
    assert('Practiceトグルボタン存在', hasPracticeBtn.result.value);

    // === PracticeモードON ===
    console.log('\n--- PracticeモードON ---');

    await evaluate(`
      document.querySelector('.practice-toggle-btn').click();
    `);
    await sleep(1500);

    const hasField = await evaluate(`!!document.querySelector('.practice-field')`);
    assert('PracticeField表示', hasField.result.value);

    const slotCount = await evaluate(`document.querySelectorAll('.practice-slot').length`);
    assert('30スロット表示 (Row1:8+Row2:7+Hand/Temp:15)', slotCount.result.value === 30);

    // === 操作ボタン ===
    console.log('\n--- 操作ボタン ---');

    const allBtnTexts = await evaluate(`
      Array.from(document.querySelectorAll('.practice-toggle-btn')).map(b => b.textContent.trim())
    `);
    const texts = allBtnTexts.result.value;
    assert('Undoボタン存在', texts.includes('Undo'));
    assert('Redoボタン存在', texts.includes('Redo'));
    assert('Resetボタン存在', texts.includes('Reset'));

    // Undo/Redo初期disabled状態
    const undoState = await evaluate(`
      (function() {
        const btns = document.querySelectorAll('.practice-toggle-btn');
        const undo = Array.from(btns).find(b => b.textContent.trim() === 'Undo');
        const redo = Array.from(btns).find(b => b.textContent.trim() === 'Redo');
        return JSON.stringify({
          ud: undo ? undo.disabled : null,
          rd: redo ? redo.disabled : null
        });
      })()
    `);
    const states = JSON.parse(undoState.result.value);
    assert('Undo初期disabled', states.ud === true);
    assert('Redo初期disabled', states.rd === true);

    // === PracticeモードOFF ===
    console.log('\n--- PracticeモードOFF ---');

    await evaluate(`
      const btns = document.querySelectorAll('.practice-toggle-btn');
      const deckBtn = Array.from(btns).find(b => b.textContent.trim() === 'Deck');
      if (deckBtn) deckBtn.click();
    `);
    await sleep(1000);

    const afterOff = await evaluate(`
      (function() {
        return JSON.stringify({
          practiceGone: !document.querySelector('.practice-field'),
          deckAreas: !!document.querySelector('.deck-areas')
        });
      })()
    `);
    const offState = JSON.parse(afterOff.result.value);
    assert('PracticeField非表示', offState.practiceGone);

    // === 再度ON（状態維持確認）===
    console.log('\n--- 再度ON（状態維持確認）---');

    await evaluate(`document.querySelector('.practice-toggle-btn').click()`);
    await sleep(1500);

    const fieldAgain = await evaluate(`!!document.querySelector('.practice-field')`);
    assert('PracticeField再表示', fieldAgain.result.value);

    // === Results ===
    console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    ws.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

ws.on('open', run);
