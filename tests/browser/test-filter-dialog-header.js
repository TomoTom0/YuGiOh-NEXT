/**
 * 検索フィルターダイアログのヘッダー表示テスト
 *
 * 以下の挙動を確認：
 * 1. フィルター設定後、ダイアログヘッダーにチップが表示されること
 * 2. クリアボタンがアイコンで表示されること
 * 3. 閉じるボタンが「×」で表示されること
 * 4. AND/ORチップのスタイルが正しいこと（リンクマーカー、モンスタータイプ）
 */

const { connectCDP } = require('./cdp-helper');

// デッキ編集URL
const DECK_URL = 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit';

async function testFilterDialogHeader() {
  console.log('【検索フィルターダイアログヘッダーテスト】\n');

  const cdp = await connectCDP();

  try {
    // デッキ編集ページに移動
    console.log('デッキ編集ページにアクセス中...');
    await cdp.navigate(DECK_URL);
    await cdp.wait(5000); // 拡張機能のロード待機

    console.log('\n=== フィルターダイアログを開く ===\n');

    // フィルターボタンをクリック
    await cdp.evaluate(`
      (() => {
        const menuBtn = document.querySelector('.menu-btn');
        if (menuBtn) menuBtn.click();
      })()
    `);
    await cdp.wait(500); // ダイアログ表示待機

    // ダイアログが表示されたか確認
    const dialogVisible = await cdp.evaluate(`
      (() => {
        const dialog = document.querySelector('.dialog-overlay');
        return dialog !== null && window.getComputedStyle(dialog).display !== 'none';
      })()
    `);

    if (dialogVisible) {
      console.log('✅ フィルターダイアログが表示されました');
    } else {
      console.log('❌ フィルターダイアログが表示されていません');
      return;
    }

    console.log('\n=== フィルター設定: モンスター + 光属性 + レベル4 ===\n');

    // モンスタータイプを選択
    await cdp.evaluate(`
      (() => {
        const monsterTab = document.querySelector('.card-type-tab');
        if (monsterTab) monsterTab.click();
      })()
    `);
    await cdp.wait(300);

    // 光属性を選択
    await cdp.evaluate(`
      (() => {
        const chips = Array.from(document.querySelectorAll('.chip-attr'));
        const lightChip = chips.find(chip => chip.alt === '光' || chip.textContent.includes('光'));
        if (lightChip) lightChip.click();
      })()
    `);
    await cdp.wait(300);

    // レベル4を選択
    await cdp.evaluate(`
      (() => {
        const chips = Array.from(document.querySelectorAll('.chip-num'));
        const level4Chip = chips.find(chip => chip.textContent === '4');
        if (level4Chip) level4Chip.click();
      })()
    `);
    await cdp.wait(500);

    console.log('\n=== ヘッダーチップの確認 ===\n');

    // ヘッダーチップが表示されているか確認
    const headerChips = await cdp.evaluate(`
      (() => {
        const chips = Array.from(document.querySelectorAll('.header-chip'));
        return chips.map(chip => ({
          label: chip.textContent.trim(),
          class: chip.className
        }));
      })()
    `);

    if (headerChips.length > 0) {
      console.log(`✅ ヘッダーチップが表示されました (${headerChips.length}個):`);
      headerChips.forEach(chip => {
        console.log(`  - ${chip.label} (${chip.class})`);
      });
    } else {
      console.log('❌ ヘッダーチップが表示されていません');
    }

    console.log('\n=== ヘッダーボタンの確認 ===\n');

    // クリアボタンの確認
    const clearButton = await cdp.evaluate(`
      (() => {
        const btn = document.querySelector('.clear-btn');
        if (!btn) return null;
        const svg = btn.querySelector('svg');
        return {
          exists: true,
          hasIcon: svg !== null,
          title: btn.title,
          text: btn.textContent.trim()
        };
      })()
    `);

    if (clearButton && clearButton.hasIcon) {
      console.log('✅ クリアボタンがアイコン表示されています');
      console.log(`  title: ${clearButton.title}`);
    } else if (clearButton && !clearButton.hasIcon) {
      console.log('❌ クリアボタンがテキスト表示されています');
      console.log(`  text: ${clearButton.text}`);
    } else {
      console.log('❌ クリアボタンが見つかりません');
    }

    // 閉じるボタンの確認
    const closeButton = await cdp.evaluate(`
      (() => {
        const btn = document.querySelector('.close-btn');
        if (!btn) return null;
        return {
          exists: true,
          text: btn.textContent.trim(),
          title: btn.title
        };
      })()
    `);

    if (closeButton && closeButton.text === '×') {
      console.log('✅ 閉じるボタンが「×」で表示されています');
      console.log(`  title: ${closeButton.title}`);
    } else if (closeButton) {
      console.log(`❌ 閉じるボタンのテキストが異なります: "${closeButton.text}"`);
    } else {
      console.log('❌ 閉じるボタンが見つかりません');
    }

    console.log('\n=== モンスタータイプAND/ORチップのスタイル確認 ===\n');

    // モンスタータイプセクションまでスクロール
    await cdp.evaluate(`
      (() => {
        const section = document.querySelector('.monster-type-rows');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })()
    `);
    await cdp.wait(500);

    // chip-modeのスタイル確認
    const chipModeStyle = await cdp.evaluate(`
      (() => {
        const chip = document.querySelector('.chip-mode');
        if (!chip) return null;
        const style = window.getComputedStyle(chip);
        return {
          border: style.border,
          borderRadius: style.borderRadius,
          width: style.width
        };
      })()
    `);

    if (chipModeStyle) {
      console.log('✅ モンスタータイプAND/ORチップ（chip-mode）のスタイル:');
      console.log(`  border: ${chipModeStyle.border}`);
      console.log(`  border-radius: ${chipModeStyle.borderRadius}`);
      console.log(`  width: ${chipModeStyle.width}`);

      // border-radiusが12px（丸い形）になっているか確認
      if (chipModeStyle.borderRadius.includes('12px')) {
        console.log('  ✅ border-radius: 12px (丸い形)');
      } else {
        console.log(`  ❌ border-radiusが12pxではありません: ${chipModeStyle.borderRadius}`);
      }
    } else {
      console.log('❌ chip-modeが見つかりません');
    }

    console.log('\n=== リンクタブに切り替え ===\n');

    // リンクタブをクリック
    await cdp.evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.level-tab'));
        const linkTab = tabs.find(tab => tab.textContent.includes('リンク'));
        if (linkTab) linkTab.click();
      })()
    `);
    await cdp.wait(500);

    console.log('\n=== リンクマーカーAND/ORチップのスタイル確認 ===\n');

    // chip-mode-smallのスタイル確認
    const chipModeSmallStyle = await cdp.evaluate(`
      (() => {
        const chip = document.querySelector('.chip-mode-small');
        if (!chip) return null;
        const style = window.getComputedStyle(chip);
        return {
          padding: style.padding,
          minWidth: style.minWidth,
          maxWidth: style.maxWidth,
          borderRadius: style.borderRadius
        };
      })()
    `);

    if (chipModeSmallStyle) {
      console.log('✅ リンクマーカーAND/ORチップ（chip-mode-small）のスタイル:');
      console.log(`  padding: ${chipModeSmallStyle.padding}`);
      console.log(`  min-width: ${chipModeSmallStyle.minWidth}`);
      console.log(`  max-width: ${chipModeSmallStyle.maxWidth}`);
      console.log(`  border-radius: ${chipModeSmallStyle.borderRadius}`);

      // min-width/max-widthが22pxになっているか確認
      if (chipModeSmallStyle.minWidth === '22px' && chipModeSmallStyle.maxWidth === '22px') {
        console.log('  ✅ min-width/max-width: 22px');
      } else {
        console.log(`  ❌ min-width/max-widthが22pxではありません`);
      }
    } else {
      console.log('❌ chip-mode-smallが見つかりません');
    }

    console.log('\n=== セクションタイトル無効化スタイルの確認 ===\n');

    // 魔法タブに切り替え（種族セクションが無効化される）
    await cdp.evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.card-type-tab'));
        const spellTab = tabs.find(tab => tab.textContent.includes('魔法'));
        if (spellTab) spellTab.click();
      })()
    `);
    await cdp.wait(500);

    // 種族セクションタイトルの無効化スタイル確認
    const raceTitleStyle = await cdp.evaluate(`
      (() => {
        const titles = Array.from(document.querySelectorAll('.section-title'));
        const raceTitle = titles.find(title => title.textContent.includes('種族'));
        if (!raceTitle) return null;
        const style = window.getComputedStyle(raceTitle);
        return {
          hasDisabledClass: raceTitle.classList.contains('disabled'),
          color: style.color,
          opacity: style.opacity
        };
      })()
    `);

    if (raceTitleStyle && raceTitleStyle.hasDisabledClass) {
      console.log('✅ 種族セクションタイトルが無効化スタイルで表示されています:');
      console.log(`  color: ${raceTitleStyle.color}`);
      console.log(`  opacity: ${raceTitleStyle.opacity}`);
    } else if (raceTitleStyle) {
      console.log('❌ 種族セクションタイトルにdisabledクラスが適用されていません');
    } else {
      console.log('❌ 種族セクションタイトルが見つかりません');
    }

    console.log('\n=== テスト完了 ===\n');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    cdp.close();
  }
}

testFilterDialogHeader();
