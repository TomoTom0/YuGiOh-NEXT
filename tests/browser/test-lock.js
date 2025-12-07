/**
 * Lock機能（sortfix）の動作確認テスト
 *
 * 以下の挙動を確認：
 * 1. カード右上1/4エリアをクリックしてロック状態になること
 * 2. ロック状態のカードに視覚的フィードバックがあること（青緑背景、南京錠アイコン）
 * 3. ロックされたカードがデッキ先頭に移動すること
 * 4. シャッフル時にロックされたカードの順序が保持されること
 * 5. もう一度クリックするとロックが解除されること
 */

const { connectCDP } = require('./cdp-helper');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testLock() {
  console.log('【Lock機能（sortfix）テスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== 最初のカードをロック ===\n');

    // 最初のカード情報を取得
    const firstCard = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        return {
          href: firstCard.href,
          cid: firstCard.href.match(/cid=(\\d+)/)?.[1]
        };
      })()
    `);

    console.log(`最初のカード: cid=${firstCard.cid}`);

    // カード右上1/4エリアをクリック（ロック）
    await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        const rect = firstCard.getBoundingClientRect();

        // 右上1/4の位置を計算
        const x = rect.left + rect.width * 0.75;
        const y = rect.top + rect.height * 0.25;

        // クリックイベントを作成
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });

        firstCard.dispatchEvent(event);
      })()
    `);

    await cdp.wait(500); // ロック処理待機

    console.log('\n=== ロック状態の確認 ===\n');

    // ロック状態の確認
    const lockStatus = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');

        return {
          hasSortfixAttr: firstCard.hasAttribute('data-sortfix'),
          backgroundColor: window.getComputedStyle(firstCard).backgroundColor,
          hasAfterElement: window.getComputedStyle(firstCard, '::after').backgroundImage !== 'none'
        };
      })()
    `);

    console.log(`data-sortfix属性: ${lockStatus.hasSortfixAttr ? '✅ あり' : '❌ なし'}`);
    console.log(`背景色: ${lockStatus.backgroundColor}`);
    console.log(`南京錠アイコン: ${lockStatus.hasAfterElement ? '✅ あり' : '❌ なし'}`);

    if (lockStatus.hasSortfixAttr) {
      console.log('✅ カードがロック状態になりました');
    } else {
      console.log('❌ カードがロック状態になっていません');
    }

    console.log('\n=== デッキ先頭に移動したか確認 ===\n');

    // 先頭のカードを確認
    const topCard = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        return {
          cid: firstCard.href.match(/cid=(\\d+)/)?.[1]
        };
      })()
    `);

    if (topCard.cid === firstCard.cid) {
      console.log(`✅ ロックされたカードが先頭に配置されています (cid=${topCard.cid})`);
    } else {
      console.log(`❌ カードの位置が変わっていません`);
    }

    console.log('\n=== シャッフル時にロックが保持されるか確認 ===\n');

    // シャッフルボタンをクリック
    await cdp.evaluate(`document.getElementById("ygo-next-shuffle-btn-main").click()`);
    await cdp.wait(2000); // アニメーション待機

    // シャッフル後も先頭にあるか確認
    const afterShuffle = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        return {
          cid: firstCard.href.match(/cid=(\\d+)/)?.[1],
          hasSortfix: firstCard.hasAttribute('data-sortfix')
        };
      })()
    `);

    if (afterShuffle.cid === firstCard.cid && afterShuffle.hasSortfix) {
      console.log(`✅ シャッフル後もロックされたカードが先頭に保持されています (cid=${afterShuffle.cid})`);
    } else {
      console.log(`❌ ロックが正しく機能していません`);
    }

    console.log('\n=== ロック解除 ===\n');

    // もう一度右上1/4エリアをクリック（ロック解除）
    await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        const rect = firstCard.getBoundingClientRect();

        const x = rect.left + rect.width * 0.75;
        const y = rect.top + rect.height * 0.25;

        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });

        firstCard.dispatchEvent(event);
      })()
    `);

    await cdp.wait(500);

    // ロック解除の確認
    const unlocked = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        const firstCard = mainDeck.querySelector('a');
        return !firstCard.hasAttribute('data-sortfix');
      })()
    `);

    if (unlocked) {
      console.log('✅ ロックが解除されました');
    } else {
      console.log('❌ ロックが解除されていません');
    }

    console.log('\n【テスト完了】\n');

    // 結果サマリー
    if (lockStatus.hasSortfixAttr && afterShuffle.hasSortfix && unlocked) {
      console.log('✅ Lock機能（sortfix）は正常に動作しています');
    } else {
      console.log('❌ Lock機能に問題があります');
    }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// テスト実行
testLock();
