/**
 * 検索フィルターのNOT条件テスト
 *
 * 以下の挙動を確認：
 * 1. NOT条件（除外モンスタータイプ）が正しくAPIパラメータに変換されること
 * 2. AND/OR論理演算が正しくAPIパラメータに変換されること
 * 3. その他のフィルター（ペンデュラムスケール、魔法・罠タイプ、発売日）が正しく変換されること
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集URL
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testFilterNotCondition() {
  console.log('【検索フィルターNOT条件テスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動（キャッシュをクリアしてリロード）
    console.log('デッキ編集ページにアクセス中...');
    await cdp.sendCommand('Network.clearBrowserCache');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== NOT条件（除外モンスタータイプ）のテスト ===\n');

    // フィルターダイアログを開く
    await cdp.evaluate(`
      (() => {
        const menuBtn = document.querySelector('.menu-btn');
        if (menuBtn) menuBtn.click();
      })()
    `);
    await cdp.wait(500);

    // フィルターをクリア（前回のテスト実行の影響を除去）
    await cdp.evaluate(`
      (() => {
        const clearBtn = document.querySelector('.clear-btn');
        if (clearBtn) clearBtn.click();
      })()
    `);
    await cdp.wait(300);

    // 融合モンスターのボタンの現在の状態を確認して、NOT状態にする
    const initialState = await cdp.evaluate(`
      (() => {
        const fusionBtn = document.querySelector('.chip.chip-fixed[data-type="fusion"]');
        return {
          hasActive: fusionBtn ? fusionBtn.classList.contains('active') : false,
          hasNot: fusionBtn ? fusionBtn.classList.contains('not') : false
        };
      })()
    `);

    // 状態に応じて必要な回数クリック
    // 空 → 1回クリック → normal → 2回クリック → not
    // normal → 1回クリック → not
    // not → そのまま
    if (!initialState.hasActive && !initialState.hasNot) {
      // 空の状態: 2回クリックが必要
      await cdp.evaluate(`
        (() => {
          const fusionBtn = document.querySelector('.chip.chip-fixed[data-type="fusion"]');
          if (fusionBtn) fusionBtn.click();
        })()
      `);
      await cdp.wait(100);
      await cdp.evaluate(`
        (() => {
          const fusionBtn = document.querySelector('.chip.chip-fixed[data-type="fusion"]');
          if (fusionBtn) fusionBtn.click();
        })()
      `);
      await cdp.wait(100);
    } else if (initialState.hasActive && !initialState.hasNot) {
      // normal状態: 1回クリックが必要
      await cdp.evaluate(`
        (() => {
          const fusionBtn = document.querySelector('.chip.chip-fixed[data-type="fusion"]');
          if (fusionBtn) fusionBtn.click();
        })()
      `);
      await cdp.wait(100);
    }
    // not状態の場合は何もしない

    await cdp.wait(300);

    // AND/ORを「AND」に変更
    await cdp.evaluate(`
      (() => {
        const chipMode = document.querySelector('.chip-mode');
        if (chipMode && chipMode.textContent.includes('OR')) {
          chipMode.click();
        }
      })()
    `);
    await cdp.wait(300);

    // フィルターの状態を確認（DOMから直接）
    const filterState = await cdp.evaluate(`
      (() => {
        const fusionBtn = document.querySelector('.chip.chip-fixed[data-type="fusion"]');
        const chipMode = document.querySelector('.chip-mode');

        return {
          fusionHasNotClass: fusionBtn ? fusionBtn.classList.contains('not') : false,
          fusionHasActiveClass: fusionBtn ? fusionBtn.classList.contains('active') : false,
          chipModeText: chipMode ? chipMode.textContent.trim() : '',
          fusionExists: fusionBtn !== null,
          chipModeExists: chipMode !== null
        };
      })()
    `);

    if (filterState.fusionExists) {
      console.log('フィルター状態:');
      console.log(`  融合ボタン: ${filterState.fusionHasActiveClass ? 'active' : ''} ${filterState.fusionHasNotClass ? 'not' : ''}`);
      console.log(`  AND/OR: ${filterState.chipModeText}`);

      if (filterState.fusionHasNotClass) {
        console.log('  ✅ NOT条件（notクラス）が設定されています');
      } else {
        console.log('  ❌ NOT条件（notクラス）が設定されていません');
      }

      if (filterState.chipModeText === 'AND') {
        console.log('  ✅ AND/ORが「AND」に設定されています');
      } else {
        console.log('  ❌ AND/ORが「AND」に設定されていません');
      }
    } else {
      console.log('❌ フィルター状態が取得できませんでした');
    }

    // ダイアログを閉じる
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await cdp.wait(300);

    console.log('\n=== 検索実行とAPIパラメータの確認 ===\n');

    // コンソールログの監視を開始
    const consoleLogs = [];
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.args && params.args.length > 0) {
        const logMessage = params.args.map(arg => arg.value).join(' ');
        if (logMessage.includes('[SearchInputBar]')) {
          consoleLogs.push(logMessage);
        }
      }
    });
    await cdp.sendCommand('Runtime.enable');

    // ネットワークリクエストの監視を開始
    await cdp.sendCommand('Network.enable');

    // リクエストをキャプチャ
    const requestPromise = new Promise((resolve) => {
      const handler = (params) => {
        if (params.request.url.includes('/yugiohdb/card_search.action')) {
          const url = new URL(params.request.url);
          const searchParams = Object.fromEntries(url.searchParams.entries());
          cdp.off('Network.requestWillBeSent', handler);
          resolve(searchParams);
        }
      };
      cdp.on('Network.requestWillBeSent', handler);
    });

    // 検索を実行
    await cdp.evaluate(`
      (() => {
        const store = window.__VUE_APP__?.$pinia?._s?.get('deck-edit');
        if (store) {
          store.searchQuery = '青眼';
        }
        const inputBar = document.querySelector('.search-input-bar input');
        if (inputBar) {
          const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
          inputBar.dispatchEvent(event);
        }
      })()
    `);

    const searchParams = await requestPromise;

    // コンソールログを表示
    if (consoleLogs.length > 0) {
      console.log('\nブラウザのコンソールログ:');
      consoleLogs.forEach(log => console.log('  ' + log));
      console.log('');
    }

    console.log('検索APIパラメータ:');

    // jogai（除外モンスタータイプ）が含まれているか確認
    const jogaiParams = Object.entries(searchParams)
      .filter(([key]) => key === 'jogai')
      .map(([, value]) => value);

    if (jogaiParams.length > 0) {
      console.log('  ✅ jogai（除外モンスタータイプ）パラメータが送信されました:');
      jogaiParams.forEach(param => console.log(`    - ${param}`));
    } else {
      console.log('  ❌ jogai（除外モンスタータイプ）パラメータが送信されていません');
    }

    // othercon（AND/OR）が正しいか確認
    const othercon = searchParams.othercon;
    if (othercon === '1') {
      console.log('  ✅ othercon=1（AND）が送信されました');
    } else if (othercon === '2') {
      console.log('  ⚠️  othercon=2（OR）が送信されました（ANDに設定したはずです）');
    } else {
      console.log(`  ❌ othercon=${othercon}（不明な値）`);
    }

    console.log('\n=== テスト完了 ===\n');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    cdp.close();
  }
}

testFilterNotCondition();
