import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { parseSearchResultRow, extractImageInfo } from '../../../src/api/card-search';

/**
 * カード検索結果パーサーのテスト
 * tests/combine/data/card-search-result.htmlを使用
 */
async function testCardSearchParser() {
  console.log('=== Testing parseSearchResults ===\n');

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/card-search-result.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=2&rp=100&page=1&mode=1&stype=1&request_locale=ja'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // 検索結果を抽出
    const main980 = doc.querySelector('#main980');
    if (!main980) {
      console.error('✗ #main980 not found');
      process.exit(1);
    }

    const articleBody = main980.querySelector('#article_body');
    if (!articleBody) {
      console.error('✗ #article_body not found');
      process.exit(1);
    }

    const cardList = articleBody.querySelector('#card_list');
    if (!cardList) {
      console.error('✗ #card_list not found');
      process.exit(1);
    }

    const rows = cardList.querySelectorAll('.t_row');
    console.log(`Found ${rows.length} card rows\n`);

    // 画像情報を事前に抽出
    const imageInfoMap = extractImageInfo(doc);
    console.log(`Extracted image info for ${imageInfoMap.size} cards\n`);

    // 各行をパース
    const cards: any[] = [];
    rows.forEach((row, index) => {
      const card = parseSearchResultRow(row as HTMLElement, imageInfoMap);
      if (card) {
        cards.push(card);
        if (index < 3) {
          console.log(`--- Card ${index + 1} ---`);
          console.log('name:', card.name);
          console.log('cardId:', card.cardId);
          console.log('cardType:', card.cardType);
          if (card.cardType === 'モンスター') {
            console.log('attribute:', card.attribute);
            console.log('levelType:', card.levelType);
            console.log('levelValue:', card.levelValue);
            console.log('race:', card.race);
            console.log('types:', card.types);
            console.log('atk:', card.atk);
            console.log('def:', card.def);
          } else if (card.cardType === '魔法') {
            console.log('effectType:', card.effectType);
          } else if (card.cardType === '罠') {
            console.log('effectType:', card.effectType);
          }
          console.log('');
        }
      }
    });

    console.log(`✓ Successfully parsed ${cards.length} cards out of ${rows.length} rows\n`);

    // カードタイプ別の集計
    const monsterCards = cards.filter(c => c.cardType === 'モンスター');
    const spellCards = cards.filter(c => c.cardType === '魔法');
    const trapCards = cards.filter(c => c.cardType === '罠');

    console.log('--- Card Type Summary ---');
    console.log('Monster cards:', monsterCards.length);
    console.log('Spell cards:', spellCards.length);
    console.log('Trap cards:', trapCards.length);

    // 検証
    console.log('\n--- Validation ---');
    const errors: string[] = [];

    if (cards.length === 0) {
      errors.push('No cards parsed');
    }

    cards.forEach((card, index) => {
      if (!card.name) errors.push(`Card ${index}: missing name`);
      if (!card.cardId) errors.push(`Card ${index}: missing cardId`);
      if (!card.cardType) errors.push(`Card ${index}: missing cardType`);
      if (card.ciid === undefined) errors.push(`Card ${index}: missing ciid`);
      if (!card.imgs) errors.push(`Card ${index}: missing imgs`);

      if (card.cardType === 'モンスター') {
        if (!card.attribute) errors.push(`Card ${index}: missing attribute`);
        if (!card.levelType) errors.push(`Card ${index}: missing levelType`);
        if (card.levelValue === undefined) errors.push(`Card ${index}: missing levelValue`);
        if (!card.race) errors.push(`Card ${index}: missing race`);
        if (!Array.isArray(card.types)) errors.push(`Card ${index}: types should be array`);
      }
    });

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.slice(0, 10).forEach(err => console.log('  -', err));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
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

testCardSearchParser();
