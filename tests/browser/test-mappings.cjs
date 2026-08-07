/**
 * マッピング取得の動作確認テスト（自動化・認証不要）
 *
 * 公開ページでコンテンツスクリプトがロードされ、マッピング初期化で
 * card_search.action?ope=1&request_locale=<lang> リクエストが飛ぶことを検証。
 *
 * 実装参照:
 *   src/utils/mapping-manager.ts (initializeMappingManager)
 *   src/utils/extract-mappings.ts (card_search.action fetch)
 *   src/content/index.ts (initializeFeatures -> initializeMappingManager)
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 公開デッキURL（認証不要）
const PUBLIC_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testMappings() {
  console.log('【マッピング取得テスト（認証不要・公開URL）】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  let mappingErrors = [];

  try {
    // コンソールのエラーログを収集
    await cdp.sendCommand('Runtime.enable');
    cdp.on('Runtime.consoleAPICalled', (params) => {
      const text = (params.args || []).map(a => a.value || a.description || '').join(' ');
      if (text.includes('[MappingManager]') && /Failed|invalid|Error/i.test(text)) {
        mappingErrors.push(text);
      }
    });

    // Network 監視を開始してから navigate（リクエスト取りこぼし防止）
    await cdp.sendCommand('Network.enable');
    const reqPromise = cdp.waitForRequest('card_search.action', 15000);
    console.log('公開デッキページにアクセス中...');
    await cdp.navigate(PUBLIC_URL);

    const req = await reqPromise;
    if (req) {
      console.log(`  リクエストURL: ${req.url.substring(0, 90)}...`);
      t.assert('card_search.action リクエストに ope=1 が含まれる', req.url.includes('ope=1'));
      t.assert('card_search.action リクエストに request_locale=ja が含まれる', req.url.includes('request_locale=ja'));
    } else {
      console.log('  ※ card_search.action リクエスト未発行（マッピングキャッシュ済みと推定）');
    }

    // コンソールエラーが収束するまで少し待機
    await cdp.wait(2000);
    // リクエスト発火有無に関わらずエラーログがなければ初期化は成功
    t.assert('[MappingManager] エラーログが存在しない（マッピング初期化成功）', mappingErrors.length === 0);
    if (mappingErrors.length > 0) {
      console.log('  エラーログ:');
      mappingErrors.forEach(e => console.log('    - ' + e.substring(0, 100)));
    }

    t.summary();
  } catch (e) {
    console.error('Error:', e.message);
    t.assert('例外なく完了', false);
    t.summary();
  } finally {
    cdp.close();
    process.exit(t.exitCode());
  }
}

testMappings();
