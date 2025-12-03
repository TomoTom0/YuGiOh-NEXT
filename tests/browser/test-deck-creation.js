/**
 * デッキ新規作成機能のテスト
 *
 * デッキ編集ページ（#/ytomo/edit）で新規デッキが正しく作成されることを確認
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集ページのURL
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testDeckCreation() {
  console.log('【デッキ新規作成テスト】\n');

  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(EDIT_URL);
    await cdp.wait(3000); // 拡張機能のロード待機

    console.log('ページロード完了\n');
    
    // コンソールログを収集
    let consoleLogs = [];
    
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.args && params.args[0]) {
        const text = params.args.map(arg => arg.value || arg.description).join(' ');
        consoleLogs.push(text);
        if (text.includes('[createNewDeckInternal]') || text.includes('[fetchYtknFromDeckList]')) {
          console.log(`[CONSOLE] ${text}`);
        }
      }
    });

    // Runtime.consoleAPICalled を有効化
    await cdp.sendCommand('Runtime.enable', {});

    console.log('=== 新規デッキ作成テスト開始 ===\n');
    console.log('ステップ 1: 拡張機能内で新規デッキを作成');
    console.log('(メニューから「新規デッキ」を選択するか、手動でデッキを作成してください)\n');

    // 10秒間、ユーザーの操作を待機
    console.log('待機中... (10秒)');
    await cdp.wait(10000);

    console.log('\n=== テスト結果確認 ===\n');

    // cgidが取得できているか確認
    const cgidResult = await cdp.evaluate(`
      (async () => {
        try {
          const footer = document.querySelector('a[href*="member_deck.action"][href*="cgid="]');
          if (footer) {
            const match = footer.href.match(/cgid=([a-f0-9]{32})/);
            return match ? match[1].substring(0, 16) + '...' : 'not found';
          }
          return 'footer not found';
        } catch (e) {
          return 'error: ' + e.message;
        }
      })()
    `);
    console.log(`cgid取得: ${cgidResult}`);

    // デッキ数を確認（どのように確認するかはページ構造に依存）
    const deckCount = await cdp.evaluate(`
      (async () => {
        try {
          // デッキメニューのアイテム数を数える
          const deckItems = document.querySelectorAll('[class*="deck"][class*="item"]');
          return deckItems.length;
        } catch (e) {
          return 'error: ' + e.message;
        }
      })()
    `);
    console.log(`検出されたデッキ要素: ${deckCount}`);

    console.log('\n=== コンソールログ出力 ===\n');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => {
        if (log.includes('createNewDeckInternal') || log.includes('fetchYtknFromDeckList')) {
          console.log(`✅ ${log}`);
        }
      });
    } else {
      console.log('デッキ作成関連のログがありません');
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

testDeckCreation();
