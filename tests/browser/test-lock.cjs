/**
 * Lock機能（sortfix）の動作確認テスト
 *
 * 実装参照:
 *   src/content/shuffle/sortfixCards.ts (ロック解除/設定ハンドラ、data-ygo-next-sortfix 属性)
 *   src/content/deck-display/vueSetup.ts (.ygo-next-card-controls の生成)
 *   src/content/deck-display/DeckDisplayApp.vue (.is-sortfixed の視覚スタイル)
 *
 * 確認:
 * 1. .top-right ボタンクリックで data-ygo-next-sortfix 属性が付与されること
 * 2. .top-right ボタンに .is-sortfixed クラスと南京錠 SVG が付くこと
 * 3. シャッフル後に sortfix カードが先頭に保持されること (shuffleCards.ts)
 * 4. 再クリックでロック解除されること
 */

const { connectCDP, createTestContext } = require('./cdp-helper.cjs');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

// 最初のカードの状態を取得する式
const FIRST_CARD_INFO = `
  (() => {
    const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
    const card = mainDeck ? mainDeck.querySelector('a') : null;
    if (!card) return null;
    const topRight = card.querySelector('.ygo-next-card-btn.top-right');
    return {
      cid: card.href.match(/cid=(\\d+)/)?.[1] || null,
      hasSortfix: card.hasAttribute('data-ygo-next-sortfix'),
      hasLockClass: topRight ? topRight.classList.contains('is-sortfixed') : false,
      hasLockIcon: topRight ? !!topRight.querySelector('svg') : false
    };
  })()
`;

// .top-right ボタンを直接クリックする式
const CLICK_TOP_RIGHT = `
  (() => {
    const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
    const card = mainDeck ? mainDeck.querySelector('a') : null;
    if (!card) return false;
    const btn = card.querySelector('.ygo-next-card-btn.top-right');
    if (btn) { btn.click(); return true; }
    return false;
  })()
`;

async function testLock() {
  console.log('【Lock機能（sortfix）テスト】\n');
  const t = createTestContext();
  const cdp = await connectCDP();

  try {
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    // 最初のカードのcid取得
    const first = await cdp.evaluate(FIRST_CARD_INFO);
    t.assert('最初のカードが取得できる', !!first && !!first.cid);
    if (!first || !first.cid) throw new Error('最初のカードが取得できません');
    console.log(`  最初のカード: cid=${first.cid}\n`);

    console.log('=== ロック操作（.top-right ボタンを直接クリック）===');
    const clicked = await cdp.evaluate(CLICK_TOP_RIGHT);
    t.assert('.top-right ボタンが存在してクリックできた', clicked === true);
    await cdp.wait(500);

    const locked = await cdp.evaluate(FIRST_CARD_INFO);
    t.assert('data-ygo-next-sortfix 属性が付与される', locked?.hasSortfix === true);
    t.assert('.top-right に .is-sortfixed クラスが付く', locked?.hasLockClass === true);
    t.assert('.top-right に南京錠 SVG が挿入される', locked?.hasLockIcon === true);

    console.log('\n=== シャッフル時にロックが保持されるか ===');
    await cdp.evaluate(`document.getElementById("ygo-next-shuffle-btn-main").click()`);
    await cdp.wait(2000); // アニメーション待機

    const afterShuffle = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const card = mainDeck ? mainDeck.querySelector('a') : null;
        if (!card) return null;
        return {
          cid: card.href.match(/cid=(\\d+)/)?.[1] || null,
          hasSortfix: card.hasAttribute('data-ygo-next-sortfix')
        };
      })()
    `);
    t.assert('シャッフル後も sortfix カードが先頭に保持される', afterShuffle?.cid === first.cid);
    t.assert('シャッフル後も data-ygo-next-sortfix 属性が維持される', afterShuffle?.hasSortfix === true);

    console.log('\n=== ロック解除（.top-right ボタンを再度クリック）===');
    await cdp.evaluate(CLICK_TOP_RIGHT);
    await cdp.wait(500);

    const unlocked = await cdp.evaluate(FIRST_CARD_INFO);
    t.assert('再クリックで data-ygo-next-sortfix 属性が削除される', unlocked?.hasSortfix === false);
    t.assert('再クリックで .is-sortfixed クラスが削除される', unlocked?.hasLockClass === false);

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

testLock();
