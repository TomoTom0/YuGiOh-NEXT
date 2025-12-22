/**
 * デッキコード発行機能のテスト (PR #82)
 *
 * デッキ詳細ページでデッキコードが正しく発行・ローカルストレージに保存されることを確認
 */

const { connectCDP } = require('./cdp-helper');

// デッキ詳細ページのURL（例）
const DECK_DETAIL_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/deckdetail?cgid=test&dno=1';

async function testDeckCodeIssuance() {
  console.log('【デッキコード発行機能テスト】\n');

  const cdp = await connectCDP();

  try {
    console.log('デッキ詳細ページにアクセス中...');
    await cdp.navigate(DECK_DETAIL_URL);
    await cdp.wait(3000); // 拡張機能のロード待機

    console.log('ページロード完了\n');

    // コンソールログを収集
    let consoleLogs = [];

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.args && params.args[0]) {
        const text = params.args.map(arg => arg.value || arg.description).join(' ');
        consoleLogs.push(text);
        if (text.includes('[issueDeckCodeInternal]') || text.includes('Deck Code')) {
          console.log(`[CONSOLE] ${text}`);
        }
      }
    });

    // Runtime.consoleAPICalled を有効化
    await cdp.sendCommand('Runtime.enable', {});

    console.log('=== デッキコード発行テスト開始 ===\n');
    console.log('ステップ 1: デッキメタデータメニューを開く');
    console.log('ステップ 2: 「デッキコードを発行」ボタンをクリック\n');

    // 10秒間、ユーザーの操作を待機
    console.log('待機中... (10秒)');
    await cdp.wait(10000);

    console.log('\n=== テスト結果確認 ===\n');

    // localStorage にデッキコードが保存されているか確認
    const localStorageData = await cdp.evaluate(`
      (async () => {
        try {
          const deckCode = localStorage.getItem('ygo_deck_code');
          const deckDno = localStorage.getItem('ygo_deck_dno');
          const timestamp = localStorage.getItem('ygo_deck_code_issued_at');

          return {
            deckCode: deckCode ? deckCode.substring(0, 20) + '...' : null,
            deckDno: deckDno,
            timestamp: timestamp ? new Date(timestamp).toLocaleString('ja-JP') : null
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`localStorage データ:`);
    console.log(`  デッキコード: ${localStorageData.deckCode || 'なし'}`);
    console.log(`  デッキ番号: ${localStorageData.deckDno || 'なし'}`);
    console.log(`  発行時刻: ${localStorageData.timestamp || 'なし'}`);

    // ページ内のデッキコード表示エリアを確認
    const deckCodeDisplay = await cdp.evaluate(`
      (async () => {
        try {
          // デッキコード表示が可能な要素を探す
          const codeElement = document.querySelector('[class*="deck-code"], [class*="code"], [data-deck-code]');
          if (codeElement) {
            return {
              text: codeElement.textContent.substring(0, 30),
              visible: window.getComputedStyle(codeElement).display !== 'none'
            };
          }
          return { found: false };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\nページ内のデッキコード表示:`);
    if (deckCodeDisplay.found === false) {
      console.log('  (表示要素が見つかりませんでした)');
    } else if (deckCodeDisplay.error) {
      console.log(`  エラー: ${deckCodeDisplay.error}`);
    } else {
      console.log(`  テキスト: ${deckCodeDisplay.text}`);
      console.log(`  表示中: ${deckCodeDisplay.visible ? 'はい' : 'いいえ'}`);
    }

    // コンソール出力
    console.log('\n=== コンソールログ出力 ===\n');
    const issuanceLogs = consoleLogs.filter(log =>
      log.includes('[issueDeckCodeInternal]') || log.includes('Deck Code')
    );

    if (issuanceLogs.length > 0) {
      issuanceLogs.forEach(log => {
        console.log(`✅ ${log}`);
      });
    } else {
      console.log('デッキコード発行関連のログがありません');
    }

    // 結果判定
    const success = localStorageData.deckCode || deckCodeDisplay.text;
    if (success) {
      console.log('\n✅ テスト成功: デッキコードが確認されました');
    } else {
      console.log('\n⚠️ テスト結果: デッキコードが発行されていない可能性があります');
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

testDeckCodeIssuance();
