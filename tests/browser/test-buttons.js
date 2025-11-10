/**
 * ボタン表示の動作確認テスト
 *
 * デッキ表示ページで以下のボタンが正しく表示されることを確認：
 * 1. シャッフルボタン
 * 2. ソートボタン
 * 3. デッキ画像作成ボタン
 * 4. デッキ画像作成ボタンのSVGアイコンが塗りつぶされていないこと
 */

const { connectCDP } = require('./cdp-helper');

// 公開デッキURL（認証不要）
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95';

async function testButtons() {
  console.log('【ボタン表示テスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ表示ページに移動
    console.log('デッキ表示ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== ボタンの存在確認 ===\n');

    // シャッフルボタンの確認
    const shuffleExists = await cdp.evaluate('document.getElementById("ygo-shuffle-btn") !== null');
    console.log(`1. シャッフルボタン: ${shuffleExists ? '✅ 存在' : '❌ 存在しない'}`);

    // ソートボタンの確認
    const sortExists = await cdp.evaluate('document.getElementById("ygo-sort-btn") !== null');
    console.log(`2. ソートボタン: ${sortExists ? '✅ 存在' : '❌ 存在しない'}`);

    // デッキ画像作成ボタンの確認
    const imageExists = await cdp.evaluate('document.getElementById("ygo-deck-image-btn") !== null');
    console.log(`3. デッキ画像作成ボタン: ${imageExists ? '✅ 存在' : '❌ 存在しない'}`);

    if (imageExists) {
      console.log('\n=== カメラアイコンのスタイル確認 ===\n');

      // SVGのfill属性を確認
      const svgFill = await cdp.evaluate(`
        window.getComputedStyle(document.getElementById("ygo-deck-image-btn").querySelector("svg")).fill
      `);

      // SVGのstroke属性を確認
      const svgStroke = await cdp.evaluate(`
        window.getComputedStyle(document.getElementById("ygo-deck-image-btn").querySelector("svg")).stroke
      `);

      console.log(`fill: ${svgFill}`);
      console.log(`stroke: ${svgStroke}`);

      // 塗りつぶしなしの確認
      if (svgFill === 'none' || svgFill === 'rgba(0, 0, 0, 0)') {
        console.log('\n✅ カメラアイコンの塗りつぶしなし（正常）');
      } else {
        console.log(`\n❌ カメラアイコンが塗りつぶされている: ${svgFill}`);
      }
    }

    console.log('\n=== ボタン位置の確認 ===\n');

    // シャッフル・ソートボタンの位置
    if (shuffleExists && sortExists) {
      const buttonPositions = await cdp.evaluate(`
        (() => {
          const shuffle = document.getElementById("ygo-shuffle-btn");
          const sort = document.getElementById("ygo-sort-btn");
          return {
            shuffleParent: shuffle.parentElement.className,
            sortParent: sort.parentElement.className,
            shuffleRect: shuffle.getBoundingClientRect(),
            sortRect: sort.getBoundingClientRect()
          };
        })()
      `);

      console.log('シャッフルボタン位置:', buttonPositions.shuffleRect);
      console.log('ソートボタン位置:', buttonPositions.sortRect);
      console.log(`親要素: ${buttonPositions.shuffleParent}`);
    }

    // デッキ画像作成ボタンの位置
    if (imageExists) {
      const imagePosition = await cdp.evaluate(`
        (() => {
          const btn = document.getElementById("ygo-deck-image-btn");
          return {
            parent: btn.parentElement.id,
            rect: btn.getBoundingClientRect()
          };
        })()
      `);

      console.log('\nデッキ画像作成ボタン位置:', imagePosition.rect);
      console.log(`親要素: #${imagePosition.parent}`);
    }

    console.log('\n【テスト完了】\n');

    // 結果サマリー
    const allPassed = shuffleExists && sortExists && imageExists;
    if (allPassed) {
      console.log('✅ すべてのボタンが正しく表示されています');
    } else {
      console.log('❌ 一部のボタンが表示されていません');
    }

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// テスト実行
testButtons();
