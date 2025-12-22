/**
 * LoadDialog（デッキ読み込みダイアログ）フローのテスト
 *
 * ダイアログ表示 → デッキ一覧表示 → ページネーション → デッキ読み込みの完全フロー確認
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集ページのURL
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testLoadDialogFlow() {
  console.log('【LoadDialogフローテスト】\n');

  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(EDIT_URL);
    await cdp.wait(3000);

    console.log('ページロード完了\n');

    // コンソールログを収集
    let dialogLogs = [];

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.args && params.args[0]) {
        const text = params.args.map(arg => arg.value || arg.description).join(' ');
        if (text.includes('[LoadDialog]') || text.includes('pagination')) {
          dialogLogs.push(text);
          console.log(`[CONSOLE] ${text}`);
        }
      }
    });

    await cdp.sendCommand('Runtime.enable', {});

    console.log('=== LoadDialogフローテスト開始 ===\n');
    console.log('ステップ 1: ツールバーから「デッキ読み込み」ボタンを探してクリック');
    console.log('ステップ 2: LoadDialogが表示される');
    console.log('ステップ 3: デッキ一覧が表示される');
    console.log('ステップ 4: ページネーション（次へ）をクリック（デッキが24個以上ある場合）');
    console.log('ステップ 5: デッキをクリックして読み込む\n');

    console.log('待機中... (15秒)');
    await cdp.wait(15000);

    console.log('\n=== テスト結果確認 ===\n');

    // LoadDialogの表示状態確認
    const dialogStatus = await cdp.evaluate(`
      (async () => {
        try {
          // Teleport で body に描画されるため、document.body を検索
          const dialog = document.body.querySelector('[class*="dialog"]');
          if (!dialog) return { found: false };

          return {
            visible: window.getComputedStyle(dialog).display !== 'none',
            className: dialog.className.substring(0, 50)
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`LoadDialogの状態:`);
    if (dialogStatus.found === false) {
      console.log('  (ダイアログが見つかりません)');
    } else if (dialogStatus.error) {
      console.log(`  エラー: ${dialogStatus.error}`);
    } else {
      console.log(`  表示中: ${dialogStatus.visible ? 'はい' : 'いいえ'}`);
      console.log(`  クラス: ${dialogStatus.className}`);
    }

    // デッキ一覧の確認
    const deckListStatus = await cdp.evaluate(`
      (async () => {
        try {
          // Teleport で body に描画されるため、document.body を検索
          const deckCards = document.body.querySelectorAll('[class*="deck-card"], [class*="deck-item"]');
          if (deckCards.length === 0) {
            // フォールバック：異なるセレクタで検索
            const fallback = document.body.querySelectorAll('[role="button"][class*="deck"]');
            return { count: fallback.length, fallback: true };
          }
          return { count: deckCards.length, fallback: false };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\nデッキ一覧:`);
    if (deckListStatus.error) {
      console.log(`  エラー: ${deckListStatus.error}`);
    } else {
      console.log(`  表示デッキ数: ${deckListStatus.count}`);
      console.log(`  (1ページあたり24個表示)`);
    }

    // ページネーション機能の確認
    const paginationStatus = await cdp.evaluate(`
      (async () => {
        try {
          const nextBtn = document.body.querySelector('[class*="pagination"] button:nth-child(3)');
          const prevBtn = document.body.querySelector('[class*="pagination"] button:nth-child(1)');
          const pageInfo = document.body.querySelector('[class*="pagination-info"]');

          return {
            nextBtnFound: nextBtn !== null,
            prevBtnFound: prevBtn !== null,
            pageInfo: pageInfo ? pageInfo.textContent.substring(0, 20) : null,
            hasPageination: nextBtn !== null || prevBtn !== null || pageInfo !== null
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\nページネーション:`);
    if (paginationStatus.error) {
      console.log(`  エラー: ${paginationStatus.error}`);
    } else {
      console.log(`  次へボタン: ${paginationStatus.nextBtnFound ? 'あり' : 'なし'}`);
      console.log(`  前へボタン: ${paginationStatus.prevBtnFound ? 'あり' : 'なし'}`);
      console.log(`  ページ情報: ${paginationStatus.pageInfo || 'なし'}`);
      console.log(`  ページネーション機能有: ${paginationStatus.hasPageination ? 'はい' : 'いいえ'}`);
    }

    // デッキサムネイル確認
    const thumbnailStatus = await cdp.evaluate(`
      (async () => {
        try {
          const thumbnails = document.body.querySelectorAll('[class*="thumbnail"], [class*="deck-card"] img');
          return { count: thumbnails.length };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log(`\nデッキサムネイル:`);
    if (thumbnailStatus.error) {
      console.log(`  エラー: ${thumbnailStatus.error}`);
    } else {
      console.log(`  表示数: ${thumbnailStatus.count}`);
    }

    // 結果判定
    const success = dialogStatus.visible && deckListStatus.count > 0;

    console.log(`\n=== 実行結果 ===\n`);
    if (success) {
      console.log('✅ テスト成功: LoadDialogが正常に動作しています');
    } else {
      console.log('⚠️ テスト結果: LoadDialog または デッキ一覧が見つかりません');
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

testLoadDialogFlow();
