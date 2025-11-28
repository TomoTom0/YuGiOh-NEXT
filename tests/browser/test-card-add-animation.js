/**
 * カード追加アニメーションのテスト
 *
 * 以下の挙動を確認：
 * 1. 左下ボタンクリックでアニメーションが発生すること
 * 2. 右クリックでアニメーションが発生すること
 * 3. 中クリックでアニメーションが発生すること
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集URL
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testCardAddAnimation() {
  console.log('【カード追加アニメーションテスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== 検索実行 ===\n');

    // 検索バーにフォーカスして検索文字を入力
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('.search-input-bar input');
        if (input) {
          input.value = '青眼';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await cdp.wait(500);

    // Enterキーで検索を実行
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('.search-input-bar input');
        if (input) {
          const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true,
            cancelable: true
          });
          input.dispatchEvent(event);
        }
      })()
    `);
    await cdp.wait(5000); // 検索完了待機

    // 検索結果を確認
    const searchStatus = await cdp.evaluate(`
      (() => {
        const cards = document.querySelectorAll('.card-result-item .deck-card');
        const searchInput = document.querySelector('.search-input-bar input');
        return {
          cardCount: cards.length,
          inputValue: searchInput ? searchInput.value : 'not found',
          searchResultsExists: document.querySelector('.card-list-results') !== null
        };
      })()
    `);
    console.log('検索結果:', JSON.stringify(searchStatus, null, 2));

    if (searchStatus.cardCount === 0) {
      console.log('❌ 検索結果が0件です。テストを中止します。');
      return;
    }

    console.log('\n=== 左下ボタンクリックでのアニメーション確認 ===\n');

    // 最初のカードの左下ボタンをクリック
    const bottomLeftResult = await cdp.evaluate(`
      (async () => {
        try {
          const card = document.querySelector('.card-result-item .deck-card');
          if (!card) return { success: false, error: 'カードが見つかりません' };

          const btn = card.querySelector('.bottom-left');
          if (!btn) return { success: false, error: '左下ボタンが見つかりません' };

          // クリック前のtransformを記録
          btn.click();

          // アニメーションが開始されるまで待機
          await new Promise(resolve => setTimeout(resolve, 100));

          // Main/Extraデッキの最後のカードを探す
          const mainDeck = document.querySelector('.main-deck');
          const extraDeck = document.querySelector('.extra-deck');
          const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

          if (!lastCard) {
            return { success: false, error: '追加されたカードが見つかりません' };
          }

          const style = window.getComputedStyle(lastCard);
          const hasTransition = style.transition.includes('transform') || style.transition.includes('all');

          return {
            success: true,
            hasTransition: hasTransition,
            transition: style.transition
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `);

    if (bottomLeftResult.success) {
      console.log('✅ 左下ボタンクリック: カードが追加されました');
      console.log(`  transition: ${bottomLeftResult.transition}`);
      if (bottomLeftResult.hasTransition) {
        console.log('  ✅ transform transitionが設定されています');
      } else {
        console.log('  ❌ transform transitionが設定されていません');
      }
    } else {
      console.log(`❌ 左下ボタンクリック: ${bottomLeftResult.error}`);
    }

    await cdp.wait(500);

    console.log('\n=== 右クリックでのアニメーション確認 ===\n');

    // 2番目のカードを右クリック
    const rightClickResult = await cdp.evaluate(`
      (async () => {
        try {
          const cards = document.querySelectorAll('.card-result-item .deck-card');
          if (cards.length < 2) return { success: false, error: 'カードが足りません' };

          const card = cards[1];
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 2
          });
          card.dispatchEvent(event);

          await new Promise(resolve => setTimeout(resolve, 100));

          const mainDeck = document.querySelector('.main-deck');
          const extraDeck = document.querySelector('.extra-deck');
          const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

          if (!lastCard) {
            return { success: false, error: '追加されたカードが見つかりません' };
          }

          const style = window.getComputedStyle(lastCard);
          const hasTransition = style.transition.includes('transform') || style.transition.includes('all');

          return {
            success: true,
            hasTransition: hasTransition
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `);

    if (rightClickResult.success) {
      console.log('✅ 右クリック: カードが追加されました');
      if (rightClickResult.hasTransition) {
        console.log('  ✅ transform transitionが設定されています');
      } else {
        console.log('  ❌ transform transitionが設定されていません');
      }
    } else {
      console.log(`❌ 右クリック: ${rightClickResult.error}`);
    }

    await cdp.wait(500);

    console.log('\n=== 中クリックでのアニメーション確認 ===\n');

    // 3番目のカードを中クリック
    const middleClickResult = await cdp.evaluate(`
      (async () => {
        try {
          const cards = document.querySelectorAll('.card-result-item .deck-card');
          if (cards.length < 3) return { success: false, error: 'カードが足りません' };

          const card = cards[2];

          // mousedownイベント
          const mousedown = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 1
          });
          card.dispatchEvent(mousedown);

          // auxclickイベント
          const auxclick = new MouseEvent('auxclick', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 1
          });
          card.dispatchEvent(auxclick);

          await new Promise(resolve => setTimeout(resolve, 100));

          const mainDeck = document.querySelector('.main-deck');
          const extraDeck = document.querySelector('.extra-deck');
          const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

          if (!lastCard) {
            return { success: false, error: '追加されたカードが見つかりません' };
          }

          const style = window.getComputedStyle(lastCard);
          const hasTransition = style.transition.includes('transform') || style.transition.includes('all');

          return {
            success: true,
            hasTransition: hasTransition
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `);

    if (middleClickResult.success) {
      console.log('✅ 中クリック: カードが追加されました');
      if (middleClickResult.hasTransition) {
        console.log('  ✅ transform transitionが設定されています');
      } else {
        console.log('  ❌ transform transitionが設定されていません');
      }
    } else {
      console.log(`❌ 中クリック: ${middleClickResult.error}`);
    }

    console.log('\n=== テスト完了 ===\n');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    cdp.close();
  }
}

testCardAddAnimation();
