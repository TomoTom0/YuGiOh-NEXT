/**
 * シャッフル・ソート機能の動作確認テスト
 *
 * 以下の挙動を確認：
 * 1. シャッフルボタンをクリックしてカードの順序が変わること
 * 2. ソートボタンをクリックしてカードが元の順序に戻ること
 * 3. アニメーションが適用されること
 */

const { connectCDP } = require('./cdp-helper');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testShuffle() {
  console.log('【シャッフル・ソート機能テスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== 初期状態のカード順序を取得 ===\n');

    // メインデッキのカード順序を取得
    const originalOrder = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        if (!mainDeck) return [];
        const cards = Array.from(mainDeck.querySelectorAll('a'));
        return cards.map((card, index) => ({
          index,
          href: card.href,
          img: card.querySelector('img')?.src
        })).slice(0, 10); // 最初の10枚のみ
      })()
    `);

    console.log(`カード枚数（最初の10枚）: ${originalOrder.length}`);
    console.log('最初の3枚:', originalOrder.slice(0, 3).map(c => c.href.match(/cid=(\d+)/)?.[1]));

    console.log('\n=== シャッフルボタンをクリック ===\n');

    // シャッフルボタンをクリック
    await cdp.evaluate(`document.getElementById("ygo-next-shuffle-btn-main").click()`);
    await cdp.wait(2000); // アニメーション待機

    // シャッフル後のカード順序を取得
    const shuffledOrder = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        if (!mainDeck) return [];
        const cards = Array.from(mainDeck.querySelectorAll('a'));
        return cards.map((card, index) => ({
          index,
          href: card.href,
          img: card.querySelector('img')?.src
        })).slice(0, 10);
      })()
    `);

    console.log('シャッフル後の最初の3枚:', shuffledOrder.slice(0, 3).map(c => c.href.match(/cid=(\d+)/)?.[1]));

    // 順序が変わったか確認
    const orderChanged = JSON.stringify(originalOrder) !== JSON.stringify(shuffledOrder);
    if (orderChanged) {
      console.log('✅ カードの順序が変更されました');
    } else {
      console.log('❌ カードの順序が変更されていません（シャッフルが機能していない可能性）');
    }

    console.log('\n=== ソートボタンをクリック ===\n');

    // ソートボタンをクリック
    await cdp.evaluate(`document.getElementById("ygo-next-sort-btn-main").click()`);
    await cdp.wait(2000); // アニメーション待機

    // ソート後のカード順序を取得
    const sortedOrder = await cdp.evaluate(`
      (() => {
        const mainDeck = document.querySelector('#deck_image #main.card_set .image_set');
        if (!mainDeck) return [];
        const cards = Array.from(mainDeck.querySelectorAll('a'));
        return cards.map((card, index) => ({
          index,
          href: card.href,
          img: card.querySelector('img')?.src
        })).slice(0, 10);
      })()
    `);

    console.log('ソート後の最初の3枚:', sortedOrder.slice(0, 3).map(c => c.href.match(/cid=(\d+)/)?.[1]));

    // 元の順序に戻ったか確認
    const orderRestored = JSON.stringify(originalOrder) === JSON.stringify(sortedOrder);
    if (orderRestored) {
      console.log('✅ カードが元の順序に戻りました');
    } else {
      console.log('❌ カードが元の順序に戻っていません（ソートが機能していない可能性）');
    }

    console.log('\n=== アニメーションクラスの確認 ===\n');

    // アニメーションクラスが適用されるか確認
    await cdp.evaluate(`document.getElementById("ygo-next-shuffle-btn-main").click()`);
    await cdp.wait(100); // アニメーション開始直後

    const hasAnimatingClass = await cdp.evaluate(`
      document.querySelector('#deck_image #main.card_set .image_set').classList.contains('animating')
    `);

    if (hasAnimatingClass) {
      console.log('✅ アニメーションクラスが適用されています');
    } else {
      console.log('❌ アニメーションクラスが適用されていません');
    }

    await cdp.wait(2000); // アニメーション完了待機

    console.log('\n【テスト完了】\n');

    // 結果サマリー
    if (orderChanged && orderRestored) {
      console.log('✅ シャッフル・ソート機能は正常に動作しています');
    } else {
      console.log('❌ シャッフル・ソート機能に問題があります');
    }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// テスト実行
testShuffle();
