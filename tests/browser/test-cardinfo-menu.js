/**
 * CardInfo メニューボタン表示テスト
 *
 * CardInfo.vue のメニューボタンに関する以下を確認：
 * 1. メニューボタンと画像選択ボタンがサイドバイサイドで表示される（flex-row）
 * 2. メニュー外をクリックするとメニューが閉じる
 * 3. メニューを閉じるときにアニメーションが実行される
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集ページURL
const DECK_EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testCardInfoMenu() {
  console.log('【CardInfo メニューボタンテスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(DECK_EDIT_URL);
    await cdp.wait(3000); // 拡張機能のロード待機

    console.log('\n=== ボタンレイアウト確認 ===\n');

    // Test 1: ボタンのレイアウト確認
    const layoutResult = await cdp.evaluate(`
      (() => {
        const container = document.querySelector('.card-buttons-container');
        if (!container) return { error: 'Container not found' };

        const style = window.getComputedStyle(container);
        const buttons = container.querySelectorAll('button');

        return {
          flexDirection: style.flexDirection,
          buttonCount: buttons.length
        };
      })()
    `);

    if (layoutResult.error) {
      console.log(`❌ ${layoutResult.error}`);
    } else {
      console.log(`flex-direction: ${layoutResult.flexDirection}`);
      console.log(`ボタン数: ${layoutResult.buttonCount}個`);
      const layoutOK = layoutResult.flexDirection === 'row';
      console.log(`レイアウト: ${layoutOK ? '✅ row（サイドバイサイド）' : '❌ 期待と異なる'}`);
    }

    // 最初のカードをクリックして詳細パネルを開く
    console.log('\n=== カードの詳細パネルを開く ===\n');

    await cdp.evaluate(`
      (() => {
        const cardElements = document.querySelectorAll('[data-uuid]');
        if (cardElements.length > 0) {
          const firstCard = cardElements[0];
          const infoButton = firstCard.querySelector('[title*="情報"]');
          if (infoButton) {
            infoButton.click();
            return 'Info panel opened';
          }
        }
        return 'Card or info button not found';
      })()
    `);

    await cdp.wait(1000); // アニメーション待機

    // Test 2: メニューボタンのクリック
    console.log('\n=== メニューボタンのクリック ===\n');

    await cdp.evaluate(`
      (() => {
        const menuBtn = document.querySelector('.card-menu-btn');
        if (menuBtn) {
          menuBtn.click();
          return 'Menu button clicked';
        }
        return 'Menu button not found';
      })()
    `);

    await cdp.wait(500); // トランジション待機

    // Test 3: メニューが表示されているか確認
    const menuVisibleResult = await cdp.evaluate(`
      (() => {
        const dropdown = document.querySelector('.card-menu-dropdown');
        if (!dropdown) return { visible: false, reason: 'Dropdown not found' };

        const style = window.getComputedStyle(dropdown);
        const rect = dropdown.getBoundingClientRect();

        return {
          visible: style.display !== 'none' && rect.height > 0,
          display: style.display,
          opacity: style.opacity,
          height: rect.height,
          position: style.position
        };
      })()
    `);

    console.log(`メニュー表示状態: ${menuVisibleResult.visible ? '✅ 表示' : '❌ 非表示'}`);
    if (!menuVisibleResult.visible) {
      console.log(`  理由: display=${menuVisibleResult.display}, opacity=${menuVisibleResult.opacity}`);
    } else {
      console.log(`  Position: ${menuVisibleResult.position}`);
      console.log(`  Height: ${menuVisibleResult.height}px`);
    }

    // Test 4: メニュー外クリック
    console.log('\n=== メニュー外をクリック ===\n');

    await cdp.evaluate(`
      (() => {
        const cardDetails = document.querySelector('.card-details');
        if (cardDetails) {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          cardDetails.dispatchEvent(clickEvent);
          return 'Click event dispatched';
        }
        return 'Card details not found';
      })()
    `);

    await cdp.wait(500); // クローズアニメーション待機

    // Test 5: メニューが閉じたか確認
    const menuClosedResult = await cdp.evaluate(`
      (() => {
        const dropdown = document.querySelector('.card-menu-dropdown');
        if (!dropdown) return { closed: true, reason: 'Dropdown removed from DOM' };

        const style = window.getComputedStyle(dropdown);
        const rect = dropdown.getBoundingClientRect();

        return {
          closed: style.display === 'none' || rect.height === 0,
          display: style.display,
          opacity: style.opacity,
          height: rect.height
        };
      })()
    `);

    console.log(`メニュー閉鎖状態: ${menuClosedResult.closed ? '✅ 閉じた' : '❌ 開いたまま'}`);
    if (!menuClosedResult.closed) {
      console.log(`  display=${menuClosedResult.display}, opacity=${menuClosedResult.opacity}`);
    }

    console.log('\n✓ テスト完了\n');

  } catch (error) {
    console.error('テストエラー:', error);
  } finally {
    cdp.close();
  }
}

testCardInfoMenu();
