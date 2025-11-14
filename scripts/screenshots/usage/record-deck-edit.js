/**
 * デッキ編集画面の動画撮影
 *
 * 以下の動画を撮影：
 * 1. deck-edit-basic.mp4 / deck-edit-basic.gif - 基本操作（ロード、検索、追加、移動）
 * 2. deck-edit-detail.mp4 / deck-edit-detail.gif - カード詳細表示（タブ切り替え、展開/折りたたみ）
 */

const { connectCDP, convertToGif } = require('./video-helper');
const path = require('path');

// デッキ編集画面のURL
const DECK_EDIT_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

// 出力先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '../../../docs/usage/images');

async function recordBasicOperations() {
  console.log('【デッキ編集画面 基本操作 動画撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動（デッキはすでにロード済み）
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(DECK_EDIT_URL);
    await cdp.wait(3000); // ページロード待機

    console.log('\n=== 基本操作の動画撮影 ===\n');

    // 画面全体を録画（25秒）
    const videoPromise = cdp.recordVideo(
      path.join(OUTPUT_DIR, 'deck-edit-basic.mp4'),
      25000, // 25秒録画
      null, // 全画面
      30 // 30fps
    );

    await cdp.wait(1000);

    // デッキ名を入力
    console.log('デッキ名を入力中...');
    await cdp.evaluate(`
      const deckNameInput = document.querySelector('.deck-name-input');
      if (deckNameInput) {
        deckNameInput.value = 'テストデッキ';
        deckNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await cdp.wait(1000);

    // カード検索: 「青眼」を入力
    console.log('カード検索...');
    await cdp.evaluate(`
      const searchInput = document.querySelector('.search-input-bottom input');
      if (searchInput) {
        searchInput.focus();
        searchInput.value = '青眼';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await cdp.wait(2000); // 検索結果表示待機

    // Deckタブに切り替え
    console.log('Deckタブに切り替え...');
    await cdp.evaluate(`
      const tabs = document.querySelectorAll('.right-area > .tabs > button');
      if (tabs[0]) tabs[0].click(); // Deckタブ（1番目）
    `);
    await cdp.wait(1500);

    // ビュー切替: リスト表示
    console.log('リスト表示に切り替え...');
    await cdp.evaluate(`
      const viewRadios = document.querySelectorAll('.view-switch input[type="radio"]');
      if (viewRadios[0]) viewRadios[0].click(); // list view
    `);
    await cdp.wait(1500);

    // ビュー切替: グリッド表示に戻す
    console.log('グリッド表示に戻す...');
    await cdp.evaluate(`
      const viewRadios = document.querySelectorAll('.view-switch input[type="radio"]');
      if (viewRadios[1]) viewRadios[1].click(); // grid view
    `);
    await cdp.wait(1500);

    // Mainデッキの1枚目のカードの「ⓘ」ボタンをクリック（詳細表示）
    console.log('カード詳細を表示...');
    await cdp.evaluate(`
      const firstCard = document.querySelector('.deck-card');
      if (firstCard) {
        const infoBtn = firstCard.querySelector('.card-btn.top-left');
        if (infoBtn) infoBtn.click();
      }
    `);
    await cdp.wait(2000);

    // カード詳細内でRelatedタブに切り替え
    console.log('Relatedタブに切り替え...');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      const relatedTab = Array.from(cardDetailTabs).find(t => t.textContent.includes('Related'));
      if (relatedTab) relatedTab.click();
    `);
    await cdp.wait(1500);

    // Infoタブに戻す
    console.log('Infoタブに戻す...');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      if (cardDetailTabs[0]) cardDetailTabs[0].click(); // Info (最初のタブ)
    `);
    await cdp.wait(1500);

    // Searchタブに戻す（トップレベルタブ）
    console.log('Searchタブに戻す...');
    await cdp.evaluate(`
      const tabs = document.querySelectorAll('.right-area > .tabs > button');
      if (tabs[2]) tabs[2].click(); // Searchタブ（3番目）
    `);
    await cdp.wait(2000);

    // 最後の2秒ホールド（自動的に待機）
    await cdp.wait(2000);

    await videoPromise;

    console.log('\n【動画撮影完了】\n');
    console.log('✅ 基本操作の動画を保存しました\n');

    // GIF変換
    console.log('\n=== GIF変換 ===\n');

    const mp4Path = path.join(OUTPUT_DIR, 'deck-edit-basic.mp4');
    await convertToGif(
      mp4Path,
      path.join(OUTPUT_DIR, 'deck-edit-basic.gif'),
      { fps: 10, scale: 800, colors: 128 } // 10fps, 横幅800px, 128色
    );

    // mp4ファイルを削除（中間ファイル）
    const fs = require('fs');
    fs.unlinkSync(mp4Path);
    console.log('MP4ファイルを削除しました');

    console.log('\n✅ GIF変換完了\n');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    throw error;
  }
}

async function recordDetailOperations() {
  console.log('【デッキ編集画面 詳細操作 動画撮影】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動（デッキはすでにロード済み）
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(DECK_EDIT_URL);
    await cdp.wait(3000); // ページロード待機

    // カードの「ⓘ」ボタンをクリック（詳細表示）
    console.log('カード詳細を表示...');
    await cdp.evaluate(`
      const firstCard = document.querySelector('.deck-card');
      if (firstCard) {
        const infoBtn = firstCard.querySelector('.card-btn.top-left');
        if (infoBtn) infoBtn.click();
      }
    `);
    await cdp.wait(2000); // Cardタブへの自動切り替え待機

    console.log('\n=== 詳細操作の動画撮影 ===\n');

    // 右サイドバーの領域を録画（18秒）
    const rightAreaClip = await cdp.getElementClip('.right-area', 10);
    const videoPromise = cdp.recordVideo(
      path.join(OUTPUT_DIR, 'deck-edit-detail.mp4'),
      18000, // 18秒録画
      rightAreaClip,
      30 // 30fps
    );

    await cdp.wait(1000);

    // カード詳細内のタブを切り替え
    console.log('カード詳細のタブを切り替え中...');

    // Infoタブ（初期表示）で待機
    await cdp.wait(2000);

    // Relatedタブに切り替え
    console.log('→ Relatedタブ');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      const relatedTab = Array.from(cardDetailTabs).find(t => t.textContent.includes('Related'));
      if (relatedTab) relatedTab.click();
    `);
    await cdp.wait(2500);

    // Productsタブに切り替え
    console.log('→ Productsタブ');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      const productsTab = Array.from(cardDetailTabs).find(t => t.textContent.includes('Products'));
      if (productsTab) productsTab.click();
    `);
    await cdp.wait(2500);

    // QAタブに切り替え
    console.log('→ QAタブ');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      const qaTab = Array.from(cardDetailTabs).find(t => t.textContent.includes('Q&A') || t.textContent.includes('QA'));
      if (qaTab) qaTab.click();
    `);
    await cdp.wait(2500);

    // Infoタブに戻す
    console.log('→ Infoタブ');
    await cdp.evaluate(`
      const cardDetailTabs = document.querySelectorAll('.card-detail-tabs button');
      if (cardDetailTabs[0]) cardDetailTabs[0].click();
    `);
    await cdp.wait(2500);

    // 最後の2秒ホールド（自動的に待機）
    await cdp.wait(2000);

    await videoPromise;

    console.log('\n【動画撮影完了】\n');
    console.log('✅ 詳細操作の動画を保存しました\n');

    // GIF変換
    console.log('\n=== GIF変換 ===\n');

    const mp4Path = path.join(OUTPUT_DIR, 'deck-edit-detail.mp4');
    await convertToGif(
      mp4Path,
      path.join(OUTPUT_DIR, 'deck-edit-detail.gif'),
      { fps: 10, scale: 600, colors: 128 } // 10fps, 横幅600px, 128色
    );

    // mp4ファイルを削除（中間ファイル）
    const fs = require('fs');
    fs.unlinkSync(mp4Path);
    console.log('MP4ファイルを削除しました');

    console.log('\n✅ GIF変換完了\n');

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    throw error;
  }
}

async function recordVideos() {
  try {
    await recordBasicOperations();
    console.log('\n====================\n');
    await recordDetailOperations();
    console.log('\n✅ 全ての動画撮影が完了しました\n');
  } catch (error) {
    console.error('動画撮影中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
recordVideos();
