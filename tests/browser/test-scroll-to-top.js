/**
 * scroll-to-top機能の動作確認テスト
 *
 * デッキ編集ページで以下のscroll-to-topボタンの動作を確認：
 * 1. search tabでのscroll-to-top
 * 2. related tabでのscroll-to-top
 * 3. products tabでのscroll-to-top
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集ページURL
const EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testScrollToTop() {
  console.log('【scroll-to-top機能テスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(EDIT_URL);
    await cdp.wait(5000); // ページロード待機（拡張機能の初期化を含む）

    console.log('\n=== 1. search tabでのscroll-to-topテスト ===\n');

    // 現在のタブを確認してSearch tabに移動
    const currentTab = await cdp.evaluate(`
      Array.from(document.querySelectorAll('.tabs button')).findIndex(btn => btn.classList.contains('active'))
    `);
    console.log(`現在のタブ: ${currentTab}`);

    if (currentTab !== 2) {
      await cdp.evaluate(`
        document.querySelectorAll('.tabs button')[2].click();
      `);
      await cdp.wait(500);
    }

    // カード検索を実行（より多くの結果が得られるように「効果」で検索）
    console.log('カード検索を実行中...');
    await cdp.evaluate(`
      const searchInput = document.querySelector('.search-input-bar input[type="text"]');
      searchInput.value = '効果';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await cdp.wait(500);

    // 検索ボタンをクリック
    await cdp.evaluate(`
      document.querySelector('.search-input-bar .search-btn').click();
    `);
    await cdp.wait(3000); // 検索結果の読み込み待機（多数の結果があるため長めに）

    // 検索結果の件数を確認
    const resultCount = await cdp.evaluate(`
      document.querySelectorAll('.search-content .card-result-item').length
    `);
    console.log(`検索結果: ${resultCount}件`);

    // スクロール要素を確認
    const scrollInfo = await cdp.evaluate(`
      (() => {
        const cardListResults = document.querySelector('.search-content .card-list-results');
        return {
          found: cardListResults !== null,
          scrollHeight: cardListResults ? cardListResults.scrollHeight : 0,
          clientHeight: cardListResults ? cardListResults.clientHeight : 0,
          isScrollable: cardListResults ? cardListResults.scrollHeight > cardListResults.clientHeight : false
        };
      })()
    `);

    console.log(`スクロール要素の確認: ${scrollInfo.found ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`スクロール可能: ${scrollInfo.isScrollable ? '✅ はい' : '❌ いいえ'}`);
    console.log(`scrollHeight: ${scrollInfo.scrollHeight}, clientHeight: ${scrollInfo.clientHeight}`);

    if (scrollInfo.isScrollable) {
      // 下にスクロール
      await cdp.evaluate(`
        const cardListResults = document.querySelector('.search-content .card-list-results');
        cardListResults.scrollTop = 500;
      `);
      await cdp.wait(500);

      const scrollTopBefore = await cdp.evaluate(`
        document.querySelector('.search-content .card-list-results').scrollTop
      `);
      console.log(`\nスクロール実行後の位置: ${scrollTopBefore}`);

      // scroll-to-topボタンをクリック
      console.log('scroll-to-topボタンをクリック...');
      await cdp.evaluate(`
        const scrollTopBtn = document.querySelector('.search-content .scroll-top-btn');
        scrollTopBtn.click();
      `);
      await cdp.wait(1000); // スムーズスクロール待機

      const scrollTopAfter = await cdp.evaluate(`
        document.querySelector('.search-content .card-list-results').scrollTop
      `);
      console.log(`scroll-to-top実行後の位置: ${scrollTopAfter}`);

      if (scrollTopAfter === 0) {
        console.log('✅ search tab: scroll-to-topが正常に動作');
      } else {
        console.log(`❌ search tab: scroll-to-topが正常に動作しない（scrollTop=${scrollTopAfter}）`);
      }
    } else {
      console.log('⚠️ search tab: スクロール可能な状態ではないため、テストをスキップ');
    }

    console.log('\n=== 2. related tabでのscroll-to-topテスト ===\n');

    // Card tabに移動
    await cdp.evaluate(`
      document.querySelector('.tabs button:nth-child(2)').click();
    `);
    await cdp.wait(500);

    // 最初のカードをクリック
    console.log('カードを選択中...');
    await cdp.evaluate(`
      const firstCard = document.querySelector('.search-content .card-result-item .card-wrapper');
      if (firstCard) {
        firstCard.click();
      }
    `);
    await cdp.wait(2000); // カード詳細の読み込み待機

    // Related tabに移動
    await cdp.evaluate(`
      const relatedTabBtn = document.querySelector('.card-detail-tabs button:nth-child(3)');
      if (relatedTabBtn) {
        relatedTabBtn.click();
      }
    `);
    await cdp.wait(1000);

    // スクロール要素を確認
    const relatedScrollInfo = await cdp.evaluate(`
      (() => {
        const cardTabContent = document.querySelector('.card-tab-content');
        const cardListResults = document.querySelector('.card-tab-content .card-list-results');
        return {
          found: cardTabContent !== null,
          hasResults: cardListResults !== null,
          scrollHeight: cardTabContent ? cardTabContent.scrollHeight : 0,
          clientHeight: cardTabContent ? cardTabContent.clientHeight : 0,
          isScrollable: cardTabContent ? cardTabContent.scrollHeight > cardTabContent.clientHeight : false
        };
      })()
    `);

    console.log(`スクロール要素の確認: ${relatedScrollInfo.found ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`カードリスト存在: ${relatedScrollInfo.hasResults ? '✅ はい' : '❌ いいえ'}`);
    console.log(`スクロール可能: ${relatedScrollInfo.isScrollable ? '✅ はい' : '❌ いいえ'}`);

    if (relatedScrollInfo.isScrollable) {
      // 下にスクロール
      await cdp.evaluate(`
        const cardTabContent = document.querySelector('.card-tab-content');
        cardTabContent.scrollTop = 300;
      `);
      await cdp.wait(500);

      const scrollTopBefore = await cdp.evaluate(`
        document.querySelector('.card-tab-content').scrollTop
      `);
      console.log(`\nスクロール実行後の位置: ${scrollTopBefore}`);

      // scroll-to-topボタンをクリック
      console.log('scroll-to-topボタンをクリック...');
      await cdp.evaluate(`
        const scrollTopBtn = document.querySelector('.card-tab-content .scroll-top-btn');
        if (scrollTopBtn) {
          scrollTopBtn.click();
        }
      `);
      await cdp.wait(1000); // スムーズスクロール待機

      const scrollTopAfter = await cdp.evaluate(`
        document.querySelector('.card-tab-content').scrollTop
      `);
      console.log(`scroll-to-top実行後の位置: ${scrollTopAfter}`);

      if (scrollTopAfter === 0) {
        console.log('✅ related tab: scroll-to-topが正常に動作');
      } else {
        console.log(`❌ related tab: scroll-to-topが正常に動作しない（scrollTop=${scrollTopAfter}）`);
      }
    } else {
      console.log('⚠️ related tab: スクロール可能な状態ではないため、テストをスキップ');
    }

    console.log('\n=== 3. products tabでのscroll-to-topテスト ===\n');

    // Products tabに移動
    await cdp.evaluate(`
      const productsTabBtn = document.querySelector('.card-detail-tabs button:nth-child(4)');
      if (productsTabBtn) {
        productsTabBtn.click();
      }
    `);
    await cdp.wait(1000);

    // パックを展開
    console.log('パック情報を展開中...');
    const packExpanded = await cdp.evaluate(`
      (() => {
        const expandBtn = document.querySelector('.pack-expand-btn');
        if (expandBtn) {
          expandBtn.click();
          return true;
        }
        return false;
      })()
    `);

    if (packExpanded) {
      await cdp.wait(2000); // パックカードの読み込み待機

      // スクロール要素を確認
      const productsScrollInfo = await cdp.evaluate(`
        (() => {
          const cardTabContent = document.querySelector('.card-tab-content');
          const cardListResults = document.querySelector('.pack-cards-wrapper .card-list-results');
          return {
            found: cardTabContent !== null,
            hasResults: cardListResults !== null,
            scrollHeight: cardTabContent ? cardTabContent.scrollHeight : 0,
            clientHeight: cardTabContent ? cardTabContent.clientHeight : 0,
            isScrollable: cardTabContent ? cardTabContent.scrollHeight > cardTabContent.clientHeight : false
          };
        })()
      `);

      console.log(`スクロール要素の確認: ${productsScrollInfo.found ? '✅ 存在' : '❌ 存在しない'}`);
      console.log(`カードリスト存在: ${productsScrollInfo.hasResults ? '✅ はい' : '❌ いいえ'}`);
      console.log(`スクロール可能: ${productsScrollInfo.isScrollable ? '✅ はい' : '❌ いいえ'}`);

      if (productsScrollInfo.isScrollable) {
        // 下にスクロール
        await cdp.evaluate(`
          const cardTabContent = document.querySelector('.card-tab-content');
          cardTabContent.scrollTop = 300;
        `);
        await cdp.wait(500);

        const scrollTopBefore = await cdp.evaluate(`
          document.querySelector('.card-tab-content').scrollTop
        `);
        console.log(`\nスクロール実行後の位置: ${scrollTopBefore}`);

        // scroll-to-topボタンをクリック
        console.log('scroll-to-topボタンをクリック...');
        await cdp.evaluate(`
          const scrollTopBtn = document.querySelector('.pack-cards-wrapper .scroll-top-btn');
          if (scrollTopBtn) {
            scrollTopBtn.click();
          }
        `);
        await cdp.wait(1000); // スムーズスクロール待機

        const scrollTopAfter = await cdp.evaluate(`
          document.querySelector('.card-tab-content').scrollTop
        `);
        console.log(`scroll-to-top実行後の位置: ${scrollTopAfter}`);

        if (scrollTopAfter === 0) {
          console.log('✅ products tab: scroll-to-topが正常に動作');
        } else {
          console.log(`❌ products tab: scroll-to-topが正常に動作しない（scrollTop=${scrollTopAfter}）`);
        }
      } else {
        console.log('⚠️ products tab: スクロール可能な状態ではないため、テストをスキップ');
      }
    } else {
      console.log('⚠️ products tab: パックの展開ボタンが見つからないため、テストをスキップ');
    }

    console.log('\n=== テスト完了 ===\n');

  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  } finally {
    cdp.close();
  }
}

testScrollToTop().catch(console.error);
