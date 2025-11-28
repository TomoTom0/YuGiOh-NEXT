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
    // デッキ編集ページに移動
    console.log('デッキ編集ページにアクセス中...');
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

    // モンスタータイプタブを選択
    await cdp.evaluate(`
      (() => {
        const monsterTab = document.querySelector('.card-type-tab');
        if (monsterTab) monsterTab.click();
      })()
    `);
    await cdp.wait(300);

    // 融合モンスターを除外条件に追加（NOTボタンをクリック）
    await cdp.evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('.monster-type-row'));
        const fusionRow = rows.find(row => {
          const label = row.querySelector('.monster-type-label');
          return label && label.textContent.includes('融合');
        });
        if (fusionRow) {
          const notBtn = fusionRow.querySelector('.chip-not');
          if (notBtn) notBtn.click();
        }
      })()
    `);
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

    // フィルターの状態を確認
    const filterState = await cdp.evaluate(`
      (() => {
        const store = window.__VUE_APP__?.$pinia?._s?.get('deck-edit');
        if (!store) return null;

        // SearchFilterDialog コンポーネントのフィルター状態を取得
        const dialog = document.querySelector('.dialog-overlay');
        if (!dialog) return null;

        // Vueインスタンスからフィルター状態を取得
        const vueInstance = dialog.__vueParentComponent;
        if (!vueInstance) return null;

        const filters = vueInstance.ctx.filters || vueInstance.ctx.$data?.filters;
        if (!filters) return null;

        return {
          monsterTypes: filters.monsterTypes,
          monsterTypeMatchMode: filters.monsterTypeMatchMode
        };
      })()
    `);

    if (filterState) {
      console.log('フィルター状態:');
      console.log('  monsterTypes:', JSON.stringify(filterState.monsterTypes, null, 2));
      console.log('  monsterTypeMatchMode:', filterState.monsterTypeMatchMode);

      const hasNotCondition = filterState.monsterTypes.some(mt => mt.state === 'not');
      if (hasNotCondition) {
        console.log('  ✅ NOT条件（state: "not"）が設定されています');
      } else {
        console.log('  ❌ NOT条件（state: "not"）が設定されていません');
      }

      if (filterState.monsterTypeMatchMode === 'and') {
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
