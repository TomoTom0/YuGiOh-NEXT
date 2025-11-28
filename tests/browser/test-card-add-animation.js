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

    // グローバル検索を開く
    await cdp.evaluate(`
      (() => {
        const store = window.__VUE_APP__?.$pinia?._s?.get('deck-edit');
        if (store) {
          store.isGlobalSearchMode = true;
          store.searchQuery = '青眼';
        }
      })()
    `);
    await cdp.wait(1000);

    // 検索を実行
    await cdp.evaluate(`
      (() => {
        const inputBar = document.querySelector('.search-input-bar input');
        if (inputBar) {
          const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
          inputBar.dispatchEvent(event);
        }
      })()
    `);
    await cdp.wait(3000); // 検索完了待機

    console.log('\n=== 左下ボタンクリックでのアニメーション確認 ===\n');

    // 最初のカードの左下ボタンをクリック
    const bottomLeftResult = await cdp.evaluate(`
      (() => {
        const card = document.querySelector('.card-result-item .deck-card');
        if (!card) return { success: false, error: 'カードが見つかりません' };

        const btn = card.querySelector('.bottom-left');
        if (!btn) return { success: false, error: '左下ボタンが見つかりません' };

        // クリック前のtransformを記録
        btn.click();

        // アニメーションが開始されるまで待機
        return new Promise(resolve => {
          setTimeout(() => {
            // Main/Extraデッキの最後のカードを探す
            const mainDeck = document.querySelector('.main-deck');
            const extraDeck = document.querySelector('.extra-deck');
            const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

            if (!lastCard) {
              resolve({ success: false, error: '追加されたカードが見つかりません' });
              return;
            }

            const style = window.getComputedStyle(lastCard);
            const hasTransition = style.transition.includes('transform');

            resolve({
              success: true,
              hasTransition: hasTransition,
              transition: style.transition
            });
          }, 100);
        });
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
      (() => {
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

        return new Promise(resolve => {
          setTimeout(() => {
            const mainDeck = document.querySelector('.main-deck');
            const extraDeck = document.querySelector('.extra-deck');
            const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

            if (!lastCard) {
              resolve({ success: false, error: '追加されたカードが見つかりません' });
              return;
            }

            const style = window.getComputedStyle(lastCard);
            const hasTransition = style.transition.includes('transform');

            resolve({
              success: true,
              hasTransition: hasTransition
            });
          }, 100);
        });
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
      (() => {
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

        return new Promise(resolve => {
          setTimeout(() => {
            const mainDeck = document.querySelector('.main-deck');
            const extraDeck = document.querySelector('.extra-deck');
            const lastCard = (mainDeck?.lastElementChild || extraDeck?.lastElementChild);

            if (!lastCard) {
              resolve({ success: false, error: '追加されたカードが見つかりません' });
              return;
            }

            const style = window.getComputedStyle(lastCard);
            const hasTransition = style.transition.includes('transform');

            resolve({
              success: true,
              hasTransition: hasTransition
            });
          }, 100);
        });
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
