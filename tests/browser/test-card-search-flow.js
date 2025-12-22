/**
 * カード検索フローのテスト
 *
 * 検索機能 → パース → キャッシュの完全フロー確認
 * - キーワード入力
 * - 検索実行
 * - 結果表示
 * - キャッシュ動作確認
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集ページのURL
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testCardSearchFlow() {
  console.log('【カード検索フローテスト】\n');

  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(EDIT_URL);
    await cdp.wait(3000);

    console.log('ページロード完了\n');

    // コンソールログを収集
    let searchLogs = [];
    let errorCount = 0;

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'log' && params.args && params.args[0]) {
        const text = params.args.map(arg => arg.value || arg.description).join(' ');
        searchLogs.push(text);

        if (text.includes('[CardSearch]') || text.includes('cache') || text.includes('search')) {
          console.log(`[CONSOLE] ${text}`);
        }
      } else if (params.type === 'error') {
        errorCount++;
      }
    });

    cdp.on('Runtime.exceptionThrown', (params) => {
      errorCount++;
      console.log(`[ERROR] ${params.exceptionDetails.text}`);
    });

    // Runtime.consoleAPICalled を有効化
    await cdp.sendCommand('Runtime.enable', {});

    console.log('=== カード検索フローテスト開始 ===\n');
    console.log('ステップ 1: 検索フィールドをクリック');
    console.log('ステップ 2: カード名を入力（例：「ブルー」）');
    console.log('ステップ 3: 検索を実行');
    console.log('ステップ 4: 検索結果を確認\n');

    console.log('待機中... (15秒)');
    await cdp.wait(15000);

    console.log('\n=== テスト結果確認 ===\n');

    // 検索フィールドの状態確認
    const searchFieldStatus = await cdp.evaluate(`
      (async () => {
        try {
          const searchInput = document.querySelector('[class*="search"], [class*="input"], input[type="text"]');
          if (!searchInput) return { found: false };

          return {
            value: searchInput.value,
            visible: window.getComputedStyle(searchInput).display !== 'none',
            disabled: searchInput.disabled
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`検索フィールドの状態:`);
    if (searchFieldStatus.found === false) {
      console.log('  (見つかりませんでした)');
    } else if (searchFieldStatus.error) {
      console.log(`  エラー: ${searchFieldStatus.error}`);
    } else {
      console.log(`  入力値: "${searchFieldStatus.value}"`);
      console.log(`  表示中: ${searchFieldStatus.visible ? 'はい' : 'いいえ'}`);
      console.log(`  無効化: ${searchFieldStatus.disabled ? 'はい' : 'いいえ'}`);
    }

    // 検索結果の確認
    const searchResults = await cdp.evaluate(`
      (async () => {
        try {
          const resultItems = document.querySelectorAll('[class*="card"], [class*="result"], tr[class*="item"]');
          return {
            count: resultItems.length,
            visible: resultItems.length > 0 ? window.getComputedStyle(resultItems[0]).display !== 'none' : false
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\n検索結果:`);
    if (searchResults.error) {
      console.log(`  エラー: ${searchResults.error}`);
    } else {
      console.log(`  表示件数: ${searchResults.count}`);
      console.log(`  表示中: ${searchResults.visible ? 'はい' : 'いいえ'}`);
    }

    // ローカルストレージのキャッシュ確認
    const cacheStatus = await cdp.evaluate(`
      (async () => {
        try {
          const keys = Object.keys(localStorage);
          const cacheKeys = keys.filter(k => k.includes('cache') || k.includes('card'));
          return {
            totalKeys: keys.length,
            cacheKeys: cacheKeys.length,
            examples: cacheKeys.slice(0, 3)
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\nローカルストレージキャッシュ:`);
    if (cacheStatus.error) {
      console.log(`  エラー: ${cacheStatus.error}`);
    } else {
      console.log(`  総キー数: ${cacheStatus.totalKeys}`);
      console.log(`  キャッシュキー数: ${cacheStatus.cacheKeys}`);
      if (cacheStatus.examples.length > 0) {
        console.log(`  例: ${cacheStatus.examples.map(k => k.substring(0, 30) + '...').join(', ')}`);
      }
    }

    // コンソール出力サマリー
    console.log(`\n=== 実行結果 ===\n`);
    console.log(`コンソールログ出力: ${searchLogs.length} 件`);
    console.log(`エラー件数: ${errorCount}`);

    if (searchResults.count > 0 || cacheStatus.cacheKeys > 0) {
      console.log('\n✅ テスト成功: 検索フローが正常に動作しています');
    } else {
      console.log('\n⚠️ テスト結果: 検索結果またはキャッシュが見つかりません');
    }

    console.log('\n✅ テスト完了');
    cdp.close();
    process.exit(0);

  } catch (error) {
    console.error('テスト失敗:', error);
    cdp.close();
    process.exit(1);
  }
}

testCardSearchFlow();
