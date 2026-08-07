/**
 * カード検索フローの動作確認テスト（自動化）
 *
 * 前提: デッキ編集ページ(https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit)でログイン済み。
 *
 * 実装参照:
 *   src/components/searchInputBar/ (.search-input-bar input.search-input, .search-btn)
 *   src/components/RightArea.vue (.search-content .card-result-item)
 *   src/composables/useSearchHistory.ts (localStorage['ygo-next-search-history'])
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';
const QUERY = 'ブルー';

async function testCardSearchFlow() {
  console.log('【カード検索フローテスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ編集ページにアクセス中（ログイン済み前提）...');
    await cdp.navigate(EDIT_URL);
    const loaded = await cdp.waitFor(`document.querySelector('.search-input-bar input.search-input') !== null`, 10000);
    if (!loaded) console.log('  ※ 編集ページが表示されません（ログイン未済の可能性）');
    t.assert('検索入力(.search-input)が表示される', loaded === true);
    if (!loaded) { t.summary(); return; }

    console.log(`\n--- 検索実行（クエリ: "${QUERY}"）---`);
    // v-model 反応のため input event を dispatch
    await cdp.evaluate(`
      const i = document.querySelector('.search-input-bar input.search-input');
      i.value = ${JSON.stringify(QUERY)};
      i.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await cdp.wait(500);
    const searchBtnExists = await cdp.evaluate(`document.querySelector('.search-input-bar .search-btn') !== null`);
    t.assert('検索ボタン(.search-btn)が存在', searchBtnExists === true);
    await cdp.evaluate(`document.querySelector('.search-input-bar .search-btn')?.click()`);

    // 検索結果の出現を待機（公式APIアクセス・最大15秒）
    const resultsAppeared = await cdp.waitFor(`document.querySelectorAll('.search-content .card-result-item').length > 0`, 15000);
    const resultCount = await cdp.evaluate(`document.querySelectorAll('.search-content .card-result-item').length`);
    t.assert('検索結果(.card-result-item)が表示される', resultsAppeared === true);
    console.log(`  結果件数: ${resultCount}`);

    // 検索履歴キャッシュの確認（保存までポーリング待機して安定化）
    const historySaved = await cdp.waitFor(`(() => { try { const h = JSON.parse(localStorage.getItem('ygo-next-search-history') || '[]'); return Array.isArray(h) && h.some(x => x && x.query === ${JSON.stringify(QUERY)}); } catch(e) { return false; } })()`, 5000);
    t.assert('検索履歴(localStorage[ygo-next-search-history])にクエリが記録される', historySaved === true);

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

testCardSearchFlow();
