/**
 * マッピング取得テスト
 *
 * Content script が正常に動作しており、マッピング取得とChrome Storage保存が機能するかテスト
 *
 * 注意：Chrome Storage API は拡張機能内でのみアクセス可能なため、
 * Content script のコンソールログを確認することでマッピング取得状況を検証
 */

const { connectCDP } = require('./cdp-helper');

async function runTests() {
  const cdp = await connectCDP();
  console.log('[Test] CDPに接続しました');

  try {
    // テスト: デッキ詳細ページでのマッピング取得動作確認
    console.log('\n[Test] デッキ詳細ページでのマッピング取得動作確認');
    await testMappingRetrieval(cdp);

    console.log('\n✓ テスト完了（ブラウザコンソールでログを確認）');
  } catch (error) {
    console.error('[Error]', error);
  } finally {
    cdp.close();
  }
}

/**
 * マッピング取得動作確認テスト
 * @param {Object} cdp - CDP helper
 *
 * デッキ詳細ページを開き、Content script が正常に動作しているかを確認
 * - mappingManager の初期化
 * - detectLanguage の動作
 * - コンソールログの出力確認
 */
async function testMappingRetrieval(cdp) {
  try {
    // デッキ詳細ページへナビゲート
    const deckUrl = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';
    console.log(`[Step 1] デッキ詳細ページへナビゲート: ${deckUrl}`);
    await cdp.navigate(deckUrl);

    // ページロード待機（3秒）
    console.log('[Step 2] ページロード待機中...');
    await cdp.wait(3000);

    // ページのタイトルとURLを確認
    console.log('[Step 3] ページ情報確認');
    const pageInfo = await cdp.evaluate(`
      ({
        title: document.title,
        url: window.location.href,
        isLoaded: Boolean(document.body && document.body.innerText),
      })
    `);
    console.log(`  - ページタイトル: ${pageInfo.title || 'なし'}`);
    console.log(`  - URL: ${pageInfo.url || 'なし'}`);
    console.log(`  - ページロード: ${pageInfo.isLoaded ? 'はい' : 'いいえ'}`);

    // Content script の実行確認
    console.log('[Step 4] Content script の実行確認');
    const contentScriptCheck = await cdp.evaluate(`
      ({
        hasWindow: Boolean(window),
        hasDocument: Boolean(document),
        hasChrome: typeof chrome !== 'undefined',
      })
    `);
    console.log(`  - window: ${contentScriptCheck.hasWindow ? 'あり' : 'なし'}`);
    console.log(`  - document: ${contentScriptCheck.hasDocument ? 'あり' : 'なし'}`);
    console.log(`  - chrome API: ${contentScriptCheck.hasChrome ? 'あり' : 'なし'}`);

    // 重要なコンソールメッセージを確認
    console.log('[Step 5] ブラウザコンソールのログを確認してください');
    console.log('  - [MappingManager] で始まるログ');
    console.log('  - マッピング取得状況（Stored/Loaded/Error）');
    console.log('  - [Content Script] で始まるログ（detector.ts から）');

    // Content script のメモリ内状態確認
    console.log('[Step 6] グローバルオブジェクトの確認');
    const globalState = await cdp.evaluate(`
      ({
        hasDetectLanguage: typeof window.detectLanguage !== 'undefined',
        hasYgoNeuronHelper: typeof window.ygoNeuronHelper !== 'undefined',
      })
    `);
    console.log(`  - detectLanguage: ${globalState.hasDetectLanguage ? 'あり' : 'なし'}`);
    console.log(`  - ygoNeuronHelper: ${globalState.hasYgoNeuronHelper ? 'あり' : 'なし'}`);

  } catch (error) {
    console.error('[Error] テスト実行中にエラーが発生:', error.message);
    throw error;
  }
}

// テスト実行
runTests();
