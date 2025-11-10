import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// DOMParserをモックするため、JSDOMのwindow.DOMParserを使用
global.DOMParser = (new JSDOM()).window.DOMParser as any;
global.fetch = async () => ({ ok: false }) as any;

// パーサー関数をインポート（内部関数なので直接テスト）
import * as cardSearch from '../../../src/api/card-search';

/**
 * カード詳細パーサーのテスト
 * tests/combine/data/card-detail.htmlを使用
 */
async function testCardDetailParser() {
  console.log('=== Testing Card Detail Parser ===\n');

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/card-detail.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12976&request_locale=ja'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // parsePackInfo と parseRelatedCards は内部関数なので、
    // モジュールから直接アクセスできないため、HTMLから手動でテスト

    // 収録シリーズのテスト
    console.log('--- Pack Info Parsing ---');
    const updateList = doc.querySelector('#update_list');
    if (!updateList) {
      console.error('✗ #update_list not found');
      process.exit(1);
    }

    const packRows = updateList.querySelectorAll('.t_row');
    console.log(`Found ${packRows.length} pack entries\n`);

    if (packRows.length > 0) {
      const firstPack = packRows[0] as HTMLElement;
      const timeElem = firstPack.querySelector('.time');
      const cardNumberElem = firstPack.querySelector('.card_number');
      const packNameElem = firstPack.querySelector('.pack_name');

      console.log('First Pack:');
      console.log('  Release Date:', timeElem?.textContent?.trim());
      console.log('  Card Number:', cardNumberElem?.textContent?.trim());
      console.log('  Pack Name:', packNameElem?.textContent?.trim());
      console.log('');
    }

    // 関連カードのテスト
    console.log('--- Related Cards Parsing ---');
    let cardList = doc.querySelector('#card_list');
    if (!cardList) {
      // カード詳細ページの場合
      cardList = doc.querySelector('.list_style.list');
    }
    if (!cardList) {
      console.error('✗ Card list not found');
      process.exit(1);
    }

    const cardRows = cardList.querySelectorAll('.t_row');
    console.log(`Found ${cardRows.length} related cards\n`);

    // 画像情報を抽出
    const imageInfoMap = cardSearch.extractImageInfo(doc);
    console.log(`Extracted image info for ${imageInfoMap.size} cards\n`);

    // 最初の3枚の関連カードをパース
    const relatedCards: any[] = [];
    cardRows.forEach((row, index) => {
      const card = cardSearch.parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (card) {
        relatedCards.push(card);
        if (index < 3) {
          console.log(`Related Card ${index + 1}:`);
          console.log('  name:', card.name);
          console.log('  cardId:', card.cardId);
          console.log('  cardType:', card.cardType);
          console.log('');
        }
      }
    });

    console.log(`✓ Successfully parsed ${relatedCards.length} related cards\n`);

    // 検証
    console.log('--- Validation ---');
    const errors: string[] = [];

    if (packRows.length === 0) {
      errors.push('No pack info found');
    }

    if (relatedCards.length === 0) {
      errors.push('No related cards found');
    }

    relatedCards.forEach((card, index) => {
      if (!card.name) errors.push(`Related card ${index}: missing name`);
      if (!card.cardId) errors.push(`Related card ${index}: missing cardId`);
    });

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✓ All validations passed');
    }

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('✗ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testCardDetailParser();
